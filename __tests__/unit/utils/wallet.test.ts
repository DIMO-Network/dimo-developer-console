import { privateKeyToAccount } from 'viem/accounts';
import { generateWallet } from '@/utils/wallet';

describe('generateWallet', () => {
  it('returns a private key and the address it controls', () => {
    const { address, privateKey } = generateWallet();
    expect(privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(privateKeyToAccount(privateKey).address).toBe(address);
  });

  it('makes a new key each time', () => {
    expect(generateWallet().privateKey).not.toBe(generateWallet().privateKey);
  });
});
