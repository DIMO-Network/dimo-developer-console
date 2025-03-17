import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButton';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { IAuth } from '@/types/auth';
import { gtSuper } from '@/utils/font';
import { Button } from '@/components/Button';
import { isEmpty } from 'lodash';
import { FC, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { BubbleLoader } from '@/components/BubbleLoader';

interface IProps {
  handleLogin: (email: string) => Promise<void>;
  handleCTA: (app: string, auth?: Partial<IAuth>) => Promise<void>;
}

interface EmailLoginFormInputs {
  email: string;
}

export const SignInMethodForm: FC<IProps> = ({ handleLogin, handleCTA }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<EmailLoginFormInputs>();

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
          <p className={gtSuper.className}>Build with car data</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="sign-in__input">
          <TextField
            {...register('email', {
              required: true,
            })}
            role="email-input"
            type="text"
            placeholder="email@address.com"
          />
          {errors.email && <TextError errorMessage="This field is required" />}
          <Button type="submit" disabled={isEmpty(email)} role="continue-button">
            {isLoading ? <BubbleLoader isLoading={isLoading} /> : 'Continue'}
          </Button>
        </form>
        <div className="sign-in__divider">
          <div className="divider"></div>
          <p className="divider-caption">or</p>
          <div className="divider"></div>
        </div>
        <div className="sign-in__buttons">
          <SignInButtons isSignIn={true} disabled={false} onCTA={handleCTA} />
        </div>
        <div className="sign-in__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              Lost your passkey?{' '}
              <Anchor href="/email-recovery" target="_self" className="grey underline">
                Recover with your email
              </Anchor>
            </p>
          </div>
          <div className="flex flex-row">
            <p className="terms-caption">
              Trouble logging in?{' '}
              <Anchor href="mailto:developer-support@dimo.org" className="grey underline">
                Get support
              </Anchor>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
