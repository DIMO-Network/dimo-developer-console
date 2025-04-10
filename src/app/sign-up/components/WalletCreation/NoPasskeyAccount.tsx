import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { gtSuper } from '@/utils/font';
import { FC } from 'react';

export const NoPasskeySignup: FC = () => {
  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className={gtSuper.className}>Creating account without passkey</p>
        </div>
        <div className="otp-login-text">
          <p>
            Your DIMO account is being created without a passkey, please check your inbox
            for a 6-digit OTP.
          </p>
        </div>
        <BubbleLoader isLoading={true} />
        <div className="sign-up__extra-links">
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
