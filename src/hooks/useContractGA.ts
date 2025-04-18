'use client';

import { Abi, Call, getContract, HttpRequestError } from 'viem';
import { utils } from 'web3';
import * as Sentry from '@sentry/nextjs';
import useGlobalAccount from '@/hooks/useGlobalAccount';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import {
  IDesiredTokenAmount,
  IKernelOperationStatus,
  ITokenBalance,
} from '@/types/wallet';

import configuration from '@/config';
import { getCachedDimoPrice } from '@/services/pricing';
import { handleOnChainError } from '@/utils/wallet';
import { getKernelClient, getPublicClient } from '@/services/zerodev';
import { getSessionTurnkeyClient } from '@/services/turnkey';

const { DCX_IN_USD = 0.001 } = process.env;

export const useContractGA = () => {
  const { validateCurrentSession, getCurrentDcxBalance, getCurrentDimoBalance } =
    useGlobalAccount();

  const processTransactions = async (
    transactions: Array<Call>,
    options?: { abi?: Abi },
  ) => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return {} as IKernelOperationStatus;
      const { subOrganizationId, walletAddress } = currentSession;

      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient) return {} as IKernelOperationStatus;

      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress: walletAddress,
        client: turnkeyClient,
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
        throw new Error(handleOnChainError(e as HttpRequestError, options?.abi));
      }
      throw e;
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
      const currentSession = await validateCurrentSession();
      if (!currentSession) return DEFAULT_AMOUNTS;
      const { subOrganizationId, walletAddress } = currentSession;
      const turnkeyClient = getSessionTurnkeyClient();
      if (!turnkeyClient) return DEFAULT_AMOUNTS;

      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        client: turnkeyClient,
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
      const currentSession = await validateCurrentSession();
      if (!currentSession) return DEFAULT_TOKEN_BALANCE;
      const desiredTokenAmount = await getDesiredTokenAmount();
      const dimoBalance = await getCurrentDimoBalance();
      const dcxBalance = await getCurrentDcxBalance();
      const dcxAllowance = await getDcxAllowance();

      return {
        dimo: dimoBalance >= Number(desiredTokenAmount.dimo),
        dlcAllowance: dcxAllowance >= Number(desiredTokenAmount.dcx),
        dcx: dcxBalance >= Number(desiredTokenAmount.dcx),
        dcxAllowance: dcxAllowance >= Number(desiredTokenAmount.dimo),
      };
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error('Error while checking balance', e);
      return DEFAULT_TOKEN_BALANCE;
    }
  };

  const getDcxAllowance = async (): Promise<number> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return 0;
      const { subOrganizationId, walletAddress, smartContractAddress } = currentSession;
      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress,
        client: turnkeyClient,
      });

      if (!kernelClient) {
        return 0;
      }

      const dimoContract = getContract({
        address: configuration.DC_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentAllowanceOnWei = await dimoContract.read.allowance([
        smartContractAddress,
        configuration.DLC_ADDRESS,
      ]);

      return Number(utils.fromWei(currentAllowanceOnWei as bigint, 'ether'));
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  const getDimoAllowance = async (): Promise<number> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return 0;
      const { subOrganizationId, walletAddress, smartContractAddress } = currentSession;
      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient) return 0;
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress,
        client: turnkeyClient,
      });

      if (!kernelClient) {
        return 0;
      }

      const dimoContract = getContract({
        address: configuration.DC_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentAllowanceOnWei = await dimoContract.read.allowance([
        smartContractAddress,
        configuration.DCX_ADDRESS,
      ]);

      return Number(utils.fromWei(currentAllowanceOnWei as bigint, 'ether'));
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error(e);
      return 0;
    }
  };

  const approveNewSpendingLimit = async (
    amount: number,
    addressToAllow: `0x${string}`,
  ): Promise<void> => {
    const currentSession = await validateCurrentSession();
    if (!currentSession) return;
    const { subOrganizationId, walletAddress } = currentSession;
    const turnkeyClient = getSessionTurnkeyClient();

    if (!turnkeyClient) return;
    const publicClient = getPublicClient();
    const kernelClient = await getKernelClient({
      subOrganizationId,
      walletAddress,
      client: turnkeyClient,
    });

    if (!kernelClient) {
      return;
    }

    const dimoContract = getContract({
      address: configuration.DC_ADDRESS,
      abi: DimoCreditsABI,
      client: {
        public: publicClient,
        wallet: kernelClient,
      },
    });

    const dimoInWei = utils.toWei(amount, 'ether');
    await dimoContract.write.approve([addressToAllow, dimoInWei]);
  };

  const getNeededDimoAmountForDcx = async (amount: number): Promise<bigint> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return BigInt(0);
      const { subOrganizationId, walletAddress } = currentSession;
      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient) return BigInt(0);
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress,
        client: turnkeyClient,
      });

      if (!kernelClient) {
        return BigInt(0);
      }

      const contract = getContract({
        address: configuration.DCX_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const quote = await contract.read.getQuoteDc([
        BigInt(utils.toWei(amount, 'ether')),
      ]);

      return BigInt(Math.ceil(Number(utils.fromWei(quote as bigint, 'ether'))));
    } catch (e) {
      Sentry.captureException(e);
      const errorReason = handleOnChainError(e as HttpRequestError);
      console.error('Error getting needed dimo amount', errorReason);
      return BigInt(0);
    }
  };

  return {
    approveNewSpendingLimit,
    getDcxAllowance,
    getDimoAllowance,
    processTransactions,
    getDesiredTokenAmount,
    checkEnoughBalance,
    getNeededDimoAmountForDcx,
  };
};
