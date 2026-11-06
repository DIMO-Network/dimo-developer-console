import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const findConsoleKeyAddress = jest.fn();
const getGlobalAccountDeveloperJwt = jest.fn();
jest.mock('@/hooks/useDimoAuth', () => ({
  useDimoAuth: () => ({ findConsoleKeyAddress, getGlobalAccountDeveloperJwt }),
}));
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: () => ({ currentUser: { subOrganizationId: 'sub-1' } }),
}));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import {
  CONSOLE_ACCESS_JWT_FAILED,
  CONSOLE_ACCESS_JWT_PENDING,
  GenerateDevJWTSection,
} from '@/components/Webhooks/components/GenerateDevJWTSection';
import { LocalDeveloperLicense } from '@/types/webhook';

// Identity lists signers checksummed; Turnkey returns the key lowercase.
const CONSOLE_KEY = '0x5b2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c';
const license = (signers: string[]) =>
  new LocalDeveloperLicense({
    alias: 'Fleet',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'https://fleet.example' }] },
    signers: { nodes: signers.map((address) => ({ address })) },
  });

const show = (lic: LocalDeveloperLicense, onSuccess = jest.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <GenerateDevJWTSection license={lic} onSuccess={onSuccess} message="Needs a JWT" />
    </QueryClientProvider>,
  );
  return { ...view, onSuccess, client };
};

describe('GenerateDevJWTSection', () => {
  beforeEach(() => {
    findConsoleKeyAddress.mockResolvedValue(CONSOLE_KEY);
    getGlobalAccountDeveloperJwt.mockResolvedValue(true);
  });

  it('makes the JWT with console access, without asking for an API key', async () => {
    const { onSuccess } = show(license(['0x5B2E4F6A8C0D2E4F6A8C0D2E4F6A8C0D2E4F6A8C']));
    expect(screen.getByRole('status')).toHaveTextContent(CONSOLE_ACCESS_JWT_PENDING);
    expect(screen.queryByRole('button')).toBeNull();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledWith({
      clientId: '0xaaa',
      domain: 'https://fleet.example',
    });
  });

  it('asks for an API key when console access is off', async () => {
    show(license(['0x1111111111111111111111111111111111111111']));
    expect(
      await screen.findByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Needs a JWT')).toBeInTheDocument();
    expect(getGlobalAccountDeveloperJwt).not.toHaveBeenCalled();
  });

  it('asks for an API key when the owner has no console key', async () => {
    findConsoleKeyAddress.mockResolvedValue(null);
    show(license([CONSOLE_KEY]));
    expect(await screen.findByRole('button')).toBeInTheDocument();
    expect(getGlobalAccountDeveloperJwt).not.toHaveBeenCalled();
  });

  it('falls back to an API key, and says so, when console access fails', async () => {
    getGlobalAccountDeveloperJwt.mockResolvedValue(false);
    const { onSuccess } = show(license([CONSOLE_KEY]));
    expect(await screen.findByText(CONSOLE_ACCESS_JWT_FAILED)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('reports an error from console access and falls back the same way', async () => {
    getGlobalAccountDeveloperJwt.mockRejectedValue(new Error('Turnkey export failed'));
    show(license([CONSOLE_KEY]));
    expect(await screen.findByText(CONSOLE_ACCESS_JWT_FAILED)).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('makes it once per license, however often the page renders', async () => {
    const lic = license([CONSOLE_KEY]);
    const onSuccess = jest.fn();
    const { rerender, client } = show(lic, onSuccess);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    rerender(
      <QueryClientProvider client={client}>
        <GenerateDevJWTSection
          license={lic}
          onSuccess={onSuccess}
          message="Needs a JWT"
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledTimes(1));
  });
});
