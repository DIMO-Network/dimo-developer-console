import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
    const { watch, register } = useFormContext();
    return (
      <>
        <p>{`name: ${watch('configuration_name') ?? ''}`}</p>
        <input aria-label="name" {...register('configuration_name')} />
      </>
    );
  },
}));
jest.mock('@/actions/configurations', () => ({ updateConfiguration: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderView = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <View params={Promise.resolve({ tokenId: '42', id: 'c1' })} />
    </QueryClientProvider>,
  );

describe('configurator edit View', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

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

  it('shows a loader, not empty defaults, until the saved values arrive', async () => {
    let resolve!: (r: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(new Promise((r) => (resolve = r)));
    const { container } = renderView();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container.querySelector('.loader')).not.toBeNull();
    expect(screen.queryByLabelText('name')).toBeNull();
    resolve({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'c1',
        client_id: '0xclient',
        configuration_name: 'Saved name',
        configuration: JSON.stringify({ component: 'LoginWithDimo' }),
      }),
    });
    expect(await screen.findByLabelText('name')).toHaveValue('Saved name');
    expect(container.querySelector('.loader')).toBeNull();
  });

  it("says when the configuration can't be loaded", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    renderView();
    expect(
      await screen.findByText(
        "Couldn't load this configuration. Reload the page to try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('name')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't load this configuration. Reload the page to try again.",
    );
  });

  it("never overwrites the user's edits when the same configuration is refreshed", async () => {
    const body = (name: string) => ({
      id: 'c1',
      client_id: '0xclient',
      configuration_name: name,
      configuration: JSON.stringify({ component: 'LoginWithDimo' }),
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => body('Saved name'),
    });
    renderView();
    await screen.findByText('name: Saved name');
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'My edit' } });
    await screen.findByText('name: My edit');
    act(() => {
      queryClient.setQueryData(['configuration', 'c1'], body('Newer from server'));
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('name: My edit')).toBeInTheDocument();
    expect(screen.getByLabelText('name')).toHaveValue('My edit');
  });

  it('loads fresh values on every visit', async () => {
    const reply = (name: string) => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'c1',
        client_id: '0xclient',
        configuration_name: name,
        configuration: JSON.stringify({ component: 'LoginWithDimo' }),
      }),
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(reply('Before save'))
      .mockResolvedValueOnce(reply('After save'));
    const first = renderView();
    await screen.findByText('name: Before save');
    first.unmount();
    renderView();
    await screen.findByText('name: After save');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
