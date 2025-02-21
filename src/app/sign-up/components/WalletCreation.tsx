import { IAuth } from '@/types/auth';
import { FC, useContext, useEffect } from 'react';
import { useGlobalAccount, usePasskey } from '@/hooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useSession } from 'next-auth/react';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const { registerSubOrganization } = useGlobalAccount();
  const { data: session } = useSession();
  const { isPasskeyAvailable } = usePasskey();

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

  useEffect(() => {
    if (!session) return;
    void handleWalletCreation(session.user.email!);
  }, [session]);

  return (
    <div className={'text-center text-xl'}>
      <h1>Hang tight! we are creating your wallet...</h1>
      <BubbleLoader isLoading={true} />
    </div>
  );
};

export default WalletCreation;
