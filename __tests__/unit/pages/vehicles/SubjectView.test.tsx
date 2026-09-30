import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/subjects/client', () => ({
  ...jest.requireActual('@/services/subjects/client'),
  postSubjectQuery: jest.fn(),
}));
import { postSubjectQuery } from '@/services/subjects/client';
import {
  SubjectView,
  type SubjectContext,
} from '@/app/vehicles/[tokenId]/components/SubjectView';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';
import { LocalDeveloperLicense } from '@/types/webhook';

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

describe('SubjectView', () => {
  it('re-queries for the new subject when the subject changes', async () => {
    (postSubjectQuery as jest.Mock).mockResolvedValue({
      data: { cloudEvents: [] },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = (subject: typeof graph.vehicle) => (
      <QueryClientProvider client={client}>
        <SubjectView subject={subject} tab="raw" ctx={ctx} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(graph.vehicle));
    rerender(ui(graph.devices[0]));
    await waitFor(() => {
      const dids = (postSubjectQuery as jest.Mock).mock.calls
        .map((c) => c[1].request)
        .filter((r) => /query CloudEvents/.test(r.query))
        .map((r) => r.variables.did);
      expect(dids.at(-1)).toBe(graph.devices[0].did);
    });
  });
});
