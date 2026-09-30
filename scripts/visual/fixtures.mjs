// Fixture data for the visual harness. Shapes follow the TypeScript types named
// in each comment; if a page renders wrong, compare against that type first.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const USER_EMAIL = 'jane@harness.dev';
export const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
export const WALLET = '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
export const SIGNER = '0x5B2E4f6A8c0D2e4F6a8C0d2E4f6A8c0D2e4F6a8C';
export const LICENSE = {
  tokenId: 42,
  clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  alias: 'Harness Fleet',
};
export const LICENSE_2 = {
  tokenId: 43,
  clientId: '0x4f9a3b2c5d6e7f8091a2b3c4d5e6f708192a3b4c',
  alias: 'Sandbox App',
};
const NOW = '2026-09-20T14:30:00Z';

// src/types/user.ts IUser
export const USER = {
  id: 'user-harness',
  name: 'Jane Developer',
  email: USER_EMAIL,
  auth: 'credentials',
  auth_login: USER_EMAIL,
  role: 'OWNER',
  team: {
    id: 'team-harness',
    name: 'Harness Motors',
    company_id: 'co-harness',
    created_by: 'user-harness',
  },
  company_email_owner: null,
};

// src/types/wallet.ts ISubOrganization
export const SUB_ORG = {
  email: USER_EMAIL,
  subOrganizationId: 'sub-harness',
  emailVerified: true,
  walletAddress: WALLET,
  smartContractAddress: KERNEL,
  hasPasskey: true,
};

// src/types/workspace.ts IWorkspace
export const WORKSPACE = {
  id: 'ws-harness',
  name: 'Harness Motors',
  token_id: LICENSE.tokenId,
  client_id: LICENSE.clientId,
  owner: KERNEL,
};

// src/types/app.ts IApp
export const APPS = [
  {
    id: 'app-harness',
    name: LICENSE.alias,
    scope: 'production',
    Workspace: WORKSPACE,
    deleted: false,
  },
];

// src/services/brand.ts BrandView
export const BRANDS = [
  {
    id: 'brand-1',
    name: 'Harness Fleet',
    logoCid: null,
    iconCid: null,
    logoUrl: null,
    iconUrl: null,
    primaryColor: '#46F1E4',
    isDefault: true,
    updatedAt: NOW,
  },
  {
    id: 'brand-2',
    name: 'Consumer App',
    logoCid: null,
    iconCid: null,
    logoUrl: null,
    iconUrl: null,
    primaryColor: '#8CD0FF',
    isDefault: false,
    updatedAt: NOW,
  },
];

// src/actions/configurations.ts IConfigurationListItem
export const CONFIGURATIONS = [
  { id: 'cfg-1', configuration_name: 'Fleet onboarding', entry_state: 'VEHICLE_MANAGER' },
  { id: 'cfg-2', configuration_name: 'Email invite flow', entry_state: 'EMAIL_INPUT' },
];
export const configurationDetail = (id) => ({
  id,
  configuration_name: 'Fleet onboarding',
  configuration: {
    entryState: 'VEHICLE_MANAGER',
    redirectUri: 'https://harness.dev/callback',
    permissions: '11111111',
    expirationDate: '12-31-2026',
  },
});

// src/types/connection.ts Connection (+ the list fields the page reads)
export const CONNECTIONS = [
  {
    id: 'conn-1',
    name: 'Harness telematics',
    company_id: 'co-harness',
    developer_license_address: LICENSE.clientId,
    connection_public_key: '0x04a1b2c3d4e5f60718293a4b5c6d7e8f',
    connection_private_key: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    connection_license_public_key: '0x04a1b2c3d4e5f60718293a4b5c6d7e8f',
    connection_license_private_key: '0x1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    // viem validates this as a 32-byte private key (connection details derive its address).
    device_issuance_key:
      '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    created_at: NOW,
    updated_at: NOW,
  },
];

// src/actions/simulatedVehicles.ts SimulatedVehicle
export const SIMULATED_VEHICLES = [
  {
    id: 'sim-1',
    user_id: 'user-harness',
    token_id: 190231,
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    client_id: LICENSE.clientId,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'sim-2',
    user_id: 'user-harness',
    token_id: 190232,
    make: 'Ford',
    model: 'F-150',
    year: 2022,
    client_id: LICENSE.clientId,
    created_at: NOW,
    updated_at: NOW,
  },
];

