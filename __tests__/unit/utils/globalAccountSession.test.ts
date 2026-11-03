import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';
import { decryptCredentialBundle } from '@turnkey/crypto';

jest.mock('@turnkey/crypto', () => ({ decryptCredentialBundle: jest.fn() }));

type Mod = typeof import('@/utils/globalAccountSession');

const decrypt = decryptCredentialBundle as jest.Mock;
const future = () => Math.floor(Date.now() / 1000) + 600;
const session = (over = {}) => ({
  email: 'a@b.co',
  role: 'owner',
  subOrganizationId: 'sub-1',
  token: 'tok',
  eKey: 'key-1',
  expiry: future(),
  ...over,
});
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('globalAccountSession', () => {
  let fake: ReturnType<typeof installFakeBroadcastChannel>;
  let mod: Mod;

  // A fresh module per test: it holds one channel per tab.
  const load = () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('@/utils/globalAccountSession');
    });
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    decrypt.mockReset();
    fake = installFakeBroadcastChannel();
    load();
  });
  afterEach(() => fake.restore());

  describe('readSession', () => {
    it('returns null when nothing is stored', () => {
      expect(mod.readSession()).toBeNull();
    });

    it.each([
      ['not JSON', '{'],
      ['no eKey', JSON.stringify({ ...session(), eKey: undefined })],
      ['a string expiry', JSON.stringify(session({ expiry: '9' }))],
    ])('returns null for a malformed entry (%s)', (_n, raw) => {
      localStorage.setItem(mod.SESSION_KEY, raw);
      expect(mod.readSession()).toBeNull();
    });

    it('reads what writeSession stored', () => {
      const s = session();
      mod.writeSession(s);
      expect(mod.readSession()).toEqual(s);
    });
  });

  describe('writeSession', () => {
    it('stores the bundle and its key together in localStorage', () => {
      mod.writeSession(session());
      const stored = JSON.parse(localStorage.getItem(mod.SESSION_KEY)!);
      expect(stored).toMatchObject({ token: 'tok', eKey: 'key-1' });
      expect(sessionStorage.length).toBe(0);
      expect(localStorage.getItem('GlobalAccountEmbeddedKey')).toBeNull();
    });

    it('tells other tabs who signed in, and until when', async () => {
      const other = fake.otherTab();
      const s = session();
      mod.writeSession(s);
      await flush();
      expect(other.received).toEqual([
        {
          from: expect.any(String),
          event: { type: 'signed-in', subOrganizationId: 'sub-1', expiry: s.expiry },
        },
      ]);
    });

    it('does not hear its own announcement', async () => {
      const listener = jest.fn();
      mod.onSessionChange(listener);
      mod.writeSession(session());
      mod.clearSession();
      await flush();
      expect(listener).not.toHaveBeenCalled();
    });

    it('ignores messages carrying its own tab id', async () => {
      const listener = jest.fn();
      mod.onSessionChange(listener);
      const other = fake.otherTab();
      mod.writeSession(session());
      await flush();
      const { from } = other.received[0] as { from: string };
      other.post({ from, event: { type: 'signed-out' } });
      await flush();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearSession', () => {
    it('removes the session, the cached addresses and the old key', () => {
      mod.writeSession(session());
      localStorage.setItem(mod.RESOLVED_ACCOUNT_KEY, '{}');
      localStorage.setItem('GlobalAccountEmbeddedKey', '"k"');
      sessionStorage.setItem(mod.LEGACY_TAB_SESSION_KEY, '{}');
      mod.clearSession();
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it('tells other tabs it signed out', async () => {
      const other = fake.otherTab();
      mod.clearSession();
      await flush();
      expect(other.received).toEqual([
        { from: expect.any(String), event: { type: 'signed-out' } },
      ]);
    });
  });

  describe('onSessionChange', () => {
    it("hears another tab's sign-in and sign-out", async () => {
      const listener = jest.fn();
      mod.onSessionChange(listener);
      const other = fake.otherTab();
      const s = session({ subOrganizationId: 's2' });
      localStorage.setItem(mod.SESSION_KEY, JSON.stringify(s));
      other.post({
        from: 'x',
        event: { type: 'signed-in', subOrganizationId: 's2', expiry: s.expiry },
      });
      other.post({ from: 'x', event: { type: 'signed-out' } });
      await flush();
      expect(listener.mock.calls).toEqual([
        [{ type: 'signed-in', subOrganizationId: 's2', expiry: s.expiry }],
        [{ type: 'signed-out' }],
      ]);
    });

    // A BroadcastChannel message can arrive before the write it announces is
    // visible to this tab's localStorage.
    describe('a sign-in announced before this tab can read it', () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const announce = (other: ReturnType<typeof fake.otherTab>, expiry: number) =>
        other.post({
          from: 'x',
          event: { type: 'signed-in', subOrganizationId: 'sub-1', expiry },
        });

      it('waits for the announced session before telling the listener', async () => {
        mod.writeSession(session({ token: 'tok-1' }));
        const tokens: (string | undefined)[] = [];
        mod.onSessionChange(() => tokens.push(mod.readSession()?.token));
        const other = fake.otherTab();
        const next = session({ token: 'tok-2', expiry: future() + 60 });
        announce(other, next.expiry);
        await flush();
        expect(tokens).toEqual([]);
        localStorage.setItem(mod.SESSION_KEY, JSON.stringify(next));
        await sleep(20);
        expect(tokens).toEqual(['tok-2']);
      });

      it('tells the listener anyway after a few ms', async () => {
        const listener = jest.fn();
        mod.onSessionChange(listener);
        announce(fake.otherTab(), future() + 60);
        await sleep(100);
        expect(listener).toHaveBeenCalledTimes(1);
      });

      it('keeps the order of the events it holds back', async () => {
        const types: string[] = [];
        mod.onSessionChange((e) => types.push(e.type));
        const other = fake.otherTab();
        announce(other, future() + 60);
        other.post({ from: 'x', event: { type: 'signed-out' } });
        await sleep(100);
        expect(types).toEqual(['signed-in', 'signed-out']);
      });

      it('drops a held event after unsubscribe', async () => {
        const listener = jest.fn();
        const off = mod.onSessionChange(listener);
        announce(fake.otherTab(), future() + 60);
        await flush();
        off();
        await sleep(100);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    it('stops after unsubscribe', async () => {
      const listener = jest.fn();
      const off = mod.onSessionChange(listener);
      off();
      fake.otherTab().post({ from: 'x', event: { type: 'signed-out' } });
      await flush();
      expect(listener).not.toHaveBeenCalled();
    });

    describe('without BroadcastChannel', () => {
      beforeEach(() => {
        fake.restore();
        delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
        load();
      });

      it('falls back to the storage event', () => {
        const listener = jest.fn();
        const off = mod.onSessionChange(listener);
        const fire = (init: StorageEventInit) =>
          window.dispatchEvent(new StorageEvent('storage', init));
        fire({
          key: mod.SESSION_KEY,
          newValue: JSON.stringify(session({ subOrganizationId: 's3' })),
        });
        fire({ key: mod.SESSION_KEY, newValue: null });
        fire({ key: null });
        fire({ key: 'theme', newValue: 'dark' });
        expect(listener.mock.calls).toEqual([
          [{ type: 'signed-in', subOrganizationId: 's3', expiry: expect.any(Number) }],
          [{ type: 'signed-out' }],
          [{ type: 'signed-out' }],
        ]);
        off();
        fire({ key: null });
        expect(listener).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('migrateTabSession', () => {
    const old = () => {
      const rest: Partial<ReturnType<typeof session>> = session();
      delete rest.eKey;
      return rest;
    };
    const seedOld = (over = {}) => {
      sessionStorage.setItem(
        mod.LEGACY_TAB_SESSION_KEY,
        JSON.stringify({ ...old(), ...over }),
      );
      sessionStorage.setItem(mod.RESOLVED_ACCOUNT_KEY, '{}');
      localStorage.setItem('GlobalAccountEmbeddedKey', '"key-1"');
    };

    it("moves a tab's old session into the shared store, without announcing it", async () => {
      const other = fake.otherTab();
      seedOld();
      expect(mod.readSession()).toMatchObject({ eKey: 'key-1', token: 'tok' });
      expect(decrypt).toHaveBeenCalledWith('tok', 'key-1');
      expect(sessionStorage.length).toBe(0);
      await flush();
      expect(other.received).toEqual([]);
    });

    it('drops an old session whose key another sign-in replaced', () => {
      decrypt.mockImplementation(() => {
        throw new Error('invalid ghash tag');
      });
      seedOld();
      expect(mod.readSession()).toBeNull();
      expect(sessionStorage.length).toBe(0);
    });

    it('drops an expired old session', () => {
      seedOld({ expiry: 1 });
      expect(mod.readSession()).toBeNull();
      expect(sessionStorage.length).toBe(0);
    });

    it('replaces a shared session that has expired', () => {
      localStorage.setItem(
        mod.SESSION_KEY,
        JSON.stringify(session({ token: 'stale', eKey: 'key-0', expiry: 1 })),
      );
      seedOld();
      expect(mod.readSession()).toMatchObject({ token: 'tok', eKey: 'key-1' });
      expect(sessionStorage.length).toBe(0);
    });

    it('keeps the shared session when there already is one', () => {
      const shared = session({ token: 'shared' });
      mod.writeSession(shared);
      seedOld();
      expect(mod.readSession()).toEqual(shared);
      expect(decrypt).not.toHaveBeenCalled();
      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('isLive', () => {
    it('is live through its expiry second and not after', () => {
      const s = session({ expiry: 100 });
      expect(mod.isLive(s, 100)).toBe(true);
      expect(mod.isLive(s, 101)).toBe(false);
      expect(mod.isLive(null, 0)).toBe(false);
    });
  });
});
