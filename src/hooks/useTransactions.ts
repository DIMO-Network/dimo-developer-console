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
      const currentSession = await validateCurrentSession();
      const enoughBalance = await checkEnoughBalance();

      // Connection minting cost: 2,000 $DIMO tokens
      const requiredDIMO = 2000;
      const requiredDIMOInWei = BigInt(utils.toWei(requiredDIMO.toString(), 'ether'));

      if (!currentSession) throw new Error('Web3 connection failed');
      if (!currentUser) throw new Error('User not found');
      if (!enoughBalance.dimo) {
        return { success: false, reason: 'Insufficient DIMO balance' };
      }

      const transactions = [
        // Transaction 1: approve use of 2,000 $DIMO tokens
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

      const result = await processTransactions(transactions, {
        abi: DimoConnectionABI as Abi,
      });

      // Logging WIP -- BARRETT remove before pub
      if (result && typeof result === 'object' && 'logs' in result) {
        console.log('📝 Event logs from transactions:');
        result.logs?.forEach((log: unknown, index: number) => {
          const logData = log as {
            address?: string;
            topics?: string[];
            blockNumber?: number;
            transactionHash?: string;
          };
          console.log(`  Log ${index}:`, {
            address: logData.address,
            topics: logData.topics,
            blockNumber: logData.blockNumber,
            transactionHash: logData.transactionHash,
          });
        });
      }

      return result;
    },
    [checkEnoughBalance, currentUser, processTransactions, validateCurrentSession],
  );
};
