import React, { StrictMode, useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const OWNER = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const CONSOLE_KEY = '0xc0n50le00000000000000000000000000000be3f';
const findConsoleKeyAddress = jest.fn(async () => CONSOLE_KEY);
const enableSigner = jest.fn(async () => {});

// The REAL useEventEmitter: the publish must reach a sibling listener.
jest.mock('@/hooks/useDimoAuth', () => ({
  useDimoAuth: () => ({
    hasGlobalAccountPrivateKey: jest.fn(),
    findConsoleKeyAddress,
    getGlobalAccountDeveloperJwt: jest.fn(),
  }),
}));
jest.mock('@/hooks/useTransactions', () => ({
  useDisableSigner: () => jest.fn(),
  useEnableSigner: () => enableSigner,
  useSetRedirectUri: () => jest.fn(),
}));
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: () => ({
    currentUser: { smartContractAddress: OWNER, subOrganizationId: 'sub-org' },
  }),
}));
jest.mock('@/hooks/useMixPanel', () => ({
  useMixPanel: () => ({ trackEvent: jest.fn() }),
}));
jest.mock('@/hoc/withLoadingStatus', () => ({
  withLoadingStatus: (Component: React.ComponentType) => Component,
}));
jest.mock('@/hooks/useIsLicenseOwner', () => ({ useIsLicenseOwner: () => true }));
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => ({ members: [] }) }));
jest.mock('@/hooks/useLicenseSignerRegistry', () => ({
  useLicenseSignerRegistry: () => ({
    byAddress: new Map(),
    isError: false,
    isLoaded: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('@/actions/teams', () => ({
  upsertLicenseSigner: jest.fn(),
  markLicenseSignerDisabled: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ getUser: jest.fn() }));
jest.mock('@/services/developerJwt', () => ({ getDeveloperJwt: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { useEventEmitter } from '@/hooks/useEventEmitter';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers/Signers';

const received = jest.fn();
// Mounts after Signers, like DeveloperJwts in the license View.
const Listener = () => {
  const { eventData } = useEventEmitter<{ client_id: string }>(
    'generate-my-developer-jwt',
  );
  useEffect(() => {
    if (eventData) received(eventData);
  }, [eventData]);
  return null;
};

const license = {
  owner: OWNER,
  clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  tokenId: 42,
  signers: { nodes: [{ address: CONSOLE_KEY, enabledAt: '2026-09-01T00:00:00Z' }] },
  redirectURIs: { nodes: [{ uri: 'https://a.test' }] },
} as never;

const mount = (client: QueryClient, strict = false) => {
  const tree = (
    <QueryClientProvider client={client}>
      <Signers license={license} refetch={jest.fn(async () => {})} />
      <Listener />
    </QueryClientProvider>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Signers announces the console key to the JWT listener', () => {
  it('reaches a sibling listener exactly once with a warm query cache', async () => {
    const client = newClient();
    client.setQueryData(['console-key', 'sub-org'], CONSOLE_KEY);
    mount(client);
    await waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(received).toHaveBeenCalledTimes(1);
    expect(enableSigner).not.toHaveBeenCalled();
  });

  it('reaches it exactly once with a cold query cache', async () => {
    mount(newClient());
    await waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('reaches it exactly once under StrictMode', async () => {
    const client = newClient();
    client.setQueryData(['console-key', 'sub-org'], CONSOLE_KEY);
    mount(client, true);
    await waitFor(() => expect(received).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(received).toHaveBeenCalledTimes(1);
  });
});
