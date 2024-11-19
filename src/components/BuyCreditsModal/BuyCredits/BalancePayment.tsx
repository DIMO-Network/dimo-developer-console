'use client';

import { IDcxPurchaseTransaction } from '@/types/wallet';
import { useContractGA } from '@/hooks';
import { useEffect, useState } from 'react';
import classnames from 'classnames';
import { Card } from '@/components/Card';
import useGlobalAccount from '../../../hooks/useGlobalAccount';
import { Button } from '@/components/Button';
import useCryptoPricing from '@/hooks/useCryptoPricing';
import { BubbleLoader } from '@/components/BubbleLoader';

interface IProps {
  onNext: (
    flow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}
interface ICryptoBalance {
  currency: string;
  balance: number;
  price: number;
}

export const BalancePayment = ({ onNext, transactionData }: IProps) => {
  const { getDimoBalance, getPolBalance, getWmaticBalance } = useContractGA();
  const { getDimoPrice, getPolPrice, getWMaticPrice } = useCryptoPricing();
  const { organizationInfo } = useGlobalAccount();

  const [balances, setBalances] = useState<ICryptoBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<ICryptoBalance>({
    currency: '',
    balance: 0,
    price: 0,
  });

  const getBalances = async () => {
    const [
      dimoBalance,
      polBalance,
      wmaticBalance,
      dimoPrice,
      polPrice,
      wmaticPrice,
    ] = await Promise.all([
      getDimoBalance(),
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
  };

  const handleSelection = (value: ICryptoBalance) => {
    setSelectedBalance(value);
  };

  const getAmountToProcess = (balance: ICryptoBalance): number => {
    const env = process.env.VERCEL_ENV!;
    const clientEnv = process.env.NEXT_PUBLIC_CE!;
    const environment = env ?? clientEnv;

    if (environment !== 'production') return 1;

    const usdTarget = transactionData!.usdAmount!;
    const usdEquivalent = balance.balance * balance.price;

    const neededFromBalance = (balance.balance * usdTarget) / usdEquivalent;

    return neededFromBalance;
  };

  const handleContinue = () => {    
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
          maticAmount: processedAmount.toString(),
        });
        return;
      case 'wmatic':
        onNext('balance-payment', {
          ...transactionData,
          alreadyHasWmatic: true,
          maticAmount: processedAmount.toString(),
        });
        return;
    }
  };

  useEffect(() => {
    if (!organizationInfo) return;
    getBalances().catch(console.error);
  }, [organizationInfo?.smartContractAddress]);

  return (
    <>
      <h1>Current Balances</h1>
      <div className="buy-credits-payment-methods">
        {balances.length === 0 && (
          <BubbleLoader isLoading={balances.length === 0} />
        )}
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
