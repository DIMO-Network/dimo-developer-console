import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { SummaryTab } from '@/app/vehicles/[tokenId]/components/tabs/SummaryTab';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';
import type { SubjectContext } from '@/app/vehicles/[tokenId]/components/SubjectView';
import { LocalDeveloperLicense } from '@/types/webhook';

const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'toyota_rav4_2024', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: {
    tokenId: 48211,
    tokenDID: 'did:erc721:80002:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:48211',
    address: '0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA',
    serial: 's',
    pairedAt: null,
    mintedAt: '2026-04-11T09:00:00Z',
    manufacturer: { name: 'AutoPi' },
  },
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
  freshness: {
    [graph.devices[0].did]: { time: null, type: null, source: null, producer: null },
  },
  onBrowseRaw: jest.fn(),
};

const SUMMARY = {
  numberOfSignals: 1240000,
  availableSignals: ['speed', 'obdDTCList'],
  firstSeen: '2024-03-04T00:00:00Z',
  lastSeen: '2026-09-29T20:47:12Z',
  signalDataSummary: [
    {
      name: 'speed',
      numberOfSignals: 412880,
      firstSeen: '2024-03-04T00:00:00Z',
      lastSeen: '2026-09-29T20:47:12Z',
    },
    {
      name: 'obdDTCList',
      numberOfSignals: 12,
      firstSeen: '2024-04-19T00:00:00Z',
      lastSeen: '2026-09-15T00:00:00Z',
    },
  ],
  eventDataSummary: [
    {
      name: 'harshBraking',
      numberOfEvents: 42,
      firstSeen: '2024-05-02T00:00:00Z',
      lastSeen: '2026-09-27T00:00:00Z',
    },
  ],
};
const TYPES = [
  {
    type: 'dimo.status',
    count: 900000,
    firstSeen: '2024-03-04T00:00:00Z',
    lastSeen: '2026-09-29T20:47:12Z',
  },
];
const LATEST = {
  header: {
    type: 'dimo.status',
    time: '2026-09-29T20:47:12Z',
    dataversion: 'default/v1.0',
    producer: graph.devices[0].did,
  },
  data: { signals: [] },
};

// Route each query to its answer by the operation name in the query text.
const answers = (overrides: Record<string, unknown> = {}) =>
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      const pick = (name: string, data: unknown, errors?: unknown) =>
        q.startsWith(`query ${name}`)
          ? { data: { data, errors }, isLoading: false, error: null }
          : null;
      return (
        pick(
          'DataSummary',
          overrides.DataSummary ?? { dataSummary: SUMMARY },
          overrides.DataSummaryErrors,
        ) ??
        pick('AvailableCloudEventTypes', { availableCloudEventTypes: TYPES }) ??
        pick('LatestCloudEvent', { latestCloudEvent: LATEST }) ?? {
          data: undefined,
          isLoading: false,
          error: null,
        }
      );
    },
  );

describe('SummaryTab', () => {
  it('shows KPIs, the signal breakdown with a From column, events and data types', () => {
    answers();
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getAllByText('Latest payload').length).toBeGreaterThan(0);
    expect(screen.getByText('1.24M')).toBeInTheDocument();
    expect(screen.getAllByText('Mar 4, 2024').length).toBeGreaterThan(0);
    expect(screen.getByText('Speed')).toBeInTheDocument();
    expect(screen.getByText('speed')).toBeInTheDocument();
    expect(screen.getByText('412,880')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Events/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data types/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vehicle details/ })).toBeInTheDocument();
  });

  it('hands off to Raw data for the selected subject', () => {
    answers();
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    screen.getByRole('button', { name: 'Browse cloud events' }).click();
    expect(ctx.onBrowseRaw).toHaveBeenCalledWith(graph.vehicle.did);
  });

  it('shows a field error inline and keeps the rest of the tab', () => {
    answers({
      DataSummary: { dataSummary: null },
      DataSummaryErrors: [{ message: 'needs privilege 1', path: ['dataSummary'] }],
    });
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByText('needs privilege 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data types/ })).toBeInTheDocument();
  });

  it('tells the reader when a device has no resolvable telemetry source', () => {
    answers();
    render(<SummaryTab subject={graph.devices[0]} ctx={ctx} />);
    expect(
      screen.getByText(
        'This device has no cloud events yet, so the signal breakdown covers the whole vehicle.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('From')).not.toBeInTheDocument();
  });
});
