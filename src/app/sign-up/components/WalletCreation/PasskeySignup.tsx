import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { gtSuper } from '@/utils/font';
import { FC } from 'react';

export const PasskeySignup: FC = () => {
  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className={gtSuper.className}>Continue with passkey</p>
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