// src/types/team.ts ITeamCollaborator
export const COLLABORATORS = [
  {
    id: 'col-1',
    team_id: 'team-harness',
    user_id: 'user-harness',
    User: USER,
    email: USER_EMAIL,
    role: 'OWNER',
    status: 'ACCEPTED',
    deleted: false,
  },
  {
    id: 'col-2',
    team_id: 'team-harness',
    user_id: 'user-2',
    email: 'sam@harness.dev',
    role: 'COLLABORATOR',
    status: 'SENT',
    deleted: false,
  },
];

// src/types/wallet.ts ICreditUsage
export const creditUsage = (licenseId, url) => ({
  fromDate: url.searchParams.get('fromDate'),
  toDate: url.searchParams.get('toDate') ?? '',
  licenseId,
  numOfAssets: 6,
  numOfCreditsGrantsPurchased: 50000,
  numOfCreditsUsed: 12840,
});

export const CRYPTO_PRICE = {
  data: {
    DIMO: [{ quote: { USD: { price: 0.21 } } }],
    POL: [{ quote: { USD: { price: 0.38 } } }],
    WMATIC: [{ quote: { USD: { price: 0.38 } } }],
  },
};

// Turnkey (@turnkey/http query responses)
export const TK_WALLETS = {
  wallets: [{ walletId: 'wallet-harness', walletName: 'Harness' }],
};
export const TK_WALLET_ACCOUNT = { account: { address: WALLET } };
export const TK_PRIVATE_KEYS = {
  privateKeys: [
    {
      privateKeyId: 'pk-harness',
      addresses: [{ format: 'ADDRESS_FORMAT_ETHEREUM', address: SIGNER }],
    },
  ],
};

// src/types/webhook.ts Webhook
export const WEBHOOKS = [
  {
    id: 'wh-1',
    service: 'signals',
    metricName: 'vss.speed',
    condition: 'valueNumber > 120',
    coolDownPeriod: 30,
    parameters: {},
    targetURL: 'https://harness.dev/hooks/speed',
    developer_license_address: LICENSE.clientId,
    status: 'enabled',
    created_at: NOW,
    updated_at: NOW,
    description: 'Speeding alert',
    displayName: 'Speeding alert',
    failure_count: 0,
  },
  {
    id: 'wh-2',
    service: 'signals',
    metricName: 'vss.powertrainTractionBatteryStateOfChargeCurrent',
    condition: 'valueNumber < 20',
    coolDownPeriod: 60,
    parameters: {},
    targetURL: 'https://harness.dev/hooks/soc',
    developer_license_address: LICENSE.clientId,
    status: 'disabled',
    created_at: NOW,
    updated_at: NOW,
    description: 'Low battery',
    displayName: 'Low battery',
    failure_count: 3,
  },
];
export const WEBHOOK_ASSETS = [
  'did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:190231',
];

// Template editor: reuse the repo's own test fixtures.
const camry = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src/utils/__fixtures__/toyota_camry_2020.json'),
    'utf8',
  ),
);
const vocabSource = fs.readFileSync(
  path.join(root, 'src/utils/__fixtures__/vehicleVocab.ts'),
  'utf8',
);
// vehicleVocab.ts assigns an object literal (unquoted keys) to a typed const.
const vocabulary = vm.runInNewContext(
  '(' +
    vocabSource.slice(
      vocabSource.indexOf('{', vocabSource.indexOf('=')),
      vocabSource.lastIndexOf('}') + 1,
    ) +
    ')',
);
export const TEMPLATE_DETAIL = {
  template: camry,
  vocabulary,
  entitlement: {
    kind: 'author',
    canPublish: true,
    canSetHardwareTemplateId: false,
    mintedVehicles: 0,
    reason: 'No vehicle references this template yet.',
  },
};
export const TEMPLATE_SEARCH = {
  manufacturer: { name: 'Toyota', tokenId: 9 },
  results: [
    {
      id: camry.id,
      model: 'Camry',
      year: 2020,
      status: 'ok',
      version: camry.version,
      trims: camry.trims.length,
    },
    { id: 'toyota_camry_2021', model: 'Camry', year: 2021, status: 'missing' },
  ],
};

