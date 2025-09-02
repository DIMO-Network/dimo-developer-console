import configuration from '@/config';
import { Abi, encodeFunctionData } from 'viem';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useCallback } from 'react';
import { useContractGA, useGlobalAccount } from '@/hooks';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import DimoConnectionABI from '@/contracts/DimoConnectionABI.json';
import { IDesiredTokenAmount, ITokenBalance } from '@/types/wallet';
import { utils } from 'web3';
import { getCurrentDimoPrice } from '@/services/pricing';

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

export const useMintConnection = () => {
  const { validateCurrentSession, currentUser } = useGlobalAccount();
  const { checkEnoughBalance, processTransactions } = useContractGA();
  return useCallback(
    async (connectionName: string) => {
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

      // Get current DIMO price and calculate required tokens for $100 USD
      const dimoPrice = await getCurrentDimoPrice();
      const targetUsdAmount = 100;
      // handle price fluctuations
      const bufferPercentage = 0.05;

      // Calculate required DIMO tokens: $100 / DIMO price + 5% buffer for price flux.
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
        // Transaction 1: approve use of required $DIMO tokens ($100 USD worth + 5% buffer).
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
        const result = await processTransactions(transactions, {
          abi: DimoConnectionABI as Abi,
        });

        return result;
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
    [checkEnoughBalance, currentUser, processTransactions, validateCurrentSession],
  );
};
