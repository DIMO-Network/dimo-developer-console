import { buildVehicleGraph, resolveTelemetrySource } from '@/services/subjects/graph';
import type { VehicleDetail } from '@/services/subjects/graph';

const CHAIN = 80002;
const vehicle: VehicleDetail = {
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
    serial: 'a7c3d9e2-58f1',
    pairedAt: '2026-04-12T09:00:00Z',
    mintedAt: '2026-04-11T09:00:00Z',
    manufacturer: { name: 'AutoPi' },
  },
  syntheticDevice: {
    tokenId: 9120,
    tokenDID: 'did:erc721:80002:0x4804e8D1661cd1a1e5dDdE1ff458A7f878c0aC6D:9120',
    address: '0x4804e8D1661cd1a1e5dDdE1ff458A7f878c0aC6D',
    mintedAt: '2026-06-11T09:00:00Z',
    connection: {
      name: 'Smartcar',
      address: '0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E',
    },
  },
  sacds: { nodes: [] },
  privileges: { nodes: [] },
};

describe('buildVehicleGraph', () => {
  const g = buildVehicleGraph(vehicle, CHAIN);

  it('puts the vehicle first with every data capability', () => {
    expect(g.vehicle).toMatchObject({
      kind: 'vehicle',
      did: vehicle.tokenDID,
      asset: vehicle.tokenDID,
      tokenId: 190231,
      label: 'Vehicle',
      sublabel: 'All sources combined',
      capabilities: ['summary', 'signals', 'raw', 'trips'],
    });
    expect(g.vehicle.fetchDid).toBe(vehicle.tokenDID);
    expect(g.vehicle.fetchFilter).toBeUndefined();
  });

  it('scopes each device to the vehicle DID filtered by the device as producer', () => {
    // Oracle cloud events carry subject = vehicle DID and producer = device DID.
    for (const d of g.devices) {
      expect(d.fetchDid).toBe(vehicle.tokenDID);
      expect(d.fetchFilter).toEqual({ producer: d.did });
    }
    expect(g.devices[0].did).toBe(vehicle.aftermarketDevice!.tokenDID);
  });

  it('gives only the aftermarket device its own Fetch DID for device status', () => {
    // Device status (Ruptela r/v0/dev, AutoPi's device copy) is filed with
    // subject = producer = the device DID, not under the vehicle.
    expect(g.devices[0].ownFetchDid).toBe(vehicle.aftermarketDevice!.tokenDID);
    expect(g.devices[1].ownFetchDid).toBeUndefined();
    expect(g.vehicle.ownFetchDid).toBeUndefined();
    expect(g.account.ownFetchDid).toBeUndefined();
  });

  it('breaks each device out under the vehicle, authorised by the vehicle DID', () => {
    expect(g.devices.map((d) => [d.kind, d.label, d.sublabel])).toEqual([
      ['aftermarket-device', 'AutoPi', 'Aftermarket device'],
      ['synthetic-device', 'Smartcar', 'Synthetic device'],
    ]);
    for (const d of g.devices) {
      expect(d.asset).toBe(vehicle.tokenDID);
      expect(d.parent).toBe(vehicle.tokenDID);
      expect(d.tokenId).toBe(190231);
      expect(d.capabilities).toEqual(['summary', 'signals', 'raw']);
    }
    expect(g.devices[1].telemetrySource).toBe(
      'did:ethr:80002:0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E',
    );
    expect(g.devices[0].telemetrySource).toBeUndefined();
  });

  it('adds the owner account as a documents subject', () => {
    expect(g.account).toMatchObject({
      kind: 'account',
      did: 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
      asset: 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
      label: 'Documents',
      sublabel: 'Owner account',
      capabilities: ['documents', 'raw'],
    });
    expect(g.account.fetchDid).toBe(g.account.did);
    expect(g.account.fetchFilter).toBeUndefined();
    expect(g.all.map((s) => s.did)).toEqual([
      g.vehicle.did,
      ...g.devices.map((d) => d.did),
      g.account.did,
    ]);
  });

  it('carries details rows for the details panel', () => {
    expect(g.vehicle.details).toEqual(
      expect.arrayContaining([
        { label: 'Make, model, year', value: 'Toyota RAV4 2024' },
        { label: 'Owner', value: vehicle.owner, mono: true },
        { label: 'Vehicle DID', value: vehicle.tokenDID, mono: true },
      ]),
    );
    expect(g.devices[0].details).toEqual(
      expect.arrayContaining([{ label: 'Serial', value: 'a7c3d9e2-58f1', mono: true }]),
    );
  });

  it('omits missing devices', () => {
    const bare = buildVehicleGraph(
      { ...vehicle, aftermarketDevice: null, syntheticDevice: null },
      CHAIN,
    );
    expect(bare.devices).toEqual([]);
    expect(bare.all).toHaveLength(2);
  });
});

describe('resolveTelemetrySource', () => {
  const g = buildVehicleGraph(vehicle, CHAIN);
  it('normalises a bare address from header.source to a source DID', () => {
    expect(
      resolveTelemetrySource(
        g.devices[0],
        '0xF26421509Efe92861a587482100c6d728aBf1CD0',
        CHAIN,
      ),
    ).toBe('did:ethr:80002:0xF26421509Efe92861a587482100c6d728aBf1CD0');
  });
  it('keeps a DID-shaped header.source', () => {
    expect(resolveTelemetrySource(g.devices[0], 'did:ethr:80002:0xF264', CHAIN)).toBe(
      'did:ethr:80002:0xF264',
    );
  });
  it('falls back to the connection address, then to nothing', () => {
    expect(resolveTelemetrySource(g.devices[1], null, CHAIN)).toBe(
      g.devices[1].telemetrySource,
    );
    expect(resolveTelemetrySource(g.devices[0], null, CHAIN)).toBeUndefined();
    expect(resolveTelemetrySource(g.devices[0], 'garbage', CHAIN)).toBeUndefined();
  });
  it('never filters the vehicle itself', () => {
    expect(resolveTelemetrySource(g.vehicle, '0xF264', CHAIN)).toBeUndefined();
  });
});
