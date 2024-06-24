import type { FC } from 'react';
import { getCsrfToken } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { mainnet } from 'wagmi/chains';

import { SiweIcon } from '@/components/Icons';
import { SignInButton } from '@/components/SignInButton';
import { IAuth } from '@/types/auth';

interface SiweButtonProps {
  isSignIn: boolean;
  onCTA: (d: Partial<IAuth>) => void;
}

export const Siwe: FC<SiweButtonProps> = ({ isSignIn, onCTA }) => {
  const { signMessageAsync } = useSignMessage();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

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
      window.alert(error);
    }
  };

  return (
    <SignInButton
      isSignIn={isSignIn}
      Icon={SiweIcon}
      className="sm"
      onClick={(e) => {
        e.preventDefault();
        if (!isConnected) {
          connect({ connector: injected() });
        } else {
          handleLogin();
        }
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
