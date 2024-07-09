'use client';
import { useContext, type FC } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { CreditsContext } from '@/context/creditsContext';
import { DCXInput } from '@/components/DCXInput';
import { Modal } from '@/components/Modal';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
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
  const credits = watch('credits', 0);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="buy-credits-modal">
      <div className="buy-credits-content">
        <div className="buy-credits-header">
          <Title className="text-2xl" component="h3">
            Buy DCX
          </Title>
          <p className="description">
            Development credits, or “DCX”, are used to purchase software
            licenses on the Build DIMO platform
          </p>
        </div>
        <DCXInput control={control} name="credits" />
        <div className="credit-total-content">
          <p className="total-descriptor">Your total</p>
          <p className="total-value">$ {credits}</p>
        </div>
        <div className="payment-method-container">
          <p className="payment-descriptor">Payment method</p>
          <PaymentMethodSelector name="paymentMethod" control={control} />
        </div>
        <div className="credit-action">
          <Button className="primary !h-9">Purchase</Button>
        </div>
      </div>
    </Modal>
  );
};

export default BuyCreditsModal;
