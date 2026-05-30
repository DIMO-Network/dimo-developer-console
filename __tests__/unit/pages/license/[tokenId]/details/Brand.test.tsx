import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand/Brand';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));

jest.mock('@/hooks/useIsLicenseOwner', () => ({
  useIsLicenseOwner: () => true,
}));

jest.mock('@/actions/workspace', () => ({
  getWorkspace: jest.fn().mockResolvedValue({ id: 'ws-1' }),
  getWorkspaceByTokenId: jest.fn().mockResolvedValue({ id: 'ws-1' }),
}));

jest.mock('@/actions/brand', () => ({
  fetchMyBrands: jest.fn(),
  deleteMyBrand: jest.fn().mockResolvedValue(undefined),
}));

import { fetchMyBrands } from '@/actions/brand';

const mockLicense = { owner: '0xOwner', tokenId: 42, clientId: '0xClient' };

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
  afterEach(() => jest.clearAllMocks());

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

  it('shows Add Brand button for owner', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => expect(screen.getByText('Add Brand')).toBeInTheDocument());
  });

  it('shows BrandForm when Add Brand is clicked', async () => {
    (fetchMyBrands as jest.Mock).mockResolvedValue([]);
    render(<Brand license={mockLicense as never} />);
    await waitFor(() => fireEvent.click(screen.getByText('Add Brand')));
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
