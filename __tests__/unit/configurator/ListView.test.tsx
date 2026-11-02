import { act, render, screen } from '@testing-library/react';

const mockQuery = jest.fn();
jest.mock('@apollo/client/react', () => ({ useQuery: () => mockQuery() }));
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ isOwner: true, ownerAddress: '0xABC' }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@/app/license/[tokenId]/configurator/components/ConfigurationForm', () => ({
  USER_CONFIG_FRAGMENT: 'fragment',
}));
jest.mock('@/app/license/[tokenId]/configurator/components/ConfigurationList', () => ({
  ConfigurationList: ({ owner }: { owner?: string }) => <p>{`list for ${owner}`}</p>,
}));
import { ListView } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';

const open = async (owner: string) => {
  mockQuery.mockReturnValue({
    data: { developerLicense: { clientId: '0xclient', owner } },
    loading: false,
  });
  await act(async () => {
    render(<ListView params={Promise.resolve({ tokenId: '42' })} />);
  });
};

describe('ListView', () => {
  it("passes the license's owner down and offers New configuration to them", async () => {
    await open('0xabc');
    expect(screen.getByText('list for 0xabc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New configuration' })).toBeInTheDocument();
  });

  it('offers no New configuration on a license another wallet owns', async () => {
    await open('0xother');
    expect(screen.queryByRole('button', { name: 'New configuration' })).toBeNull();
  });
});
