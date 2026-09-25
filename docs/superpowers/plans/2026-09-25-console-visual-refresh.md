# Console Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle console.dimo.org in the DIMO Fleet / Driver design language (Euclid Circular A, cool blue-black surfaces, sky→mint gradient, generous radii) in dark and light themes, with no behavior or data changes.

**Architecture:** Color roles become CSS custom properties (RGB channels) on `<html data-theme>`, and Tailwind color names point at them, so components stay class-based and a theme switch is one attribute. Old Tailwind color names are kept as temporary aliases onto the new tokens so the whole app re-themes on day one and every commit builds; the aliases and Tailwind's default palettes are removed in the last task, which makes leftovers a build error. A Playwright harness against a local mock of the console API screenshots every route before and after, in both themes.

**Tech Stack:** Next.js 15 App Router, Tailwind 3.4 (`@apply` in plain `.css` files), React 18, Jest + React Testing Library, Playwright (dev-only), Node 20.

**Spec:** `docs/superpowers/specs/2026-09-25-console-visual-refresh-design.md`. Values come from fleet-lite-app `docs/DESIGN.md` and `web/src/global-styles.ts`; when the spec is silent, do what fleet does.

## Global Constraints

- Branch `console-visual-refresh` (cut from `template-editor`). Commit after every task; commit messages have no attribution trailer.
- No copy changes except casing (Title Case → sentence case) and the new "Light mode" / "Dark mode" toggle label. No logic, data-flow, API, routing or prop-contract changes (the one exception: `Button` gains a typed `variant` prop, Task 6).
- No hex colors in components. Allowed only in `src/app/globals.css`, the brand-logo icons `GoogleIcon.tsx` / `GitHubIcon.tsx`, and data values (e.g. a brand's `primaryColor` default) marked with a trailing `// token-check:allow` comment.
- Token names (Tailwind): surfaces `canvas` `sheet` `card` `control` `highest` `bright` `overlay`; lines `outline` `outline-strong` `sheet-border`; text `ink` `fg` `muted`; accent `accent` `accent-ink` `on-accent` `accent-soft` `accent-soft-strong` `sky`; status `positive` `warning` `negative` `negative-soft` `favorite`; nav `nav-hover` `nav-active`; `scrim`. (The spec's "body" text color is named `fg` here because `text-body` is the font size.)
- Type scale (Tailwind `fontSize`): `text-title` 600 20/28 −0.01em · `text-card-title` 600 15/22 · `text-panel-title` 600 17/24 · `text-metric` 600 40/44 −0.03em · `text-body` 400 15/22 · `text-body-sm` 400 14/20 · `text-label` 500 12/16 · `text-code` 13/20.
- Radii: `rounded-chip` 6px · `rounded-control` 10px · `rounded-card` 16px · `rounded-panel` 20px · `rounded-full`.
- Mint (`accent`, `bg-brand-gradient`) only for primary actions, selected/active state, and live/online status. Never decoration.
- Selected / toggled state = `bg-accent-soft-strong text-accent-ink`, never a white slab.
- Sentence case; no `uppercase`, no positive letter-spacing (`tracking-wide*`, `tracking-[0.x em]`). Negative tracking comes only from the type scale.
- Monospace (`font-mono text-code`) only for API keys, client IDs, JWTs, private/public keys, CEL expressions, payloads and code views. Token ids, VINs and counts use Euclid (tabular figures are on globally).
- Theme storage key `dimo-theme`; default dark; value `light` or absent.
- Jest baseline on `template-editor` (2026-09-25): 19 suites / 20 tests already fail. "Tests pass" in this plan means **no suite fails that is not in this list**:
  `AppCardComponent`, `Header`, `Icons/IntegrationIcon`, `Icons/SettingsIcon`, `Icons/WalletIcon`, `Menu`, `MenuItem`, `SignInButton`, `SignInButtons`, `Table`, `TokenInput`, `config/index`, `RedirectUriForm`, `RedirectUriList`, `TeamManagement`, `BrandRow`, `utils/webhook`, `VehicleSimulator`, `src/test.js`. Snapshot updates are reviewed file by file, never bulk-accepted without looking.
- Harness ports: mock console API `:3001` (fixed, it is the dev `backendUrl`), console `:3000`.

## Review Focus

1. **Light theme on first paint.** Reloading with `dimo-theme=light` must render light immediately (no dark flash) and log no hydration error. Pinned by the `THEME_INIT_SCRIPT` unit test (Task 2) and the harness failing on any hydration console error (Task 1).
2. **A token defined for one theme but not the other.** A missing light value silently shows the dark color. Pinned by the token-parity test (Task 2).
3. **Contrast in light mode.** Mint text on white fails AA; secondary and status text are borderline. Pinned by the WCAG contrast test over token pairs (Task 2).
4. **Overlays in light mode** (modals, menus, toasts render in portals). Tokens live on `:root` so portals inherit them. Pinned by the harness `app-create-modal` state (Task 1, checked in Task 9).
5. **Phone width.** The inset sheet and the full-screen menu at 390px. Pinned by mobile screenshots of every route plus the `app-mobile-menu` state (Task 1, checked in Task 5).

## Legacy → token class map

Every sweep task (5–9, 11–15) applies this map to the files it owns. The **Owns** list of a task is the only set of files it may edit.

| Legacy                                                                                                                                   | Replace with                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `text-white`                                                                                                                             | `text-ink` for titles, values and emphasis; `text-fg` for body text                       |
| `text-black` (on white buttons/selected)                                                                                                 | handled by `Button` `variant` or `text-accent-ink` on selected                            |
| `bg-white` as button / selected fill                                                                                                     | `Button` `variant="primary"`; selected = `bg-accent-soft-strong text-accent-ink`          |
| `bg-black`                                                                                                                               | `bg-canvas`                                                                               |
| `bg-black/50`, `bg-black bg-opacity-50`, `bg-black/60`                                                                                   | `bg-scrim`                                                                                |
| `text-text-secondary`, `text-grey-200…500`, `text-gray-400/500`, `text-white/50`, `text-[#BABABA]`, `text-neutral-500`, `text-[#6B6E6E]` | `text-muted`                                                                              |
| `text-grey-50/100`, `text-gray-900`                                                                                                      | `text-fg`                                                                                 |
| `bg-surface-default` inside the page                                                                                                     | `bg-card` (a panel on the sheet)                                                          |
| `bg-surface-raised`, `bg-[#201C1E]`                                                                                                      | `bg-card`                                                                                 |
| `bg-surface-sunken`, `bg-[#0A0508]`, `bg-[#141012]`                                                                                      | `bg-sheet` when it is a well inside a card; `bg-canvas` when it is behind everything      |
| `bg-cta-default`, `bg-[#322D2F]`, `bg-dark-grey-950`, `bg-dark-grey-800`                                                                 | `bg-control`                                                                              |
| `border-[#322D2F]`, `border-cta-default`, `border-t-cta-default`, `border-grey-950`, `border-surface-raised`, `divide-dark-grey-950`     | `border-outline` / `border-t-outline` / `divide-outline`                                  |
| `hover:border-white`, `hover:bg-gray-50`                                                                                                 | `hover:bg-highest` (tonal step, not a bright border)                                      |
| `bg-red-900` as highlight / selected                                                                                                     | `bg-accent-soft-strong text-accent-ink`                                                   |
| `hover:bg-red-900`                                                                                                                       | `hover:bg-control`                                                                        |
| `text-red-400/500`, `text-feedback-error`, `ring-red-500`                                                                                | `text-negative` / `ring-negative`                                                         |
| `bg-feedback-error`                                                                                                                      | `bg-negative-soft text-negative`                                                          |
| `bg-feedback-success`, `text-green-400`                                                                                                  | `bg-positive` / `text-positive`                                                           |
| `text-primary-200/300`, `bg-primary-300`, `bg-primary-200/20`                                                                            | `text-accent-ink` / `bg-accent` / `bg-highest` (skeletons)                                |
| `text-amber-500`, `border-amber-800/60`, `bg-amber-950/20`                                                                               | `text-warning`, `border-warning/40`, `bg-warning/10`                                      |
| `bg-[#124BDB]`, `bg-[#243647]`                                                                                                           | `bg-control`                                                                              |
| `fill-white`, `stroke-white`, `fill-grey-200`, `fill-white/50`                                                                           | `fill-current` / `stroke-current` plus a text color class (`text-muted`, `text-ink`)      |
| `font-black`                                                                                                                             | `font-semibold`, or the type-scale class the element is (`text-title`, `text-card-title`) |
| `text-2xl`/`text-3xl` page or section headings                                                                                           | `text-title`                                                                              |
| `text-lg`/`text-base` + bold card titles                                                                                                 | `text-card-title`                                                                         |
| `text-xs` meta, captions, table headers                                                                                                  | `text-label`                                                                              |
| `uppercase`, `tracking-wide*`, `tracking-[0.1em+]`, `capitalize` on headers                                                              | remove                                                                                    |
| `font-mono` on labels, badges, dates, counts, token ids                                                                                  | remove (keep only on keys/code, as `font-mono text-code`)                                 |
| `rounded-lg`/`rounded-md` on controls                                                                                                    | `rounded-control`                                                                         |
| `rounded-xl`/`rounded-2xl` on cards and panels                                                                                           | `rounded-card`                                                                            |
| modal / floating panel radius                                                                                                            | `rounded-panel`                                                                           |
| small badges `rounded`                                                                                                                   | `rounded-chip`                                                                            |
| `shadow`, `shadow-lg`, `shadow-xl`                                                                                                       | `shadow-float` for floating things; none for cards                                        |
| focus `ring-indigo-500`, focus borders `border-white`                                                                                    | `focus:ring-[3px] focus:ring-accent-soft focus:border-accent`                             |

---

### Task 1: Screenshot harness and baseline

Builds a local mock of every backend the authenticated pages touch, a fake-but-valid session, a Playwright runner, and a token check script; then records the untouched "before" screenshots.

**Files:**

- Create: `scripts/visual/keys.mjs`, `scripts/visual/fixtures.mjs`, `scripts/visual/identity.mjs`, `scripts/visual/mock-server.mjs`, `scripts/visual/routes.mjs`, `scripts/visual/shoot.mjs`, `scripts/visual/harness.env`, `scripts/visual/dev.sh`, `scripts/visual/check-tokens.sh`, `scripts/visual/README.md`
- Modify: `.gitignore`, `package.json` (devDependency `playwright`, scripts `visual:dev`, `visual:shoot`, `visual:check`), `src/components/Menu/MenuButton/MenuButton.tsx` (add `aria-label="Open menu"` only; file name per `ls src/components/Menu/MenuButton`)

**Interfaces:**

- Produces: `npm run visual:dev` (mock on :3001 + console on :3000), `npm run visual:shoot -- --label=<name> [--themes=dark,light] [--viewports=desktop,mobile] [--only=<regex on route name>]` writing `scripts/visual/out/<label>/<route>--<theme>--<viewport>.png` and exiting non-zero on any failure; `npm run visual:check -- [paths…]` exiting non-zero on legacy styling. Later tasks call these exactly.

How the session works (from reading `src/middleware.ts`, `src/utils/middlewareUtils.ts`, `src/hoc/GlobalAccountProvider.tsx`): the `session-token` cookie must be an RS256 JWT that verifies against `JWT_KEY_SET_URL` with issuer `JWT_ISSUER`; middleware then calls `GET {backendUrl}/api/me` and `GET {NEXT_PUBLIC_GA_API}/api/account/:email` server-side. In the browser, `withGlobalAccounts` needs `sessionStorage.globalAccount` (`{email, role, subOrganizationId, token, expiry}`) whose `token` is a Turnkey credential bundle decryptable by the P-256 key in `localStorage.GlobalAccountEmbeddedKey`; it then calls Turnkey `list_wallets` / `get_wallet_account` and derives the ZeroDev kernel address over JSON-RPC (EntryPoint `getSenderAddress` revert). The kernel address must equal the licenses' `owner` for owner-only UI. All console-API calls are server-side, so they hit the mock server; identity GraphQL (hard-coded host) and same-origin `/api/templates*`, `/api/vehicle-signals` are fulfilled in the browser by Playwright.

- [ ] **Step 1: Install Playwright and ignore outputs**

```bash
npm i -D playwright@^1.55
npx playwright install chromium
printf '\n# visual harness\nscripts/visual/out/\nscripts/visual/.keys.json\n' >> .gitignore
```

Add to `package.json` `scripts`:

```json
"visual:dev": "bash scripts/visual/dev.sh",
"visual:shoot": "node scripts/visual/shoot.mjs",
"visual:check": "bash scripts/visual/check-tokens.sh"
```

- [ ] **Step 2: Write `scripts/visual/fixtures.mjs`**

```js
// Fixture data for the visual harness. Shapes follow the TypeScript types named
// in each comment; if a page renders wrong, compare against that type first.
import fs from 'node:fs';
import path from 'node:path';
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
    service: 'telemetry',
    metricName: 'speed',
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
    service: 'telemetry',
    metricName: 'powertrainTractionBatteryStateOfChargeCurrent',
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
// vehicleVocab.ts is a verbatim copy of a JSON schema assigned to a const.
const vocabulary = JSON.parse(
  vocabSource.slice(
    vocabSource.indexOf('{', vocabSource.indexOf('=')),
    vocabSource.lastIndexOf('}') + 1,
  ),
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
      trims: camry.trims,
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
export const identityData = (vars) => {
  const byVars = LICENSES.find(
    (l) =>
      String(l.tokenId) === String(vars.tokenId) ||
      (vars.clientId && l.clientId.toLowerCase() === String(vars.clientId).toLowerCase()),
  );
  return {
    developerLicenses: {
      __typename: 'DeveloperLicenseConnection',
      totalCount: LICENSES.length,
      pageInfo: PAGE_INFO,
      nodes: LICENSES,
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
```

- [ ] **Step 3: Write `scripts/visual/keys.mjs`**

```js
// Generates (once) the RSA key that signs the harness session JWT and a Turnkey
// credential bundle the app can decrypt. Cached in .keys.json (gitignored).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateKeyPair, exportJWK, SignJWT, decodeJwt } from 'jose';
import { generateP256KeyPair, hpkeEncrypt } from '@turnkey/crypto';
import { uint8ArrayFromHexString } from '@turnkey/encoding';
import bs58check from 'bs58check';
import { USER_EMAIL, LICENSE } from './fixtures.mjs';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.keys.json');
export const ISSUER = 'http://localhost:3001';

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

async function generate() {
  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = {
    ...(await exportJWK(publicKey)),
    kid: 'harness',
    alg: 'RS256',
    use: 'sig',
  };
  const sessionJwt = await new SignJWT({ email: USER_EMAIL })
    .setProtectedHeader({ alg: 'RS256', kid: 'harness' })
    .setIssuer(ISSUER)
    .setSubject('user-harness')
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(privateKey);
  const embedded = generateP256KeyPair();
  const credential = generateP256KeyPair();
  const credentialBundle = bs58check.encode(
    hpkeEncrypt({
      plainTextBuf: uint8ArrayFromHexString(credential.privateKey),
      targetKeyBuf: uint8ArrayFromHexString(embedded.publicKeyUncompressed),
    }),
  );
  // Only ever jwtDecode-d by the app, so it is unsigned.
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  const devJwt = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ aud: LICENSE.clientId, exp })}.`;
  return {
    publicJwk,
    sessionJwt,
    embeddedPrivateKey: embedded.privateKey,
    credentialBundle,
    devJwt,
  };
}

export async function loadKeys() {
  try {
    const keys = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (decodeJwt(keys.sessionJwt).exp * 1000 > Date.now() + 86400_000) return keys;
  } catch {
    // missing or unreadable: regenerate
  }
  const keys = await generate();
  await fs.writeFile(FILE, JSON.stringify(keys, null, 2));
  return keys;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await loadKeys();
  console.log(`[keys] ${FILE}`);
}
```

- [ ] **Step 4: Write `scripts/visual/mock-server.mjs`**

```js
// Mock of every backend the console calls server-side or via configurable hosts.
// Unhandled requests are logged so missing endpoints are easy to spot.
import http from 'node:http';
import { loadKeys } from './keys.mjs';
import * as fx from './fixtures.mjs';

const PORT = 3001;
const DCX_BALANCE = BigInt(process.env.HARNESS_DCX ?? '250') * 10n ** 18n;
const ENTRY_POINT = '0x0000000071727de22e5e9d8baf0edac6f37da032';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};
const keys = await loadKeys();

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json', ...CORS });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : null);
      } catch {
        resolve(null);
      }
    });
  });

