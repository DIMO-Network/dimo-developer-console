import { useForm } from 'react-hook-form';
import { useContext, useEffect, useState } from 'react';

import classnames from 'classnames';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { NotificationContext } from '@/context/notificationContext';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { TextError } from '@/components/TextError';
import { TokenInput } from '@/components/TokenInput';
import { useContractGA, useGlobalAccount } from '@/hooks';

import config from '@/config';
import useCryptoPricing from '@/hooks/useCryptoPricing';

const { DCX_IN_USD = 0.001 } = process.env;
const DCX_PRICE = Number(DCX_IN_USD);

const paymentMethods = [
  {
    text: 'Wallet Balance',
    icon: WalletIcon,
    iconClassName: 'w-4 h-4',
    value: 'wallet',
  },
  {
    text: 'Buy with USD',
    icon: PlusIcon,
    iconClassName: 'w-4 h-4',
    value: 'usd',
  },
];

interface IForm {
  credits: number;
  paymentMethod: {
    type: string;
    id: string;
  };
}

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
}

export const CreditsAmount = ({ onNext }: IProps) => {
  const { currentUser, getCurrentDimoBalance } = useGlobalAccount();
  const { getDimoPrice } = useCryptoPricing();
  const { getNeededDimoAmountForDcx } = useContractGA();
  const { setNotification } = useContext(NotificationContext);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const { control, watch } = useForm<IForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      credits: config.MINIMUM_CREDITS,
      paymentMethod: {
        type: 'wallet',
      },
    },
  });
  const credits = watch('credits', 0);
  const [dimoPrice, setDimoPrice] = useState<number>(0);

  const handleSelection = (value: string) => {
    setPaymentMethod(value);
  };

  const handleStartPurchase = async () => {
    if (!currentUser) return;

    const neededDimo = await getNeededDimoAmountForDcx(credits!);

    if (paymentMethod === 'usd') {
      setNotification(
        'Buy with USD is paused until our new billing system is in place. DIMO Credits are not required to get started. Please reach out to developer-support@dimo.org for billing support.',
        'Important',
        'info',
      );
      return;
    }

    await startWalletPurchase(currentUser.smartContractAddress, neededDimo);
  };

  const startWalletPurchase = async (
    smartContractAddress: `0x${string}`,
    neededDimo: bigint,
  ) => {
    const dimoBalance = await getCurrentDimoBalance();
    if (dimoBalance < neededDimo) {
      setNotification(
        'Not enough DIMO in wallet. Please add more DIMO to your wallet.',
        'Error',
        'error',
      );
      return;
    }

    onNext('credits-amount', {
      destinationAddress: smartContractAddress,
      usdAmount: credits * DCX_PRICE,
      dcxAmount: BigInt(credits!),
      requiredDimoAmount: neededDimo,
    });
  };

  useEffect(() => {
    const loadDimoPrice = async () => {
      const dimoPrice = await getDimoPrice();
      setDimoPrice(dimoPrice);
    };
    loadDimoPrice().catch((error) => {
      Sentry.captureException(error);
    });
  }, []);

  return (
    <>
      <TokenInput
        control={control}
        name="credits"
        suggestions={[
          { label: '10k', value: 10000 },
          { label: '100k', value: 100000 },
          { label: '500k', value: 500000 },
          { label: '1M', value: 1000000 },
        ]}
      />
      <div className="flex flex-col items-center">
        {credits < config.MINIMUM_CREDITS && (
          <TextError
            errorMessage={`Minimum allowed DCX purchase of ${config.MINIMUM_CREDITS}`}
          />
        )}
      </div>
      <div className="credits-costs">
        <p>1 DCX = ${DCX_PRICE} USD</p>
        <p>1 DIMO = ${dimoPrice.toFixed(3)} USD</p>
      </div>
      <div className="credit-total-content">
        <p className="total-descriptor">Your approximate total</p>
        <p className="total-value">$ {credits * DCX_PRICE}</p>
      </div>
      <div className="buy-credits-payment-methods">
        {paymentMethods.map(({ text, icon: Icon, iconClassName, value }) => {
          return (
            <Card
              key={value}
              onClick={() => {
                handleSelection(value);
              }}
              className={classnames('flex flex-row card-border gap-2 cursor-pointer', {
                '!border-white': paymentMethod === value,
              })}
            >
              <Icon className={iconClassName} />
              <p>{text}</p>
            </Card>
          );
        })}
      </div>
      <div className="credit-action">
        <Button
          disabled={credits < config.MINIMUM_CREDITS || paymentMethod === ''}
          className="primary !h-9"
          onClick={handleStartPurchase}
        >
          Buy DCX
        </Button>
      </div>
    </>
  );
};

export default CreditsAmount;
