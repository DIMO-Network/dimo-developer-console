'use client';
import { FC, useState, useContext } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Button } from '@/components/Button';
import { TextError } from '@/components/TextError';
import { BubbleLoader } from '@/components/BubbleLoader';
import * as Sentry from '@sentry/nextjs';
import { NotificationContext } from '@/context/notificationContext';
import { generateP256KeyPair } from '@turnkey/crypto';
import { EmbeddedKey, saveToLocalStorage } from '@/utils/localStorage';
import { emailRecovery } from '@/actions/user';
import { gtSuper } from '@/utils/font';
import { isEmpty } from 'lodash';
import { useRouter } from 'next/navigation';

interface EmailRecoveryFormInputs {
  email: string;
}

interface IProps {
  onNext: (flow: string) => void;
}

export const EmailRecoveryForm: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailRecoveryFormInputs>();

  const email = watch('email', '');

  const onSubmit: SubmitHandler<EmailRecoveryFormInputs> = async () => {
    try {
      if (!email) return;
      setIsLoading(true);
      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      saveToLocalStorage(EmbeddedKey, key.privateKey);
      const success = await emailRecovery(email, targetPublicKey);
      if (success) {
        onNext('email-form');
      }
    } catch (error) {
      setNotification('Something went wrong while sending the email', 'Oops...', 'error');
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className={gtSuper.className}>Reset Passkeys</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="email-recovery__input">
        <p>Your old passkeys will not longer work after the reset is complete</p>
        <Label htmlFor="email" className="text-xs text-medium">
          Email
          <TextField
            type="text"
            placeholder="email@address.com"
            {...register('email', {
              required: true,
            })}
            role="email-input"
          />
        </Label>
        {errors.email && <TextError errorMessage="This field is required" />}
        <Button type="submit" disabled={isEmpty(email)} role="continue-button">
          {isLoading ? <BubbleLoader isLoading={isLoading} /> : 'Continue'}
        </Button>
        <Button
          type="button"
          className="border invert border-white"
          role="cancel-button"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </form>
    </div>
  );
};

export default EmailRecoveryForm;
