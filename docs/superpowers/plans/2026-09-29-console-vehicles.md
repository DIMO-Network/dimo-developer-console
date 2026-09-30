# Vehicles Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/explorer` with a Vehicles section: a vehicle list per license and a vehicle page whose left rail lists subjects (the vehicle, each device, the owner's documents, sharing) with data-health, signal, raw cloud-event, trip and document views scoped to the selected subject.

**Architecture:** Every rail item is a _subject_: a DID plus the capabilities its kind adds. Identity (Apollo, public) supplies the vehicle, its devices, owner and SACDs; two Next.js route handlers (`/api/data/telemetry`, `/api/data/fetch`) exchange the developer's stored JWT for an asset-scoped token and proxy GraphQL to the Telemetry and Fetch APIs. Pure query builders and small hooks feed presentational tab components styled with the locked Fleet tokens.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind (Fleet tokens), Apollo Client (Identity), TanStack Query v5 (data proxy), `jwt-decode`, `react-syntax-highlighter`, `recharts` (new), Jest + React Testing Library, Playwright visual harness.

**Spec:** `docs/superpowers/specs/2026-09-29-console-vehicles-design.md`

## Global Constraints

- Colors only from the Fleet tokens in `src/app/globals.css` / `tailwind.config.ts`; the only additions are `--chart-1` … `--chart-6` (Task 8), defined for both themes and covered by `__tests__/unit/utils/tokens.test.ts`.
- Follow the recipes in `docs/DESIGN.md`: section card `rounded-card bg-card p-4`, pill tabs (`license-tabs` recipe), neutral chip `rounded-chip bg-highest px-2 py-0.5 text-label text-muted`, status dot 6px (`size-1.5`), `font-mono text-code` only for ids, DIDs, addresses, signal names, JSON and code. Token ids and counts stay in the body face.
- Copy is sentence case, active voice. Fixed vocabulary: "Vehicles", "Summary", "Signals", "Raw data", "Trips", "Documents", "Sharing", "Latest payload", "Data sources", "Browse cloud events", "Copy query", "Download JSON".
- App Router only. Components using hooks start with `'use client'`. No wallet/crypto code on the server.
- No `Co-Authored-By` trailers or AI attribution in commits.
- Each task ends green on `npm test`, `npm run lint`, `npm run compile` (type check + codegen). Run `npm run build` in Tasks 4 and 12.
- Tests live in `__tests__/unit/<mirror of src path>/`. Route handler tests carry `/** @jest-environment node */`.
- Time is UTC in every query variable (ISO 8601 with `Z`). Relative times come from `src/utils/freshness.ts`, never ad hoc.
- The developer JWT never leaves the browser except as the `Authorization` header to `/api/data/*`. Route handlers never log it.

## Review Focus

Inputs the spec implies but no requirement names. Each line has its pinned test in the task that owns the code.

1. **A vehicle shared with none of the user's licenses** — the page must still render Sharing and Vehicle details, with data tabs disabled and a plain notice; it must not call `/api/data/*`. Pinned in Task 5 (`VehiclePage` "not shared" test).
2. **A signal name that is not in the subject's `availableSignals`** (a stale picker, a hand-edited URL) — the query builder must refuse it rather than interpolate it into GraphQL. Pinned in Task 2 (`signalsQuery` rejects unknown / malformed names).
3. **A raw-event row whose `data` is a string, `null`, or a base64 blob** rather than an object — the JSON view must render it, not crash. Pinned in Task 7 (`RawDataTab` renders string and null data).
4. **A device whose telemetry source cannot be resolved** (no cloud event yet, unknown `header.source` shape) — Summary shows the Fetch data and the "signal breakdown covers the whole vehicle" note instead of failing. Pinned in Task 6 (`SummaryTab` unresolved-source test).
5. **A partial GraphQL error** (`data` present, `errors` naming one field the license lacks a privilege for) — the panel for that field shows the message; the rest of the tab still renders. Pinned in Task 2 (`postSubjectQuery` returns `{data, errors}`) and Task 6 (`SummaryTab` shows a field error inline).

## File Structure

```
src/config/{default,preview,production,index}.ts   telemetryApiUrl, fetchApiUrl, tokenExchangeApiUrl, loginBaseUrl
src/services/subjects/did.ts                        DID parsing/formatting (pure, shared client+server)
src/services/subjects/queries.ts                    GraphQL request builders (pure)
src/services/subjects/client.ts                     postSubjectQuery: browser → /api/data/*
src/services/subjects/graph.ts                      Subject model + buildVehicleGraph (pure)
src/services/subjectJwt.ts                          server-only token exchange + cache
src/app/api/data/proxy.ts                           shared route handler factory
src/app/api/data/telemetry/route.ts                 POST → Telemetry API
src/app/api/data/fetch/route.ts                     POST → Fetch API
src/utils/freshness.ts                              freshnessOf, relativeTime
src/utils/sacdPermissions.ts                        decodeSacdPermissions, labels, token-exchange names
src/utils/humanizeSignal.ts                         camelCase → readable label
src/utils/documentSharingUrl.ts                     Login with DIMO ACCOUNT_MANAGER url
src/hooks/subjects/useSubjectQuery.ts               TanStack wrapper over postSubjectQuery
src/hooks/subjects/useSubjectFreshness.ts           one aliased latestIndex call per graph
src/hooks/subjects/useDataSummary.ts                telemetry dataSummary (+ per-source for "From")
src/components/CollapsibleSection/*                 rewritten: Fleet collapsible panel
src/components/FreshnessDot/FreshnessDot.tsx        dot + relative time
src/components/JsonBlock/JsonBlock.tsx              token-themed JSON view with copy
src/components/QueryActions/QueryActions.tsx        Copy query / Download JSON
src/components/TimeRangePicker/TimeRangePicker.tsx  presets + custom UTC range
src/app/vehicles/layout.ts                          AuthorizedLayout
src/app/vehicles/page.tsx                           list
src/app/vehicles/components/VehiclesView.tsx        license picker + search + table
src/app/vehicles/[tokenId]/page.tsx                 detail
src/app/vehicles/[tokenId]/queries.ts               GetVehicleDetail, GetDeveloperLicenseAlias
src/app/vehicles/[tokenId]/hooks/useVehicleUrlState.ts
src/app/vehicles/[tokenId]/components/VehiclePage.tsx      data loading, license + subject selection
src/app/vehicles/[tokenId]/components/VehicleHeader.tsx
src/app/vehicles/[tokenId]/components/SourceRail.tsx
src/app/vehicles/[tokenId]/components/SubjectTabs.tsx
src/app/vehicles/[tokenId]/components/AccessNotice.tsx
src/app/vehicles/[tokenId]/components/StatCard.tsx
src/app/vehicles/[tokenId]/components/tabs/{SummaryTab,SignalsTab,RawDataTab,TripsTab,DocumentsTab,SharingPanel}.tsx
src/app/license/vehicles/[clientId]/components/VehicleDetailsTable/*   extended, reused by /vehicles
```

---

### Task 1: Config, subject JWT exchange and the data proxy routes

**Files:**

- Modify: `src/config/index.ts`, `src/config/default.ts`, `src/config/production.ts`
- Create: `src/services/subjects/did.ts`, `src/services/subjectJwt.ts`, `src/app/api/data/proxy.ts`, `src/app/api/data/telemetry/route.ts`, `src/app/api/data/fetch/route.ts`
- Test: `__tests__/unit/services/subjects/did.test.ts`, `__tests__/unit/services/subjectJwt.test.ts`, `__tests__/unit/app/api/dataProxy.test.ts`

**Interfaces:**

- Consumes: `configuration` from `@/config` (`identityApiUrl`, `CONTRACT_NETWORK`).
- Produces:
  - `parseErc721Did(did): { chainId: number; contract: string; tokenId: number } | null`, `isEthrDid(did): boolean`, `accountDid(chainId, address): string`, `sourceDid(chainId, address): string`, `shortDid(did): string`, `shortAddress(addr): string`.
  - `getSubjectJwt(devJwt: string, asset: string): Promise<string>` and `SubjectJwtError { status: 401 | 403 | 502; code: 'DEV_JWT_INVALID' | 'NOT_SHARED' | 'UPSTREAM' }`.
  - `POST /api/data/telemetry` and `POST /api/data/fetch` with body `{ asset: string; query: string; variables?: Record<string, unknown> }` and header `Authorization: Bearer <devJwt>`; the response is the upstream GraphQL JSON with the upstream status, or `{ error, code }` with 400/401/403/502.

- [ ] **Step 1: Add the API URLs to config**

`src/config/index.ts`, inside `type Configuration` after `VEHICLE_SIMULATOR_URL: string;`:

```ts
telemetryApiUrl: string;
fetchApiUrl: string;
tokenExchangeApiUrl: string;
loginBaseUrl: string;
```

`src/config/default.ts`, append:

```ts
// Vehicle data proxies (Task: Vehicles section). Dev endpoints; production.ts overrides.
export const telemetryApiUrl = 'https://telemetry-api.dev.dimo.zone/query';
export const fetchApiUrl = 'https://fetch-api.dev.dimo.zone/query';
export const tokenExchangeApiUrl =
  'https://token-exchange-api.dev.dimo.zone/v1/tokens/exchange';
export const loginBaseUrl = 'https://login.dev.dimo.org';
```

`src/config/production.ts`, append:

```ts
export const telemetryApiUrl = 'https://telemetry-api.dimo.zone/query';
export const fetchApiUrl = 'https://fetch-api.dimo.zone/query';
export const tokenExchangeApiUrl =
  'https://token-exchange-api.dimo.zone/v1/tokens/exchange';
export const loginBaseUrl = 'https://login.dimo.org';
```

(`preview.ts` inherits the dev values from `default.ts`; do not add them there.)

- [ ] **Step 2: Write the failing DID helper tests**

`__tests__/unit/services/subjects/did.test.ts`:

```ts
import {
  parseErc721Did,
  isEthrDid,
  accountDid,
  sourceDid,
  shortDid,
  shortAddress,
} from '@/services/subjects/did';

const VEHICLE = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:184223';

describe('did helpers', () => {
  it('parses an erc721 DID', () => {
    expect(parseErc721Did(VEHICLE)).toEqual({
      chainId: 137,
      contract: '0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF',
      tokenId: 184223,
    });
  });

  it.each(['did:ethr:137:0xabc', 'did:erc721:137:0xbA57:12', '', 'garbage'])(
    'rejects %s as an erc721 DID',
    (did) => {
      expect(parseErc721Did(did)).toBeNull();
    },
  );

  it('recognises an ethr DID', () => {
    expect(isEthrDid('did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      true,
    );
    expect(isEthrDid(VEHICLE)).toBe(false);
  });

  it('builds account and source DIDs', () => {
    expect(accountDid(137, '0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      'did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2',
    );
    expect(sourceDid(80002, '0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E')).toBe(
      'did:ethr:80002:0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E',
    );
  });

  it('shortens DIDs and addresses for display', () => {
    expect(shortDid(VEHICLE)).toBe('did:erc721:137:0xbA57…B0cF:184223');
    expect(shortDid('did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      'did:ethr:137:0x7a3F…91c2',
    );
    expect(shortAddress('0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      '0x7a3F…91c2',
    );
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest __tests__/unit/services/subjects/did.test.ts`
Expected: FAIL, "Cannot find module '@/services/subjects/did'".

- [ ] **Step 4: Implement the DID helpers**

`src/services/subjects/did.ts`:

```ts
// DID helpers shared by the browser and the route handlers. Pure: no config, no I/O.

const ADDRESS = '0x[0-9a-fA-F]{40}';
const ERC721 = new RegExp(`^did:erc721:(\\d+):(${ADDRESS}):(\\d+)$`);
const ETHR = new RegExp(`^did:ethr:(\\d+):(${ADDRESS})$`);

export const parseErc721Did = (
  did: string,
): { chainId: number; contract: string; tokenId: number } | null => {
  const m = ERC721.exec(did);
  if (!m) return null;
  return { chainId: Number(m[1]), contract: m[2], tokenId: Number(m[3]) };
};

export const isEthrDid = (did: string): boolean => ETHR.test(did);

export const accountDid = (chainId: number, address: string) =>
  `did:ethr:${chainId}:${address}`;

// Telemetry's SignalFilter.source: the connection's ethr DID.
export const sourceDid = (chainId: number, address: string) =>
  `did:ethr:${chainId}:${address}`;

export const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

export const shortDid = (did: string) => {
  const erc = parseErc721Did(did);
  if (erc)
    return `did:erc721:${erc.chainId}:${shortAddress(erc.contract)}:${erc.tokenId}`;
  const m = ETHR.exec(did);
  if (m) return `did:ethr:${m[1]}:${shortAddress(m[2])}`;
  return did;
};
```

- [ ] **Step 5: Run the DID tests**

Run: `npx jest __tests__/unit/services/subjects/did.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the failing subject JWT tests**

`__tests__/unit/services/subjectJwt.test.ts`:

```ts
/**
 * @jest-environment node
 */
import {
  getSubjectJwt,
  SubjectJwtError,
  clearSubjectJwtCache,
} from '@/services/subjectJwt';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload: object) => `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
const future = Math.floor(Date.now() / 1000) + 3600;
const DEV = jwt({
  ethereum_address: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  exp: future,
});
const VEHICLE = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';
const ACCOUNT = 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
// bits 1..4 and 7 set as 0b11 pairs → 0x3 << 2 | ... : NonLocation, Commands, CurrentLoc, LocHistory, RawData
const PERMS_HEX =
  '0x' + ((3n << 2n) | (3n << 4n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);

const fetchMock = jest.fn();
beforeEach(() => {
  clearSubjectJwtCache();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('getSubjectJwt', () => {
  it('exchanges a vehicle DID with the permissions the license holds', async () => {
    fetchMock
      .mockImplementationOnce(() =>
        json(200, { data: { vehicle: { sacd: { permissions: PERMS_HEX } } } }),
      )
      .mockImplementationOnce(() => json(200, { token: 'vehicle-jwt' }));

    await expect(getSubjectJwt(DEV, VEHICLE)).resolves.toBe('vehicle-jwt');

    const [, exchangeCall] = fetchMock.mock.calls;
    expect(JSON.parse(exchangeCall[1].body)).toEqual({
      asset: VEHICLE,
      permissions: [
        'privilege:GetNonLocationHistory',
        'privilege:ExecuteCommands',
        'privilege:GetCurrentLocation',
        'privilege:GetLocationHistory',
        'privilege:GetRawData',
      ],
    });
    expect(exchangeCall[1].headers.Authorization).toBe(`Bearer ${DEV}`);
  });

  it('exchanges an account DID for raw data only, without an identity lookup', async () => {
    fetchMock.mockImplementationOnce(() => json(200, { token: 'account-jwt' }));
    await expect(getSubjectJwt(DEV, ACCOUNT)).resolves.toBe('account-jwt');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      asset: ACCOUNT,
      permissions: ['privilege:GetRawData'],
    });
  });

  it('caches per license and asset until close to expiry', async () => {
    const soon = jwt({ exp: Math.floor(Date.now() / 1000) + 600 });
    fetchMock.mockImplementationOnce(() => json(200, { token: soon }));
    await getSubjectJwt(DEV, ACCOUNT);
    await getSubjectJwt(DEV, ACCOUNT);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers 403 NOT_SHARED when the vehicle has no SACD for the license', async () => {
    fetchMock.mockImplementationOnce(() =>
      json(200, { data: { vehicle: { sacd: null } } }),
    );
    await expect(getSubjectJwt(DEV, VEHICLE)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_SHARED',
    });
  });

  it('answers 403 NOT_SHARED when token exchange refuses', async () => {
    fetchMock.mockImplementationOnce(() => json(403, { message: 'no grant' }));
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_SHARED',
    });
  });

  it('answers 401 DEV_JWT_INVALID for an expired or malformed developer JWT', async () => {
    const expired = jwt({ ethereum_address: '0xabc', exp: 1 });
    await expect(getSubjectJwt(expired, ACCOUNT)).rejects.toMatchObject({ status: 401 });
    await expect(getSubjectJwt('not-a-jwt', ACCOUNT)).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 502 UPSTREAM on other failures', async () => {
    fetchMock.mockImplementation(() => json(500, 'boom'));
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toBeInstanceOf(SubjectJwtError);
    await expect(getSubjectJwt(DEV, ACCOUNT)).rejects.toMatchObject({ status: 502 });
  });

  it('rejects an asset that is neither an erc721 nor an ethr DID', async () => {
    await expect(getSubjectJwt(DEV, 'did:web:example.com')).rejects.toMatchObject({
      status: 403,
    });
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx jest __tests__/unit/services/subjectJwt.test.ts`
Expected: FAIL, "Cannot find module '@/services/subjectJwt'".

- [ ] **Step 8: Implement the subject JWT service**

`src/services/subjectJwt.ts`:

```ts
// Server only: exchanges the developer JWT for an asset-scoped token.
// The proxy adds no privilege: token exchange only grants what the license's
// SACD already holds, and the token is bound to one asset DID.
import { jwtDecode } from 'jwt-decode';
import configuration from '@/config';
import { isEthrDid, parseErc721Did } from '@/services/subjects/did';
import { decodeSacdPermissions, PERMISSION_NAMES } from '@/utils/sacdPermissions';

export type SubjectJwtCode = 'DEV_JWT_INVALID' | 'NOT_SHARED' | 'UPSTREAM';

export class SubjectJwtError extends Error {
  constructor(
    public readonly status: 401 | 403 | 502,
    public readonly code: SubjectJwtCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubjectJwtError';
  }
}

type Cached = { token: string; expiresAt: number };
const cache = new Map<string, Cached>();
const EXPIRY_SKEW_MS = 30_000;
const FALLBACK_TTL_MS = 9 * 60_000;

export const clearSubjectJwtCache = () => cache.clear();

const expiryOf = (token: string): number => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (exp) return exp * 1000;
  } catch {
    // fall through to the fallback lifetime
  }
  return Date.now() + FALLBACK_TTL_MS;
};

const decodeDevJwt = (devJwt: string): { clientId: string } => {
  let payload: { ethereum_address?: string; exp?: number };
  try {
    payload = jwtDecode(devJwt);
  } catch {
    throw new SubjectJwtError(
      401,
      'DEV_JWT_INVALID',
      'The developer JWT could not be read',
    );
  }
  if (!payload.ethereum_address || (payload.exp && payload.exp * 1000 < Date.now())) {
    throw new SubjectJwtError(401, 'DEV_JWT_INVALID', 'The developer JWT has expired');
  }
  return { clientId: payload.ethereum_address };
};

const vehiclePermissions = async (
  tokenId: number,
  clientId: string,
): Promise<string[]> => {
  const res = await fetch(configuration.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query VehicleSacdForLicense($tokenId: Int!, $grantee: Address!) { vehicle(tokenId: $tokenId) { sacd(grantee: $grantee) { permissions } } }',
      variables: { tokenId, grantee: clientId },
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new SubjectJwtError(502, 'UPSTREAM', `Identity API answered ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: { vehicle?: { sacd?: { permissions: string } | null } | null };
  };
  const hex = body.data?.vehicle?.sacd?.permissions;
  const names = hex
    ? decodeSacdPermissions(hex)
        .map((id) => PERMISSION_NAMES[id])
        .filter((n): n is string => !!n)
    : [];
  if (!names.length) {
    throw new SubjectJwtError(
      403,
      'NOT_SHARED',
      'This vehicle is not shared with the license',
    );
  }
  return names;
};

const permissionsFor = async (asset: string, clientId: string): Promise<string[]> => {
  const erc = parseErc721Did(asset);
  if (erc) return vehiclePermissions(erc.tokenId, clientId);
  if (isEthrDid(asset)) return ['privilege:GetRawData'];
  throw new SubjectJwtError(403, 'NOT_SHARED', 'Unsupported asset DID');
};

export const getSubjectJwt = async (devJwt: string, asset: string): Promise<string> => {
  const { clientId } = decodeDevJwt(devJwt);
  const key = `${clientId.toLowerCase()}:${asset}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + EXPIRY_SKEW_MS) return hit.token;

  const permissions = await permissionsFor(asset, clientId);
  const res = await fetch(configuration.tokenExchangeApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${devJwt}` },
    body: JSON.stringify({ asset, permissions }),
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new SubjectJwtError(
      401,
      'DEV_JWT_INVALID',
      'Token exchange rejected the developer JWT',
    );
  }
  if (res.status === 403) {
    throw new SubjectJwtError(
      403,
      'NOT_SHARED',
      'This asset is not shared with the license',
    );
  }
  if (!res.ok) {
    throw new SubjectJwtError(502, 'UPSTREAM', `Token exchange answered ${res.status}`);
  }
  const { token } = (await res.json()) as { token?: string };
  if (!token)
    throw new SubjectJwtError(502, 'UPSTREAM', 'Token exchange returned no token');
  cache.set(key, { token, expiresAt: expiryOf(token) });
  return token;
};
```

`src/utils/sacdPermissions.ts` (Task 2 extends this with labels; create the minimum here):

```ts
// SACD permissions are a bitmap of 2-bit pairs; pair i === 0b11 grants privilege i.
// Privilege ids follow token-exchange-api/pkg/tokenclaims/permissions.go.
export const decodeSacdPermissions = (hex: string): number[] => {
  const clean = hex.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]*$/.test(clean) || clean === '') return [];
  const bits = BigInt(`0x${clean}`);
  const granted: number[] = [];
  for (let i = 0; i < 128; i++) {
    if (((bits >> BigInt(i * 2)) & 3n) === 3n) granted.push(i);
  }
  return granted;
};

export const PERMISSION_NAMES: Record<number, string> = {
  1: 'privilege:GetNonLocationHistory',
  2: 'privilege:ExecuteCommands',
  3: 'privilege:GetCurrentLocation',
  4: 'privilege:GetLocationHistory',
  5: 'privilege:GetVINCredential',
  6: 'privilege:GetLiveData',
  7: 'privilege:GetRawData',
  8: 'privilege:GetApproximateLocation',
};
```

- [ ] **Step 9: Run the subject JWT tests**

Run: `npx jest __tests__/unit/services/subjectJwt.test.ts`
Expected: PASS (8 tests). If `Response` is undefined in the node environment, add `import 'whatwg-fetch'`-free polyfill: Node 18+ provides `Response`; check `node --version` ≥ 18.

- [ ] **Step 10: Write the failing route tests**

`__tests__/unit/app/api/dataProxy.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/services/subjectJwt', () => {
  const actual = jest.requireActual('@/services/subjectJwt');
  return { ...actual, getSubjectJwt: jest.fn() };
});

import { POST as telemetry } from '@/app/api/data/telemetry/route';
import { POST as fetchRoute } from '@/app/api/data/fetch/route';
import { getSubjectJwt, SubjectJwtError } from '@/services/subjectJwt';
import configuration from '@/config';

const VEHICLE = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';
const ACCOUNT = 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const fetchMock = jest.fn();

const req = (body: unknown, auth = 'Bearer dev.jwt') =>
  new NextRequest('https://console.test/api/data/telemetry', {
    method: 'POST',
    headers: auth ? { 'Authorization': auth, 'Content-Type': 'application/json' } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (getSubjectJwt as jest.Mock).mockResolvedValue('asset-jwt');
});

