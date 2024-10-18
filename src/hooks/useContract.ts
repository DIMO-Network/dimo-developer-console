'use client';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { Contract, utils } from 'web3';

import {
  initDimoSmartContract,
  initDimoLicenseSmartContract,
} from '@/utils/contract';
import configuration from '@/config';

export const useContract = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimoContract, setDimoContract] = useState<Contract<any>>();
  const [allowance, setAllowance] = useState<number>(0);
  const [dimoLicenseContract, setDimoLicenseContract] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useState<Contract<any>>();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      initDimoSmartContract(address).then(setDimoContract);
      initDimoLicenseSmartContract(address).then(setDimoLicenseContract);
    }
  }, [isConnected]);

  useEffect(() => {
    dimoContract?.methods
      .allowance(address, configuration.DLC_ADDRESS)
      .call({
        from: address,
        maxFeePerGas: String(configuration.gasPrice),
        maxPriorityFeePerGas: String(configuration.gasPrice),
      })
      .then((dimoInEther: unknown) => {
        setAllowance(Number(utils.fromWei(dimoInEther as bigint, 'ether')));
      });
  }, [dimoContract]);

  return {
    dimoContract,
    dimoLicenseContract,
    address,
    hasEnoughSpendingLimit: allowance >= configuration.desiredAmountOfAllowance,
    isConnected,
  };
};

export default useContract;
