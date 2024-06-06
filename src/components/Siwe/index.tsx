import { getCsrfToken, signIn, useSession } from 'next-auth/react';
import { SiweMessage } from 'siwe';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useEffect, useState } from 'react';
import { mainnet, polygon, polygonAmoy, arbitrum, base } from 'wagmi/chains';

function Siwe() {
  const { signMessageAsync } = useSignMessage();
  // const { chain } = useNetwork();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { data: session, status } = useSession();

  const handleLogin = async () => {
    try {
      const callbackUrl = '/protected';
      console.log(window.location.host, window.location.origin);
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
      console.log({ signature });
      signIn('credentials', {
        authUrl: `${window.location.origin}/auth/`,
        message: JSON.stringify(message),
        redirect: false,
        signature,
        callbackUrl: new URL(callbackUrl, window.location.href).href,
      });
    } catch (error) {
      console.log('HEREHHEREHHERHEHERE', error);
      window.alert(error);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        if (!isConnected) {
          connect({ connector: injected() });
        } else {
          handleLogin();
        }
      }}
    >
      Sign-in
    </button>
  );
}

export async function getServerSideProps(context: any) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}

export default Siwe;
