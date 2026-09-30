import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/subjects/client', () => ({
  ...jest.requireActual('@/services/subjects/client'),
  postSubjectQuery: jest.fn(),
}));
import { postSubjectQuery, DataApiError } from '@/services/subjects/client';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';

const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'x', make: 'Toyota', model: 'RAV4', year: 2024 },
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
const header = (time: string) => ({
  header: { time, type: 'dimo.status', source: '0xF264', producer: device.did },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(() => (postSubjectQuery as jest.Mock).mockReset());

describe('useSubjectFreshness', () => {
  it('asks Fetch for each device through the vehicle DID, filtered by producer', async () => {
    (postSubjectQuery as jest.Mock).mockResolvedValue({
      data: { s0: header('2026-09-29T20:47:00Z'), s1: header('2026-09-29T17:00:00Z') },
    });
    const { result } = renderHook(
      () => useSubjectFreshness({ graph, clientId: '0xaaa' }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.byDid[device.did].time).toBe('2026-09-29T17:00:00Z'),
    );
    expect(postSubjectQuery).toHaveBeenCalledTimes(1);
    const [api, input] = (postSubjectQuery as jest.Mock).mock.calls[0];
    expect(api).toBe('fetch');
    expect(input.asset).toBe(graph.vehicle.did);
    expect(input.request.variables).toEqual({
      d0: graph.vehicle.did,
      f0: null,
      d1: graph.vehicle.did,
      f1: { producer: device.did },
    });
    // Keyed by the subject's own DID, not the DID Fetch was asked for.
    expect(result.current.byDid[graph.vehicle.did].time).toBe('2026-09-29T20:47:00Z');
    expect(result.current.error).toBeNull();
    expect(result.current.errorByDid[device.did]).toBeNull();
  });

  it('exposes a failed request as an error on every subject', async () => {
    (postSubjectQuery as jest.Mock).mockRejectedValue(
      new DataApiError(403, 'NOT_SHARED', 'not shared'),
    );
    const { result } = renderHook(
      () => useSubjectFreshness({ graph, clientId: '0xaaa' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.error?.code).toBe('NOT_SHARED'));
    expect(result.current.errorByDid[graph.vehicle.did]).toBe('not shared');
    expect(result.current.errorByDid[device.did]).toBe('not shared');
  });

  it('marks only the subject whose alias failed', async () => {
    (postSubjectQuery as jest.Mock).mockResolvedValue({
      data: { s0: header('2026-09-29T20:47:00Z'), s1: null },
      errors: [{ message: 'needs privilege', path: ['s1'] }],
    });
    const { result } = renderHook(
      () => useSubjectFreshness({ graph, clientId: '0xaaa' }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.errorByDid[device.did]).toBe('needs privilege'),
    );
    expect(result.current.errorByDid[graph.vehicle.did]).toBeNull();
  });
});