const pad32 = (hex) => hex.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const rpc = ({ id, method, params }) => {
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'eth_chainId':
      return ok('0x13882');
    case 'eth_blockNumber':
      return ok('0x1');
    case 'eth_getCode':
      return ok('0x');
    case 'eth_call': {
      const to = params?.[0]?.to?.toLowerCase();
      if (to === ENTRY_POINT) {
        // getSenderAddress always reverts with SenderAddressResult(address).
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: 3,
            message: 'execution reverted',
            data: '0x6ca7b806' + pad32(fx.KERNEL),
          },
        };
      }
      return ok('0x' + pad32(DCX_BALANCE.toString(16)));
    }
    default:
      console.log(`[mock] unhandled rpc ${method}`);
      return ok('0x');
  }
};

const routes = [
  ['GET', /^\/keys$/, () => ({ keys: [keys.publicJwk] })],
  ['GET', /^\/api\/me$/, () => fx.USER],
  ['GET', /^\/ga\/api\/account\/[^/]+$/, () => fx.SUB_ORG],
  [
    'GET',
    /^\/api\/my\/apps$/,
    () => ({ data: fx.APPS, totalItems: fx.APPS.length, totalPages: 1 }),
  ],
  ['GET', /^\/api\/my\/workspace$/, () => fx.WORKSPACE],
  ['GET', /^\/api\/my\/workspace\/by-token\/[^/]+$/, () => fx.WORKSPACE],
  ['GET', /^\/api\/my\/workspace\/[^/]+\/brands$/, () => fx.BRANDS],
  ['GET', /^\/api\/my\/configurations$/, () => fx.CONFIGURATIONS],
  [
    'GET',
    /^\/api\/my\/configurations\/([^/]+)$/,
    (m) => ({ configuration: fx.configurationDetail(m[1]) }),
  ],
  ['GET', /^\/api\/my\/connections$/, () => ({ data: fx.CONNECTIONS })],
  [
    'GET',
    /^\/api\/my\/connections\/([^/]+)$/,
    (m) => fx.CONNECTIONS.find((c) => c.id === m[1]) ?? null,
  ],
  ['GET', /^\/api\/my\/simulated-vehicles$/, () => ({ data: fx.SIMULATED_VEHICLES })],
  [
    'GET',
    /^\/api\/my\/team\/collaborator$/,
    () => ({
      data: fx.COLLABORATORS,
      totalItems: fx.COLLABORATORS.length,
      totalPages: 1,
    }),
  ],
  ['GET', /^\/api\/crypto\/[^/]+$/, () => fx.CRYPTO_PRICE],
  ['POST', /^\/turnkey\/public\/v1\/query\/list_wallets$/, () => fx.TK_WALLETS],
  [
    'POST',
    /^\/turnkey\/public\/v1\/query\/get_wallet_account$/,
    () => fx.TK_WALLET_ACCOUNT,
  ],
  ['POST', /^\/turnkey\/public\/v1\/query\/list_private_keys$/, () => fx.TK_PRIVATE_KEYS],
  ['GET', /^\/events\/(?:v1\/)?webhooks$/, () => fx.WEBHOOKS],
  ['GET', /^\/events\/(?:v1\/)?webhooks\/[^/]+$/, () => fx.WEBHOOK_ASSETS],
];

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      return res.end();
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (/^\/(rpc|bundler|paymaster)/.test(url.pathname)) {
      const body = await readBody(req);
      return send(res, 200, Array.isArray(body) ? body.map(rpc) : rpc(body ?? {}));
    }
    for (const [method, re, handler] of routes) {
      const m = url.pathname.match(re);
      if (m && req.method === method) return send(res, 200, handler(m, url));
    }
    console.log(`[mock] unhandled ${req.method} ${url.pathname}${url.search}`);
    send(res, 404, { message: 'not mocked' });
  })
  .listen(PORT, () => console.log(`[mock] listening on http://localhost:${PORT}`));
```

- [ ] **Step 5: Write `scripts/visual/identity.mjs`**

```js
import { identityData } from './fixtures.mjs';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

// Fulfils identity-api GraphQL requests from the browser.
export async function identityHandler(route) {
  const request = route.request();
  if (request.method() === 'OPTIONS')
    return route.fulfill({ status: 204, headers: CORS });
  const body = request.postDataJSON();
  const ops = Array.isArray(body) ? body : [body];
  const results = ops.map((op) => ({ data: identityData(op?.variables ?? {}) }));
  return route.fulfill({
    status: 200,
    headers: CORS,
    json: Array.isArray(body) ? results : results[0],
  });
}
```

- [ ] **Step 6: Write `scripts/visual/routes.mjs`**

`ready` is text that only appears once the page's main content (not a loader, empty or error state) has rendered. `click` opens a state before the screenshot. `viewports` restricts a state to one viewport.

```js
import { LICENSE, CONNECTIONS, WEBHOOKS } from './fixtures.mjs';

const t = LICENSE.tokenId;
const c = LICENSE.clientId;

export const ROUTES = [
  { name: 'app', path: '/app', ready: LICENSE.alias },
  {
    name: 'app-create-modal',
    path: '/app',
    ready: LICENSE.alias,
    click: 'text=Create a license',
  },
  {
    name: 'app-mobile-menu',
    path: '/app',
    ready: LICENSE.alias,
    click: '[aria-label="Open menu"]',
    viewports: ['mobile'],
  },
  { name: 'license-details', path: `/license/${t}/details`, ready: LICENSE.alias },
  {
    name: 'license-configurator',
    path: `/license/${t}/configurator`,
    ready: 'Fleet onboarding',
  },
  {
    name: 'license-configurator-new',
    path: `/license/${t}/configurator/new`,
    ready: null,
  },
  {
    name: 'license-configurator-edit',
    path: `/license/${t}/configurator/cfg-1`,
    ready: 'Fleet onboarding',
  },
  { name: 'license-vehicles', path: `/license/vehicles/${c}`, ready: 'Model 3' },
  { name: 'connections', path: '/connections', ready: CONNECTIONS[0].name },
  {
    name: 'connection-details',
    path: `/connections/${CONNECTIONS[0].id}`,
    ready: CONNECTIONS[0].name,
  },
  {
    name: 'connection-create',
    path: '/connections/create/0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    ready: null,
  },
  { name: 'webhooks', path: '/webhooks', ready: WEBHOOKS[0].displayName },
  { name: 'webhook-create', path: `/webhooks/create/${c}`, ready: null },
  {
    name: 'webhook-edit',
    path: `/webhooks/edit/${c}/${WEBHOOKS[0].id}`,
    ready: WEBHOOKS[0].targetURL,
  },
  { name: 'templates', path: '/templates', ready: null },
  { name: 'template-edit', path: '/templates/toyota_camry_2020', ready: 'Camry' },
  { name: 'template-new', path: '/templates/new', ready: null },
  { name: 'explorer', path: '/explorer', ready: 'Model 3' },
  { name: 'explorer-vehicle', path: '/explorer/190231', ready: null },
  { name: 'settings', path: '/settings', ready: 'sam@harness.dev' },
  { name: 'support', path: '/support', ready: null },
  { name: 'sign-in', path: '/sign-in', ready: null, guest: true },
  { name: 'sign-up', path: '/sign-up', ready: null, guest: true },
  {
    name: 'sign-up-build-for',
    path: '/sign-up?flow=build-for',
    ready: null,
    guest: true,
  },
  { name: 'email-recovery', path: '/email-recovery', ready: null, guest: true },
];
```

- [ ] **Step 7: Write `scripts/visual/shoot.mjs`**

```js
// Screenshots every harness route. Usage:
//   node scripts/visual/shoot.mjs --label=after [--themes=dark,light] [--viewports=desktop,mobile] [--only=<regex>]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadKeys } from './keys.mjs';
import { ROUTES } from './routes.mjs';
import * as fx from './fixtures.mjs';
import { identityHandler } from './identity.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const label = args.label ?? 'after';
const themes = (args.themes ?? 'dark,light').split(',');
const viewports = (args.viewports ?? 'desktop,mobile').split(',');
const only = args.only ? new RegExp(args.only) : null;
const BASE = args.base ?? 'http://localhost:3000';
const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', label);
await fs.mkdir(outDir, { recursive: true });
const keys = await loadKeys();
const browser = await chromium.launch();
const failures = [];

async function prepare(context, route, theme) {
  await context.route('https://identity-api.dev.dimo.zone/query', identityHandler);
  await context.route(/\/api\/templates\?/, (r) =>
    r.fulfill({ json: fx.TEMPLATE_SEARCH }),
  );
  await context.route(/\/api\/templates\/[^/?]+/, (r) =>
    r.fulfill({ json: fx.TEMPLATE_DETAIL }),
  );
  await context.route(/\/api\/vehicle-signals/, (r) =>
    r.fulfill({ json: fx.VEHICLE_SIGNALS }),
  );
  await context.addInitScript((t) => {
    if (t === 'light') localStorage.setItem('dimo-theme', 'light');
  }, theme);
  if (route.guest) return;
  await context.addCookies([
    {
      name: 'session-token',
      value: keys.sessionJwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await context.addInitScript(
    ({ session, embedded, devJwtKey, devJwts }) => {
      sessionStorage.setItem('globalAccount', JSON.stringify(session));
      localStorage.setItem('GlobalAccountEmbeddedKey', JSON.stringify(embedded));
      localStorage.setItem(devJwtKey, JSON.stringify(devJwts));
    },
    {
      session: {
        email: fx.USER_EMAIL,
        role: 'OWNER',
        subOrganizationId: fx.SUB_ORG.subOrganizationId,
        token: keys.credentialBundle,
        expiry: Math.floor(Date.now() / 1000) + 86400,
      },
      embedded: keys.embeddedPrivateKey,
      devJwtKey: `devJwt_${fx.LICENSE.clientId}_list_v1`,
      devJwts: [{ token: keys.devJwt, createdAt: Date.now() }],
    },
  );
}

async function shootOnce(route, theme, vp, file) {
  const context = await browser.newContext({ viewport: SIZES[vp], bypassCSP: true });
  await prepare(context, route, theme);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /hydrat|did not match/i.test(m.text()))
      consoleErrors.push(m.text());
  });
  try {
    await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 90_000 });
    const expected = new URL(BASE + route.path).pathname;
    if (new URL(page.url()).pathname !== expected)
      throw new Error(`redirected to ${page.url()}`);
    if (route.ready)
      await page.getByText(route.ready).first().waitFor({ timeout: 30_000 });
    if (route.click) {
      await page.locator(route.click).first().click();
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(400);
    if (consoleErrors.length)
      throw new Error(`hydration error: ${consoleErrors[0].slice(0, 160)}`);
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    await page
      .screenshot({ path: file.replace(/\.png$/, '.FAILED.png'), fullPage: true })
      .catch(() => {});
    throw e;
  } finally {
    await context.close();
  }
}

