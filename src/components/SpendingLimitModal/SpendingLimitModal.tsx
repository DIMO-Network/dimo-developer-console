'use client';

import _ from 'lodash';

import { useState, useContext, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { utils } from 'web3';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { Title } from '@/components/Title';
import { TokenInput } from '@/components/TokenInput';
import { useContractGA } from '@/hooks';
import * as Sentry from '@sentry/nextjs';

import configuration from '@/config';

import './SpendingLimitModal.css';

interface IForm {
  credits: number;
}

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
  onSubmit?: (n: number) => void;
  addressToAllow?: `0x${string}`;
}

export const SpendingLimitModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  onSubmit = () => {},
  addressToAllow = configuration.DLC_ADDRESS,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { dimoContract } = useContractGA();
  const { control, handleSubmit, getValues } = useForm<IForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      credits: 0,
    },
  });

  const setSpendingLimit = async () => {
    try {
      setIsLoading(true);
      if (dimoContract) {
        const { credits } = getValues();
        const dimoInWei = utils.toWei(credits, 'ether');
        await dimoContract.write.approve([addressToAllow, dimoInWei]);
        setIsOpen(false);
        onSubmit(credits);
      }
    } catch (error: unknown) {
      Sentry.captureException(error);
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

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="buy-credits-modal">
      <form className="buy-credits-content" onSubmit={handleSubmit(setSpendingLimit)}>
        <div className="buy-credits-header">
          <Title className="text-2xl" component="h3">
            Set spending limit
          </Title>
          <p className="description">
            Approve the Developer License to spend $DIMO on your connected wallet, we
            recommend approving more than $100 USD worth of $DIMO
          </p>
        </div>
        <TokenInput control={control} name="credits" description="$DIMO" />
        <div className="credit-action">
          <Button className="primary !h-9" loading={isLoading}>
            Confirm
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SpendingLimitModal;
