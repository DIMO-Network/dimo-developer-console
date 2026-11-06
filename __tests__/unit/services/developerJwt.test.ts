/**
 * @jest-environment node
 */
jest.mock('@/actions/dimoAuth', () => ({
  requestDexChallenge: jest.fn(),
  submitDexChallenge: jest.fn(),
}));
import { recoverMessageAddress, toHex } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';
import { getDeveloperJwt } from '@/services/developerJwt';

const CLIENT_ID = '0x00000000000000000000000000000000000000aa';
const DOMAIN = 'https://rentals.dimo.co/';
const CHALLENGE = `rentals.dimo.co wants you to sign in with your Ethereum account:
${CLIENT_ID}

URI: https://rentals.dimo.co/
Nonce: 9f3c1a7e2b`;

const request = requestDexChallenge as jest.Mock;
const submit = submitDexChallenge as jest.Mock;

describe('getDeveloperJwt', () => {
  const privateKey = generatePrivateKey();
  const { address } = privateKeyToAccount(privateKey);

  beforeEach(() => {
    request.mockResolvedValue({ ok: true, data: { challenge: CHALLENGE, state: 'st' } });
    submit.mockResolvedValue({ ok: true, data: { access_token: 'dev.jwt.token' } });
  });

  it("asks for the license's challenge, signs it with the key and returns the JWT", async () => {
    await expect(
      getDeveloperJwt({ client_id: CLIENT_ID, domain: DOMAIN, private_key: privateKey }),
    ).resolves.toEqual({ headers: { Authorization: 'Bearer dev.jwt.token' } });

    expect(request).toHaveBeenCalledWith({
      address: CLIENT_ID,
      clientId: CLIENT_ID,
      domain: DOMAIN,
    });
    const [{ signedChallenge, state, clientId, domain }] = submit.mock.calls[0];
    expect({ state, clientId, domain }).toEqual({
      state: 'st',
      clientId: CLIENT_ID,
      domain: DOMAIN,
    });
    await expect(
      recoverMessageAddress({ message: CHALLENGE, signature: signedChallenge }),
    ).resolves.toBe(address);
  });

  it('takes the key with or without 0x, and with stray spaces', async () => {
    await getDeveloperJwt({
      client_id: CLIENT_ID,
      domain: DOMAIN,
      private_key: ` ${privateKey.slice(2)}\n`,
    });
    const [{ signedChallenge }] = submit.mock.calls[0];
    await expect(
      recoverMessageAddress({ message: CHALLENGE, signature: signedChallenge }),
    ).resolves.toBe(address);
  });

  it('signs a hex challenge as raw bytes, as web3 did', async () => {
    const hexChallenge = toHex('raw challenge bytes');
    request.mockResolvedValue({
      ok: true,
      data: { challenge: hexChallenge, state: 'st' },
    });
    await getDeveloperJwt({
      client_id: CLIENT_ID,
      domain: DOMAIN,
      private_key: privateKey,
    });
    const [{ signedChallenge }] = submit.mock.calls[0];
    await expect(
      recoverMessageAddress({
        message: { raw: hexChallenge },
        signature: signedChallenge,
      }),
    ).resolves.toBe(address);
  });

  it('never sends the key to the server', async () => {
    await getDeveloperJwt({
      client_id: CLIENT_ID,
      domain: DOMAIN,
      private_key: privateKey,
    });
    const sent = JSON.stringify([request.mock.calls, submit.mock.calls]);
    expect(sent).not.toContain(privateKey.slice(2));
  });

  it('returns null for a key that is not one, without asking for a challenge', async () => {
    await expect(
      getDeveloperJwt({ client_id: CLIENT_ID, domain: DOMAIN, private_key: 'not a key' }),
    ).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns null when the challenge or its submission is refused', async () => {
    request.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(
      getDeveloperJwt({ client_id: CLIENT_ID, domain: DOMAIN, private_key: privateKey }),
    ).resolves.toBeNull();
    expect(submit).not.toHaveBeenCalled();

    submit.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(
      getDeveloperJwt({ client_id: CLIENT_ID, domain: DOMAIN, private_key: privateKey }),
    ).resolves.toBeNull();
  });
});
