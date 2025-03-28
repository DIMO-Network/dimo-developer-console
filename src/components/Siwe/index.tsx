import { useContext, type FC } from 'react';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { useAccount, useSignMessage } from 'wagmi';
import { mainnet } from 'wagmi/chains';

import { IAuth } from '@/types/auth';
import { NotificationContext } from '@/context/notificationContext';
import { SignInButton } from '@/components/SignInButton';
import { SiweIcon } from '@/components/Icons';
import * as Sentry from '@sentry/nextjs';
interface SiweButtonProps {
  isSignIn: boolean;
  onCTA: (d: Partial<IAuth>) => void;
}

export const Siwe: FC<SiweButtonProps> = ({ isSignIn, onCTA }) => {
  const { signMessageAsync } = useSignMessage();
  const { setNotification } = useContext(NotificationContext);
  const { address } = useAccount();

  const handleLogin = async () => {
    try {
      const csrfToken = await getCsrfToken();

      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: mainnet?.id,
        nonce: csrfToken,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      onCTA({ address, message: JSON.stringify(message), signature });
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Something went wrong please try again', 'Oops', 'error');
    }
  };

  return (
    <SignInButton
      isSignIn={isSignIn}
      Icon={SiweIcon}
      className="sm"
      onClick={(e) => {
        e.preventDefault();
        handleLogin();
      }}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getServerSideProps(context: any) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}

export default Siwe;
