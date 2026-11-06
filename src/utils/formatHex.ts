import { decodeAbiParameters } from 'viem';

// One ABI-encoded value, such as a token id from a log: decodeHex(data, 'uint256').
export const decodeHex = (str: `0x${string}`, type: string) =>
  decodeAbiParameters([{ type }], str)[0];
