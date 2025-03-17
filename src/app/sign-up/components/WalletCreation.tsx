import { IAuth } from '@/types/auth';
import { FC, useContext, useEffect } from 'react';
import { useGlobalAccount, usePasskey } from '@/hooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';
import { gtSuper } from '@/utils/font';
import { Anchor } from '@/components/Anchor';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const { registerSubOrganization } = useGlobalAccount();
  const { isPasskeyAvailable, getNewUserPasskey } = usePasskey();

  const handleWalletCreation = async (email: string) => {
    try {
      const newOrg = await registerSubOrganization({
        createWithoutPasskey: !isPasskeyAvailable,
        email,
      });
      if (Object.keys(newOrg).length === 0) {
        setNotification(
          'Something went wrong while creating the user wallet',
          'Oops...',
          'error',
        );
        return;
      }
      onNext('wallet-creation', {});
    } catch (error) {
      Sentry.captureException(error);
      console.error('Something went wrong while creating the user wallet', error);
      setNotification(
        'Something went wrong while creating the user wallet',
        'Oops...',
        'error',
      );
    }
  };

  // useEffect(() => {
  //   if (!session) return;
  //   void handleWalletCreation(session.user.email!);
  // }, [session]);

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

export default WalletCreation;
