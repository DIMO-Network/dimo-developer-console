import { useForm } from 'react-hook-form';
import { TokenInput } from '@/components/TokenInput';
import { Button } from '@/components/Button';
import useStripeCrypto from '@/hooks/useStripeCrypto';
import { useGlobalAccount } from '@/hooks';
import { useContext } from 'react';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import { IDcxPurchaseTransaction } from '@/types/wallet';

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

export const CreditsAmount = ({ onNext }:IProps) => {
  const { organizationInfo } = useGlobalAccount();
  const { setStripeClientId } = useContext(StripeCryptoContext);
  const { createStripeCryptoSession, } = useStripeCrypto();
  const { control, watch } = useForm<IForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      credits: 0,
      paymentMethod: {
        type: 'wallet',
      },
    },
  });
  const credits = watch('credits', 0);

  const handleShowIframe = async () => {
    const { smartContractAddress } = organizationInfo!;
    if (!smartContractAddress) return;

    const { client_secret } = await createStripeCryptoSession(smartContractAddress, credits * 0.001);
    setStripeClientId(client_secret);
    onNext('credits-amount', {
      destinationAddress: smartContractAddress,
      usdAmount: credits * 0.001,
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
          { label: '1M', value: 1000000 }
        ]}
      />
      <div style={{ textAlign: 'center', margin: '10px 0' }}>
        <p>1 DCX = $0.01 USD</p>
        <p>1 DIMO = $0.20 USD</p>
      </div>
      <div className="credit-total-content">
        <p className="total-descriptor">Your total</p>
        <p className="total-value">$ {credits * 0.001}</p>
      </div>
      <div className="credit-action">
        <Button
          disabled={credits === 0}
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