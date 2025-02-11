'use client';
import { FC, useState, useContext } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Button } from '@/components/Button';
import { TextError } from '@/components/TextError';
import { useGlobalAccount } from '@/hooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import * as Sentry from '@sentry/nextjs';
import { NotificationContext } from '@/context/notificationContext';

interface EmailRecoveryFormInputs {
  email: string;
}

interface IProps {
  onNext: (flow: string) => void;
}

export const EmailRecoveryForm: FC<IProps> = ({ onNext }) => {
  const { emailRecovery } = useGlobalAccount();
  const { setNotification } = useContext(NotificationContext);
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
      const success = await emailRecovery(email);
      if (success) {
        onNext('email-form');
      }
    } catch (error) {
      setNotification('Something went wrong while sending the email', 'Oops...', 'error');
      Sentry.captureException(error);
    }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full max-w-sm pt-4"
    >
      <div className="flex flex-col gap-4 ">
        <Label htmlFor="email" className="text-xs text-medium">
          <TextField
            type="text"
            placeholder="Enter your email..."
            {...register('email', {
              required: true,
            })}
            role="email-input"
          />
        </Label>
        {errors.email && <TextError errorMessage="This field is required" />}
      </div>
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary" role="continue-button">
          {isLoading ? <BubbleLoader isLoading={isLoading} /> : 'Continue'}
        </Button>
      </div>
    </form>
  );
};

export default EmailRecoveryForm;
