'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTurnkey } from '@turnkey/sdk-react';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { signOut, useSession } from 'next-auth/react';
import {
  IKernelOperationStatus,
  IPasskeyAttestation,
  ISubOrganization,
} from '@/types/wallet';
import { useRouter } from 'next/navigation';
import { getWebAuthnAttestation, TurnkeyClient } from '@turnkey/http';
import { isEmpty } from 'lodash';
import configuration from '@/config';
import config from '@/config';
import { turnkeyConfig } from '@/config/turnkey';
import { createAccount } from '@turnkey/viem';
import {
  Chain,
  createPublicClient,
  createWalletClient,
  decodeErrorResult,
  encodeFunctionData,
  getContract,
  http,
  HttpRequestError,
} from 'viem';
import {
  bundlerActions,
  ENTRYPOINT_ADDRESS_V07,
  walletClientToSmartAccountSigner,
} from 'permissionless';

import WMatic from '@/contracts/wmatic.json';
import UniversalRouter from '@/contracts/uniswapRouter.json';

import { wagmiAbi } from '@/contracts/wagmi';
import { utils } from 'web3';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { buildKernelClient, buildPublicClient, extractOnChainErrorMessage, generateRecoverySignedRequests } from '@/services/wallet';
import { base64UrlEncode } from '@/utils/wallet';
import { TStamper } from '@turnkey/http/dist/base';

const generateRandomBuffer = (): ArrayBuffer => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer;
};

const MIN_SQRT_RATIO: bigint = BigInt('4295128739');