// Identity GraphQL. Apollo drops fragment fields without __typename.
const PAGE_INFO = {
  __typename: 'PageInfo',
  startCursor: 'a',
  endCursor: 'b',
  hasNextPage: false,
  hasPreviousPage: false,
};
const license = (l, withUris) => ({
  __typename: 'DeveloperLicense',
  alias: l.alias,
  tokenId: l.tokenId,
  clientId: l.clientId,
  owner: KERNEL,
  mintedAt: '2026-03-02T15:04:05Z',
  signers: {
    __typename: 'SignerConnection',
    totalCount: 1,
    pageInfo: PAGE_INFO,
    nodes: [{ __typename: 'Signer', address: SIGNER, enabledAt: '2026-03-02T15:04:05Z' }],
  },
  redirectURIs: {
    __typename: 'RedirectURIConnection',
    totalCount: withUris ? 2 : 0,
    pageInfo: PAGE_INFO,
    nodes: withUris
      ? [
          {
            __typename: 'RedirectURI',
            uri: 'https://harness.dev/callback',
            enabledAt: '2026-03-02T15:04:05Z',
          },
          {
            __typename: 'RedirectURI',
            uri: 'http://localhost:8080/callback',
            enabledAt: '2026-03-02T15:04:05Z',
          },
        ]
      : [],
  },
});
const LICENSES = [license(LICENSE, true), license(LICENSE_2, false)];
const DEVICE_AD = (tokenId) => ({
  __typename: 'AftermarketDevice',
  tokenId: tokenId + 300000,
  tokenDID: `did:erc721:80002:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:${tokenId + 300000}`,
  address: '0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA',
  serial: 'a7c3d9e2-58f1-4b0c-9e2d-3f1a6b8c7d40',
  pairedAt: '2026-04-12T09:00:00Z',
  mintedAt: '2026-04-11T09:00:00Z',
  manufacturer: { __typename: 'Manufacturer', name: 'AutoPi' },
});
const DEVICE_SD = (tokenId) => ({
  __typename: 'SyntheticDevice',
  tokenId: tokenId + 600000,
  tokenDID: `did:erc721:80002:0x4804e8D1661cd1a1e5dDdE1ff458A7f878c0aC6D:${tokenId + 600000}`,
  address: '0x4804e8D1661cd1a1e5dDdE1ff458A7f878c0aC6D',
  mintedAt: '2026-06-11T09:00:00Z',
  connection: {
    __typename: 'Connection',
    name: 'Smartcar',
    address: '0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E',
  },
});
// pairs 1,3,4,7 -> Non-location data, Current location, All-time location, Raw data
const SACD_PERMS =
  '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);
