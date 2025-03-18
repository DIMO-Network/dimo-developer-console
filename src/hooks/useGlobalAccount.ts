'use client';

import { useContext } from 'react';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';

const MIN_SQRT_RATIO: bigint = BigInt('4295128739');

// export const useGlobalAccount = () => {
//   const { getNewUserPasskey } = usePasskey();
//   const { checkAuthenticated } = useContext(GlobalAccountAuthContext);

//   const getUserGlobalAccountInfo = getUserSubOrganization;

//   const registerNewPasskey = async ({
//     recoveryKey,
//     email,
//   }: {
//     recoveryKey: string;
//     email: string;
//   }): Promise<void> => {
//     const { subOrganizationId } = await getUserSubOrganization(email);
//     const ekey = getFromLocalStorage<string>(EmbeddedKey);
//     const privateKey = decryptCredentialBundle(recoveryKey, ekey!);
//     const publicKey = uint8ArrayToHexString(
//       getPublicKey(uint8ArrayFromHexString(privateKey), true),
//     );

//     const client = new TurnkeyClient(
//       {
//         baseUrl: turnkeyConfig.apiBaseUrl,
//       },
//       new ApiKeyStamper({
//         apiPublicKey: publicKey,
//         apiPrivateKey: privateKey,
//       }),
//     );

//     const me = await client.getWhoami({ organizationId: subOrganizationId });

//     const { attestation, encodedChallenge } = await getNewUserPasskey(me!.username!);

//     const { authenticators } = await client.getAuthenticators({
//       organizationId: me!.organizationId,
//       userId: me!.userId,
//     });

//     const signedRemoveAuthenticators = await client.stampDeleteAuthenticators({
//       type: 'ACTIVITY_TYPE_DELETE_AUTHENTICATORS',
//       timestampMs: Date.now().toString(),
//       organizationId: me!.organizationId,
//       parameters: {
//         userId: me!.userId,
//         authenticatorIds: authenticators!.map((auth) => auth.authenticatorId),
//       },
//     });

//     const signedRecoverUser = await client.stampRecoverUser({
//       type: 'ACTIVITY_TYPE_RECOVER_USER',
//       timestampMs: Date.now().toString(),
//       organizationId: me!.organizationId,
//       parameters: {
//         userId: me!.userId,
//         authenticator: {
//           authenticatorName: 'DIMO PASSKEY',
//           challenge: encodedChallenge,
//           attestation,
//         },
//       },
//     });

//     await rewirePasskey({
//       email: me!.username!,
//       signedRecoveryRequest: signedRecoverUser,
//       signedAuthenticatorRemoval: signedRemoveAuthenticators,
//     });
//   };

//   const registerSubOrganization = async ({
//     createWithoutPasskey,
//     email,
//   }: {
//     createWithoutPasskey: boolean;
//     email: string;
//   }): Promise<ISubOrganization> => {
//     try {
//       let challenge: string | undefined;
//       let passkeyAttestation: IPasskeyAttestation | undefined;

//       if (!createWithoutPasskey) {
//         const { attestation, encodedChallenge } = await getNewUserPasskey(email);
//         challenge = encodedChallenge;
//         passkeyAttestation = attestation;
//       }

//       const response = await createSubOrganization({
//         email: email,
//         attestation: passkeyAttestation,
//         encodedChallenge: challenge,
//         deployAccount: true,
//       });

//       if (!response?.subOrganizationId) {
//         console.error('Error creating sub organization');
//         return {} as ISubOrganization;
//       }

//       saveToSession<IGlobalAccountSession>(GlobalAccountSession, {
//         organization: { ...response, email },
//         session: {
//           token: '',
//           expiry: passkeyAttestation ? 30 : 0,
//           authenticator: AuthClient.Iframe,
//         },
//       });

//       return response;
//     } catch (e) {
//       Sentry.captureException(e);
//       console.error('Error creating sub organization', e);
//       return {} as ISubOrganization;
//     }
//   };