describe('data proxy routes', () => {
  it('forwards a telemetry query with the asset JWT and passes the body through', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { availableSignals: ['speed'] } }), {
        status: 200,
      }),
    );
    const res = await telemetry(
      req({
        asset: VEHICLE,
        query: 'query { availableSignals(tokenId: 190231) }',
        variables: {},
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { availableSignals: ['speed'] } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(configuration.telemetryApiUrl);
    expect(init.headers.Authorization).toBe('Bearer asset-jwt');
    expect(getSubjectJwt).toHaveBeenCalledWith('dev.jwt', VEHICLE);
  });

  it('keeps the upstream status on GraphQL errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: [{ message: 'unauthorized' }] }), {
        status: 401,
      }),
    );
    const res = await fetchRoute(req({ asset: ACCOUNT, query: 'query { x }' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ errors: [{ message: 'unauthorized' }] });
    expect(fetchMock.mock.calls[0][0]).toBe(configuration.fetchApiUrl);
  });

  it('answers 401 without a bearer token', async () => {
    const res = await telemetry(req({ asset: VEHICLE, query: 'query { x }' }, ''));
    expect(res.status).toBe(401);
    expect(getSubjectJwt).not.toHaveBeenCalled();
  });

  it.each([
    [{ asset: 'did:web:x', query: 'query { x }' }, 'asset'],
    [{ asset: VEHICLE }, 'query'],
    [{ asset: VEHICLE, query: 'q'.repeat(20_001) }, 'query'],
    ['not json', 'body'],
  ])('answers 400 for %j', async (body, field) => {
    const res = await telemetry(req(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(field);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('telemetry refuses an account asset', async () => {
    const res = await telemetry(req({ asset: ACCOUNT, query: 'query { x }' }));
    expect(res.status).toBe(400);
  });

  it('maps subject JWT errors to their status and code', async () => {
    (getSubjectJwt as jest.Mock).mockRejectedValueOnce(
      new SubjectJwtError(403, 'NOT_SHARED', 'not shared'),
    );
    const res = await fetchRoute(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not shared', code: 'NOT_SHARED' });
  });

  it('answers 502 when the upstream is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const res = await fetchRoute(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('UPSTREAM');
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `npx jest __tests__/unit/app/api/dataProxy.test.ts`
Expected: FAIL, cannot find `@/app/api/data/telemetry/route`.

- [ ] **Step 12: Implement the proxy factory and routes**

`src/app/api/data/proxy.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import configuration from '@/config';
import { getSubjectJwt, SubjectJwtError } from '@/services/subjectJwt';
import { isEthrDid, parseErc721Did } from '@/services/subjects/did';

export type DataApi = 'telemetry' | 'fetch';

const MAX_QUERY_CHARS = 20_000;
const UPSTREAM: Record<DataApi, () => string> = {
  telemetry: () => configuration.telemetryApiUrl,
  fetch: () => configuration.fetchApiUrl,
};

type Body = { asset: string; query: string; variables?: Record<string, unknown> };

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

const readBody = async (req: NextRequest): Promise<Body | NextResponse> => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad('Expected a JSON body');
  }
  const body = raw as Partial<Body>;
  if (typeof body.query !== 'string' || !body.query.trim())
    return bad('query is required');
  if (body.query.length > MAX_QUERY_CHARS) return bad('query is too long');
  if (typeof body.asset !== 'string') return bad('asset is required');
  if (
    body.variables !== undefined &&
    (typeof body.variables !== 'object' || body.variables === null)
  ) {
    return bad('variables must be an object');
  }
  return { asset: body.asset, query: body.query, variables: body.variables ?? {} };
};

const assetAllowed = (api: DataApi, asset: string) =>
  api === 'telemetry'
    ? !!parseErc721Did(asset)
    : !!parseErc721Did(asset) || isEthrDid(asset);

// One handler shape for both upstreams: exchange the developer JWT for a token
// scoped to `asset`, forward the GraphQL request, pass the upstream answer back.
export const createDataProxy = (api: DataApi) => async (req: NextRequest) => {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || auth.length < 8) {
    return NextResponse.json(
      { error: 'Developer JWT required', code: 'DEV_JWT_INVALID' },
      { status: 401 },
    );
  }
  const devJwt = auth.slice(7);

  const body = await readBody(req);
  if (body instanceof NextResponse) return body;
  if (!assetAllowed(api, body.asset))
    return bad(`asset is not a DID this ${api} proxy serves`);

  try {
    const token = await getSubjectJwt(devJwt, body.asset);
    const upstream = await fetch(UPSTREAM[api](), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: body.query, variables: body.variables }),
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof SubjectJwtError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: `The ${api} API could not be reached`, code: 'UPSTREAM' },
      { status: 502 },
    );
  }
};
```

`src/app/api/data/telemetry/route.ts`:

```ts
import { createDataProxy } from '@/app/api/data/proxy';

export const POST = createDataProxy('telemetry');
```

`src/app/api/data/fetch/route.ts`:

```ts
import { createDataProxy } from '@/app/api/data/proxy';

export const POST = createDataProxy('fetch');
```

- [ ] **Step 13: Run the route tests, then the whole suite**

Run: `npx jest __tests__/unit/app/api/dataProxy.test.ts` → PASS (10 tests).
Run: `npm test && npm run lint && npm run compile` → all green.

- [ ] **Step 14: Verify against dev, by hand**

With `.env.local` set for dev and `npm run dev` running, sign in, open a license's Config tab so a developer JWT is stored, then in the browser console:

```js
const clientId = '<your clientId>';
const devJwt = JSON.parse(localStorage.getItem(`devJwt_${clientId}_list_v1`))[0].token;
const call = (api, asset, query, variables) => fetch(`/api/data/${api}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${devJwt}` },
  body: JSON.stringify({ asset, query, variables }),
}).then((r) => r.json()).then(console.log);
const asset = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:<a shared tokenId>';
call('telemetry', asset, 'query($t:Int!){ dataSummary(tokenId:$t){ lastSeen availableSignals } }', { t: <tokenId> });
call('fetch', asset, 'query($d:String!){ latestIndex(did:$d){ header { time type source producer } } }', { d: asset });
```

Record in the commit message body: whether the generic `{asset, permissions}` exchange succeeded for the vehicle DID, and the exact shape of `header.source` (a bare `0x…` address or a `did:ethr:…`). Task 3's `resolveTelemetrySource` depends on that shape.

- [ ] **Step 15: Commit**

```bash
git add src/config src/services/subjects/did.ts src/services/subjectJwt.ts src/utils/sacdPermissions.ts src/app/api/data __tests__/unit/services __tests__/unit/app/api
git commit -m "feat(vehicles): data proxy routes with asset-scoped token exchange"
```

---

### Task 2: Data layer — query builders, browser client, hooks and utils

**Files:**

- Create: `src/services/subjects/queries.ts`, `src/services/subjects/client.ts`, `src/hooks/subjects/useSubjectQuery.ts`, `src/utils/freshness.ts`, `src/utils/humanizeSignal.ts`, `src/utils/documentSharingUrl.ts`
- Modify: `src/utils/sacdPermissions.ts` (add labels)
- Test: `__tests__/unit/services/subjects/queries.test.ts`, `__tests__/unit/services/subjects/client.test.ts`, `__tests__/unit/utils/freshness.test.ts`, `__tests__/unit/utils/sacdPermissions.test.ts`, `__tests__/unit/utils/humanizeSignal.test.ts`, `__tests__/unit/utils/documentSharingUrl.test.ts`

**Interfaces:**

- Consumes: `getDevJwt(clientId)` from `@/utils/devJwt`; the routes from Task 1.
- Produces:
  - `type GqlRequest = { query: string; variables: Record<string, unknown> }` and the builders listed in Step 3.
  - `postSubjectQuery<T>(api, { asset, clientId, request }): Promise<GqlResult<T>>` where `GqlResult<T> = { data: T | null; errors?: GqlError[] }`; throws `DataApiError { status, code }` on transport / JWT failures.
  - `useSubjectQuery<T>({ api, asset, clientId, request, enabled })` → TanStack `UseQueryResult<GqlResult<T>, DataApiError>`.
  - `freshnessOf(iso, now)`, `relativeTime(iso, now)`, `FRESHNESS_TONE`.
  - `permissionLabels(hex): string[]`, `PERMISSION_LABELS`.
  - `humanizeSignal(name): string`.
  - `documentSharingUrl({ clientId, redirectUri }): string`.

- [ ] **Step 1: Write the failing freshness tests**

`__tests__/unit/utils/freshness.test.ts`:

```ts
import { freshnessOf, relativeTime, FRESHNESS_TONE } from '@/utils/freshness';

const NOW = Date.parse('2026-09-29T20:49:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('freshnessOf', () => {
  it.each([
    [ago(2 * MIN), 'live'],
    [ago(59 * MIN), 'live'],
    [ago(HOUR), 'stale'],
    [ago(23 * HOUR), 'stale'],
    [ago(DAY), 'inactive'],
    [ago(40 * DAY), 'inactive'],
    [null, 'none'],
    [undefined, 'none'],
    ['not a date', 'none'],
  ])('%s → %s', (iso, expected) => {
    expect(freshnessOf(iso, NOW)).toBe(expected);
  });
});

describe('relativeTime', () => {
  it.each([
    [ago(20_000), 'just now'],
    [ago(2 * MIN), '2 min ago'],
    [ago(1 * MIN), '1 min ago'],
    [ago(3 * HOUR), '3 h ago'],
    [ago(1 * DAY), '1 day ago'],
    [ago(14 * DAY), '14 days ago'],
    [ago(70 * DAY), 'Jul 21, 2026'],
    [null, 'Never'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected);
  });
});

it('maps freshness to StatusChip tones', () => {
  expect(FRESHNESS_TONE).toEqual({
    live: 'live',
    stale: 'pending',
    inactive: 'error',
    none: 'off',
  });
});
```

- [ ] **Step 2: Implement freshness**

`src/utils/freshness.ts`:

```ts
import type { StatusTone } from '@/components/StatusChip/StatusChip';

export type Freshness = 'live' | 'stale' | 'inactive' | 'none';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const parse = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

// <1h live, <24h stale, older inactive, missing none. Shared by every dot.
export const freshnessOf = (
  iso: string | null | undefined,
  now = Date.now(),
): Freshness => {
  const t = parse(iso);
  if (t === null) return 'none';
  const age = now - t;
  if (age < HOUR) return 'live';
  if (age < DAY) return 'stale';
  return 'inactive';
};

const dateLabel = (t: number) =>
  new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const relativeTime = (
  iso: string | null | undefined,
  now = Date.now(),
): string => {
  const t = parse(iso);
  if (t === null) return 'Never';
  const age = Math.max(0, now - t);
  if (age < MIN) return 'just now';
  if (age < HOUR) return `${Math.floor(age / MIN)} min ago`;
  if (age < DAY) return `${Math.floor(age / HOUR)} h ago`;
  const days = Math.floor(age / DAY);
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} ago`;
  return dateLabel(t);
};

export const absoluteTime = (iso: string | null | undefined): string => {
  const t = parse(iso);
  if (t === null) return '';
  const d = new Date(t);
  return `${dateLabel(t)}, ${d.toISOString().slice(11, 19)} UTC`;
};

export const FRESHNESS_TONE: Record<Freshness, StatusTone> = {
  live: 'live',
  stale: 'pending',
  inactive: 'error',
  none: 'off',
};
```

Run: `npx jest __tests__/unit/utils/freshness.test.ts` → PASS.

- [ ] **Step 3: Write the failing query builder tests**

`__tests__/unit/services/subjects/queries.test.ts`:

```ts
import {
  dataSummaryQuery,
  availableSignalsQuery,
  signalsLatestQuery,
  signalsQuery,
  eventsQuery,
  segmentsQuery,
  dailyActivityQuery,
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
  cloudEventsQuery,
  latestIndexQuery,
  freshnessQuery,
  formatGraphQL,
  InvalidSignalError,
  SEGMENT_DEFAULTS,
} from '@/services/subjects/queries';

const DID = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:184223';
const SRC = 'did:ethr:137:0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E';
const FROM = '2026-09-22T00:00:00Z';
const TO = '2026-09-29T00:00:00Z';

describe('telemetry builders', () => {
  it('dataSummary takes an optional source filter', () => {
    expect(dataSummaryQuery(184223).variables).toEqual({ tokenId: 184223, filter: null });
    expect(dataSummaryQuery(184223, SRC).variables).toEqual({
      tokenId: 184223,
      filter: { source: SRC },
    });
    expect(dataSummaryQuery(184223).query).toContain('signalDataSummary');
    expect(dataSummaryQuery(184223).query).toContain('eventDataSummary');
  });

  it('availableSignals uses variables, never interpolation', () => {
    const q = availableSignalsQuery(184223, SRC);
    expect(q.query).not.toContain('184223');
    expect(q.variables).toEqual({ tokenId: 184223, filter: { source: SRC } });
  });

  it('signalsLatest selects each available signal, with sub-fields for locations', () => {
    const q = signalsLatestQuery(184223, ['speed', 'currentLocationCoordinates']);
    expect(q.query).toContain('speed { timestamp value }');
    expect(q.query).toContain(
      'currentLocationCoordinates { timestamp value { latitude longitude hdop } }',
    );
    expect(q.query).toContain('lastSeen');
  });

  it('signals builds one aggregated field per chosen signal', () => {
    const q = signalsQuery({
      tokenId: 184223,
      signals: ['speed', 'powertrainCombustionEngineSpeed'],
      available: ['speed', 'powertrainCombustionEngineSpeed', 'obdRunTime'],
      agg: 'AVG',
      interval: '1h',
      from: FROM,
      to: TO,
    });
    expect(q.query).toContain('speed(agg: AVG)');
    expect(q.query).toContain('powertrainCombustionEngineSpeed(agg: AVG)');
    expect(q.query).not.toContain('obdRunTime');
    expect(q.variables).toEqual({
      tokenId: 184223,
      from: FROM,
      to: TO,
      interval: '1h',
      filter: null,
    });
  });

  it.each([
    ['unknown', ['odometerHack']],
    ['malformed', ['speed) { x }']],
    ['empty', []],
  ])('signals refuses %s signal names', (_, signals) => {
    expect(() =>
      signalsQuery({
        tokenId: 1,
        signals,
        available: ['speed'],
        agg: 'AVG',
        interval: '1h',
        from: FROM,
        to: TO,
      }),
    ).toThrow(InvalidSignalError);
  });

  it('events, segments and dailyActivity carry their ranges and defaults', () => {
    expect(
      eventsQuery({ tokenId: 1, from: FROM, to: TO, source: SRC }).variables,
    ).toEqual({
      tokenId: 1,
      from: FROM,
      to: TO,
      filter: { source: { eq: SRC } },
    });
    const seg = segmentsQuery({
      tokenId: 1,
      from: FROM,
      to: TO,
      mechanism: 'ignitionDetection',
    });
    expect(seg.variables).toEqual({
      tokenId: 1,
      from: FROM,
      to: TO,
      mechanism: 'ignitionDetection',
      config: SEGMENT_DEFAULTS,
      limit: 100,
      after: null,
    });
    expect(seg.query).toContain('isOngoing');
    expect(
      dailyActivityQuery({
        tokenId: 1,
        from: FROM,
        to: TO,
        mechanism: 'frequencyAnalysis',
      }).query,
    ).toContain('segmentCount');
  });
});

describe('fetch builders', () => {
  it('availableCloudEventTypes and latestCloudEvent take the DID as a variable', () => {
    expect(availableCloudEventTypesQuery(DID).variables).toEqual({ did: DID });
    const latest = latestCloudEventQuery(DID, { type: 'dimo.status' }, true);
    expect(latest.variables).toEqual({ did: DID, filter: { type: 'dimo.status' } });
    expect(latest.query).toContain('dataUrl');
    expect(latestCloudEventQuery(DID, {}, false).query).not.toContain('dataUrl');
    expect(latestCloudEventQuery(DID, {}, false).variables).toEqual({
      did: DID,
      filter: null,
    });
  });

  it('cloudEvents clamps the limit to 1..100', () => {
    expect(cloudEventsQuery(DID, {}, 500, false).variables.limit).toBe(100);
    expect(cloudEventsQuery(DID, {}, 0, false).variables.limit).toBe(1);
    expect(cloudEventsQuery(DID, { before: TO }, 25, false).variables).toEqual({
      did: DID,
      filter: { before: TO },
      limit: 25,
    });
  });

  it('freshnessQuery aliases one latestIndex per DID', () => {
    const q = freshnessQuery([DID, SRC]);
    expect(q.query).toContain('s0: latestIndex(did: $d0)');
    expect(q.query).toContain('s1: latestIndex(did: $d1)');
    expect(q.query).toContain('$d0: String!');
    expect(q.variables).toEqual({ d0: DID, d1: SRC });
    expect(latestIndexQuery(DID).query).toContain('indexKey');
  });
});

it('formatGraphQL prints the query and variables for copying', () => {
  const text = formatGraphQL(availableCloudEventTypesQuery(DID));
  expect(text).toContain('availableCloudEventTypes');
  expect(text).toContain('# variables');
  expect(text).toContain(`"did": "${DID}"`);
});
```

- [ ] **Step 4: Implement the query builders**

`src/services/subjects/queries.ts`:

```ts
// Pure GraphQL request builders for the Telemetry and Fetch APIs. Every value is
// a variable; the only interpolation is the signal selection set, and each name
// is checked against the subject's availableSignals first.

export type GqlRequest = { query: string; variables: Record<string, unknown> };

export class InvalidSignalError extends Error {
  constructor(name: string) {
    super(`Unknown signal "${name}"`);
    this.name = 'InvalidSignalError';
  }
}

const SIGNAL_NAME = /^[a-zA-Z][a-zA-Z0-9]*$/;

// Signals whose value is an object; everything else is `{ timestamp value }`.
export const COMPLEX_VALUE_FIELDS: Record<string, string> = {
  currentLocationCoordinates: '{ latitude longitude hdop }',
  currentLocationApproximateCoordinates: '{ latitude longitude hdop }',
};

export const isLocationSignal = (name: string) => name in COMPLEX_VALUE_FIELDS;

const checkSignals = (signals: string[], available: string[]) => {
  if (!signals.length) throw new InvalidSignalError('');
  const allowed = new Set(available);
  for (const s of signals) {
    if (!SIGNAL_NAME.test(s) || !allowed.has(s)) throw new InvalidSignalError(s);
  }
};

const sourceFilter = (source?: string) => (source ? { source } : null);

// ── Telemetry ────────────────────────────────────────────────────────────

export const dataSummaryQuery = (tokenId: number, source?: string): GqlRequest => ({
  query: `query DataSummary($tokenId: Int!, $filter: SignalFilter) {
  dataSummary(tokenId: $tokenId, filter: $filter) {
    numberOfSignals
    availableSignals
    firstSeen
    lastSeen
    signalDataSummary { name numberOfSignals firstSeen lastSeen }
    eventDataSummary { name numberOfEvents firstSeen lastSeen }
  }
}`,
  variables: { tokenId, filter: sourceFilter(source) },
});

export const availableSignalsQuery = (tokenId: number, source?: string): GqlRequest => ({
  query: `query AvailableSignals($tokenId: Int!, $filter: SignalFilter) {
  availableSignals(tokenId: $tokenId, filter: $filter)
}`,
  variables: { tokenId, filter: sourceFilter(source) },
});

export const signalsLatestQuery = (
  tokenId: number,
  available: string[],
  source?: string,
): GqlRequest => {
  checkSignals(available, available);
  const fields = available
    .map((s) => {
      const sub = COMPLEX_VALUE_FIELDS[s];
      return sub ? `    ${s} { timestamp value ${sub} }` : `    ${s} { timestamp value }`;
    })
    .join('\n');
  return {
    query: `query SignalsLatest($tokenId: Int!, $filter: SignalFilter) {
  signalsLatest(tokenId: $tokenId, filter: $filter) {
    lastSeen
${fields}
  }
}`,
    variables: { tokenId, filter: sourceFilter(source) },
  };
};

export type FloatAggregation = 'AVG' | 'MED' | 'MAX' | 'MIN' | 'RAND' | 'FIRST' | 'LAST';

export const signalsQuery = (input: {
  tokenId: number;
  signals: string[];
  available: string[];
  agg: FloatAggregation;
  interval: string; // e.g. "1h", "5m"
  from: string;
  to: string;
  source?: string;
}): GqlRequest => {
  const chosen = input.signals.filter((s) => !isLocationSignal(s));
  checkSignals(chosen, input.available);
  const fields = chosen.map((s) => `    ${s}(agg: ${input.agg})`).join('\n');
  return {
    query: `query Signals($tokenId: Int!, $from: Time!, $to: Time!, $interval: String!, $filter: SignalFilter) {
  signals(tokenId: $tokenId, from: $from, to: $to, interval: $interval, filter: $filter) {
    timestamp
${fields}
  }
}`,
    variables: {
      tokenId: input.tokenId,
      from: input.from,
      to: input.to,
      interval: input.interval,
      filter: sourceFilter(input.source),
    },
  };
};

export const eventsQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  source?: string;
}): GqlRequest => ({
  query: `query Events($tokenId: Int!, $from: Time!, $to: Time!, $filter: EventFilter) {
  events(tokenId: $tokenId, from: $from, to: $to, filter: $filter) {
    timestamp name source durationNs metadata
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    filter: input.source ? { source: { eq: input.source } } : null,
  },
});

export type DetectionMechanism =
  | 'ignitionDetection'
  | 'frequencyAnalysis'
  | 'changePointDetection'
  | 'idling'
  | 'refuel'
  | 'recharge';

export type SegmentConfig = {
  maxGapSeconds: number;
  minSegmentDurationSeconds: number;
  signalCountThreshold: number;
  maxIdleRpm: number;
  minIncreasePercent: number | null;
};

// dimo-admin's defaults, which match the API's documented ones.
export const SEGMENT_DEFAULTS: SegmentConfig = {
  maxGapSeconds: 300,
  minSegmentDurationSeconds: 240,
  signalCountThreshold: 10,
  maxIdleRpm: 1000,
  minIncreasePercent: null,
};

const SEGMENT_FIELDS = `
    start { timestamp value { latitude longitude hdop } }
    end { timestamp value { latitude longitude hdop } }
    duration isOngoing startedBeforeRange
    signals { name agg value }
    eventCounts { name count }`;

export const segmentsQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  mechanism: DetectionMechanism;
  config?: SegmentConfig;
  limit?: number;
  after?: string | null;
}): GqlRequest => ({
  query: `query Segments($tokenId: Int!, $from: Time!, $to: Time!, $mechanism: DetectionMechanism!, $config: SegmentConfig, $limit: Int, $after: Time) {
  segments(tokenId: $tokenId, from: $from, to: $to, mechanism: $mechanism, config: $config, limit: $limit, after: $after) {${SEGMENT_FIELDS}
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    mechanism: input.mechanism,
    config: input.config ?? SEGMENT_DEFAULTS,
    limit: input.limit ?? 100,
    after: input.after ?? null,
  },
});

export const dailyActivityQuery = (input: {
  tokenId: number;
  from: string;
  to: string;
  mechanism: DetectionMechanism;
  config?: SegmentConfig;
}): GqlRequest => ({
  query: `query DailyActivity($tokenId: Int!, $from: Time!, $to: Time!, $mechanism: DetectionMechanism!, $config: SegmentConfig) {
  dailyActivity(tokenId: $tokenId, from: $from, to: $to, mechanism: $mechanism, config: $config) {
    date segmentCount duration
    signals { name agg value }
    eventCounts { name count }
  }
}`,
  variables: {
    tokenId: input.tokenId,
    from: input.from,
    to: input.to,
    mechanism: input.mechanism,
    config: input.config ?? SEGMENT_DEFAULTS,
  },
});

// ── Fetch ────────────────────────────────────────────────────────────────

export type CloudEventFilter = {
  id?: string;
  type?: string;
  source?: string;
  producer?: string;
  dataversion?: string;
  after?: string;
  before?: string;
};

const clean = (f: CloudEventFilter): CloudEventFilter | null => {
  const entries = Object.entries(f).filter(([, v]) => v !== undefined && v !== '');
  return entries.length ? Object.fromEntries(entries) : null;
};

const HEADER =
  'header { id source producer subject time type datacontenttype dataschema dataversion tags }';

export const availableCloudEventTypesQuery = (did: string): GqlRequest => ({
  query: `query AvailableCloudEventTypes($did: String!) {
  availableCloudEventTypes(did: $did) { type count firstSeen lastSeen }
}`,
  variables: { did },
});

export const latestCloudEventQuery = (
  did: string,
  filter: CloudEventFilter,
  includeDataUrl: boolean,
): GqlRequest => ({
  query: `query LatestCloudEvent($did: String!, $filter: CloudEventFilter) {
  latestCloudEvent(did: $did, filter: $filter) { ${HEADER} data${includeDataUrl ? ' dataUrl' : ''} }
}`,
  variables: { did, filter: clean(filter) },
});

export const cloudEventsQuery = (
  did: string,
  filter: CloudEventFilter,
  limit: number,
  includeDataUrl: boolean,
): GqlRequest => ({
  query: `query CloudEvents($did: String!, $filter: CloudEventFilter, $limit: Int) {
  cloudEvents(did: $did, filter: $filter, limit: $limit) { ${HEADER} data${includeDataUrl ? ' dataUrl' : ''} }
}`,
  variables: {
    did,
    filter: clean(filter),
    limit: Math.min(100, Math.max(1, Math.floor(limit) || 1)),
  },
});

export const latestIndexQuery = (
  did: string,
  filter: CloudEventFilter = {},
): GqlRequest => ({
  query: `query LatestIndex($did: String!, $filter: CloudEventFilter) {
  latestIndex(did: $did, filter: $filter) { ${HEADER} indexKey }
}`,
  variables: { did, filter: clean(filter) },
});

export const indexesQuery = (
  did: string,
  filter: CloudEventFilter,
  limit: number,
): GqlRequest => ({
  query: `query Indexes($did: String!, $filter: CloudEventFilter, $limit: Int) {
  indexes(did: $did, filter: $filter, limit: $limit) { ${HEADER} indexKey }
}`,
  variables: {
    did,
    filter: clean(filter),
    limit: Math.min(100, Math.max(1, Math.floor(limit) || 1)),
  },
});

// One request for every rail item's latest payload time: metadata only.
export const freshnessQuery = (dids: string[]): GqlRequest => {
  const decl = dids.map((_, i) => `$d${i}: String!`).join(', ');
  const fields = dids
    .map(
      (_, i) =>
        `  s${i}: latestIndex(did: $d${i}) { header { time type source producer } }`,
    )
    .join('\n');
  return {
    query: `query Freshness(${decl}) {\n${fields}\n}`,
    variables: Object.fromEntries(dids.map((d, i) => [`d${i}`, d])),
  };
};

// What "Copy query" puts on the clipboard.
export const formatGraphQL = (req: GqlRequest): string =>
  `${req.query}\n\n# variables\n${JSON.stringify(req.variables, null, 2)}`;
```

Run: `npx jest __tests__/unit/services/subjects/queries.test.ts` → PASS.

- [ ] **Step 5: Write the failing client tests**

`__tests__/unit/services/subjects/client.test.ts`:

```ts
import { postSubjectQuery, DataApiError } from '@/services/subjects/client';

jest.mock('@/utils/devJwt', () => ({ getDevJwt: jest.fn() }));
import { getDevJwt } from '@/utils/devJwt';

const fetchMock = jest.fn();
const req = { query: 'query { x }', variables: { a: 1 } };
const ASSET = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (getDevJwt as jest.Mock).mockReturnValue('dev.jwt');
});

const answer = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

describe('postSubjectQuery', () => {
  it('posts to the proxy with the developer JWT and returns data', async () => {
    answer(200, { data: { x: 1 } });
    const res = await postSubjectQuery<{ x: number }>('telemetry', {
      asset: ASSET,
      clientId: '0xabc',
      request: req,
    });
    expect(res).toEqual({ data: { x: 1 }, errors: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/data/telemetry');
    expect(init.headers.Authorization).toBe('Bearer dev.jwt');
    expect(JSON.parse(init.body)).toEqual({ asset: ASSET, ...req });
  });

  it('returns partial data with field errors instead of throwing', async () => {
    answer(200, {
      data: { x: null },
      errors: [{ message: 'needs location privilege', path: ['x'] }],
    });
    const res = await postSubjectQuery('fetch', {
      asset: ASSET,
      clientId: '0xabc',
      request: req,
    });
    expect(res.errors?.[0].message).toBe('needs location privilege');
    expect(res.data).toEqual({ x: null });
  });

  it('throws DEV_JWT_MISSING before calling the proxy when no JWT is stored', async () => {
    (getDevJwt as jest.Mock).mockReturnValue(null);
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toMatchObject({ code: 'DEV_JWT_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps proxy errors to DataApiError with their code', async () => {
    answer(403, { error: 'not shared', code: 'NOT_SHARED' });
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toEqual(
      expect.objectContaining({ status: 403, code: 'NOT_SHARED', message: 'not shared' }),
    );
  });

  it('treats an upstream 401 with GraphQL errors as a GraphQL failure', async () => {
    answer(401, { errors: [{ message: 'unauthorized' }] });
    await expect(
      postSubjectQuery('telemetry', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toBeInstanceOf(DataApiError);
  });
});
```

- [ ] **Step 6: Implement the client**

`src/services/subjects/client.ts`:

```ts
import { getDevJwt } from '@/utils/devJwt';
import type { GqlRequest } from './queries';

export type DataApi = 'telemetry' | 'fetch';
export type GqlError = { message: string; path?: (string | number)[] };
export type GqlResult<T> = { data: T | null; errors?: GqlError[] };
export type DataApiCode =
  | 'DEV_JWT_MISSING'
  | 'DEV_JWT_INVALID'
  | 'NOT_SHARED'
  | 'UPSTREAM'
  | 'GRAPHQL';

export class DataApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: DataApiCode,
    message: string,
    public readonly graphqlErrors: GqlError[] = [],
  ) {
    super(message);
    this.name = 'DataApiError';
  }
}

export const postSubjectQuery = async <T>(
  api: DataApi,
  input: { asset: string; clientId: string; request: GqlRequest },
): Promise<GqlResult<T>> => {
  const devJwt = getDevJwt(input.clientId);
  if (!devJwt) {
    throw new DataApiError(
      0,
      'DEV_JWT_MISSING',
      'Generate a developer JWT to read this data',
    );
  }
  const res = await fetch(`/api/data/${api}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${devJwt}` },
    body: JSON.stringify({ asset: input.asset, ...input.request }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: T | null;
    errors?: GqlError[];
    error?: string;
    code?: DataApiCode;
  };
  if (body.code && body.error) throw new DataApiError(res.status, body.code, body.error);
  if (!res.ok && !body.data) {
    const message = body.errors?.[0]?.message ?? `The ${api} API answered ${res.status}`;
    throw new DataApiError(res.status, 'GRAPHQL', message, body.errors ?? []);
  }
  return { data: body.data ?? null, errors: body.errors };
};

// The message shown in a panel for one failed field.
export const fieldError = (
  errors: GqlError[] | undefined,
  field: string,
): string | null => errors?.find((e) => e.path?.[0] === field)?.message ?? null;
```

Run: `npx jest __tests__/unit/services/subjects/client.test.ts` → PASS.

- [ ] **Step 7: Add the TanStack hook**

`src/hooks/subjects/useSubjectQuery.ts` (no unit test; it is a thin wrapper exercised by the component tests in Tasks 5–10):

```ts
'use client';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  postSubjectQuery,
  type DataApi,
  type DataApiError,
  type GqlResult,
} from '@/services/subjects/client';
import type { GqlRequest } from '@/services/subjects/queries';

export const subjectQueryKey = (
  api: DataApi,
  asset: string,
  request: GqlRequest | null,
) => ['subject', api, asset, request?.query ?? '', request?.variables ?? {}] as const;

// One cache entry per (api, asset, query, variables). Data-health reads are
// safe to reuse for a minute; callers that must be fresh pass staleTime: 0.
export const useSubjectQuery = <T>(input: {
  api: DataApi;
  asset: string;
  clientId: string;
  request: GqlRequest | null;
  enabled?: boolean;
  staleTime?: number;
}): UseQueryResult<GqlResult<T>, DataApiError> =>
  useQuery<GqlResult<T>, DataApiError>({
    queryKey: subjectQueryKey(input.api, input.asset, input.request),
    queryFn: () =>
      postSubjectQuery<T>(input.api, {
        asset: input.asset,
        clientId: input.clientId,
        request: input.request as GqlRequest,
      }),
    enabled: (input.enabled ?? true) && !!input.request && !!input.clientId,
    staleTime: input.staleTime ?? 60_000,
    retry: false,
  });
```

- [ ] **Step 8: Write the failing permission, humanize and sharing-url tests**

`__tests__/unit/utils/sacdPermissions.test.ts`:

```ts
import {
  decodeSacdPermissions,
  permissionLabels,
  permissionNames,
} from '@/utils/sacdPermissions';

// pairs 1,3,4,7 granted
const HEX = '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);

describe('sacd permissions', () => {
  it('decodes 2-bit pairs into privilege ids', () => {
    expect(decodeSacdPermissions(HEX)).toEqual([1, 3, 4, 7]);
    expect(decodeSacdPermissions('0x0')).toEqual([]);
    expect(decodeSacdPermissions('zz')).toEqual([]);
  });
  it('labels them for people and names them for token exchange', () => {
    expect(permissionLabels(HEX)).toEqual([
      'Non-location data',
      'Current location',
      'All-time location',
      'Raw data',
    ]);
    expect(permissionNames(HEX)).toEqual([
      'privilege:GetNonLocationHistory',
      'privilege:GetCurrentLocation',
      'privilege:GetLocationHistory',
      'privilege:GetRawData',
    ]);
  });
  it('shows unknown ids as their number', () => {
    const odd = '0x' + (3n << 40n).toString(16);
    expect(permissionLabels(odd)).toEqual(['Privilege 20']);
  });
});
```

`__tests__/unit/utils/humanizeSignal.test.ts`:

```ts
import { humanizeSignal } from '@/utils/humanizeSignal';

it.each([
  ['speed', 'Speed'],
  ['powertrainTransmissionTravelledDistance', 'Odometer'],
  ['powertrainCombustionEngineSpeed', 'Engine speed'],
  ['obdDTCList', 'Diagnostic codes'],
  ['chassisAxleRow1WheelLeftTirePressure', 'Chassis axle row 1 wheel left tire pressure'],
  ['isIgnitionOn', 'Ignition on'],
  ['harshBraking', 'Harsh braking'],
])('%s → %s', (name, label) => {
  expect(humanizeSignal(name)).toBe(label);
});
```

`__tests__/unit/utils/documentSharingUrl.test.ts`:

```ts
import { documentSharingUrl } from '@/utils/documentSharingUrl';

it('builds the Login with DIMO account-manager link for a license', () => {
  const url = new URL(
    documentSharingUrl({ clientId: '0xabc', redirectUri: 'https://app.example.com/cb' }),
  );
  expect(url.origin).toBe('https://login.dev.dimo.org');
  expect(url.searchParams.get('clientId')).toBe('0xabc');
  expect(url.searchParams.get('redirectUri')).toBe('https://app.example.com/cb');
  expect(url.searchParams.get('entryState')).toBe('ACCOUNT_MANAGER');
});
```

- [ ] **Step 9: Implement them**

Append to `src/utils/sacdPermissions.ts`:

```ts
export const PERMISSION_LABELS: Record<number, string> = {
  1: 'Non-location data',
  2: 'Commands',
  3: 'Current location',
  4: 'All-time location',
  5: 'VIN credential',
  6: 'Live data',
  7: 'Raw data',
  8: 'Approximate location',
};

export const permissionLabels = (hex: string): string[] =>
  decodeSacdPermissions(hex).map((id) => PERMISSION_LABELS[id] ?? `Privilege ${id}`);

export const permissionNames = (hex: string): string[] =>
  decodeSacdPermissions(hex)
    .map((id) => PERMISSION_NAMES[id])
    .filter((n): n is string => !!n);
```

`src/utils/humanizeSignal.ts`:

```ts
// Readable labels for VSS-style camelCase names. The overrides cover the names
// people search for; everything else is split on capitals and digits.
const OVERRIDES: Record<string, string> = {
  speed: 'Speed',
  powertrainTransmissionTravelledDistance: 'Odometer',
  powertrainCombustionEngineSpeed: 'Engine speed',
  powertrainFuelSystemRelativeLevel: 'Fuel level',
  powertrainRange: 'Range',
  powertrainTractionBatteryStateOfChargeCurrent: 'Battery charge',
  powertrainTractionBatteryChargingIsCharging: 'Charging',
  currentLocationCoordinates: 'Location',
  currentLocationApproximateCoordinates: 'Approximate location',
  currentLocationLatitude: 'Latitude',
  currentLocationLongitude: 'Longitude',
  obdDTCList: 'Diagnostic codes',
  obdEngineLoad: 'Engine load',
  obdRunTime: 'Engine run time',
  lowVoltageBatteryCurrentVoltage: '12V battery voltage',
  exteriorAirTemperature: 'Outside air temperature',
  isIgnitionOn: 'Ignition on',
};

export const humanizeSignal = (name: string): string => {
  const override = OVERRIDES[name];
  if (override) return override;
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
```

`src/utils/documentSharingUrl.ts`:

```ts
import configuration from '@/config';

// The Login with DIMO link that asks an owner to share documents with a license.
// entryState ACCOUNT_MANAGER opens the account-level grant flow, not vehicle sharing.
export const documentSharingUrl = (input: { clientId: string; redirectUri: string }) => {
  const params = new URLSearchParams({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    entryState: 'ACCOUNT_MANAGER',
  });
  return `${configuration.loginBaseUrl}/?${params.toString()}`;
};
```

Run: `npx jest __tests__/unit/utils` → PASS. `npm test && npm run lint && npm run compile` → green.

- [ ] **Step 10: Commit**

```bash
git add src/services/subjects src/hooks/subjects src/utils/freshness.ts src/utils/sacdPermissions.ts src/utils/humanizeSignal.ts src/utils/documentSharingUrl.ts __tests__/unit
git commit -m "feat(vehicles): query builders, data client and freshness utils"
```

---

### Task 3: Identity query and the subject graph

**Files:**

- Create: `src/app/vehicles/[tokenId]/queries.ts`, `src/services/subjects/graph.ts`, `src/hooks/subjects/useSubjectFreshness.ts`
- Test: `__tests__/unit/services/subjects/graph.test.ts`
- Regenerate: `src/gql/*` via `npm run compile`

**Interfaces:**

- Consumes: `gql` from `@/gql`, `accountDid`, `sourceDid`, `shortAddress` (Task 1), `freshnessQuery` + `useSubjectQuery` (Task 2).
- Produces:
  - `VEHICLE_DETAIL` (operation `GetVehicleDetail($tokenId: Int!)`) and `LICENSE_ALIAS` (`GetDeveloperLicenseAlias($clientId: Address!)`).
  - `type VehicleDetail = NonNullable<GetVehicleDetailQuery['vehicle']>`.
  - `type SubjectKind`, `type SubjectCapability`, `type Subject`, `type SubjectGraph`, `buildVehicleGraph(vehicle: VehicleDetail, chainId: number): SubjectGraph`, `resolveTelemetrySource(subject, headerSource: string | null, chainId): string | undefined`.
  - `useSubjectFreshness({ graph, clientId, enabled })` → `{ byDid: Record<string, { time: string | null; type: string | null; source: string | null }>; isLoading; error }` (vehicle + devices only; the account subject is separate).

- [ ] **Step 1: Add the Identity documents**

`src/app/vehicles/[tokenId]/queries.ts`:

```ts
import { gql } from '@/gql';

export const VEHICLE_DETAIL = gql(`
  query GetVehicleDetail($tokenId: Int!) {
    vehicle(tokenId: $tokenId) {
      tokenId
      tokenDID
      owner
      mintedAt
      imageURI
      definition { id make model year }
      aftermarketDevice {
        tokenId
        tokenDID
        address
        serial
        pairedAt
        mintedAt
        manufacturer { name }
      }
      syntheticDevice {
        tokenId
        tokenDID
        address
        mintedAt
        connection { name address }
      }
      sacds(first: 100) {
        nodes { grantee permissions createdAt expiresAt source }
      }
      privileges(first: 50) {
        nodes { id user setAt expiresAt }
      }
    }
  }
`);

export const LICENSE_ALIAS = gql(`
  query GetDeveloperLicenseAlias($clientId: Address!) {
    developerLicense(by: { clientId: $clientId }) {
      alias
      clientId
    }
  }
`);
```

Run: `npm run compile`. Expected: `src/gql/graphql.ts` gains `GetVehicleDetailQuery` and `GetDeveloperLicenseAliasQuery`; no errors. (If the dev schema lacks a field named here, remove that field and note it in the commit body.)

- [ ] **Step 2: Write the failing graph tests**

`__tests__/unit/services/subjects/graph.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest __tests__/unit/services/subjects/graph.test.ts` → FAIL, module not found.

- [ ] **Step 4: Implement the graph**

`src/services/subjects/graph.ts`:

```ts
import type { GetVehicleDetailQuery } from '@/gql/graphql';
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
  did: string;
  kind: SubjectKind;
  label: string;
  sublabel: string;
  // The DID the token exchange is made for. Devices ride on the vehicle's token.
  asset: string;
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

const date = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

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
    tokenId: v.tokenId,
    capabilities: ['summary', 'signals', 'raw', 'trips'],
    details: [
      { label: 'Make, model, year', value: mmy || 'Unknown' },
      { label: 'Definition ID', value: v.definition?.id ?? '—', mono: true },
      { label: 'Owner', value: v.owner, mono: true },
      { label: 'Minted', value: date(v.mintedAt) },
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
      tokenId: v.tokenId,
      capabilities: ['summary', 'signals', 'raw'],
      parent: v.tokenDID,
      details: [
        { label: 'Manufacturer', value: ad.manufacturer?.name ?? '—' },
        { label: 'Serial', value: ad.serial ?? '—', mono: true },
        { label: 'Device address', value: ad.address, mono: true },
        { label: 'Paired', value: date(ad.pairedAt) },
        { label: 'Minted', value: date(ad.mintedAt) },
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
        { label: 'Minted', value: date(sd.mintedAt) },
        { label: 'Device DID', value: sd.tokenDID, mono: true },
      ],
    });
  }

  const account: Subject = {
    did: accountDid(chainId, v.owner),
    kind: 'account',
    label: 'Documents',
    sublabel: 'Owner account',
    asset: accountDid(chainId, v.owner),
    capabilities: ['documents', 'raw'],
    details: [
      { label: 'Owner', value: v.owner, mono: true },
      { label: 'Account DID', value: accountDid(chainId, v.owner), mono: true },
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
```

Run: `npx jest __tests__/unit/services/subjects/graph.test.ts` → PASS.

- [ ] **Step 5: Add the freshness hook**

`src/hooks/subjects/useSubjectFreshness.ts`:

```ts
'use client';
import { useMemo } from 'react';
import { useSubjectQuery } from './useSubjectQuery';
import { freshnessQuery } from '@/services/subjects/queries';
import type { SubjectGraph } from '@/services/subjects/graph';

export type LatestIndexHeader = {
  time: string | null;
  type: string | null;
  source: string | null;
  producer: string | null;
};
type FreshnessData = Record<string, { header: LatestIndexHeader } | null>;

// One aliased latestIndex call for the vehicle and its devices (they share the
// vehicle token). The account subject is a different asset: DocumentsTab asks
// for it separately, so a missing account grant never blanks the rail.
export const useSubjectFreshness = (input: {
  graph: SubjectGraph | null;
  clientId: string;
  enabled?: boolean;
}) => {
  const dids = useMemo(
    () =>
      input.graph
        ? [input.graph.vehicle.did, ...input.graph.devices.map((d) => d.did)]
        : [],
    [input.graph],
  );
  const request = useMemo(() => (dids.length ? freshnessQuery(dids) : null), [dids]);
  const q = useSubjectQuery<FreshnessData>({
    api: 'fetch',
    asset: input.graph?.vehicle.asset ?? '',
    clientId: input.clientId,
    request,
    enabled: (input.enabled ?? true) && !!input.graph,
    staleTime: 30_000,
  });
  const byDid = useMemo(() => {
    const out: Record<string, LatestIndexHeader> = {};
    dids.forEach((did, i) => {
      const h = q.data?.data?.[`s${i}`]?.header;
      out[did] = h ?? { time: null, type: null, source: null, producer: null };
    });
    return out;
  }, [dids, q.data]);
  return { byDid, isLoading: q.isLoading, error: q.error, refetch: q.refetch };
};
```

Run: `npm test && npm run lint && npm run compile` → green.

- [ ] **Step 6: Commit**

```bash
git add src/app/vehicles src/services/subjects/graph.ts src/hooks/subjects/useSubjectFreshness.ts src/gql __tests__/unit/services/subjects/graph.test.ts
git commit -m "feat(vehicles): vehicle detail query and subject graph"
```

---

### Task 4: The Vehicles list, navigation swap and explorer removal

**Files:**

- Create: `src/components/Icons/CarIcon.tsx`, `src/components/FreshnessDot/FreshnessDot.tsx`, `src/components/FreshnessDot/index.ts`, `src/app/vehicles/layout.ts`, `src/app/vehicles/page.tsx`, `src/app/vehicles/components/VehiclesView.tsx`, `src/app/license/vehicles/[clientId]/components/VehicleDetailsTable/LastSeenCell.tsx`
- Modify: `src/components/Icons/index.ts`, `src/config/navigation.ts`, `src/app/app/list/components/View/View.tsx`, `next.config.mjs`, `src/app/license/vehicles/[clientId]/components/VehicleDetailsTable/{VehicleDetailsTable.tsx,constants.tsx}`, `src/services/subjects/queries.ts` (add `lastSeenQuery`), `scripts/visual/README.md` (explorer mention)
- Delete: `src/app/explorer/` (all), `src/hooks/useVehicleData.ts`, `src/app/api/vehicle-signals/route.ts`
- Test: `__tests__/unit/config/navigation.test.ts`, `__tests__/unit/components/FreshnessDot.test.tsx`, `__tests__/unit/pages/vehicles/VehiclesView.test.tsx`

**Interfaces:**

- Consumes: `useSubjectQuery`, `freshnessOf`, `relativeTime`, `FRESHNESS_TONE` (Task 2).
- Produces:
  - `FreshnessDot({ at, now?, label?: boolean, className? })`: a 6px dot with the freshness tone, followed by the relative time when `label` (default true).
  - `VehicleDetailsTable({ clientId, owner?, tokenIdSearch?, showSources?, showLastSeen? })`; rows link to `/vehicles/<tokenId>?license=<clientId>`.
  - `lastSeenQuery(tokenId): GqlRequest` (telemetry `signalsLatest { lastSeen }`).
  - Nav: "Vehicles" (`/vehicles`, `CarIcon`) in Workspace after Licenses; "Data explorer" gone; `getPageTitle('/vehicles') === 'Vehicles'`, `/vehicles/<id>` → 'Vehicle'.
  - Redirects: `/explorer` → `/vehicles`, `/explorer/:tokenId` → `/vehicles/:tokenId`.

- [ ] **Step 1: Write the failing navigation test**

`__tests__/unit/config/navigation.test.ts`:

```ts
import { getNavSections, getPageTitle } from '@/config/navigation';

describe('navigation', () => {
  const sections = getNavSections(true);
  const workspace = sections.find((s) => s.label === 'Workspace')!;
  const resources = sections.find((s) => s.label === 'Resources')!;

  it('lists Vehicles in Workspace right after Licenses', () => {
    const labels = workspace.items.map((i) => i.label);
    expect(labels.indexOf('Vehicles')).toBe(labels.indexOf('Licenses') + 1);
    expect(workspace.items.find((i) => i.label === 'Vehicles')).toMatchObject({
      link: '/vehicles',
      disabled: false,
    });
  });

  it('no longer offers a Data explorer entry anywhere', () => {
    const all = sections.flatMap((s) => s.items);
    expect(all.find((i) => i.label === 'Data explorer')).toBeUndefined();
    expect(all.find((i) => i.link === '/explorer')).toBeUndefined();
    expect(resources.items.map((i) => i.label)).toEqual(['Documentation', 'API status']);
  });

  it('titles the vehicle pages', () => {
    expect(getPageTitle('/vehicles')).toBe('Vehicles');
    expect(getPageTitle('/vehicles/184223')).toBe('Vehicle');
    expect(getPageTitle('/explorer')).toBeUndefined();
  });
});
```

Run: `npx jest __tests__/unit/config/navigation.test.ts` → FAIL (Vehicles missing, Data explorer present).

- [ ] **Step 2: Add the icon and update navigation**

`src/components/Icons/CarIcon.tsx` (same shape as `ChipIcon.tsx`):

```tsx
import type { FC } from 'react';
import React from 'react';
import { IconProps } from './index';

export const CarIcon: FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 16.5v-4.25L6.75 8h10.5L19 12.25v4.25M3.75 16.5h16.5M6.5 16.5v2.25M17.5 16.5v2.25M7.5 13.5h.01M16.5 13.5h.01"
    />
  </svg>
);

export default CarIcon;
```

Append to `src/components/Icons/index.ts`: `export * from './CarIcon';`

`src/config/navigation.ts`:

- Replace `const EXPLORER_VEHICLE_REGEX = /^\/explorer\/[^/]+$/;` with `const VEHICLE_DETAIL_REGEX = /^\/vehicles\/[^/]+$/;`
- In `getPageTitle`, replace `if (EXPLORER_VEHICLE_REGEX.test(path)) return 'Data Explorer';` with `if (VEHICLE_DETAIL_REGEX.test(path)) return 'Vehicle';`
- In `pageTitles`, replace `'/explorer': 'Data Explorer',` with `'/vehicles': 'Vehicles',`
- Delete `dataExplorerMenuItem`, `baseMainMenu`, `connectionsMenuItem`, `getMainMenu` and `export const mainMenu = getMainMenu(true);` (dead code: only `getNavSections` and `bottomMenu` are imported).
- Import `CarIcon` instead of `ChipIcon` and, in `getNavSections`, insert after the Licenses item:

```ts
      {
        label: 'Vehicles',
        icon: CarIcon,
        iconClassName: 'h-4 w-4',
        link: '/vehicles',
        external: false,
        disabled: false,
      },
```

- Remove the `Data explorer` item from the Resources section.

Run: `npx jest __tests__/unit/config/navigation.test.ts` → PASS. Also run `npx jest __tests__/unit/app/templatesGate.test.tsx` (it reads `getNavSections`) → still PASS.

- [ ] **Step 3: Home shortcut, redirects, deletions**

`src/app/app/list/components/View/View.tsx`: replace the `Data explorer` shortcut with

```ts
  {
    label: 'Vehicles',
    description: 'See what data each shared vehicle sends and browse its raw events',
    icon: CarIcon,
    href: '/vehicles',
  },
```

and swap the `ChipIcon` import for `CarIcon` (ChipIcon stays exported; Connections uses it).

`next.config.mjs`, inside `nextConfig` before `async headers()`:

```js
  async redirects() {
    return [
      { source: '/explorer', destination: '/vehicles', permanent: true },
      { source: '/explorer/:tokenId', destination: '/vehicles/:tokenId', permanent: true },
    ];
  },
```

Delete:

```bash
git rm -r src/app/explorer src/hooks/useVehicleData.ts src/app/api/vehicle-signals/route.ts
```

`scripts/visual/README.md`: change the sentence that names the explorer route or `/api/vehicle-signals` to name `/vehicles` and `/api/data/*` (Task 11 rewrites the harness itself; this keeps the README truthful in between).

- [ ] **Step 4: Write the failing FreshnessDot test**

`__tests__/unit/components/FreshnessDot.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FreshnessDot } from '@/components/FreshnessDot';

const NOW = Date.parse('2026-09-29T20:49:00Z');

describe('FreshnessDot', () => {
  it('shows a live dot and relative time for recent data', () => {
    render(<FreshnessDot at="2026-09-29T20:47:00Z" now={NOW} />);
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute('data-freshness', 'live');
  });
  it('shows Never with a muted dot when there is no data', () => {
    render(<FreshnessDot at={null} now={NOW} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute('data-freshness', 'none');
  });
  it('can render the dot alone', () => {
    render(<FreshnessDot at="2026-09-28T00:00:00Z" now={NOW} label={false} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute(
      'data-freshness',
      'inactive',
    );
  });
});
```

- [ ] **Step 5: Implement FreshnessDot**

`src/components/FreshnessDot/FreshnessDot.tsx`:

```tsx
import React, { type FC } from 'react';
import classNames from 'classnames';
import { freshnessOf, relativeTime, absoluteTime } from '@/utils/freshness';

// The rail, KPI and table freshness idiom: the StatusChip's 6px dot without the
// chip, followed by the relative time. Live glows; stale is warning; older is
// negative; missing is muted.
const DOT = {
  live: 'bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]',
  stale: 'bg-warning',
  inactive: 'bg-negative',
  none: 'bg-muted',
} as const;

interface Props {
  at: string | null | undefined;
  now?: number;
  label?: boolean;
  className?: string;
}

export const FreshnessDot: FC<Props> = ({ at, now, label = true, className }) => {
  const freshness = freshnessOf(at, now);
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-2 text-body-sm text-fg',
        className,
      )}
      title={absoluteTime(at) || undefined}
    >
      <span
        data-testid="freshness-dot"
        data-freshness={freshness}
        aria-hidden="true"
        className={classNames(
          'inline-block size-1.5 flex-shrink-0 rounded-full',
          DOT[freshness],
        )}
      />
      {label && <span>{relativeTime(at, now)}</span>}
    </span>
  );
};

export default FreshnessDot;
```

`src/components/FreshnessDot/index.ts`: `export * from './FreshnessDot';`

Run: `npx jest __tests__/unit/components/FreshnessDot.test.tsx` → PASS.

- [ ] **Step 6: Extend the vehicles query and table**

Add to `src/services/subjects/queries.ts`:

```ts
export const lastSeenQuery = (tokenId: number): GqlRequest => ({
  query: `query LastSeen($tokenId: Int!) {
  signalsLatest(tokenId: $tokenId) { lastSeen }
}`,
  variables: { tokenId },
});
```

`VehicleDetailsTable.tsx`: replace `VEHICLES_BY_CLIENT_ID` with

```ts
export const VEHICLES_BY_CLIENT_ID = gql(`
  query GetVehiclesByClientId($clientId: Address!, $owner: Address, $first: Int, $last: Int, $before: String, $after: String) {
    vehicles(filterBy:{ privileged: $clientId, owner: $owner }, first: $first, last: $last, before:$before, after:$after) {
      totalCount
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      nodes {
        tokenId
        tokenDID
        definition {
          make
          model
          year
        }
        aftermarketDevice { manufacturer { name } }
        syntheticDevice { connection { name } }
      }
    }
  }
`);

export const VEHICLE_FOR_LICENSE = gql(`
  query GetVehicleForLicense($tokenId: Int!, $clientId: Address!) {
    vehicle(tokenId: $tokenId) {
      tokenId
      tokenDID
      definition { make model year }
      aftermarketDevice { manufacturer { name } }
      syntheticDevice { connection { name } }
      sacd(grantee: $clientId) { permissions }
    }
  }
`);
```

Change the props and query wiring:

```tsx
interface IProps {
  clientId: string;
  // Filters from the /vehicles search box. owner narrows the list; tokenIdSearch
  // looks one vehicle up and shows whether it is shared with the license.
  owner?: string;
  tokenIdSearch?: number | null;
  showSources?: boolean;
  showLastSeen?: boolean;
}

export const VehicleDetailsTable: FC<IProps> = ({
  clientId,
  owner,
  tokenIdSearch = null,
  showSources = false,
  showLastSeen = false,
}) => {
  const router = useRouter();
  const { data, refetch, loading, error } = useQuery(VEHICLES_BY_CLIENT_ID, {
    variables: { clientId, owner: owner || null, first: PAGE_SIZE },
    skip: tokenIdSearch !== null,
  });
  const single = useQuery(VEHICLE_FOR_LICENSE, {
    variables: { tokenId: tokenIdSearch ?? 0, clientId },
    skip: tokenIdSearch === null,
  });
  // …existing state, effects and handleRenounce unchanged…

  if (tokenIdSearch !== null) {
    if (single.loading) return <Loader isLoading />;
    const v = single.data?.vehicle;
    if (!v) return <p className="text-body-sm text-muted">No vehicle has token ID {tokenIdSearch}.</p>;
    if (!v.sacd) {
      return (
        <p className="text-body-sm text-muted">
          Vehicle {v.tokenId} ({v.definition?.make} {v.definition?.model}) isn&apos;t shared with this license.
        </p>
      );
    }
    return (
      <PaginatedTableIdentityAPI
        data={[v]}
        columns={buildColumns(simulatedTokenIds, () => {}, { showSources, showLastSeen, clientId })}
        onPaginationChange={() => {}}
        rowCount={1}
        pageInfo={{}}
        pageSize={PAGE_SIZE}
        onRowClick={(row) => router.push(`/vehicles/${row.tokenId}?license=${clientId}`)}
      />
    );
  }
  // …existing error/loading/!data returns…
```

and in the paginated render keep the existing inline `(tokenId) => { … setRenouncingVehicle(node); }` callback as the second argument and add the options: `columns={buildColumns(simulatedTokenIds, (tokenId) => { const node = data.vehicles.nodes.find((n) => n.tokenId === tokenId) ?? null; setRenouncingVehicle(node); }, { showSources, showLastSeen, clientId })}` plus `onRowClick={(row) => router.push(`/vehicles/${row.tokenId}?license=${clientId}`)}`.

`constants.tsx`: `buildColumns` gains a third argument and two optional columns. Its node type must accept both query shapes, so define

```ts
export type VehicleRow = {
  tokenId: number;
  tokenDID: string;
  definition?: { make?: string | null; model?: string | null; year?: number | null } | null;
  aftermarketDevice?: { manufacturer?: { name?: string | null } | null } | null;
  syntheticDevice?: { connection?: { name?: string | null } | null } | null;
};
const columnHelper = createColumnHelper<VehicleRow>();

export const buildColumns = (
  simulatedTokenIds: Set<number>,
  onRenounce: (tokenId: number) => void,
  opts: { showSources?: boolean; showLastSeen?: boolean; clientId: string } = { clientId: '' },
): ColumnDef<VehicleRow>[] => [
  // …tokenId, tokenDID, vehicleMMY columns as before…
  ...(opts.showSources
    ? [
        columnHelper.display({
          id: 'sources',
          header: 'Sources',
          cell: (info) => {
            const { aftermarketDevice, syntheticDevice } = info.row.original;
            const names = [
              aftermarketDevice?.manufacturer?.name,
              syntheticDevice?.connection?.name,
            ].filter((n): n is string => !!n);
            if (!names.length) return <span className="text-muted">—</span>;
            return (
              <span className="flex flex-wrap gap-1">
                {names.map((n) => (
                  <span key={n} className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
                    {n}
                  </span>
                ))}
              </span>
            );
          },
        }),
      ]
    : []),
  ...(opts.showLastSeen
    ? [
        columnHelper.display({
          id: 'lastSeen',
          header: 'Last seen',
          cell: (info) => (
            <LastSeenCell
              tokenId={info.row.original.tokenId}
              asset={info.row.original.tokenDID}
              clientId={opts.clientId}
            />
          ),
        }),
      ]
    : []),
  // …actions column…
];
```

(Replace the two `// @ts-expect-error` accessor columns with `columnHelper.accessor('tokenId', { header: 'Vehicle token ID' })` and `columnHelper.accessor('tokenDID', { header: 'Vehicle token DID', cell: (i) => <span className="font-mono text-code">{i.getValue()}</span> })`; with the explicit `VehicleRow` type the expect-error comments become errors themselves.)

`LastSeenCell.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { lastSeenQuery } from '@/services/subjects/queries';
import { FreshnessDot } from '@/components/FreshnessDot';

// Lazy per row: one small telemetry call, cached a minute, so a page of ten
// vehicles costs ten exchanges at most and none on revisit.
export const LastSeenCell: FC<{ tokenId: number; asset: string; clientId: string }> = ({
  tokenId,
  asset,
  clientId,
}) => {
  const q = useSubjectQuery<{ signalsLatest: { lastSeen: string | null } | null }>({
    api: 'telemetry',
    asset,
    clientId,
    request: lastSeenQuery(tokenId),
  });
  if (q.isLoading) return <span className="text-muted">…</span>;
  if (q.error) return <span className="text-muted">Unavailable</span>;
  return <FreshnessDot at={q.data?.data?.signalsLatest?.lastSeen ?? null} />;
};
```

Run `npm run compile` (codegen picks up `GetVehicleForLicense`). Update `scripts/visual/fixtures.mjs` `vehicle()` to include `aftermarketDevice: null, syntheticDevice: null` so the harness superset still satisfies the query (Task 11 fills them in).

- [ ] **Step 7: Write the failing list-page test**

`__tests__/unit/pages/vehicles/VehiclesView.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const replace = jest.fn();
let params = new URLSearchParams('');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  usePathname: () => '/vehicles',
  useSearchParams: () => params,
}));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/app/license/vehicles/[clientId]/components/VehicleDetailsTable', () => ({
  VehicleDetailsTable: (props: Record<string, unknown>) => (
    <div data-testid="table">{JSON.stringify(props)}</div>
  ),
}));
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclesView } from '@/app/vehicles/components/VehiclesView';

const lic = (clientId: string, alias: string) =>
  new LocalDeveloperLicense({
    alias,
    clientId,
    redirectURIs: { nodes: [{ uri: 'https://x' }] },
  });

describe('VehiclesView', () => {
  beforeEach(() => {
    replace.mockClear();
    params = new URLSearchParams('');
  });

  it('auto-selects a single license and renders its table with the extra columns', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'Fleet Pulse')],
      loading: false,
    });
    render(<VehiclesView />);
    const props = JSON.parse(screen.getByTestId('table').textContent!);
    expect(props).toMatchObject({
      clientId: '0xaaa',
      showSources: true,
      showLastSeen: true,
    });
    expect(replace).toHaveBeenCalledWith('/vehicles?license=0xaaa', { scroll: false });
  });

  it('reads the license from the URL when there are several', () => {
    params = new URLSearchParams('license=0xbbb');
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'A'), lic('0xbbb', 'B')],
      loading: false,
    });
    render(<VehiclesView />);
    expect(JSON.parse(screen.getByTestId('table').textContent!).clientId).toBe('0xbbb');
  });

  it('passes a numeric search as a token ID and an address as an owner filter', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [lic('0xaaa', 'A')],
      loading: false,
    });
    render(<VehiclesView />);
    const input = screen.getByPlaceholderText('Search by token ID or owner address');
    fireEvent.change(input, { target: { value: '184223' } });
    expect(JSON.parse(screen.getByTestId('table').textContent!).tokenIdSearch).toBe(
      184223,
    );
    fireEvent.change(input, {
      target: { value: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' },
    });
    expect(JSON.parse(screen.getByTestId('table').textContent!)).toMatchObject({
      owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
      tokenIdSearch: null,
    });
  });

  it('explains the empty state when the user has no licenses', () => {
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
      developerLicenses: [],
      loading: false,
    });
    render(<VehiclesView />);
    expect(
      screen.getByText('Create a developer license to see the vehicles shared with it.'),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Implement the list page**

`src/app/vehicles/layout.ts`:

```ts
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export default AuthorizedLayout;
```

`src/app/vehicles/page.tsx`:

```tsx
import { Metadata } from 'next';
import configuration from '@/config';
import { VehiclesView } from './components/VehiclesView';

export const metadata: Metadata = { title: `Vehicles | ${configuration.appName}` };

export default function VehiclesPage() {
  return <VehiclesView />;
}
```

`src/app/vehicles/components/VehiclesView.tsx`:

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Section, SectionHeader } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { LocalDeveloperLicense } from '@/types/webhook';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const parseSearch = (raw: string): { owner?: string; tokenIdSearch: number | null } => {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return { tokenIdSearch: Number(s) };
  if (ADDRESS.test(s)) return { owner: s, tokenIdSearch: null };
  return { tokenIdSearch: null };
};

const Content = () => {
  const { developerLicenses, loading } = useValidDeveloperLicenses();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('license') ?? '';
  const [search, setSearch] = useState('');

  const selected = useMemo<LocalDeveloperLicense | undefined>(() => {
    const byUrl = developerLicenses.find(
      (l) => l.clientId.toLowerCase() === fromUrl.toLowerCase(),
    );
    if (byUrl) return byUrl;
    return developerLicenses.length === 1 ? developerLicenses[0] : undefined;
  }, [developerLicenses, fromUrl]);

  const select = (license: LocalDeveloperLicense) => {
    router.replace(`${pathname}?license=${license.clientId}`, { scroll: false });
  };

  useEffect(() => {
    if (
      !loading &&
      selected &&
      selected.clientId.toLowerCase() !== fromUrl.toLowerCase()
    ) {
      select(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selected?.clientId, fromUrl]);

  if (!loading && developerLicenses.length === 0) {
    return (
      <Section>
        <p className="text-body text-fg">
          Create a developer license to see the vehicles shared with it.
        </p>
        <Link href="/licenses" className="text-body-sm text-ink underline">
          Go to licenses
        </Link>
      </Section>
    );
  }

  const filters = parseSearch(search);
  return (
    <>
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={select}
        selectedLicense={selected}
      />
      {selected && (
        <Section>
          <SectionHeader title="Shared vehicles">
            <TextField
              placeholder="Search by token ID or owner address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="md:w-80"
              aria-label="Search vehicles"
            />
          </SectionHeader>
          <div className="-mx-4 -mb-4">
            <VehicleDetailsTable
              clientId={selected.clientId}
              owner={filters.owner}
              tokenIdSearch={filters.tokenIdSearch}
              showSources
              showLastSeen
            />
          </div>
        </Section>
      )}
    </>
  );
};

export const VehiclesView = () => {
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage="There was a problem fetching your developer licenses"
      >
        <Content />
      </QueryPageWrapper>
    </div>
  );
};
```

Run: `npx jest __tests__/unit/pages/vehicles/VehiclesView.test.tsx` → PASS. Then `npm test && npm run lint && npm run compile && npm run build` → green (the build proves the redirects and the deleted routes compile).

- [ ] **Step 9: Commit**

```bash
git add -A src/app/vehicles src/app/license/vehicles src/components/Icons src/components/FreshnessDot src/config/navigation.ts src/app/app/list src/services/subjects/queries.ts next.config.mjs scripts/visual __tests__/unit src/gql
git commit -m "feat(vehicles): vehicles list replaces the explorer; nav and redirects"
```

---

### Task 5: The vehicle page shell — header, source rail, tabs, URL state, access states

**Files:**

- Create: `src/app/vehicles/[tokenId]/page.tsx`, `src/app/vehicles/[tokenId]/hooks/useVehicleUrlState.ts`, `src/app/vehicles/[tokenId]/components/{VehiclePage,VehicleHeader,SourceRail,SubjectTabs,AccessNotice,SubjectView}.tsx`, `src/app/vehicles/[tokenId]/components/VehiclePage.css`
- Test: `__tests__/unit/pages/vehicles/SourceRail.test.tsx`, `__tests__/unit/pages/vehicles/VehiclePage.test.tsx`

**Interfaces:**

- Consumes: `VEHICLE_DETAIL`, `buildVehicleGraph`, `useSubjectFreshness` (Task 3); `useValidDeveloperLicenses`, `DevLicenseSelector`, `useGetDevJwts`, `GenerateDevJWT`; `FreshnessDot` (Task 4).
- Produces:
  - `type VehicleTab = SubjectCapability` and `TAB_LABELS`.
  - `useVehicleUrlState()` → `{ license: string; subject: string | 'sharing' | null; tab: VehicleTab | null; set(patch: Partial<{ license; subject; tab }>) }` (writes `?license=&subject=&tab=` with `router.replace`, `scroll: false`).
  - `type Access = 'ok' | 'not-shared' | 'no-jwt' | 'loading'`.
  - `SourceRail({ graph, freshness, selected, onSelect, access, accountState })`.
  - `SubjectTabs({ subject, tab, onChange, disabled })`.
  - `SubjectView({ subject, tab, ctx })` where `ctx: SubjectContext = { clientId: string; license: LocalDeveloperLicense; graph: SubjectGraph; chainId: number; freshness: Record<string, LatestIndexHeader>; onBrowseRaw(did: string): void }`. Tasks 6–10 add their tab components to its switch.
  - `AccessNotice({ access, licenseLabel, clientId, redirectUri, onGenerated, onViewSharing })`.

- [ ] **Step 1: Write the failing SourceRail test**

`__tests__/unit/pages/vehicles/SourceRail.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Implement the URL state hook, rail and tabs**

`src/app/vehicles/[tokenId]/hooks/useVehicleUrlState.ts`:

```ts
'use client';
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { SubjectCapability } from '@/services/subjects/graph';

export type VehicleTab = SubjectCapability;
export const TAB_LABELS: Record<VehicleTab, string> = {
  summary: 'Summary',
  signals: 'Signals',
  raw: 'Raw data',
  trips: 'Trips',
  documents: 'Documents',
};
const TABS = new Set<string>(Object.keys(TAB_LABELS));

type Patch = Partial<{ license: string; subject: string; tab: VehicleTab }>;

// ?license=<clientId>&subject=<did|sharing>&tab=<summary|signals|raw|trips|documents>
export const useVehicleUrlState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const set = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  return {
    license: params.get('license') ?? '',
    subject: params.get('subject'),
    tab: (tabParam && TABS.has(tabParam) ? tabParam : null) as VehicleTab | null,
    set,
  };
};
```

`src/app/vehicles/[tokenId]/components/SourceRail.tsx`:

```tsx
'use client';
import { FC } from 'react';
import classNames from 'classnames';
import type { SubjectGraph, Subject } from '@/services/subjects/graph';
import type { LatestIndexHeader } from '@/hooks/subjects/useSubjectFreshness';
import { FreshnessDot } from '@/components/FreshnessDot';
import { SelectWithChevron } from '@/components/SelectWithChevron';

export type Access = 'ok' | 'not-shared' | 'no-jwt' | 'loading';
export type AccountState = 'unknown' | 'loading' | 'shared' | 'not-shared';

interface Props {
  graph: SubjectGraph;
  freshness: Record<string, LatestIndexHeader>;
  selected: string; // a subject DID or 'sharing'
  onSelect: (key: string) => void;
  access: Access;
  accountState: AccountState;
  now?: number;
}

const ACCESS_LABEL: Record<Exclude<Access, 'ok'>, string> = {
  'not-shared': 'No access',
  'no-jwt': 'Needs a developer JWT',
  'loading': 'Checking…',
};
const ACCOUNT_LABEL: Record<AccountState, string> = {
  'unknown': '—',
  'loading': 'Checking…',
  'shared': 'Shared',
  'not-shared': 'Not shared',
};

const Item: FC<{
  subject: Subject;
  selected: boolean;
  nested?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ subject, selected, nested, onSelect, children }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-current={selected ? 'true' : undefined}
    data-nested={nested ? '' : undefined}
    className={classNames(
      'flex w-full flex-col gap-1 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-control',
      selected && 'bg-control shadow-selected',
    )}
  >
    <span className="text-body-sm font-medium text-ink">{subject.label}</span>
    <span className="text-label text-muted">{subject.sublabel}</span>
    <span className="pt-0.5 text-label text-fg">{children}</span>
  </button>
);

// The rail: the vehicle, its devices nested under it, the owner's documents,
// then Sharing. Freshness comes from one aliased latestIndex call (the page
// owns it); the account subject shows its grant state instead.
export const SourceRail: FC<Props> = ({
  graph,
  freshness,
  selected,
  onSelect,
  access,
  accountState,
  now,
}) => {
  const fresh = (s: Subject) =>
    access === 'ok' ? (
      <FreshnessDot
        at={freshness[s.did]?.time ?? null}
        now={now}
        className="text-label"
      />
    ) : (
      <span className="text-muted">{ACCESS_LABEL[access]}</span>
    );

  const options = [
    ...graph.all.map((s) => ({ value: s.did, label: `${s.label} · ${s.sublabel}` })),
    { value: 'sharing', label: 'Sharing' },
  ];

  return (
    <>
      <div className="md:hidden">
        <SelectWithChevron
          options={options}
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          name="subject"
        />
      </div>
      <nav
        aria-label="Data sources"
        className="hidden flex-col gap-0.5 rounded-card bg-card p-2 md:flex"
      >
        <span className="px-2.5 pb-1 pt-2 text-label text-muted">Data sources</span>
        <Item
          subject={graph.vehicle}
          selected={selected === graph.vehicle.did}
          onSelect={() => onSelect(graph.vehicle.did)}
        >
          {fresh(graph.vehicle)}
        </Item>
        {graph.devices.length > 0 && (
          <div className="ml-4 flex flex-col gap-0.5 border-l border-outline pl-2">
            {graph.devices.map((d) => (
              <Item
                key={d.did}
                subject={d}
                nested
                selected={selected === d.did}
                onSelect={() => onSelect(d.did)}
              >
                {fresh(d)}
              </Item>
            ))}
          </div>
        )}
        <span className="px-2.5 pb-1 pt-3 text-label text-muted">Owner</span>
        <Item
          subject={graph.account}
          selected={selected === graph.account.did}
          onSelect={() => onSelect(graph.account.did)}
        >
          <span className={accountState === 'shared' ? 'text-fg' : 'text-muted'}>
            {access === 'ok' ? ACCOUNT_LABEL[accountState] : ACCESS_LABEL[access]}
          </span>
        </Item>
        <div className="mx-1 my-1.5 h-px bg-outline" />
        <button
          type="button"
          onClick={() => onSelect('sharing')}
          aria-current={selected === 'sharing' ? 'true' : undefined}
          className={classNames(
            'flex w-full flex-col gap-1 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-control',
            selected === 'sharing' && 'bg-control shadow-selected',
          )}
        >
          <span className="text-body-sm font-medium text-ink">Sharing</span>
          <span className="text-label text-muted">Apps with access</span>
        </button>
      </nav>
    </>
  );
};
```

`src/app/vehicles/[tokenId]/components/SubjectTabs.tsx`:

```tsx
'use client';
import { FC } from 'react';
import classNames from 'classnames';
import type { Subject } from '@/services/subjects/graph';
import { TAB_LABELS, type VehicleTab } from '../hooks/useVehicleUrlState';

// The license-details pill tabs (DESIGN.md "Tabs"); the set comes from the
// subject's capabilities, so devices have no Trips and the account has Documents.
export const SubjectTabs: FC<{
  subject: Subject;
  tab: VehicleTab;
  onChange: (tab: VehicleTab) => void;
  disabled?: boolean;
}> = ({ subject, tab, onChange, disabled }) => (
  <nav className="license-tabs" role="tablist" aria-label="Views">
    {subject.capabilities.map((id) => (
      <button
        key={id}
        role="tab"
        type="button"
        aria-selected={tab === id}
        disabled={disabled}
        className={classNames(
          'license-tab',
          tab === id && !disabled && 'license-tab--active',
          disabled && 'opacity-40',
        )}
        onClick={() => onChange(id)}
      >
        {TAB_LABELS[id]}
      </button>
    ))}
  </nav>
);
```

`VehiclePage.css` (imported by `VehiclePage.tsx`) copies the three tab rules so the recipe is local, exactly as `View.css` has them:

```css
.license-tabs {
  @apply flex w-fit max-w-full flex-row gap-0.5 overflow-x-auto rounded-full bg-control p-[3px];
}
.license-tab {
  @apply flex-shrink-0 cursor-pointer select-none whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-muted transition-colors hover:text-fg disabled:cursor-not-allowed;
}
.license-tab--active {
  @apply bg-bright text-ink shadow-sm hover:text-ink;
}
.vehicle-page__body {
  @apply grid grid-cols-1 items-start gap-6 md:grid-cols-[248px_minmax(0,1fr)];
}
```

Run: `npx jest __tests__/unit/pages/vehicles/SourceRail.test.tsx` → PASS.

- [ ] **Step 3: Write the failing VehiclePage test**

`__tests__/unit/pages/vehicles/VehiclePage.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

const replace = jest.fn();
let params = new URLSearchParams('license=0xaaa');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
  usePathname: () => '/vehicles/190231',
  useSearchParams: () => params,
}));
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
}));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({ useGetDevJwts: jest.fn() }));
jest.mock('@/hooks/subjects/useSubjectFreshness', () => ({
  useSubjectFreshness: jest.fn(),
}));
jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));

import { useQuery } from '@apollo/client';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclePage } from '@/app/vehicles/[tokenId]/components/VehiclePage';

const lic = (clientId: string, alias: string) =>
  new LocalDeveloperLicense({
    alias,
    clientId,
    redirectURIs: { nodes: [{ uri: 'https://x' }] },
  });
const vehicle = (grantees: string[]) => ({
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'toyota_rav4_2024', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: {
    nodes: grantees.map((g) => ({
      grantee: g,
      permissions: '0x3fc',
      createdAt: '2026-08-02T00:00:00Z',
      expiresAt: '2027-08-02T00:00:00Z',
      source: 'ipfs://x',
    })),
  },
  privileges: { nodes: [] },
});

beforeEach(() => {
  params = new URLSearchParams('license=0xaaa');
  (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
    developerLicenses: [lic('0xaaa', 'Fleet Pulse'), lic('0xbbb', 'Other')],
    loading: false,
  });
  (useGetDevJwts as jest.Mock).mockReturnValue({
    isAuthenticatedAsDev: true,
    refetch: jest.fn(),
  });
  (useSubjectFreshness as jest.Mock).mockReturnValue({
    byDid: {},
    isLoading: false,
    error: null,
  });
  (useSubjectQuery as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
  });
});

describe('VehiclePage', () => {
  it('renders the header with the eligible license selected', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xAAA']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByRole('heading', { name: 'Toyota RAV4 2024' })).toBeInTheDocument();
    expect(screen.getByText('#190231')).toBeInTheDocument();
    expect(screen.getByText('Fleet Pulse')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(useSubjectFreshness).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('shows the not-shared notice and asks for no data when no license has a grant', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xccc']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText("This vehicle isn't shared with any of your licenses"),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Summary' })).toBeDisabled();
    expect(useSubjectFreshness).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getAllByText('No access').length).toBeGreaterThan(0);
  });

  it('asks for a developer JWT when the license has none stored', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xaaa']) },
      loading: false,
    });
    (useGetDevJwts as jest.Mock).mockReturnValue({
      isAuthenticatedAsDev: false,
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(
      screen.getByText('Generate a developer JWT to read this vehicle'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });

  it('falls back to the first eligible license when the URL names an ineligible one', () => {
    params = new URLSearchParams('license=0xbbb');
    (useQuery as jest.Mock).mockReturnValue({
      data: { vehicle: vehicle(['0xaaa']) },
      loading: false,
    });
    render(<VehiclePage tokenId={190231} />);
    expect(replace).toHaveBeenCalledWith(expect.stringContaining('license=0xaaa'), {
      scroll: false,
    });
  });

  it('says so when the vehicle does not exist', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: { vehicle: null }, loading: false });
    render(<VehiclePage tokenId={1} />);
    expect(screen.getByText('No vehicle has token ID 1.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement the page**

`src/app/vehicles/[tokenId]/page.tsx`:

```tsx
'use client';
import { use } from 'react';
import { VehiclePage } from './components/VehiclePage';

export default function VehicleDetailPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  return <VehiclePage tokenId={Number(tokenId)} />;
}
```

`src/app/vehicles/[tokenId]/components/AccessNotice.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { Button } from '@/components/Button';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import type { Access } from './SourceRail';

interface Props {
  access: Exclude<Access, 'ok'>;
  licenseLabel: string;
  clientId?: string;
  redirectUri?: string;
  onGenerated: () => void;
  onViewSharing: () => void;
}

// What replaces the tab body when the license can't read the vehicle.
export const AccessNotice: FC<Props> = ({
  access,
  licenseLabel,
  clientId,
  redirectUri,
  onGenerated,
  onViewSharing,
}) => {
  if (access === 'loading') return null;
  if (access === 'not-shared') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
        <h3 className="text-card-title text-ink">
          {clientId
            ? `This vehicle isn't shared with ${licenseLabel}`
            : "This vehicle isn't shared with any of your licenses"}
        </h3>
        <p className="max-w-xl text-body-sm text-muted">
          The owner hasn&apos;t granted this license access, so its data can&apos;t be
          read here. You can still see which apps it is shared with.
        </p>
        <Button variant="secondary" onClick={onViewSharing}>
          View sharing
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
      <h3 className="text-card-title text-ink">
        Generate a developer JWT to read this vehicle
      </h3>
      <p className="max-w-xl text-body-sm text-muted">
        {licenseLabel} has no developer JWT in this browser yet. Generating one uses the
        license&apos;s API key, and the token stays in this browser.
      </p>
      {clientId && redirectUri && (
        <GenerateDevJWT
          clientId={clientId}
          domain={redirectUri}
          onSuccess={onGenerated}
        />
      )}
    </div>
  );
};
```

`src/app/vehicles/[tokenId]/components/VehicleHeader.tsx`:

```tsx
'use client';
import { FC } from 'react';
import Link from 'next/link';
import { shortAddress } from '@/services/subjects/did';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import type { LocalDeveloperLicense } from '@/types/webhook';
import type { VehicleDetail } from '@/services/subjects/graph';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const VehicleHeader: FC<{
  vehicle: VehicleDetail;
  licenses: LocalDeveloperLicense[];
  selected?: LocalDeveloperLicense;
  onSelectLicense: (clientId: string) => void;
}> = ({ vehicle, licenses, selected, onSelectLicense }) => {
  const name =
    [vehicle.definition?.make, vehicle.definition?.model, vehicle.definition?.year]
      .filter(Boolean)
      .join(' ') || `Vehicle ${vehicle.tokenId}`;
  return (
    <div className="flex flex-col gap-3">
      <nav
        className="flex items-center gap-1.5 text-label text-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/vehicles" className="transition-colors hover:text-ink">
          Vehicles
        </Link>
        <span>/</span>
        <span className="text-ink">{vehicle.tokenId}</span>
      </nav>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title text-ink">{name}</h1>
            <span className="rounded-chip bg-control px-2 py-0.5 text-label text-muted">
              #{vehicle.tokenId}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-label text-muted">
            <span>
              Owner{' '}
              <span className="font-mono text-code text-fg">
                {shortAddress(vehicle.owner)}
              </span>
            </span>
            <span>Minted {date(vehicle.mintedAt)}</span>
          </div>
        </div>
        {licenses.length > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-label text-muted">License</span>
            <SelectWithChevron
              name="license"
              className="min-w-[210px]"
              options={licenses.map((l) => ({ value: l.clientId, label: l.label }))}
              value={selected?.clientId ?? ''}
              onChange={(e) => onSelectLicense(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

`src/app/vehicles/[tokenId]/components/SubjectView.tsx` (Tasks 6–10 fill the branches; until then a tab renders nothing):

```tsx
'use client';
import { FC } from 'react';
import type { Subject, SubjectGraph } from '@/services/subjects/graph';
import type { LatestIndexHeader } from '@/hooks/subjects/useSubjectFreshness';
import type { LocalDeveloperLicense } from '@/types/webhook';
import type { VehicleTab } from '../hooks/useVehicleUrlState';

export type SubjectContext = {
  clientId: string;
  license: LocalDeveloperLicense;
  graph: SubjectGraph;
  chainId: number;
  freshness: Record<string, LatestIndexHeader>;
  onBrowseRaw: (did: string) => void;
};

export const SubjectView: FC<{
  subject: Subject;
  tab: VehicleTab;
  ctx: SubjectContext;
}> = ({ subject, tab, ctx }) => {
  switch (tab) {
    case 'summary':
      return null; // Task 6: <SummaryTab subject={subject} ctx={ctx} />
    case 'raw':
      return null; // Task 7: <RawDataTab subject={subject} ctx={ctx} />
    case 'signals':
      return null; // Task 8: <SignalsTab subject={subject} ctx={ctx} />
    case 'trips':
      return null; // Task 9: <TripsTab subject={subject} ctx={ctx} />
    case 'documents':
      return null; // Task 10: <DocumentsTab subject={subject} ctx={ctx} />
  }
};
```

`src/app/vehicles/[tokenId]/components/VehiclePage.tsx`:

```tsx
'use client';
import { FC, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import configuration from '@/config';
import { VEHICLE_DETAIL } from '../queries';
import { buildVehicleGraph } from '@/services/subjects/graph';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { latestIndexQuery } from '@/services/subjects/queries';
import { Loader } from '@/components/Loader';
import { useVehicleUrlState, type VehicleTab } from '../hooks/useVehicleUrlState';
import { VehicleHeader } from './VehicleHeader';
import { SourceRail, type Access, type AccountState } from './SourceRail';
import { SubjectTabs } from './SubjectTabs';
import { AccessNotice } from './AccessNotice';
import { SubjectView, type SubjectContext } from './SubjectView';
import { shortDid } from '@/services/subjects/did';
import { CopyButton } from '@/components/CopyButton';
import './VehiclePage.css';

const CHAIN_ID = Number(configuration.CONTRACT_NETWORK);

export const VehiclePage: FC<{ tokenId: number }> = ({ tokenId }) => {
  const { data, loading, error } = useQuery(VEHICLE_DETAIL, { variables: { tokenId } });
  const { developerLicenses, loading: licensesLoading } = useValidDeveloperLicenses();
  const url = useVehicleUrlState();

  const vehicle = data?.vehicle ?? null;
  const graph = useMemo(
    () => (vehicle ? buildVehicleGraph(vehicle, CHAIN_ID) : null),
    [vehicle],
  );

  // Only licenses this vehicle's owner has granted a SACD to can read it.
  const eligible = useMemo(() => {
    const grantees = new Set(
      vehicle?.sacds.nodes.map((s) => s.grantee.toLowerCase()) ?? [],
    );
    return developerLicenses.filter((l) => grantees.has(l.clientId.toLowerCase()));
  }, [developerLicenses, vehicle]);
  const license =
    eligible.find((l) => l.clientId.toLowerCase() === url.license.toLowerCase()) ??
    eligible[0];
  const clientId = license?.clientId ?? '';

  useEffect(() => {
    if (license && license.clientId.toLowerCase() !== url.license.toLowerCase()) {
      url.set({ license: license.clientId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.clientId, url.license]);

  const { isAuthenticatedAsDev, refetch: refetchJwts } = useGetDevJwts(
    clientId || undefined,
  );
  const access: Access =
    licensesLoading || loading
      ? 'loading'
      : !license
        ? 'not-shared'
        : !isAuthenticatedAsDev
          ? 'no-jwt'
          : 'ok';

  const freshness = useSubjectFreshness({ graph, clientId, enabled: access === 'ok' });
  const accountProbe = useSubjectQuery<{ latestIndex: unknown }>({
    api: 'fetch',
    asset: graph?.account.asset ?? '',
    clientId,
    request: graph ? latestIndexQuery(graph.account.did) : null,
    enabled: access === 'ok' && !!graph,
  });
  const accountState: AccountState = accountProbe.isLoading
    ? 'loading'
    : accountProbe.error?.code === 'NOT_SHARED'
      ? 'not-shared'
      : accountProbe.data
        ? 'shared'
        : 'unknown';

  const selectedKey =
    url.subject &&
    (url.subject === 'sharing' || graph?.all.some((s) => s.did === url.subject))
      ? url.subject
      : (graph?.vehicle.did ?? '');
  const subject = graph?.all.find((s) => s.did === selectedKey) ?? null;
  const tab: VehicleTab =
    subject && url.tab && subject.capabilities.includes(url.tab)
      ? url.tab
      : (subject?.capabilities[0] ?? 'summary');

  if (loading) return <Loader isLoading />;
  if (error)
    return (
      <p className="text-body-sm text-negative">
        Something went wrong loading this vehicle.
      </p>
    );
  if (!vehicle || !graph)
    return <p className="text-body-sm text-muted">No vehicle has token ID {tokenId}.</p>;

  const ctx: SubjectContext = {
    clientId,
    license: license!,
    graph,
    chainId: CHAIN_ID,
    freshness: freshness.byDid,
    onBrowseRaw: (did) => url.set({ subject: did, tab: 'raw' }),
  };

  return (
    <div className="flex flex-col gap-6">
      <VehicleHeader
        vehicle={vehicle}
        licenses={eligible}
        selected={license}
        onSelectLicense={(id) => url.set({ license: id })}
      />
      <div className="vehicle-page__body">
        <SourceRail
          graph={graph}
          freshness={freshness.byDid}
          selected={selectedKey}
          onSelect={(key) => url.set({ subject: key, tab: undefined })}
          access={access}
          accountState={accountState}
        />
        <section className="flex min-w-0 flex-col gap-4">
          {selectedKey === 'sharing'
            ? null /* Task 10: <SharingPanel vehicle={vehicle} ctx={ctx} accountState={accountState} /> */
            : subject && (
                <>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-card-title text-ink">{subject.label}</h2>
                      <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
                        {subject.sublabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-code text-muted">
                        {shortDid(subject.did)}
                      </span>
                      <CopyButton value={subject.did} onCopySuccessMessage="DID copied" />
                    </div>
                  </div>
                  <SubjectTabs
                    subject={subject}
                    tab={tab}
                    onChange={(t) => url.set({ tab: t })}
                    disabled={access !== 'ok'}
                  />
                  {access === 'ok' ? (
                    <SubjectView subject={subject} tab={tab} ctx={ctx} />
                  ) : (
                    <AccessNotice
                      access={access}
                      licenseLabel={license?.label ?? ''}
                      clientId={license?.clientId}
                      redirectUri={license?.firstRedirectURI}
                      onGenerated={refetchJwts}
                      onViewSharing={() => url.set({ subject: 'sharing' })}
                    />
                  )}
                </>
              )}
        </section>
      </div>
    </div>
  );
};
```

Run: `npx jest __tests__/unit/pages/vehicles` → PASS. `npm test && npm run lint && npm run compile` → green. Open `/vehicles/<a shared tokenId>?license=<clientId>` on dev: the header, rail with freshness and disabled/enabled tabs render; tab bodies are empty until Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/app/vehicles __tests__/unit/pages/vehicles
git commit -m "feat(vehicles): vehicle page shell with source rail, tabs and access states"
```

---

### Task 6: Summary tab — KPIs, signals, events, data types, latest payload, details

**Files:**

- Rewrite: `src/components/CollapsibleSection/CollapsibleSection.tsx` (delete `Header/`, `Content/`, `CollapsibleContext.tsx`; keep `index.ts`)
- Create: `src/components/JsonBlock/{JsonBlock.tsx,index.ts}`, `src/hooks/subjects/useDataSummary.ts`, `src/app/vehicles/[tokenId]/components/StatCard.tsx`, `src/app/vehicles/[tokenId]/components/tabs/SummaryTab.tsx`, `src/app/vehicles/[tokenId]/components/tabs/SignalTable.tsx`
- Modify: `src/app/vehicles/[tokenId]/components/SubjectView.tsx` (summary branch)
- Test: `__tests__/unit/components/CollapsibleSection.test.tsx`, `__tests__/unit/components/JsonBlock.test.tsx`, `__tests__/unit/pages/vehicles/SummaryTab.test.tsx`

**Interfaces:**

- Consumes: `dataSummaryQuery`, `availableCloudEventTypesQuery`, `latestCloudEventQuery`, `fieldError` (Task 2); `resolveTelemetrySource` (Task 3); `SubjectContext` (Task 5).
- Produces:
  - `CollapsibleSection({ title, count?, meta?, actions?, defaultOpen?, children })` — Fleet section card with a chevron toggle in the header.
  - `JsonBlock({ value, maxHeight?, filename? })` — token-themed JSON with Copy (and Download when `filename`).
  - `StatCard({ label, value, caption, tone?, hero? })`.
  - `useDataSummary({ subject, ctx })` → `{ summary, error, isLoading, fromBySignal }` where `fromBySignal: Record<string, string[]>` names the devices each signal comes from (vehicle only).
  - `SignalTable({ rows, showFrom })` with `rows: { name; label; count; firstSeen; lastSeen; from?: string[] }[]`.

- [ ] **Step 1: Write the failing CollapsibleSection and JsonBlock tests**

`__tests__/unit/components/CollapsibleSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '@/components/CollapsibleSection';

describe('CollapsibleSection', () => {
  it('starts closed, shows count and meta, opens on click', () => {
    render(
      <CollapsibleSection title="Events" count={4} meta="Last event 2 days ago">
        <p>body</p>
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole('button', { name: /Events/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Last event 2 days ago')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body')).toBeInTheDocument();
  });
  it('can start open and keeps actions outside the toggle', () => {
    const onAction = jest.fn();
    render(
      <CollapsibleSection
        title="Latest payload"
        defaultOpen
        actions={<button onClick={onAction}>Browse</button>}
      >
        <p>body</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browse' }));
    expect(onAction).toHaveBeenCalled();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
```

`__tests__/unit/components/JsonBlock.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { JsonBlock } from '@/components/JsonBlock';

describe('JsonBlock', () => {
  it('pretty-prints objects and offers copy', () => {
    render(<JsonBlock value={{ header: { type: 'dimo.status' }, data: null }} />);
    expect(screen.getByText(/"dimo.status"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });
  it.each([['a plain string'], [null], [42]])('renders %p without crashing', (value) => {
    render(<JsonBlock value={value} />);
    expect(screen.getByTestId('json-block')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement them**

`src/components/CollapsibleSection/CollapsibleSection.tsx` (replace the whole file; `git rm -r src/components/CollapsibleSection/Header src/components/CollapsibleSection/Content src/components/CollapsibleSection/CollapsibleContext.tsx`):

```tsx
'use client';
import React, { FC, PropsWithChildren, ReactNode, useState } from 'react';
import classNames from 'classnames';
import { ChevronRightIcon } from '@heroicons/react/16/solid';

interface Props {
  title: string;
  count?: number | string;
  meta?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

// A section card whose header toggles the body. The chevron and title are the
// button; count is a neutral chip; meta sits beside it; actions stay outside
// the toggle so a click on them never collapses the panel.
export const CollapsibleSection: FC<PropsWithChildren<Props>> = ({
  title,
  count,
  meta,
  actions,
  defaultOpen = false,
  className,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={classNames('flex flex-col rounded-card bg-card', className)}>
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-control"
        >
          <ChevronRightIcon
            className={classNames(
              'size-4 flex-shrink-0 text-muted transition-transform',
              open && 'rotate-90',
            )}
          />
          <span className="text-card-title text-ink">{title}</span>
          {count !== undefined && (
            <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
              {count}
            </span>
          )}
          {meta && <span className="text-body-sm text-muted">{meta}</span>}
        </button>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  );
};
```

`src/components/JsonBlock/JsonBlock.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { saveAs } from 'file-saver';
import { CopyButton } from '@/components/CopyButton';
import { Button } from '@/components/Button';

// Prism JSON tokens mapped onto Fleet tokens so both themes read.
const THEME: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': { color: 'rgb(var(--fg))', background: 'transparent' },
  'pre[class*="language-"]': {
    color: 'rgb(var(--fg))',
    background: 'transparent',
    margin: 0,
  },
  'property': { color: 'rgb(var(--sky))' },
  'string': { color: 'rgb(var(--accent-ink))' },
  'number': { color: 'rgb(var(--warning))' },
  'boolean': { color: 'rgb(var(--warning))' },
  'null': { color: 'rgb(var(--muted))' },
  'punctuation': { color: 'rgb(var(--muted))' },
  'operator': { color: 'rgb(var(--muted))' },
};

interface Props {
  value: unknown;
  maxHeight?: number;
  filename?: string;
  className?: string;
}

export const JsonBlock: FC<Props> = ({ value, maxHeight = 320, filename, className }) => {
  const text = JSON.stringify(value, null, 2) ?? 'undefined';
  return (
    <div data-testid="json-block" className={className}>
      <div className="flex items-center justify-end gap-1 pb-1">
        {filename && (
          <Button
            variant="ghost"
            size="md"
            onClick={() =>
              saveAs(new Blob([text], { type: 'application/json' }), filename)
            }
          >
            Download JSON
          </Button>
        )}
        <CopyButton value={text} onCopySuccessMessage="JSON copied" size="icon" />
      </div>
      <div
        className="overflow-auto rounded-control bg-control px-4 py-3 font-mono text-code"
        style={{ maxHeight }}
      >
        <SyntaxHighlighter
          language="json"
          style={THEME}
          customStyle={{ padding: 0, fontSize: 'inherit', lineHeight: 'inherit' }}
        >
          {text}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
```

`src/components/JsonBlock/index.ts`: `export * from './JsonBlock';`

Run both tests → PASS.

- [ ] **Step 3: Write the failing SummaryTab test**

`__tests__/unit/pages/vehicles/SummaryTab.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { SummaryTab } from '@/app/vehicles/[tokenId]/components/tabs/SummaryTab';
import { buildVehicleGraph, type VehicleDetail } from '@/services/subjects/graph';
import type { SubjectContext } from '@/app/vehicles/[tokenId]/components/SubjectView';
import { LocalDeveloperLicense } from '@/types/webhook';

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
const ctx: SubjectContext = {
  clientId: '0xaaa',
  license: new LocalDeveloperLicense({
    alias: 'A',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
  }),
  graph,
  chainId: 80002,
  freshness: {
    [graph.devices[0].did]: { time: null, type: null, source: null, producer: null },
  },
  onBrowseRaw: jest.fn(),
};

const SUMMARY = {
  numberOfSignals: 1240000,
  availableSignals: ['speed', 'obdDTCList'],
  firstSeen: '2024-03-04T00:00:00Z',
  lastSeen: '2026-09-29T20:47:12Z',
  signalDataSummary: [
    {
      name: 'speed',
      numberOfSignals: 412880,
      firstSeen: '2024-03-04T00:00:00Z',
      lastSeen: '2026-09-29T20:47:12Z',
    },
    {
      name: 'obdDTCList',
      numberOfSignals: 12,
      firstSeen: '2024-04-19T00:00:00Z',
      lastSeen: '2026-09-15T00:00:00Z',
    },
  ],
  eventDataSummary: [
    {
      name: 'harshBraking',
      numberOfEvents: 42,
      firstSeen: '2024-05-02T00:00:00Z',
      lastSeen: '2026-09-27T00:00:00Z',
    },
  ],
};
const TYPES = [
  {
    type: 'dimo.status',
    count: 900000,
    firstSeen: '2024-03-04T00:00:00Z',
    lastSeen: '2026-09-29T20:47:12Z',
  },
];
const LATEST = {
  header: {
    type: 'dimo.status',
    time: '2026-09-29T20:47:12Z',
    dataversion: 'default/v1.0',
    producer: graph.devices[0].did,
  },
  data: { signals: [] },
};

// Route each query to its answer by the operation name in the query text.
const answers = (overrides: Record<string, unknown> = {}) =>
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      const pick = (name: string, data: unknown, errors?: unknown) =>
        q.startsWith(`query ${name}`)
          ? { data: { data, errors }, isLoading: false, error: null }
          : null;
      return (
        pick(
          'DataSummary',
          overrides.DataSummary ?? { dataSummary: SUMMARY },
          overrides.DataSummaryErrors,
        ) ??
        pick('AvailableCloudEventTypes', { availableCloudEventTypes: TYPES }) ??
        pick('LatestCloudEvent', { latestCloudEvent: LATEST }) ?? {
          data: undefined,
          isLoading: false,
          error: null,
        }
      );
    },
  );

describe('SummaryTab', () => {
  it('shows KPIs, the signal breakdown with a From column, events and data types', () => {
    answers();
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByText('Latest payload')).toBeInTheDocument();
    expect(screen.getByText('1.24M')).toBeInTheDocument();
    expect(screen.getByText('Mar 4, 2024')).toBeInTheDocument();
    expect(screen.getByText('Speed')).toBeInTheDocument();
    expect(screen.getByText('speed')).toBeInTheDocument();
    expect(screen.getByText('412,880')).toBeInTheDocument();
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Events/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data types/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vehicle details/ })).toBeInTheDocument();
  });

  it('hands off to Raw data for the selected subject', () => {
    answers();
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    screen.getByRole('button', { name: 'Browse cloud events' }).click();
    expect(ctx.onBrowseRaw).toHaveBeenCalledWith(graph.vehicle.did);
  });

  it('shows a field error inline and keeps the rest of the tab', () => {
    answers({
      DataSummary: { dataSummary: null },
      DataSummaryErrors: [{ message: 'needs privilege 1', path: ['dataSummary'] }],
    });
    render(<SummaryTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByText('needs privilege 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data types/ })).toBeInTheDocument();
  });

  it('tells the reader when a device has no resolvable telemetry source', () => {
    answers();
    render(<SummaryTab subject={graph.devices[0]} ctx={ctx} />);
    expect(
      screen.getByText(
        'This device has no cloud events yet, so the signal breakdown covers the whole vehicle.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('From')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement the hook, cards and tab**

`src/hooks/subjects/useDataSummary.ts`:

```ts
'use client';
import { useMemo } from 'react';
import { useSubjectQuery } from './useSubjectQuery';
import { dataSummaryQuery } from '@/services/subjects/queries';
import { fieldError } from '@/services/subjects/client';
import {
  isDevice,
  resolveTelemetrySource,
  type Subject,
} from '@/services/subjects/graph';
import type { SubjectContext } from '@/app/vehicles/[tokenId]/components/SubjectView';

export type DataSummary = {
  numberOfSignals: number;
  availableSignals: string[];
  firstSeen: string;
  lastSeen: string;
  signalDataSummary: {
    name: string;
    numberOfSignals: number;
    firstSeen: string;
    lastSeen: string;
  }[];
  eventDataSummary: {
    name: string;
    numberOfEvents: number;
    firstSeen: string;
    lastSeen: string;
  }[];
};
type Data = { dataSummary: DataSummary | null };

// The subject's telemetry source: a device filters by the connection that
// produced its latest cloud event; the vehicle has no filter.
export const useTelemetrySource = (subject: Subject, ctx: SubjectContext) =>
  resolveTelemetrySource(
    subject,
    ctx.freshness[subject.did]?.source ?? null,
    ctx.chainId,
  );

export const useDataSummary = (subject: Subject, ctx: SubjectContext) => {
  const source = useTelemetrySource(subject, ctx);
  const tokenId = subject.tokenId ?? 0;
  const q = useSubjectQuery<Data>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: subject.tokenId ? dataSummaryQuery(tokenId, source) : null,
  });

  // For the vehicle view: which device each signal comes from (one summary per
  // device source; a device without a source is skipped).
  const deviceSources = ctx.graph.devices
    .map((d) => ({
      d,
      source: resolveTelemetrySource(
        d,
        ctx.freshness[d.did]?.source ?? null,
        ctx.chainId,
      ),
    }))
    .filter((x): x is { d: Subject; source: string } => !!x.source);
  const perDevice = deviceSources.map((x) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSubjectQuery<Data>({
      api: 'telemetry',
      asset: subject.asset,
      clientId: ctx.clientId,
      request: dataSummaryQuery(tokenId, x.source),
      enabled: subject.kind === 'vehicle',
    }),
  );
  const fromBySignal = useMemo(() => {
    const out: Record<string, string[]> = {};
    perDevice.forEach((pq, i) => {
      for (const s of pq.data?.data?.dataSummary?.signalDataSummary ?? []) {
        (out[s.name] ??= []).push(deviceSources[i].d.label);
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perDevice.map((p) => p.data).join('|')]);

  return {
    summary: q.data?.data?.dataSummary ?? null,
    error: q.error?.message ?? fieldError(q.data?.errors, 'dataSummary'),
    isLoading: q.isLoading,
    source,
    unresolvedSource: isDevice(subject) && !source,
    fromBySignal,
  };
};
```

(`deviceSources` has a fixed length per graph, so the hook count is stable across renders; the rules-of-hooks disable is deliberate and commented.)

`src/app/vehicles/[tokenId]/components/StatCard.tsx`:

```tsx
import { FC, ReactNode } from 'react';
import classNames from 'classnames';

// Stat card recipe (DESIGN.md): tonal card, big number, small caption.
export const StatCard: FC<{
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
}> = ({ label, value, caption, className }) => (
  <div className={classNames('flex flex-col gap-2 rounded-card bg-card p-5', className)}>
    <span className="text-label text-muted">{label}</span>
    <span className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-ink">
      {value}
    </span>
    {caption && <span className="text-label text-muted">{caption}</span>}
  </div>
);

export const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
      : String(n);
```

`src/app/vehicles/[tokenId]/components/tabs/SignalTable.tsx`:

```tsx
'use client';
import { FC, useMemo, useState } from 'react';
import classNames from 'classnames';
import { TextField } from '@/components/TextField';
import { FreshnessDot } from '@/components/FreshnessDot';
import { humanizeSignal } from '@/utils/humanizeSignal';

export type SignalRow = {
  name: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  from?: string[];
};
type SortKey = 'name' | 'count' | 'firstSeen' | 'lastSeen';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const SignalTable: FC<{
  rows: SignalRow[];
  showFrom: boolean;
  filter: string;
}> = ({ rows, showFrom, filter }) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'lastSeen',
    dir: -1,
  });
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        !f ||
        r.name.toLowerCase().includes(f) ||
        humanizeSignal(r.name).toLowerCase().includes(f),
    );
    const val = (r: SignalRow) =>
      sort.key === 'name'
        ? humanizeSignal(r.name)
        : sort.key === 'count'
          ? r.count
          : Date.parse(r[sort.key]);
    return [...list].sort((a, b) =>
      val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0,
    );
  }, [rows, filter, sort]);
  const head = (key: SortKey, label: string, right = false) => (
    <button
      type="button"
      onClick={() =>
        setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))
      }
      className={classNames(
        'text-label text-muted hover:text-ink',
        right && 'text-right',
      )}
    >
      {label}
      {sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
    </button>
  );
  const cols = showFrom
    ? 'grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]'
    : 'grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]';
  return (
    <div className="flex flex-col">
      <div className={classNames('grid gap-4 border-t border-outline px-5 py-2', cols)}>
        {head('name', 'Signal')}
        {head('count', 'Data points', true)}
        {head('firstSeen', 'First seen')}
        {head('lastSeen', 'Last seen')}
        {showFrom && <span className="text-label text-muted">From</span>}
      </div>
      {shown.map((r) => (
        <div
          key={r.name}
          className={classNames(
            'grid items-center gap-4 border-t border-outline px-5 py-2',
            cols,
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-body-sm font-medium text-ink">
              {humanizeSignal(r.name)}
            </span>
            <span className="truncate font-mono text-code text-muted">{r.name}</span>
          </span>
          <span className="text-right text-body-sm text-fg">
            {r.count.toLocaleString('en-US')}
          </span>
          <span className="text-body-sm text-fg">{date(r.firstSeen)}</span>
          <FreshnessDot at={r.lastSeen} />
          {showFrom && (
            <span className="flex flex-wrap gap-1">
              {(r.from ?? []).map((f) => (
                <span
                  key={f}
                  className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted"
                >
                  {f}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
      {shown.length === 0 && (
        <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
          No signals match.
        </p>
      )}
    </div>
  );
};

export const SignalFilter: FC<{ value: string; onChange: (v: string) => void }> = ({
  value,
  onChange,
}) => (
  <TextField
    placeholder="Filter signals"
    aria-label="Filter signals"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    wrapperClassName="w-60"
  />
);
```

`src/app/vehicles/[tokenId]/components/tabs/SummaryTab.tsx`:

```tsx
'use client';
import { FC, useState } from 'react';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useDataSummary } from '@/hooks/subjects/useDataSummary';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
} from '@/services/subjects/queries';
import { fieldError } from '@/services/subjects/client';
import { StatCard, compact } from '../StatCard';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { FreshnessDot } from '@/components/FreshnessDot';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { SignalTable, SignalFilter } from './SignalTable';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { relativeTime, absoluteTime } from '@/utils/freshness';

type Types = {
  availableCloudEventTypes:
    | { type: string; count: number; firstSeen: string; lastSeen: string }[]
    | null;
};
type Latest = {
  latestCloudEvent: { header: Record<string, string>; data: unknown } | null;
};

const date = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));

const Problem: FC<{ message: string }> = ({ message }) => (
  <p className="px-5 py-3 text-body-sm text-negative">{message}</p>
);

export const SummaryTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const [filter, setFilter] = useState('');
  const { summary, error, isLoading, unresolvedSource, fromBySignal } = useDataSummary(
    subject,
    ctx,
  );
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.did),
  });
  const latest = useSubjectQuery<Latest>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(subject.did, {}, false),
  });

  const latestAt =
    latest.data?.data?.latestCloudEvent?.header?.time ??
    ctx.freshness[subject.did]?.time ??
    null;
  const latestType =
    latest.data?.data?.latestCloudEvent?.header?.type ?? ctx.freshness[subject.did]?.type;
  const producer = latest.data?.data?.latestCloudEvent?.header?.producer;
  const producerLabel = ctx.graph.all.find((s) => s.did === producer)?.label;
  const typeRows = types.data?.data?.availableCloudEventTypes ?? [];
  const isVehicle = subject.kind === 'vehicle';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
        <StatCard
          label="Latest payload"
          className="col-span-2 md:col-span-1"
          value={<FreshnessDot at={latestAt} label={false} className="gap-3" />}
          caption={
            latestAt
              ? `${absoluteTime(latestAt)}${latestType ? ` · ${latestType}` : ''}${producerLabel ? ` from ${producerLabel}` : ''}`
              : 'No payload yet'
          }
        />
        <StatCard
          label="First seen"
          value={summary ? date(summary.firstSeen) : '—'}
          caption={
            summary
              ? `${daysBetween(summary.firstSeen, summary.lastSeen)} days of data`
              : undefined
          }
        />
        <StatCard
          label="Data points"
          value={summary ? compact(summary.numberOfSignals) : '—'}
          caption={
            summary ? `Across ${summary.availableSignals.length} signals` : undefined
          }
        />
        <StatCard
          label="Signals"
          value={summary ? summary.availableSignals.length : '—'}
          caption={summary ? `${summary.eventDataSummary.length} event types` : undefined}
        />
      </div>

      {unresolvedSource && (
        <p className="px-1 text-body-sm text-muted">
          This device has no cloud events yet, so the signal breakdown covers the whole
          vehicle.
        </p>
      )}

      <CollapsibleSection
        title="Available signals"
        count={summary?.availableSignals.length ?? '…'}
        defaultOpen
        actions={<SignalFilter value={filter} onChange={setFilter} />}
      >
        {error ? (
          <Problem message={error} />
        ) : isLoading ? (
          <p className="px-5 py-3 text-body-sm text-muted">Loading…</p>
        ) : (
          <SignalTable
            filter={filter}
            showFrom={isVehicle && !unresolvedSource && ctx.graph.devices.length > 0}
            rows={(summary?.signalDataSummary ?? []).map((s) => ({
              name: s.name,
              count: s.numberOfSignals,
              firstSeen: s.firstSeen,
              lastSeen: s.lastSeen,
              from: fromBySignal[s.name],
            }))}
          />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Events"
        count={summary?.eventDataSummary.length ?? '…'}
        meta={
          summary?.eventDataSummary.length
            ? `Last event ${relativeTime(
                summary.eventDataSummary
                  .map((e) => e.lastSeen)
                  .sort()
                  .at(-1),
              )}`
            : 'This source reports no events'
        }
      >
        <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>Event</span>
          <span className="text-right">Count</span>
          <span>First seen</span>
          <span>Last seen</span>
        </div>
        {(summary?.eventDataSummary ?? []).map((e) => (
          <div
            key={e.name}
            className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm text-fg"
          >
            <span className="flex flex-col">
              <span className="font-medium text-ink">{humanizeSignal(e.name)}</span>
              <span className="font-mono text-code text-muted">{e.name}</span>
            </span>
            <span className="text-right">{e.numberOfEvents.toLocaleString('en-US')}</span>
            <span>{date(e.firstSeen)}</span>
            <span>{relativeTime(e.lastSeen)}</span>
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Data types"
        count={typeRows.length}
        meta="Cloud event types on this DID"
      >
        {fieldError(types.data?.errors, 'availableCloudEventTypes') && (
          <Problem
            message={fieldError(types.data?.errors, 'availableCloudEventTypes')!}
          />
        )}
        {types.error && <Problem message={types.error.message} />}
        {typeRows.map((t) => (
          <div
            key={t.type}
            className="grid grid-cols-[minmax(0,2.2fr)_repeat(3,minmax(0,1fr))] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm text-fg"
          >
            <span className="font-mono text-code text-ink">{t.type}</span>
            <span className="text-right">{t.count.toLocaleString('en-US')}</span>
            <span>{date(t.firstSeen)}</span>
            <FreshnessDot at={t.lastSeen} />
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Latest payload"
        meta={latestType ? `${latestType} · ${relativeTime(latestAt)}` : undefined}
        actions={
          <Button variant="secondary" onClick={() => ctx.onBrowseRaw(subject.did)}>
            Browse cloud events
          </Button>
        }
      >
        {latest.error && <Problem message={latest.error.message} />}
        {latest.data?.data?.latestCloudEvent ? (
          <div className="px-4 pb-4">
            <JsonBlock value={latest.data.data.latestCloudEvent} maxHeight={300} />
          </div>
        ) : (
          !latest.error && (
            <p className="px-5 py-3 text-body-sm text-muted">
              No cloud event for this DID yet.
            </p>
          )
        )}
      </CollapsibleSection>

      <CollapsibleSection title={isVehicle ? 'Vehicle details' : 'Device details'}>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 px-6 pb-5 pt-1 md:grid-cols-2">
          {subject.details.map((d) => (
            <div
              key={d.label}
              className="flex flex-col gap-0.5 border-b border-outline pb-2.5"
            >
              <span className="text-label text-muted">{d.label}</span>
              <span
                className={
                  d.mono
                    ? 'break-all font-mono text-code text-fg'
                    : 'text-body-sm text-fg'
                }
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};
```

`SubjectView.tsx`: import `SummaryTab` and return `<SummaryTab subject={subject} ctx={ctx} />` for `'summary'`.

Run: `npx jest __tests__/unit/pages/vehicles/SummaryTab.test.tsx __tests__/unit/components` → PASS. `npm test && npm run lint && npm run compile` → green. On dev: the Summary tab for a shared vehicle shows real numbers matching `vehicle_data_summary` from the DIMO MCP tools.

- [ ] **Step 5: Commit**

```bash
git add -A src/components/CollapsibleSection src/components/JsonBlock src/hooks/subjects src/app/vehicles __tests__/unit
git commit -m "feat(vehicles): summary tab with data health, latest payload and details"
```

---

### Task 7: Raw data tab — the cloud event browser

**Files:**

- Create: `src/components/TimeRangePicker/{TimeRangePicker.tsx,index.ts}`, `src/components/QueryActions/{QueryActions.tsx,index.ts}`, `src/app/vehicles/[tokenId]/components/tabs/RawDataTab.tsx`
- Modify: `src/app/vehicles/[tokenId]/components/SubjectView.tsx` (raw branch)
- Test: `__tests__/unit/components/TimeRangePicker.test.tsx`, `__tests__/unit/pages/vehicles/RawDataTab.test.tsx`

**Interfaces:**

- Consumes: `cloudEventsQuery`, `latestCloudEventQuery`, `indexesQuery`, `latestIndexQuery`, `formatGraphQL` (Task 2); `JsonBlock`, `CollapsibleSection` (Task 6).
- Produces:
  - `type TimeRange = { preset: '24h' | '7d' | '30d' | 'custom'; from: string; to: string }`, `resolveRange(preset, now): { from; to }`, `TimeRangePicker({ value, onChange, maxDays? })`.
  - `QueryActions({ request, result, filename })`.
  - `RawDataTab({ subject, ctx })`.

- [ ] **Step 1: Write the failing TimeRangePicker test**

`__tests__/unit/components/TimeRangePicker.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangePicker, resolveRange } from '@/components/TimeRangePicker';

const NOW = Date.parse('2026-09-29T20:49:00Z');

describe('resolveRange', () => {
  it('computes presets back from now, in UTC', () => {
    expect(resolveRange('24h', NOW)).toEqual({
      from: '2026-09-28T20:49:00.000Z',
      to: '2026-09-29T20:49:00.000Z',
    });
    expect(resolveRange('7d', NOW).from).toBe('2026-09-22T20:49:00.000Z');
    expect(resolveRange('30d', NOW).from).toBe('2026-08-30T20:49:00.000Z');
  });
});

describe('TimeRangePicker', () => {
  it('switches presets and exposes custom inputs', () => {
    const onChange = jest.fn();
    render(
      <TimeRangePicker
        value={{ preset: '7d', ...resolveRange('7d', NOW) }}
        onChange={onChange}
        now={NOW}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '24 h' }));
    expect(onChange).toHaveBeenCalledWith({ preset: '24h', ...resolveRange('24h', NOW) });
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ preset: 'custom' }),
    );
  });
  it('hides presets longer than maxDays', () => {
    render(
      <TimeRangePicker
        value={{ preset: '7d', ...resolveRange('7d', NOW) }}
        onChange={() => {}}
        now={NOW}
        maxDays={7}
      />,
    );
    expect(screen.queryByRole('radio', { name: '30 days' })).not.toBeInTheDocument();
  });
  it('edits a custom range with UTC datetime inputs', () => {
    const onChange = jest.fn();
    render(
      <TimeRangePicker
        value={{
          preset: 'custom',
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-02T00:00:00.000Z',
        }}
        onChange={onChange}
        now={NOW}
      />,
    );
    fireEvent.change(screen.getByLabelText('From (UTC)'), {
      target: { value: '2026-09-03T10:30' },
    });
    expect(onChange).toHaveBeenCalledWith({
      preset: 'custom',
      from: '2026-09-03T10:30:00.000Z',
      to: '2026-09-02T00:00:00.000Z',
    });
  });
});
```

- [ ] **Step 2: Implement TimeRangePicker and QueryActions**

`src/components/TimeRangePicker/TimeRangePicker.tsx`:

```tsx
'use client';
import { FC } from 'react';
import classNames from 'classnames';

export type RangePreset = '24h' | '7d' | '30d' | 'custom';
export type TimeRange = { preset: RangePreset; from: string; to: string };

const HOURS: Record<Exclude<RangePreset, 'custom'>, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '30d': 30 * 24,
};
const LABELS: Record<RangePreset, string> = {
  '24h': '24 h',
  '7d': '7 days',
  '30d': '30 days',
  'custom': 'Custom',
};

export const resolveRange = (
  preset: Exclude<RangePreset, 'custom'>,
  now = Date.now(),
) => ({
  from: new Date(now - HOURS[preset] * 3_600_000).toISOString(),
  to: new Date(now).toISOString(),
});

// datetime-local wants "YYYY-MM-DDTHH:mm"; we keep everything UTC.
const toLocalInput = (iso: string) => iso.slice(0, 16);
const fromLocalInput = (v: string) => (v ? new Date(`${v}:00.000Z`).toISOString() : '');

interface Props {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  maxDays?: number;
  now?: number;
}

export const TimeRangePicker: FC<Props> = ({ value, onChange, maxDays, now }) => {
  const presets = (Object.keys(LABELS) as RangePreset[]).filter(
    (p) => p === 'custom' || !maxDays || HOURS[p] / 24 <= maxDays,
  );
  const pick = (p: RangePreset) =>
    onChange(
      p === 'custom'
        ? { ...value, preset: 'custom' }
        : { preset: p, ...resolveRange(p, now) },
    );
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-muted">Range</span>
        <div
          role="radiogroup"
          aria-label="Range"
          className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
        >
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={value.preset === p}
              onClick={() => pick(p)}
              className={classNames(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                value.preset === p
                  ? 'bg-bright text-ink shadow-sm'
                  : 'text-muted hover:text-fg',
              )}
            >
              {LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {value.preset === 'custom' && (
        <>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            From (UTC)
            <input
              type="datetime-local"
              value={toLocalInput(value.from)}
              onChange={(e) =>
                onChange({ ...value, from: fromLocalInput(e.target.value) })
              }
              className="h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            To (UTC)
            <input
              type="datetime-local"
              value={toLocalInput(value.to)}
              onChange={(e) => onChange({ ...value, to: fromLocalInput(e.target.value) })}
              className="h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink"
            />
          </label>
        </>
      )}
    </div>
  );
};
```

`src/components/TimeRangePicker/index.ts`: `export * from './TimeRangePicker';`

`src/components/QueryActions/QueryActions.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { formatGraphQL, type GqlRequest } from '@/services/subjects/queries';

// "Copy query" gives developers the exact GraphQL and variables the page ran,
// ready to paste into their own code. "Download JSON" saves the result.
export const QueryActions: FC<{
  request: GqlRequest | null;
  result: unknown;
  filename: string;
}> = ({ request, result, filename }) => (
  <div className="flex items-center gap-1">
    <Button
      variant="ghost"
      disabled={!request}
      onClick={() => {
        if (!request) return;
        void navigator.clipboard.writeText(formatGraphQL(request));
        toast.success('Query copied');
      }}
    >
      Copy query
    </Button>
    <Button
      variant="ghost"
      disabled={result === undefined}
      onClick={() =>
        saveAs(
          new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
          filename,
        )
      }
    >
      Download JSON
    </Button>
  </div>
);
```

`src/components/QueryActions/index.ts`: `export * from './QueryActions';`

Run: `npx jest __tests__/unit/components/TimeRangePicker.test.tsx` → PASS.

- [ ] **Step 3: Write the failing RawDataTab test**

`__tests__/unit/pages/vehicles/RawDataTab.test.tsx`:

```tsx
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
```

- [ ] **Step 4: Implement RawDataTab**

`src/app/vehicles/[tokenId]/components/tabs/RawDataTab.tsx`:

```tsx
'use client';
import { FC, useMemo, useState } from 'react';
import classNames from 'classnames';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  cloudEventsQuery,
  latestCloudEventQuery,
  indexesQuery,
  latestIndexQuery,
  type CloudEventFilter,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { shortDid } from '@/services/subjects/did';
import { absoluteTime } from '@/utils/freshness';

type Mode = 'events' | 'latest' | 'index';
type Header = {
  id: string;
  source: string;
  producer: string;
  subject: string;
  time: string;
  type: string;
  dataversion?: string;
  tags?: string[];
};
type Event = { header: Header; data?: unknown; dataUrl?: string; indexKey?: string };
type Result = {
  cloudEvents?: Event[] | null;
  latestCloudEvent?: Event | null;
  indexes?: Event[] | null;
  latestIndex?: Event | null;
};

const MODES: { id: Mode; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'latest', label: 'Latest' },
  { id: 'index', label: 'Index only' },
];
const KNOWN_TYPES = ['dimo.status', 'dimo.fingerprint', 'dimo.attestation', 'dimo.event'];
const inputClass =
  'h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink';

const build = (
  mode: Mode,
  did: string,
  filter: CloudEventFilter,
  limit: number,
  withUrl: boolean,
): GqlRequest => {
  if (mode === 'latest') return latestCloudEventQuery(did, filter, withUrl);
  if (mode === 'index') return indexesQuery(did, filter, limit);
  return cloudEventsQuery(did, filter, limit, withUrl);
};

export const RawDataTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const [mode, setMode] = useState<Mode>('events');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [form, setForm] = useState({
    type: '',
    dataversion: '',
    id: '',
    source: '',
    producer: '',
    limit: 25,
    withUrl: false,
  });
  const [more, setMore] = useState(false);
  const [before, setBefore] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number>(0);
  // The request only changes on Run query / Load older, so typing never refetches.
  const [request, setRequest] = useState<GqlRequest>(() =>
    build('events', subject.did, { after: range.from, before: range.to }, 25, false),
  );

  const run = (nextMode = mode, olderThan: string | null = null) => {
    const filter: CloudEventFilter = {
      type: form.type,
      dataversion: form.dataversion,
      id: form.id,
      source: form.source,
      producer: form.producer,
      after: range.from,
      before: olderThan ?? range.to,
    };
    setBefore(olderThan);
    setExpanded(0);
    setRequest(build(nextMode, subject.did, filter, form.limit, form.withUrl));
  };

  const q = useSubjectQuery<Result>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request,
    staleTime: 0,
  });
  const rows = useMemo<Event[]>(() => {
    const d = q.data?.data;
    if (!d) return [];
    if (mode === 'latest') return d.latestCloudEvent ? [d.latestCloudEvent] : [];
    if (mode === 'index') return d.indexes ?? [];
    return d.cloudEvents ?? [];
  }, [q.data, mode]);
  const producerLabel = (did: string) =>
    ctx.graph.all.find((s) => s.did === did)?.label ?? shortDid(did);
  const title =
    mode === 'latest'
      ? 'Latest cloud event'
      : `${rows.length} ${mode === 'index' ? 'index entries' : 'cloud events'}${before ? ' (older)' : ''}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3.5 rounded-card bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="radiogroup"
            aria-label="Query"
            className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
          >
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  run(m.id);
                }}
                className={classNames(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                  mode === m.id
                    ? 'bg-bright text-ink shadow-sm'
                    : 'text-muted hover:text-fg',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Type
            <input
              list="cloud-event-types"
              className={classNames(inputClass, 'w-44')}
              value={form.type}
              placeholder="Any type"
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <datalist id="cloud-event-types">
              {KNOWN_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Data version
            <input
              className={classNames(inputClass, 'w-36')}
              value={form.dataversion}
              placeholder="Any version"
              onChange={(e) => setForm({ ...form, dataversion: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Limit
            <input
              type="number"
              min={1}
              max={100}
              className={classNames(inputClass, 'w-20')}
              value={form.limit}
              onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
            />
          </label>
          <Button variant="ghost" onClick={() => setMore((m) => !m)}>
            {more ? 'Fewer filters' : 'More filters'}
          </Button>
          <label className="flex h-10 items-center gap-2 text-body-sm text-fg">
            <input
              type="checkbox"
              checked={form.withUrl}
              onChange={(e) => setForm({ ...form, withUrl: e.target.checked })}
              className="size-4 accent-accent"
            />
            Include data URL
          </label>
          <div className="flex-grow" />
          <Button onClick={() => run()}>Run query</Button>
        </div>
        {more && (
          <div className="flex flex-wrap items-end gap-3">
            <TextField
              placeholder="Event ID"
              aria-label="Event ID"
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value })}
              wrapperClassName="w-56"
            />
            <TextField
              placeholder="Source address"
              aria-label="Source"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              wrapperClassName="w-72"
            />
            <TextField
              placeholder="Producer DID"
              aria-label="Producer"
              value={form.producer}
              onChange={(e) => setForm({ ...form, producer: e.target.value })}
              wrapperClassName="w-96"
            />
          </div>
        )}
      </div>

      {subject.kind === 'vehicle' && (
        <p className="px-1 text-body-sm text-muted">
          Cloud events for the vehicle DID from every device. Pick a device on the left to
          see only that device.
        </p>
      )}

      <div className="flex flex-col rounded-card bg-card">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="text-card-title text-ink">{title}</span>
            <span className="truncate font-mono text-code text-muted">
              {shortDid(subject.did)}
            </span>
          </div>
          <QueryActions
            request={request}
            result={q.data?.data}
            filename={`${subject.label.toLowerCase()}-cloud-events.json`}
          />
        </div>
        <div className="grid grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] gap-4 border-t border-outline px-5 py-2 text-label text-muted">
          <span>Time (UTC) ↓</span>
          <span>Type</span>
          <span>Data version</span>
          <span>Producer</span>
          <span />
        </div>
        {q.isLoading && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            Loading…
          </p>
        )}
        {q.error && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
            {q.error.message}
          </p>
        )}
        {!q.isLoading && !q.error && rows.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            No events match. Widen the range or clear a filter.
          </p>
        )}
        {rows.map((r, i) => {
          const open = expanded === i;
          const [date, time] = [
            absoluteTime(r.header.time).split(',')[0],
            r.header.time.slice(11, 19),
          ];
          return (
            <div key={r.header.id + i} className="flex flex-col border-t border-outline">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setExpanded(open ? -1 : i)}
                className={classNames(
                  'grid grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_32px] items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-control',
                  open && 'bg-control',
                )}
              >
                <span className="text-body-sm text-fg">
                  <span className="text-muted">{date}</span> {time}
                </span>
                <span className="text-body-sm font-medium text-ink">{r.header.type}</span>
                <span className="font-mono text-code text-fg">
                  {r.header.dataversion ?? '—'}
                </span>
                <span className="text-body-sm text-fg">
                  {producerLabel(r.header.producer)}
                </span>
                <ChevronDownIcon
                  className={classNames(
                    'size-4 text-muted transition-transform',
                    open && 'rotate-180',
                  )}
                />
              </button>
              {open && (
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <JsonBlock value={r} maxHeight={260} />
                  {r.dataUrl && (
                    <a
                      href={r.dataUrl}
                      className="w-fit text-body-sm font-semibold text-ink underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download payload
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {mode !== 'latest' && rows.length > 0 && (
          <div className="flex justify-center border-t border-outline p-3">
            <Button
              variant="secondary"
              onClick={() => run(mode, rows[rows.length - 1].header.time)}
            >
              Load older
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Kept for the "Latest" mode of index-only browsing; the tab uses indexes() for lists.
export const latestIndexFor = latestIndexQuery;
```

(Drop the last two lines if `latestIndexQuery` is otherwise unused in this file; `npm run lint` flags unused imports.)

`SubjectView.tsx`: return `<RawDataTab subject={subject} ctx={ctx} />` for `'raw'`.

Run: `npx jest __tests__/unit/pages/vehicles/RawDataTab.test.tsx` → PASS. `npm test && npm run lint && npm run compile` → green. On dev, compare a row's JSON with `fetch_get_latest_cloud_event` from the DIMO MCP tools for the same DID.

- [ ] **Step 5: Commit**

```bash
git add src/components/TimeRangePicker src/components/QueryActions src/app/vehicles __tests__/unit
git commit -m "feat(vehicles): raw data tab browses cloud events per subject"
```

---

### Task 8: Signals tab — picker, time-series query, chart and JSON

**Files:**

- Modify: `src/app/globals.css` (chart tokens, both themes), `tailwind.config.ts` (`tokenColors`), `__tests__/unit/utils/tokens.test.ts`, `package.json` (`recharts`), `src/app/vehicles/[tokenId]/components/SubjectView.tsx` (signals branch)
- Create: `src/app/vehicles/[tokenId]/components/tabs/SignalsTab.tsx`, `src/app/vehicles/[tokenId]/components/tabs/SignalChart.tsx`, `src/app/vehicles/[tokenId]/components/tabs/SignalPicker.tsx`
- Test: `__tests__/unit/pages/vehicles/SignalsTab.test.tsx`

**Interfaces:**

- Consumes: `availableSignalsQuery`, `signalsQuery`, `signalsLatestQuery`, `isLocationSignal`, `FloatAggregation` (Task 2); `useTelemetrySource` (Task 6); `TimeRangePicker`, `QueryActions` (Task 7).
- Produces: `SignalChart({ name, unit?, points: { t: string; v: number | null }[]; colorIndex })`, `SignalPicker({ available, selected, onChange })`, `SignalsTab({ subject, ctx })`. Tokens `chart-1…6` (Tailwind `text-chart-1`, `bg-chart-1`, CSS `rgb(var(--chart-1))`).

- [ ] **Step 1: Load the dataviz skill, then add the chart tokens with their contrast test**

Invoke `dataviz` before writing chart code (it sets the categorical-palette and small-multiples rules this task follows).

`src/app/globals.css`, inside `:root[data-theme='dark']` after `--favorite`:

```css
/* Chart series: distinct in hue and lightness, ≥3:1 on card/control. */
--chart-1: 140 208 255; /* #8CD0FF */
--chart-2: 70 241 228; /* #46F1E4 */
--chart-3: 201 160 255; /* #C9A0FF */
--chart-4: 255 205 41; /* #FFCD29 */
--chart-5: 255 143 177; /* #FF8FB1 */
--chart-6: 155 227 138; /* #9BE38A */
```

inside `:root[data-theme='light']` at the same spot:

```css
--chart-1: 30 111 191; /* #1E6FBF */
--chart-2: 11 143 133; /* #0B8F85 */
--chart-3: 122 63 209; /* #7A3FD1 */
--chart-4: 154 106 0; /* #9A6A00 */
--chart-5: 194 24 91; /* #C2185B */
--chart-6: 46 125 50; /* #2E7D32 */
```

`tailwind.config.ts`, in `tokenColors` after `'favorite': token('favorite'),`:

```ts
  'chart-1': token('chart-1'),
  'chart-2': token('chart-2'),
  'chart-3': token('chart-3'),
  'chart-4': token('chart-4'),
  'chart-5': token('chart-5'),
  'chart-6': token('chart-6'),
```

`__tests__/unit/utils/tokens.test.ts`, a new case after the status-dot test:

```ts
it.each(['dark', 'light'] as const)(
  '%s chart series meet 3:1 on chart surfaces',
  (theme) => {
    const t = themes[theme];
    for (let i = 1; i <= 6; i++) {
      for (const surface of ['card', 'control']) {
        expect({
          pair: `chart-${i} on ${surface}`,
          ratio: contrast(t[`chart-${i}`], t[surface]) >= 3,
        }).toEqual({
          pair: `chart-${i} on ${surface}`,
          ratio: true,
        });
      }
    }
  },
);
```

Run: `npx jest __tests__/unit/utils/tokens.test.ts` → PASS (the "same variables in dark and light" case also proves both blocks got all six).

- [ ] **Step 2: Install recharts**

Run: `npm install recharts@^2.15.0`. Commit `package.json` and `package-lock.json` with this task.

- [ ] **Step 3: Write the failing SignalsTab test**

`__tests__/unit/pages/vehicles/SignalsTab.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
jest.mock('@/app/vehicles/[tokenId]/components/tabs/SignalChart', () => ({
  SignalChart: ({ name, points }: { name: string; points: unknown[] }) => (
    <div data-testid={`chart-${name}`}>{points.length} points</div>
  ),
}));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { SignalsTab } from '@/app/vehicles/[tokenId]/components/tabs/SignalsTab';
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
    alias: 'A',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
  }),
  graph,
  chainId: 80002,
  freshness: {},
  onBrowseRaw: jest.fn(),
};
const SERIES = [
  {
    timestamp: '2026-09-29T18:00:00Z',
    speed: 42.5,
    powertrainCombustionEngineSpeed: 1800,
  },
  {
    timestamp: '2026-09-29T19:00:00Z',
    speed: null,
    powertrainCombustionEngineSpeed: null,
  },
];

beforeEach(() => {
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      if (q.startsWith('query AvailableSignals'))
        return {
          data: {
            data: {
              availableSignals: [
                'speed',
                'powertrainCombustionEngineSpeed',
                'currentLocationCoordinates',
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      if (q.startsWith('query Signals'))
        return { data: { data: { signals: SERIES } }, isLoading: false, error: null };
      if (q.startsWith('query SignalsLatest'))
        return {
          data: {
            data: {
              signalsLatest: {
                lastSeen: '2026-09-29T20:47:00Z',
                speed: { timestamp: '2026-09-29T20:47:00Z', value: 42 },
              },
            },
          },
          isLoading: false,
          error: null,
        };
      return { data: undefined, isLoading: false, error: null };
    },
  );
});

describe('SignalsTab', () => {
  it("offers the subject's available signals (locations excluded) and runs an aggregated query", async () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add signal' }));
    expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Speed'));
    fireEvent.click(screen.getByLabelText('Engine speed'));
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const call = (useSubjectQuery as jest.Mock).mock.calls
      .filter((c) => c[0].request?.query.startsWith('query Signals'))
      .at(-1)[0];
    expect(call.api).toBe('telemetry');
    expect(call.request.query).toContain('speed(agg: AVG)');
    expect(call.request.query).toContain('powertrainCombustionEngineSpeed(agg: AVG)');
    expect(call.request.variables.interval).toBe('1h');
    expect(await screen.findByTestId('chart-speed')).toHaveTextContent('2 points');
    expect(
      await screen.findByTestId('chart-powertrainCombustionEngineSpeed'),
    ).toBeInTheDocument();
  });

  it('will not run without a signal', () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    expect(screen.getByRole('button', { name: 'Run query' })).toBeDisabled();
  });

  it('switches to JSON and shows latest values', () => {
    render(<SignalsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add signal' }));
    fireEvent.click(screen.getByLabelText('Speed'));
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    fireEvent.click(screen.getByRole('radio', { name: 'JSON' }));
    expect(screen.getByTestId('json-block')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Latest values' }));
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement the picker, chart and tab**

`src/app/vehicles/[tokenId]/components/tabs/SignalPicker.tsx`:

```tsx
'use client';
import { FC, useState } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/16/solid';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { TextField } from '@/components/TextField';

// Selected signals as inverse-ink chips; "Add signal" opens a searchable
// checkbox list of what this subject actually reports.
export const SignalPicker: FC<{
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}> = ({ available, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const shown = available.filter((s) => {
    const f = filter.trim().toLowerCase();
    return (
      !f || s.toLowerCase().includes(f) || humanizeSignal(s).toLowerCase().includes(f)
    );
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-label text-muted">Signals</span>
        {selected.map((s) => (
          <span
            key={s}
            className="flex h-8 items-center gap-1.5 rounded-full bg-selected-bg pl-3 pr-1.5 text-[13px] font-medium text-selected-fg"
          >
            {humanizeSignal(s)}
            <button
              type="button"
              aria-label={`Remove ${humanizeSignal(s)}`}
              onClick={() => onChange(selected.filter((x) => x !== s))}
              className="flex size-5 items-center justify-center rounded-full hover:bg-highest/30"
            >
              <XMarkIcon className="size-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-outline px-3 text-[13px] text-muted transition-colors hover:bg-control hover:text-ink"
        >
          <PlusIcon className="size-3" />
          Add signal
        </button>
        <span className="text-label text-muted">
          From {available.length} signals on this source
        </span>
      </div>
      {open && (
        <div className="flex max-h-72 w-full max-w-md flex-col gap-1 overflow-auto rounded-control border border-outline bg-overlay p-2 shadow-float">
          <TextField
            placeholder="Find a signal"
            aria-label="Find a signal"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {shown.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2.5 rounded-chip px-2 py-1.5 hover:bg-control"
            >
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={selected.includes(s)}
                aria-label={humanizeSignal(s)}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...selected, s] : selected.filter((x) => x !== s),
                  )
                }
              />
              <span className="flex flex-col">
                <span className="text-body-sm text-ink">{humanizeSignal(s)}</span>
                <span className="font-mono text-code text-muted">{s}</span>
              </span>
            </label>
          ))}
          {shown.length === 0 && (
            <p className="px-2 py-1.5 text-body-sm text-muted">No signals match.</p>
          )}
        </div>
      )}
    </div>
  );
};
```

`src/app/vehicles/[tokenId]/components/tabs/SignalChart.tsx` (small multiples: one chart per signal, each with its own y-axis, the series color from `chart-N`; no gradient fills, no dots, one grid tone):

```tsx
'use client';
import { FC } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { humanizeSignal } from '@/utils/humanizeSignal';

export type Point = { t: string; v: number | null };

const tick = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const SignalChart: FC<{ name: string; points: Point[]; colorIndex: number }> = ({
  name,
  points,
  colorIndex,
}) => {
  const color = `rgb(var(--chart-${(colorIndex % 6) + 1}))`;
  return (
    <div className="flex flex-col gap-2 border-t border-outline pt-3">
      <div className="flex items-baseline gap-2.5">
        <span
          className="h-[3px] w-2.5 self-center rounded-sm"
          style={{ background: color }}
        />
        <span className="text-body-sm font-semibold text-ink">
          {humanizeSignal(name)}
        </span>
        <span className="font-mono text-code text-muted">{name}</span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--outline))" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={tick}
              stroke="rgb(var(--muted))"
              tick={{ fontSize: 11 }}
              minTickGap={48}
            />
            <YAxis stroke="rgb(var(--muted))" tick={{ fontSize: 11 }} width={44} />
            <Tooltip
              labelFormatter={(l) => String(l).replace('T', ' ').slice(0, 16) + ' UTC'}
              contentStyle={{
                background: 'rgb(var(--overlay))',
                border: '1px solid rgb(var(--outline))',
                borderRadius: 10,
                color: 'rgb(var(--fg))',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

`src/app/vehicles/[tokenId]/components/tabs/SignalsTab.tsx`:

```tsx
'use client';
import { FC, useMemo, useState } from 'react';
import classNames from 'classnames';
import dynamic from 'next/dynamic';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { useTelemetrySource } from '@/hooks/subjects/useDataSummary';
import {
  availableSignalsQuery,
  signalsQuery,
  signalsLatestQuery,
  isLocationSignal,
  type FloatAggregation,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { JsonBlock } from '@/components/JsonBlock';
import { Button } from '@/components/Button';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { SignalPicker } from './SignalPicker';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { relativeTime } from '@/utils/freshness';

const SignalChart = dynamic(() => import('./SignalChart').then((m) => m.SignalChart), {
  ssr: false,
});

const AGGS: { value: FloatAggregation; label: string }[] = [
  { value: 'AVG', label: 'Average' },
  { value: 'MED', label: 'Median' },
  { value: 'MAX', label: 'Max' },
  { value: 'MIN', label: 'Min' },
  { value: 'FIRST', label: 'First' },
  { value: 'LAST', label: 'Last' },
];
const INTERVALS = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
];
const selectClass =
  'h-10 appearance-none rounded-control border border-control-border bg-control px-3 pr-8 text-body-sm text-ink';

type Row = { timestamp: string } & Record<string, number | string | null>;
type Latest = {
  signalsLatest:
    | ({ lastSeen: string | null } & Record<
        string,
        { timestamp: string; value: unknown } | null
      >)
    | null;
};

export const SignalsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const source = useTelemetrySource(subject, ctx);
  const tokenId = subject.tokenId ?? 0;
  const avail = useSubjectQuery<{ availableSignals: string[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableSignalsQuery(tokenId, source),
  });
  const available = useMemo(
    () => (avail.data?.data?.availableSignals ?? []).filter((s) => !isLocationSignal(s)),
    [avail.data],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [agg, setAgg] = useState<FloatAggregation>('AVG');
  const [interval, setInterval] = useState('1h');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [view, setView] = useState<'chart' | 'json'>('chart');
  const [request, setRequest] = useState<GqlRequest | null>(null);
  const [latestRequest, setLatestRequest] = useState<GqlRequest | null>(null);

  const run = () =>
    setRequest(
      signalsQuery({
        tokenId,
        signals: selected,
        available,
        agg,
        interval,
        from: range.from,
        to: range.to,
        source,
      }),
    );
  const series = useSubjectQuery<{ signals: Row[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request,
    staleTime: 0,
  });
  const latest = useSubjectQuery<Latest>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestRequest,
    staleTime: 0,
  });
  const ranSignals = useMemo(
    () => (request ? selected.filter((s) => request.query.includes(`${s}(agg`)) : []),
    [request, selected],
  );
  const rows = series.data?.data?.signals ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3.5 rounded-card bg-card p-4">
        <SignalPicker available={available} selected={selected} onChange={setSelected} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Aggregation
            <select
              className={selectClass}
              value={agg}
              onChange={(e) => setAgg(e.target.value as FloatAggregation)}
            >
              {AGGS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Interval
            <select
              className={selectClass}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <TimeRangePicker value={range} onChange={setRange} />
          <div className="flex-grow" />
          <Button
            variant="ghost"
            onClick={() =>
              setLatestRequest(
                available.length ? signalsLatestQuery(tokenId, available, source) : null,
              )
            }
            disabled={!available.length}
          >
            Latest values
          </Button>
          <Button onClick={run} disabled={selected.length === 0}>
            Run query
          </Button>
        </div>
      </div>

      {request && (
        <div className="flex flex-col rounded-card bg-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div
              role="radiogroup"
              aria-label="Result view"
              className="flex w-fit gap-0.5 rounded-full bg-control p-[3px]"
            >
              {(['chart', 'json'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={classNames(
                    'rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] transition-colors',
                    view === v
                      ? 'bg-bright text-ink shadow-sm'
                      : 'text-muted hover:text-fg',
                  )}
                >
                  {v === 'chart' ? 'Chart' : 'JSON'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-label text-muted">
                {series.isLoading ? 'Running…' : `${rows.length} points`}
              </span>
              <QueryActions
                request={request}
                result={series.data?.data}
                filename={`${subject.label.toLowerCase()}-signals.json`}
              />
            </div>
          </div>
          {series.error && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
              {series.error.message}
            </p>
          )}
          {series.data?.errors?.map((e) => (
            <p
              key={e.message}
              className="border-t border-outline px-5 py-3 text-body-sm text-negative"
            >
              {e.message}
            </p>
          ))}
          {view === 'chart' ? (
            <div className="flex flex-col gap-5 px-5 pb-5">
              {ranSignals.map((name, i) => (
                <SignalChart
                  key={name}
                  name={name}
                  colorIndex={i}
                  points={rows.map((r) => ({
                    t: r.timestamp,
                    v: typeof r[name] === 'number' ? (r[name] as number) : null,
                  }))}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 pb-4">
              <JsonBlock value={series.data?.data ?? null} maxHeight={520} />
            </div>
          )}
        </div>
      )}

      {latestRequest && (
        <CollapsibleSection
          title="Latest values"
          defaultOpen
          meta={
            latest.data?.data?.signalsLatest?.lastSeen
              ? `Last seen ${relativeTime(latest.data.data.signalsLatest.lastSeen)}`
              : undefined
          }
          actions={
            <QueryActions
              request={latestRequest}
              result={latest.data?.data}
              filename={`${subject.label.toLowerCase()}-latest.json`}
            />
          }
        >
          {latest.error && (
            <p className="px-5 py-3 text-body-sm text-negative">{latest.error.message}</p>
          )}
          {Object.entries(latest.data?.data?.signalsLatest ?? {})
            .filter(([k, v]) => k !== 'lastSeen' && v)
            .map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-4 border-t border-outline px-5 py-2 text-body-sm"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-ink">{humanizeSignal(k)}</span>
                  <span className="font-mono text-code text-muted">{k}</span>
                </span>
                <span className="font-mono text-code text-fg">
                  {typeof (v as { value: unknown }).value === 'object'
                    ? JSON.stringify((v as { value: unknown }).value)
                    : String((v as { value: unknown }).value)}
                </span>
                <span className="text-muted">
                  {relativeTime((v as { timestamp: string }).timestamp)}
                </span>
              </div>
            ))}
        </CollapsibleSection>
      )}
    </div>
  );
};
```

`SubjectView.tsx`: return `<SignalsTab subject={subject} ctx={ctx} />` for `'signals'`.

Run: `npx jest __tests__/unit/pages/vehicles/SignalsTab.test.tsx __tests__/unit/utils/tokens.test.ts` → PASS. `npm test && npm run lint && npm run compile` → green. On dev: 7 days of `speed` at 1 hour draws a line in both themes; `npm run visual:check -- src/app/vehicles` reports no stray colors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/app/globals.css tailwind.config.ts src/app/vehicles __tests__/unit
git commit -m "feat(vehicles): signals tab with time-series chart and chart tokens"
```

---

### Task 9: Trips tab — segments and daily activity

**Files:**

- Create: `src/app/vehicles/[tokenId]/components/tabs/TripsTab.tsx`
- Modify: `src/app/vehicles/[tokenId]/components/SubjectView.tsx` (trips branch)
- Test: `__tests__/unit/pages/vehicles/TripsTab.test.tsx`

**Interfaces:**

- Consumes: `segmentsQuery`, `dailyActivityQuery`, `SEGMENT_DEFAULTS`, `DetectionMechanism`, `SegmentConfig` (Task 2); `TimeRangePicker` (`maxDays={31}`), `QueryActions` (Task 7).
- Produces: `TripsTab({ subject, ctx })`.

- [ ] **Step 1: Write the failing test**

`__tests__/unit/pages/vehicles/TripsTab.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { TripsTab } from '@/app/vehicles/[tokenId]/components/tabs/TripsTab';
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
    alias: 'A',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
  }),
  graph,
  chainId: 80002,
  freshness: {},
  onBrowseRaw: jest.fn(),
};
const seg = (start: string, end: string | null, ongoing: boolean) => ({
  start: { timestamp: start, value: { latitude: 40.7, longitude: -74, hdop: 1 } },
  end: end
    ? { timestamp: end, value: { latitude: 40.8, longitude: -74.1, hdop: 1 } }
    : null,
  duration: 2580,
  isOngoing: ongoing,
  startedBeforeRange: false,
  signals: [
    { name: 'speed', agg: 'MAX', value: 112 },
    { name: 'powertrainTransmissionTravelledDistance', agg: 'FIRST', value: 48200 },
    { name: 'powertrainTransmissionTravelledDistance', agg: 'LAST', value: 48234.7 },
  ],
  eventCounts: [],
});

beforeEach(() => {
  (useSubjectQuery as jest.Mock).mockImplementation(
    ({ request }: { request: { query: string } | null }) => {
      const q = request?.query ?? '';
      if (q.startsWith('query Segments'))
        return {
          data: {
            data: {
              segments: [
                seg('2026-09-29T20:21:00Z', null, true),
                seg('2026-09-29T17:48:00Z', '2026-09-29T18:31:00Z', false),
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      if (q.startsWith('query DailyActivity'))
        return {
          data: {
            data: {
              dailyActivity: [
                {
                  date: '2026-09-28',
                  segmentCount: 3,
                  duration: 4320,
                  signals: [],
                  eventCounts: [],
                },
                {
                  date: '2026-09-29',
                  segmentCount: 2,
                  duration: 5160,
                  signals: [],
                  eventCounts: [],
                },
              ],
            },
          },
          isLoading: false,
          error: null,
        };
      return { data: undefined, isLoading: false, error: null };
    },
  );
});

describe('TripsTab', () => {
  it('runs segments and daily activity with the chosen mechanism and range', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText('Detect trips by'), {
      target: { value: 'frequencyAnalysis' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const calls = (useSubjectQuery as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((c) => c.request);
    const segCall = calls
      .filter((c) => c.request.query.startsWith('query Segments'))
      .at(-1);
    const dayCall = calls
      .filter((c) => c.request.query.startsWith('query DailyActivity'))
      .at(-1);
    expect(segCall.request.variables.mechanism).toBe('frequencyAnalysis');
    expect(dayCall.request.variables.mechanism).toBe('frequencyAnalysis');
    expect(segCall.request.variables.config.maxGapSeconds).toBe(300);
    expect(screen.getByText('5 trips · 2 h 38 m driving')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('43 min')).toBeInTheDocument();
    expect(screen.getByText('34.7 km')).toBeInTheDocument();
    expect(screen.getByText('112 km/h')).toBeInTheDocument();
  });

  it('keeps daily activity off the mechanisms it does not support', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.change(screen.getByLabelText('Detect trips by'), {
      target: { value: 'refuel' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const dayCalls = (useSubjectQuery as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((c) => c.request?.query.startsWith('query DailyActivity'));
    expect(dayCalls.at(-1)?.enabled ?? dayCalls.length === 0).toBeTruthy();
    expect(
      screen.getByText(
        'Daily activity is available for ignition, frequency and change-point detection.',
      ),
    ).toBeInTheDocument();
  });

  it('exposes the advanced config and passes it through', () => {
    render(<TripsTab subject={graph.vehicle} ctx={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced settings' }));
    fireEvent.change(screen.getByLabelText('Max gap (seconds)'), {
      target: { value: '600' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run query' }));
    const segCall = (useSubjectQuery as jest.Mock).mock.calls
      .map((c) => c[0])
      .filter((c) => c.request?.query.startsWith('query Segments'))
      .at(-1);
    expect(segCall.request.variables.config.maxGapSeconds).toBe(600);
  });
});
```

- [ ] **Step 2: Implement TripsTab**

`src/app/vehicles/[tokenId]/components/tabs/TripsTab.tsx`:

```tsx
'use client';
import { FC, useState } from 'react';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  segmentsQuery,
  dailyActivityQuery,
  SEGMENT_DEFAULTS,
  type DetectionMechanism,
  type SegmentConfig,
  type GqlRequest,
} from '@/services/subjects/queries';
import {
  TimeRangePicker,
  resolveRange,
  type TimeRange,
} from '@/components/TimeRangePicker';
import { QueryActions } from '@/components/QueryActions';
import { Button } from '@/components/Button';
import { absoluteTime } from '@/utils/freshness';

const MECHANISMS: { value: DetectionMechanism; label: string; daily: boolean }[] = [
  { value: 'ignitionDetection', label: 'Ignition on and off', daily: true },
  { value: 'frequencyAnalysis', label: 'Signal frequency', daily: true },
  { value: 'changePointDetection', label: 'Change points', daily: true },
  { value: 'idling', label: 'Idling', daily: false },
  { value: 'refuel', label: 'Refueling', daily: false },
  { value: 'recharge', label: 'Recharging', daily: false },
];
const CONFIG_FIELDS: { key: keyof SegmentConfig; label: string }[] = [
  { key: 'maxGapSeconds', label: 'Max gap (seconds)' },
  { key: 'minSegmentDurationSeconds', label: 'Min duration (seconds)' },
  { key: 'signalCountThreshold', label: 'Signal count threshold' },
  { key: 'maxIdleRpm', label: 'Max idle rpm' },
  { key: 'minIncreasePercent', label: 'Min increase (%)' },
];
const inputClass =
  'h-10 rounded-control border border-control-border bg-control px-3 text-body-sm text-ink';

type Segment = {
  start: {
    timestamp: string;
    value: { latitude: number; longitude: number } | null;
  } | null;
  end: {
    timestamp: string;
    value: { latitude: number; longitude: number } | null;
  } | null;
  duration: number;
  isOngoing: boolean;
  startedBeforeRange: boolean;
  signals: { name: string; agg: string; value: number | null }[];
  eventCounts: { name: string; count: number }[];
};
type Day = { date: string; segmentCount: number; duration: number };

export const fmtDuration = (seconds: number) => {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} m`;
};
const sig = (s: Segment, name: string, agg: string) =>
  s.signals.find((x) => x.name === name && x.agg === agg)?.value ?? null;
const distance = (s: Segment) => {
  const a = sig(s, 'powertrainTransmissionTravelledDistance', 'FIRST');
  const b = sig(s, 'powertrainTransmissionTravelledDistance', 'LAST');
  return a !== null && b !== null ? `${(b - a).toFixed(1)} km` : '—';
};
const short = (iso: string) => absoluteTime(iso).replace(/:\d\d UTC$/, '');

export const TripsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const tokenId = subject.tokenId ?? 0;
  const [mechanism, setMechanism] = useState<DetectionMechanism>('ignitionDetection');
  const [range, setRange] = useState<TimeRange>({ preset: '7d', ...resolveRange('7d') });
  const [config, setConfig] = useState<SegmentConfig>(SEGMENT_DEFAULTS);
  const [advanced, setAdvanced] = useState(false);
  const [segReq, setSegReq] = useState<GqlRequest | null>(null);
  const [dayReq, setDayReq] = useState<GqlRequest | null>(null);
  const dailySupported = MECHANISMS.find((m) => m.value === mechanism)!.daily;

  const run = () => {
    const base = { tokenId, from: range.from, to: range.to, mechanism, config };
    setSegReq(segmentsQuery(base));
    setDayReq(dailySupported ? dailyActivityQuery(base) : null);
  };
  const segments = useSubjectQuery<{ segments: Segment[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: segReq,
    staleTime: 0,
  });
  const days = useSubjectQuery<{ dailyActivity: Day[] | null }>({
    api: 'telemetry',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: dayReq,
    enabled: !!dayReq,
    staleTime: 0,
  });
  const dayRows = days.data?.data?.dailyActivity ?? [];
  const segRows = segments.data?.data?.segments ?? [];
  const maxCount = Math.max(1, ...dayRows.map((d) => d.segmentCount));
  const totalTrips = dayRows.reduce((n, d) => n + d.segmentCount, 0);
  const totalSeconds = dayRows.reduce((n, d) => n + d.duration, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-card bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-label text-muted">
            Detect trips by
            <select
              className={`${inputClass} appearance-none pr-8`}
              value={mechanism}
              onChange={(e) => setMechanism(e.target.value as DetectionMechanism)}
            >
              {MECHANISMS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <TimeRangePicker value={range} onChange={setRange} maxDays={31} />
          <Button variant="ghost" onClick={() => setAdvanced((a) => !a)}>
            Advanced settings
          </Button>
          <div className="flex-grow" />
          <Button onClick={run}>Run query</Button>
        </div>
        {advanced && (
          <div className="flex flex-wrap items-end gap-3 border-t border-outline pt-3">
            {CONFIG_FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1.5 text-label text-muted">
                {f.label}
                <input
                  type="number"
                  className={`${inputClass} w-40`}
                  value={config[f.key] ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      [f.key]: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
            <Button variant="ghost" onClick={() => setConfig(SEGMENT_DEFAULTS)}>
              Reset to defaults
            </Button>
          </div>
        )}
        {!dailySupported && (
          <p className="text-body-sm text-muted">
            Daily activity is available for ignition, frequency and change-point
            detection.
          </p>
        )}
      </div>

      {dayReq && (
        <div className="flex flex-col gap-4 rounded-card bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-card-title text-ink">Daily activity</span>
            <span className="text-body-sm text-muted">
              {days.isLoading
                ? 'Running…'
                : `${totalTrips} trips · ${fmtDuration(totalSeconds)} driving`}
            </span>
          </div>
          {days.error && (
            <p className="text-body-sm text-negative">{days.error.message}</p>
          )}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, dayRows.length)}, minmax(0, 1fr))`,
            }}
          >
            {dayRows.map((d) => (
              <div key={d.date} className="flex flex-col gap-2">
                <div className="flex h-24 items-end">
                  <div
                    className="w-full rounded-t-md bg-chart-1"
                    style={{
                      height: `${Math.max(4, Math.round((d.segmentCount / maxCount) * 96))}px`,
                    }}
                  />
                </div>
                <span className="text-body-sm font-medium text-ink">
                  {new Date(d.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </span>
                <span className="text-label text-muted">
                  {d.segmentCount} trip{d.segmentCount === 1 ? '' : 's'} ·{' '}
                  {fmtDuration(d.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {segReq && (
        <div className="flex flex-col rounded-card bg-card">
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-card-title text-ink">Trips</span>
            <QueryActions
              request={segReq}
              result={segments.data?.data}
              filename="trips.json"
            />
          </div>
          <div className="grid grid-cols-6 gap-4 border-t border-outline px-5 py-2 text-label text-muted">
            <span>Started ↓</span>
            <span>Ended</span>
            <span className="text-right">Duration</span>
            <span className="text-right">Distance</span>
            <span className="text-right">Top speed</span>
            <span />
          </div>
          {segments.isLoading && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
              Running…
            </p>
          )}
          {segments.error && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-negative">
              {segments.error.message}
            </p>
          )}
          {segRows.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-6 items-center gap-4 border-t border-outline px-5 py-3 text-body-sm text-fg"
            >
              <span>{s.start ? short(s.start.timestamp) : '—'}</span>
              <span>{s.isOngoing || !s.end ? 'Now' : short(s.end.timestamp)}</span>
              <span className="text-right">{fmtDuration(s.duration)}</span>
              <span className="text-right">{distance(s)}</span>
              <span className="text-right">
                {sig(s, 'speed', 'MAX') !== null
                  ? `${Math.round(sig(s, 'speed', 'MAX')!)} km/h`
                  : '—'}
              </span>
              <span className="flex justify-end">
                {s.isOngoing && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-control px-2.5 py-0.5 text-label text-ink">
                    <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]" />
                    In progress
                  </span>
                )}
              </span>
            </div>
          ))}
          {!segments.isLoading && !segments.error && segRows.length === 0 && (
            <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
              No trips in this range.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
```

`SubjectView.tsx`: return `<TripsTab subject={subject} ctx={ctx} />` for `'trips'`.

Run: `npx jest __tests__/unit/pages/vehicles/TripsTab.test.tsx` → PASS. `npm test && npm run lint && npm run compile` → green.

- [ ] **Step 3: Commit**

```bash
git add src/app/vehicles __tests__/unit
git commit -m "feat(vehicles): trips tab with segments and daily activity"
```

---

### Task 10: Documents tab and Sharing panel

**Files:**

- Create: `src/app/vehicles/[tokenId]/components/tabs/DocumentsTab.tsx`, `src/app/vehicles/[tokenId]/components/tabs/SharingPanel.tsx`
- Modify: `src/app/vehicles/[tokenId]/components/SubjectView.tsx` (documents branch), `src/app/vehicles/[tokenId]/components/VehiclePage.tsx` (sharing branch)
- Test: `__tests__/unit/pages/vehicles/DocumentsTab.test.tsx`, `__tests__/unit/pages/vehicles/SharingPanel.test.tsx`

**Interfaces:**

- Consumes: `availableCloudEventTypesQuery`, `latestCloudEventQuery` (Task 2); `documentSharingUrl`, `permissionLabels` (Task 2); `LICENSE_ALIAS` (Task 3); `AccountState` (Task 5).
- Produces: `DocumentsTab({ subject, ctx })`, `SharingPanel({ vehicle, clientId, licenseLabel, accountState })`, `DOCUMENT_TITLES`.

- [ ] **Step 1: Write the failing DocumentsTab test**

`__tests__/unit/pages/vehicles/DocumentsTab.test.tsx`:

```tsx
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

describe('DocumentsTab', () => {
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
```

- [ ] **Step 2: Implement DocumentsTab**

`src/app/vehicles/[tokenId]/components/tabs/DocumentsTab.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { toast } from 'sonner';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
} from '@/services/subjects/queries';
import { documentSharingUrl } from '@/utils/documentSharingUrl';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { relativeTime } from '@/utils/freshness';
import { Button } from '@/components/Button';

export const DOCUMENT_TITLES: Record<string, string> = {
  'dimo.document.driver.license': "Driver's license",
  'dimo.document.driver.insurance': 'Insurance card',
  'dimo.document.driver.id': 'ID card',
  'dimo.document.driver.membership': 'Membership card',
  'dimo.document.driver.other': 'Other document',
};
type Types = {
  availableCloudEventTypes: { type: string; count: number; lastSeen: string }[] | null;
};
type Doc = {
  latestCloudEvent: {
    header: { type: string; time: string };
    data: unknown;
    dataUrl?: string | null;
  } | null;
};

const fields = (data: unknown): [string, string][] =>
  data && typeof data === 'object' && !Array.isArray(data)
    ? Object.entries(data as Record<string, unknown>)
        .filter(
          ([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v),
        )
        .map(([k, v]) => [humanizeSignal(k), v === null ? '—' : String(v)])
    : [];

const DocumentCard: FC<{ type: string; subject: Subject; ctx: SubjectContext }> = ({
  type,
  subject,
  ctx,
}) => {
  const q = useSubjectQuery<Doc>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(subject.did, { type }, true),
  });
  const doc = q.data?.data?.latestCloudEvent;
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-card-title text-ink">
            {DOCUMENT_TITLES[type] ?? humanizeSignal(type.split('.').at(-1) ?? type)}
          </span>
          <span className="font-mono text-code text-muted">{type}</span>
        </span>
        {doc && (
          <span className="whitespace-nowrap text-label text-muted">
            Updated {relativeTime(doc.header.time)}
          </span>
        )}
      </div>
      {q.error && <p className="text-body-sm text-negative">{q.error.message}</p>}
      {doc && (
        <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 md:grid-cols-2">
          {fields(doc.data).map(([k, v]) => (
            <span key={k} className="flex flex-col gap-0.5 border-b border-outline pb-2">
              <span className="text-label text-muted">{k}</span>
              <span className="text-body-sm text-fg">{v}</span>
            </span>
          ))}
          {fields(doc.data).length === 0 && (
            <span className="text-body-sm text-muted">
              No extracted fields; open the raw event.
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        {doc?.dataUrl && (
          <a
            href={doc.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="button secondary"
          >
            Open scan
          </a>
        )}
        <Button variant="ghost" onClick={() => ctx.onBrowseRaw(subject.did)}>
          View raw event
        </Button>
      </div>
    </div>
  );
};

const SharingLinkCard: FC<{ ctx: SubjectContext; title: string; body: string }> = ({
  ctx,
  title,
  body,
}) => (
  <div className="flex flex-col items-start gap-3 rounded-card bg-card p-5 md:flex-row md:items-center md:justify-between">
    <span className="flex flex-col gap-0.5">
      <span className="text-body-sm font-medium text-ink">{title}</span>
      <span className="text-body-sm text-muted">{body}</span>
    </span>
    <Button
      variant="secondary"
      onClick={() => {
        void navigator.clipboard.writeText(
          documentSharingUrl({
            clientId: ctx.clientId,
            redirectUri: ctx.license.firstRedirectURI,
          }),
        );
        toast.success('Sharing link copied');
      }}
    >
      Copy sharing link
    </Button>
  </div>
);

export const DocumentsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.did),
  });
  const docTypes = (types.data?.data?.availableCloudEventTypes ?? [])
    .map((t) => t.type)
    .filter((t) => t.startsWith('dimo.document.'));
  const label = ctx.license.label;

  if (types.error?.code === 'NOT_SHARED') {
    return (
      <SharingLinkCard
        ctx={ctx}
        title={`The owner hasn't shared documents with ${label}`}
        body="Send them this link. It opens the DIMO app and asks them to share their documents with your license."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-body-sm text-muted">
        Documents the owner shared with {label} from the DIMO app. Each one is a cloud
        event on the owner&apos;s account DID, with the extracted fields as data and the
        scan behind a signed link.
      </p>
      {types.error && (
        <p className="px-1 text-body-sm text-negative">{types.error.message}</p>
      )}
      {types.isLoading && <p className="px-1 text-body-sm text-muted">Loading…</p>}
      {!types.isLoading && !types.error && docTypes.length === 0 && (
        <p className="px-1 text-body-sm text-muted">
          The owner hasn&apos;t uploaded any documents yet.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {docTypes.map((t) => (
          <DocumentCard key={t} type={t} subject={subject} ctx={ctx} />
        ))}
      </div>
      <SharingLinkCard
        ctx={ctx}
        title="Need another document?"
        body="Send the owner a link that asks them to share documents with your license. It opens in the DIMO app."
      />
    </div>
  );
};
```

(The `button secondary` classes on the `<a>` are the Button recipe's own classes, valid on an anchor per DESIGN.md.)

`SubjectView.tsx`: return `<DocumentsTab subject={subject} ctx={ctx} />` for `'documents'`.

Run: `npx jest __tests__/unit/pages/vehicles/DocumentsTab.test.tsx` → PASS.

- [ ] **Step 3: Write the failing SharingPanel test**

`__tests__/unit/pages/vehicles/SharingPanel.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
}));
import { useQuery } from '@apollo/client';
import { SharingPanel } from '@/app/vehicles/[tokenId]/components/tabs/SharingPanel';
import type { VehicleDetail } from '@/services/subjects/graph';

// pairs 1,3,4 → Non-location data, Current location, All-time location
const PERMS = '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n)).toString(16);
const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'x', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: {
    nodes: [
      {
        grantee: '0xAAA',
        permissions: PERMS,
        createdAt: '2026-08-02T00:00:00Z',
        expiresAt: '2027-08-02T00:00:00Z',
        source: 'ipfs://bafy1',
      },
      {
        grantee: '0x5b1e000000000000000000000000000000000a09c',
        permissions: '0x3',
        createdAt: '2026-05-02T00:00:00Z',
        expiresAt: '2026-08-02T00:00:00Z',
        source: 'ipfs://bafy2',
      },
    ],
  },
  privileges: {
    nodes: [
      {
        id: 1,
        user: '0xdead',
        setAt: '2025-01-01T00:00:00Z',
        expiresAt: '2027-01-01T00:00:00Z',
      },
    ],
  },
} as unknown as VehicleDetail;

beforeEach(() => {
  (useQuery as jest.Mock).mockImplementation(
    (_doc: unknown, opts: { variables: { clientId: string } }) => ({
      data: {
        developerLicense:
          opts.variables.clientId === '0xAAA'
            ? { alias: 'Fleet Pulse', clientId: '0xAAA' }
            : null,
      },
      loading: false,
    }),
  );
});

describe('SharingPanel', () => {
  it('names apps, decodes permissions, links terms and marks the current license', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="shared"
      />,
    );
    expect(screen.getByText('Fleet Pulse')).toBeInTheDocument();
    expect(screen.getByText('This license')).toBeInTheDocument();
    expect(screen.getByText('Non-location data')).toBeInTheDocument();
    expect(screen.getByText('All-time location')).toBeInTheDocument();
    expect(screen.getByText('0x5b1e…a09c')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View terms' })[0]).toHaveAttribute(
      'href',
      'https://assets.dimo.org/ipfs/bafy1',
    );
    expect(screen.getByText(/Expired/)).toBeInTheDocument();
  });
  it('lists legacy privileges and the owner-account grant state', () => {
    render(
      <SharingPanel
        vehicle={vehicle}
        clientId="0xaaa"
        licenseLabel="Fleet Pulse"
        accountState="not-shared"
      />,
    );
    expect(screen.getByText('Legacy privileges')).toBeInTheDocument();
    expect(screen.getByText('Not shared')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Implement SharingPanel and wire it in**

`src/app/vehicles/[tokenId]/components/tabs/SharingPanel.tsx`:

```tsx
'use client';
import { FC } from 'react';
import { useQuery } from '@apollo/client';
import { LICENSE_ALIAS } from '../../queries';
import type { VehicleDetail } from '@/services/subjects/graph';
import type { AccountState } from '../SourceRail';
import { permissionLabels } from '@/utils/sacdPermissions';
import { shortAddress } from '@/services/subjects/did';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
const termsUrl = (source: string) =>
  `https://assets.dimo.org/ipfs/${source.replace(/^ipfs:\/\//, '')}`;
const COLS =
  'grid-cols-[minmax(0,1.3fr)_minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]';

const Expiry: FC<{ iso: string }> = ({ iso }) => {
  const ms = Date.parse(iso) - Date.now();
  if (ms < 0) return <span className="text-body-sm text-muted">Expired {date(iso)}</span>;
  const days = Math.round(ms / 86_400_000);
  return (
    <span className={days <= 30 ? 'text-body-sm text-warning' : 'text-body-sm text-fg'}>
      {date(iso)}
      {days <= 30 ? ` · in ${days} days` : ''}
    </span>
  );
};

const AppName: FC<{ grantee: string; mine: boolean }> = ({ grantee, mine }) => {
  const { data } = useQuery(LICENSE_ALIAS, {
    variables: { clientId: grantee },
    errorPolicy: 'ignore',
  });
  const alias = data?.developerLicense?.alias;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={
            alias ? 'text-body-sm font-medium text-ink' : 'font-mono text-code text-ink'
          }
        >
          {alias ?? shortAddress(grantee)}
        </span>
        {mine && (
          <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
            This license
          </span>
        )}
      </span>
      <span className="font-mono text-code text-muted">
        {alias ? shortAddress(grantee) : 'No app name registered'}
      </span>
    </span>
  );
};

// Renders for every vehicle, shared with the license or not, so it takes the
// license as plain strings rather than the SubjectContext.
export const SharingPanel: FC<{
  vehicle: VehicleDetail;
  clientId: string;
  licenseLabel: string;
  accountState: AccountState;
}> = ({ vehicle, clientId, licenseLabel, accountState }) => {
  const mine = clientId.toLowerCase();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title text-ink">Sharing</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Apps the owner has granted access to this vehicle. Each grant is a SACD
          permission set recorded on-chain, with its own terms and expiry.
        </p>
      </div>
      <div className="flex flex-col rounded-card bg-card">
        <div className={`grid ${COLS} gap-4 px-5 pb-2 pt-3 text-label text-muted`}>
          <span>App</span>
          <span>Permissions</span>
          <span>Terms</span>
          <span>Granted</span>
          <span>Expires</span>
        </div>
        {vehicle.sacds.nodes.map((s) => (
          <div
            key={`${s.grantee}-${s.createdAt}`}
            className={`grid ${COLS} items-start gap-4 border-t border-outline px-5 py-3.5`}
          >
            <AppName grantee={s.grantee} mine={s.grantee.toLowerCase() === mine} />
            <span className="flex flex-wrap gap-1">
              {permissionLabels(s.permissions).map((p) => (
                <span
                  key={p}
                  className="rounded-chip bg-highest px-2 py-0.5 text-label text-fg"
                >
                  {p}
                </span>
              ))}
            </span>
            <a
              href={termsUrl(s.source)}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-ink underline"
            >
              View terms
            </a>
            <span className="text-body-sm text-fg">{date(s.createdAt)}</span>
            <Expiry iso={s.expiresAt} />
          </div>
        ))}
        {vehicle.sacds.nodes.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            No apps have access to this vehicle.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-card-title text-ink">Owner account</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Document access is a separate grant on the owner&apos;s account DID. Only{' '}
          {licenseLabel}&apos;s own grant can be checked from here.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-card bg-card px-5 py-3.5">
        <span className="text-body-sm font-medium text-ink">
          {licenseLabel} · documents
        </span>
        <span
          className={
            accountState === 'shared' ? 'text-body-sm text-fg' : 'text-body-sm text-muted'
          }
        >
          {accountState === 'shared'
            ? 'Shared'
            : accountState === 'not-shared'
              ? 'Not shared'
              : accountState === 'loading'
                ? 'Checking…'
                : '—'}
        </span>
      </div>

      {vehicle.privileges.nodes.length > 0 && (
        <>
          <h2 className="pt-1 text-card-title text-ink">Legacy privileges</h2>
          <div className="flex flex-col rounded-card bg-card">
            <div className="grid grid-cols-4 gap-4 px-5 pb-2 pt-3 text-label text-muted">
              <span>ID</span>
              <span>User</span>
              <span>Set</span>
              <span>Expires</span>
            </div>
            {vehicle.privileges.nodes.map((p) => (
              <div
                key={`${p.id}-${p.user}`}
                className="grid grid-cols-4 items-center gap-4 border-t border-outline px-5 py-3 text-body-sm text-fg"
              >
                <span>{p.id}</span>
                <span className="font-mono text-code">{shortAddress(p.user)}</span>
                <span>{date(p.setAt)}</span>
                <Expiry iso={p.expiresAt} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

`VehiclePage.tsx`: replace the `selectedKey === 'sharing' ? null` branch with `<SharingPanel vehicle={vehicle} clientId={license?.clientId ?? ''} licenseLabel={license?.label ?? 'your license'} accountState={accountState} />` (import it). `SubjectContext.license` stays required: `SubjectView` only renders when `access === 'ok'`, which implies a license.

Run: `npx jest __tests__/unit/pages/vehicles` → PASS. `npm test && npm run lint && npm run compile` → green. Also extend `VehiclePage.test.tsx` "not-shared" case: click the rail's Sharing button and assert `screen.getByText('Sharing')` heading renders (Review Focus 1).

- [ ] **Step 5: Commit**

```bash
git add src/app/vehicles __tests__/unit
git commit -m "feat(vehicles): documents tab and sharing panel"
```

---

### Task 11: Visual harness and docs

**Files:**

- Create: `scripts/visual/dataApi.mjs`
- Modify: `scripts/visual/fixtures.mjs`, `scripts/visual/shoot.mjs`, `scripts/visual/routes.mjs`, `scripts/visual/README.md`, `docs/DESIGN.md`, `README.md`

**Interfaces:**

- Consumes: the query operation names from Task 2 (`DataSummary`, `AvailableSignals`, `SignalsLatest`, `Signals`, `Events`, `Segments`, `DailyActivity`, `AvailableCloudEventTypes`, `LatestCloudEvent`, `CloudEvents`, `Indexes`, `LatestIndex`, `Freshness`, `LastSeen`, `VehicleSacdForLicense`) and the Identity operations `GetVehicleDetail`, `GetVehicleForLicense`, `GetDeveloperLicenseAlias`.
- Produces: `dataApiHandler(route)` for Playwright, fixtures `VEHICLE_DETAIL`, `DATA_API`, harness routes `vehicles`, `vehicle-summary`, `vehicle-device`, `vehicle-raw`, `vehicle-signals`, `vehicle-trips`, `vehicle-documents`, `vehicle-sharing`, `vehicle-not-shared`.

- [ ] **Step 1: Fixtures**

In `scripts/visual/fixtures.mjs`, extend `vehicle()` and the identity superset:

```js
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
// pairs 1,3,4,7 → Non-location data, Current location, All-time location, Raw data
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
```

In `identityData`, add `vehicle: VEHICLES.find((v) => String(v.tokenId) === String(vars.tokenId)) ?? VEHICLES[0],` beside `vehicles`. (`developerLicense` already resolves by `clientId`; `GetDeveloperLicenseAlias` for an unknown grantee returns `LICENSES[0]` — acceptable for a screenshot, the current-license chip still marks the right row because that is keyed on the clientId.)

Add the data-API fixtures, keyed by operation name:

```js
export const VEHICLE_DID = `did:erc721:80002:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:190231`;
const AT = (minutesAgo) => new Date(Date.parse(NOW) - minutesAgo * 60_000).toISOString();
const header = (type, minutesAgo, producer) => ({
  id: `2mXq8rKf1T${minutesAgo}`,
  source: '0xF26421509Efe92861a587482100c6d728aBf1CD0',
  producer,
  subject: VEHICLE_DID,
  time: AT(minutesAgo),
  type,
  datacontenttype: 'application/json',
  dataschema: '',
  dataversion: 'default/v1.0',
  tags: [],
});
const status = (minutesAgo, producer) => ({
  header: header('dimo.status', minutesAgo, producer),
  data: {
    signals: [
      { name: 'speed', timestamp: AT(minutesAgo), value: 42 },
      { name: 'powertrainCombustionEngineSpeed', timestamp: AT(minutesAgo), value: 1840 },
    ],
  },
});
const AD_DID = DEVICE_AD(190231).tokenDID;
export const DATA_API = {
  DataSummary: {
    dataSummary: {
      numberOfSignals: 1240000,
      availableSignals: [
        'speed',
        'powertrainCombustionEngineSpeed',
        'obdEngineLoad',
        'powertrainFuelSystemRelativeLevel',
        'obdDTCList',
      ],
      firstSeen: '2024-03-04T00:00:00Z',
      lastSeen: AT(2),
      signalDataSummary: [
        {
          name: 'speed',
          numberOfSignals: 412880,
          firstSeen: '2024-03-04T00:00:00Z',
          lastSeen: AT(2),
        },
        {
          name: 'powertrainCombustionEngineSpeed',
          numberOfSignals: 398112,
          firstSeen: '2024-03-04T00:00:00Z',
          lastSeen: AT(2),
        },
        {
          name: 'obdEngineLoad',
          numberOfSignals: 201450,
          firstSeen: '2024-03-04T00:00:00Z',
          lastSeen: AT(2),
        },
        {
          name: 'powertrainFuelSystemRelativeLevel',
          numberOfSignals: 41202,
          firstSeen: '2024-03-04T00:00:00Z',
          lastSeen: AT(120),
        },
        {
          name: 'obdDTCList',
          numberOfSignals: 12,
          firstSeen: '2024-04-19T00:00:00Z',
          lastSeen: AT(14 * 1440),
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
  AvailableSignals: {
    availableSignals: [
      'speed',
      'powertrainCombustionEngineSpeed',
      'obdEngineLoad',
      'powertrainFuelSystemRelativeLevel',
      'obdDTCList',
    ],
  },
  SignalsLatest: {
    signalsLatest: {
      lastSeen: AT(2),
      speed: { timestamp: AT(2), value: 42 },
      powertrainCombustionEngineSpeed: { timestamp: AT(2), value: 1840 },
    },
  },
  LastSeen: { signalsLatest: { lastSeen: AT(2) } },
  Signals: {
    signals: Array.from({ length: 168 }, (_, i) => ({
      timestamp: AT((167 - i) * 60),
      speed: i % 24 === 8 || i % 24 === 17 ? 60 + (i % 7) * 5 : null,
      powertrainCombustionEngineSpeed:
        i % 24 === 8 || i % 24 === 17 ? 1800 + (i % 5) * 100 : null,
    })),
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
  DailyActivity: {
    dailyActivity: [3, 5, 2, 4, 3, 3, 2].map((n, i) => ({
      date: AT((6 - i) * 1440).slice(0, 10),
      segmentCount: n,
      duration: n * 1500,
      signals: [],
      eventCounts: [],
    })),
  },
  AvailableCloudEventTypes: {
    availableCloudEventTypes: [
      {
        type: 'dimo.status',
        count: 900000,
        firstSeen: '2024-03-04T00:00:00Z',
        lastSeen: AT(2),
      },
      {
        type: 'dimo.fingerprint',
        count: 1200,
        firstSeen: '2024-03-04T00:00:00Z',
        lastSeen: AT(3),
      },
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
    ],
  },
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
          : status(2, AD_DID),
  }),
  CloudEvents: {
    cloudEvents: [
      status(2, AD_DID),
      status(3, AD_DID),
      {
        header: header('dimo.fingerprint', 4, AD_DID),
        data: { vin: 'JTMW1RFV8PD000000', protocol: '6' },
      },
      status(33, AD_DID),
      status(63, AD_DID),
      status(93, AD_DID),
    ],
  },
  Indexes: {
    indexes: [
      {
        header: header('dimo.status', 2, AD_DID),
        indexKey: 'cloudevent/190231/dimo.status/1',
      },
    ],
  },
  LatestIndex: {
    latestIndex: {
      header: header('dimo.status', 2, AD_DID),
      indexKey: 'cloudevent/190231/dimo.status/1',
    },
  },
  Freshness: (vars) =>
    Object.fromEntries(
      Object.keys(vars).map((k, i) => [
        `s${i}`,
        {
          header: {
            time: AT(i === 0 ? 2 : i === 1 ? 2 : 180),
            type: 'dimo.status',
            source: '0xF26421509Efe92861a587482100c6d728aBf1CD0',
            producer: AD_DID,
          },
        },
      ]),
    ),
};
```

- [ ] **Step 2: The data-API mock and routes**

`scripts/visual/dataApi.mjs`:

```js
import { DATA_API } from './fixtures.mjs';

// Fulfils /api/data/telemetry and /api/data/fetch from the browser. The
// operation name in the posted query picks the fixture; a function fixture
// gets the variables. notShared: every call answers 403 like the proxy does.
export async function dataApiHandler(route, { notShared = false } = {}) {
  if (notShared) {
    return route.fulfill({
      status: 403,
      json: { error: 'This asset is not shared with the license', code: 'NOT_SHARED' },
    });
  }
  const { query = '', variables = {} } = route.request().postDataJSON() ?? {};
  const name = /^\s*query\s+(\w+)/.exec(query)?.[1];
  const fx = DATA_API[name];
  if (!fx)
    return route.fulfill({
      status: 200,
      json: { errors: [{ message: `harness: no fixture for ${name}` }] },
    });
  return route.fulfill({
    status: 200,
    json: { data: typeof fx === 'function' ? fx(variables) : fx },
  });
}
```

`scripts/visual/shoot.mjs`: replace the `/api/vehicle-signals` route with

```js
await context.route(/\/api\/data\/(telemetry|fetch)/, (r) =>
  dataApiHandler(r, { notShared: route.notShared }),
);
```

and import `{ dataApiHandler } from './dataApi.mjs'`. Delete `VEHICLE_SIGNALS` from `fixtures.mjs`.

`scripts/visual/routes.mjs`: replace the three `explorer*` routes with

```js
  { name: 'vehicles', path: `/vehicles?license=${c}`, ready: 'Model 3' },
  { name: 'vehicle-summary', path: `/vehicles/190231?license=${c}`, ready: 'Available signals' },
  {
    name: 'vehicle-device',
    path: `/vehicles/190231?license=${c}&subject=did:erc721:80002:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:490231`,
    ready: 'Aftermarket device',
  },
  {
    name: 'vehicle-raw',
    path: `/vehicles/190231?license=${c}&tab=raw`,
    ready: 'cloud events',
    click: 'button:has-text("dimo.fingerprint")',
    after: 'JTMW1RFV8PD000000',
  },
  {
    name: 'vehicle-signals',
    path: `/vehicles/190231?license=${c}&tab=signals`,
    ready: 'Add signal',
    click: ['button:has-text("Add signal")', 'label:has-text("Speed") input', 'button:has-text("Run query")'],
    after: 'points',
    viewports: ['desktop'],
  },
  {
    name: 'vehicle-trips',
    path: `/vehicles/190231?license=${c}&tab=trips`,
    ready: 'Detect trips by',
    click: 'button:has-text("Run query")',
    after: 'In progress',
  },
  {
    name: 'vehicle-documents',
    path: `/vehicles/190231?license=${c}&subject=did:ethr:80002:${fx.WALLET}`,
    ready: "Driver's license",
  },
  { name: 'vehicle-sharing', path: `/vehicles/190231?license=${c}&subject=sharing`, ready: 'View terms' },
  {
    name: 'vehicle-not-shared',
    path: `/vehicles/190231?license=${c}`,
    ready: 'No access',
    notShared: true,
  },
```

(`fx` is `import * as fx from './fixtures.mjs'` at the top of `routes.mjs`, or import `WALLET` directly.) Add `notShared: true` to the comment block at the top describing route options.

Run: `npm run visual:dev` in one terminal, then `npm run visual:shoot -- --label=vehicles --only='^vehicle'`. Expected: every shot saved for dark and light, desktop and mobile, `errors.json` empty. Look at each PNG. Fix layout defects in the components (not in the fixtures) before moving on.

- [ ] **Step 3: DESIGN.md, READMEs**

`docs/DESIGN.md`:

- Update the Home grid paragraph (lines ~334–336): the fourth shortcut is "Vehicles" → `/vehicles`.
- Replace each explorer reference (lines ~383, 422, 491, 504–506, 646, 834, 841) with the vehicle page equivalent: the missing-JWT notice is now `AccessNotice`; the meta-and-controls row and the selected-row recipe are the `SourceRail` items (`bg-control shadow-selected`, `aria-current`).
- Add a **Vehicles** subsection under Patterns with these recipes, copied from the components:
  - **Source rail** (`SourceRail.tsx`): `rounded-card bg-card p-2`, group labels `text-label text-muted`, items `rounded-control px-3 py-2.5 hover:bg-control`, selected `bg-control shadow-selected` with `aria-current="true"`, devices nested in `ml-4 border-l border-outline pl-2`. On a phone it is a `SelectWithChevron`.
  - **Freshness dot** (`FreshnessDot.tsx`): the StatusChip dot without the chip; live glows (`shadow-[0_0_8px_var(--accent-soft-strong)]`), stale `bg-warning`, older `bg-negative`, none `bg-muted`; thresholds 1 h / 24 h in `utils/freshness.ts`.
  - **Collapsible section** (`CollapsibleSection.tsx`): section card whose header button toggles the body; chevron rotates 90°; count is a neutral chip; actions sit outside the button.
  - **Raw event row** (`RawDataTab.tsx`): a `button` grid row, expanded = `bg-control`, body is `JsonBlock` (`rounded-control bg-control font-mono text-code`, Prism tokens mapped to `sky`/`accent-ink`/`warning`/`muted`).
  - **Document card** (`DocumentsTab.tsx`): section card, title + type in mono, field grid with hairline rows, `Open scan` as a secondary button anchor.
  - **Chart tokens**: `chart-1…6` are the only series colors; one series per small-multiple chart; grid `outline`, axes `muted`, tooltip on `overlay`.
- In the "Checking" section, add `/vehicles` routes to the harness list.

`scripts/visual/README.md`: replace "explorer" in the route groups with "Vehicles `/vehicles` and the vehicle page (summary, device, raw, signals, trips, documents, sharing, not-shared); `/api/data/*` is mocked by `dataApi.mjs`".

`README.md`: in the features/routes section, replace the Data explorer entry with "Vehicles: per-license vehicle list and a vehicle page with data health, signals, raw cloud events, trips, owner documents and sharing. Reads go through `/api/data/telemetry` and `/api/data/fetch`, which exchange the stored developer JWT for an asset-scoped token; no new env vars."

Run: `npm run lint:format` (Prettier rewrites the docs) and `npm run visual:check -- src/app/vehicles src/components/FreshnessDot src/components/JsonBlock src/components/CollapsibleSection src/components/TimeRangePicker src/components/QueryActions` → no findings.

- [ ] **Step 4: Commit**

```bash
git add scripts/visual docs/DESIGN.md README.md
git commit -m "docs(vehicles): harness routes and fixtures, design recipes, README"
```

---

### Task 12: Final review and pull request

**Files:** none new; fixes land where the reviewers point.

- [ ] **Step 1: Full verification**

Run, in order, and paste the tail of each into the PR body:

```bash
npm test
npm run lint
npm run lint:format
npm run compile
npm run build
npm run visual:shoot -- --label=final --only='^vehicle'
```

- [ ] **Step 2: Manual pass on dev**

With `npm run dev` and a license that has shared vehicles and a stored developer JWT, walk the spec's verification list (1–9) and the MCP cross-checks (`fetch_get_latest_cloud_event`, `vehicle_data_summary`, `list_user_document_types`). Note any mismatch in the PR body.

- [ ] **Step 3: Parallel review**

Dispatch four reviewers over `git diff origin/master...HEAD`, each with one lens, and fix what they confirm:

- **Security**: the proxy (asset validation, header handling, no JWT logging, error bodies), the CSP (`connect-src` already allows `'self'`; nothing new is needed), redirects.
- **Correctness**: query builders vs. the Telemetry and Fetch schemas (`telemetry-api/schema/*.graphqls`, `fetch-api/schema/base.graphqls`), subject graph edge cases, URL state.
- **Design**: every new component against `docs/DESIGN.md` and the screenshots (both themes, both widths); no colors outside the tokens (`npm run visual:check`).
- **Tests**: each Review Focus line has its pinned test; no test asserts on implementation details that a refactor would break.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin console-vehicles
gh pr create --base master --title "feat: Vehicles section replaces the data explorer" --body-file <(cat <<'EOF'
## What

A Vehicles section: `/vehicles` (per-license list with sources and freshness) and `/vehicles/[tokenId]`, a page whose rail lists subjects (the vehicle, each device, the owner's documents, sharing) with Summary, Signals, Raw data, Trips and Documents views scoped to the selected subject. Replaces `/explorer` (redirected).

Spec: `docs/superpowers/specs/2026-09-29-console-vehicles-design.md`. Plan: `docs/superpowers/plans/2026-09-29-console-vehicles.md`. Mockups: https://claude.ai/artifact/VWUXubrShESKQ4ZD1No39G

## How data is read

`POST /api/data/telemetry` and `/api/data/fetch` take `{ asset, query, variables }` with the developer JWT as bearer, exchange it for a token scoped to that asset DID (the license's SACD permissions for a vehicle, `privilege:GetRawData` for an owner account) and proxy the GraphQL. No new secrets or env vars.

## Verification

(paste the command tails from Step 1 and the manual notes from Step 2)
EOF
)
```

Then wait for the Vercel preview check, open the preview's `/vehicles`, and merge with admin rights once green, as with #302.
