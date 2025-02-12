import { useEffect, useState } from 'react';
import { getContract, HttpRequestError } from 'viem';
import { utils } from 'web3';
import * as Sentry from '@sentry/nextjs';

import useGlobalAccount from '@/hooks/useGlobalAccount';
import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import WMatic from '@/contracts/wmatic.json';
import {
  IDesiredTokenAmount,
  IGlobalAccountSession,
  IKernelOperationStatus,  
  ITokenBalance,
} from '@/types/wallet';

import configuration from '@/config';
import { getCachedDimoPrice } from '@/services/pricing';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';

const { DCX_IN_USD = 0.001 } = process.env;

export const useContractGA = () => {
  const { getKernelClient, getPublicClient, handleOnChainError } = useGlobalAccount();
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
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return;

      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });
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

    handleGetContracts().catch((error) => {
      Sentry.captureException(error);
    });
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (transactions: Array<any>) => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!organizationInfo) return {} as IKernelOperationStatus;
    try {
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

      if (!kernelClient) return {} as IKernelOperationStatus;
      const operation = await kernelClient.account.encodeCalls(transactions);
      const dcxExchangeOpHash = await kernelClient.sendUserOperation({
        callData: operation,
      });

      const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: dcxExchangeOpHash,
      });

      if (receipt.reason) throw new Error(receipt.reason);

      return receipt;
    } catch (e: unknown) {
      Sentry.captureException(e);
      if (e instanceof HttpRequestError) {
        throw new Error(handleOnChainError(e as HttpRequestError));
      }
      throw e;
    }
  };

  const getDcxBalance = async (): Promise<number> => {
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

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
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  const getDimoBalance = async (): Promise<number> => {
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

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
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  const getDesiredTokenAmount = async (): Promise<IDesiredTokenAmount> => {
    const DEFAULT_AMOUNTS = {
      dimo: BigInt(0),
      dcx: BigInt(0),
      licensePrice: 0,
      dimoCost: 0,
    };

    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return DEFAULT_AMOUNTS;

      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

      if (!kernelClient) return DEFAULT_AMOUNTS;

      const dimoPrice = await getCachedDimoPrice();

      const contract = getContract({
        address: configuration.DLC_ADDRESS,
        abi: LicenseABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentLicenseCost = await contract.read.licenseCostInUsd1e18();
      const desiredDimoAmount = Number(currentLicenseCost) / Number(dimoPrice);
      const desiredDCXAmount = Number(currentLicenseCost) / Number(DCX_IN_USD);

      return {
        dimo: BigInt(desiredDimoAmount),
        dcx: BigInt(desiredDCXAmount),
        licensePrice: Number(currentLicenseCost),
        dimoCost: Number(dimoPrice),
      };
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error(e);
      return DEFAULT_AMOUNTS;
    }
  };

  const checkEnoughBalance = async (): Promise<ITokenBalance> => {
    const DEFAULT_TOKEN_BALANCE = {
      dimo: false,
      dcx: false,
      dcxAllowance: false,
      dlcAllowance: false,
    };
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return DEFAULT_TOKEN_BALANCE;

      const desiredTokenAmount = await getDesiredTokenAmount();
      const dimoBalance = await getDimoBalance();
      const dcxBalance = await getDcxBalance();

      return {
        dimo: dimoBalance >= Number(desiredTokenAmount.dimo),
        dlcAllowance: allowanceDLC >= Number(desiredTokenAmount.dcx),
        dcx: dcxBalance >= Number(desiredTokenAmount.dcx),
        dcxAllowance: allowanceDCX >= Number(desiredTokenAmount.dimo),
      };
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error('Error while checking balance', e);
      return DEFAULT_TOKEN_BALANCE;
    }
  };

  const getPolBalance = async (): Promise<number> => {
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

      if (!kernelClient) {
        return 0;
      }

      const polBalance = await publicClient.getBalance({
        address: organizationInfo.smartContractAddress,
      });

      return Number(utils.fromWei(polBalance as bigint, 'ether'));
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  const getWmaticBalance = async (): Promise<number> => {
    try {
      const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const organizationInfo = gaSession?.organization;
      if (!organizationInfo) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: gaSession.session.authenticator,
      });

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
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  useEffect(() => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!dimoContract || !organizationInfo) return;

    dimoContract.read
      .balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDimo(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
      });

    dimoCreditsContract.read
      .balanceOf([organizationInfo!.smartContractAddress])
      .then((currentBalanceWei: unknown) => {
        setBalanceDCX(Number(utils.fromWei(currentBalanceWei as bigint, 'ether')));
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
      });

    dimoContract.read
      .allowance([organizationInfo.smartContractAddress, configuration.DLC_ADDRESS])
      .then((currentBalanceWei: unknown) => {
        setAllowanceDLC(
          Math.ceil(Number(utils.fromWei(currentBalanceWei as bigint, 'ether'))),
        );
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
      });

    dimoContract.read
      .allowance([organizationInfo.smartContractAddress, configuration.DCX_ADDRESS])
      .then((currentBalanceWei: unknown) => {
        setAllowanceDCX(
          Math.ceil(Number(utils.fromWei(currentBalanceWei as bigint, 'ether'))),
        );
      })
      .catch((error: unknown) => {
        Sentry.captureException(error);
      });
  }, [dimoContract]);

  return {
    dimoContract,
    licenseContract,
    dimoCreditsContract,
    balanceDimo,
    balanceDCX,
    allowanceDLC,
    allowanceDCX,
    processTransactions,
    getDcxBalance,
    getDimoBalance,
    getPolBalance,
    getWmaticBalance,
    getDesiredTokenAmount,
    checkEnoughBalance,
  };
};
