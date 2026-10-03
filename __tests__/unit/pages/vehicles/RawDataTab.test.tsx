import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/subjects/client', () => ({
  ...jest.requireActual('@/services/subjects/client'),
  postSubjectQuery: jest.fn(),
}));
import { postSubjectQuery } from '@/services/subjects/client';
jest.mock('file-saver', () => ({ saveAs: jest.fn() }));
import { saveAs } from 'file-saver';
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

const FIRST_PAGE = [
  ev('2026-09-29T20:47:12Z', 'dimo.status', { signals: [] }),
  ev('2026-09-29T20:46:42Z', 'dimo.fingerprint', 'base64=='),
  ev('2026-09-29T20:46:12Z', 'dimo.status', null),
];
let olderPage: unknown[] = [];

const opName = (q: string) => /query (\w+)/.exec(q)?.[1];
// Answers by operation name; the older page is whatever `olderPage` holds.
const answer = async (
  _api: string,
  input: { request: { query: string; variables: { filter: { before?: string } } } },
) => {
  const { query, variables } = input.request;
  switch (opName(query)) {
    case 'AvailableCloudEventTypes':
      return {
        data: {
          availableCloudEventTypes: [
            { type: 'dimo.status', count: 3, firstSeen: '', lastSeen: '' },
            { type: 'dimo.custom', count: 1, firstSeen: '', lastSeen: '' },
          ],
        },
      };
    case 'CloudEvents': {
      const isOlder = variables.filter.before?.endsWith('.001Z') ?? false;
      return { data: { cloudEvents: isOlder ? olderPage : FIRST_PAGE } };
    }
    case 'LatestCloudEvent':
      return { data: { latestCloudEvent: FIRST_PAGE[0] } };
    case 'Indexes':
      return { data: { indexes: FIRST_PAGE } };
  }
  return { data: null };
};
const calls = (op: string) =>
  (postSubjectQuery as jest.Mock).mock.calls
    .map((c) => c[1].request)
    .filter((r) => opName(r.query) === op);

const renderTab = (subject = graph.vehicle) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (s: typeof subject) => (
    <QueryClientProvider client={client}>
      <RawDataTab subject={s} ctx={ctx} />
    </QueryClientProvider>
  );
  const utils = render(ui(subject));
  return { ...utils, rerenderWith: (s: typeof subject) => utils.rerender(ui(s)) };
};

