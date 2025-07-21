'use client';

import { useContext, useState, type FC } from 'react';
import { CreditsContext } from '@/context/creditsContext';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';

import { Button } from '@/components/Button';
import { generatePaymentLink } from '@/services/token';
import { MoneyField } from '@/components/MoneyField';
import { useForm } from 'react-hook-form';

import { TextError } from '@/components/TextError';
import { useContractGA, useGlobalAccount, useUser } from '@/hooks';
import { useSACD } from '@/hooks/useSACD';
import { Toggle } from '@/components/Toggle';
import SacdAbi from '@/contracts/Sacd.json';
import config from '@/config';

import './BuyCreditsModal.css';
import { Abi, encodeFunctionData, zeroAddress } from 'viem';
import { ethers } from 'ethers';

import { TextField } from '@/components/TextField';
import { isValidAddress } from '@ethereumjs/util';
import { captureException } from '@sentry/nextjs';

interface IForm {
  amount: string;
  externalTargetWallet: `0x${string}`;
}

export const BuyCreditsModal: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isOpen, setIsOpen } = useContext(CreditsContext);
  const { currentUser } = useGlobalAccount();
  const { data: user } = useUser();
  const [isForAnotherAccount, setIsForAnotherAccount] = useState<boolean>(false);
  const { generateSACDTemplate, uploadSACD, signSACD } = useSACD();
  const { processTransactions } = useContractGA();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<IForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      amount: '',
      externalTargetWallet: '' as `0x${string}`,
    },
  });

  const amount = watch('amount', '');
  const externalTargetWallet = watch('externalTargetWallet', '' as `0x${string}`);

  const handleIsOpen = (open: boolean) => {
    setIsOpen(open);
  };

  const handleProceedToPayment = async () => {
    try {
      setIsLoading(true);

      const { url } = await generatePaymentLink({ amount: Number(amount) });

      let beneficiary: `0x${string}` | null = null;

      if (isForAnotherAccount) {
        beneficiary = externalTargetWallet;
      }

      let sacd = generateSACDTemplate({
        amount: +amount,
        grantee: currentUser!.smartContractAddress,
        targetWallet: beneficiary,
        email: user!.email,
        name: user!.name,
        paymentLinkUrl: url,
      });

      sacd = await signSACD(sacd);

      const { success, cid } = await uploadSACD(sacd);

      if (!success) {
        throw new Error('Failed to upload SACD');
      }

      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      const encodedCurrency = ethers.encodeBytes32String('USD').slice(0, 8);

      const sacdTransaction = {
        to: config.DIMO_SACD_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: SacdAbi,
          functionName: 'setPayment',
          args: [
            zeroAddress,
            currentUser!.smartContractAddress,
            BigInt(+amount * 100),
            BigInt(fiveMinutesFromNow),
            encodedCurrency,
            `https://ipfs.io/ipfs/${cid}`,
          ],
        }),
      };

      const process = await processTransactions([sacdTransaction], {
        abi: SacdAbi as Abi,
      });

      if (!process.success) {
        throw new Error('Failed to process SACD transaction');
      }

      window.location.href = url;
    } catch (e: unknown) {
      captureException(e);
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
                placeholder="0.00"
                {...register('amount', {
                  required: true,
                  validate: {
                    positive: (value) =>
                      Number(value) > 0 || 'Amount must be greater than 0',
                    min: (value) => Number(value) >= 10 || `Minimum amount is $10.00`,
                  },
                })}
              />
            </label>
            {errors.amount && <TextError errorMessage={errors.amount.message ?? ''} />}
          </div>
          <div className="w-full flex flex-col gap-y-4">
            <div className="flex flex-row gap-2 items-center">
              <Toggle
                checked={isForAnotherAccount}
                onToggle={(checked) => setIsForAnotherAccount(checked)}
              />
              <label className="text-xs text-medium ml-2">
                Purchase for another account
              </label>
            </div>
            {isForAnotherAccount ? (
              <>
                <label>
                  Account Address
                  <TextField
                    placeholder="0x123..."
                    {...register('externalTargetWallet', {
                      required: isForAnotherAccount,
                      validate: {
                        validAddress: (value) => {
                          return isValidAddress(value) || 'Invalid Ethereum address';
                        },
                      },
                    })}
                  />
                </label>
                {errors.externalTargetWallet && (
                  <TextError errorMessage={errors.externalTargetWallet.message ?? ''} />
                )}
              </>
            ) : (
              <></>
            )}
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
