import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isClientError } from '@/utils/httpError';

// A 4xx is the server declining what was sent; repeating it byte for byte gets
// the same answer. Retrying one only delays the moment the UI can tell the user
// what went wrong -- a 401 on the template editor spent four requests and
// several seconds in loading state before any message appeared. 5xx and
// network faults are still retried, because those do clear on their own.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => !isClientError(error) && failureCount < 3,
    },
  },
});

const QueryProvider: FC<PropsWithChildren> = ({ children }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
export default QueryProvider;
