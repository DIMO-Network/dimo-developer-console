import configuration from '@/config';
import { Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useCallback } from 'react';
import { useContractGA, useGlobalAccount } from '@/hooks';
import { useSACD } from '@/hooks/useSACD';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import DimoConnectionABI from '@/contracts/DimoConnectionABI.json';
import SacdABI from '@/contracts/Sacd.json';
import { IDesiredTokenAmount, ITokenBalance } from '@/types/wallet';
import { utils } from 'web3';
import { getCurrentDimoPrice } from '@/services/pricing';
import { decodeHex } from '@/utils/formatHex';

// keccak256("ConnectionMinted(address,uint256,address,string,bytes32,uint256)")
const CONNECTION_MINTED_TOPIC = keccak256(
  toBytes('ConnectionMinted(address,uint256,address,string,bytes32,uint256)'),
);

// Bitmask for permission 1 (mint synthetic devices). Each uint permission takes
// two bit slots, so permission 1 lives in bits 2–3: 0b1100 = 12.
const CONNECTION_PERMS_MINT_SYNTHETIC_DEVICES = BigInt(12);

// Bitmask for permission 2 (get certificates for data ingest). Bits 4–5: 0b110000 = 48.
const CONNECTION_PERMS_GET_CERTIFICATES = BigInt(48);

// ~75 years — effectively permanent for the connection's lifetime.
const CONNECTION_SACD_EXPIRATION = BigInt(4102444800);

const { CONTRACT_METHODS } = configuration;

const { DCX_IN_USD = 0.001 } = process.env;

export const useSetRedirectUri = (tokenId: number) => {
  const { validateCurrentSession } = useGlobalAccount();
  const { processTransactions } = useContractGA();
  return useCallback(
    async (uri: string, enabled: boolean) => {
      const currentSession = await validateCurrentSession();
      if (!currentSession) throw new Error('Web3 connection failed');
      const transaction = [
        {
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoLicenseABI,
            functionName: 'setRedirectUri',
            args: [tokenId, enabled, uri],
          }),
        },
      ];
      await processTransactions(transaction);
    },
    [processTransactions, tokenId, validateCurrentSession],
  );
};

export const useDisableSigner = (tokenId: number) => {
  const { validateCurrentSession } = useGlobalAccount();
  const { processTransactions } = useContractGA();
  return useCallback(
    async (signer: string) => {
      const currentSession = await validateCurrentSession();
      if (!currentSession) throw new Error('Web3 connection failed');
      const transaction = [
        {
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoLicenseABI,
            functionName: 'disableSigner',
            args: [tokenId, signer],
          }),
        },
      ];
      await processTransactions(transaction);
    },
    [processTransactions, tokenId, validateCurrentSession],
  );
};

export const useEnableSigner = (tokenId: number) => {
  const { processTransactions } = useContractGA();
  return useCallback(
    async (signer: string) => {
      const transaction = {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: 'enableSigner',
          args: [tokenId, signer],
        }),
      };
      await processTransactions([transaction]);
    },
    [processTransactions, tokenId],
  );
};

const useMintDcx = () => {
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  return useCallback(
    async (desiredTokenAmount: IDesiredTokenAmount, enoughBalance: ITokenBalance) => {
      const transactions = [];
      if (!enoughBalance.dcxAllowance) {
        transactions.push({
          to: configuration.DC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoABI,
            functionName: 'approve',
            args: [
              configuration.DCX_ADDRESS,
              BigInt(utils.toWei(Math.ceil(Number(desiredTokenAmount.dimo)), 'ether')),
            ],
          }),
        });
      }

      const balanceDCX = await getCurrentDcxBalance();

      // Call mintInDimo 2 parameteres
      const dcxAmountInUSD = balanceDCX * Number(DCX_IN_USD);
      const missingAmount = Math.ceil(
        Number(desiredTokenAmount.licensePrice) - dcxAmountInUSD,
      );
      transactions.push({
        to: configuration.DCX_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoCreditsABI,
          functionName: CONTRACT_METHODS.MINT_IN_DIMO,
          args: [
            currentUser!.smartContractAddress,
            utils.toWei(
              Math.ceil(missingAmount / Number(desiredTokenAmount.dimoCost)),
              'ether',
            ),
          ],
        }),
      });
      return transactions;
    },
    [currentUser, getCurrentDcxBalance],
  );
};

