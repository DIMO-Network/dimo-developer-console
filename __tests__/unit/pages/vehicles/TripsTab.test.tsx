import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { TripsTab } from '@/app/vehicles/[tokenId]/components/tabs/TripsTab';
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
const seg = (start: string, end: string | null, ongoing: boolean) => ({
  start: { timestamp: start, value: { latitude: 40.7, longitude: -74, hdop: 1 } },
  end: end
    ? { timestamp: end, value: { latitude: 40.8, longitude: -74.1, hdop: 1 } }
    : null,
  duration: 2580,
  isOngoing: ongoing,
  startedBeforeRange: false,
  signals: [
    { name: 'speed', agg: 'MAX', value: 112 },
    { name: 'powertrainTransmissionTravelledDistance', agg: 'FIRST', value: 48200 },
    { name: 'powertrainTransmissionTravelledDistance', agg: 'LAST', value: 48234.7 },
  ],
  eventCounts: [],
});

const NOW = Date.parse('2026-09-29T20:30:00Z');
const queryCalls = (prefix: string) =>
  (useSubjectQuery as jest.Mock).mock.calls
    .map((c) => c[0])
    .filter((c) => c.request?.query.startsWith(prefix));

afterEach(() => jest.restoreAllMocks());

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      if (q.startsWith('query Segments'))
        return {
          data: {
            data: {
              segments: [
                seg('2026-09-29T20:21:00Z', null, true),
                seg('2026-09-29T17:48:00Z', '2026-09-29T18:31:00Z', false),
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      if (q.startsWith('query DailyActivity'))
        return {
          data: {
            data: {
              dailyActivity: [
                {
                  segmentCount: 3,
                  duration: 4320,
                  signals: [],
                  eventCounts: [],
                },
                {
                  segmentCount: 2,
                  duration: 5160,
                  signals: [],
                  eventCounts: [],
                },
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      return { data: undefined, isLoading: false, error: null };
    },
  );
});

describe('TripsTab', () => {
  it('runs segments and daily activity with the chosen mechanism and range', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText('Detect trips by'), {
      target: { value: 'frequencyAnalysis' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const calls = (useSubjectQuery as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((c) => c.request);
    const segCall = calls
      .filter((c) => c.request.query.startsWith('query Segments'))
      .at(-1);
    const dayCall = calls
      .filter((c) => c.request.query.startsWith('query DailyActivity'))
      .at(-1);
    expect(segCall.request.variables.mechanism).toBe('frequencyAnalysis');
    expect(dayCall.request.variables.mechanism).toBe('frequencyAnalysis');
    expect(segCall.request.variables.config.maxGapSeconds).toBe(300);
    expect(screen.getByText('5 trips · 2 h 38 m driving')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    // Both fixture trips share duration, distance and top speed, so each value renders twice.
    expect(screen.getAllByText('43 min')).toHaveLength(2);
    expect(screen.getAllByText('34.7 km')).toHaveLength(2);
    expect(screen.getAllByText('112 km/h')).toHaveLength(2);
    // Range starts 2026-09-22 (a Tuesday); records are labelled from that UTC day.
    expect(screen.getByText('Tue 22')).toBeInTheDocument();
    expect(screen.getByText('Wed 23')).toBeInTheDocument();
  });

  it('keeps daily activity off the mechanisms it does not support', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText('Detect trips by'), {
      target: { value: 'refuel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    expect(queryCalls('query DailyActivity')).toHaveLength(0);
    expect(screen.queryByText('Daily activity')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Daily activity is available for ignition, frequency and change-point detection.',
      ),
    ).toBeInTheDocument();
  });

  it('exposes the advanced config and passes it through', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced settings' }));
    fireEvent.change(screen.getByLabelText('Max gap (seconds)'), {
      target: { value: '600' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const segCall = (useSubjectQuery as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((c) => c.request?.query.startsWith('query Segments'))
      .at(-1);
    expect(segCall.request.variables.config.maxGapSeconds).toBe(600);
  });

  it('re-resolves a preset range at run time', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    (Date.now as jest.Mock).mockReturnValue(NOW + 3_600_000);
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const segCall = queryCalls('query Segments').at(-1);
    expect(segCall.request.variables.to).toBe(new Date(NOW + 3_600_000).toISOString());
    expect(segCall.request.variables.from).toBe(
      new Date(NOW + 3_600_000 - 7 * 86_400_000).toISOString(),
    );
  });

  it('will not run an invalid or over-31-day range', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    const run = screen.getByRole('button', { name: 'Run query' });
    fireEvent.change(screen.getByLabelText('From (UTC)'), {
      target: { value: '2026-08-01T00:00' },
    });
    expect(run).toBeDisabled();
    expect(screen.getByText('Pick a range of 31 days or less.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('From (UTC)'), {
      target: { value: '2026-09-28T00:00' },
    });
    expect(run).toBeEnabled();
    expect(
      screen.queryByText('Pick a range of 31 days or less.'),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('To (UTC)'), {
      target: { value: '2026-09-27T00:00' },
    });
    expect(run).toBeDisabled();
  });
});
