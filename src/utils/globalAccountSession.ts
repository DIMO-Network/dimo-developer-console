'use client';
import { decryptCredentialBundle } from '@turnkey/crypto';
import { IGlobalAccountSession } from '@/types/wallet';
import { EmbeddedKey } from '@/utils/localStorage';

// One session for every tab of the console: the bundle and the embedded key it
// was encrypted to live in a single localStorage entry, written in one setItem.
export const SESSION_KEY = 'globalAccountSession';
export const RESOLVED_ACCOUNT_KEY = 'globalAccountAddresses';
export const SESSION_CHANNEL = 'dimo-console-session';
// The old per-tab sessionStorage entry, migrated once.
export const LEGACY_TAB_SESSION_KEY = 'globalAccount';

export interface StoredSession extends IGlobalAccountSession {
  eKey: string;
}

export type SessionEvent =
  | { type: 'signed-in'; subOrganizationId: string; expiry: number }
  | { type: 'signed-out' };

interface Envelope {
  from: string;
  event: SessionEvent;
}

const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);

// One channel per tab, shared by writes, clears and listeners.
let channel: BroadcastChannel | null = null;
const getChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel !== 'function') return null;
  channel ??= new BroadcastChannel(SESSION_CHANNEL);
  return channel;
};

const announce = (event: SessionEvent) => {
  try {
    const envelope: Envelope = { from: tabId, event };
    getChannel()?.postMessage(envelope);
  } catch {
    // Best effort. The storage event is listened to only where BroadcastChannel
    // is missing; elsewhere a tab still finds the store on focus or its timer.
  }
};

const parseSession = (raw: string | null): StoredSession | null => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value &&
      typeof value.token === 'string' &&
      typeof value.eKey === 'string' &&
      typeof value.subOrganizationId === 'string' &&
      typeof value.expiry === 'number'
    ) {
      return value as StoredSession;
    }
  } catch {
    // fall through
  }
  return null;
};

export const isLive = (
  session: StoredSession | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): session is StoredSession => !!session && session.expiry >= nowSeconds;

export const migrateTabSession = (): void => {
  if (typeof window === 'undefined') return;
  const raw = sessionStorage.getItem(LEGACY_TAB_SESSION_KEY);
  if (raw === null) return;
  try {
    if (!isLive(parseSession(localStorage.getItem(SESSION_KEY)))) {
      const old = JSON.parse(raw) as IGlobalAccountSession;
      const eKeyRaw = localStorage.getItem(EmbeddedKey);
      const eKey: unknown = eKeyRaw ? JSON.parse(eKeyRaw) : null;
      if (
        typeof eKey === 'string' &&
        typeof old?.token === 'string' &&
        typeof old.expiry === 'number' &&
        isLive({ ...old, eKey })
      ) {
        decryptCredentialBundle(old.token, eKey);
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...old, eKey }));
      }
    }
  } catch {
    // The bundle no longer matches the key (or is unreadable): drop it.
  } finally {
    sessionStorage.removeItem(LEGACY_TAB_SESSION_KEY);
    sessionStorage.removeItem(RESOLVED_ACCOUNT_KEY);
  }
};

export const readSession = (): StoredSession | null => {
  if (typeof window === 'undefined') return null;
  migrateTabSession();
  return parseSession(localStorage.getItem(SESSION_KEY));
};

export const writeSession = (session: StoredSession): void => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  announce({
    type: 'signed-in',
    subOrganizationId: session.subOrganizationId,
    expiry: session.expiry,
  });
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(RESOLVED_ACCOUNT_KEY);
  localStorage.removeItem(EmbeddedKey);
  sessionStorage.removeItem(LEGACY_TAB_SESSION_KEY);
  announce({ type: 'signed-out' });
};

// A message can arrive before the write it announces is visible to this tab's
// localStorage (the two travel separately between processes). Until the stored
// session is the one announced, re-read for a few ms; then deliver anyway.
const REREAD_TRIES = 10;
const REREAD_EVERY_MS = 5;
const untilStored = async (event: SessionEvent) => {
  if (event.type !== 'signed-in') return;
  for (let i = 0; i < REREAD_TRIES; i++) {
    if (parseSession(localStorage.getItem(SESSION_KEY))?.expiry === event.expiry) return;
    await new Promise((resolve) => setTimeout(resolve, REREAD_EVERY_MS));
  }
};

export const onSessionChange = (
  listener: (event: SessionEvent) => void,
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const bc = getChannel();
  if (bc) {
    let subscribed = true;
    // Events reach the listener in the order they came, even one held back.
    let queue = Promise.resolve();
    const handler = (e: MessageEvent) => {
      const data = e.data as Envelope | undefined;
      if (!data || data.from === tabId || !data.event) return;
      const { event } = data;
      queue = queue
        .then(() => untilStored(event))
        .then(() => {
          if (subscribed) listener(event);
        })
        // A listener that throws is reported, and later events still arrive.
        .catch((err) =>
          queueMicrotask(() => {
            throw err;
          }),
        );
    };
    bc.addEventListener('message', handler);
    return () => {
      subscribed = false;
      bc.removeEventListener('message', handler);
    };
  }

  const handler = (e: StorageEvent) => {
    if (e.key === null) return listener({ type: 'signed-out' });
    if (e.key !== SESSION_KEY) return;
    if (e.newValue === null) return listener({ type: 'signed-out' });
    // The storage event fires once the write is visible here: no re-read.
    const session = parseSession(e.newValue);
    if (session) {
      const { subOrganizationId, expiry } = session;
      listener({ type: 'signed-in', subOrganizationId, expiry });
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