export const usePayLicenseFee = () => {
  const { checkEnoughBalance, getDesiredTokenAmount, processTransactions } =
    useContractGA();
  const mintDCX = useMintDcx();

  const prepareIssueInDC = async (
    desiredTokenAmount: IDesiredTokenAmount,
    enoughBalance: ITokenBalance,
  ) => {
    if (enoughBalance.dlcAllowance) return [];
    return [
      {
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: 'approve',
          args: [
            configuration.DLC_ADDRESS,
            BigInt(utils.toWei(Math.ceil(Number(desiredTokenAmount.dimo)), 'ether')),
          ],
        }),
      },
    ];
  };

  return useCallback(async () => {
    const desiredTokenAmount = await getDesiredTokenAmount();
    const enoughBalance = await checkEnoughBalance();
    const transactions = [];
    if (!enoughBalance.dcx && !enoughBalance.dimo) {
      return { success: false, reason: 'Insufficient DIMO or DCX balance' };
    }
    if (!enoughBalance.dcx) {
      transactions.push(...(await mintDCX(desiredTokenAmount, enoughBalance)));
    }
    transactions.push(...(await prepareIssueInDC(desiredTokenAmount, enoughBalance)));
    if (transactions.length) {
      await processTransactions(transactions);
    }
    return { success: true };
  }, [checkEnoughBalance, getDesiredTokenAmount, mintDCX, processTransactions]);
};

export const useMintLicense = () => {
  const { processTransactions } = useContractGA();
  return useCallback(
    async (licenseName: string) => {
      return processTransactions(
        [
          {
            to: configuration.DLC_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: DimoLicenseABI,
              functionName: CONTRACT_METHODS.ISSUE_IN_DC,
              args: [licenseName],
            }),
          },
        ],
        { abi: DimoLicenseABI as Abi },
      );
    },
    [processTransactions],
  );
};

export type MintConnectionStep =
  | 'minting'
  | 'signing-agreements'
  | 'granting-permissions';

export interface MintConnectionParams {
  connectionName: string;
  licenseGrantee: `0x${string}`;
  deviceIssuanceGrantee: `0x${string}`;
  onStep?: (step: MintConnectionStep) => void;
}

