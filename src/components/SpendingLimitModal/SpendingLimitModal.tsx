'use client';

import { useTranslations } from 'next-intl';
import { get } from 'lodash';

import { useState, type FC } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { toast } from 'sonner';
import { Title } from '@/components/Title';
import { TokenInput } from '@/components/TokenInput';
import { useContractGA } from '@/hooks/useContractGA';
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
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { approveNewSpendingLimit } = useContractGA();
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
      const { credits } = getValues();
      await approveNewSpendingLimit(credits, addressToAllow);
      setIsOpen(false);
      onSubmit(credits);
    } catch (error: unknown) {
      Sentry.captureException(error);
      const code = get(error, 'code', null);
      if (code === 4001) toast.error(t('errors.transactionDenied'));
      else toast.error(t('spendingLimit.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="buy-credits-modal">
      <form className="buy-credits-content" onSubmit={handleSubmit(setSpendingLimit)}>
        <div className="buy-credits-header">
          <Title className="text-2xl" component="h3">
            {t('spendingLimit.title')}
          </Title>
          <p className="description">{t('spendingLimit.description')}</p>
        </div>
        <TokenInput control={control} name="credits" description="$DIMO" />
        <div className="credit-action">
          <Button className="h-9!" loading={isLoading}>
            {t('actions.confirm')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default SpendingLimitModal;
