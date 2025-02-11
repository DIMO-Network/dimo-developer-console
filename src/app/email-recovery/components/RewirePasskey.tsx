import { FC, useContext, useEffect } from 'react';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useGlobalAccount } from '@/hooks';
import { useSearchParams } from 'next/navigation';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';

interface IProps {
  onNext: (flow: string) => void;
}

export const RewirePasskey: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const params = useSearchParams();
  const { validCredentials, registerNewPasskey } = useGlobalAccount();

  const handleRewirePasskey = async (recoveryKey: string) => {
    try {
      const credentialsAreValid = await validCredentials(recoveryKey);
      if (credentialsAreValid === null) return;
      if (!credentialsAreValid) return;
      await registerNewPasskey();
      setNotification('Passkey rewired successfully', 'Success', 'success');
      onNext('rewire-passkey');
    } catch (error) {
      setNotification('Something went wrong', 'Oops...', 'error');
      Sentry.captureException(error);
    }
  };

  useEffect(() => {
    const recoveryKey = params.get('token');
    if (recoveryKey) {
      void handleRewirePasskey(recoveryKey);
    }
  }, [params, validCredentials]);

  return (
    <div className="text-left text-xl mt-4">
      <h1 className="opacity-30">A passkey is the fastest and most secure way to sign</h1>
      <h1 className="opacity-30">in to DIMO.</h1>
      <h1 className="mt-4 text-center">Hang tight! we are rewiring your passkey...</h1>
      <BubbleLoader isLoading={true} />
    </div>
  );
};

export default RewirePasskey;
