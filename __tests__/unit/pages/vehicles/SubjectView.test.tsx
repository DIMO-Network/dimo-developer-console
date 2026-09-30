import React from 'react';
import { render } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({
  ...jest.requireActual('@/hooks/subjects/useSubjectQuery'),
  useSubjectQuery: jest.fn(),
}));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
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
  it('re-queries for the new subject when the subject changes', () => {
    (useSubjectQuery as jest.Mock).mockReturnValue({
      data: { data: { cloudEvents: [] } },
      isLoading: false,
      error: null,
    });
    const { rerender } = render(
      <SubjectView subject={graph.vehicle} tab="raw" ctx={ctx} />,
    );
    rerender(<SubjectView subject={graph.devices[0]} tab="raw" ctx={ctx} />);
    const call = (useSubjectQuery as jest.Mock).mock.calls.at(-1)[0];
    expect(call.request.variables.did).toBe(graph.devices[0].did);
  });
});
