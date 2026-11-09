import type { GetVehicleDetailQuery } from '@/gql/graphql';
import { accountDid, sourceDid } from './did';
import type { Translate } from '@/i18n/translate';

export type VehicleDetail = NonNullable<GetVehicleDetailQuery['vehicle']>;

export type SubjectKind =
  'vehicle' | 'aftermarket-device' | 'synthetic-device' | 'account';
export type SubjectCapability = 'summary' | 'signals' | 'raw' | 'trips' | 'documents';

export type SubjectDetailKey =
  | 'makeModelYear'
  | 'definitionId'
  | 'owner'
  | 'minted'
  | 'vehicleDid'
  | 'manufacturer'
  | 'serial'
  | 'deviceAddress'
  | 'paired'
  | 'deviceDid'
  | 'connection'
  | 'connectionAddress'
  | 'accountDid';

// The label is vehicles.subjects.details.<key>. A date row's value is the raw
// timestamp, formatted by the view; a null value is worded by the view too.
export type DetailRow = {
  key: SubjectDetailKey;
  value: string | null;
  mono?: boolean;
  date?: true;
};

// A subject is anything the Fetch API keys by DID plus what its kind adds:
// telemetry for vehicles and devices (by tokenId + optional source filter),
// documents for the owner's account.
export type Subject = {
  // The subject's own DID: URL state, rail keys, display.
  did: string;
  kind: SubjectKind;
  // A device's own name from the API (its manufacturer or connection), shown
  // instead of the kind's label. See subjectLabel.
  name?: string;
  // Export filenames stay English, as they read before the labels moved.
  fileStem: string;
  // The DID the token exchange is made for. Devices ride on the vehicle's token.
  asset: string;
  // How Fetch finds this subject's cloud events. Oracle events carry
  // subject = vehicle DID and producer = device DID, and Fetch filters on the
  // subject, so a device is the vehicle DID narrowed to its producer.
  fetchDid: string;
  fetchFilter?: { producer: string };
  // Events Fetch files under the subject's own DID (subject = producer), such
  // as an aftermarket device's status: Ruptela r/v0/dev, AutoPi's device copy.
  ownFetchDid?: string;
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
    fileStem: 'vehicle',
    asset: v.tokenDID,
    fetchDid: v.tokenDID,
    tokenId: v.tokenId,
    capabilities: ['summary', 'signals', 'raw', 'trips'],
    details: [
      { key: 'makeModelYear', value: mmy || null },
      { key: 'definitionId', value: v.definition?.id ?? '—', mono: true },
      { key: 'owner', value: v.owner, mono: true },
      { key: 'minted', value: v.mintedAt, date: true },
      { key: 'vehicleDid', value: v.tokenDID, mono: true },
    ],
  };

  const devices: Subject[] = [];
  const ad = v.aftermarketDevice;
  if (ad) {
    devices.push({
      did: ad.tokenDID,
      kind: 'aftermarket-device',
      name: ad.manufacturer?.name || undefined,
      fileStem: (ad.manufacturer?.name || 'Aftermarket device').toLowerCase(),
      asset: v.tokenDID,
      fetchDid: v.tokenDID,
      fetchFilter: { producer: ad.tokenDID },
      ownFetchDid: ad.tokenDID,
      tokenId: v.tokenId,
      capabilities: ['summary', 'signals', 'raw'],
      parent: v.tokenDID,
      details: [
        { key: 'manufacturer', value: ad.manufacturer?.name ?? '—' },
        { key: 'serial', value: ad.serial ?? '—', mono: true },
        { key: 'deviceAddress', value: ad.address, mono: true },
        { key: 'paired', value: ad.pairedAt, date: true },
        { key: 'minted', value: ad.mintedAt, date: true },
        { key: 'deviceDid', value: ad.tokenDID, mono: true },
      ],
    });
  }
  const sd = v.syntheticDevice;
  if (sd) {
    devices.push({
      did: sd.tokenDID,
      kind: 'synthetic-device',
      name: sd.connection?.name || undefined,
      fileStem: (sd.connection?.name || 'Synthetic device').toLowerCase(),
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
        { key: 'connection', value: sd.connection?.name ?? '—' },
        { key: 'connectionAddress', value: sd.connection?.address ?? '—', mono: true },
        { key: 'deviceAddress', value: sd.address, mono: true },
        { key: 'minted', value: sd.mintedAt, date: true },
        { key: 'deviceDid', value: sd.tokenDID, mono: true },
      ],
    });
  }

  const ownerDid = accountDid(chainId, v.owner);
  const account: Subject = {
    did: ownerDid,
    kind: 'account',
    fileStem: 'documents',
    asset: ownerDid,
    fetchDid: ownerDid,
    capabilities: ['documents', 'raw'],
    details: [
      { key: 'owner', value: v.owner, mono: true },
      { key: 'accountDid', value: ownerDid, mono: true },
    ],
  };

  return { vehicle, devices, account, all: [vehicle, ...devices, account] };
};

const KIND_KEY: Record<SubjectKind, string> = {
  'vehicle': 'vehicle',
  'aftermarket-device': 'aftermarketDevice',
  'synthetic-device': 'syntheticDevice',
  'account': 'account',
};

// Pass the vehicles-namespace `t`.
export const subjectLabel = (s: Subject, t: Translate): string =>
  s.name ?? t(`subjects.${KIND_KEY[s.kind]}.label`);

export const subjectSublabel = (s: Subject, t: Translate): string =>
  t(`subjects.${KIND_KEY[s.kind]}.sublabel`);

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
