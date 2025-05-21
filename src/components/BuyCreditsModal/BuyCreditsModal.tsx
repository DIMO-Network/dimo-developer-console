'use client';

import { useContext, useState, type FC } from 'react';
import { CreditsContext } from '@/context/creditsContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';

import './BuyCreditsModal.css';
import { Button } from '@/components/Button';
import { generatePaymentLink } from '@/services/token';
import { MoneyField } from '@/components/MoneyField';
import { useForm } from 'react-hook-form';

import { TextError } from '@/components/TextError';
import { useGlobalAccount, useUser } from '@/hooks';
import { useSACD } from '@/hooks/useSACD';
import { Toggle } from '@/components/Toggle';

interface IForm {
  amount: number;
  externalTargetWallet: `0x${string}`;
}

export const BuyCreditsModal: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isOpen, setIsOpen } = useContext(CreditsContext);
  const { currentUser } = useGlobalAccount();
  const { data: user } = useUser();
  const [isForAnotherAccount, setIsForAnotherAccount] = useState<boolean>(false);
  const { generateSACDTemplate, uploadSACD } = useSACD();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<IForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: 0,
      externalTargetWallet: '' as `0x${string}`,
    },
  });

  const amount = watch('amount', 0);

  const handleIsOpen = (open: boolean) => {
    setIsOpen(open);
  };

  const handleProceedToPayment = async () => {
    try {
      setIsLoading(true);
      const { url } = await generatePaymentLink(amount);
      let sacd = generateSACDTemplate({
        amount: amount,
        smartContractAddress: currentUser!.smartContractAddress,
        email: user!.email,
        name: user!.name,
        paymentLinkUrl: url,
      });

      const { success, cid } = await uploadSACD(sacd);

      if (!success) {
        throw new Error('Failed to upload SACD');
      }

      sacd = {
        ...sacd,
        data: {
          ...sacd.data,
          agreements: [
            {
              ...sacd.data.agreements[0],
              attachments: [
                ...sacd.data.agreements[0].attachments,
                {
                  name: 'Dimo Credits Purchase',
                  description: 'Purchase of DCX',
                  contentType: 'application/json',
                  url: `https://ipfs.io/ipfs/${cid}`,
                },
              ],
            },
          ],
        },
      };

      window.location.href = url;
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={handleIsOpen} className="buy-credits-modal">
      <div className="buy-credits-content">
        <form onSubmit={handleSubmit(handleProceedToPayment)}>
          <div className="buy-credits-header">
            <Title className="text-2xl" component="h3">
              Buy DCX
            </Title>
          </div>
          <div className="buy-credits-description">
            <p className="description">
              The base price to accessing one vehicle is $.125 per month.
            </p>
            <a href="">Learn more.</a>
          </div>
          <div className="w-full gap-y-4">
            <label htmlFor="amount" className="text-xs text-medium">
              Purchase Amount
              <MoneyField
                {...register('amount', {
                  required: true,
                  validate: {
                    positive: (value) => value > 0 || 'Amount must be greater than 0',
                    min: (value) => value >= 10 || `Minimum amount is $10.00`,
                  },
                })}
              />
            </label>
            {errors.amount && <TextError errorMessage={errors.amount.message ?? ''} />}
          </div>
          <div className="w-full flex flex-col gap-y-4">
            <Toggle
              checked={isForAnotherAccount}
              onToggle={(checked) => setIsForAnotherAccount(checked)}
            />
          </div>
          <div className="credits-action w-full mt-4">
            <Button type="submit" className="primary !h-9 w-full" loading={isLoading}>
              Proceed to Payment
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default BuyCreditsModal;
