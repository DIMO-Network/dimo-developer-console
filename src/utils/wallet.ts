import { wagmiAbi } from '@/contracts/wagmi';
import { Abi, decodeErrorResult, HttpRequestError } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// A new key pair, for an API key: the private key goes to the user, the
// address is enabled as the license's signer.
export const generateWallet = () => {
  const privateKey = generatePrivateKey();
  return { address: privateKeyToAccount(privateKey).address, privateKey };
};

export const handleOnChainError = (
  error: HttpRequestError,
  abi: Abi = wagmiAbi,
): string => {
  try {
    console.error('Error on chain:', error);

    if (!error.details) {
      return 'Unknown error';
    }

    const errorData: `0x${string}` = error.details
      .replaceAll('"', '')
      .split(': ')[1] as `0x${string}`;

    const decodedError = decodeErrorResult({
      abi,
      data: errorData,
    });

    console.error('Error value:', decodedError);

    const { errorName } = decodedError;

    return errorName;
  } catch (e: unknown) {
    console.error('Error while decoding error:', e);
    return 'Unknown error';
  }
};
