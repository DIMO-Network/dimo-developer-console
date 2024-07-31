'use client';
import { useState, useContext, type FC } from 'react';
import { useForm } from 'react-hook-form';
import { utils } from 'web3';

import { Button } from '@/components/Button';
import { TokenInput } from '@/components/TokenInput';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { useContract } from '@/hooks';
import configuration from '@/config';

import './SpendingLimitModal.css';
import { NotificationContext } from '@/context/notificationContext';
import _ from 'lodash';

interface IForm {
  credits: number;
}

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
  onSubmit?: (n: number) => void;
}

export const SpendingLimitModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  onSubmit = () => {},
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { dimoContract, address } = useContract();
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
        await dimoContract.methods
          .approve(configuration.DLC_ADDRESS, dimoInWei)
          .send({
            from: address,
            maxFeePerGas: String(configuration.gasPrice),
            maxPriorityFeePerGas: String(configuration.gasPrice),
          });
        setIsOpen(false);
        onSubmit(credits);
      }
    } catch (error: unknown) {
      const code = _.get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while confirming the transaction',
          'Oops...',
          'error'
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="buy-credits-modal">
      <form
        className="buy-credits-content"
        onSubmit={handleSubmit(setSpendingLimit)}
      >
        <div className="buy-credits-header">
          <Title className="text-2xl" component="h3">
            Set spending limit
          </Title>
          <p className="description">
            Approve the Developer License to spend $DIMO on your connected
            wallet, we recommend approving more than $100 USD worth of $DIMO
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
