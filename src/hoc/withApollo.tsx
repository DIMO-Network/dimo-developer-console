'use client';
import config from '@/config';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import React, { ComponentType } from 'react';

const apolloClient = new ApolloClient({
  uri: config.identityApiUrl,
  cache: new InMemoryCache(),
});

export const withApollo = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    // Render the wrapped component with any additional props
    return (
      <ApolloProvider client={apolloClient}>
        <WrappedComponent {...props} />
      </ApolloProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withApollo(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withApollo;
