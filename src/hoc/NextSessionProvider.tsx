'use client';

import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ComponentType } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import useStripeCrypto from '@/hooks/useStripeCrypto';
import config from '@/config';

const queryClient = new QueryClient();
const apolloClient = new ApolloClient({
  uri: config.identityApiUrl,
  cache: new InMemoryCache(),
});

export const withNextSession = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const { stripeClientId, setStripeClientId } = useStripeCrypto();

    // Render the wrapped component with any additional props
    return (
      <SessionProvider>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <StripeCryptoContext.Provider value={{ stripeClientId, setStripeClientId }}>
              <WrappedComponent {...props} />
            </StripeCryptoContext.Provider>
          </QueryClientProvider>
        </ApolloProvider>
      </SessionProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withNextSession(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withNextSession;
