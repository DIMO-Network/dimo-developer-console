import { isHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';

export interface DeveloperJwtResponse {
  headers: { Authorization: `Bearer ${string}` };
}

/**
 * A license's developer JWT, signed with one of its API keys: DIMO's
 * challenge for the license (its client id as the address), signed, then
 * submitted. It's what data-sdk's getDeveloperJwt did, through the console's
 * own auth actions, so it reaches the auth server of the console's environment
 * (data-sdk 1.8 knows production only). The key signs here: only the
 * signature leaves the browser.
 *
 * null when it didn't work: a key that isn't one, or a refused or failed
 * challenge (the actions report unexpected failures).
 */
export const getDeveloperJwt = async ({
  client_id,
  domain,
  private_key,
}: {
  client_id: string;
  domain: string;
  private_key: string;
}): Promise<DeveloperJwtResponse | null> => {
  let signer: ReturnType<typeof privateKeyToAccount>;
  try {
    signer = privateKeyToAccount(`0x${private_key.trim().replace(/^0x/i, '')}`);
  } catch {
    return null;
  }

  const challenge = await requestDexChallenge({
    address: client_id as `0x${string}`,
    clientId: client_id,
    domain,
  });
  if (!challenge.ok) return null;

  const { challenge: message, state } = challenge.data;
  // web3, which signed these before, read a hex challenge as raw bytes, not
  // as text. Kept, as data-sdk keeps it, so signatures don't change.
  const signedChallenge = await signer.signMessage({
    message: isHex(message) ? { raw: message } : message,
  });

  const token = await submitDexChallenge({
    state,
    signedChallenge,
    clientId: client_id,
    domain,
  });
  if (!token.ok || !token.data.access_token) return null;
  return { headers: { Authorization: `Bearer ${token.data.access_token}` } };
};
