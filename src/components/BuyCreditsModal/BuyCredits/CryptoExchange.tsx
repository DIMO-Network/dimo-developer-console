'use client';

import { IDcxPurchaseTransaction } from '@/types/wallet';
import { useContractGA, useGlobalAccount } from '@/hooks';
import { FC, useContext, useEffect, useState } from 'react';
import { Loading } from '@/components/Loading';
import { CryptoCheckIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { ErrorIcon } from '@/components/Icons';
import configuration from '@/config';
import { encodeFunctionData } from 'viem';
import DimoABI from '@/contracts/DimoTokenContract.json';
import { utils } from 'web3';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { captureException } from '@sentry/nextjs';
const { CONTRACT_METHODS } = configuration;

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

enum LoadingStatus {
  None = 'none',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
}

const StatusIcon = ({ status }: { status: LoadingStatus }) => {
  switch (status) {
    case 'success':
      return <CryptoCheckIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'loading':
      return <Loading />;
    default:
      return <></>;
  }
};

const ProcessCard = ({ title, status }: { title: string; status: LoadingStatus }) => {
  return (
    <div className="minting-card">
      <span>{title}</span>
      <StatusIcon status={status} />
    </div>
  );
};

export const CryptoExchange: FC<IProps> = ({ onNext, transactionData }) => {
  const { setNotification } = useContext(NotificationContext);
  const { getDcxAllowance, processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();

  const [mintingDCX, setMintingDCX] = useState<LoadingStatus>(LoadingStatus.None);

  const mintDCX = async (): Promise<
    {
      to: `0x${string}`;
      value: bigint;
      data: `0x${string}`;
    }[]
  > => {
    const transactions = [];
    const expendableDimo = transactionData!.requiredDimoAmount!;
    const dcxAmount = transactionData!.dcxAmount!;

    const allowanceDCX = await getDcxAllowance();

    if (allowanceDCX <= expendableDimo) {
      transactions.push({
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: CONTRACT_METHODS.APPROVE_ALLOWANCE,
          args: [configuration.DCX_ADDRESS, BigInt(utils.toWei(dcxAmount, 'ether'))],
        }),
      });
    }

    transactions.push({
      to: configuration.DCX_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoCreditsABI,
        functionName: CONTRACT_METHODS.MINT_DCX,
        args: [
          currentUser!.smartContractAddress,
          BigInt(utils.toWei(dcxAmount, 'ether')),
        ],
      }),
    });

    return transactions;
  };

  const handleMintingDcx = async () => {
    try {
      if (mintingDCX === LoadingStatus.Loading) return;
      setMintingDCX(LoadingStatus.Loading);

      const transactions = await mintDCX();

      const mintResult = await processTransactions(transactions);

      if (!mintResult.success) {
        setNotification(mintResult.reason!, 'Oops...', 'error');
        setMintingDCX(LoadingStatus.Error);
        return;
      }
      setMintingDCX(LoadingStatus.Success);
      onNext('crypto-exchange', transactionData);
    } catch (error: unknown) {
      const e = error as Error;
      captureException(e);
      setNotification(e.message, 'Oops...', 'error');
      console.error('Error while minting DCX', error);
      setMintingDCX(LoadingStatus.Error);
    }
  };

  useEffect(() => {
    if (!transactionData) return;
    void handleMintingDcx();
  }, [transactionData]);

  return (
    <div className="minting-process">
      <ProcessCard title="Minting DCX" status={mintingDCX} />
    </div>
  );
};

export default CryptoExchange;
