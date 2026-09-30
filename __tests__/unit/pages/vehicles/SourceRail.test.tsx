import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SourceRail } from '@/app/vehicles/[tokenId]/components/SourceRail';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';

const NOW = Date.parse('2026-09-29T20:49:00Z');
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
const freshness = {
  [graph.vehicle.did]: {
    time: '2026-09-29T20:47:00Z',
    type: 'dimo.status',
    source: null,
    producer: null,
  },
  [graph.devices[0].did]: {
    time: '2026-09-29T17:00:00Z',
    type: 'dimo.status',
    source: null,
    producer: null,
  },
};

describe('SourceRail', () => {
  it('lists the vehicle, its devices nested, the owner documents and sharing', () => {
    const onSelect = jest.fn();
    render(
      <SourceRail
        graph={graph}
        freshness={freshness}
        selected={graph.vehicle.did}
        onSelect={onSelect}
        access="ok"
        accountState="shared"
        now={NOW}
      />,
    );
    expect(screen.getByRole('button', { name: /Vehicle/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByText('3 h ago')).toBeInTheDocument();
    expect(screen.getByText('AutoPi').closest('[data-nested]')).not.toBeNull();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /AutoPi/ }));
    expect(onSelect).toHaveBeenCalledWith(graph.devices[0].did);
    fireEvent.click(screen.getByRole('button', { name: /Sharing/ }));
    expect(onSelect).toHaveBeenCalledWith('sharing');
  });

  it('shows why there is no freshness when the license has no access', () => {
    render(
      <SourceRail
        graph={graph}
        freshness={{}}
        selected={graph.vehicle.did}
        onSelect={() => {}}
        access="not-shared"
        accountState="unknown"
        now={NOW}
      />,
    );
    // vehicle, the device and the owner item all show it
    expect(screen.getAllByText('No access')).toHaveLength(3);
  });

  it('says Checking… while freshness loads', () => {
    render(
      <SourceRail
        graph={graph}
        freshness={{}}
        freshnessLoading
        selected={graph.vehicle.did}
        onSelect={() => {}}
        access="ok"
        accountState="shared"
        now={NOW}
      />,
    );
    // The vehicle and the device; the account shows its own grant state.
    expect(screen.getAllByText('Checking…')).toHaveLength(2);
    expect(screen.queryByText('Never')).not.toBeInTheDocument();
  });

  it('says Unavailable, not Never, for a subject whose freshness failed', () => {
    render(
      <SourceRail
        graph={graph}
        freshness={freshness}
        freshnessErrors={{
          [graph.vehicle.did]: null,
          [graph.devices[0].did]: 'needs privilege',
        }}
        selected={graph.vehicle.did}
        onSelect={() => {}}
        access="ok"
        accountState="shared"
        now={NOW}
      />,
    );
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    const unavailable = screen.getByText('Unavailable');
    expect(unavailable).toHaveClass('text-muted');
    expect(unavailable.closest('button')).toHaveTextContent('AutoPi');
    expect(screen.queryByText('Never')).not.toBeInTheDocument();
  });

  it('asks for a new developer JWT when the stored one was refused', () => {
    render(
      <SourceRail
        graph={graph}
        freshness={{}}
        selected={graph.vehicle.did}
        onSelect={() => {}}
        access="jwt-expired"
        accountState="unknown"
        now={NOW}
      />,
    );
    expect(screen.getAllByText('Needs a new developer JWT')).toHaveLength(3);
  });

  it('labels the account subject by its grant state', () => {
    const { rerender } = render(
      <SourceRail
        graph={graph}
        freshness={freshness}
        selected="sharing"
        onSelect={() => {}}
        access="ok"
        accountState="not-shared"
        now={NOW}
      />,
    );
    expect(screen.getByText('Not shared')).toBeInTheDocument();
    rerender(
      <SourceRail
        graph={graph}
        freshness={freshness}
        selected="sharing"
        onSelect={() => {}}
        access="ok"
        accountState="shared"
        now={NOW}
      />,
    );
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });
});
