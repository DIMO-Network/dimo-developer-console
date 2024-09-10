import { get } from 'lodash';
import Web3 from 'web3';

import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';

import configuration from '@/config';

const initContract = async (
  fromAddress: `0x${string}`,
  contractAddress: `0x${string}`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contractABI: any
) => {
  const web3 = new Web3(window.ethereum);
  return new web3.eth.Contract(contractABI, contractAddress);
};

export const initDimoSmartContract = async (fromAddress: `0x${string}`) => {
  return initContract(
    fromAddress,
    configuration.DC_ADDRESS as `0x${string}`,
    DimoABI
  );
};

export const initDimoLicenseSmartContract = async (
  fromAddress: `0x${string}`
) => {
  return initContract(
    fromAddress,
    configuration.DLC_ADDRESS as `0x${string}`,
    LicenseABI
  );
};

export const changeNetwork = async () => {
  const web3 = new Web3(window.ethereum);
  const networkId = await web3.eth.net.getId();

  if (networkId != configuration.CONTRACT_NETWORK) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: web3.utils.toHex(configuration.CONTRACT_NETWORK) }],
      });
    } catch (err: unknown) {
      if (get(err, 'code') === 4902) {
        const chainParams = getChainParams(web3);
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            chainParams,
          ],
        });
      }
    }
  }
};

const getChainParams = (web3: Web3) => {
  const isAmoy = configuration.CONTRACT_NETWORK === BigInt(80_002);
  const chainName = isAmoy ? 'Polygon Amoy' : 'Polygon';
  const rpcUrl = isAmoy
    ? 'https://rpc-amoy.polygon.technology'
    : 'https://polygon-rpc.com';

  return {
    chainName,
    chainId: web3.utils.toHex(configuration.CONTRACT_NETWORK),
    nativeCurrency: { name: 'MATIC', decimals: 18, symbol: 'MATIC' },
    rpcUrls: [rpcUrl]
  };
};
