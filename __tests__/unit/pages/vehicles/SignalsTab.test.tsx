import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
jest.mock('@/app/vehicles/[tokenId]/components/tabs/SignalChart', () => ({
  SignalChart: ({ name, points }: { name: string; points: unknown[] }) => (
    <div data-testid={`chart-${name}`}>{points.length} points</div>
  ),
}));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { SignalsTab } from '@/app/vehicles/[tokenId]/components/tabs/SignalsTab';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';
import type { SubjectContext } from '@/app/vehicles/[tokenId]/components/SubjectView';
import { LocalDeveloperLicense } from '@/types/webhook';

const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'x', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: { nodes: [] },
  privileges: { nodes: [] },
} as unknown as VehicleDetail;
const graph = buildVehicleGraph(vehicle, 80002);
const ctx: SubjectContext = {
  clientId: '0xaaa',
  license: new LocalDeveloperLicense({
    alias: 'A',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
  }),
  graph,
  chainId: 80002,
  freshness: {},
  onBrowseRaw: jest.fn(),
};
const SERIES = [
  {
    timestamp: '2026-09-29T18:00:00Z',
    speed: 42.5,
    powertrainCombustionEngineSpeed: 1800,
  },
  {
    timestamp: '2026-09-29T19:00:00Z',
    speed: null,
    powertrainCombustionEngineSpeed: null,
  },
];

beforeEach(() => {
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      if (q.startsWith('query AvailableSignals'))
        return {
          data: {
            data: {
              availableSignals: [
                'speed',
                'powertrainCombustionEngineSpeed',
                'currentLocationCoordinates',
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      if (q.startsWith('query Signals('))
        return { data: { data: { signals: SERIES } }, isLoading: false, error: null };
      if (q.startsWith('query SignalsLatest'))
        return {
          data: {
            data: {
              signalsLatest: {
                lastSeen: '2026-09-29T20:47:00Z',
                speed: { timestamp: '2026-09-29T20:47:00Z', value: 42 },
              },
            },
          },
          isLoading: false,
          error: null,
        };
      return { data: undefined, isLoading: false, error: null };
    },
  );
});

describe('SignalsTab', () => {
  it("offers the subject's available signals (locations excluded) and runs an aggregated query", async () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add signal' }));
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Speed'));
    fireEvent.click(screen.getByLabelText('Engine speed'));
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const call = (useSubjectQuery as jest.Mock).mock.calls
      .filter((c) => c[0].request?.query.startsWith('query Signals('))
      .at(-1)[0];
    expect(call.api).toBe('telemetry');
    expect(call.request.query).toContain('speed(agg: AVG)');
    expect(call.request.query).toContain('powertrainCombustionEngineSpeed(agg: AVG)');
    expect(call.request.variables.interval).toBe('1h');
    expect(await screen.findByTestId('chart-speed')).toHaveTextContent('2 points');
    expect(
      await screen.findByTestId('chart-powertrainCombustionEngineSpeed'),
    ).toBeInTheDocument();
  });

  it('will not run without a signal', () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByRole('button', { name: 'Run query' })).toBeDisabled();
  });

  it('switches to JSON and shows latest values', () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add signal' }));
    fireEvent.click(screen.getByLabelText('Speed'));
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    fireEvent.click(screen.getByRole('radio', { name: 'JSON' }));
    expect(screen.getByTestId('json-block')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Latest values' }));
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('re-resolves a preset range on each run so it never goes stale', () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(Date.parse('2026-09-29T20:00:00Z'));
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add signal' }));
    fireEvent.click(screen.getByLabelText('Speed'));
    now.mockReturnValue(Date.parse('2026-09-30T20:00:00Z'));
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const call = (useSubjectQuery as jest.Mock).mock.calls
      .filter((c) => c[0].request?.query.startsWith('query Signals('))
      .at(-1)[0];
    expect(call.request.variables.to).toBe('2026-09-30T20:00:00.000Z');
    now.mockRestore();
  });
});