export const useGlobalAccount = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { passkeyClient, authIframeClient } = useTurnkey();
  const [organizationInfo, setOrganizationInfo] =
    useState<ISubOrganization | null>(null);

  const validCredentials = useCallback(
    async (authToken: string) => {
      if (!authIframeClient) return null;
      return await authIframeClient.injectCredentialBundle(authToken);
    },
    [authIframeClient],
  );

  const getPasskeyAttestation = async (
    email: string,
    challenge: ArrayBuffer,
  ): Promise<IPasskeyAttestation> => {
    const authenticatorUserId = generateRandomBuffer();

    const attestation = await getWebAuthnAttestation({
      publicKey: {
        rp: {
          id: passkeyClient?.rpId,
          name: 'DIMO Global Accounts',
        },
        challenge,
        pubKeyCredParams: [
          {
            alg: -7,
            type: 'public-key',
          },
          {
            alg: -257,
            type: 'public-key',
          },
        ],
        user: {
          id: authenticatorUserId,
          name: `${email} @ DIMO`,
          displayName: `${email} @ DIMO`,
        },
        timeout: 300_000,
        authenticatorSelection: {
          requireResidentKey: false,
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      },
    });

    return attestation;
  };

  const registerNewPasskey = async (): Promise<void> => {
    const me = await authIframeClient?.getWhoami();
    const challenge = generateRandomBuffer();
    const attestation = await getPasskeyAttestation(me!.username!, challenge);

    const { signedRecoverUser, signedRemoveAuthenticators } = await generateRecoverySignedRequests({
      stamper: authIframeClient!.config.stamper!,
      user: me!,
      attestation,
      challenge,
    });

    await rewirePasskey({
      email: me!.username!,
      signedRecoveryRequest: signedRecoverUser,
      signedAuthenticatorRemoval: signedRemoveAuthenticators,
    });
  };

  const walletLogin = async (): Promise<void> => {
    try {
      const { subOrganizationId } = organizationInfo!;
      // a bit hacky but works for now
      const signInResponse = await passkeyClient?.login({
        organizationId: subOrganizationId,
      });

      if (isEmpty(signInResponse?.organizationId)) return;
      router.push('/valid-tzd');
    } catch (e) {
      console.error('Error logging in with wallet', e);
      await signOut();
    }
  };

  const registerSubOrganization = async (): Promise<ISubOrganization> => {
    if (!session?.user?.email) return {} as ISubOrganization;
    const { email } = session.user;

    const challenge = generateRandomBuffer();
    const encodedChallenge = base64UrlEncode(challenge);
    const attestation = await getPasskeyAttestation(email, challenge);

    const response = await createSubOrganization({
      email,
      attestation,
      encodedChallenge,
      deployAccount: true,
    });

    if (!response?.subOrganizationId) {
      console.error('Error creating sub organization');
      return {} as ISubOrganization;
    }

    setOrganizationInfo({
      ...response,
    });

    return response;
  };

  const emailRecovery = async (email: string): Promise<boolean> => {
    const user = await getUserSubOrganization(email);
    if (!user) return false;
    if (!authIframeClient) return false;
    await startEmailRecovery({
      email,
      key: authIframeClient.iframePublicKey!,
    });
    return true;
  };

  const getPublicClient = async () => await buildPublicClient();
  const getKernelClient = async (kernelParams: {
    organizationInfo: ISubOrganization;
    stamper: TStamper;
}) => await buildKernelClient(kernelParams);
  const handleOnChainError = async (e: HttpRequestError) => await extractOnChainErrorMessage(e);

  const getWmaticAllowance = async (): Promise<bigint> => {
    try {
      if (!organizationInfo) return BigInt(0);
      const publicClient = await getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo: organizationInfo,
        stamper: passkeyClient?.config.stamper!,
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
        organizationInfo.smartContractAddress,
        config.SwapRouterAddress,
      ]);

      return BigInt(
        Math.ceil(Number(utils.fromWei(allowance as bigint, 'ether'))),
      );
    } catch (e) {
      console.error('Error getting wmatic allowance', e);
      return BigInt(0);
    }
  };

  const depositWmatic = async (
    amount: bigint,
  ): Promise<IKernelOperationStatus> => {
    try {
      if (!organizationInfo) return {} as IKernelOperationStatus;
      const kernelClient = await getKernelClient({
        organizationInfo: organizationInfo,
        stamper: passkeyClient?.config.stamper!,
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
        userOperation: {
          callData: await kernelClient.account.encodeCallData({
            to: config.WMATIC,
            value: BigInt(utils.toWei(amount, 'ether')),
            data: encodeFunctionData({
              abi: WMatic,
              functionName: '0xd0e30db0',
              args: [],
            }),
          }),
        },
      });

      const bundlerClient = kernelClient.extend(
        bundlerActions(ENTRYPOINT_ADDRESS_V07),
      );

      const { success, reason } =
        await bundlerClient.waitForUserOperationReceipt({
          hash: wmaticDepositOpHash,
        });

      return {
        success,
        reason,
      };
    } catch (e) {
      const errorReason = await handleOnChainError(e as HttpRequestError);
      return {
        success: false,
        reason: errorReason,
      };
    }
  };

  const swapWmaticToDimo = async (
    amount: bigint,
  ): Promise<IKernelOperationStatus> => {
    try {
      if (!organizationInfo) return {} as IKernelOperationStatus;
      const kernelClient = await getKernelClient({
        organizationInfo: organizationInfo,
        stamper: passkeyClient?.config.stamper!,
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
            args: [
              config.SwapRouterAddress,
              BigInt(utils.toWei(amount, 'ether')),
            ],
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
              recipient: organizationInfo.smartContractAddress,
              amountIn: BigInt(utils.toWei(amount, 'ether')),
              deadline: BigInt(deadLine),
              amountOutMinimum: BigInt(0),
              sqrtPriceLimitX96: MIN_SQRT_RATIO + BigInt(1),
            },
          ],
        }),
      });

      const omidExchangeOpHash = await kernelClient.sendUserOperation({
        userOperation: {
          callData: await kernelClient.account.encodeCallData(transactions),
        },
      });

      const bundlerClient = kernelClient.extend(
        bundlerActions(ENTRYPOINT_ADDRESS_V07),
      );

      const { success, reason } =
        await bundlerClient.waitForUserOperationReceipt({
          hash: omidExchangeOpHash,
        });
      return {
        success,
        reason,
      };
    } catch (e) {
      const errorReason = await handleOnChainError(e as HttpRequestError);
      return {
        success: false,
        reason: errorReason,
      };
    }
  };

  const getNeededDimoAmountForDcx = async (amount: number): Promise<bigint> => {
    try {
      if (!organizationInfo) return BigInt(0);
      const publicClient = await getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo: organizationInfo,
        stamper: passkeyClient?.config.stamper!,
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
      const errorReason = await handleOnChainError(e as HttpRequestError);
      console.error('Error getting needed dimo amount', errorReason);
      return BigInt(0);
    }
  };

  useEffect(() => {
    if (session?.user?.email && !organizationInfo) {
      const { email } = session.user;
      getUserSubOrganization(email)
        .then((subOrganization) => {
          if (!subOrganization) return;
          setOrganizationInfo(subOrganization);
        })
        .catch(console.error);
    }
  }, [session, organizationInfo]);

  return {
    organizationInfo,
    walletLogin,
    registerSubOrganization,
    emailRecovery,
    validCredentials,
    registerNewPasskey,
    depositWmatic,
    getPublicClient,
    getKernelClient,
    handleOnChainError,
    swapWmaticToDimo,    
    getNeededDimoAmountForDcx,
  };
};

export default useGlobalAccount;
