import { IAuth } from '@/types/auth';
import { FC, useContext, useEffect } from 'react';
import { useGlobalAccount } from '@/hooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useSession } from 'next-auth/react';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const { registerSubOrganization, checkIfAvailable } = useGlobalAccount();
  const { data: session } = useSession();

  const handleWalletCreation = async () => {
    try {
      const isAvailable = await checkIfAvailable;

      if (!isAvailable) {
        setNotification(
          'Your device does not support WebAuthn. Please use a different device to create your wallet.',
          'WebAuthn not supported',
          'error',
        );
        return;
      }

      await registerSubOrganization();

      onNext('wallet-creation', {});
    } catch (error) {
      console.error(
        'Something went wrong while creating the user wallet',
        error,
      );
      setNotification('Something went wrong', 'Oops...', 'error');
    }
  };

  useEffect(() => {
    if (!session) return;
    handleWalletCreation().catch(console.error);
  }, [session]);

  return (
    <div className={'text-center text-xl'}>
      <h1>Hang tight! we are creating your wallet...</h1>
      <BubbleLoader isLoading={true} />
    </div>
  );
};

export default WalletCreation;