const sacd = (grantee, createdAt, expiresAt) => ({
  __typename: 'Sacd',
  grantee,
  permissions: SACD_PERMS,
  createdAt,
  expiresAt,
  source: 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
});
const vehicle = (tokenId, make, model, year) => ({
  __typename: 'Vehicle',
  tokenId,
  tokenDID: `did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:${tokenId}`,
  owner: WALLET,
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: {
    __typename: 'Definition',
    id: `${make}_${model}_${year}`.toLowerCase().replace(/\W+/g, '_'),
    make,
    model,
    year,
  },
  aftermarketDevice: tokenId % 2 ? DEVICE_AD(tokenId) : null,
  syntheticDevice: DEVICE_SD(tokenId),
  sacd: sacd(LICENSE.clientId, '2026-08-02T00:00:00Z', '2027-08-02T00:00:00Z'),
  sacds: {
    __typename: 'SacdConnection',
    nodes: [
      sacd(LICENSE.clientId, '2026-08-02T00:00:00Z', '2027-08-02T00:00:00Z'),
      sacd(
        '0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37',
        '2026-04-11T09:00:00Z',
        '2036-04-11T09:00:00Z',
      ),
      {
        ...sacd(
          '0x5b1e2d3c4b5a69788796a5b4c3d2e1f0a9b8a09c',
          '2026-05-02T00:00:00Z',
          '2026-08-02T00:00:00Z',
        ),
        permissions: '0xc',
      },
    ],
  },
  privileges: { __typename: 'PrivilegesConnection', nodes: [] },
});
// pair 7 -> Raw data: what an account grant for documents carries.
const ACCOUNT_SACDS = [
  {
    ...sacd(LICENSE.clientId, '2026-08-02T14:00:00Z', '2027-08-02T14:00:00Z'),
    permissions: '0x' + (3n << 14n).toString(16),
    source: 'ipfs://bafkreiaccountdocumentsgrantforfleetpulse',
  },
  {
    ...sacd(
      '0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37',
      '2026-09-12T09:00:00Z',
      '2026-10-20T09:00:00Z',
    ),
    permissions: '0x' + (3n << 14n).toString(16),
    source: '',
  },
];
const VEHICLES = [
  vehicle(190231, 'Tesla', 'Model 3', 2023),
  vehicle(190232, 'Ford', 'F-150', 2022),
  vehicle(190233, 'Toyota', 'RAV4', 2024),
  vehicle(190234, 'Hyundai', 'Ioniq 5', 2023),
  vehicle(190235, 'Chevrolet', 'Bolt EV', 2021),
  vehicle(190236, 'BMW', 'i4', 2024),
];
// Superset root: every identity query in the console selects a subset of these.
// noLicenses: the owner has no developer licenses yet (the empty /app state).
// notShared: the vehicle's SACDs name neither harness license (no license can read it).
export const identityData = (vars, { noLicenses = false, notShared = false } = {}) => {
  const licenses = noLicenses ? [] : LICENSES;
  const byVars = LICENSES.find(
    (l) =>
      String(l.tokenId) === String(vars.tokenId) ||
      (vars.clientId && l.clientId.toLowerCase() === String(vars.clientId).toLowerCase()),
  );
  const found =
    VEHICLES.find((v) => String(v.tokenId) === String(vars.tokenId)) ?? VEHICLES[0];
  const licenseGrantees = new Set(
    [LICENSE, LICENSE_2].map((l) => l.clientId.toLowerCase()),
  );
  const strip = (nodes) =>
    nodes.filter((n) => !licenseGrantees.has(n.grantee.toLowerCase()));
  const vehicleNode = notShared
    ? {
        ...found,
        sacd: null,
        sacds: { ...found.sacds, nodes: strip(found.sacds.nodes) },
      }
    : found;
  const accountGrants = notShared ? strip(ACCOUNT_SACDS) : ACCOUNT_SACDS;
  return {
    developerLicenses: {
      __typename: 'DeveloperLicenseConnection',
      totalCount: licenses.length,
      pageInfo: PAGE_INFO,
      nodes: licenses,
    },
    developerLicense: byVars ?? LICENSES[0],
    // GetAccountSacds: grants on the owner's account DID (Sharing's second table).
    account: {
      __typename: 'Account',
      address: vars.address ?? WALLET,
      sacds: { __typename: 'SacdConnection', nodes: accountGrants },
    },
    vehicle: vehicleNode,
    vehicles: {
      __typename: 'VehicleConnection',
      totalCount: VEHICLES.length,
      pageInfo: PAGE_INFO,
      nodes: VEHICLES,
    },
  };
};

// Data API (Telemetry + Fetch) fixtures, keyed by the operation name in the
// posted query. A function gets the request variables. See dataApi.mjs.
export const VEHICLE_DID = `did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:190231`;
// Relative to the real clock, so freshness (1 h / 24 h) and the 7-day ranges hold.
const AT = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const AUTOPI_SOURCE = '0xF26421509Efe92861a587482100c6d728aBf1CD0';
const SMARTCAR_SOURCE = '0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E';
// Oracle events carry subject = vehicle DID, producer = device DID; the source
// is the connection that signed them.
const header = (type, minutesAgo, producer, source = AUTOPI_SOURCE) => ({
  id: `2mXq8rKf1T${minutesAgo}`,
  source,
  producer,
  subject: VEHICLE_DID,
  time: AT(minutesAgo),
  type,
  datacontenttype: 'application/json',
  dataschema: '',
  dataversion: 'default/v1.0',
  tags: [],
});
const status = (minutesAgo, producer, source) => ({
  header: header('dimo.status', minutesAgo, producer, source),
  data: {
    signals: [
      { name: 'speed', timestamp: AT(minutesAgo), value: 42 },
      { name: 'powertrainCombustionEngineSpeed', timestamp: AT(minutesAgo), value: 1840 },
    ],
  },
});
const AD_DID = DEVICE_AD(190231).tokenDID;
const SD_DID = DEVICE_SD(190231).tokenDID;
// Every cloud event on the vehicle DID, newest first; ids are unique by minute.
const VEHICLE_EVENTS = [
  status(2, AD_DID),
  status(3, AD_DID),
  {
    header: header('dimo.fingerprint', 4, AD_DID),
    data: { vin: 'JTMW1RFV8PD000000', protocol: '6' },
  },
  status(33, AD_DID),
  status(63, AD_DID),
  status(93, AD_DID),
  status(180, SD_DID, SMARTCAR_SOURCE),
  status(240, SD_DID, SMARTCAR_SOURCE),
];
// A device subject arrives as the vehicle DID with filter.producer set.
const byProducer = (events, filter) =>
  filter?.producer ? events.filter((e) => e.header.producer === filter.producer) : events;
