import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { DataApiError } from '@/services/subjects/client';
import { DocumentsTab } from '@/app/vehicles/[tokenId]/components/tabs/DocumentsTab';
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
    alias: 'Fleet Pulse',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'https://app.example.com/cb' }] },
  }),
  graph,
  chainId: 80002,
  freshness: {},
  onBrowseRaw: jest.fn(),
};
const TYPES = [
  {
    type: 'dimo.document.driver.license',
    count: 2,
    firstSeen: '2026-08-02T14:02:11Z',
    lastSeen: '2026-08-02T14:02:11Z',
  },
  {
    type: 'dimo.raw.driver.license',
    count: 1,
    firstSeen: '2026-08-02T14:02:09Z',
    lastSeen: '2026-08-02T14:02:09Z',
  },
  {
    type: 'dimo.document.driver.insurance',
    count: 1,
    firstSeen: '2026-08-02T14:03:40Z',
    lastSeen: '2026-08-02T14:03:40Z',
  },
];
const answer = (typesResult: unknown) =>
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({
      request,
    }: {
      request: { query: string; variables: Record<string, unknown> } | null;
    }) => {
      const q = request?.query ?? '';
      if (q.startsWith('query AvailableCloudEventTypes')) return typesResult;
      if (q.startsWith('query LatestCloudEvent')) {
        const type = (request!.variables.filter as { type: string }).type;
        return {
          data: {
            data: {
              latestCloudEvent: {
                header: { type, time: '2026-08-02T14:02:11Z' },
                data: type.endsWith('license')
                  ? {
                      firstName: 'Jordan',
                      lastName: 'Example',
                      state: 'NY',
                      expires: '2029-05-14',
                    }
                  : { insurer: 'Example Mutual', policyNumber: 'POL-7731' },
                dataUrl: 'https://s3/scan.jpg',
              },
            },
          },
          isLoading: false,
          error: null,
        };
      }
      return { data: undefined, isLoading: false, error: null };
    },
  );

const withScanUrl = (dataUrl: string) =>
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) =>
      request?.query.startsWith('query AvailableCloudEventTypes')
        ? {
            data: { data: { availableCloudEventTypes: [TYPES[0]] } },
            isLoading: false,
            error: null,
          }
        : {
            data: {
              data: {
                latestCloudEvent: {
                  header: { type: TYPES[0].type, time: '2026-08-02T14:02:11Z' },
                  data: { state: 'NY' },
                  dataUrl,
                },
              },
            },
            isLoading: false,
            error: null,
          },
  );

describe('DocumentsTab', () => {
  it('does not link a non-http(s) scan URL', () => {
    withScanUrl('javascript:alert(1)');
    render(<DocumentsTab subject={graph.account} ctx={ctx} />);
    expect(screen.getByText('State')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open scan' })).not.toBeInTheDocument();
  });

  it('shows one card per document type with its fields and scan link', () => {
    answer({
      data: { data: { availableCloudEventTypes: TYPES } },
      isLoading: false,
      error: null,
    });
    render(<DocumentsTab subject={graph.account} ctx={ctx} />);
    expect(screen.getByText("Driver's license")).toBeInTheDocument();
    expect(screen.getByText('Insurance card')).toBeInTheDocument();
    expect(screen.queryByText('dimo.raw.driver.license')).not.toBeInTheDocument();
    expect(screen.getByText('Jordan')).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open scan' })[0]).toHaveAttribute(
      'href',
      'https://s3/scan.jpg',
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'View raw event' })[0]);
    expect(ctx.onBrowseRaw).toHaveBeenCalledWith(graph.account.did);
    // The account is its own Fetch subject: its DID, no producer filter.
    const typesCall = (useSubjectQuery as jest.Mock).mock.calls.find((c) =>
      c[0].request?.query.startsWith('query AvailableCloudEventTypes'),
    )[0];
    expect(typesCall.asset).toBe(graph.account.did);
    expect(typesCall.request.variables).toEqual({ did: graph.account.did, filter: null });
  });

  it('shows a refused type list instead of the no-documents copy', () => {
    answer({
      data: {
        data: { availableCloudEventTypes: null },
        errors: [{ message: 'types refused', path: ['availableCloudEventTypes'] }],
      },
      isLoading: false,
      error: null,
    });
    render(<DocumentsTab subject={graph.account} ctx={ctx} />);
    expect(screen.getByText('types refused')).toBeInTheDocument();
    expect(
      screen.queryByText("The owner hasn't uploaded any documents yet."),
    ).not.toBeInTheDocument();
  });

  it('shows a refused document inside its card', () => {
    (useSubjectQuery as jest.Mock).mockImplementation(
      ({ request }: { request: { query: string } | null }) =>
        request?.query.startsWith('query AvailableCloudEventTypes')
          ? {
              data: { data: { availableCloudEventTypes: [TYPES[0]] } },
              isLoading: false,
              error: null,
            }
          : {
              data: {
                data: { latestCloudEvent: null },
                errors: [{ message: 'document refused', path: ['latestCloudEvent'] }],
              },
              isLoading: false,
              error: null,
            },
    );
    render(<DocumentsTab subject={graph.account} ctx={ctx} />);
    expect(screen.getByText("Driver's license")).toBeInTheDocument();
    expect(screen.getByText('document refused')).toBeInTheDocument();
  });

  it('explains and offers the sharing link when the account is not shared', () => {
    answer({
      data: undefined,
      isLoading: false,
      error: new DataApiError(403, 'NOT_SHARED', 'not shared'),
    });
    render(<DocumentsTab subject={graph.account} ctx={ctx} />);
    expect(
      screen.getByText("The owner hasn't shared documents with Fleet Pulse"),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy sharing link' })).toBeInTheDocument();
  });
});
