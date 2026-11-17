import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButton';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { isEmpty } from 'lodash';
import { FC, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import isEmail from 'validator/lib/isEmail';
import { useTranslations } from 'next-intl';

interface IProps {
  handleLogin: (email: string) => Promise<void>;
}

interface EmailLoginFormInputs {
  email: string;
}

export const SignInMethodForm: FC<IProps> = ({ handleLogin }) => {
  const t = useTranslations('sign-in');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { handleExternalAuth } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailLoginFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const email = watch('email', '');

  const onSubmit: SubmitHandler<EmailLoginFormInputs> = async () => {
    try {
      setIsLoading(true);
      if (!email) return;
      await handleLogin(email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="sign-in__form">
        <div className="sign-in__header">
          <p className="text-title text-ink">{t('methodForm.title')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="sign-in__input">
          <TextField
            {...register('email', {
              required: tCommon('validation.required'),
              maxLength: {
                value: 120,
                message: t('methodForm.maxLength'),
              },
              validate: {
                isEmail: (str: string) => {
                  if (str && isEmail(str)) return true;
                  return t('methodForm.invalidEmail');
                },
              },
            })}
            role="email-input"
            type="text"
            placeholder={t('methodForm.emailPlaceholder')}
          />
          {errors.email && <TextError errorMessage={errors.email?.message ?? ''} />}
          <Button
            variant="brand"
            type="submit"
            disabled={isEmpty(email) || !!errors.email}
            role="continue-button"
            loading={isLoading}
          >
            {tCommon('actions.continue')}
          </Button>
        </form>
        <div className="sign-in__divider">
          <div className="divider"></div>
          <p className="divider-caption">{t('methodForm.or')}</p>
          <div className="divider"></div>
        </div>
        <div className="sign-in__buttons">
          <SignInButtons disabled={false} onCTA={handleExternalAuth} />
        </div>
        <div className="sign-in__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              {/* Rarely used: not worth a prefetch while sign-in loads. */}
              {t.rich('methodForm.lostPasskey', {
                reset: (chunks) => (
                  <Anchor
                    href="/email-recovery"
                    prefetch={false}
                    target="_self"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
          <div className="flex flex-row">
            <p className="terms-caption">
              {t.rich('methodForm.troubleLoggingIn', {
                support: (chunks) => (
                  <Anchor
                    href="mailto:developer-support@dimo.org"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
