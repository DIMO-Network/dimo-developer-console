'use client';

import { IDcxPurchaseTransaction } from '@/types/wallet';
import { useContractGA, useGlobalAccount } from '@/hooks';
import { useEffect, useState } from 'react';
import classnames from 'classnames';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import useCryptoPricing from '@/hooks/useCryptoPricing';
import { BubbleLoader } from '@/components/BubbleLoader';
import configuration from '@/config';
import * as Sentry from '@sentry/nextjs';

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}
interface ICryptoBalance {
  currency: string;
  balance: number;
  price: number;
}

export const BalancePayment = ({ onNext, transactionData }: IProps) => {
  const { getPolBalance, getWmaticBalance } = useContractGA();
  const { getCurrentDimoBalance, currentUser } = useGlobalAccount();
  const { getDimoPrice, getPolPrice, getWMaticPrice } = useCryptoPricing();

  const [balances, setBalances] = useState<ICryptoBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<ICryptoBalance>({
    currency: '',
    balance: 0,
    price: 0,
  });

  const getBalances = async (): Promise<void> => {
    try {
      if (!currentUser) return;
      const [dimoBalance, polBalance, wmaticBalance, dimoPrice, polPrice, wmaticPrice] =
        await Promise.all([
          getCurrentDimoBalance(),
          getPolBalance(),
          getWmaticBalance(),
          getDimoPrice(),
          getPolPrice(),
          getWMaticPrice(),
        ]);
      const balances = [
        {
          currency: 'dimo',
          balance: dimoBalance,
          price: dimoPrice,
        },
        {
          currency: 'pol',
          balance: polBalance,
          price: polPrice,
        },
        {
          currency: 'wmatic',
          balance: wmaticBalance,
          price: wmaticPrice,
        },
      ];
      setBalances(balances);
    } catch (error: unknown) {
      console.error('Error while loading balances', error);
      Sentry.captureException(error);
    }
  };

  const handleSelection = (value: ICryptoBalance) => {
    setSelectedBalance(value);
  };

  const getAmountToProcess = (balance: ICryptoBalance): bigint => {
    if (configuration.environment !== 'production') return BigInt(1);

    const usdTarget = transactionData!.usdAmount!;
    const usdEquivalent = balance.balance * balance.price;
    const neededFromBalance = (balance.balance * usdTarget) / usdEquivalent;
    return BigInt(Math.ceil(neededFromBalance));
  };

  const handleContinue = (): void => {
    const processedAmount = getAmountToProcess(selectedBalance);
    switch (selectedBalance.currency) {
      case 'dimo':
        onNext('balance-payment', {
          ...transactionData,
          alreadyHasDimo: true,
        });
        return;
      case 'pol':
        onNext('balance-payment', {
          ...transactionData,
          maticAmount: processedAmount,
        });
        return;
      case 'wmatic':
        onNext('balance-payment', {
          ...transactionData,
          alreadyHasWmatic: true,
          maticAmount: processedAmount,
        });
        return;
    }
  };

  useEffect(() => {
    void getBalances();
  }, []);

  return (
    <>
      <h1>Current Balances</h1>
      <div className="buy-credits-payment-methods">
        {balances.length === 0 && <BubbleLoader isLoading={balances.length === 0} />}
        {balances.map((currentBalance) => {
          const { currency, balance, price } = currentBalance;
          const usdEquivalent = balance * price;
          return (
            <Card
              key={currency}
              onClick={() => {
                if (usdEquivalent < transactionData!.usdAmount!) return;
                handleSelection(currentBalance);
              }}
              className={classnames(
                'flex flex-row card-border justify-between cursor-pointer',
                {
                  '!border-white': selectedBalance.currency === currency,
                },
              )}
            >
              <p>{currency.toUpperCase()}</p>
              <div className="text-right">
                <p>{balance.toFixed(3)}</p>
                <p>${usdEquivalent.toFixed(2)} USD</p>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="credit-action">
        <Button
          disabled={selectedBalance.currency === ''}
          onClick={handleContinue}
          className="primary !h-9"
        >
          Continue
        </Button>
      </div>
    </>
  );
};

export default BalancePayment;