const typeSummary = (events) =>
  Object.values(
    events.reduce((acc, e) => {
      const t = (acc[e.header.type] ??= {
        type: e.header.type,
        count: 0,
        firstSeen: '2024-03-04T00:00:00Z',
        lastSeen: e.header.time,
      });
      t.count += 1;
      return acc;
    }, {}),
  );
const DOCUMENT_TYPES = [
  {
    type: 'dimo.document.driver.license',
    count: 2,
    firstSeen: '2026-08-02T14:02:11Z',
    lastSeen: '2026-08-02T14:02:11Z',
  },
  {
    type: 'dimo.document.driver.insurance',
    count: 1,
    firstSeen: '2026-08-02T14:03:40Z',
    lastSeen: '2026-08-02T14:03:40Z',
  },
];
const SIGNAL_NAMES = [
  'speed',
  'powertrainCombustionEngineSpeed',
  'obdEngineLoad',
  'powertrainFuelSystemRelativeLevel',
  'obdDTCList',
];
const summaryRow = (name, numberOfSignals, lastSeen) => ({
  name,
  numberOfSignals,
  firstSeen: '2024-03-04T00:00:00Z',
  lastSeen,
});
export const DATA_API = {
  DataSummary: {
    dataSummary: {
      numberOfSignals: 1240000,
      availableSignals: SIGNAL_NAMES,
      firstSeen: '2024-03-04T00:00:00Z',
      lastSeen: AT(2),
      signalDataSummary: [
        summaryRow('speed', 412880, AT(2)),
        summaryRow('powertrainCombustionEngineSpeed', 398112, AT(2)),
        summaryRow('obdEngineLoad', 201450, AT(2)),
        summaryRow('powertrainFuelSystemRelativeLevel', 41202, AT(120)),
        {
          ...summaryRow('obdDTCList', 12, AT(14 * 1440)),
          firstSeen: '2024-04-19T00:00:00Z',
        },
      ],
      eventDataSummary: [
        {
          name: 'harshBraking',
          numberOfEvents: 42,
          firstSeen: '2024-05-02T00:00:00Z',
          lastSeen: AT(2 * 1440),
        },
      ],
    },
  },
  AvailableSignals: { availableSignals: SIGNAL_NAMES },
  SignalsLatest: {
    signalsLatest: {
      lastSeen: AT(2),
      speed: { timestamp: AT(2), value: 42 },
      powertrainCombustionEngineSpeed: { timestamp: AT(2), value: 1840 },
      obdEngineLoad: { timestamp: AT(2), value: 37 },
      powertrainFuelSystemRelativeLevel: { timestamp: AT(120), value: 61 },
      obdDTCList: { timestamp: AT(14 * 1440), value: 'P0301' },
    },
  },
  LastSeen: { signalsLatest: { lastSeen: AT(2) } },
  // Daytime driving hours have values, nights are gaps.
  Signals: {
    signals: Array.from({ length: 168 }, (_, i) => {
      const driving = i % 24 >= 7 && i % 24 <= 18;
      return {
        timestamp: AT((167 - i) * 60),
        speed: driving ? 30 + ((i * 37) % 70) : null,
        powertrainCombustionEngineSpeed: driving ? 1200 + ((i * 53) % 1800) : null,
      };
    }),
  },
  Events: { events: [] },
  Segments: {
    segments: [
      {
        start: { timestamp: AT(28), value: { latitude: 40.7, longitude: -74, hdop: 1 } },
        end: null,
        duration: 1680,
        isOngoing: true,
        startedBeforeRange: false,
        signals: [
          { name: 'speed', agg: 'MAX', value: 96 },
          { name: 'powertrainTransmissionTravelledDistance', agg: 'FIRST', value: 48200 },
          {
            name: 'powertrainTransmissionTravelledDistance',
            agg: 'LAST',
            value: 48218.2,
          },
        ],
        eventCounts: [],
      },
      {
        start: { timestamp: AT(181), value: { latitude: 40.7, longitude: -74, hdop: 1 } },
        end: { timestamp: AT(138), value: { latitude: 40.8, longitude: -74.1, hdop: 1 } },
        duration: 2580,
        isOngoing: false,
        startedBeforeRange: false,
        signals: [
          { name: 'speed', agg: 'MAX', value: 112 },
          { name: 'powertrainTransmissionTravelledDistance', agg: 'FIRST', value: 48160 },
          {
            name: 'powertrainTransmissionTravelledDistance',
            agg: 'LAST',
            value: 48194.7,
          },
        ],
        eventCounts: [],
      },
    ],
  },
  // One row per day of the queried range, oldest first (the schema has no date).
  DailyActivity: {
    dailyActivity: [3, 5, 2, 4, 3, 3, 2].map((n, i) => ({
      start: { timestamp: AT((6 - i) * 1440) },
      end: { timestamp: AT((6 - i) * 1440 - 60) },
      segmentCount: n,
      duration: n * 1500,
      signals: [],
      eventCounts: [],
    })),
  },
  // The account DID holds the documents; the vehicle DID the device events,
  // narrowed to one device by filter.producer.
  AvailableCloudEventTypes: (vars) => ({
    availableCloudEventTypes: String(vars.did).startsWith('did:ethr:')
      ? DOCUMENT_TYPES
      : typeSummary(byProducer(VEHICLE_EVENTS, vars.filter)).map((t) =>
          t.type === 'dimo.status' ? { ...t, count: t.count * 150000 } : t,
        ),
  }),
  LatestCloudEvent: (vars) => ({
    latestCloudEvent:
      vars.filter?.type === 'dimo.document.driver.license'
        ? {
            header: header('dimo.document.driver.license', 0, `did:ethr:80002:${WALLET}`),
            data: {
              documentType: 'driver_license',
              firstName: 'Jordan',
              lastName: 'Example',
              licenseNumber: 'D••••4821',
              state: 'NY',
              expires: '2029-05-14',
            },
            dataUrl: 'https://example.invalid/scan.jpg',
          }
        : vars.filter?.type === 'dimo.document.driver.insurance'
          ? {
              header: header(
                'dimo.document.driver.insurance',
                0,
                `did:ethr:80002:${WALLET}`,
              ),
              data: {
                insurer: 'Example Mutual',
                policyNumber: 'POL-••••-7731',
                validTo: '2027-03-01',
              },
              dataUrl: 'https://example.invalid/card.pdf',
            }
          : (byProducer(VEHICLE_EVENTS, vars.filter)[0] ?? null),
  }),
  // Honours the filter's `before`, `type` and `producer`, so RawDataTab's paging
  // (before = last row's time + 1 ms, deduped by id) ends on the second page.
  CloudEvents: (vars) => ({
    cloudEvents: byProducer(VEHICLE_EVENTS, vars.filter).filter(
      (e) =>
        (!vars.filter?.before || e.header.time < vars.filter.before) &&
        (!vars.filter?.type || e.header.type === vars.filter.type),
    ),
  }),
  Indexes: (vars) => ({
    indexes: byProducer(VEHICLE_EVENTS, vars.filter)
      .slice(0, 3)
      .map((e, i) => ({
        header: e.header,
        indexKey: `cloudevent/190231/${e.header.type}/${i + 1}`,
      })),
  }),
  LatestIndex: {
    latestIndex: {
      header: header('dimo.status', 2, AD_DID),
      indexKey: 'cloudevent/190231/dimo.status/1',
    },
  },
  // sN answers dN narrowed by fN (a device's producer); the Smartcar device's
  // latest event is 3 h old, so its rail dot is stale.
  Freshness: (vars) =>
    Object.fromEntries(
      Object.keys(vars)
        .filter((k) => /^d\d+$/.test(k))
        .map((k) => {
          const i = k.slice(1);
          const latest = byProducer(VEHICLE_EVENTS, vars[`f${i}`])[0];
          return [
            `s${i}`,
            latest
              ? {
                  header: {
                    time: latest.header.time,
                    type: latest.header.type,
                    source: latest.header.source,
                    producer: latest.header.producer,
                  },
                }
              : null,
          ];
        }),
    ),
};

// Operations answered like gqlgen answers a refused privilege: HTTP 200 with
// data: null and the error (the route's `dataErrors` names them).
export const DATA_ERRORS = {
  Segments: {
    data: null,
    errors: [{ message: 'unauthorized: requires privilege VEHICLE_ALL_TIME_LOCATION' }],
  },
};
