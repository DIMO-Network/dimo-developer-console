import { Anchor } from '@/components/Anchor';
import { BubbleLoader } from '@/components/BubbleLoader';
import { NotificationContext } from '@/context/notificationContext';
import { useAuth } from '@/hooks';
import { gtSuper } from '@/utils/font';
import { useRouter } from 'next/navigation';
import { FC, useContext, useEffect } from 'react';
import { captureException } from '@sentry/nextjs';

interface IProps {
  handlePasskeyRejected: (shouldFallback: boolean) => void;
  currentWallet: `0x${string}` | null;
}

export const PasskeyLogin: FC<IProps> = ({ handlePasskeyRejected, currentWallet }) => {
  const router = useRouter();
  const { loginWithPasskey } = useAuth();
  const { setNotification } = useContext(NotificationContext);

  const handleLoginWithPasskey = async () => {
    try {
      const { success } = await loginWithPasskey({ currentWalletValue: currentWallet });

      if (!success) {
        setNotification('Failed to login with passkey', 'Oops...', 'error');
        return;
      }

      router.replace('/app');
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          handlePasskeyRejected(true);
          return;
        }
      }
      handlePasskeyRejected(false);
      captureException(error);
      setNotification('Failed to login with passkey', 'Oops...', 'error');
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
