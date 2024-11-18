'use client';

import { useContext, useState, type FC } from 'react';
import { CreditsContext } from '@/context/creditsContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';

import { CryptoPurchase } from '@/components/BuyCreditsModal/BuyCredits/CryptoPurchase';
import CreditsAmount from '@/components/BuyCreditsModal/BuyCredits/CreditsAmount';
import CryptoExchange from '@/components/BuyCreditsModal/BuyCredits/CryptoExchange';
import ProcessComplete from '@/components/BuyCreditsModal/BuyCredits/ProcessComplete';
import BalancePayment from '@/components/BuyCreditsModal/BuyCredits/BalancePayment';
import { IDcxPurchaseTransaction } from '@/types/wallet';

import './BuyCreditsModal.css';

interface IProps {}

const buyCreditsFlows = {
  'credits-amount': {
    Component: CreditsAmount,
    order: 1,
  },
  'crypto-purchase': {
    Component: CryptoPurchase,
    order: 2,
  },
  'balance-payment': {
    Component: BalancePayment,
    order: 3,
  },
  'crypto-exchange': {
    Component: CryptoExchange,
    order: 4,
  },
  'dcx-minted': {
    Component: ProcessComplete,
    order: 5,
  },
};

export const BuyCreditsModal: FC<IProps> = () => {
  const { isOpen, setIsOpen } = useContext(CreditsContext);
  const [flow, setFlow] = useState('credits-amount');
  const { Component: BuyCreditsFlow } =
    buyCreditsFlows[flow as keyof typeof buyCreditsFlows] ??
    buyCreditsFlows['credits-amount'];
  const [transaction, setTransaction] = useState<
    Partial<IDcxPurchaseTransaction>
  >({});

  const handleIsOpen = (open: boolean) => {
    setIsOpen(open);
    setFlow('credits-amount');
  };

  const handleNext = (
    actualFlow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => {
    setTransaction(transaction!);
    const currentStep =
      buyCreditsFlows[actualFlow as keyof typeof buyCreditsFlows];
    const processes = Object.keys(buyCreditsFlows).reduce(
      (acc, elm) => ({
        ...acc,
        [buyCreditsFlows[elm as keyof typeof buyCreditsFlows].order]: elm,
      }),
      {},
    );
    const nextStep =
      processes[(currentStep.order + 1) as keyof typeof processes] ??
      'complete';
    if (nextStep !== 'complete') setFlow(nextStep);
    else handleIsOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={handleIsOpen}
      className="buy-credits-modal"
    >
      <div className="buy-credits-content">
        <div className="buy-credits-header">
          <Title className="text-2xl" component="h3">
            Buy DCX
          </Title>
          <p className="description">
            DCX, also known as DIMO Credits, is a stable token in the DIMO
            ecosystem for the builders. All DCX purchases uses the DIMO Token as
            medium.
          </p>
        </div>
        {BuyCreditsFlow && (
          <BuyCreditsFlow onNext={handleNext} transactionData={transaction} />
        )}
      </div>
    </Modal>
  );
};

export default BuyCreditsModal;