//   const emailRecovery = async (email: string): Promise<boolean> => {
//     const user = await getUserSubOrganization(email);
//     if (!user) return false;
//     const key = generateP256KeyPair();
//     const targetPublicKey = key.publicKeyUncompressed;
//     saveToLocalStorage(EmbeddedKey, key.privateKey);
//     await startEmailRecovery({
//       email,
//       key: targetPublicKey,
//     });
//     return true;
//   };

//   const getWmaticAllowance = async (): Promise<bigint> => {
//     try {
//       const currentSession = await checkAuthenticated();
//       if (!currentSession) return BigInt(0);
//       const { organization: organizationInfo, session } = currentSession;
//       if (!organizationInfo) return BigInt(0);
//       const publicClient = getPublicClient();
//       const kernelClient = await getKernelClient({
//         organizationInfo,
//         authKey: session.token,
//       });

//       if (!kernelClient) {
//         return BigInt(0);
//       }

//       const wmaticContract = getContract({
//         address: config.WMATIC,
//         abi: WMatic,
//         client: {
//           public: publicClient,
//           wallet: kernelClient,
//         },
//       });

//       const allowance = await wmaticContract.read.allowance([
//         organizationInfo.smartContractAddress,
//         config.SwapRouterAddress,
//       ]);

//       return BigInt(Math.ceil(Number(utils.fromWei(allowance as bigint, 'ether'))));
//     } catch (e) {
//       Sentry.captureException(e);
//       console.error('Error getting wmatic allowance', e);
//       return BigInt(0);
//     }
//   };

//   const depositWmatic = async (amount: bigint): Promise<IKernelOperationStatus> => {
//     try {
//       const currentSession = await checkAuthenticated();
//       if (!currentSession) return {} as IKernelOperationStatus;
//       const { organization: organizationInfo, session } = currentSession;

//       const kernelClient = await getKernelClient({
//         organizationInfo,
//         authKey: session.token,
//       });

//       if (!kernelClient) {
//         return {
//           success: false,
//           reason: 'Error creating kernel client',
//         };
//       }

//       // value is payable amount required by contract
//       // call deposit function
//       const wmaticDepositOpHash = await kernelClient.sendUserOperation({
//         callData: await kernelClient.account.encodeCalls([
//           {
//             to: config.WMATIC,
//             value: BigInt(utils.toWei(amount, 'ether')),
//             data: encodeFunctionData({
//               abi: WMatic,
//               functionName: '0xd0e30db0',
//               args: [],
//             }),
//           },
//         ]),
//       });

//       const { success, reason } = await kernelClient.waitForUserOperationReceipt({
//         hash: wmaticDepositOpHash,
//       });

//       return {
//         success,
//         reason,
//       };
//     } catch (e) {
//       Sentry.captureException(e);
//       const errorReason = handleOnChainError(e as HttpRequestError);
//       return {
//         success: false,
//         reason: errorReason,
//       };
//     }
//   };

//   const swapWmaticToDimo = async (amount: bigint): Promise<IKernelOperationStatus> => {
//     try {
//       const currentSession = await checkAuthenticated();
//       if (!currentSession) return {} as IKernelOperationStatus;
//       const { organization: organizationInfo, session } = currentSession;

//       const kernelClient = await getKernelClient({
//         organizationInfo,
//         authKey: session!.token,
//       });

//       if (!kernelClient) {
//         return {
//           success: false,
//           reason: 'Error creating kernel client',
//         };
//       }

//       const transactions = [];
//       const wmaticAllowance = await getWmaticAllowance();

//       // Approve swap router to spend wmatic (call approve)
//       if (wmaticAllowance < amount) {
//         transactions.push({
//           to: config.WMATIC,
//           value: BigInt(0),
//           data: encodeFunctionData({
//             abi: WMatic,
//             functionName: '0x095ea7b3',
//             args: [config.SwapRouterAddress, BigInt(utils.toWei(amount, 'ether'))],
//           }),
//         });
//       }

