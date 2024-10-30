import { useEffect, useState } from 'react';
import { getContract } from 'viem';
import { utils } from 'web3';

import useGlobalAccount from '@/hooks/useGlobalAccount';
import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { IKernelOperationStatus, ISubOrganization } from '@/types/wallet';

import configuration from '@/config';
import { bundlerActions, ENTRYPOINT_ADDRESS_V07 } from 'permissionless';

export const useContractGA = () => {
  const { organizationInfo, getKernelClient, getPublicClient } = useGlobalAccount();
  const [balanceDimo, setBalanceDimo] = useState<number>(0);
  const [balanceDCX, setBalanceDCX] = useState<number>(0);
  const [allowanceDLC, setAllowanceDLC] = useState<number>(0);
  const [allowanceDCX, setAllowanceDCX] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimoContract, setDimoContract] = useState<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [licenseContract, setLicenseContract] = useState<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dimoCreditsContract, setDimoCreditsContract] = useState<any>();

  useEffect(() => {
    if (!organizationInfo) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kernelClient = getKernelClient(organizationInfo as ISubOrganization) as any;
    const publicClient = getPublicClient();
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

    setDimoCreditsContract(
      getContract({
        address: configuration.DCX_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        }
      }),
    );
  }, [organizationInfo]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (transactions: Array<any>) => {
    if (!organizationInfo) return {} as IKernelOperationStatus;
    const kernelClient = await getKernelClient(organizationInfo);
    const dcxExchangeOpHash = await kernelClient.sendUserOperation({
      userOperation: {
        callData: await kernelClient.account.encodeCallData(transactions),
      },
    });

    console.log({ dcxExchangeOpHash });
    const bundlerClient = kernelClient.extend(
      bundlerActions(ENTRYPOINT_ADDRESS_V07),
    );

    const receipt =
      await bundlerClient.waitForUserOperationReceipt({
        hash: dcxExchangeOpHash,
      });

    console.log({ receipt });

    if (receipt.reason) return Promise.reject(receipt.reason);
  };

  useEffect(() => {
    if (!dimoContract || !organizationInfo) return;

    dimoContract.read.balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDimo(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });

    dimoCreditsContract.read.balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDCX(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });

    dimoContract.read.allowance([organizationInfo.smartContractAddress, configuration.DLC_ADDRESS])
      .then((currentBalanceWei: unknown) => {
        console.log({ dlcAllowance: currentBalanceWei });
        setAllowanceDLC(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });

    dimoContract.read.allowance([organizationInfo.smartContractAddress, configuration.DCX_ADDRESS])
      .then((currentBalanceWei: unknown) => {
        console.log({ dcxAllowance: currentBalanceWei });
        setAllowanceDCX(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      });
  });

  return {
    dimoContract,
    licenseContract,
    dimoCreditsContract,
    address: organizationInfo?.smartContractAddress,
    balanceDimo,
    balanceDCX,
    allowanceDLC,
    allowanceDCX,
    processTransactions,
    hasEnoughBalanceDCX: balanceDCX >= configuration.desiredAmountOfDCX,
    hasEnoughBalanceDimo: balanceDCX >= configuration.desiredAmountOfDimo,
    hasEnoughAllowanceDLC: allowanceDLC >= configuration.desiredAmountOfDCX,
    hasEnoughAllowanceDCX: allowanceDCX >= configuration.desiredAmountOfDimo,
  };
};
