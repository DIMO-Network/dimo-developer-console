import { act, render, screen } from '@testing-library/react';

const mockQuery = jest.fn();
const mockIsOwner = jest.fn();
jest.mock('@apollo/client/react', () => ({ useQuery: () => mockQuery() }));
jest.mock('@/hooks/useIsLicenseOwner', () => ({
  useIsLicenseOwner: () => mockIsOwner(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@/components/LicenseCard', () => ({
  DEVELOPER_LICENSE_SUMMARY_FRAGMENT: 'fragment',
}));
jest.mock('@/components/WorkspaceNameModal', () => ({ WorkspaceNameModal: () => null }));
jest.mock('@/components/CopyableRow', () => ({ CopyableRow: () => null }));
jest.mock('@/app/license/[tokenId]/details/components/Signers', () => ({
  Signers: () => null,
}));
jest.mock('@/app/license/[tokenId]/details/components/RedirectUris', () => ({
  RedirectUris: () => null,
}));
jest.mock('@/app/license/[tokenId]/details/components/Vehicles/Vehicles', () => ({
  Vehicles: () => null,
  GET_VEHICLE_COUNT_BY_CLIENT_ID: 'query',
}));
jest.mock('@/app/license/[tokenId]/details/components/DeveloperJwts', () => ({
  DeveloperJwts: () => null,
}));
jest.mock('@/app/license/[tokenId]/details/components/Brand', () => ({
  Brand: () => null,
}));
jest.mock('@/app/license/[tokenId]/details/components/Usage/Usage', () => ({
  Usage: () => null,
}));
import { View } from '@/app/license/[tokenId]/details/components/View/View';

const open = async () => {
  mockQuery.mockReturnValue({
    data: {
      vehicles: { totalCount: 0 },
      developerLicense: {
        tokenId: 42,
        clientId: '0xclient',
        owner: '0x1',
        alias: 'Fleet',
      },
    },
    loading: false,
  });
  await act(async () => {
    render(<View params={Promise.resolve({ tokenId: '42' })} />);
  });
};

describe('License details', () => {
  it('gives the license owner the quick actions', async () => {
    mockIsOwner.mockReturnValue(true);
    await open();
    expect(screen.getByText(/Configure branding/)).toBeInTheDocument();
  });

  it('leaves anyone else without them', async () => {
    mockIsOwner.mockReturnValue(false);
    await open();
    expect(screen.queryByText(/Configure branding/)).toBeNull();
  });
});