for (const route of ROUTES) {
  if (only && !only.test(route.name)) continue;
  for (const theme of themes) {
    for (const vp of viewports) {
      if (route.viewports && !route.viewports.includes(vp)) continue;
      const file = path.join(outDir, `${route.name}--${theme}--${vp}.png`);
      let error;
      // One retry: another agent's save can hot-reload the shared dev server mid-run.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await shootOnce(route, theme, vp, file);
          error = null;
          break;
        } catch (e) {
          error = e;
        }
      }
      if (error)
        failures.push(`${route.name} ${theme} ${vp}: ${error.message.split('\n')[0]}`);
      console.log(`${error ? '✗' : '✓'} ${route.name} ${theme} ${vp}`);
    }
  }
}
await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed:\n${failures.join('\n')}`);
  process.exit(1);
}
```

- [ ] **Step 8: Write `scripts/visual/harness.env` and `scripts/visual/dev.sh`**

`scripts/visual/harness.env`:

```
VERCEL_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
JWT_KEY_SET_URL=http://localhost:3001/keys
JWT_ISSUER=http://localhost:3001
NEXT_PUBLIC_GA_API=http://localhost:3001/ga
NEXT_PUBLIC_TURNKEY_API_BASE_URL=http://localhost:3001/turnkey
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=org-harness
NEXT_PUBLIC_RPID=localhost
NEXT_PUBLIC_RPC_URL=http://localhost:3001/rpc
NEXT_PUBLIC_BUNDLER_RPC=http://localhost:3001/bundler/
NEXT_PUBLIC_PAYMASTER_RPC=http://localhost:3001/paymaster/
NEXT_PUBLIC_EVENTS_API_URL=http://localhost:3001/events
NEXT_PUBLIC_DIMO_AUTH_URL=http://localhost:3001/auth
CREDIT_TRACKER_URL=http://localhost:3001/credits
NEXT_PUBLIC_SENTRY_DSN=
```

`scripts/visual/dev.sh`:

```bash
#!/usr/bin/env bash
# Starts the mock backend (:3001) and the console (:3000) wired to it.
# Process env beats .env.local in Next, so harness.env wins over real config.
set -euo pipefail
cd "$(dirname "$0")/../.."
node scripts/visual/keys.mjs
node scripts/visual/mock-server.mjs &
MOCK=$!
trap 'kill $MOCK 2>/dev/null' EXIT
set -a
source scripts/visual/harness.env
set +a
npx next dev -p 3000
```

- [ ] **Step 9: Write `scripts/visual/check-tokens.sh`**

```bash
#!/usr/bin/env bash
# Fails when styling under the given paths (default: src) still uses pre-refresh
# colors, casing, fonts or button variants. Append `token-check:allow` to a line
# that legitimately needs a hex value (brand logos, stored data).
set -uo pipefail
cd "$(dirname "$0")/../.."
if [ $# -eq 0 ]; then set -- src; fi

fail=0
check() {
  local name=$1 pattern=$2 hits
  hits=$(grep -rnE --include='*.css' --include='*.ts' --include='*.tsx' \
    --exclude-dir=gql --exclude-dir=generated --exclude-dir=__fixtures__ --exclude-dir=__tests__ \
    --exclude=globals.css --exclude=GoogleIcon.tsx --exclude=GitHubIcon.tsx \
    "$pattern" "$@" | grep -v 'token-check:allow')
  if [ -n "$hits" ]; then
    echo "✗ $name ($(echo "$hits" | wc -l | tr -d ' '))"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    echo "✓ $name"
  fi
}

check 'hex color literals' '#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?\b'
check 'legacy palette classes' '\b(bg|text|border|border-t|border-b|divide|ring|fill|stroke|from|via|to|placeholder|decoration)-(surface|cta|feedback|text|border|grey|dark-grey|dark|primary|red|gray|slate|zinc|neutral|stone|amber|green|blue|indigo|yellow|orange|emerald|teal|cyan|sky-[0-9]|violet|purple|pink|rose|lime|fuchsia|white|black)\b'
check 'uppercase / positive tracking' '\buppercase\b|\btracking-(wide|wider|widest|\[0?\.[0-9]+em\]|\[[0-9.]+px\])'
check 'legacy button variants' '\b(primary-outline|white-outline|table-action-button|primary-solid|error-outline|error-simple|secondary-border-color)\b'
check 'removed fonts' 'gtSuper|Universal-Sans|GT-Super'
exit $fail
```

```bash
chmod +x scripts/visual/check-tokens.sh scripts/visual/dev.sh
```

- [ ] **Step 10: Give the mobile menu button an accessible name**

In `src/components/Menu/MenuButton/*.tsx`, add `aria-label="Open menu"` to the `<button>` (no visible change). This is also the harness's click target.

- [ ] **Step 11: Write `scripts/visual/README.md`**

```markdown
# Visual harness

Renders every console route against a local mock backend, for before/after
screenshots of styling work. Dev-only; nothing here ships.

    npm run visual:dev                      # mock :3001 + console :3000 (leave running)
    npm run visual:shoot -- --label=after   # all routes, dark+light, desktop+mobile
    npm run visual:shoot -- --label=wip --only='^license' --themes=light
    npm run visual:check -- src/app/license # legacy colors/casing in those paths

Output: scripts/visual/out/<label>/<route>--<theme>--<viewport>.png. A failed
shot is saved as \*.FAILED.png and the run exits 1.

`HARNESS_DCX=0 npm run visual:dev` makes the DCX balance zero, which shows the
onboarding banner on /app. Unhandled backend calls are logged by the mock as
`[mock] unhandled …`.
```

- [ ] **Step 12: Bring the harness up and make every route render**

Run in one terminal: `npm run visual:dev`. Wait for `Ready` from Next.
Run in another: `npm run visual:shoot -- --label=smoke --themes=dark --viewports=desktop`

Expected: every line `✓`. If a route fails, open its `.FAILED.png` and the mock log, then fix the harness (never app code):

- Redirect to `/sign-in` or a 500 → session: check `.keys.json` exists, the mock served `/keys`, and `/api/me` + `/ga/api/account/…` were hit.
- Licenses missing on `/app` → `currentUser` never resolved: look for `[mock] unhandled rpc …` and add that method to `rpc()`; confirm the EntryPoint revert shape (viem expects the revert data on `error.data`).
- `ready` text never appears but the page is correct → the text differs from the fixture; change `ready` to text actually on the page.
- A "Something went wrong" modal on license details → `list_private_keys` address must equal a `signers` address exactly (both use `SIGNER`).

Then open `smoke/app--dark--desktop.png`, `license-details--dark--desktop.png` and `settings--dark--desktop.png` and confirm real content (the license alias, signers, collaborators) is on screen.

- [ ] **Step 13: Record the baseline**

```bash
npm run visual:shoot -- --label=before --themes=dark
npm run visual:check > scripts/visual/out/before/check-tokens.txt; true
npm test -- --silent 2>&1 | grep -E '^FAIL' | sort -u > scripts/visual/out/before/jest-fail.txt
```

Expected: all `✓`; `jest-fail.txt` lists exactly the 19 suites in Global Constraints.

- [ ] **Step 14: Commit**

```bash
git add .gitignore package.json package-lock.json scripts/visual src/components/Menu/MenuButton
git commit -m "Add a mocked-backend screenshot harness for styling work"
```

---

### Task 2: Token layer, Tailwind mapping and theme switching

**Files:**

- Create: `src/utils/theme.ts`, `src/context/ThemeContext.tsx`, `__tests__/unit/utils/theme.test.ts`, `__tests__/unit/utils/tokens.test.ts`, `__tests__/unit/context/ThemeContext.test.tsx`
- Modify: `src/app/globals.css` (full rewrite), `tailwind.config.ts` (full rewrite), `src/layouts/RootLayout/RootLayout.tsx`

**Interfaces:**

- Produces: `type Theme = 'dark' | 'light'`; `THEME_STORAGE_KEY = 'dimo-theme'`; `readStoredTheme(): Theme`; `applyTheme(theme: Theme): void`; `THEME_INIT_SCRIPT: string` from `@/utils/theme`. `ThemeProvider`, `useTheme(): { theme: Theme; setTheme(t: Theme): void; toggleTheme(): void }` from `@/context/ThemeContext`. Tailwind names and type/radius scale exactly as in Global Constraints.

- [ ] **Step 1: Write the failing theme tests**

`__tests__/unit/utils/theme.test.ts`:

```ts
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
} from '@/utils/theme';

describe('theme utils', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to dark when nothing is stored', () => {
    expect(readStoredTheme()).toBe('dark');
  });

  it('reads a stored light theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme()).toBe('light');
  });

  it('treats an unknown stored value as dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredTheme()).toBe('dark');
  });

  it('applies light to <html> and remembers it', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('applies dark and forgets the stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('pre-paint script sets the stored theme before React runs', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('pre-paint script falls back to dark when storage throws', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
    spy.mockRestore();
  });
});
```

`__tests__/unit/utils/tokens.test.ts` (reads `globals.css` as text; pins parity and contrast):

```ts
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

const block = (theme: string) => {
  // Prettier normalises selector quotes, so accept either.
  const match = new RegExp(`:root\\[data-theme=['"]${theme}['"]\\]`).exec(css);
  if (!match) throw new Error(`missing ${theme} token block`);
  const open = css.indexOf('{', match.index);
  return css.slice(open + 1, css.indexOf('}', open));
};
const channels = (body: string) =>
  Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map((m) => [
      m[1],
      [Number(m[2]), Number(m[3]), Number(m[4])] as const,
    ]),
  );
const allVars = (body: string) =>
  [...body.matchAll(/--([\w-]+):/g)].map((m) => m[1]).sort();

const dark = block('dark');
const light = block('light');
const themes = { dark: channels(dark), light: channels(light) };

const luminance = ([r, g, b]: readonly number[]) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('design tokens', () => {
  it('defines the same variables in dark and light', () => {
    expect(allVars(light)).toEqual(allVars(dark));
  });

  it.each(['dark', 'light'] as const)(
    '%s text meets WCAG AA on its surfaces',
    (theme) => {
      const t = themes[theme];
      const pairs: [string, string][] = [
        ['fg', 'sheet'],
        ['fg', 'card'],
        ['ink', 'canvas'],
        ['muted', 'sheet'],
        ['muted', 'card'],
        ['accent-ink', 'sheet'],
        ['accent-ink', 'card'],
        ['on-accent', 'accent'],
        ['negative', 'sheet'],
        ['negative', 'negative-soft'],
        ['positive', 'sheet'],
        ['warning', 'sheet'],
      ];
      for (const [fg, bg] of pairs) {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(t[fg], t[bg]) >= 4.5 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      }
    },
  );
});
```

`__tests__/unit/context/ThemeContext.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

const Probe = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('starts from the stored theme and toggles the document', () => {
    localStorage.setItem('dimo-theme', 'light');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('light');
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('dimo-theme')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx jest __tests__/unit/utils/theme.test.ts __tests__/unit/utils/tokens.test.ts __tests__/unit/context/ThemeContext.test.tsx`
Expected: FAIL — `Cannot find module '@/utils/theme'` / `'@/context/ThemeContext'`, and `missing dark token block`.

- [ ] **Step 3: Write `src/utils/theme.ts`**

```ts
export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'dimo-theme';

export const readStoredTheme = (): Theme => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    if (theme === 'light') localStorage.setItem(THEME_STORAGE_KEY, 'light');
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: the theme still applies for this page view.
  }
};

// Runs in <head> before first paint so a light page never flashes dark.
export const THEME_INIT_SCRIPT = `(function(){var t='dark';try{if(localStorage.getItem('${THEME_STORAGE_KEY}')==='light')t='light';}catch(e){}document.documentElement.dataset.theme=t;})();`;
```

- [ ] **Step 4: Write `src/context/ThemeContext.tsx`**

```tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { applyTheme, readStoredTheme, type Theme } from '@/utils/theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('dark');

  // The pre-paint script already set <html data-theme>; this syncs React to it.
  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

In `ThemeProvider`, the initial `useState('dark')` followed by the effect is deliberate: the server renders dark, and the attribute (not React state) drives colors, so no hydration mismatch occurs in the DOM React owns.

