import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/subjects/client', () => ({
  ...jest.requireActual('@/services/subjects/client'),
  postSubjectQuery: jest.fn(),
}));
import { postSubjectQuery } from '@/services/subjects/client';
import { useDataSummary } from '@/hooks/subjects/useDataSummary';
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
const device = graph.devices[0];
const SOURCE = '0x1111111111111111111111111111111111111111';

const summary = (names: string[]) => ({
  numberOfSignals: 1,
  availableSignals: names,
  firstSeen: '2024-03-04T00:00:00Z',
  lastSeen: '2026-09-29T20:47:12Z',
  signalDataSummary: names.map((name) => ({
    name,
    numberOfSignals: 1,
    firstSeen: '2024-03-04T00:00:00Z',
    lastSeen: '2026-09-29T20:47:12Z',
  })),
  eventDataSummary: [],
});

const ctxWith = (freshness: SubjectContext['freshness']): SubjectContext => ({
  clientId: '0xaaa',
  license: new LocalDeveloperLicense({
    alias: 'A',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
  }),
  graph,
  chainId: 80002,
  freshness,
  onBrowseRaw: jest.fn(),
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  (postSubjectQuery as jest.Mock)
    .mockReset()
    .mockImplementation(async (_api, { request }) => ({
      data: {
        dataSummary: request.variables.filter?.source
          ? summary(['speed'])
          : summary(['speed', 'obdDTCList']),
      },
    }));
});

describe('useDataSummary', () => {
  it('survives freshness arriving late and attributes signals to their device', async () => {
    const { result, rerender } = renderHook(
      ({ ctx }: { ctx: SubjectContext }) => useDataSummary(graph.vehicle, ctx),
      { wrapper, initialProps: { ctx: ctxWith({}) } },
    );
    expect(result.current.fromBySignal).toEqual({});
    rerender({
      ctx: ctxWith({
        [device.did]: { time: null, type: null, source: SOURCE, producer: null },
      }),
    });
    await waitFor(() => expect(result.current.fromBySignal.speed).toEqual(['AutoPi']));
    expect(result.current.fromBySignal.obdDTCList).toBeUndefined();
  });

  it('makes no per-device requests for a device subject', async () => {
    const ctx = ctxWith({
      [device.did]: { time: null, type: null, source: SOURCE, producer: null },
    });
    const { result } = renderHook(() => useDataSummary(device, ctx), { wrapper });
    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(postSubjectQuery).toHaveBeenCalledTimes(1);
    expect(result.current.fromBySignal).toEqual({});
  });
});
