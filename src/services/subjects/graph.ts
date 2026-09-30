import type { GetVehicleDetailQuery } from '@/gql/graphql';
import { utcDate } from '@/utils/freshness';
import { accountDid, sourceDid } from './did';

export type VehicleDetail = NonNullable<GetVehicleDetailQuery['vehicle']>;

export type SubjectKind =
  | 'vehicle'
  | 'aftermarket-device'
  | 'synthetic-device'
  | 'account';
export type SubjectCapability = 'summary' | 'signals' | 'raw' | 'trips' | 'documents';

export type DetailRow = { label: string; value: string; mono?: boolean };

// A subject is anything the Fetch API keys by DID plus what its kind adds:
// telemetry for vehicles and devices (by tokenId + optional source filter),
// documents for the owner's account.
export type Subject = {
  // The subject's own DID: URL state, rail keys, display.
  did: string;
  kind: SubjectKind;
  label: string;
  sublabel: string;
  // The DID the token exchange is made for. Devices ride on the vehicle's token.
  asset: string;
  // How Fetch finds this subject's cloud events. Oracle events carry
  // subject = vehicle DID and producer = device DID, and Fetch filters on the
  // subject, so a device is the vehicle DID narrowed to its producer.
  fetchDid: string;
  fetchFilter?: { producer: string };
  tokenId?: number;
  telemetrySource?: string;
  capabilities: SubjectCapability[];
  parent?: string;
  details: DetailRow[];
};

export type SubjectGraph = {
  vehicle: Subject;
  devices: Subject[];
  account: Subject;
  all: Subject[];
};

export const buildVehicleGraph = (v: VehicleDetail, chainId: number): SubjectGraph => {
  const mmy = [v.definition?.make, v.definition?.model, v.definition?.year]
    .filter(Boolean)
    .join(' ');

  const vehicle: Subject = {
    did: v.tokenDID,
    kind: 'vehicle',
    label: 'Vehicle',
    sublabel: 'All sources combined',
    asset: v.tokenDID,
    fetchDid: v.tokenDID,
    tokenId: v.tokenId,
    capabilities: ['summary', 'signals', 'raw', 'trips'],
    details: [
      { label: 'Make, model, year', value: mmy || 'Unknown' },
      { label: 'Definition ID', value: v.definition?.id ?? '—', mono: true },
      { label: 'Owner', value: v.owner, mono: true },
      { label: 'Minted', value: utcDate(v.mintedAt) },
      { label: 'Vehicle DID', value: v.tokenDID, mono: true },
    ],
  };

  const devices: Subject[] = [];
  const ad = v.aftermarketDevice;
  if (ad) {
    devices.push({
      did: ad.tokenDID,
      kind: 'aftermarket-device',
      label: ad.manufacturer?.name || 'Aftermarket device',
      sublabel: 'Aftermarket device',
      asset: v.tokenDID,
      fetchDid: v.tokenDID,
      fetchFilter: { producer: ad.tokenDID },
      tokenId: v.tokenId,
      capabilities: ['summary', 'signals', 'raw'],
      parent: v.tokenDID,
      details: [
        { label: 'Manufacturer', value: ad.manufacturer?.name ?? '—' },
        { label: 'Serial', value: ad.serial ?? '—', mono: true },
        { label: 'Device address', value: ad.address, mono: true },
        { label: 'Paired', value: utcDate(ad.pairedAt) },
        { label: 'Minted', value: utcDate(ad.mintedAt) },
        { label: 'Device DID', value: ad.tokenDID, mono: true },
      ],
    });
  }
  const sd = v.syntheticDevice;
  if (sd) {
    devices.push({
      did: sd.tokenDID,
      kind: 'synthetic-device',
      label: sd.connection?.name || 'Synthetic device',
      sublabel: 'Synthetic device',
      asset: v.tokenDID,
      fetchDid: v.tokenDID,
      fetchFilter: { producer: sd.tokenDID },
      tokenId: v.tokenId,
      telemetrySource: sd.connection?.address
        ? sourceDid(chainId, sd.connection.address)
        : undefined,
      capabilities: ['summary', 'signals', 'raw'],
      parent: v.tokenDID,
      details: [
        { label: 'Connection', value: sd.connection?.name ?? '—' },
        { label: 'Connection address', value: sd.connection?.address ?? '—', mono: true },
        { label: 'Device address', value: sd.address, mono: true },
        { label: 'Minted', value: utcDate(sd.mintedAt) },
        { label: 'Device DID', value: sd.tokenDID, mono: true },
      ],
    });
  }

  const ownerDid = accountDid(chainId, v.owner);
  const account: Subject = {
    did: ownerDid,
    kind: 'account',
    label: 'Documents',
    sublabel: 'Owner account',
    asset: ownerDid,
    fetchDid: ownerDid,
    capabilities: ['documents', 'raw'],
    details: [
      { label: 'Owner', value: v.owner, mono: true },
      { label: 'Account DID', value: ownerDid, mono: true },
    ],
  };

  return { vehicle, devices, account, all: [vehicle, ...devices, account] };
};

// A device's telemetry source is the connection that produced its latest cloud
// event: header.source, normalised to a did:ethr. Fallback: the synthetic
// device's connection address. Undefined means "no per-device signal filter".
export const resolveTelemetrySource = (
  subject: Subject,
  headerSource: string | null,
  chainId: number,
): string | undefined => {
  if (subject.kind === 'vehicle' || subject.kind === 'account') return undefined;
  if (headerSource) {
    if (/^did:ethr:\d+:0x[0-9a-fA-F]+$/.test(headerSource)) return headerSource;
    if (/^0x[0-9a-fA-F]{40}$/.test(headerSource)) return sourceDid(chainId, headerSource);
  }
  return subject.telemetrySource;
};

export const isDevice = (s: Subject) =>
  s.kind === 'aftermarket-device' || s.kind === 'synthetic-device';
