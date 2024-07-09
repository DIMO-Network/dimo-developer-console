'use client';
import Web3, { Contract, ContractAbi } from 'web3';
import { useEffect, useState } from 'react';

import contractABI from '@/contracts/DeveloperLicenseContract.json';
import configuration from '@/config';

export const useContract = () => {
  const [contract, setContract] = useState<Contract<ContractAbi> | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const web3 = new Web3(window.ethereum);
    const contractAddress = configuration.DLC_ADDRESS;
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    setContract(contract);
    contract.methods.totalStaked().call<number>().then(setBalance);
  }, []);

  return { contract, balance };
};

export default useContract;
