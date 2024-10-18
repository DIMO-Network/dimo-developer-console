'use client';

import _ from 'lodash';
import { useContext, useState, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { utils } from 'web3';

import { useContractGA } from '@/hooks';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TokenInput } from '@/components/TokenInput';
import { CreditsContext } from '@/context/creditsContext';
import { NotificationContext } from '@/context/notificationContext';
import { PaymentMethodSelector } from '../PaymentMethodSelector';

import configuration from '@/config';

import './BuyCreditsModal.css';

const {
  NEXT_PUBLIC_API_KEY: nextPublicApiKey,
  NEXT_PUBLIC_CRYPTO_ADDRESS: nextPublicCryptoAddress,
  NEXT_PUBLIC_NETWORK: nextPublicNetwork,
} = process.env;

const ALCHEMY_IFRAME_URL = `https://ramptest.alchemypay.org/?apiKey=${nextPublicApiKey}&cryptoAddress=${nextPublicCryptoAddress}&network=${nextPublicNetwork}`;

interface IForm {
  credits: number;
  paymentMethod: {
    type: string;
    id: string;
  };
}

interface IProps { }

export const BuyCreditsModal: FC<IProps> = () => {
  const { isOpen, setIsOpen } = useContext(CreditsContext);
  const { dimoContract, address } = useContractGA();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { control, watch, getValues } = useForm<IForm>({
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

  const handleClose = () => {
    setIsOpen(false);
    setShowIframe(false);
  };

  const burnDimo = async () => {
    try {
      setIsLoading(true);
      if (dimoContract) {
        const { credits } = getValues();
        const dimoInWei = utils.toWei(credits, 'ether');
        await dimoContract.methods
          .mintInDimo(configuration.DLC_ADDRESS, dimoInWei)
          .send({
            from: address,
            maxFeePerGas: String(configuration.gasPrice),
            maxPriorityFeePerGas: String(configuration.gasPrice),
          });
        setIsOpen(false);
      }
    } catch (error: unknown) {
      const code = _.get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while confirming the transaction',
          'Oops...',
          'error',
        );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyDCX = () => {
    const { paymentMethod: { type } } = getValues();
    if (type === 'usd') {
      setShowIframe(true);
      return;
    }

    burnDimo();
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={handleClose} className="buy-credits-modal">
      {!showIframe ? (
        <div className="buy-credits-content">
          <div className="buy-credits-header">
            <Title className="text-2xl" component="h3">
              Buy DCX
            </Title>
            <p className="description">
              DCX, also known as DIMO Credits, is a stable token in the DIMO
              ecosystem for the builders. All DCX purchases uses the DIMO Token
              as medium.
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
          <div className="payment-method-container">
            <p className="payment-descriptor">Payment method</p>
            <PaymentMethodSelector name="paymentMethod" control={control} />
          </div>
          <div className="credit-action">
            <Button
              className="primary !h-9"
              onClick={() => handleBuyDCX()}
              loading={isLoading}
            >
              Buy DCX
            </Button>
          </div>
        </div>
      ) : (
        <iframe
          src={ALCHEMY_IFRAME_URL}
          title="AlchemyPay On/Off Ramp Widget"
          style={{ width: '100%', height: '600px', border: 'none' }}
          allow="payment"
        />
      )}
    </Modal>
  );
};

export default BuyCreditsModal;

