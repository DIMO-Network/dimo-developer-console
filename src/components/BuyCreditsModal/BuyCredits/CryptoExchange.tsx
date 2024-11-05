'use client';

import { IDcxPurchaseTransaction } from '@/types/wallet';
import { useGlobalAccount } from '@/hooks';
import { useContext, useEffect, useState } from 'react';
import { Loading } from '@/components/Loading';
import { CheckIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { ErrorIcon } from '@/components/Icons';

interface IProps {
  onNext: (
    flow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => void;
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
      return <CheckIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'loading':
      return <Loading />;
    default:
      return <></>;
  }
};

const ProcessCard = ({
  title,
  status,
}: {
  title: string;
  status: LoadingStatus;
}) => {
  return (
    <div className="minting-card">
      <span>{title}</span>
      <StatusIcon status={status} />
    </div>
  );
};

export const CryptoExchange = ({ onNext, transactionData }: IProps) => {
  const { setNotification } = useContext(NotificationContext);
  const {
    organizationInfo,
    depositWmatic,
    swapWmaticToDimo,
    mintDimoIntoDimoCredit,
  } = useGlobalAccount();

  const [swappingIntoDimo, setSwappingIntoDimo] = useState<LoadingStatus>(
    LoadingStatus.None,
  );
  const [mintingDCX, setMintingDCX] = useState<LoadingStatus>(
    LoadingStatus.None,
  );

  const handleMintingDcx = async () => {
    try {
      if (mintingDCX === LoadingStatus.Loading) return;
      setMintingDCX(LoadingStatus.Loading);

      const mintResult = await mintDimoIntoDimoCredit(
        transactionData!.dcxAmount!,
      );
      if (!mintResult.success) {
        setNotification(mintResult.reason!, 'Oops...', 'error');
        setMintingDCX(LoadingStatus.Error);
        return;
      }
      setMintingDCX(LoadingStatus.Success);
    } catch (error) {
      console.error('Error while minting DCX', error);
      setMintingDCX(LoadingStatus.Error);
    }
  };

  const handleSwappingIntoDimo = async () => {
    try {
      if (swappingIntoDimo === LoadingStatus.Loading) return;
      setSwappingIntoDimo(LoadingStatus.Loading);

      const depositResult = await depositWmatic(transactionData!.maticAmount!);
      if (!depositResult.success) {
        setNotification(depositResult.reason!, 'Oops...', 'error');
        setSwappingIntoDimo(LoadingStatus.Error);
        return;
      }
      const swapResult = await swapWmaticToDimo(transactionData!.maticAmount!);
      if (!swapResult.success) {
        setNotification(swapResult.reason!, 'Oops...', 'error');
        setSwappingIntoDimo(LoadingStatus.Error);
        return;
      }
      setSwappingIntoDimo(LoadingStatus.Success);
      onNext('crypto-exchange', transactionData);
    } catch (error) {
      console.error('Error while swapping into DIMO', error);
      setSwappingIntoDimo(LoadingStatus.Error);
    }
  };

  useEffect(() => {
    if (!organizationInfo?.subOrganizationId) return;
    if (!transactionData) return;
    if (transactionData.alreadyHasDimo) {
      setSwappingIntoDimo(LoadingStatus.Success);
      return;
    }
    if (swappingIntoDimo === LoadingStatus.None) {
      handleSwappingIntoDimo().catch(console.error);
    }
  }, [organizationInfo, swappingIntoDimo, transactionData]);

  useEffect(() => {
    if (!organizationInfo?.subOrganizationId) return;
    if (
      swappingIntoDimo === LoadingStatus.Success &&
      mintingDCX === LoadingStatus.None
    ) {
      handleMintingDcx().catch(console.error);
    }
  }, [organizationInfo, swappingIntoDimo, mintingDCX]);

  return (
    <div className="minting-process">
      {!transactionData?.alreadyHasDimo && <ProcessCard title="Swapping into DIMO" status={swappingIntoDimo} /> }
      <ProcessCard title="Minting DCX" status={mintingDCX} />
    </div>
  );
};

export default CryptoExchange;
