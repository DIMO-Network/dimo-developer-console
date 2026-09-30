import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const replace = jest.fn();
let params = new URLSearchParams('');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  usePathname: () => '/vehicles',
  useSearchParams: () => params,
}));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/app/license/vehicles/[clientId]/components/VehicleDetailsTable', () => ({
  VehicleDetailsTable: (props: Record<string, unknown>) => (
    <div data-testid="table">{JSON.stringify(props)}</div>
  ),
}));
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclesView } from '@/app/vehicles/components/VehiclesView';

const lic = (clientId: string, alias: string) =>
  new LocalDeveloperLicense({
    alias,
    clientId,
    redirectURIs: { nodes: [{ uri: 'https://x' }] },
  });

describe('VehiclesView', () => {
  beforeEach(() => {
    replace.mockClear();
    params = new URLSearchParams('');
  });

  it('auto-selects a single license and renders its table with the extra columns', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'Fleet Pulse')],
      loading: false,
    });
    render(<VehiclesView />);
    const props = JSON.parse(screen.getByTestId('table').textContent!);
    expect(props).toMatchObject({
      clientId: '0xaaa',
      showSources: true,
      showLastSeen: true,
    });
    expect(replace).toHaveBeenCalledWith('/vehicles?license=0xaaa', { scroll: false });
  });

  it('reads the license from the URL when there are several', () => {
    params = new URLSearchParams('license=0xbbb');
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'A'), lic('0xbbb', 'B')],
      loading: false,
    });
    render(<VehiclesView />);
    expect(JSON.parse(screen.getByTestId('table').textContent!).clientId).toBe('0xbbb');
  });

  it('passes a numeric search as a token ID and an address as an owner filter', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'A')],
      loading: false,
    });
    render(<VehiclesView />);
    const input = screen.getByPlaceholderText('Search by token ID or owner address');
    fireEvent.change(input, { target: { value: '184223' } });
    expect(JSON.parse(screen.getByTestId('table').textContent!).tokenIdSearch).toBe(
      184223,
    );
    fireEvent.change(input, {
      target: { value: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' },
    });
    expect(JSON.parse(screen.getByTestId('table').textContent!)).toMatchObject({
      owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
      tokenIdSearch: null,
    });
  });

  it('hints when the search is neither a token ID nor an address', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'A')],
      loading: false,
    });
    render(<VehiclesView />);
    const input = screen.getByPlaceholderText('Search by token ID or owner address');
    expect(screen.queryByText('Enter a token ID or a full 0x address.')).toBeNull();
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(
      screen.getByText('Enter a token ID or a full 0x address.'),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '99999999999' } });
    expect(
      screen.getByText('Enter a token ID or a full 0x address.'),
    ).toBeInTheDocument();
  });

  it('explains the empty state when the user has no licenses', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [],
      loading: false,
    });
    render(<VehiclesView />);
    expect(
      screen.getByText('Create a developer license to see the vehicles shared with it.'),
    ).toBeInTheDocument();
  });
});
