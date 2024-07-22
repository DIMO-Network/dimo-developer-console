'use client';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

import {
  initDimoSmartContract,
  initDimoLicenseSmartContract,
} from '@/utils/contract';
import { Contract } from 'web3';

export const useContract = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimoContract, setDimoContract] = useState<Contract<any>>();
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

  return { dimoContract, dimoLicenseContract, address, isConnected };
};

export default useContract;
