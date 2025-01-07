import { useEffect, useState } from 'react';
import { getContract, HttpRequestError } from 'viem';
import { utils } from 'web3';

import useGlobalAccount from '@/hooks/useGlobalAccount';
import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import WMatic from '@/contracts/wmatic.json';
import { IKernelOperationStatus, ISubOrganization } from '@/types/wallet';

import configuration from '@/config';

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
        callData: await kernelClient.account.encodeCalls(transactions),
      });

      const receipt = await kernelClient.waitForUserOperationReceipt({
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

  const getDcxBalance = async (): Promise<number> => {
    try {
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient(organizationInfo);

      if (!kernelClient) {
        return 0;
      }

      const creditsContract = getContract({
        address: configuration.DCX_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentBalanceOnWei = await creditsContract.read.balanceOf([
        organizationInfo!.smartContractAddress,
      ]);

      return Number(utils.fromWei(currentBalanceOnWei as bigint, 'ether'));
    } catch (e: unknown) {
      console.error(e);
      return 0;
    }
  };

  const getDimoBalance = async (): Promise<number> => {
    try {
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient(organizationInfo);

      if (!kernelClient) {
        return 0;
      }

      const dimoTokenContract = getContract({
        address: configuration.DC_ADDRESS,
        abi: DimoABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentBalanceOnWei = await dimoTokenContract.read.balanceOf([
        organizationInfo!.smartContractAddress,
      ]);

      return Number(utils.fromWei(currentBalanceOnWei as bigint, 'ether'));
    } catch (e: unknown) {
      console.error(e);
      return 0;
    }
  };

  const getPolBalance = async (): Promise<number> => {
    try {
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient(organizationInfo);

      if (!kernelClient) {
        return 0;
      }

      const polBalance = await publicClient.getBalance({
        address: organizationInfo.smartContractAddress,
      });

      return Number(utils.fromWei(polBalance as bigint, 'ether'));
    } catch (e: unknown) {
      console.error(e);
      return 0;
    }
  };

  const getWmaticBalance = async (): Promise<number> => {
    try {
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient(organizationInfo);

      if (!kernelClient) {
        return 0;
      }

      const contract = getContract({
        address: configuration.WMATIC,
        abi: WMatic,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const wmaticBalance = await contract.read.balanceOf([
        organizationInfo.smartContractAddress,
      ]);

      return Number(utils.fromWei(wmaticBalance as bigint, 'ether'));
    } catch (e: unknown) {
      console.error(e);
      return 0;
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
  }, [dimoContract, organizationInfo?.smartContractAddress]);

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
    getDcxBalance,
    getDimoBalance,
    getPolBalance,
    getWmaticBalance,
    hasEnoughBalanceDCX: balanceDCX >= configuration.desiredAmountOfDCX,
    hasEnoughBalanceDimo: balanceDCX >= configuration.desiredAmountOfDimo,
    hasEnoughAllowanceDLC: allowanceDLC >= configuration.desiredAmountOfDCX,
    hasEnoughAllowanceDCX: allowanceDCX >= configuration.desiredAmountOfDimo,
  };
};
