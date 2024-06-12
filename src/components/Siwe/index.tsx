import { getCsrfToken, signIn, useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useEffect, useState } from 'react';
import { mainnet, polygon, polygonAmoy, arbitrum, base } from 'wagmi/chains';
import { SignInButton } from '../SignInButton';
import { SiweIcon } from '@/components/Icons';
import type { FC } from 'react';
import { frontendUrl } from '@/config/default';
import { redirect } from 'next/navigation';

interface SiweButtonProps {
  isSignIn: boolean;
}

export const Siwe: FC<SiweButtonProps> = ({ isSignIn }) => {
  const { signMessageAsync } = useSignMessage();
  // const { chain } = useNetwork();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { data: session, status } = useSession();
  // console.log({ session, status });

  // useEffect(() => {
  //   if (session && session.user && status === 'authenticated') {
  //     redirect(`${frontendUrl}app`);
  //   }
  // }, [status]);

  const handleLogin = async () => {
    try {
      const callbackUrl = '/protected';

      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: mainnet?.id,
        nonce: await getCsrfToken(),
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      signIn('credentials', {
        message: JSON.stringify(message),
        redirect: false,
        signature,
        callbackUrl,
      });
    } catch (error) {
      console.log({ error });
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

export async function getServerSideProps(context: any) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}

export default Siwe;