- [ ] **Step 5: Rewrite `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/*
 * Design tokens. Values match fleet-lite-app web/src/global-styles.ts.
 * Colors are RGB channels so Tailwind opacity modifiers work (bg-card/60).
 * Every variable must exist in both themes (tokens.test.ts enforces it).
 */
:root,
:root[data-theme='dark'] {
  color-scheme: dark;

  --canvas: 14 15 17; /* #0E0F11 */
  --sheet: 22 24 27; /* #16181B */
  --card: 28 31 34; /* #1C1F22 */
  --control: 39 42 46; /* #272A2E */
  --highest: 48 52 56; /* #303438 */
  --bright: 58 62 66; /* #3A3E42 */
  --overlay: 28 31 34; /* #1C1F22 */
  --outline: 42 46 50; /* #2A2E32 */
  --outline-strong: 92 96 99; /* #5C6063 */
  --ink: 246 247 247; /* #F6F7F7 */
  --fg: 237 238 238; /* #EDEEEE */
  --muted: 160 163 162; /* #A0A3A2 */
  --accent: 70 241 228; /* #46F1E4 */
  --accent-ink: 70 241 228; /* #46F1E4 */
  --on-accent: 6 32 30; /* #06201E */
  --sky: 140 208 255; /* #8CD0FF */
  --positive: 54 223 113; /* #36DF71 */
  --warning: 255 172 96; /* #FFAC60 */
  --negative: 255 96 96; /* #FF6060 */
  --negative-soft: 64 35 33; /* #402321 */
  --favorite: 255 205 41; /* #FFCD29 */
  --nav-active: 36 39 43; /* #24272B */

  --accent-soft: rgba(70, 241, 228, 0.12);
  --accent-soft-strong: rgba(70, 241, 228, 0.28);
  --nav-hover: #16181b;
  --sheet-border: rgba(255, 255, 255, 0.06);
  --scrim: rgba(8, 9, 10, 0.62);
  --brand-gradient: linear-gradient(105deg, #8cd0ff 0%, #46f1e4 100%);
  --brand-glow:
    radial-gradient(60% 50% at 35% 40%, rgba(140, 208, 255, 0.12), transparent 70%),
    radial-gradient(55% 50% at 65% 60%, rgba(70, 241, 228, 0.1), transparent 70%);
  --shadow-float:
    0 16px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
}

:root[data-theme='light'] {
  color-scheme: light;

  --canvas: 231 233 233; /* #E7E9E9 */
  --sheet: 255 255 255; /* #FFFFFF */
  --card: 246 247 247; /* #F6F7F7 */
  --control: 233 235 235; /* #E9EBEB */
  --highest: 223 226 226; /* #DFE2E2 */
  --bright: 255 255 255; /* #FFFFFF */
  --overlay: 255 255 255; /* #FFFFFF */
  --outline: 225 228 228; /* #E1E4E4 */
  --outline-strong: 160 163 162; /* #A0A3A2 */
  --ink: 19 20 23; /* #131417 */
  --fg: 19 20 23; /* #131417 */
  --muted: 94 97 99; /* #5E6163 */
  --accent: 34 199 186; /* #22C7BA */
  --accent-ink: 11 122 114; /* #0B7A72 */
  --on-accent: 6 32 30; /* #06201E */
  --sky: 43 130 213; /* #2B82D5 */
  --positive: 27 136 66; /* #1B8842 */
  --warning: 183 91 10; /* #B75B0A */
  --negative: 199 0 0; /* #C70000 */
  --negative-soft: 255 240 240; /* #FFF0F0 */
  --favorite: 201 154 0; /* #C99A00 */
  --nav-active: 255 255 255; /* #FFFFFF */

  --accent-soft: rgba(34, 199, 186, 0.14);
  --accent-soft-strong: rgba(34, 199, 186, 0.3);
  --nav-hover: rgba(255, 255, 255, 0.55);
  --sheet-border: rgba(19, 20, 23, 0.06);
  --scrim: rgba(19, 20, 23, 0.32);
  --brand-gradient: linear-gradient(105deg, #8cd0ff 0%, #46f1e4 100%);
  --brand-glow:
    radial-gradient(60% 50% at 35% 40%, rgba(140, 208, 255, 0.28), transparent 70%),
    radial-gradient(55% 50% at 65% 60%, rgba(70, 241, 228, 0.22), transparent 70%);
  --shadow-float:
    0 16px 40px -14px rgba(19, 20, 23, 0.22), 0 0 0 1px rgba(19, 20, 23, 0.06);
  --shadow-sm: 0 1px 2px rgba(19, 20, 23, 0.12);
}

@layer base {
  html,
  body {
    @apply bg-canvas text-fg;
  }

  body {
    @apply text-body-sm antialiased;
    font-feature-settings: 'tnum';
  }
}

.content {
  @apply flex flex-row;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

The dark block's bare `:root` selector makes dark the default before the script runs. Use double quotes in selectors: the pre-commit hook runs Prettier, which rewrites single quotes (the test accepts either).

- [ ] **Step 6: Rewrite `tailwind.config.ts` (tokens + temporary legacy aliases)**

```ts
import type { Config } from 'tailwindcss';

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Pre-refresh color names, pointed at the nearest new token so every page
// re-themes at once. Deleted in the palette-lock task; do not use in new code.
const legacyAliases = {
  surface: { default: token('sheet'), sunken: token('canvas'), raised: token('card') },
  cta: { default: token('control'), disabled: token('muted') },
  border: { disabled: token('outline') },
  text: { secondary: token('muted') },
  feedback: { success: token('positive'), error: token('negative') },
  ...Object.fromEntries(
    ['grey', 'dark-grey', 'dark'].map((ramp) => [
      ramp,
      {
        '50': token('fg'),
        '100': token('fg'),
        '200': token('muted'),
        '300': token('muted'),
        '400': token('muted'),
        '500': token('muted'),
        '600': token('muted'),
        '700': token('muted'),
        '800': token('outline'),
        '900': token('outline'),
        '950': token('outline'),
      },
    ]),
  ),
  primary: {
    '50': token('accent'),
    '100': token('accent'),
    '200': token('accent'),
    '300': token('accent'),
    '400': token('accent'),
    '500': token('accent-ink'),
    '600': token('accent-ink'),
    '700': token('accent-ink'),
    '800': token('accent-ink'),
    '900': token('accent-ink'),
    '950': token('accent-ink'),
  },
  red: {
    '50': token('negative'),
    '100': token('negative'),
    '200': token('negative'),
    '300': token('negative'),
    '400': token('negative'),
    '500': token('negative'),
    '600': token('negative'),
    '700': token('negative'),
    '800': token('negative-soft'),
    '900': token('negative-soft'),
    '950': token('negative-soft'),
  },
};

