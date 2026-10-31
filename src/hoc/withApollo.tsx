'use client';
import config from '@/config';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import React, { ComponentType } from 'react';

const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: config.identityApiUrl }),
  cache: new InMemoryCache(),
  // Apollo Client 4 turned this on by default, which sets `loading` during a
  // refetch. Pages here swap their content for a Loader while `loading`, so a
  // refetch would unmount them and lose their state (tab, paging, modals).
  defaultOptions: { watchQuery: { notifyOnNetworkStatusChange: false } },
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
