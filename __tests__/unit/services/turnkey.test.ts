import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';
import { decryptCredentialBundle } from '@turnkey/crypto';
import { ApiKeyStamper } from '@turnkey/sdk-server';
import { getSessionTurnkeyClient } from '@/services/turnkey';
import { onSessionChange, SESSION_KEY, writeSession } from '@/utils/globalAccountSession';

// A bundle opens only with the key it was encrypted to: bundle-n with key-n.
// Anything else fails the way Turnkey's HPKE does.
jest.mock('@turnkey/crypto', () => ({
  decryptCredentialBundle: jest.fn((bundle: string, key: string) => {
    const b = /^bundle-(\d+)$/.exec(bundle);
    const k = /^key-(\d+)$/.exec(key);
    if (!b || !k || b[1] !== k[1]) throw new Error('invalid ghash tag');
    return b[1].padStart(64, '0');
  }),
  getPublicKey: jest.fn(() => new Uint8Array(33)),
}));
jest.mock('@turnkey/sdk-server', () => ({ ApiKeyStamper: jest.fn() }));
jest.mock('@turnkey/http', () => ({ TurnkeyClient: jest.fn() }));
jest.mock('@/config/turnkey', () => ({
  turnkeyConfig: { apiBaseUrl: 'https://turnkey.test' },
}));

const decrypt = decryptCredentialBundle as jest.Mock;
const privateKeyOf = (n: number) => String(n).padStart(64, '0');
const future = () => Math.floor(Date.now() / 1000) + 600;
const session = (n: number, over = {}) => ({
  email: 'a@b.co',
  role: 'owner',
  subOrganizationId: 'sub-1',
  token: `bundle-${n}`,
  eKey: `key-${n}`,
  expiry: future() + n,
  ...over,
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('getSessionTurnkeyClient', () => {
  let fake: ReturnType<typeof installFakeBroadcastChannel>;

  beforeAll(() => {
    fake = installFakeBroadcastChannel();
  });
  afterAll(() => fake.restore());
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("builds the client from the session's own bundle and key, not the recovery key", () => {
    localStorage.setItem('GlobalAccountEmbeddedKey', '"recovery-key"');
    localStorage.setItem(SESSION_KEY, JSON.stringify(session(2)));
    expect(getSessionTurnkeyClient()).not.toBeNull();
    expect(decrypt).toHaveBeenCalledWith('bundle-2', 'key-2');
    expect(decrypt).not.toHaveBeenCalledWith(expect.anything(), 'recovery-key');
  });

  it('keeps working after another tab signs in again', () => {
    writeSession(session(1));
    writeSession(session(2));
    expect(() => getSessionTurnkeyClient()).not.toThrow();
    expect(decrypt).toHaveBeenLastCalledWith('bundle-2', 'key-2');
    expect(ApiKeyStamper).toHaveBeenLastCalledWith(
      expect.objectContaining({ apiPrivateKey: privateKeyOf(2) }),
    );
  });

  // Two tabs: this one signed in with pair 1; the other signs in again and
  // announces it before its write is visible here. This tab's next Turnkey
  // call, made when it hears the news, uses the new bundle with the new key.
  it("acts with the other tab's new pair, never a mixed one", async () => {
    writeSession(session(1));
    const other = fake.otherTab();
    const built: unknown[] = [];
    const off = onSessionChange(() => {
      getSessionTurnkeyClient();
      built.push((ApiKeyStamper as unknown as jest.Mock).mock.lastCall?.[0]);
    });
    const next = session(2);
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: 'sub-1', expiry: next.expiry },
    });
    await sleep(2);
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    await sleep(60);
    off();
    other.close();
    expect(built).toEqual([expect.objectContaining({ apiPrivateKey: privateKeyOf(2) })]);
    for (const [bundle, key] of decrypt.mock.calls) {
      expect(bundle.slice('bundle-'.length)).toBe(key.slice('key-'.length));
    }
  });

  it('has no client without a session', () => {
    localStorage.setItem('GlobalAccountEmbeddedKey', '"recovery-key"');
    expect(getSessionTurnkeyClient()).toBeNull();
    expect(decrypt).not.toHaveBeenCalled();
  });

  it('has no client once the session has expired', () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session(1, { expiry: 1 })));
    expect(getSessionTurnkeyClient()).toBeNull();
  });
});
