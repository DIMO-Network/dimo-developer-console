'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ComponentType } from 'react';

import configuration from '@/config';

import '@rainbow-me/rainbowkit/styles.css';
import { TurnkeyProvider } from '@turnkey/sdk-react';
import { turnkeyConfig } from '@/config/turnkey';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import useStripeCrypto from '@/hooks/useStripeCrypto';

const { RAINBOW_PROJECT } = configuration;

const config = getDefaultConfig({
  appName: RAINBOW_PROJECT.NAME,
  projectId: RAINBOW_PROJECT.ID,
  chains: [mainnet, polygon, polygonAmoy],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export const withRainBow = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const { stripeClientId, setStripeClientId } = useStripeCrypto();

    // Render the wrapped component with any additional props
    return (
      <WagmiProvider config={config}>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <TurnkeyProvider config={turnkeyConfig}>
              <StripeCryptoContext.Provider
                value={{ stripeClientId, setStripeClientId }}
              >
                <WrappedComponent {...props} />
              </StripeCryptoContext.Provider>
            </TurnkeyProvider>
          </QueryClientProvider>
        </SessionProvider>
      </WagmiProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withRainBow(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withRainBow;
