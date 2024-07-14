'use client';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

import {
  initDimoSmartContract,
  initDimoLicenseSmartContract,
} from '@/utils/contract';
import { ERC20 } from '@maticnetwork/maticjs/dist/ts/pos/erc20';

export const useContract = () => {
  const [dimoContract, setDimoContract] = useState<ERC20>();
  const [dimoLicenseContract, setDimoLicenseContract] = useState<ERC20>();
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
