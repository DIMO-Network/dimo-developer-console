'use client';

import { useContext } from 'react';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { ApiKeyStamper, AuthClient, TurnkeyBrowserClient } from '@turnkey/sdk-browser';
import {
  generateP256KeyPair,
  decryptCredentialBundle,
  getPublicKey,
} from '@turnkey/crypto';
import { uint8ArrayToHexString, uint8ArrayFromHexString } from '@turnkey/encoding';
import {
  IGlobalAccountSession,
  IKernelOperationStatus,
  IPasskeyAttestation,
  ISubOrganization,
} from '@/types/wallet';
import { TurnkeyClient } from '@turnkey/http';
import configuration from '@/config';
import config from '@/config';
import { passkeyClient, turnkeyConfig } from '@/config/turnkey';
import { createAccount } from '@turnkey/viem';
import {
  Chain,
  Client,
  createPublicClient,
  decodeErrorResult,
  encodeFunctionData,
  getContract,
  http,
  HttpRequestError,
  RpcSchema,
  Transport,
} from 'viem';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import {
  createFallbackKernelAccountClient,
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  getUserOperationGasPrice,
  KernelAccountClient,
} from '@zerodev/sdk';
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants';
import { polygon, polygonAmoy } from 'wagmi/chains';

import WMatic from '@/contracts/wmatic.json';
import UniversalRouter from '@/contracts/uniswapRouter.json';

