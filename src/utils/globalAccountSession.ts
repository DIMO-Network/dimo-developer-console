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
  { type: 'signed-in'; subOrganizationId: string } | { type: 'signed-out' };

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
    // Other tabs still learn of it through the storage event.
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
    if (!parseSession(localStorage.getItem(SESSION_KEY))) {
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
  announce({ type: 'signed-in', subOrganizationId: session.subOrganizationId });
};

export const clearSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(RESOLVED_ACCOUNT_KEY);
  localStorage.removeItem(EmbeddedKey);
  sessionStorage.removeItem(LEGACY_TAB_SESSION_KEY);
  announce({ type: 'signed-out' });
};

export const onSessionChange = (
  listener: (event: SessionEvent) => void,
): (() => void) => {
  const bc = getChannel();
  if (bc) {
    const handler = (e: MessageEvent) => {
      const data = e.data as Envelope | undefined;
      if (!data || data.from === tabId || !data.event) return;
      listener(data.event);
    };
    bc.addEventListener('message', handler);
    return () => bc.removeEventListener('message', handler);
  }

  const handler = (e: StorageEvent) => {
    if (e.key === null) return listener({ type: 'signed-out' });
    if (e.key !== SESSION_KEY) return;
    if (e.newValue === null) return listener({ type: 'signed-out' });
    try {
      const { subOrganizationId } = JSON.parse(e.newValue);
      if (typeof subOrganizationId === 'string') {
        listener({ type: 'signed-in', subOrganizationId });
      }
    } catch {
      // not a session entry we can read
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};
