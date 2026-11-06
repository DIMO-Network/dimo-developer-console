import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Tests' stand-in for the Identity API: answers fetchIdentity's POSTs and
// records them.

export interface IdentityRequest {
  query: string;
  variables: Record<string, unknown>;
}

export type IdentityAnswer =
  { data?: unknown; errors?: { message: string }[] } | { status: number; body?: unknown };

export const mockIdentityApi = (
  answer: (request: IdentityRequest) => IdentityAnswer | Promise<IdentityAnswer>,
) => {
  const requests: IdentityRequest[] = [];
  const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as IdentityRequest;
    requests.push(request);
    const result = await answer(request);
    const status = 'status' in result ? result.status : 200;
    const body = 'status' in result ? (result.body ?? {}) : result;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { requests, fetchMock };
};

// A fresh cache per test, with retries that don't wait.
export const queryClientWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
};