export const tokenColors = {
  'canvas': token('canvas'),
  'sheet': token('sheet'),
  'card': token('card'),
  'control': token('control'),
  'highest': token('highest'),
  'bright': token('bright'),
  'overlay': token('overlay'),
  'outline': token('outline'),
  'outline-strong': token('outline-strong'),
  'sheet-border': 'var(--sheet-border)',
  'ink': token('ink'),
  'fg': token('fg'),
  'muted': token('muted'),
  'accent': token('accent'),
  'accent-ink': token('accent-ink'),
  'on-accent': token('on-accent'),
  'accent-soft': 'var(--accent-soft)',
  'accent-soft-strong': 'var(--accent-soft-strong)',
  'sky': token('sky'),
  'positive': token('positive'),
  'warning': token('warning'),
  'negative': token('negative'),
  'negative-soft': token('negative-soft'),
  'favorite': token('favorite'),
  'nav-hover': 'var(--nav-hover)',
  'nav-active': token('nav-active'),
  'scrim': 'var(--scrim)',
};

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/layouts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: { ...legacyAliases, ...tokenColors },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'brand-gradient': 'var(--brand-gradient)',
        'brand-glow': 'var(--brand-glow)',
      },
      boxShadow: {
        float: 'var(--shadow-float)',
        sm: 'var(--shadow-sm)',
      },
      borderRadius: {
        chip: '6px',
        control: '10px',
        card: '16px',
        panel: '20px',
      },
      fontSize: {
        'title': [
          '20px',
          { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'card-title': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        'panel-title': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'metric': [
          '40px',
          { lineHeight: '44px', letterSpacing: '-0.03em', fontWeight: '600' },
        ],
        'body': ['15px', { lineHeight: '22px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'code': ['13px', { lineHeight: '20px' }],
      },
      fontFamily: {
        sans: [
          'var(--font-dimo)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
```

Note the added `./src/layouts/**` content glob: layouts use utility classes in TSX and were previously outside Tailwind's scan.

- [ ] **Step 7: Wire the theme into `RootLayout`**

In `src/layouts/RootLayout/RootLayout.tsx`, import `THEME_INIT_SCRIPT` from `@/utils/theme` and `ThemeProvider` from `@/context/ThemeContext`, and change the returned tree to:

```tsx
<html lang="en" data-theme="dark" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  </head>
  <body className={dimoFont.className}>
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  </body>
</html>
```

- [ ] **Step 8: Run the new tests**

Run: `npx jest __tests__/unit/utils/theme.test.ts __tests__/unit/utils/tokens.test.ts __tests__/unit/context/ThemeContext.test.tsx`
Expected: PASS (all). If a contrast pair fails, stop and report it: the values are fleet's and must not be tuned silently.

- [ ] **Step 9: Build and look**

Run: `npm run compile && npm run lint && npx next build` → all succeed.
With `npm run visual:dev` running: `npm run visual:shoot -- --label=t2 --only='^(app|license-details|settings)$' --viewports=desktop`
Expected: all `✓`. Dark shots show the cool blue-black canvas instead of warm black. Light shots will look partly broken (white text on light surfaces) — expected until the sweeps; confirm only that the canvas is light and no hydration error failed the run.

- [ ] **Step 10: Commit**

```bash
git add src/utils/theme.ts src/context/ThemeContext.tsx src/app/globals.css tailwind.config.ts src/layouts/RootLayout __tests__/unit/utils/theme.test.ts __tests__/unit/utils/tokens.test.ts __tests__/unit/context/ThemeContext.test.tsx
git commit -m "Add dark and light design tokens behind the existing Tailwind names"
```

---

### Task 3: Euclid Circular A and base type

**Files:**

- Create: `src/assets/fonts/EuclidCircularA-{Regular,Medium,Semibold,Bold}.woff2` (copied)
- Delete: `src/assets/fonts/Universal-Sans-Display-*.ttf`, `src/assets/fonts/GT-Super-Text-*.ttf`
- Modify: `src/utils/font.ts`, `src/app/sign-up/components/BuildForForm.tsx`, `src/app/sign-up/components/CompanyInfoForm.tsx`, `src/app/sign-up/components/WalletCreation/OtpSignup.tsx`, `src/app/sign-up/components/WalletCreation/NoPasskeyAccount.tsx`, `src/app/sign-up/components/WalletCreation/PasskeySignup.tsx`, `src/app/global-error.tsx` (remove any Euclid `@font-face`/font-family literal it carries; it now inherits `dimoFont`)

**Interfaces:**

- Consumes: Tailwind `fontFamily.sans` = `var(--font-dimo)` (Task 2).
- Produces: `dimoFont` (same export name) with `variable: '--font-dimo'`. `gtSuper` no longer exists.

- [ ] **Step 1: Copy fonts, delete old ones**

```bash
cp ~/workspace/fleet-lite-app/web/src/assets/fonts/EuclidCircularA-*.woff2 src/assets/fonts/
git rm -q src/assets/fonts/Universal-Sans-Display-*.ttf src/assets/fonts/GT-Super-Text-*.ttf
```

- [ ] **Step 2: Rewrite `src/utils/font.ts`**

```ts
import localFont from 'next/font/local';

// Euclid Circular A, as in the DIMO Driver app and DIMO Fleet.
export const dimoFont = localFont({
  src: [
    {
      path: './../assets/fonts/EuclidCircularA-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-dimo',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});
```

- [ ] **Step 3: Expose the variable on `<body>`**

In `RootLayout.tsx`, change `<body className={dimoFont.className}>` to `<body className={`${dimoFont.variable} ${dimoFont.className}`}>` so `font-sans` (and therefore Tailwind's preflight) resolves to Euclid everywhere, including portals.

- [ ] **Step 4: Replace `gtSuper` headings**

In each of the five sign-up files, remove `import { gtSuper } from '@/utils/font';` and change `<p className={gtSuper.className}>` to `<p className="text-title text-ink">`. Text content is unchanged.

- [ ] **Step 5: Verify**

Run: `npm run visual:check -- src | grep 'removed fonts'` → `✓ removed fonts`.
Run: `npm run compile && npx next build` → succeeds.
Harness: `npm run visual:shoot -- --label=t3 --only='^(app|sign-up-build-for)$' --themes=dark --viewports=desktop` → `✓`; text in the PNGs is Euclid (geometric round "a", no display-weight headings).

- [ ] **Step 6: Commit**

```bash
git add -A src/assets/fonts src/utils/font.ts src/layouts/RootLayout src/app/sign-up src/app/global-error.tsx
git commit -m "Switch the console to Euclid Circular A"
```

---

### Task 4: Icons follow the text color

**Files:**

- Modify: every file in `src/components/Icons/` with a hardcoded `fill="#…"` or `stroke="#…"`, except brand logos (Google, GitHub, any multi-color logo); `src/config/navigation.ts` (`iconClassName` values)
- Test: `__tests__/unit/components/Icons/currentColor.test.tsx`

**Interfaces:**

- Produces: every non-brand icon paints with `currentColor`, so `text-*` classes color it. Later tasks color icons with `text-muted` / `text-accent-ink`, never `fill-*` hex.

- [ ] **Step 1: Write the failing test**

```tsx
import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src/components/Icons');
const BRAND_LOGOS = /^(GoogleIcon|GitHubIcon)\.tsx$/;

describe('icons', () => {
  it('paint with currentColor unless they are brand logos', () => {
    const offenders = fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.tsx') && !BRAND_LOGOS.test(f))
      .filter((f) =>
        /(fill|stroke)="#[0-9A-Fa-f]{3,8}"/.test(
          fs.readFileSync(path.join(dir, f), 'utf8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx jest __tests__/unit/components/Icons/currentColor.test.tsx`
Expected: FAIL listing the icon files with hex fills (≈34 files).

- [ ] **Step 3: Convert**

List them: `grep -rlE '(fill|stroke)="#[0-9A-Fa-f]{3,8}"' src/components/Icons`. In every file except `GoogleIcon.tsx` and `GitHubIcon.tsx` (brand logos keep their colors), replace `fill="#XXXXXX"` with `fill="currentColor"` and `stroke="#XXXXXX"` with `stroke="currentColor"`. Leave `fill="none"` as is.

- [ ] **Step 4: Fix `src/config/navigation.ts` icon classes**

Replace every `iconClassName` value with `'h-5 w-5'` (drop `fill-white stroke-white stroke-1` and similar). Color now comes from the menu item's text color (Task 5).

- [ ] **Step 5: Verify**

Run: `npx jest __tests__/unit/components/Icons` → the new test passes; the three pre-existing icon failures (`IntegrationIcon`, `SettingsIcon`, `WalletIcon`) may still fail, nothing else.
Run: `npm run visual:check -- src/components/Icons src/config` → `✓ hex color literals` (the two brand logos are excluded by the script).

- [ ] **Step 6: Commit**

```bash
git add src/components/Icons src/config/navigation.ts __tests__/unit/components/Icons/currentColor.test.tsx
git commit -m "Paint icons with currentColor so they follow the theme"
```

---

### Task 5: App shell — frame, sidebar, header, guest layout, theme toggle

**Files:**

- Create: `src/components/BrandLockup/BrandLockup.tsx`, `src/components/BrandLockup/BrandLockup.css`, `src/components/BrandLockup/index.ts`, `src/components/ThemeToggle/ThemeToggle.tsx`, `src/components/ThemeToggle/index.ts`, `public/images/dimo-wordmark.png`, `public/images/dimo-mark.png`, `src/app/icon.png`
- Modify: `src/layouts/AuthorizedLayout/AuthorizedLayout.css`, `src/components/Menu/Menu.tsx`, `src/components/Menu/Menu.css`, `src/components/Menu/MenuItem/MenuItem.tsx`, `src/components/Menu/MenuItem/MenuItem.css`, `src/components/Menu/FullScreenMenu/FullScreenMenu.css`, `src/components/Menu/MenuButton/*.tsx`, `src/components/Header/Header.css`, `src/layouts/GuestLayout/GuestLayout.tsx`, `src/layouts/GuestLayout/GuestLayout.css`, `src/config/navigation.ts` (page titles to sentence case)
- Delete: `src/app/favicon.ico` (replaced by `src/app/icon.png`)
- Test: `__tests__/unit/components/ThemeToggle.test.tsx`; update `__tests__/unit/components/Menu.test.tsx`, `MenuItem.test.tsx`, `Header.test.tsx` only where they assert changed classes or casing

**Interfaces:**

- Consumes: `useTheme()` (Task 2); token classes (Task 2).
- Produces: `<BrandLockup product="Developer Console" />` (wordmark + product name; wordmark turns solid ink in light via CSS); `<ThemeToggle variant="menu" | "icon" />`. Menu item active class `is-active`.

- [ ] **Step 1: Write the failing ThemeToggle test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.clear());

  it('offers light mode from dark and switches the document', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="menu" />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Light mode' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('button', { name: 'Dark mode' })).toBeInTheDocument();
  });

  it('icon variant is labelled for screen readers', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="icon" />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument();
  });
});
```

Run: `npx jest __tests__/unit/components/ThemeToggle.test.tsx` → FAIL (module not found).

- [ ] **Step 2: Write `ThemeToggle`**

`src/components/ThemeToggle/ThemeToggle.tsx`:

```tsx
'use client';
import { type FC } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

interface IProps {
  variant: 'menu' | 'icon';
}

export const ThemeToggle: FC<IProps> = ({ variant }) => {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? SunIcon : MoonIcon;
  const label = theme === 'dark' ? 'Light mode' : 'Dark mode';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-control hover:text-ink"
      >
        <Icon className="size-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-body-sm font-medium text-muted hover:bg-nav-hover hover:text-fg"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
};
```

`src/components/ThemeToggle/index.ts`: `export * from './ThemeToggle';`

Run the test → PASS.

- [ ] **Step 3: Brand assets and `BrandLockup`**

```bash
cp ~/workspace/fleet-lite-app/web/src/assets/dimo-wordmark.png public/images/dimo-wordmark.png
cp ~/workspace/fleet-lite-app/web/src/assets/dimo-mark.png public/images/dimo-mark.png
cp public/images/dimo-mark.png src/app/icon.png
git rm -q src/app/favicon.ico
```

`src/components/BrandLockup/BrandLockup.tsx`:

```tsx
import { type FC } from 'react';
import Image from 'next/image';
import './BrandLockup.css';

interface IProps {
  product: string;
}

// "Developer Console" is a product name: shown as-is, never re-cased.
export const BrandLockup: FC<IProps> = ({ product }) => (
  <div className="brand-lockup" aria-label={`DIMO ${product}`}>
    <Image
      src="/images/dimo-wordmark.png"
      alt=""
      width={72}
      height={18}
      className="wordmark"
      priority
    />
    <span className="product">{product}</span>
  </div>
);
```

`src/components/BrandLockup/BrandLockup.css`:

```css
.brand-lockup {
  @apply flex h-8 items-center gap-2.5 px-2.5;

  .wordmark {
    @apply h-[18px] w-auto;
  }

  .product {
    @apply whitespace-nowrap border-l border-outline pl-2.5 text-[17px] font-medium leading-none text-fg;
    letter-spacing: -0.01em;
  }
}

/* The gradient wordmark is drawn for dark backgrounds; on light render it as ink. */
:root[data-theme='light'] .brand-lockup .wordmark {
  filter: brightness(0) opacity(0.88);
}
```

`src/components/BrandLockup/index.ts`: `export * from './BrandLockup';`

Check the wordmark's intrinsic aspect ratio with `file public/images/dimo-wordmark.png` and set `width`/`height` props to that ratio at 18px height.

- [ ] **Step 4: Frame — `AuthorizedLayout.css`**

```css
.main {
  @apply flex min-h-screen flex-row items-stretch bg-canvas;
}

.sidebar-container {
  @apply hidden md:sticky md:top-0 md:flex md:h-screen md:w-[244px] md:flex-shrink-0;
}

.app-content {
  @apply flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-sheet md:my-2 md:mr-2 md:h-[calc(100vh-16px)] md:rounded-panel md:border md:border-sheet-border;
}

.header-container {
  @apply flex h-[72px] flex-shrink-0 flex-row items-center gap-2 px-4 md:px-6;
}

.menu-header-button {
  @apply md:hidden;
}

.page-content {
  @apply w-full flex-1 overflow-auto px-4 pb-6 md:px-6;
}
```

- [ ] **Step 5: Sidebar — `Menu.tsx`, `Menu.css`, `MenuItem.*`, `FullScreenMenu.css`, `MenuButton`**

In `Menu.tsx`:

- Replace the `<Image src={'/images/dimo-dev.svg'} … />` with `<BrandLockup product="Developer Console" />` inside a `<div className="menu-brand">` (keep `<MenuCloseButton />` beside it). Import `BrandLockup` from `@/components/BrandLockup`.
- Change `logoutButtonConfig.iconClassName` to `'h-5 w-5'`.
- In the bottom `<ul className="bottom-menu">`, render `<li className="theme-toggle-item"><ThemeToggle variant="menu" /></li>` before the mapped items.
- In `MenuCloseButton`, change `className={'size-6 text-white'}` to `className={'size-6 text-muted'}`.

`Menu.css`:

```css
.main-menu {
  @apply flex h-full w-full flex-col justify-between px-3 py-5;

  .menu-brand {
    @apply mb-7 flex flex-row items-center justify-between;
  }

  ul {
    @apply flex flex-col gap-0.5;
  }

  .theme-toggle-item {
    @apply list-none;
  }
}
```

`MenuItem.tsx`: replace the `classNames({...})` on `<li>` with `classNames('menu-item', { 'is-disabled': disabled, 'is-active': isHighlighted })`, and render the icon as `<Icon className={classNames(iconClassName, 'menu-item-icon')} />`.

`MenuItem.css`:

```css
.main-menu .menu-item {
  @apply flex h-10 flex-row items-center gap-3 rounded-control px-3 text-body-sm font-medium text-muted transition-colors;

  a,
  button {
    @apply flex-1 text-left;
  }

  &:hover {
    @apply bg-nav-hover text-fg;
  }

  &.is-active {
    @apply bg-nav-active text-ink;

    .menu-item-icon {
      @apply text-accent-ink;
    }
  }

  &.is-disabled {
    @apply pointer-events-none opacity-50;
  }
}
```

`FullScreenMenu.css`:

```css
.full-screen-menu-container {
  @apply fixed inset-y-0 left-0 z-50 flex w-screen bg-canvas text-fg transition-transform md:hidden;
}
```

`MenuButton`: `className` becomes `'flex size-10 items-center justify-center rounded-full text-muted hover:bg-control hover:text-ink'`.

- [ ] **Step 6: Header**

`Header.css`:

```css
.header {
  @apply flex h-[72px] w-full items-center justify-between;

  .page-title {
    @apply text-title text-ink;
  }

  .user-information {
    @apply flex flex-row items-center gap-3;

    .account-information {
      @apply items-center rounded-control bg-control p-3;
    }
  }
}
```

In `src/config/navigation.ts` sentence-case the titles: `'Create a Connection'` → `'Create a connection'`, `'Connection Details'` → `'Connection details'`, `'App Details'` → `'App details'`, `'License Details'` → `'License details'`, `'Licensed Vehicles'` → `'Licensed vehicles'`, `'API Status'` → `'API status'`, `'Data Explorer'` (title and menu label) → `'Data explorer'`. Update any test asserting these strings (`grep -rn "Connection Details\|License Details\|Licensed Vehicles\|Data Explorer\|Create a Connection" __tests__ src --include=*.test.tsx`).

- [ ] **Step 7: Guest layout**

`GuestLayout.tsx` `Layout` becomes:

```tsx
const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="guest-layout">
      <div className="guest-theme-toggle">
        <ThemeToggle variant="icon" />
      </div>
      <div className="guest-panel">
        <BrandLockup product="Developer Console" />
        {children}
      </div>
    </main>
  );
};
```

(imports: `BrandLockup`, `ThemeToggle`; remove the `dimo-dev.svg` and `car_segment.svg` images.)

`GuestLayout.css`:

```css
.guest-layout {
  @apply relative flex min-h-screen flex-col items-center justify-center bg-canvas bg-brand-glow px-4 py-12;

  .guest-theme-toggle {
    @apply absolute right-4 top-4;
  }

  .guest-panel {
    @apply flex w-full max-w-[480px] flex-col items-center gap-8 rounded-panel bg-sheet p-6 shadow-float md:p-10;
  }
}
```

- [ ] **Step 8: Verify**

Run: `npx jest __tests__/unit/components` → no new failing suites vs. baseline (update `Menu`/`MenuItem`/`Header` expectations only where they assert old classes or Title Case strings; those suites are in the baseline list — do not attempt to fix their unrelated pre-existing failures).
Run: `npm run visual:check -- src/layouts src/components/Menu src/components/Header src/components/BrandLockup src/components/ThemeToggle` → all `✓`.
Harness: `npm run visual:shoot -- --label=t5 --only='^(app|app-mobile-menu|settings|sign-in|sign-up)$'`
Expected: all `✓`. In the PNGs: sidebar sits on the canvas; content is a rounded sheet with an 8px gap; active item has the lighter pill with a mint icon; "Light mode" toggle above Logout; light shots show a light canvas, a white sheet and an ink wordmark; the mobile menu fills the screen on the canvas; guest pages show a centered panel with the lockup and a top-right toggle.

- [ ] **Step 9: Commit**

```bash
git add -A src/components/BrandLockup src/components/ThemeToggle src/components/Menu src/components/Header src/layouts public/images src/app/icon.png src/app/favicon.ico src/config/navigation.ts __tests__
git commit -m "Restyle the app frame, sidebar and guest pages; add the theme toggle"
```

---

### Task 6: Button, Card and modals

**Files:**

- Modify: `src/components/Button/Button.tsx`, `src/components/Button/Button.css`, `src/components/Card/Card.css`, `src/components/Modal/Modal.tsx`, `src/components/Modal/Modal.css`, `src/components/LoadingModal/LoadingModal.css`, `src/components/DeleteConfirmationModal/DeleteConfirmationModal.css`, `src/components/DeleteConfirmationModal/DeleteConfirmationModal.tsx`, and every file that renders `<Button className="…">` with a legacy variant (call-site migration; list with the grep in Step 5)
- Test: `__tests__/unit/components/Button.test.tsx` (extend)

**Interfaces:**

- Produces: `Button` prop `variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructive-ghost'` (default `'primary'`), rendered as classes `button <variant>`. Legacy class variants are gone after this task. Card classes: `card` (tonal `bg-card`), `card primary` (= card), `card secondary` (= `bg-sheet`), `card card-border`. Modal: `.dialog-panel` uses `bg-overlay rounded-panel shadow-float`; scrim `bg-scrim backdrop-blur-[6px]`.

- [ ] **Step 1: Write failing Button tests** (append to `__tests__/unit/components/Button.test.tsx`)

```tsx
it('is a primary button by default', () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole('button')).toHaveClass('button', 'primary');
});

it.each(['secondary', 'ghost', 'destructive', 'destructive-ghost'] as const)(
  'renders the %s variant',
  (variant) => {
    render(<Button variant={variant}>Go</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('button', variant);
    expect(button).not.toHaveClass('primary');
  },
);

it('keeps extra classes alongside the variant', () => {
  render(
    <Button variant="secondary" className="with-icon w-full">
      Go
    </Button>,
  );
  expect(screen.getByRole('button')).toHaveClass(
    'button',
    'secondary',
    'with-icon',
    'w-full',
  );
});
```

Run: `npx jest __tests__/unit/components/Button.test.tsx` → FAIL (`variant` unknown / no `primary` class).

- [ ] **Step 2: `Button.tsx`**

```tsx
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'destructive-ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
}

export const Button: FC<ButtonProps> = ({
  children,
  className: inputClassName,
  loading = false,
  variant = 'primary',
  onClick = () => {},
  ...props
}) => {
  const className = classnames('button', variant, inputClassName);
  // …rest unchanged
```

- [ ] **Step 3: `Button.css`**

```css
.button {
  @apply inline-flex h-10 min-h-10 flex-row items-center justify-center gap-2 rounded-full px-4 text-body-sm font-semibold transition-[filter,background-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-40;

  span.content {
    @apply flex flex-row items-center justify-center gap-1;
  }

  &.primary {
    @apply bg-brand-gradient text-on-accent enabled:hover:brightness-105;
  }

  &.secondary {
    @apply border border-outline bg-control text-ink enabled:hover:bg-highest;
  }

  &.ghost {
    @apply bg-transparent text-muted enabled:hover:bg-control enabled:hover:text-ink;
  }

  &.destructive {
    @apply bg-negative-soft text-negative enabled:hover:brightness-110;
  }

  &.destructive-ghost {
    @apply bg-transparent text-negative enabled:hover:bg-negative-soft;
  }

  &.with-icon {
    @apply flex flex-row gap-2;
  }
}
```

Run the Button tests → PASS.

- [ ] **Step 4: Card and modals**

`Card.css`:

```css
.card {
  @apply rounded-card bg-card p-4;

  &.card-border {
    @apply border border-outline;
  }

  &.primary {
    @apply bg-card;
  }

  &.secondary {
    @apply bg-sheet;
  }
}
```

(The old nested `.dark` rule is dropped: it targeted a descendant, not a variant, and nothing renders it — confirm with `grep -rn "Card.*dark" src`.)

`Modal.tsx`: backdrop `className="fixed inset-0 bg-scrim backdrop-blur-[6px] transition-opacity"`.

`Modal.css`:

```css
.modal-container {
  @apply fixed inset-0 z-10 flex min-h-full w-screen items-end justify-center overflow-y-auto p-4 text-left sm:items-center;

  .dialog-panel {
    @apply relative my-auto w-full min-h-[95vh] max-w-[calc(100vw-2rem)] transform overflow-hidden rounded-panel bg-overlay p-6 text-fg shadow-float transition-all md:h-auto md:min-h-0 md:w-auto md:min-w-[480px];

    .dialog-close-content {
      @apply absolute right-0 top-0 z-10 cursor-pointer pr-4 pt-4;

      .close-btn {
        @apply rounded-full p-1 text-muted hover:bg-control hover:text-ink focus:outline-none;
      }
    }

    .dialog-content {
      @apply sm:flex sm:flex-col sm:items-start;
    }

    .dialog-action-content {
      @apply mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end;
    }
  }
}
```

`LoadingModal.css`: `.description` → `@apply text-center text-card-title text-ink;`.
`DeleteConfirmationModal.css`: keep sizing, drop nothing else. In `DeleteConfirmationModal.tsx` the confirm button uses `variant="destructive"` and the cancel button `variant="secondary"`; the title uses `text-panel-title text-ink`.

- [ ] **Step 5: Migrate every legacy Button call site**

List: `grep -rn -A4 "<Button" src | grep -E "className=.*\b(primary|primary-solid|primary-outline|white|white-outline|dark|table-action-button|error|error-outline|error-simple|secondary-border-color|rounded-sm)\b"` and also `grep -rn "className = '.*\b(dark|primary-outline)" src` for defaulted props (e.g. `CreateAppButton` defaults `className = 'dark with-icon'`).

Map, removing the legacy token from `className` and adding the prop:

| Legacy class on `<Button>`                                                                  | New                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `primary`, `primary-solid`, `white`                                                         | `variant="primary"` (or omit: it is the default) |
| `dark`, `primary-outline`, `white-outline`, `table-action-button`, `secondary-border-color` | `variant="secondary"`                            |
| `error`, `error-outline`                                                                    | `variant="destructive"`                          |
| `error-simple`                                                                              | `variant="destructive-ghost"`                    |
| `rounded-sm`                                                                                | remove (all buttons are pills)                   |
| `!h-10` and other layout utilities                                                          | keep                                             |

For a component whose prop defaults a legacy class (e.g. `CreateAppButton`'s `className = 'dark with-icon'`), change the default to `'with-icon'` and pass `variant="secondary"` inside. Non-`Button` elements with `table-action-button` (pagination in `src/components/Table/*`) are handled in Task 8, not here.

This step touches files outside `src/components`; that is intentional (the variant prop is a shared contract) and happens before any pass starts.

- [ ] **Step 6: Verify**

Run: `npm run compile` → no type errors.
Run: `npm run visual:check -- src | sed -n '/legacy button variants/,/^✓\|^✗/p'` → the only remaining hits are the non-Button `table-action-button` uses in `src/components/Table`.
Run: `npx jest` → failing suites ⊆ baseline list.
Harness: `npm run visual:shoot -- --label=t6 --only='^(app|app-create-modal|settings)$' --viewports=desktop` → `✓`; "Create a license" is a gradient pill in dark and light; the create modal floats on a blurred scrim with a 20px radius, overlay surface in both themes.

- [ ] **Step 7: Commit**

```bash
git add -A src __tests__/unit/components/Button.test.tsx
git commit -m "Give Button typed variants and restyle cards and modals"
```

---

### Task 7: Form controls

**Files (Owns):** `src/components/TextField/*`, `src/components/TextArea/*`, `src/components/SelectField/*`, `src/components/SelectWithChevron/*`, `src/components/MoneyField/*`, `src/components/TokenInput/*`, `src/components/DatePicker/*`, `src/components/Label/*`, `src/components/TextError/*`, `src/components/Toggle/*`, `src/components/CheckboxField/*`, `src/components/MultiCardOption/*`, `src/components/SegmentedControl/*`, and their snapshot files under `__tests__/unit/components/__snapshots__/`

**Interfaces:**

- Consumes: tokens, `rounded-control`, focus-ring rule from the class map.
- Produces: the control look every form inherits: 40px, `bg-control`, `border border-outline`, `rounded-control`, focus `ring-[3px] ring-accent-soft border-accent`, error `border-negative`.

- [ ] **Step 1: Replace the CSS**

`TextField.css`:

```css
.text-field {
  @apply flex min-h-10 flex-row items-center rounded-control border border-outline bg-control px-3 text-fg transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft;

  input {
    @apply w-full bg-transparent text-body-sm font-normal outline-0 placeholder:text-muted;
  }
}
```

`TextArea.css`:

```css
.text-area {
  @apply flex flex-row rounded-control border border-outline bg-control px-3 py-2 text-fg focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft;

  textarea {
    @apply w-full resize-none bg-transparent text-body-sm outline-0 placeholder:text-muted;
  }
}
```

`SelectField.css`:

```css
.select-field {
  @apply relative flex min-h-10 flex-row items-center justify-between rounded-control border border-outline bg-control px-3 text-body-sm font-normal text-fg outline-0;

  .selected {
    @apply text-fg;
  }

  select {
    @apply hidden;
  }

  .custom-menu {
    @apply absolute left-0 top-full z-10 mt-1 hidden max-h-48 w-full flex-col gap-0.5 overflow-y-auto rounded-control bg-overlay p-1 text-fg shadow-float;

    &.show {
      @apply flex;
    }

    .custom-item {
      @apply cursor-pointer rounded-chip px-2.5 py-2 hover:bg-control;
    }
  }
}
```

`SelectWithChevron.css`:

```css
.select-field-input {
  @apply relative flex min-h-10 min-w-[160px] appearance-none flex-row items-center justify-between rounded-control border border-outline bg-control px-3 text-body-sm font-normal text-fg outline-0 focus:border-accent focus:ring-[3px] focus:ring-accent-soft;
}
```

`MoneyField.css`:

```css
.money-field {
  @apply flex flex-row rounded-control border border-outline bg-control px-4 py-2 text-metric text-ink outline-0;

  input {
    @apply w-full bg-transparent font-semibold outline-0 !text-metric placeholder:text-muted;
  }

  &.input-focused {
    @apply border-accent ring-[3px] ring-accent-soft;
  }
}
```

`TokenInput.css`:

```css
.dcx-input {
  @apply flex w-full flex-col items-center gap-2;

  .dcx-container {
    @apply relative flex h-14 w-3/4 flex-row items-center justify-center gap-2 rounded-control bg-control px-2;

    .action-icons {
      @apply flex h-10 w-10 items-center justify-center rounded-control bg-highest p-2 text-ink;
    }

    .dcx-value {
      @apply h-8 w-full bg-transparent text-center text-metric text-ink focus:outline-none [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none;
    }

    .amount-container {
      @apply flex flex-col items-center;

      .description {
        @apply text-label text-muted;
      }
    }
  }

  .suggest-values {
    @apply grid w-3/4 grid-cols-4 justify-center gap-2 font-semibold;

    .suggestion {
      @apply rounded-control bg-control p-2 text-ink hover:bg-highest;
    }
  }

  .dcx-description {
    @apply text-label text-muted;
  }
}
```

`Label.css`: `.label { @apply flex flex-col gap-2 text-label text-muted; }`
`TextError.css`: `.error-message { @apply text-label text-negative; }`

`Toggle.css`:

```css
.custom-toggle {
  @apply relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full;

  .base {
    @apply pointer-events-none absolute w-full rounded-full;
  }

  .bar {
    @apply pointer-events-none absolute mx-auto h-5 w-10 rounded-full transition-colors duration-200 ease-in-out;

    &.active {
      @apply bg-accent;
    }

    &.inactive {
      @apply bg-highest;
    }
  }

  .dot {
    @apply pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full shadow-sm transition-transform duration-200 ease-in-out;

    &.active {
      @apply translate-x-5 bg-on-accent;
    }

    &.inactive {
      @apply translate-x-0 bg-ink;
    }
  }
}
```

`CheckboxField.css`:

```css
.checkbox {
  @apply h-4 w-4 rounded-[4px] border-outline-strong;
  accent-color: rgb(var(--accent));

  &.required {
    @apply ring-2 ring-negative;
  }
}
```

`MultiCardOption/Option.css`:

```css
.option-card {
  @apply flex cursor-pointer flex-row items-center justify-between rounded-card bg-card p-4 transition-colors hover:bg-control;

  &.selected,
  &[aria-checked='true'] {
    @apply bg-accent-soft-strong text-accent-ink;
  }
}
```

(Open `Option.tsx`: if it marks selection with a different class, use that class name in the rule above instead of `.selected`; do not change the TSX logic.)

`SegmentedControl.css`:

```css
.segmented-control {
  @apply flex w-fit flex-row gap-0.5 rounded-full bg-control p-[3px];

  .segment {
    @apply flex cursor-pointer flex-col rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-muted transition-colors hover:text-fg;
  }

  .selected {
    @apply bg-bright text-ink shadow-sm;
  }
}
```

- [ ] **Step 2: Sweep inline classes in the owned TSX**

Apply the class map to every `className` in the owned `.tsx` files (e.g. `DatePicker.tsx`: `bg-surface-raised shadow-lg rounded-md` → `bg-overlay shadow-float rounded-control`; `text-gray-500 border-t` → `text-muted border-t border-outline`; `text-gray-400` chevrons → `text-muted`).

- [ ] **Step 3: Verify**

Run: `npm run visual:check -- src/components/{TextField,TextArea,SelectField,SelectWithChevron,MoneyField,TokenInput,DatePicker,Label,TextError,Toggle,CheckboxField,MultiCardOption,SegmentedControl}` → all `✓`.
Run: `npx jest __tests__/unit/components` → failing suites ⊆ baseline. For snapshot diffs in `Toggle` (and any other owned component), read each diff: it must show only class-name changes; then `npx jest __tests__/unit/components/Toggle.test.tsx -u`.
Harness: `npm run visual:shoot -- --label=t7 --only='^(settings|license-configurator-new|webhook-create|connection-create|sign-up-build-for)$' --viewports=desktop` → `✓`; inputs are tonal pills-cornered fields in both themes, with no white fields in dark and no dark fields in light.

- [ ] **Step 4: Commit**

```bash
git add src/components __tests__/unit/components
git commit -m "Restyle form controls on the new tokens"
```

---

### Task 8: Data display and feedback primitives

**Files (Owns):** `src/components/Table/*`, `src/components/Toast/*`, `src/components/NotificationPanel/*`, `src/components/Loader/*`, `src/components/BubbleLoader/*`, `src/components/Loading/*`, `src/components/CopyButton/*`, `src/components/CopyableRow/*`, `src/components/Anchor/*`, `src/components/Title/*`, `src/components/PageSubtitle/*`, `src/components/UserAvatar/*`, `src/components/AccountInfoButton/*`, `src/components/CreditsWidget/*`, `src/components/TokenBalance/*`, `src/components/TotalVehicleCount/*`, `src/components/DeveloperSupportButton/*`, `src/components/Section/**`, `src/components/CollapsibleSection/**`, and their snapshots

**Interfaces:**

- Produces: table look (label-style headers, 52px rows, hairline dividers, hover `bg-card`); `.table-page-button` class for pagination arrows; toast `bg-overlay shadow-float` with a status dot.

- [ ] **Step 1: Tables**

`Table.css`:

```css
.table {
  @apply min-w-full;

  .table-header {
    @apply border-b border-outline;
  }

  .table-body {
    @apply divide-y divide-outline;
  }

  .table-action-column {
    @apply relative py-3.5 pl-3 pr-4 sm:pr-0;
  }

  .table-action-cell {
    @apply relative flex items-center justify-end gap-2.5 whitespace-nowrap px-3 py-3 text-right text-label;
  }
}

.table-page-button {
  @apply flex size-8 items-center justify-center rounded-full border border-outline bg-control text-ink hover:bg-highest disabled:opacity-40;
}
```

`Column.css`: `.custom-table-column { @apply pb-3 text-left text-label text-muted; }` (drops `capitalize`, `text-base`, `text-white`).
`Cell.css`: `.table-cell { @apply h-[52px] max-w-[300px] break-all py-3 text-body-sm text-fg; }`

In `Table.tsx`, `PaginatedTable.tsx`, `PaginatedTableIdentityAPI.tsx`: wrapper `bg-surface-default rounded-xl p-4` → `rounded-card bg-card p-4`; rows `border-t border-t-cta-default` → `border-t border-outline`; clickable rows `hover:bg-surface-raised` → `hover:bg-control`; pager text `text-text-secondary` → `text-muted`; pagination `className={'table-action-button'}` → `className={'table-page-button'}`.

- [ ] **Step 2: Toast and notification**

`Toast.css`:

```css
.toast {
  @apply pointer-events-auto z-30 w-full max-w-sm overflow-hidden rounded-card bg-overlay text-fg shadow-float;

  &.success .toast-status-dot {
    @apply bg-positive;
  }

  &.error .toast-status-dot {
    @apply bg-negative;
  }

  &.info .toast-status-dot {
    @apply bg-accent;
  }

  &-content {
    @apply flex items-start gap-3 p-4;

    &-content {
      @apply w-0 flex-1;
    }
  }

  &-icon-content {
    @apply flex-shrink-0;
  }

  &-title {
    @apply text-body-sm font-medium text-ink;
  }

  &-description {
    @apply text-body-sm text-muted;
  }

  &-close-content {
    @apply ml-4 flex flex-shrink-0;

    .toast-close-btn {
      @apply inline-flex rounded-full p-1 text-muted hover:bg-control hover:text-ink focus:outline-none focus:ring-[3px] focus:ring-accent-soft;
    }
  }
}

.toast-status-dot {
  @apply mt-1.5 inline-block size-1.5 flex-shrink-0 rounded-full;
}
```

In `Toast.tsx`, add `<span className="toast-status-dot" aria-hidden="true" />` as the first child of `.toast-content` (no text change). Replace any inline status icon colors per the class map (`text-green-400` → `text-positive`, `text-red-400` → `text-negative`).

`NotificationPanel`: its CSS is empty; sweep its TSX (`h-8 w-8 text-green-400` → `h-8 w-8 text-positive`, `text-red-400` → `text-negative`).

- [ ] **Step 3: Loaders**

`BubbleLoader.css`: `.bubble { @apply h-3 w-3 rounded-full bg-accent; … }` (keep the animation). In `Loader.tsx`, `bg-primary-200/20 rounded` → `bg-highest rounded-chip` (four occurrences). `Loading.css` unchanged except add `text-accent` to `.loading-svg`.

- [ ] **Step 4: Text, copy and identity primitives**

- `Title.css`: `.title { @apply text-title text-ink; }`
- `PageSubtitle.css`: `.subtitle-content { @apply border-b border-outline; .subtitle { @apply pb-2 text-title text-muted; } }`
- `Anchor.css`: `.anchor { @apply cursor-pointer py-1 text-accent-ink hover:underline; &.primary { @apply text-accent-ink; } &.grey { @apply text-muted; } }`
- `CopyableRow.css`: `.copyable-row { @apply flex flex-row items-center gap-2.5 rounded-control bg-control px-3 py-2 font-mono text-code text-fg; }` — `CopyableRow` shows keys and ids a developer copies, so mono is correct here.
- `CopyButton.tsx`: `fill-white/50` → `text-muted hover:text-ink`; the success `CheckIcon` gets `text-accent-ink`.
- `UserAvatar.css`: `.user-avatar-default { @apply flex h-10 w-10 items-center justify-center rounded-full bg-control text-body-sm font-medium text-ink; }` (drops `uppercase`; initials are already upper-case strings from `getInitials` — confirm in `UserAvatar.tsx`; if `getInitials` returns lower case, add `.toUpperCase()` to its return, which is a presentational string transform, not copy).
- `AccountInfoButton.tsx`: the `variant === 'button'` branch uses `<Button variant="secondary">` and removes `className={'primary-outline'}`; label "Account Info" → "Account info".
- `CreditsWidget.css`:

```css
.credits {
  @apply flex min-w-28 flex-row items-center justify-center gap-2 rounded-full bg-control py-1 pl-4 pr-1;

  .credits-info {
    @apply flex min-w-36 flex-row items-center justify-between gap-2;
  }

  .credit-amount {
    @apply text-card-title text-ink;
  }

  .credit-text {
    @apply text-label text-muted;
  }

  .btn-add-credits {
    @apply flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-on-accent;
  }
}

.credits-large {
  @apply flex flex-col rounded-card bg-card p-4;
}
```

- `DeveloperSupportButton.css`: `.question-mark-button { @apply flex h-10 w-10 items-center justify-center rounded-full bg-control text-muted hover:bg-highest hover:text-ink; }`
- `TokenBalance.css`: wrapper `bg-surface-default rounded-2xl` → `rounded-card bg-card`; `text-grey-50` → `text-ink`; balance number uses `text-card-title`.
- `TotalVehicleCount`, `Section/**`, `CollapsibleSection/**`: sweep TSX with the class map (`text-2xl !leading-8` → `text-title`; `text-3xl font-medium` → `text-title`; `text-4xl` counts → `text-metric text-ink`; `text-base font-medium text-text-secondary` → `text-card-title text-muted`; `p-4 bg-surface-raised rounded-2xl` → `p-4 bg-card rounded-card`).

- [ ] **Step 5: Verify**

Run: `npm run visual:check -- src/components` → all `✓` except files owned by later tasks (`AppCard`, `LicenseCard`, `OnboardingBanner`, `CreateAppModal`, `Webhooks`, `TemplateEditor`, and the pass-owned components listed in Tasks 11–15).
Run: `npx jest` → failing suites ⊆ baseline. Review and update the `Table`, `Toast`, `Loader`, `Loading` snapshots (class-only diffs).
Harness: `npm run visual:shoot -- --label=t8 --only='^(app|license-vehicles|settings|webhooks)$' --viewports=desktop` → `✓`; the header credits pill has a gradient "+" button; tables have muted sentence-case headers without fills.

- [ ] **Step 6: Commit**

```bash
git add src/components __tests__/unit/components
git commit -m "Restyle tables, toasts, loaders and header widgets"
```

---

### Task 9: Reference screen — the /app license list

**Files (Owns):** `src/app/app/**` (list View, EmptyList, CreateAppButton, AddCreditsButton, RightPanel, VehicleSimulator incl. modal, create Form), `src/app/license/list/**` (`LicenseList.tsx`, `LicenseList.css`, `index.tsx`), `src/components/AppCard/*`, `src/components/LicenseCard/*`, `src/components/OnboardingBanner/*`, `src/components/CreateAppModal/**`, related snapshots

**Interfaces:**

- Produces: the idioms `docs/DESIGN.md` records and every pass copies — page intro line, section title, tonal card with hover step, metric, status chip/dot, empty state, create modal.

- [ ] **Step 1: Restyle**

- `View.css`: `.welcome-message { @apply flex flex-row items-center gap-2 pb-2; .title { @apply text-body text-muted; } }` (the border under the greeting goes; spacing separates).
- `EmptyList`: title `font-black text-base text-white` → `text-card-title text-ink`; description → `text-body-sm text-muted`; the block is centred inside a `rounded-card bg-card p-10` panel.
- `LicenseList.css`: section title → `text-card-title text-ink`; list gap `gap-3`; description text → `text-muted`.
- `LicenseCard.css`:

```css
.license-card {
  @apply flex flex-row items-start justify-between rounded-card bg-card !p-0 transition-colors hover:bg-control;

  .content {
    @apply flex flex-1 flex-col gap-4 p-6;

    .title {
      @apply text-card-title text-ink;
    }
  }
}
```

In `LicenseCard.tsx`: the license id/client id shown as a copyable value is mono (`font-mono text-code text-muted`); counts use `text-card-title text-ink`; any `font-mono` on labels goes.

- `AppCard.css`: `.app-card` → `rounded-card bg-card`, `.title` → `text-card-title text-ink`; `.app-card-description` → `text-body-sm text-muted`.
- `OnboardingBanner.css`: `.banner-content { @apply flex w-full flex-col items-start gap-4 rounded-card bg-card p-5; }`; sweep `CTARow`/`ActionCompletedRow` (completed rows show a `text-positive` check, pending rows a `text-muted` circle; CTA buttons are `variant="primary"` for the next step and `secondary` for others).
- `VehicleSimulator.css`: apply the class map; specifically region/make/pill cards selected state `bg-white border-white` + `text-black` → `bg-accent-soft-strong text-accent-ink` with `border-transparent`; unselected `bg-cta-default hover:border-white` → `bg-control hover:bg-highest`; step labels drop `font-mono uppercase tracking-*` → `text-label text-muted`; testnet badge → `rounded-chip bg-control px-2 py-1 text-label text-muted`; token id (`.vehicle-sim-card-token-id`) keeps tabular Euclid (drop `font-mono`); stale card → `border-warning/40 bg-warning/10`, badge `text-warning`; overlay `bg-black/60` → `bg-scrim`; delete hover `hover:text-red-400` → `hover:text-negative`; dividers `bg-[#322D2F]`/`border-[#322D2F]` → `bg-outline`/`border-outline`.
- `CreateAppModal/**` and `src/app/app/create/components/Form/*`: modal title `text-panel-title text-ink`, field labels via `Label`, footer buttons primary + secondary.

- [ ] **Step 2: Verify**

Run: `npm run visual:check -- src/app/app src/app/license/list src/components/AppCard src/components/LicenseCard src/components/OnboardingBanner src/components/CreateAppModal` → all `✓`.
Run: `npx jest` → failing suites ⊆ baseline; review/update `AppCardComponent` snapshot if it changed (class-only).
Harness, both balances:

```bash
npm run visual:shoot -- --label=reference --only='^app'
# restart the dev harness with HARNESS_DCX=0 npm run visual:dev, then:
npm run visual:shoot -- --label=reference-onboarding --only='^app$'
```

Expected: all `✓`. Compare `reference/app--dark--desktop.png` with fleet's list views: tonal cards on the sheet, no borders, ink titles, muted meta, a single gradient primary action, mint only on the action and live status. Check `reference/app-create-modal--light--desktop.png` (overlay on blurred scrim, readable labels) and `app-mobile-menu--light--mobile.png`.

- [ ] **Step 3: Commit**

```bash
git add src/app/app src/app/license/list src/components __tests__
git commit -m "Restyle the license list as the reference screen"
```

---

### Task 10: `docs/DESIGN.md`

**Files:**

- Create: `docs/DESIGN.md`, `docs/design/reference-dark.png`, `docs/design/reference-light.png`

**Interfaces:**

- Produces: the spec every pass (Tasks 11–15) reads first.

- [ ] **Step 1: Copy the reference screenshots**

```bash
mkdir -p docs/design
cp scripts/visual/out/reference/app--dark--desktop.png docs/design/reference-dark.png
cp scripts/visual/out/reference/app--light--desktop.png docs/design/reference-light.png
```

- [ ] **Step 2: Write `docs/DESIGN.md`**

Structure (fill every section; this is a document, so write it in full — it is short):

```markdown
# DIMO Developer Console — visual design system

The console shares its visual language with DIMO Fleet and the DIMO Driver app:
Euclid Circular A, cool blue-black surfaces, the sky→mint DIMO gradient, and
generous radii, in dark and light. Tokens live in `src/app/globals.css` and are
exposed as Tailwind classes by `tailwind.config.ts`; this doc is how to use them.

![Reference screen, dark](design/reference-dark.png)
![Reference screen, light](design/reference-light.png)

## Principles

1. Mint means live or actionable … (fleet's five principles, with Tailwind class names:
   `bg-brand-gradient`, `text-accent-ink`, `bg-accent-soft-strong`, `text-ink`, `text-muted`,
   `bg-card`/`bg-control`, `rounded-chip|control|card|panel`)

## Tokens

(table: role · Tailwind class · dark · light — copy the token table from
docs/superpowers/specs/2026-09-25-console-visual-refresh-design.md §1, with `fg` for body text)

## Type scale

(table of the eight `text-*` sizes from tailwind.config.ts and where each is used)

## Patterns

Page header, sidebar, cards, tables, buttons (the five `variant`s and when to use each),
selected state, inputs, segmented control, modals, toasts, status dot, empty state,
monospace rule (keys and code only) — each as the exact classes used on the reference screen.

## Theming

`<html data-theme>`, `useTheme()`, the pre-paint script,
and "every token needs a light value (tokens.test.ts fails otherwise)".

## Don'ts

- No hex in components (`npm run visual:check`).
- No `uppercase` or positive tracking; no mono labels.
- No white slabs for selected state; no `text-white`/`bg-white`/`bg-black`.
- Don't use mint for decoration.

## Checking your work

`npm run visual:dev`, `npm run visual:shoot -- --label=… --only=…`, `npm run visual:check -- <paths>`.
```

- [ ] **Step 3: Verify and commit**

Run: `npx prettier --check docs/DESIGN.md` (fix with `--write`).

```bash
git add docs/DESIGN.md docs/design
git commit -m "Document the console design system"
```

---

### Tasks 11–15: Per-screen passes

These five tasks own disjoint files and may run in parallel (shared harness; the runner retries once on hot-reload interference). Each has the same steps; only **Owns** and **Routes** differ. None may edit `src/app/globals.css`, `tailwind.config.ts`, `docs/DESIGN.md`, `src/layouts/**`, or any `src/components/*` directory not in its Owns list. If a pass needs a token or a primitive change, it stops and reports the need instead of making it.

Steps for each pass:

- [ ] **Step 1: Read** `docs/DESIGN.md` and look at `docs/design/reference-*.png`.
- [ ] **Step 2: Baseline your routes** — `npm run visual:shoot -- --label=<pass>-start --only='<route regex>'` and look at every PNG, dark and light, desktop and mobile. Note what is wrong against DESIGN.md.
- [ ] **Step 3: Restyle** the owned `.css` and `.tsx` files with the Legacy → token class map and DESIGN.md patterns. Title Case strings in headings, buttons, tabs, table headers and labels become sentence case (update tests matching those strings). No other text, logic or prop changes.
- [ ] **Step 4: Check** — `npm run visual:check -- <owned paths>` → all `✓` (use `token-check:allow` only for stored data values such as a brand's default `primaryColor`, never for styling).
- [ ] **Step 5: Test** — `npx jest` → failing suites ⊆ baseline; review owned snapshot diffs (class/casing only) and update them.
- [ ] **Step 6: Shoot** — `npm run visual:shoot -- --label=<pass> --only='<route regex>'` → all `✓`. Look at every PNG in both themes: no white slabs, no white text on light surfaces, no dark islands in light, mint only on actions/selection/live state, sentence case throughout.
- [ ] **Step 7: Commit** — `git add <owned paths> __tests__ && git commit -m "<message below>"`.

### Task 11: Pass A — licenses

**Owns:** `src/app/license/[tokenId]/**`, `src/app/license/vehicles/**`, `src/components/RedirectUriForm/**`, `src/components/RedirectUriList/**`, `src/components/GenerateDevJWT/**`, `src/components/GenerateDevJWTModal/**`, `src/components/AssetDIDsInput/**`, `src/components/VehicleTokenIdsInput/**`, `src/components/CSVUpload/**`, related tests/snapshots (`__tests__/unit/pages/app/details/**`, `__tests__/unit/pages/license/**`, `__tests__/unit/configurator/**`)
**Routes regex:** `^license-`
**Notes:** Brand colors in `Brand/**` (`primaryColor` defaults and swatches) are data: keep the hex, mark the line `// token-check:allow`, and render the swatch with `style={{ background: color }}`. Signer addresses, client ids, redirect URIs and JWTs are mono (`font-mono text-code`). The configurator's permission toggles use `Toggle`; its step/tab switcher uses `SegmentedControl` styling if it is a view switch.
**Commit message:** `Restyle license details, configurator and licensed vehicles`

### Task 12: Pass B — connections and webhooks

**Owns:** `src/app/connections/**`, `src/app/webhooks/**`, `src/components/Webhooks/**`, related tests (`__tests__/unit/utils/webhook.test.ts` is baseline-failing; leave it)
**Routes regex:** `^(connection|connections|webhook|webhooks)`
**Notes:** CEL expressions and `WebhookTriggerPreview` payloads stay mono (`font-mono text-code`, on `bg-sheet` inside cards). Webhook `status` shows a status dot (`enabled` → `bg-accent` with `shadow-[0_0_8px_var(--accent-soft-strong)]`, `disabled` → `bg-muted`) plus the existing text. Connection keys are mono inside `CopyableRow`.
**Commit message:** `Restyle connections and webhooks`

### Task 13: Pass C — templates

**Owns:** `src/app/templates/**`, `src/components/TemplateEditor/**`, their `__tests__`
**Routes regex:** `^template`
**Notes:** Before starting, rebase this branch onto the latest `template-editor` (`git fetch && git rebase origin/template-editor`) and re-run Task 1 Step 12 if the template API shapes changed. Normalisation/trim grids are tables: use the table pattern (label headers, hairline rows); editable cells use the input pattern at 32px height. Trim header mono (`TrimHeader.tsx`) is removed unless it shows an id a developer copies. Honesty surfaces (read-only / entitlement notices) use `bg-card` with a `text-warning` or `text-muted` leading icon, not a colored slab. `honestySurfaces.test.tsx` and `TrimGrid.test.tsx` must keep passing.
**Commit message:** `Restyle the template search and editor`

### Task 14: Pass D — settings and billing

**Owns:** `src/app/settings/**`, `src/components/BuyCreditsModal/**`, `src/components/PaymentMethodSelector/**`, `src/components/SpendingLimitModal/**`, `src/components/AccountInformationModal/**`, `src/components/WorkspaceNameModal/**`, `src/components/RightPanel/**`, related tests (`TeamManagement.test.tsx` is baseline-failing)
**Routes regex:** `^settings`
**Notes:** Team member status (`PENDING`/`SENT`/`ACCEPTED`) renders as a chip: `rounded-chip bg-control px-2 py-0.5 text-label text-muted`, with `ACCEPTED` → `bg-accent-soft text-accent-ink`. Payment method choices use the `MultiCardOption` selected state. Buy-credits amount uses `MoneyField`/`TokenInput` as restyled in Task 7. To see the modals, temporarily shoot with a local `click` added to a copy of the settings route in `routes.mjs` (e.g. `{ name: 'settings-team-invite', path: '/settings', ready: 'sam@harness.dev', click: 'text=Invite' }`) — keep useful states in `routes.mjs`, and use the button text actually on the page.
**Commit message:** `Restyle settings and billing modals`

### Task 15: Pass E — guest pages, support, explorer, error pages

**Owns:** `src/app/sign-in/**`, `src/app/sign-up/**`, `src/app/email-recovery/**`, `src/app/support/**`, `src/app/explorer/**`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/_not-found.tsx`, `src/components/SignInButton/**`, `src/components/DevSupportForm/**`, `src/components/DeveloperSupportButton/**` (TSX only; its CSS was done in Task 8), related tests (`SignInButton`, `SignInButtons` are baseline-failing)
**Routes regex:** `^(sign-|email-recovery|support|explorer)`
**Notes:** Guest content sits inside the Task 5 guest panel; headings use `text-title text-ink`, supporting text `text-muted`. OAuth sign-in buttons use `variant="secondary"` with the brand logo icon (logos keep their colors). OTP inputs use the input pattern with `text-metric` digits. `global-error.tsx` renders outside the root layout: give its `<html>` `data-theme="dark"` and inline the pre-paint script (`THEME_INIT_SCRIPT`) and `dimoFont` class the same way `RootLayout` does. Explorer signal values use tabular Euclid; signal names stay as-is (they are identifiers; mono only if the page presents them as code).
**Commit message:** `Restyle sign-in, sign-up, support, explorer and error pages`

---

### Task 16: Remove legacy aliases, lock the palette, integrate

**Files:**

- Modify: `tailwind.config.ts`, any file still flagged by `npm run visual:check`

**Interfaces:**

- Produces: `theme.colors` = tokens only; the build fails on any legacy `@apply`.

- [ ] **Step 1: Add the tokens passes asked for**

Collect every "needs a token/primitive" report from Tasks 11–15. For each accepted one, add the variable to **both** theme blocks in `globals.css`, the Tailwind name in `tokenColors`, and a line in `docs/DESIGN.md`. Run `npx jest __tests__/unit/utils/tokens.test.ts` → PASS.

- [ ] **Step 2: Lock the palette**

In `tailwind.config.ts`: delete `legacyAliases`, and move colors out of `extend` so defaults disappear:

```ts
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...tokenColors,
    },
    extend: {
      // backgroundImage, boxShadow, borderRadius, fontSize, fontFamily unchanged
    },
  },
```

- [ ] **Step 3: Make the build and the check green**

Run: `npx next build` → fix every `The \`…\` class does not exist`error by applying the class map in that file (these are leftovers the passes missed; they are in files already owned by an earlier task, so fix them here).
Run:`npm run visual:check`→ fix every remaining hit. Run:`grep -rnE "\b(text|bg|border)-(white|black)\b" src` → no output.

- [ ] **Step 4: Full verification**

```bash
npm run compile
npm run lint
npm run lint:format
npx jest --silent 2>&1 | grep -E '^FAIL' | sort -u > scripts/visual/out/jest-fail-after.txt
comm -13 scripts/visual/out/before/jest-fail.txt scripts/visual/out/jest-fail-after.txt   # must print nothing
npm run build
npm run visual:shoot -- --label=final
```

Expected: every command succeeds; `comm` prints nothing (no new failing suites); every harness line `✓`. Open all `final/*.png` (dark/light × desktop/mobile) and compare against `before/` for the same route: same content, new styling, nothing missing.

- [ ] **Step 5: Commit**

```bash
git add -A src tailwind.config.ts docs/DESIGN.md
git commit -m "Remove legacy color names and lock the palette to design tokens"
```

---

### Task 17: Pull request

- [ ] **Step 1: Push and open the PR into `template-editor`** (or `master` if `template-editor` has merged by then — check with `git branch -r --merged origin/master | grep template-editor`).

```bash
git push -u origin console-visual-refresh
gh pr create --base template-editor --title "Console visual refresh — align with the DIMO Fleet design language" --body-file - <<'EOF'
Restyles the developer console in the DIMO Fleet / Driver design language, in dark and light.

- Design tokens as CSS variables behind Tailwind names; the palette is locked to them
- Euclid Circular A; sentence case; mono only for keys and code
- Inset-sheet app frame, new sidebar with a Light/Dark toggle, gradient primary buttons
- `docs/DESIGN.md` documents the system; `scripts/visual/` is a mocked-backend screenshot harness

No copy (beyond casing), logic, data or API changes. Jest: no new failing suites vs. the 19 already failing on template-editor.

Known limits: the Euclid Circular A web licence is unconfirmed (same as DIMO Fleet).

Screenshots: before/after for /app, license details, settings and sign-in in both themes are attached below.
EOF
```

- [ ] **Step 2: Attach screenshots** — upload `before/app--dark--desktop.png`, `final/app--dark--desktop.png`, `final/app--light--desktop.png`, and the same trio for `license-details`, `settings`, `sign-in`, as a PR comment.

- [ ] **Step 3: Verify on the Vercel preview** — sign in for real, visit every route in both themes, and toggle theme on a page reload (no flash). Record the previous production deployment id for rollback (`vercel ls` or the Vercel dashboard) in the PR description.
