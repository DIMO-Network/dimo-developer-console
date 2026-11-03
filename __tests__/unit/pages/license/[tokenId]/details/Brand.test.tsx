import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

jest.mock('@/actions/brand', () => ({
  fetchMyBrands: jest.fn(),
  deleteMyBrand: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { fetchMyBrands } from '@/actions/brand';
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

describe('Brand', () => {
  beforeEach(() => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(true);
    (getOrCreateLicenseWorkspace as jest.Mock).mockResolvedValue({ id: 'ws-1' });
  });
  afterEach(() => jest.clearAllMocks());

  it('gives a new license its own workspace, named after it', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledWith({
      name: 'Fleet Co',
      token_id: 42,
      client_id: '0xClient',
      owner: '0xOwner',
    });
    expect(fetchMyBrands).toHaveBeenCalledWith('ws-1');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('names the workspace after the token when the license has no alias', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={{ ...mockLicense, alias: null } as never} />);
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
    expect(getOrCreateLicenseWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'License #42' }),
    );
  });

  it('tells an owner when their workspace could not be loaded', async () => {
    (getOrCreateLicenseWorkspace as jest.Mock).mockResolvedValue(null);
    render(<Brand license={mockLicense as never} />);
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
    (getOrCreateLicenseWorkspace as jest.Mock).mockResolvedValue(null);
    render(<Brand license={mockLicense as never} />);
    expect(await screen.findByText('No brand set.')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('never reads a failed load as a license with no brand', async () => {
    (fetchMyBrands as jest.Mock).mockRejectedValue(new Error('console-api is down'));
    render(<Brand license={mockLicense as never} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load brands');
    expect(screen.queryByText('No brand set.')).not.toBeInTheDocument();
    expect(screen.queryByText('Add brand')).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (fetchMyBrands as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<Brand license={mockLicense as never} />);
    expect(screen.getByText('Loading brands…')).toBeInTheDocument();
  });

  it('shows empty state when workspace has no brands', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => expect(screen.getByText('No brand set.')).toBeInTheDocument());
  });

  it('renders a row for each loaded brand', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([
      fleetBrand,
      { ...fleetBrand, id: 'b2', name: 'Consumer App', isDefault: false },
    ]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => expect(screen.getByText('Fleet App')).toBeInTheDocument());
    expect(screen.getByText('Consumer App')).toBeInTheDocument();
  });

  it('shows Add brand button for owner', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => expect(screen.getByText('Add brand')).toBeInTheDocument());
  });

  it('shows BrandForm when Add brand is clicked', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => fireEvent.click(screen.getByText('Add brand')));
    expect(screen.getByPlaceholderText('e.g. Fleet App')).toBeInTheDocument();
  });

  it('shows SDK hint panel when brands exist', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([fleetBrand]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() =>
      expect(
        screen.getByText('Using multiple brands with Login with DIMO'),
      ).toBeInTheDocument(),
    );
  });
});
