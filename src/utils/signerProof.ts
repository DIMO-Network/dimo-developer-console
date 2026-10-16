import { getAddress } from 'viem';

// Exact text from the console-teams contracts (C6). console-api rejects any
// other wording, casing or line ending.
export const buildSignerProofMessage = ({
  eoa,
  kernelAddress,
  issuedAt,
}: {
  eoa: string;
  kernelAddress: string;
  issuedAt: string;
}): string =>
  `DIMO Developer Console\nLink signer ${getAddress(eoa)} to account ${getAddress(kernelAddress)}\nIssued at ${issuedAt}`;
