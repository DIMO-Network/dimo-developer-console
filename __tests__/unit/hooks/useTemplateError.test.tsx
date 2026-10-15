import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTemplate } from '@/hooks/queries/useTemplate';
import { HttpError, isClientError } from '@/utils/httpError';

const wrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useTemplate failure', () => {
  afterEach(() => jest.restoreAllMocks());

  it('throws an HttpError carrying the status, not a bare Error', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })) as never;

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTemplate('ford_f-150_2021'), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const err = result.current.error;
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(401);
    expect(err?.message).toBe('Unauthorized');
    // Which is what lets the retry policy stop, instead of sending the same
    // rejected request three more times before the UI can say anything.
    expect(isClientError(err)).toBe(true);
  });

  it('requests the template exactly once when the answer is 401', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    }));
    global.fetch = fetchMock as never;

    // The real policy, not retry:false -- this is the behaviour that regressed.
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (count: number, error: Error) => !isClientError(error) && count < 3,
        },
      },
    });
    const { result } = renderHook(() => useTemplate('ford_f-150_2021'), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
