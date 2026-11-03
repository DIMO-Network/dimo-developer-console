import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand/Brand';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));

jest.mock('@/hooks/useIsLicenseOwner', () => ({
  useIsLicenseOwner: jest.fn(),
}));

jest.mock('@/actions/workspace', () => ({
  getOrCreateLicenseWorkspace: jest.fn(),
}));

jest.mock('@/utils/fetchJson', () => ({ fetchJson: jest.fn() }));

jest.mock('@/actions/brand', () => ({
  deleteMyBrand: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { fetchJson } from '@/utils/fetchJson';
import { getOrCreateLicenseWorkspace } from '@/actions/workspace';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';

const mockLicense = {
  alias: 'Fleet Co',
  owner: '0xOwner',
  tokenId: 42,
  clientId: '0xClient',
};

const fleetBrand = {
  id: 'b1',
  name: 'Fleet App',
  isDefault: true,
  logoCid: null,
  iconCid: null,
  logoUrl: null,
  iconUrl: null,
  primaryColor: null,
  updatedAt: null,
};

const WS = { id: 'ws-1', name: 'Fleet Co' };

const routeReturns = (workspace: unknown, brands: unknown[]) =>
  (fetchJson as jest.Mock).mockResolvedValue({ workspace, brands });

const renderBrand = (license: unknown = mockLicense) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Brand license={license as never} />
    </QueryClientProvider>,
  );
};

describe('Brand', () => {
  beforeEach(() => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(true);
    (getOrCreateLicenseWorkspace as jest.Mock).mockResolvedValue(WS);
    routeReturns(WS, []);
  });
  afterEach(() => jest.clearAllMocks());

  it('gives a new license its own workspace, named after it', async () => {
    routeReturns(null, []);
    renderBrand();
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledTimes(1);
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledWith({
      name: 'Fleet Co',
      token_id: 42,
      client_id: '0xClient',
      owner: '0xOwner',
    });
    expect(fetchJson).toHaveBeenCalledWith('/api/licenses/42/brands');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('names the workspace after the token when the license has no alias', async () => {
    routeReturns(null, []);
    renderBrand({ ...mockLicense, alias: null });
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'License #42' }),
    );
  });

  it('tells an owner when their workspace could not be loaded', async () => {
    routeReturns(null, []);
    (getOrCreateLicenseWorkspace as jest.Mock).mockResolvedValue(null);
    renderBrand();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load your workspace',
    );
    expect(toast.error).toHaveBeenCalled();
    expect(screen.queryByText('No brand set.')).not.toBeInTheDocument();
    expect(screen.queryByText('Add brand')).not.toBeInTheDocument();
  });

  // Only the team owner may create a workspace, so a member opening a license
  // nobody has branded gets null. That's an empty tab, not a failure to re-login over.
  it('shows a member an empty tab, without an error, when there is no workspace', async () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    routeReturns(null, []);
    renderBrand();
    expect(await screen.findByText('No brand set.')).toBeInTheDocument();
    expect(getOrCreateLicenseWorkspace).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('never reads a failed load as a license with no brand', async () => {
    (fetchJson as jest.Mock).mockRejectedValue(new Error('console-api is down'));
    renderBrand();
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load brands');
    expect(screen.queryByText('No brand set.')).not.toBeInTheDocument();
    expect(screen.queryByText('Add brand')).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (fetchJson as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderBrand();
    expect(screen.getByText('Loading brands…')).toBeInTheDocument();
  });

  it('shows empty state when workspace has no brands', async () => {
    routeReturns(WS, []);
    renderBrand();
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
  });

  it('renders a row for each loaded brand', async () => {
    routeReturns(WS, [
      fleetBrand,
      { ...fleetBrand, id: 'b2', name: 'Consumer App', isDefault: false },
    ]);
    renderBrand();
    await waitFor(() => expect(screen.getByText('Fleet App')).toBeInTheDocument());
    expect(screen.getByText('Consumer App')).toBeInTheDocument();
  });

  it('shows Add brand button for owner', async () => {
    routeReturns(WS, []);
    renderBrand();
    await waitFor(() => expect(screen.getByText('Add brand')).toBeInTheDocument());
  });

  it('shows BrandForm when Add brand is clicked', async () => {
    routeReturns(WS, []);
    renderBrand();
    await waitFor(() => fireEvent.click(screen.getByText('Add brand')));
    expect(screen.getByPlaceholderText('e.g. Fleet App')).toBeInTheDocument();
  });

  it('shows SDK hint panel when brands exist', async () => {
    routeReturns(WS, [fleetBrand]);
    renderBrand();
    await waitFor(() =>
      expect(
        screen.getByText('Using multiple brands with Login with DIMO'),
      ).toBeInTheDocument(),
    );
  });

  it('shows a member an unbranded license without creating a workspace', async () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    routeReturns(null, []);
    renderBrand();
    expect(await screen.findByText('No brand set.')).toBeInTheDocument();
    expect(getOrCreateLicenseWorkspace).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('creates the workspace once for the owner when there is none', async () => {
    routeReturns(null, []);
    renderBrand();
    expect(await screen.findByText('Add brand')).toBeInTheDocument();
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledTimes(1);
  });

  it('lists the brands from the route', async () => {
    routeReturns(WS, [
      fleetBrand,
      { ...fleetBrand, id: 'b2', name: 'Consumer App', isDefault: false },
    ]);
    renderBrand();
    expect(await screen.findByText('Fleet App')).toBeInTheDocument();
    expect(screen.getByText('Consumer App')).toBeInTheDocument();
    expect(getOrCreateLicenseWorkspace).not.toHaveBeenCalled();
  });
});
