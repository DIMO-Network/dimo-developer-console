import { IAuth } from '@/types/auth';
import { FC, useContext, useEffect } from 'react';
import { useGlobalAccount } from '@/hooks';
import { Loader } from '@/components/Loader';
import { Loading } from '@/components/Loading';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useSession } from 'next-auth/react';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const WalletCreation : FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const { registerSubOrganization } = useGlobalAccount();
  const { data: session } = useSession();

  const handleWalletCreation = async () => {
    try {
      await registerSubOrganization();

      onNext('wallet-creation', {});
    } catch (error) {
    console.error(
      'Something went wrong while the completing user information',
      error
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
      <h1>Hang tight! we're creating your wallet...</h1>
      <BubbleLoader isLoading={true} />
    </div>
  );
};

export default WalletCreation;