import { wagmiAbi } from '@/contracts/wagmi';
import { utils } from 'web3';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import {
  GetPaymasterDataParameters,
  SmartAccount,
} from 'viem/_types/account-abstraction';
import * as Sentry from '@sentry/nextjs';
import { usePasskey } from '@/hooks';
import { GlobalAccountSession, saveToSession } from '@/utils/sessionStorage';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';
import {
  EmbeddedKey,
  getFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/localStorage';

const MIN_SQRT_RATIO: bigint = BigInt('4295128739');

export const useGlobalAccount = () => {
  const { getNewUserPasskey } = usePasskey();
  const { checkAuthenticated } = useContext(GlobalAccountAuthContext);

  const getUserGlobalAccountInfo = getUserSubOrganization;

  const registerNewPasskey = async ({
    recoveryKey,
    email,
  }: {
    recoveryKey: string;
    email: string;
  }): Promise<void> => {
    const { subOrganizationId } = await getUserSubOrganization(email);
    const ekey = getFromLocalStorage<string>(EmbeddedKey);
    const privateKey = decryptCredentialBundle(recoveryKey, ekey!);
    const publicKey = uint8ArrayToHexString(
      getPublicKey(uint8ArrayFromHexString(privateKey), true),
    );

    const client = new TurnkeyClient(
      {
        baseUrl: turnkeyConfig.apiBaseUrl,
      },
      new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      }),
    );

    const me = await client.getWhoami({ organizationId: subOrganizationId });

    const { attestation, encodedChallenge } = await getNewUserPasskey(me!.username!);

    const { authenticators } = await client.getAuthenticators({
      organizationId: me!.organizationId,
      userId: me!.userId,
    });

    const signedRemoveAuthenticators = await client.stampDeleteAuthenticators({
      type: 'ACTIVITY_TYPE_DELETE_AUTHENTICATORS',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticatorIds: authenticators!.map((auth) => auth.authenticatorId),
      },
    });

    const signedRecoverUser = await client.stampRecoverUser({
      type: 'ACTIVITY_TYPE_RECOVER_USER',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticator: {
          authenticatorName: 'DIMO PASSKEY',
          challenge: encodedChallenge,
          attestation,
        },
      },
    });

    await rewirePasskey({
      email: me!.username!,
      signedRecoveryRequest: signedRecoverUser,
      signedAuthenticatorRemoval: signedRemoveAuthenticators,
    });
  };

  const registerSubOrganization = async ({
    createWithoutPasskey,
    email,
  }: {
    createWithoutPasskey: boolean;
    email: string;
  }): Promise<ISubOrganization> => {
    try {
      let challenge: string | undefined;
      let passkeyAttestation: IPasskeyAttestation | undefined;

      if (!createWithoutPasskey) {
        const { attestation, encodedChallenge } = await getNewUserPasskey(email);
        challenge = encodedChallenge;
        passkeyAttestation = attestation;
      }

      const response = await createSubOrganization({
        email: email,
        attestation: passkeyAttestation,
        encodedChallenge: challenge,
        deployAccount: true,
      });

      if (!response?.subOrganizationId) {
        console.error('Error creating sub organization');
        return {} as ISubOrganization;
      }

      saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
        organization: { ...response, email },
        session: {
          token: '',
          expiry: passkeyAttestation ? 30 : 0,
          authenticator: AuthClient.Iframe,
        },
      });

      return response;
    } catch (e) {
      Sentry.captureException(e);
      console.error('Error creating sub organization', e);
      return {} as ISubOrganization;
    }
  };

  const emailRecovery = async (email: string): Promise<boolean> => {
    const user = await getUserSubOrganization(email);
    if (!user) return false;
    const key = generateP256KeyPair();
    const targetPublicKey = key.publicKeyUncompressed;
    saveToLocalStorage(EmbeddedKey, key.privateKey);
    await startEmailRecovery({
      email,
      key: targetPublicKey,
    });
    return true;
  };

  const getWmaticAllowance = async (): Promise<bigint> => {
    try {
      const currentSession = await checkAuthenticated();
      if (!currentSession) return BigInt(0);
      const { organization: organizationInfo, session } = currentSession;
      if (!organizationInfo) return BigInt(0);
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: session.authenticator,
        authKey: session.token,
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

      return BigInt(Math.ceil(Number(utils.fromWei(allowance as bigint, 'ether'))));
    } catch (e) {
      Sentry.captureException(e);
      console.error('Error getting wmatic allowance', e);
      return BigInt(0);
    }
  };

  const depositWmatic = async (amount: bigint): Promise<IKernelOperationStatus> => {
    try {
      const currentSession = await checkAuthenticated();
      if (!currentSession) return {} as IKernelOperationStatus;
      const { organization: organizationInfo, session } = currentSession;

      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: session.authenticator,
        authKey: session.token,
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
      const currentSession = await checkAuthenticated();
      if (!currentSession) return {} as IKernelOperationStatus;
      const { organization: organizationInfo, session } = currentSession;

      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: session.authenticator,
        authKey: session.token,
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
              recipient: organizationInfo.smartContractAddress,
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
      const currentSession = await checkAuthenticated();
      if (!currentSession) return BigInt(0);
      const { organization: organizationInfo, session } = currentSession;

      if (!organizationInfo) return BigInt(0);
      const publicClient = getPublicClient();
      const kernelClient = await getKernelClient({
        organizationInfo,
        authClient: session.authenticator,
        authKey: session.token,
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

  const getKernelClient = async ({
    organizationInfo,
    authClient,
    authKey,
  }: {
    organizationInfo: ISubOrganization;
    authClient: AuthClient;
    authKey: string;
  }) => {
    try {
      const kernelClient = await buildFallbackKernelClients({
        organizationInfo,
        authClient,
        authKey,
      });
      return kernelClient;
    } catch (e) {
      Sentry.captureException(e);
      console.error('Error creating kernel client', e);
      return null;
    }
  };

  const buildKernelClient = async ({
    orgInfo,
    provider,
    client,
  }: {
    orgInfo: ISubOrganization;
    provider: string;
    client: TurnkeyBrowserClient | TurnkeyClient;
  }) => {
    const { subOrganizationId, walletAddress } = orgInfo;
    const chain = getChain();
    const entryPoint = getEntryPoint('0.7');
    const publicClient = getPublicClient();

    const localAccount = await createAccount({
      client: client,
      organizationId: subOrganizationId,
      signWith: walletAddress,
      ethereumAddress: walletAddress,
    });

    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: localAccount,
      entryPoint: entryPoint,
      kernelVersion: KERNEL_V3_1,
    });

    const zeroDevKernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: entryPoint,
      kernelVersion: KERNEL_V3_1,
    });

    const kernelClient = createKernelAccountClient({
      account: zeroDevKernelAccount,
      chain: chain,
      bundlerTransport: http(`${turnkeyConfig.bundleRpc}?provider=${provider}`),
      client: publicClient,
      paymaster: {
        getPaymasterData: (userOperation) => {
          return sponsorUserOperation({
            userOperation,
            provider,
          });
        },
      },
      userOperation: {
        estimateFeesPerGas: async ({ bundlerClient }) => {
          return getUserOperationGasPrice(bundlerClient);
        },
      },
    });

    return kernelClient;
  };

  const buildFallbackKernelClients = async ({
    organizationInfo,
    authClient,
    authKey,
  }: {
    organizationInfo: ISubOrganization;
    authClient: AuthClient;
    authKey: string;
  }) => {
    const fallbackProviders: string[] = ['ALCHEMY', 'GELATO', 'PIMLICO'];
    const fallbackKernelClients: KernelAccountClient<
      Transport,
      Chain,
      SmartAccount,
      Client,
      RpcSchema
    >[] = [];

    const client = getTurnkeyClient(authClient, authKey);

    for (const provider of fallbackProviders) {
      try {
        const kernelClient = await buildKernelClient({
          orgInfo: organizationInfo!,
          provider,
          client: client,
        });
        fallbackKernelClients.push(kernelClient);
      } catch (e) {
        Sentry.captureException(e);
        console.error('Error creating fallback kernel client', e);
      }
    }

    return createFallbackKernelAccountClient(fallbackKernelClients);
  };

  const getPublicClient = () => {
    const chain = getChain();
    return createPublicClient({
      chain: chain,
      transport: http(turnkeyConfig.rpcUrl),
    });
  };

  const getWalletAddress = async ({
    subOrganizationId,
    authKey,
  }: {
    subOrganizationId: string;
    authKey: string;
  }) => {
    const client = getTurnkeyClient(AuthClient.Iframe, authKey);
    const { wallets } = await client.getWallets({
      organizationId: subOrganizationId,
    });
    const { account } = await client.getWalletAccount({
      organizationId: subOrganizationId,
      walletId: wallets[0].walletId,
    });

    const kernelClient = await getKernelClient({
      organizationInfo: {
        subOrganizationId,
        walletAddress: account.address as `0x${string}`,
      } as ISubOrganization,
      authClient: AuthClient.Iframe,
      authKey,
    });
    return {
      walletAddress: account.address as `0x${string}`,
      smartContractAddress: kernelClient!.account.address as `0x${string}`,
    };
  };

  const sponsorUserOperation = async ({
    userOperation,
    provider,
  }: {
    userOperation: GetPaymasterDataParameters;
    provider: string;
  }) => {
    const chain = getChain();
    const zerodevPaymaster = createZeroDevPaymasterClient({
      chain: chain,
      transport: http(`${turnkeyConfig.paymasterRpc}?provider=${provider}`),
    });
    return zerodevPaymaster.sponsorUserOperation({
      userOperation,
    });
  };

  const handleOnChainError = (error: HttpRequestError): string => {
    console.error('Error on chain:', error);

    if (!error.details) {
      return 'Unknown error';
    }

    const errorData: `0x${string}` = error.details
      .replaceAll('"', '')
      .split(': ')[1] as `0x${string}`;

    const value = decodeErrorResult({
      abi: wagmiAbi,
      data: errorData,
    });

    console.error('Error value:', value);

    const { args } = value;

    return args[0];
  };

  const getChain = (): Chain => {
    if (configuration.environment === 'production') {
      return polygon;
    }
    return polygonAmoy;
  };

  const getTurnkeyClient = (
    authClient: AuthClient,
    authKey: string,
  ): TurnkeyBrowserClient | TurnkeyClient => {
    if (authClient === AuthClient.Passkey) {
      return passkeyClient as TurnkeyBrowserClient;
    }
    const ekey = getFromLocalStorage<string>(EmbeddedKey);
    const privateKey = decryptCredentialBundle(authKey, ekey!);
    const publicKey = uint8ArrayToHexString(
      getPublicKey(uint8ArrayFromHexString(privateKey), true),
    );

    return new TurnkeyClient(
      {
        baseUrl: turnkeyConfig.apiBaseUrl,
      },
      new ApiKeyStamper({
        apiPublicKey: publicKey,
        apiPrivateKey: privateKey,
      }),
    );
  };

  return {
    getUserGlobalAccountInfo,
    registerSubOrganization,
    emailRecovery,
    registerNewPasskey,
    depositWmatic,
    swapWmaticToDimo,
    getPublicClient,
    getKernelClient,
    handleOnChainError,
    getNeededDimoAmountForDcx,
    getWalletAddress,
  };
};

export default useGlobalAccount;
