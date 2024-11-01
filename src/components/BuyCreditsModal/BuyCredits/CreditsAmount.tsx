import { useForm } from 'react-hook-form';
import { useContext } from 'react';

import { TokenInput } from '@/components/TokenInput';
import { Button } from '@/components/Button';
import useStripeCrypto from '@/hooks/useStripeCrypto';
import { useGlobalAccount } from '@/hooks';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { TextError } from '@/components/TextError';
import config from '@/config';

const { DCX_IN_USD = 0.001, DIMO_IN_USD = 0.16 } = process.env;
const DCX_PRICE = Number(DCX_IN_USD);
const DIMO_PRICE = Number(DIMO_IN_USD);

interface IForm {
  credits: number;
  paymentMethod: {
    type: string;
    id: string;
  };
}

interface IProps {
  onNext: (
    flow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => void;
}

export const CreditsAmount = ({ onNext }: IProps) => {
  const { organizationInfo } = useGlobalAccount();
  const { setStripeClientId } = useContext(StripeCryptoContext);
  const { createStripeCryptoSession } = useStripeCrypto();
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

  const handleShowIframe = async () => {
    const { smartContractAddress } = organizationInfo!;
    if (!smartContractAddress) return;

    const { client_secret } = await createStripeCryptoSession(
      smartContractAddress,
      credits * DCX_PRICE,
    );
    setStripeClientId(client_secret);
    onNext('credits-amount', {
      destinationAddress: smartContractAddress,
      usdAmount: credits * DCX_PRICE,
      dcxAmount: credits!.toFixed(2),
    });
  };

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
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <p>1 DCX = ${DCX_PRICE} USD</p>
        <p>1 DIMO = ${DIMO_PRICE} USD</p>
      </div>
      <div className="credit-total-content">
        <p className="total-descriptor">Your total</p>
        <p className="total-value">$ {credits * DCX_PRICE}</p>
      </div>
      <div className="credit-action">
        <Button
          disabled={credits < config.MINIMUM_CREDITS}
          className="primary !h-9"
          onClick={handleShowIframe}
        >
          Buy DCX
        </Button>
      </div>
    </>
  );
};

export default CreditsAmount;
