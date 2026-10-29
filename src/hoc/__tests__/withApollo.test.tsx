import { act, render, screen } from '@testing-library/react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { withApollo } from '@/hoc/withApollo';

const PROBE = gql`
  query Probe {
    probe
  }
`;

const loadingStates: boolean[] = [];
let refetchProbe: () => Promise<unknown>;

const Probe = () => {
  const { data, loading, refetch } = useQuery<{ probe: string }>(PROBE);
  loadingStates.push(loading);
  refetchProbe = refetch;
  return <p>{data?.probe ?? 'none'}</p>;
};

const ProbeWithApollo = withApollo(Probe);

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify({ data: { probe: 'ok' } }),
  }) as unknown as typeof fetch;
});

it('keeps loading false while a query refetches, so pages stay mounted', async () => {
  render(<ProbeWithApollo />);
  await screen.findByText('ok');

  loadingStates.length = 0;
  await act(async () => {
    await refetchProbe();
  });

  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(loadingStates).not.toContain(true);
  expect(screen.getByText('ok')).toBeInTheDocument();
});
