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
    device_issuance_key: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
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

export const VEHICLE_SIGNALS = {
  availableSignals: [
    'speed',
    'powertrainTractionBatteryStateOfChargeCurrent',
    'currentLocationLatitude',
  ],
  latestSignals: [
    { signal: 'speed', timestamp: NOW, value: 64 },
    {
      signal: 'powertrainTractionBatteryStateOfChargeCurrent',
      timestamp: NOW,
      value: 78,
    },
  ],
  latestSignalsError: null,
};

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
const vehicle = (tokenId, make, model, year) => ({
  __typename: 'Vehicle',
  tokenId,
  tokenDID: `did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:${tokenId}`,
  owner: WALLET,
  mintedAt: '2026-04-11T09:00:00Z',
  definition: {
    __typename: 'Definition',
    id: `${make}_${model}_${year}`.toLowerCase().replace(/\W+/g, '_'),
    make,
    model,
    year,
  },
});
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
export const identityData = (vars, { noLicenses = false } = {}) => {
  const licenses = noLicenses ? [] : LICENSES;
  const byVars = LICENSES.find(
    (l) =>
      String(l.tokenId) === String(vars.tokenId) ||
      (vars.clientId && l.clientId.toLowerCase() === String(vars.clientId).toLowerCase()),
  );
  return {
    developerLicenses: {
      __typename: 'DeveloperLicenseConnection',
      totalCount: licenses.length,
      pageInfo: PAGE_INFO,
      nodes: licenses,
    },
    developerLicense: byVars ?? LICENSES[0],
    vehicles: {
      __typename: 'VehicleConnection',
      totalCount: VEHICLES.length,
      pageInfo: PAGE_INFO,
      nodes: VEHICLES,
    },
  };
};
