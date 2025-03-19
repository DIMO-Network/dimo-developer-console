'use client';

import { encodeFunctionData, getContract, HttpRequestError } from 'viem';
import { utils } from 'web3';
import * as Sentry from '@sentry/nextjs';

import useGlobalAccount from '@/hooks/useGlobalAccount';
// import DimoABI from '@/contracts/DimoTokenContract.json';
import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import WMatic from '@/contracts/wmatic.json';
import UniversalRouter from '@/contracts/uniswapRouter.json';
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
import config from '@/config';

const { DCX_IN_USD = 0.001 } = process.env;
const MIN_SQRT_RATIO: bigint = BigInt('4295128739');

export const useContractGA = () => {
  const { validateCurrentSession, getCurrentDcxBalance, getCurrentDimoBalance } =
    useGlobalAccount();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (transactions: Array<any>) => {
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
        throw new Error(handleOnChainError(e as HttpRequestError));
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

  const getPolBalance = async (): Promise<number> => {
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

      const polBalance = await publicClient.getBalance({
        address: smartContractAddress,
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

      const contract = getContract({
        address: configuration.WMATIC,
        abi: WMatic,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const wmaticBalance = await contract.read.balanceOf([smartContractAddress]);

      return Number(utils.fromWei(wmaticBalance as bigint, 'ether'));
    } catch (e: unknown) {
      Sentry.captureException(e);
      console.error(e);
      return 0;
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

  const getWmaticAllowance = async (): Promise<bigint> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return BigInt(0);
      const { subOrganizationId, walletAddress, smartContractAddress } = currentSession;
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

      const wmaticContract = getContract({
        address: config.WMATIC,
        abi: WMatic,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const allowance = await wmaticContract.read.allowance([
        smartContractAddress,
        config.SwapRouterAddress,
      ]);

      return BigInt(Math.ceil(Number(utils.fromWei(allowance as bigint, 'ether'))));
    } catch (e) {
      Sentry.captureException(e);
      console.error('Error getting wmatic allowance', e);
      return BigInt(0);
    }
  };

  const depositWmatic = async (amount: bigint): Promise<IKernelOperationStatus> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return {} as IKernelOperationStatus;
      const { subOrganizationId, walletAddress } = currentSession;

      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient)
        return {
          success: false,
          reason: 'Error creating kernel client',
        };

      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress: walletAddress,
        client: turnkeyClient,
      });

      if (!kernelClient) {
        return {
          success: false,
          reason: 'Error creating kernel client',
        };
      }

      // value is payable amount required by contract
      // call deposit function
      const wmaticDepositOpHash = await kernelClient.sendUserOperation({
        callData: await kernelClient.account.encodeCalls([
          {
            to: config.WMATIC,
            value: BigInt(utils.toWei(amount, 'ether')),
            data: encodeFunctionData({
              abi: WMatic,
              functionName: '0xd0e30db0',
              args: [],
            }),
          },
        ]),
      });

      const { success, reason } = await kernelClient.waitForUserOperationReceipt({
        hash: wmaticDepositOpHash,
      });

      return {
        success,
        reason,
      };
    } catch (e) {
      Sentry.captureException(e);
      const errorReason = handleOnChainError(e as HttpRequestError);
      return {
        success: false,
        reason: errorReason,
      };
    }
  };

  const swapWmaticToDimo = async (amount: bigint): Promise<IKernelOperationStatus> => {
    try {
      const currentSession = await validateCurrentSession();
      if (!currentSession) return {} as IKernelOperationStatus;
      const { subOrganizationId, walletAddress, smartContractAddress } = currentSession;

      const turnkeyClient = getSessionTurnkeyClient();

      if (!turnkeyClient)
        return {
          success: false,
          reason: 'Error creating kernel client',
        };

      const kernelClient = await getKernelClient({
        subOrganizationId,
        walletAddress: walletAddress,
        client: turnkeyClient,
      });

      if (!kernelClient) {
        return {
          success: false,
          reason: 'Error creating kernel client',
        };
      }

      const transactions = [];
      const wmaticAllowance = await getWmaticAllowance();

      // Approve swap router to spend wmatic (call approve)
      if (wmaticAllowance < amount) {
        transactions.push({
          to: config.WMATIC,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: WMatic,
            functionName: '0x095ea7b3',
            args: [config.SwapRouterAddress, BigInt(utils.toWei(amount, 'ether'))],
          }),
        });
      }

      // call exactInputSingle
      const deadLine = Math.floor(Date.now() / 1000) + 60 * 10;
      transactions.push({
        to: config.SwapRouterAddress,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: UniversalRouter,
          functionName: '0x414bf389',
          args: [
            {
              tokenIn: config.WMATIC,
              tokenOut: config.DC_ADDRESS,
              fee: BigInt(10000),
              recipient: smartContractAddress,
              amountIn: BigInt(utils.toWei(amount, 'ether')),
              deadline: BigInt(deadLine),
              amountOutMinimum: BigInt(0),
              sqrtPriceLimitX96: MIN_SQRT_RATIO + BigInt(1),
            },
          ],
        }),
      });

      const dimoExchangeOpData = await kernelClient.account.encodeCalls(transactions);

      const dimoExchangeOpHash = await kernelClient.sendUserOperation({
        callData: dimoExchangeOpData,
      });

      const { success, reason } = await kernelClient.waitForUserOperationReceipt({
        hash: dimoExchangeOpHash,
        timeout: 120_000,
        pollingInterval: 10_000,
      });
      return {
        success,
        reason,
      };
    } catch (e) {
      Sentry.captureException(e);
      const errorReason = handleOnChainError(e as HttpRequestError);
      return {
        success: false,
        reason: errorReason,
      };
    }
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
    getPolBalance,
    getWmaticBalance,
    getDesiredTokenAmount,
    checkEnoughBalance,
    getNeededDimoAmountForDcx,
    swapWmaticToDimo,
    depositWmatic,
  };
};
