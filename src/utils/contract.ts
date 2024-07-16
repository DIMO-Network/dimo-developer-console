import Web3 from 'web3';
import { POSClient, use } from '@maticnetwork/maticjs';
import { Web3ClientPlugin } from '@maticnetwork/maticjs-web3';

import configuration from '@/config';

const initContract = async (
  fromAddress: `0x${string}`,
  contractAddress: `0x${string}`
) => {
  use(Web3ClientPlugin);
  const posClient = new POSClient();

  const web3 = new Web3(window.ethereum);

  await posClient.init({
    network: 'mainnet',
    version: 'v1',
    parent: {
      provider: web3.currentProvider,
      defaultConfig: {
        from: fromAddress,
      },
    },
    child: {
      provider: web3.currentProvider,
      defaultConfig: {
        from: fromAddress,
      },
    },
  });

  return posClient.erc20(contractAddress, true);
};

export const initDimoSmartContract = async (fromAddress: `0x${string}`) => {
  return initContract(fromAddress, configuration.DC_ADDRESS as `0x${string}`);
};

export const initDimoLicenseSmartContract = async (
  fromAddress: `0x${string}`
) => {
  return initContract(fromAddress, configuration.DLC_ADDRESS as `0x${string}`);
};
