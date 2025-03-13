import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useAuth } from '@/hooks';
import { gtSuper } from '@/utils/font';
import { FC, useEffect } from 'react';

interface IProps {
  handlePasskeyRejected: () => void;
}

export const PasskeyLogin: FC<IProps> = ({ handlePasskeyRejected }) => {
  const { loginWithPasskey } = useAuth();

  const handleLoginWithPasskey = async () => {
    try {
      await loginWithPasskey();
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          handlePasskeyRejected();
        }
      }
    }
  };

  useEffect(() => {
    void handleLoginWithPasskey();
  }, []);
  return (
    <>
      <div className="sign-in__form">
        <div className="sign-in__header">
          <p className={gtSuper.className}>Continue with passkey</p>
        </div>
        <BubbleLoader isLoading={true} />
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

export default PasskeyLogin;
