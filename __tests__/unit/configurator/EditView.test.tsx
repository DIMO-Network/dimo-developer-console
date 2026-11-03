import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { View } from '@/app/license/[tokenId]/configurator/[id]/components/View/View';

jest.mock('@/gql', () => ({
  gql: (s: unknown) => s,
  useFragment: (_d: unknown, f: unknown) => f,
}));
jest.mock('@apollo/client/react', () => ({
  useQuery: () => ({
    data: { developerLicense: { tokenId: 42, clientId: '0xclient' } },
    loading: false,
    error: undefined,
  }),
}));
jest.mock('@/app/license/[tokenId]/configurator/components/ListView/ListView', () => ({
  DEVELOPER_LICENSE_INFO: {},
}));
jest.mock('@/app/license/[tokenId]/configurator/components/ConfigurationForm', () => ({
  ConfigurationForm: () => {
    const { watch } = useFormContext();
    return <p>{`name: ${watch('configuration_name') ?? ''}`}</p>;
  },
}));
jest.mock('@/actions/configurations', () => ({ updateConfiguration: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <View params={Promise.resolve({ tokenId: '42', id: 'c1' })} />
    </QueryClientProvider>,
  );

describe('configurator edit View', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fills the form from the route', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'c1',
        client_id: '0xclient',
        configuration_name: 'Saved name',
        configuration: JSON.stringify({ component: 'LoginWithDimo' }),
      }),
    });
    renderView();
    expect(await screen.findByText('name: Saved name')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/configurations/c1');
  });

  it('tells the user when the configuration could not be loaded', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    renderView();
    await screen.findByText(/name:/);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Couldn't load this configuration. Reload the page to try again.",
      ),
    );
  });
});