export const useMintConnection = () => {
  const { validateCurrentSession, currentUser } = useGlobalAccount();
  const { checkEnoughBalance, processTransactions } = useContractGA();
  const { signAndUploadPermissionSACD } = useSACD();
  return useCallback(
    async ({
      connectionName,
      licenseGrantee,
      deviceIssuanceGrantee,
      onStep,
    }: MintConnectionParams) => {
      const nameBytes = new TextEncoder().encode(connectionName).length;
      if (nameBytes > 32) {
        return {
          success: false,
          reason:
            'Connection name is too long. Please use a name that is 32 characters or fewer.',
        };
      }

      const currentSession = await validateCurrentSession();
      const enoughBalance = await checkEnoughBalance();

      // Get current DIMO price and calculate required tokens for $1 USD
      const dimoPrice = await getCurrentDimoPrice();
      const targetUsdAmount = 1;
      // handle price fluctuations
      const bufferPercentage = 0.05;

      // Calculate required DIMO tokens: $1 / DIMO price + 5% buffer for price flux.
      const baseDimoAmount = targetUsdAmount / dimoPrice;
      const requiredDIMO = baseDimoAmount * (1 + bufferPercentage);
      const requiredDIMOInWei = BigInt(utils.toWei(requiredDIMO.toString(), 'ether'));

      if (!currentSession) throw new Error('Web3 connection failed');
      if (!currentUser) throw new Error('User not found');
      if (!enoughBalance.dimo) {
        return {
          success: false,
          reason: `Insufficient DIMO balance. You need at least ${requiredDIMO.toFixed(2)} DIMO tokens (approximately $${targetUsdAmount}) to mint a connection.`,
        };
      }

      const transactions = [
        // Transaction 1: approve use of required $DIMO tokens ($1 USD worth + 5% buffer).
        {
          to: configuration.DC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoABI,
            functionName: 'approve',
            args: [configuration.DCC_ADDRESS, requiredDIMOInWei],
          }),
        },
        // Transaction 2: mint a connection license
        {
          to: configuration.DCC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoConnectionABI,
            functionName: CONTRACT_METHODS.MINT_CONNECTION,
            args: [currentUser.smartContractAddress, connectionName],
          }),
        },
        // Transaction 3: approve use of 0 $DIMO tokens
        {
          to: configuration.DC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoABI,
            functionName: 'approve',
            args: [configuration.DCC_ADDRESS, BigInt(0)],
          }),
        },
      ];

      try {
        onStep?.('minting');
        const result = await processTransactions(transactions, {
          abi: DimoConnectionABI as Abi,
        });

        // Pull connectionId out of the ConnectionMinted event so we can grant
        // permissions to the generated keys. Token IDs are full uint256 — keep
        // them as bigint to avoid precision loss.
        const mintedLog = result.logs?.find(
          ({ topics: [topic = '0x'] = [] }) => topic === CONNECTION_MINTED_TOPIC,
        );
        const rawConnectionId = mintedLog?.topics?.[2] ?? '0x';
        if (rawConnectionId === '0x') {
          console.warn(
            '[useMintConnection] ConnectionMinted event not found in transaction logs',
            { expectedTopic: CONNECTION_MINTED_TOPIC, logs: result.logs },
          );
          throw new Error(
            'Connection minted but connectionId could not be read from logs; cannot grant key permissions.',
          );
        }
        const connectionId = decodeHex(
          rawConnectionId as `0x${string}`,
          'uint256',
        ) as bigint;

        const asset = configuration.DCC_ADDRESS;
        const grantor = currentUser.smartContractAddress;

        onStep?.('signing-agreements');
        const [deviceIssuanceSource, licenseSource] = await Promise.all([
          signAndUploadPermissionSACD({
            grantee: deviceIssuanceGrantee,
            grantor,
            asset: `did:erc721:${Number(configuration.CONTRACT_NETWORK)}:${asset}:${connectionId.toString()}`,
            expiration: CONNECTION_SACD_EXPIRATION,
            permissionNames: ['MintSD'],
          }),
          signAndUploadPermissionSACD({
            grantee: licenseGrantee,
            grantor,
            asset: `did:erc721:${Number(configuration.CONTRACT_NETWORK)}:${asset}:${connectionId.toString()}`,
            expiration: CONNECTION_SACD_EXPIRATION,
            permissionNames: ['GenerateCertificate'],
          }),
        ]);

        onStep?.('granting-permissions');
        await processTransactions(
          [
            {
              to: configuration.DIMO_SACD_ADDRESS,
              value: BigInt(0),
              data: encodeFunctionData({
                abi: SacdABI as Abi,
                functionName: 'setPermissions',
                args: [
                  asset,
                  connectionId,
                  deviceIssuanceGrantee,
                  CONNECTION_PERMS_MINT_SYNTHETIC_DEVICES,
                  CONNECTION_SACD_EXPIRATION,
                  deviceIssuanceSource,
                ],
              }),
            },
            {
              to: configuration.DIMO_SACD_ADDRESS,
              value: BigInt(0),
              data: encodeFunctionData({
                abi: SacdABI as Abi,
                functionName: 'setPermissions',
                args: [
                  asset,
                  connectionId,
                  licenseGrantee,
                  CONNECTION_PERMS_GET_CERTIFICATES,
                  CONNECTION_SACD_EXPIRATION,
                  licenseSource,
                ],
              }),
            },
          ],
          { abi: SacdABI as Abi },
        );

        return { ...result, connectionId };
      } catch (error: unknown) {
        const errorMessage =
          (error as Error)?.message || (error as Error)?.toString() || 'Unknown error';

        if (
          errorMessage.includes('ERC20: transfer amount exceeds balance') ||
          errorMessage.includes('transfer amount exceeds balance') ||
          errorMessage.includes('insufficient balance')
        ) {
          return {
            success: false,
            reason: 'You do not have enough $DIMO to mint a connection.',
          };
        }

        if (
          errorMessage.includes('NameAlreadyInUse') ||
          errorMessage.includes('name already in use')
        ) {
          return {
            success: false,
            reason:
              'This connection name is already taken. Please choose a different name and try again.',
          };
        }

        if (errorMessage.includes('NameInvalidLength')) {
          return {
            success: false,
            reason:
              'Connection name is too long. Please use a name that is 32 characters or fewer.',
          };
        }

        throw error;
      }
    },
    [
      checkEnoughBalance,
      currentUser,
      processTransactions,
      signAndUploadPermissionSACD,
      validateCurrentSession,
    ],
  );
};
