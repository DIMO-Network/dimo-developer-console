import { wagmiAbi } from '@/contracts/wagmi';
import { decodeErrorResult, HttpRequestError } from 'viem';
import Web3 from 'web3';

export const generateWallet = () => {
  const web3 = new Web3(window.ethereum);
  const account = web3.eth.accounts.create();
  const [wallet] = web3.eth.accounts.wallet.add(account);
  return wallet;
};

export const handleOnChainError = (error: HttpRequestError): string => {
  try {
    console.error('Error on chain:', error);

    if (!error.details) {
      return 'Unknown error';
    }

    const errorData: `0x${string}` = error.details
      .replaceAll('"', '')
      .split(': ')[1] as `0x${string}`;

    const decodedError = decodeErrorResult({
      abi: wagmiAbi,
      data: errorData,
    });

    console.error('Error value:', decodedError);

    const { args } = decodedError;

    return args[0];
  } catch (e: unknown) {
    console.error('Error while decoding error:', e);
    return 'Unknown error';
  }
};
