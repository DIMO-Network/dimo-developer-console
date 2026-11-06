import { pad, toHex } from 'viem';
import { decodeHex } from '@/utils/formatHex';

// The same results as ethers' AbiCoder, which this replaces.
describe('decodeHex', () => {
  it.each([0n, 42n, 2n ** 255n + 7n, 2n ** 256n - 1n])('decodes the uint256 %p', (n) => {
    expect(decodeHex(pad(toHex(n)), 'uint256')).toBe(n);
  });

  it('reads the first word of longer data', () => {
    expect(decodeHex(`${pad(toHex(42n))}${'ff'.repeat(32)}`, 'uint256')).toBe(42n);
  });

  it.each(['0x', '0x2a'] as const)('throws on %p, too short for a uint256', (data) => {
    expect(() => decodeHex(data, 'uint256')).toThrow();
  });
});
