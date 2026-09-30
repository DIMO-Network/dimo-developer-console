import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { RawDataTab } from '@/app/vehicles/[tokenId]/components/tabs/RawDataTab';
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
const ev = (time: string, type: string, data: unknown) => ({
  header: {
    id: `id-${time}`,
    source: '0xF264',
    producer: graph.devices[0].did,
    subject: graph.vehicle.did,
    time,
    type,
    dataversion: 'default/v1.0',
  },
  data,
});

describe('RawDataTab', () => {
  beforeEach(() => {
    (useSubjectQuery as jest.Mock).mockReturnValue({
      data: {
        data: {
          cloudEvents: [
            ev('2026-09-29T20:47:12Z', 'dimo.status', { signals: [] }),
            ev('2026-09-29T20:46:42Z', 'dimo.fingerprint', 'base64=='),
            ev('2026-09-29T20:46:12Z', 'dimo.status', null),
          ],
        },
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('queries cloud events for the subject DID and lists them with resolved producers', () => {
    render(<RawDataTab subject={graph.devices[0]} ctx={ctx} />);
    const call = (useSubjectQuery as jest.Mock).mock.calls.at(-1)[0];
    expect(call.api).toBe('fetch');
    expect(call.asset).toBe(graph.vehicle.did);
    expect(call.request.variables.did).toBe(graph.devices[0].did);
    expect(call.request.query).toContain('cloudEvents(');
    expect(screen.getByText('3 cloud events')).toBeInTheDocument();
    expect(screen.getAllByText('AutoPi').length).toBeGreaterThan(0);
  });

  it('expands a row to its JSON, including string and null data', () => {
    render(<RawDataTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: /dimo.fingerprint/ }));
    expect(screen.getByText(/"base64=="/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /dimo.status/ })[1]);
    expect(screen.getAllByTestId('json-block').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to the latest-event and index-only queries', () => {
    render(<RawDataTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Latest' }));
    expect((useSubjectQuery as jest.Mock).mock.calls.at(-1)[0].request.query).toContain(
      'latestCloudEvent(',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Index only' }));
    expect((useSubjectQuery as jest.Mock).mock.calls.at(-1)[0].request.query).toContain(
      'indexes(',
    );
  });

  it('applies type and limit filters and pages older with before', () => {
    render(<RawDataTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'dimo.status' } });
    fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    let vars = (useSubjectQuery as jest.Mock).mock.calls.at(-1)[0].request.variables;
    expect(vars.filter).toMatchObject({ type: 'dimo.status' });
    expect(vars.limit).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: 'Load older' }));
    vars = (useSubjectQuery as jest.Mock).mock.calls.at(-1)[0].request.variables;
    expect(vars.filter.before).toBe('2026-09-29T20:46:12Z');
  });

  it('shows the vehicle hint only on the vehicle', () => {
    const { rerender } = render(<RawDataTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByText(/from every device/)).toBeInTheDocument();
    rerender(<RawDataTab subject={graph.devices[0]} ctx={ctx} />);
    expect(screen.queryByText(/from every device/)).not.toBeInTheDocument();
  });
});