describe('RawDataTab', () => {
  beforeEach(() => {
    olderPage = [];
    (postSubjectQuery as jest.Mock).mockReset().mockImplementation(answer);
    (saveAs as unknown as jest.Mock).mockReset();
  });

  it('queries a device through the vehicle DID filtered by producer and resolves producers', async () => {
    renderTab(graph.devices[0]);
    expect(await screen.findByText('3 cloud events')).toBeInTheDocument();
    const [api, input] = (postSubjectQuery as jest.Mock).mock.calls.find(
      (c) => opName(c[1].request.query) === 'CloudEvents',
    );
    expect(api).toBe('fetch');
    expect(input.asset).toBe(graph.vehicle.did);
    expect(input.request.variables.did).toBe(graph.vehicle.did);
    expect(input.request.variables.filter.producer).toBe(graph.devices[0].did);
    expect(input.request.query).toContain('cloudEvents(');
    expect(calls('AvailableCloudEventTypes')[0].variables).toEqual({
      did: graph.vehicle.did,
      filter: { producer: graph.devices[0].did },
    });
    expect(screen.getAllByText('AutoPi').length).toBeGreaterThan(0);
  });

  it('locks the producer filter on a device, whatever More filters says', async () => {
    renderTab(graph.devices[0]);
    await screen.findByText('3 cloud events');
    expect(screen.getByText('Producer: AutoPi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
    expect(screen.queryByLabelText('Producer')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Latest' }));
    await waitFor(() => expect(calls('LatestCloudEvent').length).toBe(1));
    expect(calls('LatestCloudEvent')[0].variables).toMatchObject({
      did: graph.vehicle.did,
      filter: { producer: graph.devices[0].did },
    });
  });

  it('leaves the producer open on the vehicle', async () => {
    renderTab(graph.vehicle);
    await screen.findByText('3 cloud events');
    expect(screen.queryByText(/^Producer: /)).not.toBeInTheDocument();
    expect(calls('CloudEvents')[0].variables.filter.producer).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'More filters' }));
    fireEvent.change(screen.getByLabelText('Producer'), {
      target: { value: graph.devices[0].did },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
    expect(calls('CloudEvents')[1].variables.filter.producer).toBe(graph.devices[0].did);
  });

  it('pages older events on a device with the producer still applied', async () => {
    olderPage = [ev('2026-09-29T20:45:42Z', 'dimo.event', 'older')];
    renderTab(graph.devices[0]);
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Load older' }));
    expect(await screen.findByText('4 cloud events')).toBeInTheDocument();
    expect(calls('CloudEvents')[1].variables.filter).toMatchObject({
      before: '2026-09-29T20:46:12.001Z',
      producer: graph.devices[0].did,
    });
  });

  it('switches a device to its own status events, filed under the device DID', async () => {
    const device = graph.devices[0];
    renderTab(device);
    await screen.findByText('3 cloud events');
    expect(screen.getByRole('radio', { name: 'Vehicle data' })).toBeChecked();
    fireEvent.change(screen.getByLabelText('Data version'), {
      target: { value: 'r/v0/dev' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Device status' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
    expect(screen.getByRole('radio', { name: 'Device status' })).toBeChecked();
    // subject = producer = device: the device DID, no producer filter, still
    // authorised by the vehicle's token.
    const [, input] = (postSubjectQuery as jest.Mock).mock.calls
      .filter((c) => opName(c[1].request.query) === 'CloudEvents')
      .at(-1);
    expect(input.asset).toBe(graph.vehicle.did);
    expect(input.request.variables.did).toBe(device.did);
    expect(input.request.variables.filter.producer).toBeUndefined();
    expect(input.request.variables.filter.dataversion).toBe('r/v0/dev');
    await waitFor(() =>
      expect(calls('AvailableCloudEventTypes').at(-1).variables).toEqual({
        did: device.did,
        filter: null,
      }),
    );
    expect(screen.queryByText(/^Producer: /)).not.toBeInTheDocument();
    expect(screen.getByText(/filed under the device itself/)).toBeInTheDocument();
  });

  it('pages older device status on the device DID', async () => {
    olderPage = [ev('2026-09-29T20:45:42Z', 'dimo.status', 'older')];
    renderTab(graph.devices[0]);
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('radio', { name: 'Device status' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Load older' }));
    expect(await screen.findByText('4 cloud events')).toBeInTheDocument();
    const older = calls('CloudEvents').at(-1).variables;
    expect(older.did).toBe(graph.devices[0].did);
    expect(older.filter.before).toBe('2026-09-29T20:46:12.001Z');
    expect(older.filter.producer).toBeUndefined();
  });

  it('offers device status only where the subject files its own events', async () => {
    const { rerenderWith } = renderTab(graph.vehicle);
    await screen.findByText('3 cloud events');
    expect(
      screen.queryByRole('radio', { name: 'Device status' }),
    ).not.toBeInTheDocument();
    rerenderWith(graph.account);
    expect(
      screen.queryByRole('radio', { name: 'Device status' }),
    ).not.toBeInTheDocument();
  });

  it('never applies a leftover device scope to a subject without its own DID', async () => {
    const device = graph.devices[0];
    const { rerenderWith } = renderTab(device);
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('radio', { name: 'Device status' }));
    await screen.findByText(/filed under the device itself/);
    rerenderWith({ ...device, ownFetchDid: undefined });
    expect(screen.queryByText(/filed under the device itself/)).not.toBeInTheDocument();
    expect(screen.getByText('Producer: AutoPi')).toBeInTheDocument();
  });

  it('names a device status download apart from the vehicle data one', async () => {
    renderTab(graph.devices[0]);
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Device status' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
    expect((saveAs as unknown as jest.Mock).mock.calls.map((c) => c[1])).toEqual([
      'autopi-cloud-events.json',
      'autopi-device-status.json',
    ]);
  });

  it('expands a row to its JSON, including string and null data', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: /dimo.fingerprint/ }));
    expect(screen.getByText(/"base64=="/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /dimo.status/ })[1]);
    // The null-data row renders its own JSON (its id appears only in that block).
    expect(screen.getByText(/id-2026-09-29T20:46:12Z/)).toBeInTheDocument();
    expect(screen.getAllByTestId('json-block').length).toBeGreaterThanOrEqual(1);
  });

  it('switches to the latest-event and index-only queries', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('radio', { name: 'Latest' }));
    await waitFor(() => expect(calls('LatestCloudEvent').length).toBe(1));
    expect(calls('LatestCloudEvent')[0].query).toContain('latestCloudEvent(');
    fireEvent.click(screen.getByRole('radio', { name: 'Index only' }));
    await waitFor(() => expect(calls('Indexes').length).toBe(1));
    expect(calls('Indexes')[0].query).toContain('indexes(');
  });

  it('applies type and limit filters', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'dimo.status' } });
    fireEvent.change(screen.getByLabelText('Limit'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
    const vars = calls('CloudEvents')[1].variables;
    expect(vars.filter).toMatchObject({ type: 'dimo.status' });
    expect(vars.limit).toBe(5);
  });

  it('draws its filters as Fleet text fields', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    for (const label of ['Type', 'Data version', 'Limit']) {
      expect(screen.getByLabelText(label).closest('.text-field')).not.toBeNull();
    }
    expect(screen.getByLabelText('Type')).toHaveAttribute('list', 'cloud-event-types');
  });

  it('does not issue a request while typing until Run query', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    const before = (postSubjectQuery as jest.Mock).mock.calls.length;
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'dimo.st' } });
    expect((postSubjectQuery as jest.Mock).mock.calls.length).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
  });

  it('suggests the subject own event types', async () => {
    const { container } = renderTab();
    await waitFor(() =>
      expect(
        container.querySelector('#cloud-event-types option[value="dimo.custom"]'),
      ).not.toBeNull(),
    );
  });

  it('loads older events by appending, without duplicating the boundary row', async () => {
    olderPage = [FIRST_PAGE[2], ev('2026-09-29T20:45:42Z', 'dimo.event', 'older')];
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Load older' }));
    expect(await screen.findByText('4 cloud events')).toBeInTheDocument();
    const older = calls('CloudEvents')[1].variables;
    expect(older.filter.before).toBe('2026-09-29T20:46:12.001Z');
    expect(screen.getAllByRole('button', { name: /dimo.status/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /dimo.event/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dimo.fingerprint/ })).toBeInTheDocument();
  });

  it('says there are no older events after an empty older page', async () => {
    olderPage = [];
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('button', { name: 'Load older' }));
    expect(await screen.findByText('No older events.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older' })).not.toBeInTheDocument();
  });

  it('re-resolves preset ranges to the current time on Run query', async () => {
    jest.useFakeTimers({
      now: Date.parse('2026-09-29T10:00:00Z'),
      doNotFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'setImmediate',
        'clearImmediate',
        'nextTick',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
      ],
    });
    try {
      renderTab();
      await screen.findByText('3 cloud events');
      expect(calls('CloudEvents')[0].variables.filter.before).toBe(
        '2026-09-29T10:00:00.000Z',
      );
      jest.setSystemTime(Date.parse('2026-09-29T12:00:00Z'));
      fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
      await waitFor(() => expect(calls('CloudEvents').length).toBe(2));
      expect(calls('CloudEvents')[1].variables.filter.before).toBe(
        '2026-09-29T12:00:00.000Z',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('disables Run query and Load older for an inverted custom range', async () => {
    renderTab();
    await screen.findByText('3 cloud events');
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('From (UTC)'), {
      target: { value: '2099-01-01T00:00' },
    });
    expect(screen.getByText('Start must be before end.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run query' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Load older' })).toBeDisabled();
  });

  it('shows a refused field instead of the no-match copy', async () => {
    (postSubjectQuery as jest.Mock).mockImplementation(async (api, input) =>
      opName(input.request.query) === 'CloudEvents'
        ? {
            data: { cloudEvents: null },
            errors: [{ message: 'needs raw data', path: ['cloudEvents'] }],
          }
        : answer(api, input),
    );
    renderTab();
    expect(await screen.findByText('needs raw data')).toBeInTheDocument();
    expect(
      screen.queryByText('No events match. Widen the range or clear a filter.'),
    ).not.toBeInTheDocument();
  });

  it('shows the vehicle hint only on the vehicle', async () => {
    const { rerenderWith } = renderTab(graph.vehicle);
    expect(screen.getByText(/from every device/)).toBeInTheDocument();
    // Device status never reaches the vehicle DID, so the hint points to it.
    expect(screen.getByText(/Device status/)).toBeInTheDocument();
    rerenderWith(graph.devices[0]);
    expect(screen.queryByText(/from every device/)).not.toBeInTheDocument();
    await screen.findByText('3 cloud events');
  });
});