//       // call exactInputSingle
//       const deadLine = Math.floor(Date.now() / 1000) + 60 * 10;
//       transactions.push({
//         to: config.SwapRouterAddress,
//         value: BigInt(0),
//         data: encodeFunctionData({
//           abi: UniversalRouter,
//           functionName: '0x414bf389',
//           args: [
//             {
//               tokenIn: config.WMATIC,
//               tokenOut: config.DC_ADDRESS,
//               fee: BigInt(10000),
//               recipient: organizationInfo.smartContractAddress,
//               amountIn: BigInt(utils.toWei(amount, 'ether')),
//               deadline: BigInt(deadLine),
//               amountOutMinimum: BigInt(0),
//               sqrtPriceLimitX96: MIN_SQRT_RATIO + BigInt(1),
//             },
//           ],
//         }),
//       });

//       const dimoExchangeOpData = await kernelClient.account.encodeCalls(transactions);

//       const dimoExchangeOpHash = await kernelClient.sendUserOperation({
//         callData: dimoExchangeOpData,
//       });

//       const { success, reason } = await kernelClient.waitForUserOperationReceipt({
//         hash: dimoExchangeOpHash,
//         timeout: 120_000,
//         pollingInterval: 10_000,
//       });
//       return {
//         success,
//         reason,
//       };
//     } catch (e) {
//       Sentry.captureException(e);
//       const errorReason = handleOnChainError(e as HttpRequestError);
//       return {
//         success: false,
//         reason: errorReason,
//       };
//     }
//   };

//   const getNeededDimoAmountForDcx = async (amount: number): Promise<bigint> => {
//     try {
//       const currentSession = await checkAuthenticated();
//       if (!currentSession) return BigInt(0);
//       const { organization: organizationInfo, session } = currentSession;

//       if (!organizationInfo) return BigInt(0);
//       const publicClient = getPublicClient();
//       const kernelClient = await getKernelClient({
//         organizationInfo,
//         authKey: session.token,
//       });

//       if (!kernelClient) {
//         return BigInt(0);
//       }

//       const contract = getContract({
//         address: configuration.DCX_ADDRESS,
//         abi: DimoCreditsABI,
//         client: {
//           public: publicClient,
//           wallet: kernelClient,
//         },
//       });

//       const quote = await contract.read.getQuoteDc([
//         BigInt(utils.toWei(amount, 'ether')),
//       ]);

//       return BigInt(Math.ceil(Number(utils.fromWei(quote as bigint, 'ether'))));
//     } catch (e) {
//       Sentry.captureException(e);
//       const errorReason = handleOnChainError(e as HttpRequestError);
//       console.error('Error getting needed dimo amount', errorReason);
//       return BigInt(0);
//     }
//   };

//   const getWalletAddress = async ({
//     subOrganizationId,
//     authKey,
//   }: {
//     subOrganizationId: string;
//     authKey: string;
//   }) => {
//     const turnkeyAddress = await getTurnkeyWallet({
//       authKey,
//       subOrganizationId,
//     });

//     const kernelClient = await getKernelClient({
//       organizationInfo: {
//         subOrganizationId,
//         walletAddress: turnkeyAddress as `0x${string}`,
//       } as ISubOrganization,
//       authKey,
//     });

//     return {
//       walletAddress: turnkeyAddress as `0x${string}`,
//       smartContractAddress: kernelClient!.account.address as `0x${string}`,
//     };
//   };

//   const signMessage = async ({
//     subOrganizationId,
//     authKey,
//     message,
//     walletAddress,
//   }: {
//     subOrganizationId: string;
//     walletAddress: string;
//     authKey: string;
//     message: string;
//   }): Promise<string> => {
//     const kernelClient = await getKernelClient({
//       organizationInfo: {
//         subOrganizationId,
//         walletAddress: walletAddress as `0x${string}`,
//       } as ISubOrganization,
//       authKey,
//     });

//     const signed = await kernelClient!.signMessage({
//       message: message,
//     });

//     return signed;
//   };

//   return {
//     getUserGlobalAccountInfo,
//     registerSubOrganization,
//     emailRecovery,
//     registerNewPasskey,
//     depositWmatic,
//     swapWmaticToDimo,
//     getKernelClient,
//     handleOnChainError,
//     getNeededDimoAmountForDcx,
//     getWalletAddress,
//     signMessage,
//   };
// };

export const useGlobalAccount = () => useContext(GlobalAccountContext);

export default useGlobalAccount;
