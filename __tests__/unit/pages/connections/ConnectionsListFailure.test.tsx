import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/hooks', () => ({ useGlobalAccount: () => ({ currentUser: undefined }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

import ConnectionsList from '@/app/connections/components/View/View';
import { defaultQueryRetry } from '@/hoc/QueryProvider';

describe('connections list failure', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('shows the error after one retry', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: defaultQueryRetry, retryDelay: 0 } },
    });
    render(
      <QueryClientProvider client={client}>
        <ConnectionsList />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/There was a problem fetching your connections/),
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith('/api/connections');
  });
});
