import { useEffect, useState } from 'react';
import { getContract, HttpRequestError } from 'viem';
import { utils } from 'web3';

import useGlobalAccount from '@/hooks/useGlobalAccount';
import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { IKernelOperationStatus, ISubOrganization } from '@/types/wallet';

import configuration from '@/config';
import { bundlerActions, ENTRYPOINT_ADDRESS_V07 } from 'permissionless';

export const useContractGA = () => {
  const {
    organizationInfo,
    getKernelClient,
    getPublicClient,
    handleOnChainError,
  } = useGlobalAccount();
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
    const handleGetContracts = async () => {
      if (!organizationInfo) return;

      const kernelClient = (await getKernelClient(
        organizationInfo as ISubOrganization,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as any;
      const publicClient = getPublicClient();

      if (!kernelClient) return;

      setDimoContract(
        getContract({
          address: configuration.DC_ADDRESS,
          abi: DimoABI,
          client: {
            public: publicClient,
            wallet: kernelClient,
          },
        }),
      );

      setLicenseContract(
        getContract({
          address: configuration.DLC_ADDRESS,
          abi: LicenseABI,
          client: {
            public: publicClient,
            wallet: kernelClient,
          },
        }),
      );

      setDimoCreditsContract(
        getContract({
          address: configuration.DCX_ADDRESS,
          abi: DimoCreditsABI,
          client: {
            public: publicClient,
            wallet: kernelClient,
          },
        }),
      );
    };

    handleGetContracts().catch(console.error);
  }, [organizationInfo?.smartContractAddress]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (transactions: Array<any>) => {
    if (!organizationInfo) return {} as IKernelOperationStatus;
    try {
      const kernelClient = await getKernelClient(organizationInfo);

      if (!kernelClient) return {} as IKernelOperationStatus;

      const dcxExchangeOpHash = await kernelClient.sendUserOperation({
        userOperation: {
          callData: await kernelClient.account.encodeCallData(transactions),
        },
      });

      const bundlerClient = kernelClient.extend(
        bundlerActions(ENTRYPOINT_ADDRESS_V07),
      );

      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: dcxExchangeOpHash,
      });

      if (receipt.reason) throw new Error(receipt.reason);

      return receipt;
    } catch (e: unknown) {
      if (e instanceof HttpRequestError) {
        throw new Error(handleOnChainError(e as HttpRequestError));
      }
      throw e;
    }
  };

  useEffect(() => {
    if (!dimoContract || !organizationInfo) return;

    dimoContract.read
      .balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDimo(
          Number(utils.fromWei(currentBalanceWei as bigint, 'ether')),
        );
      })
      .catch(console.error);

    dimoCreditsContract.read
      .balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDCX(
          Number(utils.fromWei(currentBalanceWei as bigint, 'ether')),
        );
      })
      .catch(console.error);

    dimoContract.read
      .allowance([
        organizationInfo.smartContractAddress,
        configuration.DLC_ADDRESS,
      ])
      .then((currentBalanceWei: unknown) => {
        setAllowanceDLC(
          Math.ceil(
            Number(utils.fromWei(currentBalanceWei as bigint, 'ether')),
          ),
        );
      })
      .catch(console.error);

    dimoContract.read
      .allowance([
        organizationInfo.smartContractAddress,
        configuration.DCX_ADDRESS,
      ])
      .then((currentBalanceWei: unknown) => {
        setAllowanceDCX(
          Math.ceil(
            Number(utils.fromWei(currentBalanceWei as bigint, 'ether')),
          ),
        );
      })
      .catch(console.error);
  }, [dimoContract, dimoCreditsContract]);

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