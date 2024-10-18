import { useEffect, useState } from 'react';
import { getContract } from 'viem';
import { utils } from 'web3';

import useGlobalAccount from '@/hooks/useGlobalAccount';
import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';

import configuration from '@/config';

export const useContractGA = () => {
  const { organizationInfo, connectWallet } = useGlobalAccount();
  const [balance, setBalance] = useState<number>(0);
  const [allowance, setAllowance] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimoContract, setDimoContract] = useState<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [licenseContract, setLicenseContract] = useState<any>();

  useEffect(() => {
    if (!organizationInfo) return;

    connectWallet().then((walletData) => {
      const { kernelClient, publicClient } = walletData ?? {};
      if (!kernelClient) return;

      setDimoContract(
        getContract({
          address: configuration.DC_ADDRESS,
          abi: DimoABI,
          client: {
            public: publicClient,
            wallet: kernelClient,
          }
        }),
      );

      setLicenseContract(
        getContract({
          address: configuration.DLC_ADDRESS,
          abi: LicenseABI,
          client: {
            public: publicClient,
            wallet: kernelClient,
          }
        }),
      );

      return { dimoContract, licenseContract };
    });
  }, [organizationInfo]);

  useEffect(() => {
    if (!dimoContract || !organizationInfo) return;

    dimoContract.read.balanceOf([organizationInfo!.walletAddress])
      .then((currentBalanceWei: unknown) => {
        setBalance(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });


    dimoContract.read.allowance([organizationInfo.walletAddress, configuration.DLC_ADDRESS])
      .then((currentBalanceWei: unknown) => {
        setAllowance(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });
  });

  return {
    dimoContract,
    licenseContract,
    address: organizationInfo?.walletAddress,
    balance,
    hasEnoughSpendingLimit: allowance >= configuration.desiredAmountOfAllowance,
  };
};
