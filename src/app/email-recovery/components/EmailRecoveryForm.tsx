'use client';
import { FC, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Button } from '@/components/Button';
import { TextError } from '@/components/TextError';
import { captureException } from '@sentry/nextjs';
import { toast } from 'sonner';
import { generateP256KeyPair } from '@turnkey/crypto';
import { EmbeddedKey, saveToLocalStorage } from '@/utils/localStorage';
import { emailRecovery } from '@/actions/user';
import { isEmpty } from 'lodash';
import { useRouter } from 'next/navigation';
import { IPasskeyRecoveryState } from '@/types/auth';
import { useTranslations } from 'next-intl';

interface EmailRecoveryFormInputs {
  email: string;
}

interface IProps {
  onNext: (flow: string, state?: Partial<IPasskeyRecoveryState>) => void;
}

export const EmailRecoveryForm: FC<IProps> = ({ onNext }) => {
  const t = useTranslations('email-recovery');
  const tCommon = useTranslations('common');
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
        onNext('email-form', {
          email: email,
        });
      }
    } catch (error) {
      toast.error(t('form.sendFailed'));
      captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className="text-title text-ink">{t('form.title')}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="email-recovery__input">
        <p className="text-body-sm text-muted">{t('form.warning')}</p>
        <Label htmlFor="email">
          {t('form.emailLabel')}
          <TextField
            type="text"
            placeholder={t('form.emailPlaceholder')}
            {...register('email', {
              required: true,
            })}
            role="email-input"
          />
        </Label>
        {errors.email && <TextError errorMessage={tCommon('validation.required')} />}
        <Button
          variant="brand"
          type="submit"
          disabled={isEmpty(email)}
          loading={isLoading}
          role="continue-button"
        >
          {tCommon('actions.continue')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          role="cancel-button"
          onClick={() => router.back()}
        >
          {tCommon('actions.cancel')}
        </Button>
      </form>
    </div>
  );
};

export default EmailRecoveryForm;
