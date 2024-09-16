'use client';
import { useContext, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/Button';
import { CreditsContext } from '@/context/creditsContext';
import { TokenInput } from '@/components/TokenInput';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';

import './BuyCreditsModal.css';

interface IForm {
  credits: number;
  paymentMethod: {
    type: string;
    id: string;
  };
}

interface IProps {}

export const BuyCreditsModal: FC<IProps> = () => {
  const { isOpen, setIsOpen } = useContext(CreditsContext);
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
  const [showIframe, setShowIframe] = useState(false);
  const credits = watch('credits', 0);

  const iframeUrl = `https://ramptest.alchemypay.org/?apiKey=${process.env.NEXT_PUBLIC_API_KEY}&cryptoAddress=${process.env.NEXT_PUBLIC_CRYPTO_ADDRESS}&network=${process.env.NEXT_PUBLIC_NETWORK}`;

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="buy-credits-modal">
      {!showIframe ? (
        <div className="buy-credits-content">
          <div className="buy-credits-header">
            <Title className="text-2xl" component="h3">
              Buy DCX
            </Title>
            <p className="description">
              DCX, also known as DIMO Credits, is a stable token in the DIMO ecosystem for the builders. All DCX purchases uses the DIMO Token as medium.
            </p>
          </div>
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
              className="primary !h-9"
              onClick={() => setShowIframe(true)}
            >
              Buy DCX
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          src={iframeUrl}
          title="AlchemyPay On/Off Ramp Widget"
          style={{ width: '100%', height: '600px', border: 'none' }}
          allow="payment"
        />
      )}
    </Modal>
  );
};

export default BuyCreditsModal;
