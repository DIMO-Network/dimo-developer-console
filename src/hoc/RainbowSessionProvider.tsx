'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ComponentType } from 'react';

import { TurnkeyProvider } from '@turnkey/sdk-react';
import { turnkeyConfig } from '@/config/turnkey';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import useStripeCrypto from '@/hooks/useStripeCrypto';

const queryClient = new QueryClient();

export const withRainBow = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const { stripeClientId, setStripeClientId } = useStripeCrypto();

    // Render the wrapped component with any additional props
    return (
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <TurnkeyProvider
            config={{
              rpId: turnkeyConfig.rpId,
              apiBaseUrl: turnkeyConfig.apiBaseUrl,
              defaultOrganizationId: turnkeyConfig.defaultOrganizationId,
            }}
          >
            <StripeCryptoContext.Provider value={{ stripeClientId, setStripeClientId }}>
              <WrappedComponent {...props} />
            </StripeCryptoContext.Provider>
          </TurnkeyProvider>
        </QueryClientProvider>
      </SessionProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withRainBow(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withRainBow;
