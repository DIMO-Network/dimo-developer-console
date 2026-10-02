# Console teams, part 2 (console-api) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give dimo-developer-console-api real teams. That means:

- every `/api/my/*` route answers for the active team and refuses writes from members;
- owners invite people by email with tokens tied to that email;
- each user proves which wallet signs for them;
- a license key registry records who every key belongs to;
- the console's data proxy can ask whether the caller may use a license.

**Architecture:**

- `resolveTeamContext(request)` turns the token's user plus an optional `X-Team-Id` header into `{ user, team, company, role, owner, ownerAddress }`. Every `/api/my/*` route starts from it, and `requireOwner(ctx)` guards writes.
- New services sit beside the existing controllers: team members, invitations, signer proof, the key registry and license access. #80's `identity.service.ts` gains license lookups. Each throws an `ApiError(status, code, message)` that routes turn into `{ message, code }`.
- The retired team routes stay as thin adapters over the new services until the console (part 3) stops calling them.

**Tech Stack:**

- Next.js 14.2 App Router route handlers, TypeScript strict, Sequelize 6 on PostgreSQL.
- viem 2.41.2 for signature recovery and address checksums.
- vitest 3 with a disposable Postgres and a local JWKS for tests.
- GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md` (console repo). **Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md` (console repo), C4, C6 and C7. Executors read both before starting.

**Repository:** `~/workspace/dimo-developer-console-api`. **Branch:** `feat/teams` from `origin/master` after PR #80 (scoped user and team routes) has merged.

## Global Constraints

- Every path, status, error `code`, field name and wire type in contract C7 is used exactly as written. Error bodies are `{ "message": string, "code": string }`.
- The header is `X-Team-Id` (read as `request.headers.get('x-team-id')`). Without it, the caller's own `OWNER` team is active.
- `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me` ignore `X-Team-Id`. They never answer 403 for a stale header, and `GET /api/me` keeps returning the caller's own user, personal team and company.
- Addresses are stored lowercase (`users.signer_address`, `license_signers.signer_address`) and returned checksummed with viem `getAddress`.
- Invite tokens are `randomBytes(32).toString('base64url')`. Only `sha256(token)` as hex is stored. The link is `${config.frontendUrl}sign-in?invite=${token}`. Invites expire after 7 days.
- The signer proof message is contract C6, verbatim. It may be at most 10 minutes old and at most 1 minute in the future.
- All Identity access goes through #80's `src/services/identity.service.ts` (`IDENTITY_API_URL` overrides `config.identityApiUrl`); there is no second client. A known license is cached for 60 seconds per token ID and per lowercase client ID; unknown licenses and failures aren't cached. Tests reach Identity only through `fakeIdentity`.
- Configurations stay authorized by #80's rule: the on-chain owner of the configuration's license, which under teams means the active team owner's wallet. There's no `owner_id` check.
- `viem` is pinned to `2.41.2`, the console's installed version. `vitest` is `^3.2.4`.
- Public routes stay untouched: `/api/configurations`, `/api/brand`, `/api/auth/exist`, `/api/crypto`.
- `POST /api/my/support/email` stays open to members.
- Format only the files you touch, with `npx prettier --write <files>`. **Never** run `npm run lint:format`: it rewrites the whole repo.
- Commit messages use conventional prefixes and **never** include a `Co-Authored-By` trailer or any Claude attribution.
- The migration runs on each database **before** the code that reads its columns is deployed (see Task 14).

## Review Focus

1. **A user who owns a team and is also a member of another.** With no header, the personal team is active, and `GET /api/me` shows the personal company, never the other team's. Covered in Task 4.
2. **Invite email case and whitespace.** Inviting `"  Alice@X.test "` lets the account `alice@x.test` accept. A second invite to `ALICE@x.test` gets 409 `ALREADY_INVITED`. Covered in Task 8.
3. **Re-inviting someone who was removed.** Their revoked row doesn't block a new invite or its acceptance, and the partial unique index allows it. Covered in Task 8.
4. **Invite token reuse.** A token that was already accepted, or used by a different account, gets 400 `INVITE_INVALID` or 403 `INVITE_EMAIL_MISMATCH`, and never a second membership. Covered in Task 8.
5. **Mixed-case addresses.**
   - Registry calls with a checksummed or lowercase path address hit the same row.
   - `license-access` with a lowercase client ID finds an owner whose wallet is stored checksummed.
   - Covered in Tasks 12 and 13.

## File map

| File                                                                | Responsibility                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `vitest.config.mts`, `test/support/*`                               | Test harness: database, tokens, requests, fixtures                                                                             |
| `.github/workflows/ci.yml`                                          | Lint, typecheck and tests on every PR                                                                                          |
| `src/scripts/db/init-db_12.sql`                                     | Migration: membership columns and indexes, user signer, key registry tables                                                    |
| `src/models/teamCollaborator.model.ts` (modify)                     | `OWNER`/`MEMBER`, `PENDING`/`ACCEPTED`/`REVOKED`, invite columns                                                               |
| `src/models/user.model.ts` (modify)                                 | `signer_address`, `signer_verified_at`                                                                                         |
| `src/models/licenseSigner.model.ts`, `licenseSignerHolder.model.ts` | Key registry models and associations                                                                                           |
| `src/types/teams.ts`                                                | C7 wire types                                                                                                                  |
| `src/utils/apiError.ts`                                             | `ApiError` and route error responses                                                                                           |
| `src/services/membership.service.ts`                                | Active-membership queries                                                                                                      |
| `src/services/teamContext.service.ts`                               | `requireUser`, `resolveTeamContext`, `requireOwner`, `companyScope`                                                            |
| `src/services/teamMembers.service.ts`                               | Team summaries, member list, removal                                                                                           |
| `src/services/invitation.service.ts`                                | Create, resend, cancel and accept invites                                                                                      |
| `src/services/signerProof.service.ts`                               | C6 message and verification                                                                                                    |
| `src/services/identity.service.ts`                                  | (from #80) gains `getLicenseByTokenId`, `getLicenseByClientId`, `clearIdentityCache`                                           |
| `src/services/licenseSigner.service.ts`                             | Key registry                                                                                                                   |
| `src/services/licenseAccess.service.ts`                             | Who may use a license                                                                                                          |
| `src/app/api/my/**` (modify)                                        | Team context and owner-only writes                                                                                             |
| New routes                                                          | `teams`, `team/members`, `team/invitations`, `invitations/accept`, `me/signer`, `licenses/[tokenId]/signers`, `license-access` |

---

### Task 1: Test harness, CI and a smoke test

**Files:**

- Create: `vitest.config.mts`
- Create: `test/support/testDatabase.ts`, `test/support/globalSetup.ts`, `test/support/setup.ts`, `test/support/auth.ts`, `test/support/http.ts`, `test/support/db.ts`, `test/support/fixtures.ts`, `test/support/identity.ts`
- Create: `test/api/harness.test.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (scripts, `viem`, `vitest`)

**Interfaces:**

- Produces:
  - `request(method: string, path: string, options?: { as?: string; teamId?: string; body?: unknown; rawBody?: string }): Promise<NextRequest>`, where `as` is the wallet the bearer token is minted for;
  - `read(response: Response): Promise<{ status: number; body: any }>`;
  - `tokenFor(address: string): Promise<string>`;
  - `sql<T>(query: string, replacements?: Record<string, unknown>): Promise<T[]>`;
  - `runSql(text: string): Promise<void>`;
  - `newWallet()` (a viem `PrivateKeyAccount`);
  - `createUser(overrides?)`;
  - `createOwner(label?)`, returning `{ user, company, team, membership }`;
  - `fakeIdentity(licenses: { tokenId: number; clientId: string; owner: string }[], options?: { status?: number })`, which stubs global `fetch` (the only way `@/services/identity.service` reaches Identity) and returns the mock;
  - `newClientId()`: a fresh 42-character client ID. #80's owner cache lives for 60 seconds inside one test file, so every test uses its own licenses.
- Mocks applied to every test file: `@/utils/mailer` (`sendMail` resolves) and `@/controllers/lead.controller` (`createTwentyLead` resolves). Global stubs (`fetch`) are undone after each test.

- [ ] **Step 1: Create the branch and install the tools**

```bash
cd ~/workspace/dimo-developer-console-api
git fetch origin
git switch -c feat/teams origin/master
test ! -e "src/app/api/user/[id]/route.ts" && echo "PR #80 is in master"
npm install --save-exact viem@2.41.2
npm install --save-dev vitest@^3.2.4
```

Expected: `PR #80 is in master`, and both installs finish without errors. If the `test` line prints nothing, stop: #80 hasn't merged yet.

- [ ] **Step 2: Start a local Postgres for tests**

Pick one option. Option A uses Homebrew Postgres on port 55432 with Unix sockets off, because the default socket path in a long temp directory is too long:

```bash
initdb -D /tmp/console-api-test-pg -U admin --auth=trust
pg_ctl -D /tmp/console-api-test-pg -o "-p 55432 -k '' -c listen_addresses=127.0.0.1" -l /tmp/console-api-test-pg.log start
```

Option B uses docker:

```bash
docker run -d --name console-api-test-pg -e POSTGRES_USER=admin -e POSTGRES_HOST_AUTH_METHOD=trust -p 55432:5432 postgres:16
```

Expected: `pg_isready -h 127.0.0.1 -p 55432` prints `accepting connections`. The test run creates and rebuilds the `console_api_test` database itself. Point it elsewhere with `TEST_PG_URL`.

- [ ] **Step 3: Add the scripts to `package.json`**

In `"scripts"`, add after `"lint:format"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Write the vitest config and the database location**

`test/support/testDatabase.ts`:

```ts
// The disposable database the test run rebuilds from src/scripts/db/init-db_*.sql.
export const TEST_DATABASE_URL =
  process.env.TEST_PG_URL ?? 'postgres://admin@127.0.0.1:55432/console_api_test';
```

`vitest.config.mts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './test/support/testDatabase';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/support/globalSetup.ts'],
    setupFiles: ['test/support/setup.ts'],
    // Every file shares one database, truncated before each test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      PG_URL: TEST_DATABASE_URL,
      JWT_ISSUER: 'http://console-api.test',
      VERCEL_ENV: 'development',
      TWENTY_API_URL: 'http://127.0.0.1:9',
      TWENTY_API_KEY: 'test',
      DEVELOPER_SUPPORT_EMAIL: 'support@x.test',
      // Identity is always faked (test/support/identity.ts); an unfaked call fails fast.
      IDENTITY_API_URL: 'http://identity.test/query',
    },
  },
});
```

- [ ] **Step 5: Write the global setup that rebuilds the database**

`test/support/globalSetup.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

import { TEST_DATABASE_URL } from './testDatabase';

const SCRIPTS_DIR = fileURLToPath(new URL('../../src/scripts/db/', import.meta.url));

// init-db_08 creates configurations.client_id as VARCHAR(36), too short for a
// 42-character client ID. Production was widened by hand; match it here. Widens
// only a column still shorter than 42, so it never narrows anything.
export const WIDEN_CONFIGURATION_CLIENT_ID = `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'configurations'
      AND column_name = 'client_id'
      AND character_maximum_length < 42
  ) THEN
    ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(100);
  END IF;
END $$;`;

export const migrationFiles = () =>
  readdirSync(SCRIPTS_DIR)
    .filter((file) => /^init-db_\d+\.sql$/.test(file))
    .sort();

// Drop and recreate the test database, then apply every init script in order,
// the way docker-compose initialises a fresh local database.
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  for (const file of migrationFiles()) {
    await db.query(readFileSync(path.join(SCRIPTS_DIR, file), 'utf8'));
  }
  await db.query(WIDEN_CONFIGURATION_CLIENT_ID);
  await db.end();
}
```

- [ ] **Step 6: Write the local JWKS and token minter**

`test/support/auth.ts`:

```ts
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const KEY_ID = 'console-api-test';
let server: http.Server | undefined;
let privateKey: CryptoKey | undefined;

// Serves a key set at JWT_KEY_SET_URL so src/utils/auth.ts verifies test tokens
// exactly as it verifies DIMO tokens in production.
export const startAuthServer = async () => {
  const keys = await generateKeyPair('RS256', { extractable: true });
  privateKey = keys.privateKey;
  const jwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: KEY_ID,
    alg: 'RS256',
    use: 'sig',
  };
  server = http.createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  process.env.JWT_KEY_SET_URL = `http://127.0.0.1:${port}/keys`;
};

export const stopAuthServer = async () => {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
};

/** A DIMO-shaped access token for `address`, signed by the test key set. */
export const tokenFor = async (address: string) => {
  if (!privateKey) throw new Error('startAuthServer() has not run');
  return new SignJWT({ ethereum_address: address })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuer(process.env.JWT_ISSUER!)
    .setSubject(address)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
};
```

- [ ] **Step 7: Write the request, SQL and fixture helpers**

`test/support/http.ts`:

```ts
import { NextRequest } from 'next/server';

import { tokenFor } from './auth';

export interface RequestOptions {
  /** Wallet the bearer token is minted for. Omit for an anonymous request. */
  as?: string;
  /** Sent as X-Team-Id. */
  teamId?: string;
  body?: unknown;
  rawBody?: string;
}

export const request = async (
  method: string,
  path: string,
  options: RequestOptions = {},
) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.as) headers.set('Authorization', `Bearer ${await tokenFor(options.as)}`);
  if (options.teamId) headers.set('X-Team-Id', options.teamId);
  const body =
    options.rawBody ??
    (options.body === undefined ? undefined : JSON.stringify(options.body));
  return new NextRequest(new URL(path, 'http://localhost:3001'), {
    method,
    headers,
    body,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const read = async (
  response: Response,
): Promise<{ status: number; body: any }> => ({
  status: response.status,
  body: response.status === 204 ? null : await response.json(),
});
```

`test/support/db.ts`:

```ts
import { Client } from 'pg';

import DB from '@/services/db';

/** One statement through the app's Sequelize connection, with :named replacements. */
export const sql = async <T = Record<string, unknown>>(
  query: string,
  replacements: Record<string, unknown> = {},
) => {
  const [rows] = await DB.connection!.query(query, { replacements });
  return rows as T[];
};

/** A whole SQL file (several statements) through a plain pg client. */
export const runSql = async (text: string) => {
  const client = new Client({ connectionString: process.env.PG_URL });
  await client.connect();
  try {
    await client.query(text);
  } finally {
    await client.end();
  }
};
```

`test/support/fixtures.ts`:

```ts
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { Company } from '@/models/company.model';
import { Team } from '@/models/team.model';
import { TeamCollaborator } from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';

let sequence = 0;

/** A fresh EOA. Its `.address` also stands in for a kernel account address. */
export const newWallet = () => privateKeyToAccount(generatePrivateKey());

export const createUser = async (
  overrides: { name?: string; email?: string; address?: string } = {},
) => {
  sequence += 1;
  const email = overrides.email ?? `user${sequence}@x.test`;
  return User.create({
    name: overrides.name ?? `User ${sequence}`,
    email,
    address: overrides.address ?? newWallet().address,
    auth: 'credentials',
    auth_login: email,
    role: 'owner',
  });
};

/** A user who finished sign-up: their company, personal team and OWNER membership. */
export const createOwner = async (label = 'Acme') => {
  const user = await createUser({ name: `${label} Owner` });
  const company = await Company.create({
    name: `${label} Co`,
    website: '',
    region: 'North America',
    type: 'startup',
    build_for: 'fleet',
    created_by: user.id!,
  });
  const team = await Team.create({
    name: `${label} Co`,
    company_id: company.id!,
    created_by: user.id!,
  });
  const membership = await TeamCollaborator.create({
    team_id: team.id!,
    user_id: user.id!,
    role: 'OWNER',
    status: 'ACCEPTED',
  });
  return { user, company, team, membership };
};
```

`test/support/identity.ts`:

```ts
import { vi } from 'vitest';

import { newWallet } from './fixtures';

export interface FakeLicense {
  tokenId: number;
  clientId: string;
  owner: string;
}

/**
 * Stands in for the Identity API. Every fetch the app makes is answered as the
 * developerLicense query, looked up by `variables.clientId` (case-insensitive)
 * or `variables.tokenId`. `status` other than 200 simulates an outage.
 */
export const fakeIdentity = (
  licenses: FakeLicense[],
  options: { status?: number } = {},
) => {
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if (options.status && options.status !== 200) {
      return new Response(JSON.stringify({ message: 'unavailable' }), {
        status: options.status,
      });
    }
    const { variables } = JSON.parse(String(init?.body ?? '{}')) as {
      variables?: { clientId?: string; tokenId?: number };
    };
    const license = licenses.find((candidate) =>
      variables?.clientId !== undefined
        ? candidate.clientId.toLowerCase() === variables.clientId.toLowerCase()
        : candidate.tokenId === variables?.tokenId,
    );
    const body = license
      ? { data: { developerLicense: license } }
      : { data: null, errors: [{ message: 'no developer license' }] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** A client ID no earlier test has used, so Identity's owner cache can't carry over. */
export const newClientId = () => newWallet().address;
```

- [ ] **Step 8: Write the per-file setup (mocks, auth server, truncation)**

`test/support/setup.ts`:

```ts
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import DB from '@/services/db';
import { startAuthServer, stopAuthServer } from './auth';

// No real email, no CRM calls.
vi.mock('@/utils/mailer', () => ({
  default: { sendMail: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/controllers/lead.controller', () => ({
  createTwentyLead: vi.fn().mockResolvedValue(undefined),
  safeErr: (error: unknown) => error,
}));

beforeAll(async () => {
  await startAuthServer();
});

beforeEach(async () => {
  vi.clearAllMocks();
  const [rows] = await DB.connection!.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
  );
  const tables = (rows as { tablename: string }[]).map(
    ({ tablename }) => `"${tablename}"`,
  );
  if (tables.length) {
    await DB.connection!.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
  }
});

afterEach(() => {
  // Undo vi.spyOn stubs and stubbed globals (fetch, for Identity).
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await stopAuthServer();
  await DB.connection?.close();
});
```

- [ ] **Step 9: Write the smoke test**

`test/api/harness.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { GET as getMe } from '@/app/api/me/route';
import { Configuration } from '@/models/configuration.model';
import { createOwner } from '../support/fixtures';
import { read, request } from '../support/http';
import { newClientId } from '../support/identity';

describe('test harness', () => {
  it('verifies a token minted for a user wallet and reads their team from the database', async () => {
    const { user, team } = await createOwner('Harness');

    const response = await read(
      await getMe(await request('GET', '/api/me', { as: user.address! })),
    );

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(user.email);
    expect(response.body.team.id).toBe(team.id);
  });

  it('answers an anonymous /api/me with an empty object', async () => {
    const response = await read(await getMe(await request('GET', '/api/me')));

    expect(response).toEqual({ status: 200, body: {} });
  });

  it('stores a configuration under a 42-character client ID, as production does', async () => {
    const { user } = await createOwner('Wide');
    const clientId = newClientId();

    const configuration = await Configuration.create({
      owner_id: user.id!,
      client_id: clientId,
      configuration_name: 'Main',
      configuration: {},
    });

    await configuration.reload();
    expect(configuration.client_id).toBe(clientId);
    expect(clientId).toHaveLength(42);
  });
});
```

- [ ] **Step 10: Run the smoke test**

Run: `npm test -- test/api/harness.test.ts`
Expected: `3 passed`. Without the `WIDEN_CONFIGURATION_CLIENT_ID` step, the third test fails with `value too long for type character varying(36)`. If it fails with `ECONNREFUSED 127.0.0.1:55432`, Postgres from step 2 isn't running.

- [ ] **Step 11: Add CI**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [master]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: admin
          POSTGRES_PASSWORD: admin
          POSTGRES_DB: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U admin"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      TEST_PG_URL: postgres://admin:admin@127.0.0.1:5432/console_api_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

- [ ] **Step 12: Typecheck, lint and commit**

Run: `npm run typecheck && npm run lint`
Expected: typecheck exits 0, and lint reports warnings only (no `Error:` lines).

```bash
npx prettier --write vitest.config.mts test .github/workflows/ci.yml package.json
git add vitest.config.mts test .github/workflows/ci.yml package.json package-lock.json
git commit -m "test: add a vitest harness with a disposable Postgres, local JWKS and CI"
```

---

### Task 2: Pin the #80 security fixes with regression tests

PR #80 had no tests. Its fixes are verified by hand and already in `master`, so these tests pass on the first run. They exist so later tasks can't reopen the holes. They cover all three parts of #80:

- scoped user routes and the `/api/me/complete` takeover;
- configurations limited to the license owner (via `@/services/identity.service`);
- collaborator removal limited to the caller's own team.

**Files:**

- Create: `test/api/regressions-80.test.ts`

**Interfaces:**

- Consumes (Task 1): `request`, `read`, `sql`, `createUser`, `createOwner`, `newWallet`, `fakeIdentity`, `newClientId`.
- Consumes (#80): `getLicenseOwner` and `isLicenseOwner` in `src/services/identity.service.ts`; `removeMyCollaboratorById` in `src/controllers/teamCollaborator.controller.ts`.

- [ ] **Step 1: Write the tests**

`test/api/regressions-80.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GET as getPublicConfiguration } from '@/app/api/configurations/[id]/route';
import { GET as getMe, PUT as updateMe } from '@/app/api/me/route';
import { PUT as completeMe } from '@/app/api/me/complete/route';
import {
  DELETE as deleteConfiguration,
  GET as getConfiguration,
  PUT as putConfiguration,
} from '@/app/api/my/configurations/[id]/route';
import {
  GET as listConfigurations,
  POST as createConfiguration,
} from '@/app/api/my/configurations/route';
import { DELETE as deleteCollaborator } from '@/app/api/my/team/collaborator/[id]/route';
import { POST as createUserRoute } from '@/app/api/user/route';
import { sql } from '../support/db';
import { createOwner, createUser, newWallet } from '../support/fixtures';
import { read, request } from '../support/http';
import { fakeIdentity, newClientId } from '../support/identity';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  address: string | null;
};

const userByEmail = async (email: string) =>
  (await sql<UserRow>('SELECT * FROM users WHERE email = :email', { email }))[0];

const insertLegacyUser = (email: string, address: string | null) =>
  sql(
    `INSERT INTO users (id, name, email, auth, auth_login, role, address, created_at, updated_at)
     VALUES (gen_random_uuid()::text, 'Legacy', :email, 'github', 'legacy', 'owner', :address, now(), now())`,
    { email, address },
  );

const company = {
  name: 'Acme',
  type: 'startup',
  region: 'North America',
  build_for: 'fleet',
};

describe('PR #80 regressions', () => {
  it('still signs up: creates the account, then the company and the owner team', async () => {
    const wallet = newWallet().address;
    const created = await createUserRoute(
      await request('POST', '/api/user', {
        as: wallet,
        body: {
          name: 'New',
          email: 'new@x.test',
          auth: 'credentials',
          auth_login: 'new@x.test',
        },
      }),
    );
    expect(created.status).toBe(200);

    const completed = await read(
      await completeMe(
        await request('PUT', '/api/me/complete', {
          as: wallet,
          body: { email: 'new@x.test', name: 'New Person', company },
        }),
      ),
    );
    expect(completed.status).toBe(200);
    expect(completed.body.role).toBe('OWNER');
    expect(completed.body.company.name).toBe('Acme');
  });

  it('POST /api/user takes the wallet from the token and ignores role and address in the body', async () => {
    const wallet = newWallet().address;
    const response = await createUserRoute(
      await request('POST', '/api/user', {
        as: wallet,
        body: {
          name: 'Forger',
          email: 'forger@x.test',
          address: '0x9999999999999999999999999999999999999999',
          role: 'COLLABORATOR',
          auth: 'credentials',
          auth_login: 'forger@x.test',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await userByEmail('forger@x.test')).toMatchObject({
      address: wallet,
      role: 'owner',
    });
  });

  it('POST /api/user refuses a second account for the same wallet', async () => {
    const wallet = newWallet().address;
    const body = (email: string) => ({
      name: 'D',
      email,
      auth: 'credentials',
      auth_login: 'd',
    });
    await createUserRoute(
      await request('POST', '/api/user', { as: wallet, body: body('d1@x.test') }),
    );

    const again = await createUserRoute(
      await request('POST', '/api/user', { as: wallet, body: body('d2@x.test') }),
    );

    expect(again.status).toBe(409);
    const rows = await sql<{ count: string }>(
      'SELECT count(*) FROM users WHERE address = :wallet',
      { wallet },
    );
    expect(rows[0].count).toBe('1');
  });

  it('POST /api/user without a token is rejected', async () => {
    const response = await createUserRoute(
      await request('POST', '/api/user', {
        body: { name: 'x', email: 'anon@x.test', auth: 'credentials', auth_login: 'x' },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('PUT /api/me changes the name and ignores role, address and email', async () => {
    const user = await createUser();
    const response = await updateMe(
      await request('PUT', '/api/me', {
        as: user.address!,
        body: {
          name: 'Renamed',
          role: 'COLLABORATOR',
          address: '0x7777777777777777777777777777777777777777',
          email: 'stolen@x.test',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await userByEmail(user.email)).toMatchObject({
      name: 'Renamed',
      role: 'owner',
      address: user.address,
    });
  });

  it('PUT /api/me/complete never takes an address from the body', async () => {
    const user = await createUser();
    const response = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: user.address!,
        body: {
          email: user.email,
          address: '0x9999999999999999999999999999999999999999',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect((await userByEmail(user.email)).address).toBe(user.address);
  });

  it('PUT /api/me/complete refuses another wallet that names an existing account by email', async () => {
    const victim = await createUser({ email: 'victim@x.test' });
    const attacker = newWallet().address;

    const takeover = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: attacker,
        body: { email: 'victim@x.test', address: attacker, name: 'owned' },
      }),
    );

    expect(takeover.status).toBe(409);
    expect(await userByEmail('victim@x.test')).toMatchObject({
      address: victim.address,
      name: victim.name,
    });
    const asAttacker = await getMe(await request('GET', '/api/me', { as: attacker }));
    expect(asAttacker.status).toBe(404);
  });

  it('PUT /api/me/complete links an account that has no wallet yet', async () => {
    await insertLegacyUser('legacy-null@x.test', null);
    const wallet = newWallet().address;

    const response = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: wallet,
        body: { email: 'legacy-null@x.test', address: wallet },
      }),
    );

    expect(response.status).toBe(200);
    expect((await userByEmail('legacy-null@x.test')).address).toBe(wallet);
  });

  it('PUT /api/me/complete relinks the same wallet stored in another letter case', async () => {
    const wallet = newWallet().address;
    await insertLegacyUser('legacy-case@x.test', wallet.toLowerCase());

    const response = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: wallet,
        body: { email: 'legacy-case@x.test', address: wallet },
      }),
    );

    expect(response.status).toBe(200);
    expect((await userByEmail('legacy-case@x.test')).address).toBe(wallet);
  });

  it('PUT /api/me/complete refuses to rebind an account tied to a different wallet', async () => {
    const original = newWallet().address;
    await insertLegacyUser('legacy-other@x.test', original);

    const response = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: newWallet().address,
        body: { email: 'legacy-other@x.test' },
      }),
    );

    expect(response.status).toBe(409);
    expect((await userByEmail('legacy-other@x.test')).address).toBe(original);
  });

  it('PUT /api/me/complete answers 404 when the wallet has no account and the email matches none', async () => {
    const response = await completeMe(
      await request('PUT', '/api/me/complete', {
        as: newWallet().address,
        body: { email: 'nobody@x.test' },
      }),
    );

    expect(response.status).toBe(404);
  });

  it('keeps the unscoped user and team routes deleted', () => {
    for (const route of [
      'src/app/api/user/[id]/route.ts',
      'src/app/api/team/route.ts',
      'src/app/api/team/[id]/route.ts',
      'src/app/api/team/collaborator/route.ts',
      'src/app/api/team/collaborator/[id]/route.ts',
    ]) {
      expect(existsSync(route), route).toBe(false);
    }
  });
});

describe('PR #80 regressions: configurations belong to the license owner', () => {
  const setup = async () => {
    const owner = await createUser();
    const other = await createUser();
    const clientId = newClientId();
    fakeIdentity([{ tokenId: 1, clientId, owner: owner.address! }]);
    return { owner, other, clientId };
  };

  const create = async (as: string, clientId: string) =>
    read(
      await createConfiguration(
        await request('POST', '/api/my/configurations', {
          as,
          body: {
            client_id: clientId,
            configuration_name: 'Main',
            configuration: { a: 1 },
          },
        }),
      ),
    );

  it('lets the owner create, list, read, update and delete', async () => {
    const { owner, clientId } = await setup();
    const as = owner.address!;

    const created = await create(as, clientId);
    expect(created.status).toBe(201);
    const params = { params: { id: created.body.id } };

    const listed = await read(
      await listConfigurations(
        await request('GET', `/api/my/configurations?clientId=${clientId}`, { as }),
      ),
    );
    expect(listed.body.map((row: { id: string }) => row.id)).toEqual([created.body.id]);
    expect(
      (await getConfiguration(await request('GET', '/x', { as }), params)).status,
    ).toBe(200);
    expect(
      (
        await putConfiguration(
          await request('PUT', '/x', {
            as,
            body: { configuration_name: 'Renamed', configuration: { a: 2 } },
          }),
          params,
        )
      ).status,
    ).toBe(204);
    expect(
      (await deleteConfiguration(await request('DELETE', '/x', { as }), params)).status,
    ).toBe(204);
  });

  it("answers 404 to another user's read, update, delete and list, and 403 to their create", async () => {
    const { owner, other, clientId } = await setup();
    const created = await create(owner.address!, clientId);
    const params = { params: { id: created.body.id } };
    const as = other.address!;

    expect(
      (await getConfiguration(await request('GET', '/x', { as }), params)).status,
    ).toBe(404);
    expect(
      (
        await putConfiguration(
          await request('PUT', '/x', {
            as,
            body: { configuration_name: 'Hijacked', configuration: {} },
          }),
          params,
        )
      ).status,
    ).toBe(404);
    expect(
      (await deleteConfiguration(await request('DELETE', '/x', { as }), params)).status,
    ).toBe(404);
    expect(
      (
        await listConfigurations(
          await request('GET', `/api/my/configurations?clientId=${clientId}`, { as }),
        )
      ).status,
    ).toBe(404);
    expect(await create(as, clientId)).toEqual({
      status: 403,
      body: { error: 'You do not own this license' },
    });

    const [row] = await sql<{ configuration_name: string }>(
      'SELECT configuration_name FROM configurations WHERE id = :id',
      { id: created.body.id },
    );
    expect(row.configuration_name).toBe('Main');
  });

  it('keeps the public GET /api/configurations/:id open without a token', async () => {
    const { owner, clientId } = await setup();
    const created = await create(owner.address!, clientId);

    const response = await getPublicConfiguration(
      await request('GET', `/api/configurations/${created.body.id}`),
      { params: { id: created.body.id } },
    );

    expect(response.status).toBe(200);
  });

  it('answers 502 when Identity fails', async () => {
    const owner = await createUser();
    fakeIdentity([], { status: 500 });

    expect(await create(owner.address!, newClientId())).toEqual({
      status: 502,
      body: { error: 'Could not verify license ownership' },
    });
  });
});

describe("PR #80 regressions: collaborator removal stays inside the owner's team", () => {
  // Raw rows, as the old collaborator flow wrote them.
  const addCollaborator = async (
    teamId: string,
    userId: string,
    role = 'COLLABORATOR',
  ) => {
    const [row] = await sql<{ id: string }>(
      `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted)
       VALUES (gen_random_uuid()::text, :teamId, :userId, :role, 'ACCEPTED', now(), now(), false)
       RETURNING id`,
      { teamId, userId, role },
    );
    return row.id;
  };
  const remove = async (as: string, id: string) =>
    read(
      await deleteCollaborator(await request('DELETE', '/x', { as }), { params: { id } }),
    );
  const isDeleted = async (id: string) =>
    (
      await sql<{ deleted: boolean }>(
        'SELECT deleted FROM team_collaborators WHERE id = :id',
        { id },
      )
    )[0].deleted;

  it('refuses a row of another team and keeps it', async () => {
    const acme = await createOwner('Acme');
    const other = await createOwner('Other');
    const victim = await addCollaborator(other.team.id!, (await createUser()).id!);

    expect(await remove(acme.user.address!, victim)).toEqual({
      status: 400,
      body: { message: 'Collaborator not found' },
    });
    expect(await isDeleted(victim)).toBe(false);
  });

  it('refuses the only owner removing themselves', async () => {
    const acme = await createOwner('Acme');

    expect(await remove(acme.user.address!, acme.membership.id!)).toEqual({
      status: 400,
      body: { message: 'Cannot remove the only administrator from the group.' },
    });
    expect(await isDeleted(acme.membership.id!)).toBe(false);
  });

  it("removes a collaborator of the owner's own team", async () => {
    const acme = await createOwner('Acme');
    const collaborator = await addCollaborator(acme.team.id!, (await createUser()).id!);

    expect(await remove(acme.user.address!, collaborator)).toEqual({
      status: 200,
      body: { message: 'The collaborator has been removed' },
    });
    expect(await isDeleted(collaborator)).toBe(true);
  });
});
```

- [ ] **Step 2: Run them**

Run: `npm test -- test/api/regressions-80.test.ts`
Expected: `19 passed`.

- [ ] **Step 3: Commit**

```bash
npx prettier --write test/api/regressions-80.test.ts
git add test/api/regressions-80.test.ts
git commit -m "test: pin the scoped user routes and the /api/me/complete takeover fix"
```

- [ ] **Step 4: Prove the tests detect the holes**

This is a one-off check in a throwaway worktree. It runs the same tests against the code from just before #80.

```bash
PRE80="$(git log --format=%H -1 --grep='stop any signed-in user' origin/master)~1"
git worktree add --detach /tmp/console-api-pre80 "$PRE80"
cp -R test vitest.config.mts /tmp/console-api-pre80/
ln -s "$PWD/node_modules" /tmp/console-api-pre80/node_modules
(cd /tmp/console-api-pre80 && npx vitest run test/api/regressions-80.test.ts)
git worktree remove --force /tmp/console-api-pre80
```

Expected: in the pre-#80 worktree, at least these FAIL:

- the forged-role, PUT /api/me, takeover and deleted-routes tests;
- the other user's configuration read, update, delete, list and create;
- the cross-team collaborator removal.

The worktree is then removed, and the branch is untouched.

---

### Task 3: Migration, models, wire types and `ApiError`

**Files:**

- Create: `src/scripts/db/init-db_12.sql`
- Modify: `src/models/teamCollaborator.model.ts` (whole file below)
- Modify: `src/models/user.model.ts` (two columns)
- Create: `src/models/licenseSigner.model.ts`, `src/models/licenseSignerHolder.model.ts`
- Create: `src/types/teams.ts`, `src/utils/apiError.ts`
- Modify: `test/support/fixtures.ts` (append `addMember`)
- Test: `test/db/migration-12.test.ts`, `test/models/team-models.test.ts`

**Interfaces:**

- Produces:
  - `TeamRoles { OWNER = 'OWNER', MEMBER = 'MEMBER' }` and `InvitationStatuses { PENDING, ACCEPTED, REVOKED }` from `@/models/teamCollaborator.model`.
  - `TeamCollaborator` gains `invite_token_hash`, `invite_expires_at`, `invited_by`, and the include accessors `User` and `Team`.
  - `User` gains `signer_address?: string | null` and `signer_verified_at?: Date | null`.
  - `LicenseSigner` (`team_id`, `license_token_id: number`, `signer_address`, `kind`, `note`, `created_by`, `disabled_by`, `disabled_at`, include alias `holders`) and `SignerKinds`.
  - `LicenseSignerHolder` (`signer_id`, `user_id`, `name`, include accessor `User`).
  - `@/types/teams`: `TeamRole`, `MembershipStatus`, `TeamSummary`, `TeamMember`, `SignerKind`, `LicenseSignerHolder`, `LicenseSignerRecord`, `HolderInput`, `LicenseAccess`.
  - `@/utils/apiError`: `ApiError(status, code, message)`, `apiErrorResponse(error): Response | null`, `errorResponse(error, step): Response` (500 fallback), `legacyErrorResponse(error, step): Response` (400 fallback with `{ message }`, as the existing routes do).
  - Fixture: `addMember(teamId: string, user: User): Promise<TeamCollaborator>`.

- [ ] **Step 1: Write the failing migration test**

`test/db/migration-12.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { runSql, sql } from '../support/db';
import { createOwner, createUser } from '../support/fixtures';

const MIGRATION = readFileSync(
  new URL('../../src/scripts/db/init-db_12.sql', import.meta.url),
  'utf8',
);

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe('init-db_12.sql', () => {
  it('can run again on a database that already has it', async () => {
    await runSql(MIGRATION);
    await runSql(MIGRATION);

    const indexes = await sql<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE indexname IN
        ('idx_team_collaborators_member', 'idx_team_collaborators_pending_email',
         'idx_team_collaborators_invite_token', 'idx_license_signers_license_signer')
       ORDER BY indexname`,
    );
    expect(indexes.map((row) => row.indexname)).toEqual([
      'idx_license_signers_license_signer',
      'idx_team_collaborators_invite_token',
      'idx_team_collaborators_member',
      'idx_team_collaborators_pending_email',
    ]);
  });

  it('renames collaborators to members and keeps one active row per duplicate', async () => {
    const { team } = await createOwner('Dupes');
    const person = await createUser();
    await runSql(
      'DROP INDEX IF EXISTS idx_team_collaborators_member; DROP INDEX IF EXISTS idx_team_collaborators_pending_email;',
    );
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, email, role, status, created_at, updated_at, deleted) VALUES
        (:a, :team, :person, NULL, 'COLLABORATOR', 'ACCEPTED', now() - interval '2 days', now(), false),
        (:b, :team, :person, NULL, 'COLLABORATOR', 'ACCEPTED', now() - interval '1 day', now(), false),
        (:c, :team, NULL, 'Pat@x.test', 'COLLABORATOR', 'PENDING', now() - interval '2 days', now(), false),
        (:d, :team, NULL, 'pat@x.test', 'COLLABORATOR', 'SENT', now() - interval '1 day', now(), false)`,
      { a: id(1), b: id(2), c: id(3), d: id(4), team: team.id, person: person.id },
    );

    await runSql(MIGRATION);

    const rows = await sql<{
      id: string;
      role: string;
      status: string;
      deleted: boolean;
    }>(
      `SELECT id, role, status, deleted FROM team_collaborators WHERE id LIKE '00000000-%' ORDER BY id`,
    );
    expect(rows).toEqual([
      // The earliest accepted row survives…
      { id: id(1), role: 'MEMBER', status: 'ACCEPTED', deleted: false },
      { id: id(2), role: 'MEMBER', status: 'ACCEPTED', deleted: true },
      // …and the newest pending invite per email, regardless of case.
      { id: id(3), role: 'MEMBER', status: 'PENDING', deleted: true },
      { id: id(4), role: 'MEMBER', status: 'PENDING', deleted: false },
    ]);
  });

  it('widens configurations.client_id only while it is shorter than 42', async () => {
    const clientIdLength = async () =>
      (
        await sql<{ length: number }>(
          `SELECT character_maximum_length AS length FROM information_schema.columns
           WHERE table_name = 'configurations' AND column_name = 'client_id'`,
        )
      )[0].length;

    await runSql('ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(36)');
    await runSql(MIGRATION);
    expect(await clientIdLength()).toBe(100);

    await runSql('ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(255)');
    await runSql(MIGRATION);
    expect(await clientIdLength()).toBe(255);
  });

  it('stores signer addresses in lower case and each holder as a member or a name', async () => {
    const { team, user } = await createOwner();
    await expect(
      sql(
        `INSERT INTO license_signers (id, team_id, license_token_id, signer_address, kind)
         VALUES ('s1', :team, 7, '0xABC0000000000000000000000000000000000000', 'API_KEY')`,
        { team: team.id },
      ),
    ).rejects.toThrow(/license_signers_address_check/);

    await sql(
      `INSERT INTO license_signers (id, team_id, license_token_id, signer_address, kind)
       VALUES ('s2', :team, 7, '0xabc0000000000000000000000000000000000000', 'API_KEY')`,
      { team: team.id },
    );
    await expect(
      sql(`INSERT INTO license_signer_holders (id, signer_id) VALUES ('h1', 's2')`),
    ).rejects.toThrow(/license_signer_holders_one_of/);
    await expect(
      sql(
        `INSERT INTO license_signer_holders (id, signer_id, user_id, name) VALUES ('h2', 's2', :user, 'Both')`,
        { user: user.id },
      ),
    ).rejects.toThrow(/license_signer_holders_one_of/);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- test/db/migration-12.test.ts`
Expected: FAIL, `ENOENT: no such file or directory … init-db_12.sql`.

- [ ] **Step 3: Write the migration**

`src/scripts/db/init-db_12.sql`:

```sql
-- Console teams: membership roles and statuses, hashed invite tokens, each user's
-- verified signer wallet, and the license key registry. Safe to run more than once.

UPDATE team_collaborators SET role = 'MEMBER' WHERE role = 'COLLABORATOR';
UPDATE team_collaborators SET status = 'PENDING' WHERE status = 'SENT';

ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invite_token_hash VARCHAR(64);
ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP;
ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invited_by VARCHAR(36);

-- Before the unique indexes: keep the earliest accepted row per (team, user)…
UPDATE team_collaborators SET deleted = TRUE, deleted_at = NOW()
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY team_id, user_id ORDER BY created_at NULLS LAST, id
    ) AS position
    FROM team_collaborators
    WHERE status = 'ACCEPTED' AND deleted IS NOT TRUE AND user_id IS NOT NULL
  ) ranked
  WHERE ranked.position > 1
);

-- …and the newest pending invite per (team, email), ignoring case.
UPDATE team_collaborators SET deleted = TRUE, deleted_at = NOW()
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY team_id, lower(email) ORDER BY created_at DESC NULLS LAST, id
    ) AS position
    FROM team_collaborators
    WHERE status = 'PENDING' AND deleted IS NOT TRUE AND email IS NOT NULL
  ) ranked
  WHERE ranked.position > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_collaborators_member
  ON team_collaborators (team_id, user_id)
  WHERE status = 'ACCEPTED' AND deleted IS NOT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_collaborators_pending_email
  ON team_collaborators (team_id, lower(email))
  WHERE status = 'PENDING' AND deleted IS NOT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_collaborators_invite_token
  ON team_collaborators (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_address VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_verified_at TIMESTAMP;

-- init-db_08 created configurations.client_id as VARCHAR(36), too short for a
-- 42-character client ID; production was widened by hand. Widen only a column
-- that is still shorter than 42, so production's actual type is never narrowed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'configurations'
      AND column_name = 'client_id'
      AND character_maximum_length < 42
  ) THEN
    ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(100);
  END IF;
END $$;

-- Who each license key is for. The chain decides whether a key works; this records
-- who it belongs to. Addresses only, never private keys.
CREATE TABLE IF NOT EXISTS license_signers (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  team_id VARCHAR(36) NOT NULL,
  license_token_id INTEGER NOT NULL,
  signer_address VARCHAR(42) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  note VARCHAR(200),
  created_by VARCHAR(36),
  disabled_by VARCHAR(36),
  disabled_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  CONSTRAINT fk_license_signers_team FOREIGN KEY (team_id) REFERENCES teams(id),
  CONSTRAINT license_signers_kind_check CHECK (kind IN ('MEMBER', 'API_KEY', 'EXTERNAL')),
  CONSTRAINT license_signers_address_check CHECK (signer_address = lower(signer_address))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_license_signers_license_signer
  ON license_signers (license_token_id, signer_address);
CREATE INDEX IF NOT EXISTS idx_license_signers_team ON license_signers (team_id);

CREATE TABLE IF NOT EXISTS license_signer_holders (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  signer_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  name VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  CONSTRAINT fk_license_signer_holders_signer
    FOREIGN KEY (signer_id) REFERENCES license_signers(id) ON DELETE CASCADE,
  CONSTRAINT fk_license_signer_holders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT license_signer_holders_one_of CHECK ((user_id IS NULL) <> (name IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_license_signer_holders_signer
  ON license_signer_holders (signer_id);
```

- [ ] **Step 4: Run the migration test**

Run: `npm test -- test/db/migration-12.test.ts`
Expected: `4 passed`. The global setup applies `init-db_12.sql` with the others, because it picks up every `init-db_*.sql`.

- [ ] **Step 5: Write the failing model test**

`test/models/team-models.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { TeamCollaborator, TeamRoles } from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import { addMember, createOwner, createUser } from '../support/fixtures';

describe('team models', () => {
  it('accepts MEMBER and rejects the retired COLLABORATOR role', async () => {
    const { team } = await createOwner();
    const person = await createUser();

    const member = await addMember(team.id!, person);
    expect(member.role).toBe(TeamRoles.MEMBER);

    await expect(
      TeamCollaborator.create({
        team_id: team.id!,
        user_id: person.id!,
        role: 'COLLABORATOR',
        status: 'PENDING',
      }),
    ).rejects.toThrow('Validation isIn on role failed');
  });

  it('loads a key with its holders and their accounts', async () => {
    const { team, user } = await createOwner();
    const key = await LicenseSigner.create({
      team_id: team.id!,
      license_token_id: 7,
      signer_address: '0xabc0000000000000000000000000000000000000',
      kind: SignerKinds.API_KEY,
      note: 'Prod backend',
      created_by: user.id,
    });
    await LicenseSignerHolder.bulkCreate([
      { signer_id: key.id!, user_id: user.id },
      { signer_id: key.id!, name: 'Backend service' },
    ]);

    const loaded = await LicenseSigner.findOne({
      where: { id: key.id! },
      include: [
        { model: LicenseSignerHolder, as: 'holders', include: [{ model: User }] },
      ],
    });

    expect(
      loaded!.holders!.map((holder) => holder.User?.email ?? holder.name).sort(),
    ).toEqual(['Backend service', user.email].sort());
  });

  it("stores a user's verified signer", async () => {
    const user = await createUser();
    const verifiedAt = new Date('2026-10-02T12:00:00Z');

    await user.update({
      signer_address: '0xdef0000000000000000000000000000000000000',
      signer_verified_at: verifiedAt,
    });

    const reloaded = await User.findOne({ where: { id: user.id! } });
    expect(reloaded!.signer_address).toBe('0xdef0000000000000000000000000000000000000');
    expect(reloaded!.signer_verified_at!.toISOString()).toBe(verifiedAt.toISOString());
  });
});
```

Append to `test/support/fixtures.ts`:

```ts
import { InvitationStatuses, TeamRoles } from '@/models/teamCollaborator.model';

/** `user` joins `teamId` as an accepted member. */
export const addMember = (teamId: string, user: User) =>
  TeamCollaborator.create({
    team_id: teamId,
    user_id: user.id!,
    email: user.email,
    role: TeamRoles.MEMBER,
    status: InvitationStatuses.ACCEPTED,
  });
```

Move the new `import` line up to join the other imports at the top of the file.

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test -- test/models/team-models.test.ts`
Expected: FAIL, `Failed to resolve import "@/models/licenseSigner.model"`.

- [ ] **Step 7: Rewrite `src/models/teamCollaborator.model.ts`**

```ts
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from 'sequelize';

import DB from '@/services/db';
import { PaginationOptions, paginateData } from '@/utils/paginateData';
import { FilterObject, transformObjectToSequelize } from '@/utils/filter';
import { User } from './user.model';
import { Team } from './team.model';

export enum TeamRoles {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum InvitationStatuses {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
}

// One row per person per team: the owner's own row, accepted members, pending
// invites (user_id null until accepted) and revoked memberships.
export class TeamCollaborator extends Model<
  InferAttributes<TeamCollaborator>,
  InferCreationAttributes<TeamCollaborator>
> {
  declare id?: string;
  declare team_id: string;
  declare user_id?: string | null;
  declare email?: string | null;
  declare role: string;
  declare status: string;
  declare invite_token_hash?: string | null;
  declare invite_expires_at?: Date | null;
  declare invited_by?: string | null;
  declare deleted?: boolean;
  declare deleted_at?: Date;
  declare User?: NonAttribute<User>;
  declare Team?: NonAttribute<Team>;

  static findAllPaginated(
    findOptions: FilterObject,
    paginationOptions: PaginationOptions,
  ) {
    const filter = transformObjectToSequelize(findOptions, {
      like: ['role'],
      exact: ['team_id', 'user_id', 'id'],
    });

    return paginateData(TeamCollaborator, { where: filter }, paginationOptions, [
      User,
      Team,
    ]);
  }
}

TeamCollaborator.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      validate: {
        notNull: true,
      },
      primaryKey: true,
    },
    team_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notEmpty: true,
        notNull: true,
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        notNull: true,
        isIn: [[TeamRoles.OWNER, TeamRoles.MEMBER]],
      },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: InvitationStatuses.PENDING,
      allowNull: true,
      validate: {
        isIn: [Object.values(InvitationStatuses)],
      },
    },
    invite_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invite_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invited_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize: DB.connection as Sequelize,
    modelName: 'TeamCollaborator',
    tableName: 'team_collaborators',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

TeamCollaborator.belongsTo(User, { foreignKey: 'user_id' });
TeamCollaborator.belongsTo(Team, { foreignKey: 'team_id' });
```

- [ ] **Step 8: Add the signer columns to `src/models/user.model.ts`**

In the class, after `declare address?: string;`:

```ts
  declare signer_address?: string | null;
  declare signer_verified_at?: Date | null;
```

In `User.init`, after the `address` attribute:

```ts
    signer_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signer_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
```

- [ ] **Step 9: Write the registry models**

`src/models/licenseSigner.model.ts`:

```ts
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from 'sequelize';

import DB from '@/services/db';
import type { LicenseSignerHolder } from './licenseSignerHolder.model';

export enum SignerKinds {
  MEMBER = 'MEMBER',
  API_KEY = 'API_KEY',
  EXTERNAL = 'EXTERNAL',
}

/** One key on one license, and the team whose owner owns that license. */
export class LicenseSigner extends Model<
  InferAttributes<LicenseSigner>,
  InferCreationAttributes<LicenseSigner>
> {
  declare id?: string;
  declare team_id: string;
  declare license_token_id: number;
  /** Always lower case. */
  declare signer_address: string;
  declare kind: string;
  declare note?: string | null;
  declare created_by?: string | null;
  declare disabled_by?: string | null;
  declare disabled_at?: Date | null;
  declare holders?: NonAttribute<LicenseSignerHolder[]>;
}

LicenseSigner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    team_id: { type: DataTypes.UUID, allowNull: false },
    license_token_id: { type: DataTypes.INTEGER, allowNull: false },
    signer_address: { type: DataTypes.STRING, allowNull: false },
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [Object.values(SignerKinds)] },
    },
    note: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    disabled_by: { type: DataTypes.UUID, allowNull: true },
    disabled_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize: DB.connection as Sequelize,
    modelName: 'LicenseSigner',
    tableName: 'license_signers',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

`src/models/licenseSignerHolder.model.ts`:

```ts
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  NonAttribute,
  Sequelize,
} from 'sequelize';

import DB from '@/services/db';
import { LicenseSigner } from './licenseSigner.model';
import { User } from './user.model';

/** A person a key belongs to: a team member (user_id) or a free-text name. */
export class LicenseSignerHolder extends Model<
  InferAttributes<LicenseSignerHolder>,
  InferCreationAttributes<LicenseSignerHolder>
> {
  declare id?: string;
  declare signer_id: string;
  declare user_id?: string | null;
  declare name?: string | null;
  declare User?: NonAttribute<User>;
}

LicenseSignerHolder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    signer_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize: DB.connection as Sequelize,
    modelName: 'LicenseSignerHolder',
    tableName: 'license_signer_holders',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

// Associations live here so importing this model registers both directions.
LicenseSigner.hasMany(LicenseSignerHolder, { foreignKey: 'signer_id', as: 'holders' });
LicenseSignerHolder.belongsTo(LicenseSigner, { foreignKey: 'signer_id' });
LicenseSignerHolder.belongsTo(User, { foreignKey: 'user_id' });
```

- [ ] **Step 10: Write the wire types and `ApiError`**

`src/types/teams.ts`:

```ts
// Wire shapes shared with the console. Contract C7 in the console repo:
// docs/superpowers/plans/2026-10-02-console-teams.md. Change them there first.

export type TeamRole = 'OWNER' | 'MEMBER';
export type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

export interface TeamSummary {
  id: string;
  name: string;
  companyName: string | null;
  role: TeamRole;
  ownerUserId: string;
  ownerEmail: string;
  ownerAddress: `0x${string}`;
  isPersonal: boolean;
}

export interface TeamMember {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  role: TeamRole;
  status: MembershipStatus;
  signerAddress: `0x${string}` | null;
  invitedAt: string;
  inviteExpiresAt: string | null;
}

export type SignerKind = 'MEMBER' | 'API_KEY' | 'EXTERNAL';

export interface LicenseSignerHolder {
  userId: string | null;
  name: string | null;
  email: string | null;
}

export interface LicenseSignerRecord {
  signerAddress: `0x${string}`;
  kind: SignerKind;
  note: string | null;
  holders: LicenseSignerHolder[];
  createdAt: string;
  createdBy: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
}

export type HolderInput = { userId: string } | { name: string };

export interface LicenseAccess {
  access: 'OWNER' | 'MEMBER' | 'NONE';
  teamId: string | null;
  signerAddress: `0x${string}` | null;
  /** The caller's users.email, for the console data proxy's audit line. */
  userEmail: string;
}
```

`src/utils/apiError.ts`:

```ts
import { isErrorWithMessage } from '@/utils/error.utils';

/** An error a route answers with `{ message, code }` and its own status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiErrorResponse = (error: unknown): Response | null =>
  error instanceof ApiError
    ? Response.json(
        { message: error.message, code: error.code },
        { status: error.status },
      )
    : null;

/** New routes: known errors keep their status; anything else is a logged 500. */
export const errorResponse = (error: unknown, step: string): Response => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error({ error, step });
  return Response.json({ message: 'Something went wrong' }, { status: 500 });
};

/** Existing /api/my routes: known errors keep their status; anything else stays a 400. */
export const legacyErrorResponse = (error: unknown, step: string): Response => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error({ error, step });
  const message = isErrorWithMessage(error) ? error.message : '';
  return Response.json({ message }, { status: 400 });
};
```

- [ ] **Step 11: Run the tests**

Run: `npm test -- test/db test/models test/api`
Expected: all pass (`harness`, `regressions-80`, `migration-12`, `team-models`).

- [ ] **Step 12: Typecheck and commit**

Run: `npm run typecheck`
Expected: exit 0.

```bash
npx prettier --write src/models src/types/teams.ts src/utils/apiError.ts test
git add src/scripts/db/init-db_12.sql src/models src/types/teams.ts src/utils/apiError.ts test
git commit -m "feat(teams): add membership statuses, user signer columns and the license key registry schema"
```

---

### Task 4: Team context: `resolveTeamContext`, `requireOwner`, and `/api/me` on the personal team

**Files:**

- Create: `src/services/membership.service.ts`, `src/services/teamContext.service.ts`
- Modify: `src/controllers/user.controller.ts` (`getCompanyAndTeam`)
- Test: `test/services/team-context.test.ts`

**Interfaces:**

- Consumes (Task 3): `TeamCollaborator`, `TeamRoles`, `InvitationStatuses`, `ApiError`.
- Produces:
  - `activeMembershipWhere` (where-fragment: accepted and not deleted).
  - `findPersonalMembership(userId: string): Promise<TeamCollaborator | null>`.
  - `findMembership(teamId: string, userId: string): Promise<TeamCollaborator | null>`.
  - `TEAM_HEADER = 'x-team-id'`.
  - `interface TeamContext { user: User; role: TeamRoles; team: Team | null; company: Company | null; membership: TeamCollaborator | null; owner: User; ownerAddress: string | null }`.
  - `requireUser(request: NextRequest): Promise<User>`: 401 `UNAUTHORIZED`.
  - `resolveTeamContext(request: NextRequest): Promise<TeamContext>`: 401 `UNAUTHORIZED`, 403 `NOT_A_MEMBER`.
  - `requireOwner(ctx: TeamContext): void`: 403 `OWNER_ONLY` with message `Only the team owner can do this`.
  - `companyScope(ctx): IUserWithCompanyAndTeam`, for the existing company-scoped controllers.

- [ ] **Step 1: Write the failing tests**

`test/services/team-context.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { GET as getMe } from '@/app/api/me/route';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { addMember, createOwner, createOwnerFor, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

const contextFor = async (address: string | undefined, teamId?: string) =>
  resolveTeamContext(await request('GET', '/api/my/anything', { as: address, teamId }));

describe('resolveTeamContext', () => {
  it("uses the caller's own team when no team header is sent", async () => {
    const { user, team, company } = await createOwner('Acme');

    const ctx = await contextFor(user.address!);

    expect(ctx.role).toBe(TeamRoles.OWNER);
    expect(ctx.team!.id).toBe(team.id);
    expect(ctx.company!.id).toBe(company.id);
    expect(ctx.owner.id).toBe(user.id);
    expect(ctx.ownerAddress).toBe(user.address);
  });

  it("resolves a member to the team's owner, company and wallet", async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    await addMember(acme.team.id!, member);

    const ctx = await contextFor(member.address!, acme.team.id!);

    expect(ctx.role).toBe(TeamRoles.MEMBER);
    expect(ctx.user.id).toBe(member.id);
    expect(ctx.owner.id).toBe(acme.user.id);
    expect(ctx.ownerAddress).toBe(acme.user.address);
    expect(ctx.company!.id).toBe(acme.company.id);
  });

  it('refuses a team the caller does not belong to', async () => {
    const acme = await createOwner('Acme');
    const outsider = await createOwner('Other');

    await expect(contextFor(outsider.user.address!, acme.team.id!)).rejects.toMatchObject(
      {
        status: 403,
        code: 'NOT_A_MEMBER',
      },
    );
  });

  it('refuses removed and pending memberships', async () => {
    const acme = await createOwner('Acme');
    const removed = await createUser();
    const row = await addMember(acme.team.id!, removed);
    await row.update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
      deleted_at: new Date(),
    });
    const invited = await createUser();
    await TeamCollaborator.create({
      team_id: acme.team.id!,
      user_id: invited.id!,
      email: invited.email,
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
    });

    for (const person of [removed, invited]) {
      await expect(contextFor(person.address!, acme.team.id!)).rejects.toMatchObject({
        code: 'NOT_A_MEMBER',
      });
    }
  });

  it('refuses an unknown user with 401', async () => {
    await expect(
      contextFor('0x1111111111111111111111111111111111111111'),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
    await expect(contextFor(undefined)).rejects.toMatchObject({ status: 401 });
  });

  it('treats a user who has not finished sign-up as the owner of no team, as before', async () => {
    const user = await createUser();

    const ctx = await contextFor(user.address!);

    expect(ctx).toMatchObject({ role: TeamRoles.OWNER, team: null, company: null });
    expect(ctx.owner.id).toBe(user.id);
  });

  it('requireOwner refuses members with OWNER_ONLY', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    await addMember(acme.team.id!, member);

    const ctx = await contextFor(member.address!, acme.team.id!);

    let thrown: unknown;
    try {
      requireOwner(ctx);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      status: 403,
      code: 'OWNER_ONLY',
      message: 'Only the team owner can do this',
    });
  });
});

describe('/api/me with several teams', () => {
  it("shows the caller's own company even when they joined another team first", async () => {
    const other = await createOwner('Other');
    const person = await createUser();
    await addMember(other.team.id!, person); // the oldest membership row
    const own = await createOwnerFor(person, 'Mine');

    const me = await read(
      await getMe(await request('GET', '/api/me', { as: person.address! })),
    );

    expect(me.status).toBe(200);
    expect(me.body.role).toBe('OWNER');
    expect(me.body.team.id).toBe(own.team.id);
    expect(me.body.company.name).toBe('Mine Co');
  });

  it('ignores X-Team-Id, even for a team the caller has left', async () => {
    const other = await createOwner('Other');
    const person = await createUser();
    const row = await addMember(other.team.id!, person);
    await row.update({ status: InvitationStatuses.REVOKED, deleted: true });
    const own = await createOwnerFor(person, 'Mine');

    const me = await read(
      await getMe(
        await request('GET', '/api/me', { as: person.address!, teamId: other.team.id! }),
      ),
    );

    expect(me.status).toBe(200);
    expect(me.body.team.id).toBe(own.team.id);
  });
});
```

This needs `createOwnerFor(user, label)`, which gives an existing user their own company and team. Refactor `createOwner` in `test/support/fixtures.ts` to use it:

```ts
/** Give an existing user the company, personal team and OWNER membership sign-up creates. */
export const createOwnerFor = async (user: User, label = 'Acme') => {
  const company = await Company.create({
    name: `${label} Co`,
    website: '',
    region: 'North America',
    type: 'startup',
    build_for: 'fleet',
    created_by: user.id!,
  });
  const team = await Team.create({
    name: `${label} Co`,
    company_id: company.id!,
    created_by: user.id!,
  });
  const membership = await TeamCollaborator.create({
    team_id: team.id!,
    user_id: user.id!,
    role: 'OWNER',
    status: 'ACCEPTED',
  });
  return { user, company, team, membership };
};

/** A user who finished sign-up: their company, personal team and OWNER membership. */
export const createOwner = async (label = 'Acme') =>
  createOwnerFor(await createUser({ name: `${label} Owner` }), label);
```

The test file imports `createOwnerFor` from `../support/fixtures` together with `addMember`, `createOwner` and `createUser`.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/services/team-context.test.ts`
Expected: FAIL, `Failed to resolve import "@/services/teamContext.service"`.

- [ ] **Step 3: Write `src/services/membership.service.ts`**

```ts
import { Op } from 'sequelize';

import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';

/** A membership counts only while accepted and not deleted. */
export const activeMembershipWhere = {
  status: InvitationStatuses.ACCEPTED,
  deleted: { [Op.not]: true },
};

/** The caller's own team: the OWNER membership created at sign-up. */
export const findPersonalMembership = (userId: string) =>
  TeamCollaborator.findOne({
    where: { user_id: userId, role: TeamRoles.OWNER, ...activeMembershipWhere },
    order: [['created_at', 'ASC']],
  });

export const findMembership = (teamId: string, userId: string) =>
  TeamCollaborator.findOne({
    where: { team_id: teamId, user_id: userId, ...activeMembershipWhere },
  });
```

- [ ] **Step 4: Write `src/services/teamContext.service.ts`**

```ts
import { Op } from 'sequelize';

import { AuthenticationMiddleware } from '@/middlewares/authentication.middleware';
import { Company } from '@/models/company.model';
import { Team } from '@/models/team.model';
import { TeamCollaborator, TeamRoles } from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import { findMembership, findPersonalMembership } from '@/services/membership.service';
import type { ICompany } from '@/types/company';
import type { IUserWithCompanyAndTeam } from '@/types/user';
import { ApiError } from '@/utils/apiError';

/** Sent by the console while a team other than the caller's own is active (contract C4). */
export const TEAM_HEADER = 'x-team-id';

export interface TeamContext {
  /** The signed-in caller. */
  user: User;
  role: TeamRoles;
  /** Null only for a caller who hasn't finished sign-up and sent no header. */
  team: Team | null;
  company: Company | null;
  membership: TeamCollaborator | null;
  /** The team owner. Their wallet owns the team's licenses. */
  owner: User;
  ownerAddress: string | null;
}

export const requireUser = async (request: NextRequest): Promise<User> => {
  await AuthenticationMiddleware(request);
  const user = request.user?.user as User | null | undefined;
  if (!user?.id) throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
  return user;
};

const notAMember = () =>
  new ApiError(403, 'NOT_A_MEMBER', 'You are not a member of this team');

export const resolveTeamContext = async (request: NextRequest): Promise<TeamContext> => {
  const user = await requireUser(request);
  const teamId = request.headers.get(TEAM_HEADER);

  const membership = teamId
    ? await findMembership(teamId, user.id!)
    : await findPersonalMembership(user.id!);
  if (teamId && !membership) throw notAMember();

  const team = membership
    ? await Team.findOne({
        where: { id: membership.team_id, deleted: { [Op.not]: true } },
      })
    : null;
  if (teamId && !team) throw notAMember();

  const owner =
    team && team.created_by !== user.id
      ? await User.findOne({ where: { id: team.created_by } })
      : user;
  if (!owner) throw notAMember();

  return {
    user,
    role: membership?.role === TeamRoles.MEMBER ? TeamRoles.MEMBER : TeamRoles.OWNER,
    team,
    company: team ? await Company.findOne({ where: { id: team.company_id } }) : null,
    membership,
    owner,
    ownerAddress: owner.address ?? null,
  };
};

export const requireOwner = (ctx: TeamContext) => {
  if (ctx.role !== TeamRoles.OWNER) {
    throw new ApiError(403, 'OWNER_ONLY', 'Only the team owner can do this');
  }
};

/** The shape the company-scoped controllers take, pointed at the active team's company. */
export const companyScope = (ctx: TeamContext): IUserWithCompanyAndTeam =>
  ({
    ...ctx.user.get({ plain: true }),
    company: ctx.company?.get({ plain: true }) as ICompany,
  }) as IUserWithCompanyAndTeam;
```

- [ ] **Step 5: Point `getCompanyAndTeam` at the personal team**

In `src/controllers/user.controller.ts`:

- Replace `import { findTeamCollaboratorByUserId } from '@/services/teamCollaborator.service';` with `import { findPersonalMembership } from '@/services/membership.service';`.
- Change the first lines of `getCompanyAndTeam` to:

```ts
export const getCompanyAndTeam = async (user: User) => {
  const userId = user?.id ?? '';
  // Always the caller's own team. Other teams are reached with X-Team-Id.
  const teamAssociated = await findPersonalMembership(userId);
  const team = await findTeamById(teamAssociated?.team_id ?? '');
```

Leave the rest of the function as it is.

- [ ] **Step 6: Run the tests**

Run: `npm test -- test/services/team-context.test.ts test/api`
Expected: all pass.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: exit 0.

```bash
npx prettier --write src/services/membership.service.ts src/services/teamContext.service.ts src/controllers/user.controller.ts test
git add src/services/membership.service.ts src/services/teamContext.service.ts src/controllers/user.controller.ts test
git commit -m "feat(teams): resolve the active team from X-Team-Id and keep /api/me on the personal team"
```

---

### Task 5: Team context and owner-only writes in apps, connections, redirect URIs, signers and workspace

Each of these routes looked up the company with `getCompanyAndTeam(user)`. Now they take it from the active team. Every non-GET handler calls `requireOwner(ctx)` first.

**Files:**

- Modify (whole files below):
  - `src/app/api/my/apps/route.ts`
  - `src/app/api/my/apps/[id]/route.ts`
  - `src/app/api/my/apps/[id]/redirect-uris/route.ts`
  - `src/app/api/my/apps/[id]/signers/route.ts`
  - `src/app/api/my/connections/route.ts`
  - `src/app/api/my/connections/[id]/route.ts`
  - `src/app/api/my/redirect-uris/[id]/route.ts`
  - `src/app/api/my/signers/[id]/route.ts`
  - `src/app/api/my/workspace/route.ts`
  - `src/app/api/my/workspace/[id]/apps/route.ts`
  - `src/app/api/my/workspace/by-token/[tokenId]/route.ts`
- Unchanged and open to members: `src/app/api/my/support/email/route.ts`
- Test: `test/api/team-scoped-routes.test.ts`

**Interfaces:**

- Consumes (Task 4): `resolveTeamContext`, `requireOwner`, `companyScope`. Consumes (Task 3): `legacyErrorResponse`, `apiErrorResponse`.

- [ ] **Step 1: Write the failing tests**

`test/api/team-scoped-routes.test.ts`:

```ts
import type { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import {
  GET as getApp,
  PUT as putApp,
  DELETE as deleteApp,
} from '@/app/api/my/apps/[id]/route';
import { POST as createRedirectUri } from '@/app/api/my/apps/[id]/redirect-uris/route';
import { POST as createAppSigner } from '@/app/api/my/apps/[id]/signers/route';
import { GET as listApps } from '@/app/api/my/apps/route';
import {
  DELETE as deleteConnection,
  PUT as putConnection,
} from '@/app/api/my/connections/[id]/route';
import {
  GET as listConnections,
  POST as createConnection,
} from '@/app/api/my/connections/route';
import {
  DELETE as deleteRedirectUri,
  PUT as putRedirectUri,
} from '@/app/api/my/redirect-uris/[id]/route';
import { DELETE as deleteSigner } from '@/app/api/my/signers/[id]/route';
import { POST as sendSupport } from '@/app/api/my/support/email/route';
import { POST as createWorkspaceApp } from '@/app/api/my/workspace/[id]/apps/route';
import { GET as workspaceByToken } from '@/app/api/my/workspace/by-token/[tokenId]/route';
import {
  GET as getWorkspace,
  POST as createWorkspace,
} from '@/app/api/my/workspace/route';
import { Workspace } from '@/models/workspace.model';
import Mailer from '@/utils/mailer';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser({ name: 'Mia Member' });
  await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  return { acme, member, outsider };
};

const ownerOnly = { message: 'Only the team owner can do this', code: 'OWNER_ONLY' };
const notAMember = { message: 'You are not a member of this team', code: 'NOT_A_MEMBER' };

describe('company-scoped /api/my routes under a team', () => {
  it('lets the owner write and a member read the team connections', async () => {
    const { acme, member } = await setup();

    const created = await read(
      await createConnection(
        await request('POST', '/api/my/connections', {
          as: acme.user.address!,
          body: { name: 'Fleet link' },
        }),
      ),
    );
    expect(created.status).toBe(200);

    const listed = await read(
      await listConnections(
        await request('GET', '/api/my/connections', {
          as: member.address!,
          teamId: acme.team.id!,
        }),
      ),
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((row: { name: string }) => row.name)).toEqual([
      'Fleet link',
    ]);

    const renamed = await read(
      await putConnection(
        await request('PUT', `/api/my/connections/${created.body.id}`, {
          as: acme.user.address!,
          body: { name: 'Fleet link 2' },
        }),
        { params: { id: created.body.id } },
      ),
    );
    expect(renamed.status).toBe(200);
  });

  it('shows a member the team apps and workspace', async () => {
    const { acme, member } = await setup();
    await Workspace.create({
      name: 'Acme workspace',
      token_id: '7',
      owner: acme.user.address!,
      client_id: `0x${'1'.repeat(40)}`,
      company_id: acme.company.id!,
    });
    const asMember = { as: member.address!, teamId: acme.team.id! };

    const apps = await read(
      await listApps(await request('GET', '/api/my/apps', asMember)),
    );
    const workspace = await read(
      await getWorkspace(await request('GET', '/api/my/workspace', asMember)),
    );
    const app = await read(
      await getApp(await request('GET', '/api/my/apps/x', asMember), {
        params: { id: 'x' },
      }),
    );

    expect(apps.status).toBe(200);
    expect(workspace.body.name).toBe('Acme workspace');
    expect(app.status).toBe(200);
  });

  const writes: [string, (req: NextRequest) => Promise<Response>][] = [
    ['PUT /api/my/apps/:id', (req) => putApp(req, { params: { id: 'a' } })],
    ['DELETE /api/my/apps/:id', (req) => deleteApp(req, { params: { id: 'a' } })],
    [
      'POST /api/my/apps/:id/redirect-uris',
      (req) => createRedirectUri(req, { params: { id: 'a' } }),
    ],
    [
      'POST /api/my/apps/:id/signers',
      (req) => createAppSigner(req, { params: { id: 'a' } }),
    ],
    ['POST /api/my/connections', (req) => createConnection(req)],
    ['PUT /api/my/connections/:id', (req) => putConnection(req, { params: { id: 'c' } })],
    [
      'DELETE /api/my/connections/:id',
      (req) => deleteConnection(req, { params: { id: 'c' } }),
    ],
    [
      'PUT /api/my/redirect-uris/:id',
      (req) => putRedirectUri(req, { params: { id: 'r' } }),
    ],
    [
      'DELETE /api/my/redirect-uris/:id',
      (req) => deleteRedirectUri(req, { params: { id: 'r' } }),
    ],
    ['DELETE /api/my/signers/:id', (req) => deleteSigner(req, { params: { id: 's' } })],
    ['POST /api/my/workspace', (req) => createWorkspace(req)],
    [
      'POST /api/my/workspace/:id/apps',
      (req) => createWorkspaceApp(req, { params: { id: 'w' } }),
    ],
  ];

  it.each(writes)('refuses %s to a member with OWNER_ONLY', async (_route, call) => {
    const { acme, member } = await setup();

    const response = await read(
      await call(
        await request('POST', '/api/my/x', {
          as: member.address!,
          teamId: acme.team.id!,
          body: { name: 'x', uri: 'https://x.test' },
        }),
      ),
    );

    expect(response).toEqual({ status: 403, body: ownerOnly });
  });

  it('refuses a team the caller does not belong to', async () => {
    const { acme, outsider } = await setup();

    const response = await read(
      await listConnections(
        await request('GET', '/api/my/connections', {
          as: outsider.user.address!,
          teamId: acme.team.id!,
        }),
      ),
    );

    expect(response).toEqual({ status: 403, body: notAMember });
  });

  it('resolves the workspace by license token for members and refuses outsiders', async () => {
    const { acme, member, outsider } = await setup();
    await Workspace.create({
      name: 'Acme workspace',
      token_id: '7',
      owner: acme.user.address!,
      client_id: `0x${'1'.repeat(40)}`,
      company_id: acme.company.id!,
    });
    const params = { params: Promise.resolve({ tokenId: '7' }) };

    const asMember = await workspaceByToken(
      await request('GET', '/api/my/workspace/by-token/7', {
        as: member.address!,
        teamId: acme.team.id!,
      }),
      params,
    );
    const asOutsider = await workspaceByToken(
      await request('GET', '/api/my/workspace/by-token/7', {
        as: outsider.user.address!,
      }),
      { params: Promise.resolve({ tokenId: '7' }) },
    );

    expect(asMember.status).toBe(200);
    expect(asOutsider.status).toBe(403);
  });

  it('keeps support email open to members', async () => {
    const { acme, member } = await setup();

    const response = await sendSupport(
      await request('POST', '/api/my/support/email', {
        as: member.address!,
        teamId: acme.team.id!,
        body: { walletAddress: member.address, inquiryType: 'Data', message: 'Help' },
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(Mailer.sendMail)).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/team-scoped-routes.test.ts`
Expected: FAIL. The member reads return the member's own (empty) company data, writes return 200 or 400 instead of 403 `OWNER_ONLY`, and the outsider gets 200 instead of `NOT_A_MEMBER`.

- [ ] **Step 3: Rewrite the apps routes**

`src/app/api/my/apps/route.ts`:

```ts
import { getMyApps } from '@/controllers/app.controller';
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { getPaginationFromParams } from '@/utils/paginateData';

export const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const pagination = getPaginationFromParams(params);

    const apps = await getMyApps(params, pagination, ctx.company?.id ?? '');

    return Response.json(apps);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Get app created by the logged user');
  }
};
```

`src/app/api/my/apps/[id]/route.ts`:

```ts
import { deleteOwnApp, findMyApp, updateMyApp } from '@/controllers/app.controller';
import { updateWorkspace } from '@/controllers/workspace.controller';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const GET = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    const app = await findMyApp(appId, ctx.company?.id ?? '');
    return Response.json(app);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Get app created by the logged user');
  }
};

export const DELETE = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    await deleteOwnApp(appId, ctx.company?.id ?? '');
    return Response.json({});
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Delete app');
  }
};

export const PUT = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    const companyId = ctx.company?.id ?? '';

    const newData = await request.json();
    const app = await findMyApp(appId, companyId);
    await updateMyApp(appId, companyId, newData);

    if (newData.Workspace?.name) {
      await updateWorkspace(app!.workspace_id, {
        name: newData.Workspace.name,
      });
    }

    return Response.json({});
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Update app');
  }
};
```

`src/app/api/my/apps/[id]/redirect-uris/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createOwnRedirectUri } from '@/controllers/redirectUri.controller';
import { RedirectUri, MODIFIABLE_FIELDS } from '@/models/redirectUri.model';
import {
  companyScope,
  requireOwner,
  resolveTeamContext,
} from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const POST = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const redirectUriInput = _.pick(await request.json(), MODIFIABLE_FIELDS) as Partial<
      Attributes<RedirectUri>
    >;

    const createdRedirectUri = await createOwnRedirectUri(
      redirectUriInput,
      appId,
      companyScope(ctx),
    );

    return Response.json(createdRedirectUri);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Create redirect uri');
  }
};
```

`src/app/api/my/apps/[id]/signers/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createOwnSigner } from '@/controllers/signer.controller';
import { Signer, MODIFIABLE_FIELDS } from '@/models/signer.model';
import {
  companyScope,
  requireOwner,
  resolveTeamContext,
} from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const POST = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const signerInput = _.pick(await request.json(), MODIFIABLE_FIELDS) as Partial<
      Attributes<Signer>
    >;

    const createdSigner = await createOwnSigner(signerInput, appId, companyScope(ctx));

    return Response.json(createdSigner);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Create signer');
  }
};
```

- [ ] **Step 4: Rewrite the connection routes**

`src/app/api/my/connections/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createConnection, getMyConnections } from '@/controllers/connection.controller';
import { Connection, CONNECTION_MODIFIABLE_FIELDS } from '@/models/connection.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { getPaginationFromParams } from '@/utils/paginateData';

const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const pagination = getPaginationFromParams(params);

    const connections = await getMyConnections(params, pagination, ctx.company?.id ?? '');
    return Response.json(connections);
  } catch (error: unknown) {
    return legacyErrorResponse(
      error,
      '[My Connection] Get connection created by the logged user',
    );
  }
};

const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const connectionInput = _.pick(
      await request.json(),
      CONNECTION_MODIFIABLE_FIELDS,
    ) as Attributes<Connection>;

    const createdConnection = await createConnection(
      connectionInput,
      ctx.company?.id ?? '',
    );

    return Response.json(createdConnection);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Connection] Create connection');
  }
};

export { GET, POST };
```

`src/app/api/my/connections/[id]/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import {
  deleteMyConnection,
  findMyConnection,
  updateMyConnection,
} from '@/controllers/connection.controller';
import { Connection, CONNECTION_MODIFIABLE_FIELDS } from '@/models/connection.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

const GET = async (request: NextRequest, { params: { id: connectionId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    const connection = await findMyConnection(connectionId, ctx.company?.id ?? '');
    return Response.json(connection);
  } catch (error: unknown) {
    return legacyErrorResponse(
      error,
      '[My Connection] Get connection created by the logged in user',
    );
  }
};

const PUT = async (request: NextRequest, { params: { id: connectionId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    const companyId = ctx.company?.id ?? '';

    const existingConnection = await findMyConnection(connectionId, companyId);
    if (!existingConnection) {
      return Response.json({ message: 'Connection not found' }, { status: 404 });
    }

    const updateData = _.pick(
      await request.json(),
      CONNECTION_MODIFIABLE_FIELDS,
    ) as Attributes<Connection>;

    const [affectedCount, updatedConnections] = await updateMyConnection(
      connectionId,
      companyId,
      updateData,
    );

    if (affectedCount === 0) {
      return Response.json({ message: 'Connection not found' }, { status: 404 });
    }

    return Response.json(updatedConnections[0]);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Connection] Update connection');
  }
};

const DELETE = async (request: NextRequest, { params: { id: connectionId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    const companyId = ctx.company?.id ?? '';

    const existingConnection = await findMyConnection(connectionId, companyId);
    if (!existingConnection) {
      return Response.json({ message: 'Connection not found' }, { status: 404 });
    }

    const [affectedCount] = await deleteMyConnection(connectionId, companyId);

    if (affectedCount === 0) {
      return Response.json({ message: 'Connection not found' }, { status: 404 });
    }

    return Response.json({ message: 'Connection deleted successfully' });
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Connection] Delete connection');
  }
};

export { GET, PUT, DELETE };
```

- [ ] **Step 5: Rewrite the redirect URI and legacy signer routes**

`src/app/api/my/redirect-uris/[id]/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import {
  deleteOwnRedirectUri,
  updateOwnRedirectUri,
} from '@/controllers/redirectUri.controller';
import { RedirectUri, MODIFIABLE_FIELDS } from '@/models/redirectUri.model';
import {
  companyScope,
  requireOwner,
  resolveTeamContext,
} from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const PUT = async (
  request: NextRequest,
  { params: { id: redirectUriId } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const redirectUriInput = _.pick(await request.json(), MODIFIABLE_FIELDS) as Partial<
      Attributes<RedirectUri>
    >;

    const updatedRedirectUri = await updateOwnRedirectUri(
      redirectUriId,
      redirectUriInput,
      companyScope(ctx),
    );

    return Response.json(updatedRedirectUri);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Update redirect uri');
  }
};

export const DELETE = async (
  request: NextRequest,
  { params: { id: redirectUriId } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const deletedRedirectUri = await deleteOwnRedirectUri(
      redirectUriId,
      companyScope(ctx),
    );

    return Response.json(deletedRedirectUri);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Delete redirect uri');
  }
};
```

`src/app/api/my/signers/[id]/route.ts`:

```ts
import { deleteOwnSigner } from '@/controllers/signer.controller';
import {
  companyScope,
  requireOwner,
  resolveTeamContext,
} from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const DELETE = async (
  request: NextRequest,
  { params: { id: signerId } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const deletedSigner = await deleteOwnSigner(signerId, companyScope(ctx));

    return Response.json(deletedSigner);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Delete signer');
  }
};
```

- [ ] **Step 6: Rewrite the workspace routes**

`src/app/api/my/workspace/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createWorkspace, findMyWorkspace } from '@/controllers/workspace.controller';
import { Workspace, MODIFIABLE_FIELDS } from '@/models/workspace.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

export const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const workspace = await findMyWorkspace(ctx.company?.id ?? '');

    return Response.json(workspace?.dataValues ?? {});
  } catch (error: unknown) {
    return legacyErrorResponse(
      error,
      '[My Workspace] Get workspace created by the logged user',
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);

    const workspaceInput = _.pick(
      await request.json(),
      MODIFIABLE_FIELDS,
    ) as Attributes<Workspace>;

    const createdWorkspace = await createWorkspace(workspaceInput, ctx.company?.id ?? '');

    return Response.json(createdWorkspace);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Workspace] Create workspace');
  }
};
```

`src/app/api/my/workspace/[id]/apps/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createApp } from '@/controllers/app.controller';
import { App, MODIFIABLE_FIELDS } from '@/models/app.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { findWorkspaceByIdAndCompany } from '@/services/workspace.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const POST = async (
  request: NextRequest,
  { params: { id: workspaceId } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    const companyId = ctx.company?.id ?? '';
    const workspace = await findWorkspaceByIdAndCompany(workspaceId, companyId);

    if (!workspace) {
      return Response.json({ message: 'Forbidden' }, { status: 403 });
    }

    const appInput = _.pick(await request.json(), MODIFIABLE_FIELDS) as Attributes<App>;

    const createdApp = await createApp(appInput, workspaceId, companyId);

    return Response.json(createdApp);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Create app');
  }
};
```

`src/app/api/my/workspace/by-token/[tokenId]/route.ts`. Keep the existing doc comment above `GET`, change "scoped to the authenticated caller (must be `workspace.owner`)" to "scoped to the active team (its owner must be `workspace.owner`)", and replace the handler:

```ts
import { NextResponse } from 'next/server';

import { findWorkspaceByTokenId } from '@/controllers/workspace.controller';
import { resolveTeamContext } from '@/services/teamContext.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

interface Ctx {
  params: Promise<{ tokenId: string }>;
}

export const GET = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const { tokenId } = await ctx.params;

    const parsed = Number.parseInt(tokenId, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'invalid tokenId' }, { status: 400 });
    }

    const workspace = await findWorkspaceByTokenId(parsed);
    if (!workspace) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const teamOwner = teamCtx.ownerAddress?.toLowerCase();
    if (!teamOwner || workspace.owner.toLowerCase() !== teamOwner) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    return NextResponse.json(workspace.dataValues);
  } catch (error: unknown) {
    const handled = apiErrorResponse(error);
    if (handled) return handled;
    console.error({ error, step: '[My Workspace] Get by tokenId' });
    const message = isErrorWithMessage(error) ? error.message : 'internal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
```

- [ ] **Step 7: Run the tests**

Run: `npm test -- test/api/team-scoped-routes.test.ts`
Expected: all pass. That's 6 named tests plus 12 `it.each` cases.

- [ ] **Step 8: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all tests pass, typecheck exits 0.

```bash
npx prettier --write src/app/api/my/apps src/app/api/my/connections src/app/api/my/redirect-uris src/app/api/my/signers src/app/api/my/workspace/route.ts "src/app/api/my/workspace/[id]/apps" src/app/api/my/workspace/by-token test
git add src/app/api/my test
git commit -m "feat(teams): scope apps, connections, redirect URIs, signers and workspace to the active team"
```

---

### Task 6: Team context in branding, configurations and simulated vehicles

Branding was guarded by "the caller's wallet owns the workspace". Configurations are limited by #80 to "the caller's wallet owns the license on-chain". Simulated vehicles were keyed to the caller's user ID. Under teams, all three move to the **team owner**:

- branding and configurations check the team owner's wallet;
- simulated vehicles use the team owner's user ID;
- members read, and only the owner writes.

Configurations keep #80's rule, license ownership through `isLicenseOwner`, with the team owner's wallet in place of the caller's. There's no `owner_id` check.

**Files:**

- Modify: `src/controllers/workspace.controller.ts` (replace `assertOwnsWorkspace` with `assertWorkspaceInTeam`)
- Modify (whole files below):
  - `src/app/api/my/workspace/[id]/brand/route.ts`
  - `src/app/api/my/workspace/[id]/brand/upload/route.ts`
  - `src/app/api/my/workspace/[id]/brands/route.ts`
  - `src/app/api/my/workspace/[id]/brands/[brandId]/route.ts`
  - `src/app/api/my/workspace/[id]/brands/[brandId]/default/route.ts`
- Modify: `src/app/api/my/configurations/route.ts`, `src/app/api/my/configurations/[id]/route.ts`
- Modify: `src/app/api/my/simulated-vehicles/route.ts`, `src/app/api/my/simulated-vehicles/[vehicleId]/route.ts`
- Test: `test/api/team-owned-resources.test.ts`

**Interfaces:**

- Consumes (#80): `isLicenseOwner(address, clientId)` and `IdentityUnavailableError` from `@/services/identity.service`. Consumes (Task 1): `fakeIdentity`, `newClientId`.
- Produces: `assertWorkspaceInTeam(teamCtx: TeamContext, workspaceId: string): Promise<{ workspace: Workspace } | { error: NextResponse }>`, with the same `{ error: 'not_found' | 'forbidden' }` bodies as before.
- Configuration responses keep #80's bodies:
  - list for a license the team doesn't own: 404 `{ error: 'Client not found' }`;
  - create: 403 `{ error: 'You do not own this license' }`;
  - by ID: 404 `{ error: 'Configuration not found' }`;
  - Identity failure: 502 `{ error: 'Could not verify license ownership' }`.
    Team errors (`NOT_A_MEMBER`, `OWNER_ONLY`) come first as `{ message, code }`.

- [ ] **Step 1: Write the failing tests**

`test/api/team-owned-resources.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  GET as getConfiguration,
  PUT as putConfiguration,
} from '@/app/api/my/configurations/[id]/route';
import {
  GET as listConfigurations,
  POST as saveConfiguration,
} from '@/app/api/my/configurations/route';
import { DELETE as deleteVehicle } from '@/app/api/my/simulated-vehicles/[vehicleId]/route';
import {
  GET as listVehicles,
  POST as createVehicle,
} from '@/app/api/my/simulated-vehicles/route';
import {
  GET as listBrands,
  POST as createBrand,
} from '@/app/api/my/workspace/[id]/brands/route';
import { Configuration } from '@/models/configuration.model';
import { WorkspaceBrand } from '@/models/workspaceBrand.model';
import { Workspace } from '@/models/workspace.model';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';
import { fakeIdentity, newClientId } from '../support/identity';

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser();
  await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  const workspace = await Workspace.create({
    name: 'Acme workspace',
    token_id: '7',
    owner: acme.user.address!,
    client_id: `0x${'1'.repeat(40)}`,
    company_id: acme.company.id!,
  });
  return { acme, member, outsider, workspace };
};

const ownerOnly = { message: 'Only the team owner can do this', code: 'OWNER_ONLY' };

describe('branding under a team', () => {
  it('lets the owner create a brand, a member list it, and refuses member writes and outsiders', async () => {
    const { acme, member, outsider, workspace } = await setup();
    const params = () => ({ params: Promise.resolve({ id: workspace.id! }) });

    const created = await createBrand(
      await request('POST', '/x', { as: acme.user.address!, body: { name: 'Acme' } }),
      params(),
    );
    expect(created.status).toBe(201);
    const stored = await WorkspaceBrand.findOne({
      where: { workspace_id: workspace.id! },
    });
    expect(stored!.updated_by).toBe(acme.user.address);

    const asMember = await read(
      await listBrands(
        await request('GET', '/x', { as: member.address!, teamId: acme.team.id! }),
        params(),
      ),
    );
    expect(asMember.status).toBe(200);
    expect(asMember.body.map((brand: { name: string }) => brand.name)).toEqual(['Acme']);

    const memberWrite = await read(
      await createBrand(
        await request('POST', '/x', {
          as: member.address!,
          teamId: acme.team.id!,
          body: { name: 'Nope' },
        }),
        params(),
      ),
    );
    expect(memberWrite).toEqual({ status: 403, body: ownerOnly });

    const asOutsider = await read(
      await listBrands(
        await request('GET', '/x', { as: outsider.user.address! }),
        params(),
      ),
    );
    expect(asOutsider).toEqual({ status: 403, body: { error: 'forbidden' } });
  });
});

describe('configurations under a team', () => {
  const withLicense = async () => {
    const team = await setup();
    const clientId = newClientId();
    fakeIdentity([{ tokenId: 1, clientId, owner: team.acme.user.address! }]);
    return { ...team, clientId };
  };

  it("shows a member the configurations of the team owner's license and refuses member writes", async () => {
    const { acme, member, clientId } = await withLicense();
    const saved = await read(
      await saveConfiguration(
        await request('POST', '/x', {
          as: acme.user.address!,
          body: {
            client_id: clientId,
            configuration_name: 'Main',
            configuration: { a: 1 },
          },
        }),
      ),
    );
    expect(saved.status).toBe(201);
    const asMember = { as: member.address!, teamId: acme.team.id! };

    const listed = await read(
      await listConfigurations(
        await request('GET', `/api/my/configurations?clientId=${clientId}`, asMember),
      ),
    );
    const one = await getConfiguration(await request('GET', '/x', asMember), {
      params: { id: saved.body.id },
    });
    const memberCreate = await read(
      await saveConfiguration(
        await request('POST', '/x', {
          ...asMember,
          body: { client_id: clientId, configuration_name: 'Mine', configuration: {} },
        }),
      ),
    );
    const memberWrite = await read(
      await putConfiguration(
        await request('PUT', '/x', {
          ...asMember,
          body: { configuration_name: 'Changed', configuration: {} },
        }),
        { params: { id: saved.body.id } },
      ),
    );

    expect(
      listed.body.map((row: { configuration_name: string }) => row.configuration_name),
    ).toEqual(['Main']);
    expect(one.status).toBe(200);
    expect(memberCreate).toEqual({ status: 403, body: ownerOnly });
    expect(memberWrite).toEqual({ status: 403, body: ownerOnly });
  });

  it("answers 404 to another team for the license's configurations", async () => {
    const { acme, outsider, clientId } = await withLicense();
    const configuration = await Configuration.create({
      owner_id: acme.user.id!,
      client_id: clientId,
      configuration_name: 'Main',
      configuration: { a: 1 },
    });
    const asOutsider = { as: outsider.user.address! };

    const one = await getConfiguration(await request('GET', '/x', asOutsider), {
      params: { id: configuration.id! },
    });
    const listed = await listConfigurations(
      await request('GET', `/api/my/configurations?clientId=${clientId}`, asOutsider),
    );

    expect(one.status).toBe(404);
    expect(listed.status).toBe(404);
  });
});

describe('simulated vehicles under a team', () => {
  it("shows a member the owner's simulated vehicles and refuses member writes", async () => {
    const { acme, member } = await setup();
    const created = await read(
      await createVehicle(
        await request('POST', '/x', {
          as: acme.user.address!,
          body: {
            token_id: 99,
            make: 'Toyota',
            model: 'RAV4',
            year: 2023,
            client_id: 'client-1',
          },
        }),
      ),
    );
    expect(created.status).toBe(201);
    const asMember = { as: member.address!, teamId: acme.team.id! };

    const listed = await read(
      await listVehicles(await request('GET', '/x?clientId=client-1', asMember)),
    );
    const memberCreate = await read(
      await createVehicle(
        await request('POST', '/x', {
          ...asMember,
          body: {
            token_id: 98,
            make: 'Ford',
            model: 'F-150',
            year: 2022,
            client_id: 'client-1',
          },
        }),
      ),
    );
    const memberDelete = await read(
      await deleteVehicle(await request('DELETE', '/x', asMember), {
        params: Promise.resolve({ vehicleId: created.body.data.id }),
      }),
    );

    expect(listed.body.data.map((vehicle: { make: string }) => vehicle.make)).toEqual([
      'Toyota',
    ]);
    expect(memberCreate).toEqual({ status: 403, body: ownerOnly });
    expect(memberDelete).toEqual({ status: 403, body: ownerOnly });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/team-owned-resources.test.ts`
Expected: FAIL.

- Brand reads by a member get 403 `forbidden`.
- A member's configuration reads get 404, because #80 checks the member's own wallet.
- Member writes succeed or fail without `OWNER_ONLY`.

- [ ] **Step 3: Replace the workspace guard**

In `src/controllers/workspace.controller.ts`, delete `assertOwnsWorkspace` and add:

```ts
import type { TeamContext } from '@/services/teamContext.service';

/**
 * A workspace belongs to the active team when the team owner's wallet owns it.
 * Members read through this guard; routes that write also call requireOwner.
 */
export const assertWorkspaceInTeam = async (
  teamCtx: TeamContext,
  workspaceId: string,
) => {
  const workspace = await findWorkspaceById(workspaceId);
  if (!workspace) {
    return { error: NextResponse.json({ error: 'not_found' }, { status: 404 }) };
  }
  const teamOwner = teamCtx.ownerAddress?.toLowerCase();
  if (!teamOwner || workspace.owner.toLowerCase() !== teamOwner) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { workspace };
};
```

Put the `import type` with the other imports at the top of the file.

- [ ] **Step 4: Rewrite the five branding routes**

Each one keeps its existing doc comments and replaces the body. The pattern: `resolveTeamContext` first; then `requireOwner` for writes; then `assertWorkspaceInTeam`; and `apiErrorResponse` first in the `catch`.

`src/app/api/my/workspace/[id]/brand/route.ts`:

```ts
import _ from 'lodash';
import { NextResponse } from 'next/server';
import type { Attributes } from 'sequelize';

import { assertWorkspaceInTeam } from '@/controllers/workspace.controller';
import { WorkspaceBrand, MODIFIABLE_FIELDS } from '@/models/workspaceBrand.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import {
  findBrandByWorkspaceId,
  toBrandView,
  upsertBrand,
} from '@/services/workspaceBrand.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

interface Ctx {
  params: Promise<{ id: string }>;
}

const failed = (error: unknown, step: string) => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error({ error, step });
  const message = isErrorWithMessage(error) ? error.message : 'internal';
  return NextResponse.json({ error: message }, { status: 500 });
};

/**
 * GET the default brand for a workspace in the active team.
 * Backward-compatible single-brand path — for multi-brand management use
 * GET /api/my/workspace/:id/brands instead.
 *
 *   200 BrandView
 *   404 no brand set for workspace
 */
export const GET = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const { id } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;
    const view = toBrandView(await findBrandByWorkspaceId(id));
    if (!view) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(view);
  } catch (error: unknown) {
    return failed(error, '[Brand] GET by workspace');
  }
};

/**
 * PUT upsert the brand. Owner only. Body accepts any subset of:
 *   { name, logoCid, iconCid, primaryColor }
 */
export const PUT = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;
    const workspace = guard.workspace;

    const body = await request.json();
    const patch = _.pick(
      {
        name: body.name,
        logo_cid: body.logoCid,
        icon_cid: body.iconCid,
        primary_color: body.primaryColor,
      },
      MODIFIABLE_FIELDS,
    ) as Partial<Attributes<WorkspaceBrand>>;

    const updated = await upsertBrand(
      workspace.id!,
      workspace.client_id,
      patch,
      teamCtx.user.address!,
    );

    return NextResponse.json(toBrandView(updated));
  } catch (error: unknown) {
    return failed(error, '[Brand] PUT by workspace');
  }
};
```

`src/app/api/my/workspace/[id]/brand/upload/route.ts`. Keep the multipart doc comment, and add "Owner only." to it:

```ts
import { NextResponse } from 'next/server';

import { assertWorkspaceInTeam } from '@/controllers/workspace.controller';
import { pinToDimoIpfs } from '@/services/ipfsUpload.service';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

interface Ctx {
  params: Promise<{ id: string }>;
}

export const POST = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (!file.type) {
      return NextResponse.json({ error: 'content-type required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'file too large' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await pinToDimoIpfs(bytes, file.type);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const handled = apiErrorResponse(error);
    if (handled) return handled;
    console.error({ error, step: '[Brand] POST upload' });
    const message = isErrorWithMessage(error) ? error.message : 'internal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
```

`src/app/api/my/workspace/[id]/brands/route.ts`:

```ts
import _ from 'lodash';
import { NextResponse } from 'next/server';
import type { Attributes } from 'sequelize';

import { assertWorkspaceInTeam } from '@/controllers/workspace.controller';
import { WorkspaceBrand, MODIFIABLE_FIELDS } from '@/models/workspaceBrand.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import {
  createBrand,
  findBrandsByWorkspaceId,
  toBrandView,
} from '@/services/workspaceBrand.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

interface Ctx {
  params: Promise<{ id: string }>;
}

const failed = (error: unknown, step: string) => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error({ error, step });
  const message = isErrorWithMessage(error) ? error.message : 'internal';
  return NextResponse.json({ error: message }, { status: 500 });
};

/**
 * GET /api/my/workspace/:id/brands
 * List all active brands for the workspace, default brand first.
 *
 *   200 BrandView[]
 */
export const GET = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const { id } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const brands = await findBrandsByWorkspaceId(id);
    return NextResponse.json(brands.map(toBrandView));
  } catch (error: unknown) {
    return failed(error, '[Brands] GET list');
  }
};

/**
 * POST /api/my/workspace/:id/brands. Owner only.
 * Create a new brand for the workspace. The first brand is automatically set
 * as the default; subsequent brands are non-default unless `isDefault: true`
 * is explicitly passed.
 *
 *   201 BrandView
 *   403 not owner
 *   404 workspace not found
 */
export const POST = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;
    const workspace = guard.workspace;

    const body = await request.json();
    const patch = _.pick(
      {
        name: body.name,
        logo_cid: body.logoCid,
        icon_cid: body.iconCid,
        primary_color: body.primaryColor,
        is_default: body.isDefault,
      },
      MODIFIABLE_FIELDS,
    ) as Partial<Attributes<WorkspaceBrand>>;

    const brand = await createBrand(
      workspace.id!,
      workspace.client_id,
      patch,
      teamCtx.user.address!,
    );

    return NextResponse.json(toBrandView(brand), { status: 201 });
  } catch (error: unknown) {
    return failed(error, '[Brands] POST create');
  }
};
```

`src/app/api/my/workspace/[id]/brands/[brandId]/route.ts`:

```ts
import _ from 'lodash';
import { NextResponse } from 'next/server';
import type { Attributes } from 'sequelize';

import { assertWorkspaceInTeam } from '@/controllers/workspace.controller';
import { WorkspaceBrand, MODIFIABLE_FIELDS } from '@/models/workspaceBrand.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import {
  deleteBrandById,
  findBrandByIdForWorkspace,
  toBrandView,
  updateBrandById,
} from '@/services/workspaceBrand.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

interface Ctx {
  params: Promise<{ id: string; brandId: string }>;
}

const failed = (error: unknown, step: string) => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error({ error, step });
  const message = isErrorWithMessage(error) ? error.message : 'internal';
  return NextResponse.json({ error: message }, { status: 500 });
};

/** GET /api/my/workspace/:id/brands/:brandId */
export const GET = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const { id, brandId } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const brand = await findBrandByIdForWorkspace(brandId, id);
    if (!brand) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(toBrandView(brand));
  } catch (error: unknown) {
    return failed(error, '[Brands] GET by id');
  }
};

/** PUT /api/my/workspace/:id/brands/:brandId. Owner only. Doesn't change the default. */
export const PUT = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id, brandId } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const body = await request.json();
    const patch = _.pick(
      {
        name: body.name,
        logo_cid: body.logoCid,
        icon_cid: body.iconCid,
        primary_color: body.primaryColor,
      },
      // Exclude is_default — that goes through the /default route.
      MODIFIABLE_FIELDS.filter((f) => f !== 'is_default'),
    ) as Partial<Attributes<WorkspaceBrand>>;

    const updated = await updateBrandById(brandId, id, patch, teamCtx.user.address!);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(toBrandView(updated));
  } catch (error: unknown) {
    return failed(error, '[Brands] PUT by id');
  }
};

/** DELETE /api/my/workspace/:id/brands/:brandId. Owner only. The last brand stays. */
export const DELETE = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id, brandId } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const result = await deleteBrandById(brandId, id);
    if (!result.deleted) {
      const status = result.error === 'not_found' ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    return failed(error, '[Brands] DELETE by id');
  }
};
```

`src/app/api/my/workspace/[id]/brands/[brandId]/default/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { assertWorkspaceInTeam } from '@/controllers/workspace.controller';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { setDefaultBrand, toBrandView } from '@/services/workspaceBrand.service';
import { apiErrorResponse } from '@/utils/apiError';
import { isErrorWithMessage } from '@/utils/error.utils';

interface Ctx {
  params: Promise<{ id: string; brandId: string }>;
}

/**
 * POST /api/my/workspace/:id/brands/:brandId/default. Owner only.
 * Promotes a brand to the workspace default, demoting any previous default.
 */
export const POST = async (request: NextRequest, ctx: Ctx) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const { id, brandId } = await ctx.params;
    const guard = await assertWorkspaceInTeam(teamCtx, id);
    if ('error' in guard) return guard.error;

    const brand = await setDefaultBrand(brandId, id, teamCtx.user.address!);
    if (!brand) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(toBrandView(brand));
  } catch (error: unknown) {
    const handled = apiErrorResponse(error);
    if (handled) return handled;
    console.error({ error, step: '[Brands] POST set-default' });
    const message = isErrorWithMessage(error) ? error.message : 'internal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
```

- [ ] **Step 5: Authorize configurations by the team owner's license**

#80 already limits configurations to the license's on-chain owner. Keep that rule, and ask it about the active team's owner instead of the caller. `src/services/configuration.service.ts` stays as #80 left it.

`src/app/api/my/configurations/route.ts`:

```ts
import { NextResponse } from 'next/server';

import {
  getConfigurationsByClientId,
  saveConfiguration,
} from '@/services/configuration.service';
import { IdentityUnavailableError, isLicenseOwner } from '@/services/identity.service';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { IConfiguration } from '@/types/user';
import { apiErrorResponse } from '@/utils/apiError';

// Configurations belong to the on-chain owner of their license. Under teams that
// is the active team's owner: members read, only the owner writes.
const failed = (error: unknown) => {
  if (error instanceof IdentityUnavailableError) {
    return NextResponse.json(
      { error: 'Could not verify license ownership' },
      { status: 502 },
    );
  }
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error(error);
  return NextResponse.json({ message: 'Error processing receipt' }, { status: 500 });
};

const GET = async (request: NextRequest) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (
      !clientId ||
      !(await isLicenseOwner(teamCtx.ownerAddress ?? undefined, clientId))
    ) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const configurations = await getConfigurationsByClientId({ client_id: clientId });

    const result = configurations.map((c) => ({
      id: c.id,
      configuration_name: c.configuration_name,
      entry_state: (c.configuration?.entryState as string) ?? '',
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (e: unknown) {
    return failed(e);
  }
};

const POST = async (request: NextRequest) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);

    const payload: IConfiguration = await request.json();

    if (
      !payload.client_id ||
      !(await isLicenseOwner(teamCtx.ownerAddress ?? undefined, payload.client_id))
    ) {
      return NextResponse.json({ error: 'You do not own this license' }, { status: 403 });
    }

    const configuration = await saveConfiguration({
      owner_id: teamCtx.user.id!,
      client_id: payload.client_id!,
      configuration_name: payload.configuration_name!,
      configuration: payload.configuration!,
    });

    return NextResponse.json({ id: configuration.id }, { status: 201 });
  } catch (e: unknown) {
    return failed(e);
  }
};

export { GET, POST };
```

`src/app/api/my/configurations/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server';

import {
  deleteConfiguration,
  getConfiguration,
  updateConfiguration,
} from '@/services/configuration.service';
import { IdentityUnavailableError, isLicenseOwner } from '@/services/identity.service';
import {
  requireOwner,
  resolveTeamContext,
  TeamContext,
} from '@/services/teamContext.service';
import { IConfiguration } from '@/types/user';
import { apiErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

// A configuration belongs to whoever owns its license on-chain; under teams, the
// active team's owner. Everyone else gets the same 404 as for a configuration that
// doesn't exist: configuration IDs are public (they're in Login with DIMO URLs).
const findTeamConfiguration = async (teamCtx: TeamContext, id: string) => {
  const configuration = await getConfiguration({ configuration_id: id });
  if (!configuration) return null;
  return (await isLicenseOwner(
    teamCtx.ownerAddress ?? undefined,
    configuration.client_id,
  ))
    ? configuration
    : null;
};

const notFound = () =>
  NextResponse.json({ error: 'Configuration not found' }, { status: 404 });

const failed = (error: unknown, message: string) => {
  if (error instanceof IdentityUnavailableError) {
    return NextResponse.json(
      { error: 'Could not verify license ownership' },
      { status: 502 },
    );
  }
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error(error);
  return NextResponse.json({ message }, { status: 500 });
};

const GET = async (request: NextRequest, { params }: Params) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const configuration = await findTeamConfiguration(teamCtx, params.id);
    if (!configuration) return notFound();

    return NextResponse.json({ configuration }, { status: 200 });
  } catch (e: unknown) {
    return failed(e, 'Error processing receipt');
  }
};

const PUT = async (request: NextRequest, { params }: Params) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    if (!(await findTeamConfiguration(teamCtx, params.id))) return notFound();

    const payload: IConfiguration = await request.json();

    await updateConfiguration({
      configuration_id: params.id,
      configuration_name: payload.configuration_name!,
      configuration: payload.configuration!,
    });

    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return failed(e, 'Error processing receipt');
  }
};

const DELETE = async (request: NextRequest, { params }: Params) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    if (!(await findTeamConfiguration(teamCtx, params.id))) return notFound();

    await deleteConfiguration({ configuration_id: params.id });

    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    return failed(e, 'Error deleting configuration');
  }
};

export { GET, PUT, DELETE };
```

Task 2's configuration regressions must still pass unchanged. A caller with no header is their own team's owner, so #80's behavior is preserved exactly.

- [ ] **Step 6: Scope simulated vehicles to the team owner**

`src/app/api/my/simulated-vehicles/route.ts`:

```ts
import { NextResponse } from 'next/server';

import {
  countSimulatedVehiclesByUserAndClient,
  createSimulatedVehicle,
  getSimulatedVehiclesByUserAndClient,
} from '@/controllers/simulatedVehicle.controller';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { apiErrorResponse } from '@/utils/apiError';

const MAX_SIMULATED_VEHICLES = 1;

const failed = (error: unknown, message: string) => {
  const handled = apiErrorResponse(error);
  if (handled) return handled;
  console.error(error);
  return NextResponse.json({ message }, { status: 500 });
};

const GET = async (request: NextRequest) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Simulated vehicles belong to the team owner, who minted them.
    const vehicles = await getSimulatedVehiclesByUserAndClient(
      teamCtx.owner.id!,
      clientId,
    );

    return NextResponse.json({ data: vehicles }, { status: 200 });
  } catch (e: unknown) {
    return failed(e, 'Error fetching simulated vehicles');
  }
};

const POST = async (request: NextRequest) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);
    const userId = teamCtx.user.id!;

    const body = await request.json();
    const { token_id, make, model, year, client_id } = body as {
      token_id: number;
      make: string;
      model: string;
      year: number;
      client_id: string;
    };

    if (!token_id || !make || !model || !year || !client_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingCount = await countSimulatedVehiclesByUserAndClient(userId, client_id);

    if (existingCount >= MAX_SIMULATED_VEHICLES) {
      return NextResponse.json(
        { error: 'Simulated vehicle limit reached for this client' },
        { status: 409 },
      );
    }

    const vehicle = await createSimulatedVehicle({
      user_id: userId,
      token_id,
      make,
      model,
      year,
      client_id,
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (e: unknown) {
    return failed(e, 'Error creating simulated vehicle');
  }
};

export { GET, POST };
```

`src/app/api/my/simulated-vehicles/[vehicleId]/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { deleteSimulatedVehicleByIdAndUser } from '@/controllers/simulatedVehicle.controller';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { apiErrorResponse } from '@/utils/apiError';

const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) => {
  try {
    const teamCtx = await resolveTeamContext(request);
    requireOwner(teamCtx);

    const { vehicleId } = await params;

    const deleted = await deleteSimulatedVehicleByIdAndUser(vehicleId, teamCtx.user.id!);

    if (deleted === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: unknown) {
    const handled = apiErrorResponse(e);
    if (handled) return handled;
    console.error(e);
    return NextResponse.json(
      { message: 'Error deleting simulated vehicle' },
      { status: 500 },
    );
  }
};

export { DELETE };
```

- [ ] **Step 7: Run the tests and check no other caller used the removed guard**

Run: `grep -rn "assertOwnsWorkspace" src; npm test && npm run typecheck`
Expected: grep prints nothing, all tests pass, and typecheck exits 0.

- [ ] **Step 8: Commit**

```bash
npx prettier --write src/controllers/workspace.controller.ts src/app/api/my/workspace src/app/api/my/configurations src/app/api/my/simulated-vehicles test
git add src test
git commit -m "feat(teams): key branding, configurations and simulated vehicles to the team owner"
```

---

### Task 7: `GET /api/my/teams`, `GET /api/my/team/members`, `DELETE /api/my/team/members/:id`

**Files:**

- Create: `src/services/teamMembers.service.ts`
- Create: `src/app/api/my/teams/route.ts`, `src/app/api/my/team/members/route.ts`, `src/app/api/my/team/members/[id]/route.ts`
- Test: `test/api/teams-and-members.test.ts`

**Interfaces:**

- Consumes (Tasks 3–4): `TeamContext`, `requireUser`, `resolveTeamContext`, `requireOwner`, `activeMembershipWhere`, `LicenseSigner`, `LicenseSignerHolder`, `SignerKinds`, `errorResponse`.
- Produces:
  - `toTeamSummary(args: { team: Team; company: Company | null; owner: User; role: TeamRole; callerId: string }): TeamSummary`.
  - `toTeamMember(row: TeamCollaborator): TeamMember`. Load `row.User` with `include: [{ model: User }]` for accepted rows. For pending rows `User` is unset and `email` comes from the row.
  - `listTeamsForUser(user: User): Promise<TeamSummary[]>`: personal team first, then by name. Teams whose owner has no wallet are left out.
  - `listMembers(ctx: TeamContext): Promise<TeamMember[]>`: owner first, then accepted, pending and revoked-but-still-a-signer, each oldest first.
  - `removeMember(ctx: TeamContext, membershipId: string): Promise<void>`: 404 `NOT_FOUND`, 400 `CANNOT_REMOVE_OWNER`, 403 `OWNER_ONLY`.

- [ ] **Step 1: Write the failing tests**

`test/api/teams-and-members.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { DELETE as removeMemberRoute } from '@/app/api/my/team/members/[id]/route';
import { GET as listMembersRoute } from '@/app/api/my/team/members/route';
import { GET as listTeamsRoute } from '@/app/api/my/teams/route';
import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { addMember, createOwner, createOwnerFor, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

describe('GET /api/my/teams', () => {
  it('lists the personal team first, then teams the caller joined', async () => {
    const zeta = await createOwner('Zeta');
    const person = await createUser({ name: 'Pat' });
    await addMember(zeta.team.id!, person);
    const own = await createOwnerFor(person, 'Mine');

    const response = await read(
      await listTeamsRoute(
        await request('GET', '/api/my/teams', { as: person.address! }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body.teams).toEqual([
      {
        id: own.team.id,
        name: 'Mine Co',
        companyName: 'Mine Co',
        role: 'OWNER',
        ownerUserId: person.id,
        ownerEmail: person.email,
        ownerAddress: getAddress(person.address!),
        isPersonal: true,
      },
      {
        id: zeta.team.id,
        name: 'Zeta Co',
        companyName: 'Zeta Co',
        role: 'MEMBER',
        ownerUserId: zeta.user.id,
        ownerEmail: zeta.user.email,
        ownerAddress: getAddress(zeta.user.address!),
        isPersonal: false,
      },
    ]);
  });

  it('leaves out memberships that were removed', async () => {
    const zeta = await createOwner('Zeta');
    const person = await createUser();
    const row = await addMember(zeta.team.id!, person);
    await row.update({ status: InvitationStatuses.REVOKED, deleted: true });

    const response = await read(
      await listTeamsRoute(
        await request('GET', '/api/my/teams', { as: person.address! }),
      ),
    );

    expect(response.body.teams).toEqual([]);
  });

  it('ignores a stale X-Team-Id for a team the caller has left', async () => {
    const zeta = await createOwner('Zeta');
    const person = await createUser();
    const row = await addMember(zeta.team.id!, person);
    await row.update({ status: InvitationStatuses.REVOKED, deleted: true });
    const own = await createOwnerFor(person, 'Mine');

    const response = await read(
      await listTeamsRoute(
        await request('GET', '/api/my/teams', {
          as: person.address!,
          teamId: zeta.team.id!,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body.teams.map((team: { id: string }) => team.id)).toEqual([
      own.team.id,
    ]);
  });

  it('refuses an anonymous caller', async () => {
    const response = await read(
      await listTeamsRoute(await request('GET', '/api/my/teams')),
    );

    expect(response).toEqual({
      status: 401,
      body: { message: 'User not found', code: 'UNAUTHORIZED' },
    });
  });
});

describe('GET /api/my/team/members', () => {
  it('shows the owner, members and pending invites, with verified signers', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser({ name: 'Mia' });
    await member.update({ signer_address: '0x' + 'ab'.repeat(20) });
    await addMember(acme.team.id!, member);
    const expires = new Date(Date.now() + 86_400_000);
    await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'invitee@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
      invite_token_hash: 'a'.repeat(64),
      invite_expires_at: expires,
    });

    const response = await read(
      await listMembersRoute(
        await request('GET', '/api/my/team/members', {
          as: member.address!,
          teamId: acme.team.id!,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(
      response.body.members.map((m: { email: string; role: string; status: string }) => [
        m.email,
        m.role,
        m.status,
      ]),
    ).toEqual([
      [acme.user.email, 'OWNER', 'ACCEPTED'],
      [member.email, 'MEMBER', 'ACCEPTED'],
      ['invitee@x.test', 'MEMBER', 'PENDING'],
    ]);
    const [owner, mia, invitee] = response.body.members;
    expect(owner.signerAddress).toBeNull();
    expect(mia).toMatchObject({
      userId: member.id,
      name: 'Mia',
      signerAddress: getAddress('0x' + 'ab'.repeat(20)),
      inviteExpiresAt: null,
    });
    expect(invitee).toMatchObject({
      userId: null,
      name: null,
      inviteExpiresAt: expires.toISOString(),
    });
  });

  it('keeps showing a removed member who is still a signer on a team license', async () => {
    const acme = await createOwner('Acme');
    const gone = await createUser({ name: 'Gone' });
    const row = await addMember(acme.team.id!, gone);
    await row.update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
      deleted_at: new Date(),
    });
    const key = await LicenseSigner.create({
      team_id: acme.team.id!,
      license_token_id: 7,
      signer_address: '0x' + 'cd'.repeat(20),
      kind: SignerKinds.MEMBER,
    });
    await LicenseSignerHolder.create({ signer_id: key.id!, user_id: gone.id });

    const response = await read(
      await listMembersRoute(
        await request('GET', '/api/my/team/members', { as: acme.user.address! }),
      ),
    );

    expect(
      response.body.members.map((m: { email: string; status: string }) => [
        m.email,
        m.status,
      ]),
    ).toEqual([
      [acme.user.email, 'ACCEPTED'],
      [gone.email, 'REVOKED'],
    ]);
  });

  it('refuses someone outside the team', async () => {
    const acme = await createOwner('Acme');
    const outsider = await createOwner('Other');

    const response = await read(
      await listMembersRoute(
        await request('GET', '/api/my/team/members', {
          as: outsider.user.address!,
          teamId: acme.team.id!,
        }),
      ),
    );

    expect(response.body.code).toBe('NOT_A_MEMBER');
  });
});

describe('DELETE /api/my/team/members/:id', () => {
  const remove = async (as: string, id: string, teamId?: string) =>
    read(
      await removeMemberRoute(
        await request('DELETE', `/api/my/team/members/${id}`, { as, teamId }),
        { params: { id } },
      ),
    );

  it('lets the owner remove a member, who then loses the team at once', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    const row = await addMember(acme.team.id!, member);

    expect(await remove(acme.user.address!, row.id!)).toEqual({
      status: 204,
      body: null,
    });

    await row.reload();
    expect(row).toMatchObject({ status: 'REVOKED', deleted: true });
    const after = await read(
      await listMembersRoute(
        await request('GET', '/api/my/team/members', {
          as: member.address!,
          teamId: acme.team.id!,
        }),
      ),
    );
    expect(after.body.code).toBe('NOT_A_MEMBER');
  });

  it('refuses members, the owner row, and rows of other teams', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    const row = await addMember(acme.team.id!, member);
    const other = await createOwner('Other');
    const otherMember = await createUser();
    const otherRow = await addMember(other.team.id!, otherMember);

    expect((await remove(member.address!, row.id!, acme.team.id!)).body.code).toBe(
      'OWNER_ONLY',
    );
    expect(await remove(acme.user.address!, acme.membership.id!)).toEqual({
      status: 400,
      body: { message: 'The team owner cannot be removed', code: 'CANNOT_REMOVE_OWNER' },
    });
    expect(await remove(acme.user.address!, otherRow.id!)).toEqual({
      status: 404,
      body: { message: 'Member not found', code: 'NOT_FOUND' },
    });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/teams-and-members.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/my/team/members/[id]/route"`.

- [ ] **Step 3: Write `src/services/teamMembers.service.ts`**

```ts
import { Op } from 'sequelize';
import { getAddress } from 'viem';

import { Company } from '@/models/company.model';
import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { Team } from '@/models/team.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import { activeMembershipWhere } from '@/services/membership.service';
import { requireOwner, TeamContext } from '@/services/teamContext.service';
import type { MembershipStatus, TeamMember, TeamRole, TeamSummary } from '@/types/teams';
import { ApiError } from '@/utils/apiError';

const notDeleted = { [Op.not]: true };

const toChecksum = (address: string) => getAddress(address) as `0x${string}`;

export const toTeamSummary = ({
  team,
  company,
  owner,
  role,
  callerId,
}: {
  team: Team;
  company: Company | null;
  owner: User;
  role: TeamRole;
  callerId: string;
}): TeamSummary => ({
  id: team.id!,
  name: team.name,
  companyName: company?.name ?? null,
  role,
  ownerUserId: owner.id!,
  ownerEmail: owner.email,
  ownerAddress: toChecksum(owner.address!),
  isPersonal: team.created_by === callerId,
});

export const toTeamMember = (row: TeamCollaborator): TeamMember => {
  const user = row.User ?? null;
  const createdAt = row.get('created_at') as Date;
  return {
    id: row.id!,
    userId: row.user_id ?? null,
    name: user?.name ?? null,
    email: user?.email ?? row.email ?? '',
    role: row.role as TeamRole,
    status: row.status as MembershipStatus,
    signerAddress: user?.signer_address ? toChecksum(user.signer_address) : null,
    invitedAt: createdAt.toISOString(),
    inviteExpiresAt:
      row.status === InvitationStatuses.PENDING && row.invite_expires_at
        ? row.invite_expires_at.toISOString()
        : null,
  };
};

export const listTeamsForUser = async (user: User): Promise<TeamSummary[]> => {
  const memberships = await TeamCollaborator.findAll({
    where: { user_id: user.id!, ...activeMembershipWhere },
  });

  const summaries: TeamSummary[] = [];
  for (const membership of memberships) {
    const team = await Team.findOne({
      where: { id: membership.team_id, deleted: notDeleted },
    });
    if (!team) continue;
    const owner =
      team.created_by === user.id
        ? user
        : await User.findOne({ where: { id: team.created_by } });
    if (!owner?.address) {
      console.warn({ step: '[Teams] Team owner has no wallet', teamId: team.id });
      continue;
    }
    const company = await Company.findOne({ where: { id: team.company_id } });
    summaries.push(
      toTeamSummary({
        team,
        company,
        owner,
        role: membership.role as TeamRole,
        callerId: user.id!,
      }),
    );
  }

  return summaries.sort(
    (a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.name.localeCompare(b.name),
  );
};

const STATUS_ORDER: Record<MembershipStatus, number> = {
  ACCEPTED: 0,
  PENDING: 1,
  REVOKED: 2,
};

export const listMembers = async (ctx: TeamContext): Promise<TeamMember[]> => {
  if (!ctx.team) return [];
  const teamId = ctx.team.id!;

  const rows = await TeamCollaborator.findAll({
    where: {
      team_id: teamId,
      deleted: notDeleted,
      status: { [Op.in]: [InvitationStatuses.ACCEPTED, InvitationStatuses.PENDING] },
    },
    include: [{ model: User }],
    order: [['created_at', 'ASC']],
  });
  const activeUserIds = new Set(rows.map((row) => row.user_id).filter(Boolean));

  // A removed member stays listed while the registry still shows them holding
  // an enabled member key, so a revoke that failed on-chain stays visible.
  const memberKeys = await LicenseSigner.findAll({
    where: { team_id: teamId, kind: SignerKinds.MEMBER, disabled_at: null },
    include: [{ model: LicenseSignerHolder, as: 'holders' }],
  });
  const stillSigners = new Set<string>();
  for (const key of memberKeys) {
    for (const holder of key.holders ?? []) {
      if (holder.user_id && !activeUserIds.has(holder.user_id))
        stillSigners.add(holder.user_id);
    }
  }

  const revoked: TeamCollaborator[] = [];
  for (const userId of stillSigners) {
    const latest = await TeamCollaborator.findOne({
      where: { team_id: teamId, user_id: userId, status: InvitationStatuses.REVOKED },
      include: [{ model: User }],
      order: [['updated_at', 'DESC']],
    });
    if (latest) revoked.push(latest);
  }

  return [...rows, ...revoked]
    .map(toTeamMember)
    .sort(
      (a, b) =>
        Number(b.role === TeamRoles.OWNER) - Number(a.role === TeamRoles.OWNER) ||
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.invitedAt.localeCompare(b.invitedAt),
    );
};

export const removeMember = async (ctx: TeamContext, membershipId: string) => {
  requireOwner(ctx);
  const row = ctx.team
    ? await TeamCollaborator.findOne({
        where: {
          id: membershipId,
          team_id: ctx.team.id!,
          status: InvitationStatuses.ACCEPTED,
          deleted: notDeleted,
        },
      })
    : null;
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Member not found');
  if (row.role === TeamRoles.OWNER) {
    throw new ApiError(400, 'CANNOT_REMOVE_OWNER', 'The team owner cannot be removed');
  }
  await row.update({
    status: InvitationStatuses.REVOKED,
    deleted: true,
    deleted_at: new Date(),
  });
};
```

- [ ] **Step 4: Write the routes**

`src/app/api/my/teams/route.ts`:

```ts
import { requireUser } from '@/services/teamContext.service';
import { listTeamsForUser } from '@/services/teamMembers.service';
import { errorResponse } from '@/utils/apiError';

// Every team the caller belongs to, for the console's team switcher. Ignores X-Team-Id.
export const GET = async (request: NextRequest) => {
  try {
    const user = await requireUser(request);
    return Response.json({ teams: await listTeamsForUser(user) });
  } catch (error: unknown) {
    return errorResponse(error, '[Teams] List my teams');
  }
};
```

`src/app/api/my/team/members/route.ts`:

```ts
import { resolveTeamContext } from '@/services/teamContext.service';
import { listMembers } from '@/services/teamMembers.service';
import { errorResponse } from '@/utils/apiError';

export const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json({ members: await listMembers(ctx) });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] List members');
  }
};
```

`src/app/api/my/team/members/[id]/route.ts`:

```ts
import { resolveTeamContext } from '@/services/teamContext.service';
import { removeMember } from '@/services/teamMembers.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const DELETE = async (request: NextRequest, { params: { id } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    await removeMember(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Remove member');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/teams-and-members.test.ts`
Expected: `9 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/teamMembers.service.ts src/app/api/my/teams src/app/api/my/team/members test
git add src/services/teamMembers.service.ts src/app/api/my/teams src/app/api/my/team/members test
git commit -m "feat(teams): list my teams and team members, and let the owner remove a member"
```

---

### Task 8: Invitations: create, resend, cancel and accept

**Files:**

- Create: `src/services/invitation.service.ts`
- Create: `src/app/api/my/team/invitations/route.ts`, `src/app/api/my/team/invitations/[id]/route.ts`, `src/app/api/my/team/invitations/[id]/resend/route.ts`, `src/app/api/invitations/accept/route.ts`
- Test: `test/api/invitations.test.ts`

**Interfaces:**

- Consumes (Tasks 3, 4 and 7): `TeamContext`, `requireOwner`, `requireUser`, `resolveTeamContext`, `findMembership`, `activeMembershipWhere`, `toTeamMember`, `toTeamSummary`, `ApiError`, `errorResponse`, `generateTeamInvitationTemplate(userName, cta)` from `@/templates/team` (existing, unchanged).
- Produces:
  - `generateInviteToken(): string`, `hashInviteToken(token: string): string`, `inviteLink(token: string): string`.
  - `createInvitation(ctx, rawEmail: unknown): Promise<TeamMember>`.
  - `resendInvitation(ctx, id: string): Promise<TeamMember>`.
  - `cancelInvitation(ctx, id: string): Promise<void>`.
  - `acceptInvitation(user: User, rawToken: unknown): Promise<TeamSummary>`.
- Errors, beyond those listed in C7: `502 EMAIL_FAILED` when the email can't be sent. On create, the row is revoked. On resend, it keeps its new token, and the owner can try again. This is proposed as a C7 addition.

- [ ] **Step 1: Write the failing tests**

`test/api/invitations.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { POST as acceptRoute } from '@/app/api/invitations/accept/route';
import { DELETE as cancelRoute } from '@/app/api/my/team/invitations/[id]/route';
import { POST as resendRoute } from '@/app/api/my/team/invitations/[id]/resend/route';
import { POST as inviteRoute } from '@/app/api/my/team/invitations/route';
import { DELETE as removeMemberRoute } from '@/app/api/my/team/members/[id]/route';
import { GET as listMembersRoute } from '@/app/api/my/team/members/route';
import { TeamCollaborator } from '@/models/teamCollaborator.model';
import { hashInviteToken } from '@/services/invitation.service';
import Mailer from '@/utils/mailer';
import { sql } from '../support/db';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

type Owner = Awaited<ReturnType<typeof createOwner>>;

const invite = async (
  owner: Owner,
  email: unknown,
  as = owner.user.address!,
  teamId?: string,
) =>
  read(
    await inviteRoute(
      await request('POST', '/api/my/team/invitations', { as, teamId, body: { email } }),
    ),
  );

const accept = async (as: string | undefined, token: unknown) =>
  read(
    await acceptRoute(
      await request('POST', '/api/invitations/accept', { as, body: { token } }),
    ),
  );

/** The token from the link in the nth email sent during this test. */
const sentToken = (n = 0) => {
  const { html } = vi.mocked(Mailer.sendMail).mock.calls[n][0];
  return /sign-in\?invite=([A-Za-z0-9_-]+)/.exec(html)![1];
};

describe('POST /api/my/team/invitations', () => {
  it('creates a pending invite, emails a link, and stores only the token hash', async () => {
    const acme = await createOwner('Acme');

    const response = await invite(acme, 'new.person@x.test');

    expect(response.status).toBe(201);
    expect(response.body.member).toMatchObject({
      userId: null,
      email: 'new.person@x.test',
      role: 'MEMBER',
      status: 'PENDING',
      signerAddress: null,
    });
    const [mail] = vi.mocked(Mailer.sendMail).mock.calls[0];
    expect(mail.to).toBe('new.person@x.test');
    expect(mail.html).toContain('http://localhost:3000/sign-in?invite=');
    const token = sentToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    const [row] = await sql<{ invite_token_hash: string }>(
      'SELECT invite_token_hash FROM team_collaborators WHERE id = :id',
      { id: response.body.member.id },
    );
    expect(row.invite_token_hash).toBe(hashInviteToken(token));
    expect(row.invite_token_hash).not.toContain(token);
  });

  it('invites people who already have an account', async () => {
    const acme = await createOwner('Acme');
    const existing = await createUser({ email: 'existing@x.test' });

    expect((await invite(acme, existing.email)).status).toBe(201);
  });

  it('refuses bad emails, members, current members and duplicate invites, ignoring case and spaces', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser({ email: 'mia@x.test' });
    await addMember(acme.team.id!, member);
    await invite(acme, '  Alice@X.test ');

    expect((await invite(acme, 'not-an-email')).body.code).toBe('INVALID_EMAIL');
    expect((await invite(acme, 42)).body.code).toBe('INVALID_EMAIL');
    expect((await invite(acme, 'MIA@x.test')).body).toEqual({
      message: 'MIA@x.test is already a member of this team',
      code: 'ALREADY_MEMBER',
    });
    expect((await invite(acme, 'ALICE@x.test')).body.code).toBe('ALREADY_INVITED');
    expect(
      (await invite(acme, 'x@x.test', member.address!, acme.team.id!)).body.code,
    ).toBe('OWNER_ONLY');
  });

  it('refreshes an expired invite instead of refusing it', async () => {
    const acme = await createOwner('Acme');
    const first = await invite(acme, 'late@x.test');
    await sql(
      "UPDATE team_collaborators SET invite_expires_at = now() - interval '1 minute' WHERE id = :id",
      { id: first.body.member.id },
    );

    const again = await invite(acme, 'late@x.test');

    expect(again.status).toBe(201);
    expect(again.body.member.id).toBe(first.body.member.id);
    expect(sentToken(1)).not.toBe(sentToken(0));
  });

  it('answers 502 EMAIL_FAILED and leaves no pending invite when the email cannot be sent', async () => {
    const acme = await createOwner('Acme');
    vi.mocked(Mailer.sendMail).mockRejectedValueOnce(new Error('Error sending email'));

    const response = await invite(acme, 'bounce@x.test');

    expect(response).toEqual({
      status: 502,
      body: { message: 'The invitation email could not be sent', code: 'EMAIL_FAILED' },
    });
    expect((await invite(acme, 'bounce@x.test')).status).toBe(201);
  });
});

describe('resend and cancel', () => {
  it('resend replaces the token; the old link stops working', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const oldToken = sentToken(0);
    const pat = await createUser({ email: 'pat@x.test' });

    const resent = await read(
      await resendRoute(await request('POST', '/x', { as: acme.user.address! }), {
        params: { id: created.body.member.id },
      }),
    );

    expect(resent.status).toBe(200);
    expect(resent.body.member.inviteExpiresAt).not.toBeNull();
    expect((await accept(pat.address!, oldToken)).body.code).toBe('INVITE_INVALID');
    expect((await accept(pat.address!, sentToken(1))).status).toBe(200);
  });

  it('cancel withdraws the invite and its link', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const pat = await createUser({ email: 'pat@x.test' });

    const cancelled = await cancelRoute(
      await request('DELETE', '/x', { as: acme.user.address! }),
      { params: { id: created.body.member.id } },
    );

    expect(cancelled.status).toBe(204);
    expect((await accept(pat.address!, sentToken())).body.code).toBe('INVITE_INVALID');
  });

  it('refuses unknown invites and members', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    await addMember(acme.team.id!, member);
    const created = await invite(acme, 'pat@x.test');
    const params = { params: { id: created.body.member.id } };

    const unknown = await read(
      await resendRoute(await request('POST', '/x', { as: acme.user.address! }), {
        params: { id: 'nope' },
      }),
    );
    const asMember = await read(
      await cancelRoute(
        await request('DELETE', '/x', { as: member.address!, teamId: acme.team.id! }),
        params,
      ),
    );

    expect(unknown).toEqual({
      status: 404,
      body: { message: 'Invitation not found', code: 'NOT_FOUND' },
    });
    expect(asMember.body.code).toBe('OWNER_ONLY');
  });
});

describe('POST /api/invitations/accept', () => {
  it('makes the invitee a member and returns the team', async () => {
    const acme = await createOwner('Acme');
    await invite(acme, '  Alice@X.test ');
    const alice = await createUser({ email: 'alice@x.test', name: 'Alice' });

    const response = await accept(alice.address!, sentToken());

    expect(response.status).toBe(200);
    expect(response.body.team).toMatchObject({
      id: acme.team.id,
      role: 'MEMBER',
      isPersonal: false,
      ownerUserId: acme.user.id,
    });
    const members = await read(
      await listMembersRoute(
        await request('GET', '/x', { as: alice.address!, teamId: acme.team.id! }),
      ),
    );
    expect(members.status).toBe(200);
  });

  it('refuses a different account, an expired link, garbage and a second use', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'alice@x.test');
    const token = sentToken();
    const alice = await createUser({ email: 'alice@x.test' });
    const bob = await createUser({ email: 'bob@x.test' });

    expect(await accept(bob.address!, token)).toEqual({
      status: 403,
      body: {
        message: 'This invitation was sent to a different email address',
        code: 'INVITE_EMAIL_MISMATCH',
      },
    });
    expect((await accept(alice.address!, 'garbage')).body.code).toBe('INVITE_INVALID');
    expect((await accept(alice.address!, '')).body.code).toBe('INVITE_INVALID');

    await sql(
      "UPDATE team_collaborators SET invite_expires_at = now() - interval '1 second' WHERE id = :id",
      { id: created.body.member.id },
    );
    expect(await accept(alice.address!, token)).toEqual({
      status: 400,
      body: {
        message: 'This invitation has expired. Ask the team owner to send a new one.',
        code: 'INVITE_EXPIRED',
      },
    });

    await sql(
      "UPDATE team_collaborators SET invite_expires_at = now() + interval '1 day' WHERE id = :id",
      { id: created.body.member.id },
    );
    expect((await accept(alice.address!, token)).status).toBe(200);
    expect((await accept(alice.address!, token)).body.code).toBe('INVITE_INVALID');
    const memberships = await TeamCollaborator.count({
      where: { team_id: acme.team.id!, user_id: alice.id! },
    });
    expect(memberships).toBe(1);
  });

  it('answers ALREADY_MEMBER when the invitee is already in the team', async () => {
    const acme = await createOwner('Acme');
    const alice = await createUser({ email: 'alice@x.test' });
    await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'alice@x.test',
      role: 'MEMBER',
      status: 'PENDING',
      invite_token_hash: hashInviteToken('known-token'),
      invite_expires_at: new Date(Date.now() + 60_000),
    });
    await addMember(acme.team.id!, alice);

    expect(await accept(alice.address!, 'known-token')).toEqual({
      status: 409,
      body: { message: 'You are already a member of this team', code: 'ALREADY_MEMBER' },
    });
  });

  it('lets a removed member be invited and accept again', async () => {
    const acme = await createOwner('Acme');
    const alice = await createUser({ email: 'alice@x.test' });
    const row = await addMember(acme.team.id!, alice);
    await removeMemberRoute(await request('DELETE', '/x', { as: acme.user.address! }), {
      params: { id: row.id! },
    });

    expect((await invite(acme, 'alice@x.test')).status).toBe(201);
    expect((await accept(alice.address!, sentToken())).status).toBe(200);
  });

  it('refuses an anonymous caller', async () => {
    expect((await accept(undefined, 'anything')).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/invitations.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/invitations/accept/route"`.

- [ ] **Step 3: Write `src/services/invitation.service.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';
import { Op, col, fn, where as sqlWhere } from 'sequelize';
import isEmail from 'validator/lib/isEmail';

import config from '@/config';
import { Company } from '@/models/company.model';
import { Team } from '@/models/team.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import { activeMembershipWhere, findMembership } from '@/services/membership.service';
import { requireOwner, TeamContext } from '@/services/teamContext.service';
import { toTeamMember, toTeamSummary } from '@/services/teamMembers.service';
import { generateTeamInvitationTemplate } from '@/templates/team';
import type { TeamMember, TeamSummary } from '@/types/teams';
import { ApiError } from '@/utils/apiError';
import Mailer from '@/utils/mailer';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const notDeleted = { [Op.not]: true };

export const generateInviteToken = () => randomBytes(32).toString('base64url');

/** Only this hash is stored; the token itself exists in the email alone. */
export const hashInviteToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const inviteLink = (token: string) =>
  `${config.frontendUrl}sign-in?invite=${token}`;

const freshInvite = () => {
  const token = generateInviteToken();
  return {
    token,
    fields: {
      invite_token_hash: hashInviteToken(token),
      invite_expires_at: new Date(Date.now() + INVITE_TTL_MS),
    },
  };
};

const teamOf = (ctx: TeamContext) => {
  if (!ctx.team)
    throw new ApiError(403, 'NOT_A_MEMBER', 'Finish setting up your team first');
  return ctx.team;
};

const sendInvite = async (ctx: TeamContext, email: string, token: string) => {
  const inviter = ctx.user.name?.split(' ')[0] || ctx.user.email;
  try {
    await Mailer.sendMail({
      to: email,
      subject: `${inviter} invited you to ${teamOf(ctx).name} on the DIMO Developer Console`,
      html: generateTeamInvitationTemplate(inviter, inviteLink(token)),
    });
  } catch (error) {
    console.error({ error, step: '[Invitations] Send invite email' });
    throw new ApiError(502, 'EMAIL_FAILED', 'The invitation email could not be sent');
  }
};

const findPendingInTeam = (teamId: string, id: string) =>
  TeamCollaborator.findOne({
    where: {
      id,
      team_id: teamId,
      status: InvitationStatuses.PENDING,
      deleted: notDeleted,
    },
  });

export const createInvitation = async (
  ctx: TeamContext,
  rawEmail: unknown,
): Promise<TeamMember> => {
  requireOwner(ctx);
  const team = teamOf(ctx);
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  if (!isEmail(email))
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address');
  const lower = email.toLowerCase();

  const members = await TeamCollaborator.findAll({
    where: { team_id: team.id!, ...activeMembershipWhere },
    include: [{ model: User }],
  });
  if (members.some((row) => row.User?.email.toLowerCase() === lower)) {
    throw new ApiError(
      409,
      'ALREADY_MEMBER',
      `${email} is already a member of this team`,
    );
  }

  const pending = await TeamCollaborator.findOne({
    where: {
      team_id: team.id!,
      status: InvitationStatuses.PENDING,
      deleted: notDeleted,
      [Op.and]: [sqlWhere(fn('lower', col('email')), lower)],
    },
  });
  if (pending?.invite_expires_at && pending.invite_expires_at.getTime() > Date.now()) {
    throw new ApiError(
      409,
      'ALREADY_INVITED',
      `${email} already has a pending invitation`,
    );
  }

  const { token, fields } = freshInvite();
  // An expired invite, or one sent before links carried a token, is refreshed in place.
  const row = pending
    ? await pending.update({ ...fields, invited_by: ctx.user.id })
    : await TeamCollaborator.create({
        team_id: team.id!,
        email,
        role: TeamRoles.MEMBER,
        status: InvitationStatuses.PENDING,
        invited_by: ctx.user.id,
        ...fields,
      });

  try {
    await sendInvite(ctx, email, token);
  } catch (error) {
    await row.update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
      deleted_at: new Date(),
      invite_token_hash: null,
    });
    throw error;
  }
  return toTeamMember(row);
};

export const resendInvitation = async (
  ctx: TeamContext,
  id: string,
): Promise<TeamMember> => {
  requireOwner(ctx);
  const row = await findPendingInTeam(teamOf(ctx).id!, id);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found');

  const { token, fields } = freshInvite();
  await row.update({ ...fields, invited_by: ctx.user.id });
  await sendInvite(ctx, row.email!, token);
  return toTeamMember(row);
};

export const cancelInvitation = async (ctx: TeamContext, id: string) => {
  requireOwner(ctx);
  const row = await findPendingInTeam(teamOf(ctx).id!, id);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found');

  await row.update({
    status: InvitationStatuses.REVOKED,
    deleted: true,
    deleted_at: new Date(),
    invite_token_hash: null,
  });
};

export const acceptInvitation = async (
  user: User,
  rawToken: unknown,
): Promise<TeamSummary> => {
  const invalid = () =>
    new ApiError(400, 'INVITE_INVALID', 'This invitation link is not valid');
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token) throw invalid();

  const row = await TeamCollaborator.findOne({
    where: { invite_token_hash: hashInviteToken(token), deleted: notDeleted },
  });
  if (!row || row.status !== InvitationStatuses.PENDING) throw invalid();
  if (!row.invite_expires_at || row.invite_expires_at.getTime() <= Date.now()) {
    throw new ApiError(
      400,
      'INVITE_EXPIRED',
      'This invitation has expired. Ask the team owner to send a new one.',
    );
  }
  if ((row.email ?? '').trim().toLowerCase() !== user.email.trim().toLowerCase()) {
    throw new ApiError(
      403,
      'INVITE_EMAIL_MISMATCH',
      'This invitation was sent to a different email address',
    );
  }
  if (await findMembership(row.team_id, user.id!)) {
    throw new ApiError(409, 'ALREADY_MEMBER', 'You are already a member of this team');
  }

  const team = await Team.findOne({ where: { id: row.team_id, deleted: notDeleted } });
  const owner = team ? await User.findOne({ where: { id: team.created_by } }) : null;
  if (!team || !owner?.address) throw invalid();

  await row.update({
    status: InvitationStatuses.ACCEPTED,
    user_id: user.id,
    invite_token_hash: null,
    invite_expires_at: null,
  });

  const company = await Company.findOne({ where: { id: team.company_id } });
  return toTeamSummary({
    team,
    company,
    owner,
    role: TeamRoles.MEMBER,
    callerId: user.id!,
  });
};
```

- [ ] **Step 4: Write the routes**

`src/app/api/my/team/invitations/route.ts`:

```ts
import { createInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const body = await request.json().catch(() => ({}));
    const member = await createInvitation(ctx, body?.email);
    return Response.json({ member }, { status: 201 });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Invite');
  }
};
```

`src/app/api/my/team/invitations/[id]/route.ts`:

```ts
import { cancelInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const DELETE = async (request: NextRequest, { params: { id } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    await cancelInvitation(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Cancel invite');
  }
};
```

`src/app/api/my/team/invitations/[id]/resend/route.ts`:

```ts
import { resendInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

export const POST = async (request: NextRequest, { params: { id } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json({ member: await resendInvitation(ctx, id) });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Resend invite');
  }
};
```

`src/app/api/invitations/accept/route.ts`:

```ts
import { acceptInvitation } from '@/services/invitation.service';
import { requireUser } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

// Authenticated by the global middleware like every non-public route; the token
// in the body must belong to an invite sent to the caller's email.
export const POST = async (request: NextRequest) => {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    return Response.json({ team: await acceptInvitation(user, body?.token) });
  } catch (error: unknown) {
    return errorResponse(error, '[Invitations] Accept');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/invitations.test.ts`
Expected: `13 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/invitation.service.ts src/app/api/my/team/invitations src/app/api/invitations test
git add src/services/invitation.service.ts src/app/api/my/team/invitations src/app/api/invitations test
git commit -m "feat(teams): email-bound invitations with hashed tokens, resend, cancel and accept"
```

---

### Task 9: Keep the retired team routes working, scoped to the caller's team

Today's console calls these until part 3 ships:

- `GET /api/my/team/collaborator`, `POST /api/my/team/invitation`, `DELETE /api/my/team/collaborator/:id` (`src/services/team.ts` in the console);
- `GET /api/me?invitation_code=` (`src/services/user.ts`).

They become thin adapters over the new services and the active team.

- **Collaborator removal:** #80 already limited it to the owner's own team and fixed the last-owner count. This task keeps #80's error messages, which the old Settings page shows, and only moves it onto the team context. Removed rows are now marked `REVOKED`, and pending invites are cancelled through the invitation service.
- **New fix:** `invitation_code` acceptance didn't check the invitee's email.

**Files:**

- Modify (rewrite): `src/controllers/teamCollaborator.controller.ts`
- Modify (whole files below): `src/app/api/my/team/route.ts`, `src/app/api/my/team/collaborator/route.ts`, `src/app/api/my/team/collaborator/[id]/route.ts`, `src/app/api/my/team/invitation/route.ts`
- Unchanged: `src/app/api/me/route.ts`. It still calls `acceptTeamInvitation(user, invitationCode)`, which keeps its signature.
- Test: `test/api/retired-team-routes.test.ts`

**Interfaces:**

- Consumes (Tasks 4, 7 and 8): `resolveTeamContext`, `TeamContext`, `findMembership`, `removeMember`, `createInvitation`, `cancelInvitation`, `legacyErrorResponse`. Consumes (#80): `ValidatorError` from `@/utils/error.utils`.
- Produces:
  - `removeMyCollaboratorById(ctx: TeamContext, id: string): Promise<void>`. It replaces #80's `(user, id)` version and throws #80's `ValidatorError` messages: `Do not have enough permissions to remove a collaborator`, `Collaborator not found`, `Cannot remove the only administrator from the group.` The route answers each as 400 `{ message }`.
  - `acceptTeamInvitation(user: User, invitationCode: string | null): Promise<void>`: legacy `base64(row id)` codes only, and only for rows with no token hash, not expired, sent to the caller's email.
  - `listLegacyCollaborators(teamId: string | undefined)`: `{ data, totalItems, totalPages }`, with `MEMBER` shown as `COLLABORATOR` so the old Settings page keeps its labels.

- [ ] **Step 1: Write the failing tests**

`test/api/retired-team-routes.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { GET as getMe } from '@/app/api/me/route';
import { DELETE as deleteCollaborator } from '@/app/api/my/team/collaborator/[id]/route';
import { GET as listCollaborators } from '@/app/api/my/team/collaborator/route';
import { POST as legacyInvite } from '@/app/api/my/team/invitation/route';
import { GET as getMyTeam } from '@/app/api/my/team/route';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import Mailer from '@/utils/mailer';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

describe('retired team routes', () => {
  it("lists only the caller's team, without removed rows, with MEMBER shown as COLLABORATOR", async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    await addMember(acme.team.id!, member);
    const gone = await createUser();
    const goneRow = await addMember(acme.team.id!, gone);
    await goneRow.update({ status: InvitationStatuses.REVOKED, deleted: true });
    const other = await createOwner('Other');
    await addMember(other.team.id!, await createUser());

    const response = await read(
      await listCollaborators(await request('GET', '/x', { as: acme.user.address! })),
    );

    expect(response.status).toBe(200);
    expect(response.body.totalItems).toBe(2);
    expect(
      response.body.data.map((row: { role: string; User: { email: string } }) => [
        row.User.email,
        row.role,
      ]),
    ).toEqual([
      [acme.user.email, 'OWNER'],
      [member.email, 'COLLABORATOR'],
    ]);
  });

  it('sends the new invite link from the old invite route', async () => {
    const acme = await createOwner('Acme');

    const response = await read(
      await legacyInvite(
        await request('POST', '/x', {
          as: acme.user.address!,
          body: { email: 'pat@x.test', role: 'COLLABORATOR' },
        }),
      ),
    );

    expect(response).toEqual({
      status: 200,
      body: { message: 'Invitation has been sent to pat@x.test' },
    });
    expect(vi.mocked(Mailer.sendMail).mock.calls[0][0].html).toContain('sign-in?invite=');
  });

  it('keeps refusing a row of another team, as #80 does', async () => {
    const acme = await createOwner('Acme');
    const other = await createOwner('Other');
    const victim = await addMember(other.team.id!, await createUser());

    const response = await read(
      await deleteCollaborator(
        await request('DELETE', '/x', { as: acme.user.address! }),
        {
          params: { id: victim.id! },
        },
      ),
    );

    expect(response).toEqual({
      status: 400,
      body: { message: 'Collaborator not found' },
    });
    await victim.reload();
    expect(victim.deleted).toBe(false);
  });

  it("removes a member or cancels a pending invite of the caller's team", async () => {
    const acme = await createOwner('Acme');
    const member = await addMember(acme.team.id!, await createUser());
    const pending = await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'pending@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
    });

    for (const row of [member, pending]) {
      const response = await read(
        await deleteCollaborator(
          await request('DELETE', '/x', { as: acme.user.address! }),
          {
            params: { id: row.id! },
          },
        ),
      );
      expect(response).toEqual({
        status: 200,
        body: { message: 'The collaborator has been removed' },
      });
      await row.reload();
      expect(row).toMatchObject({ status: 'REVOKED', deleted: true });
    }
  });

  it('accepts an old invitation_code only for the invited email', async () => {
    const acme = await createOwner('Acme');
    const legacyInvite = await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'Pat@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
    });
    const code = Buffer.from(legacyInvite.id!).toString('base64');
    const bob = await createUser({ email: 'bob@x.test' });
    const pat = await createUser({ email: 'pat@x.test' });

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: bob.address! }),
    );
    await legacyInvite.reload();
    expect(legacyInvite.status).toBe('PENDING');

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: pat.address! }),
    );
    await legacyInvite.reload();
    expect(legacyInvite).toMatchObject({ status: 'ACCEPTED', user_id: pat.id });
  });

  it('never accepts a token-based invite through invitation_code', async () => {
    const acme = await createOwner('Acme');
    const tokenInvite = await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'pat@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
      invite_token_hash: 'f'.repeat(64),
      invite_expires_at: new Date(Date.now() + 60_000),
    });
    const pat = await createUser({ email: 'pat@x.test' });
    const code = Buffer.from(tokenInvite.id!).toString('base64');

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: pat.address! }),
    );

    await tokenInvite.reload();
    expect(tokenInvite.status).toBe('PENDING');
  });

  it("GET /api/my/team returns the caller's own membership", async () => {
    const acme = await createOwner('Acme');

    const response = await read(
      await getMyTeam(await request('GET', '/x', { as: acme.user.address! })),
    );

    expect(response.body).toMatchObject({ team_id: acme.team.id, role: 'OWNER' });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/retired-team-routes.test.ts`
Expected: FAIL.

- The list includes the revoked row and shows `MEMBER`.
- The old invite route answers 400, because it refuses registered emails or uses the old link.
- Removed rows keep `status = 'ACCEPTED'`, because #80 only sets `deleted`.
- `bob` accepts Pat's invite.

- [ ] **Step 3: Rewrite `src/controllers/teamCollaborator.controller.ts`**

```ts
// Adapters for the team routes the console uses until it moves to
// /api/my/team/members and /api/my/team/invitations (console teams, part 3).
import { Op } from 'sequelize';

import { Team } from '@/models/team.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import { cancelInvitation } from '@/services/invitation.service';
import { findMembership } from '@/services/membership.service';
import type { TeamContext } from '@/services/teamContext.service';
import { removeMember } from '@/services/teamMembers.service';
import { ValidatorError } from '@/utils/error.utils';

const notDeleted = { [Op.not]: true };

/**
 * Old invite links carried base64(row id). They're honoured only for invites sent
 * before token links existed, before they expire, and for the invited email.
 */
export const acceptTeamInvitation = async (
  user: User,
  invitationCode: string | null,
): Promise<void> => {
  if (!invitationCode || !user.id) return;

  const invitationId = Buffer.from(invitationCode, 'base64').toString('ascii');
  const row = await TeamCollaborator.findOne({
    where: {
      id: invitationId,
      status: InvitationStatuses.PENDING,
      invite_token_hash: null,
      deleted: notDeleted,
    },
  });
  if (!row) return;
  if (row.invite_expires_at && row.invite_expires_at.getTime() <= Date.now()) return;
  if ((row.email ?? '').trim().toLowerCase() !== user.email.trim().toLowerCase()) return;
  if (await findMembership(row.team_id, user.id)) return;

  await row.update({ status: InvitationStatuses.ACCEPTED, user_id: user.id });
};

/** The old paginated collaborator list, for one team, without removed rows. */
export const listLegacyCollaborators = async (teamId: string | undefined) => {
  if (!teamId) return { data: [], totalItems: 0, totalPages: 0 };

  const rows = await TeamCollaborator.findAll({
    where: {
      team_id: teamId,
      deleted: notDeleted,
      status: { [Op.in]: [InvitationStatuses.ACCEPTED, InvitationStatuses.PENDING] },
    },
    include: [{ model: User }, { model: Team }],
    order: [['created_at', 'ASC']],
  });
  // The old Settings page labels only OWNER and COLLABORATOR.
  const data = rows.map((row) => ({
    ...row.toJSON(),
    role: row.role === TeamRoles.MEMBER ? 'COLLABORATOR' : row.role,
  }));
  return { data, totalItems: data.length, totalPages: data.length ? 1 : 0 };
};

/**
 * Removes a member, or cancels a pending invite, of the active team. #80 limited
 * this to the owner's own team; the messages stay #80's because the old Settings
 * page shows them. A team has one owner, who can't be removed.
 */
export const removeMyCollaboratorById = async (ctx: TeamContext, id: string) => {
  if (ctx.role !== TeamRoles.OWNER || !ctx.team) {
    throw new ValidatorError('Do not have enough permissions to remove a collaborator');
  }
  const row = await TeamCollaborator.findOne({
    where: {
      id,
      team_id: ctx.team.id!,
      deleted: notDeleted,
      status: { [Op.in]: [InvitationStatuses.ACCEPTED, InvitationStatuses.PENDING] },
    },
  });
  if (!row) throw new ValidatorError('Collaborator not found');
  if (row.role === TeamRoles.OWNER) {
    throw new ValidatorError('Cannot remove the only administrator from the group.');
  }

  if (row.status === InvitationStatuses.PENDING) await cancelInvitation(ctx, id);
  else await removeMember(ctx, id);
};
```

- [ ] **Step 4: Rewrite the four routes**

`src/app/api/my/team/route.ts`:

```ts
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

// Retired: the console reads teams from GET /api/my/teams.
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json(ctx.membership?.dataValues);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Team] Get team created by the logged user');
  }
}
```

`src/app/api/my/team/collaborator/route.ts`:

```ts
import { listLegacyCollaborators } from '@/controllers/teamCollaborator.controller';
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

// Retired: replaced by GET /api/my/team/members.
export const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json(await listLegacyCollaborators(ctx.team?.id));
  } catch (error: unknown) {
    return legacyErrorResponse(
      error,
      '[My Team Collaborators] Get team collaborators by the logged user',
    );
  }
};
```

`src/app/api/my/team/collaborator/[id]/route.ts`:

```ts
import { removeMyCollaboratorById } from '@/controllers/teamCollaborator.controller';
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

type Params = { params: { id: string } };

// Retired: replaced by DELETE /api/my/team/members/:id and /api/my/team/invitations/:id.
export const DELETE = async (request: NextRequest, { params: { id } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    await removeMyCollaboratorById(ctx, id);

    return Response.json(
      { message: 'The collaborator has been removed' },
      { status: 200 },
    );
  } catch (error: unknown) {
    return legacyErrorResponse(
      error,
      '[My Team Collaborators] Remove team collaborator by the owner user',
    );
  }
};
```

`src/app/api/my/team/invitation/route.ts`:

```ts
import { createInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

// Retired: replaced by POST /api/my/team/invitations. The role in the body is ignored.
export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const { email } = (await request.json().catch(() => ({}))) as { email?: unknown };
    await createInvitation(ctx, email);
    return Response.json(
      { message: `Invitation has been sent to ${String(email).trim()}` },
      { status: 200 },
    );
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Team Invitation] Send team invitation');
  }
};
```

- [ ] **Step 5: Confirm nothing else used the deleted controller functions**

Run: `grep -rnE "getMyTeamCollaborators|invitePersonToMyTeam|findTeamInvitationByEmail|getCollaboratorTeam|deleteTeamCollaboratorById" src`
Expected: no output. `removeMyCollaboratorById` stays, with its new `(ctx, id)` signature, and is used only by the route above.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, including Task 2's collaborator regressions (still 400 `Collaborator not found` for another team's row). Typecheck exits 0.

```bash
npx prettier --write src/controllers/teamCollaborator.controller.ts src/app/api/my/team/route.ts src/app/api/my/team/collaborator src/app/api/my/team/invitation test
git add src/controllers/teamCollaborator.controller.ts src/app/api/my/team test
git commit -m "fix(teams): scope the retired team routes to the caller's team and bind legacy invites to their email"
```

---

### Task 10: `PUT /api/me/signer`, proving which wallet signs for a user (C6)

**Files:**

- Create: `src/services/signerProof.service.ts`, `src/app/api/me/signer/route.ts`
- Test: `test/api/me-signer.test.ts`

**Interfaces:**

- Consumes: `requireUser` (Task 4), `ApiError` and `errorResponse` (Task 3), viem `recoverMessageAddress`, `getAddress`, `isAddress`, `isHex`.
- Produces:
  - `buildSignerProofMessage(eoa: string, kernelAddress: string, issuedAt: string): string`, the exact C6 text.
  - `verifySignerProof(input: { address: unknown; message: unknown; signature: unknown }, userAddress: string, now?: number): Promise<\`0x${string}\`>`. Returns the checksummed signer, or throws 400 `SIGNER_PROOF_INVALID` with a reason.

- [ ] **Step 1: Write the failing tests**

`test/api/me-signer.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { PUT as putSigner } from '@/app/api/me/signer/route';
import { User } from '@/models/user.model';
import {
  buildSignerProofMessage,
  verifySignerProof,
} from '@/services/signerProof.service';
import { createUser, newWallet } from '../support/fixtures';
import { read, request } from '../support/http';

const NOW = Date.parse('2026-10-02T12:00:00.000Z');

const proofFor = async (
  signerWallet = newWallet(),
  kernelAddress: string,
  issuedAt = new Date().toISOString(),
  messageSigner = signerWallet,
) => {
  const message = buildSignerProofMessage(signerWallet.address, kernelAddress, issuedAt);
  return {
    address: signerWallet.address,
    message,
    signature: await messageSigner.signMessage({ message }),
  };
};

describe('buildSignerProofMessage', () => {
  it('is contract C6 verbatim', () => {
    expect(buildSignerProofMessage('0xA', '0xB', '2026-10-02T12:00:00.000Z')).toBe(
      'DIMO Developer Console\nLink signer 0xA to account 0xB\nIssued at 2026-10-02T12:00:00.000Z',
    );
  });
});

describe('verifySignerProof', () => {
  const kernel = newWallet().address;
  const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
  const rejects = (promise: Promise<unknown>, reason: string) =>
    expect(promise).rejects.toMatchObject({
      status: 400,
      code: 'SIGNER_PROOF_INVALID',
      message: reason,
    });

  it('returns the checksummed signer for a valid proof', async () => {
    const wallet = newWallet();
    const proof = await proofFor(wallet, kernel, at(-60_000));

    await expect(verifySignerProof(proof, kernel.toLowerCase(), NOW)).resolves.toBe(
      getAddress(wallet.address),
    );
  });

  it('refuses a signature from another key', async () => {
    const proof = await proofFor(newWallet(), kernel, at(0), newWallet());
    await rejects(
      verifySignerProof(proof, kernel, NOW),
      'signature was not made by the signer',
    );
  });

  it('refuses a message that names another account', async () => {
    const proof = await proofFor(newWallet(), newWallet().address, at(0));
    await rejects(
      verifySignerProof(proof, kernel, NOW),
      'message names a different account',
    );
  });

  it('refuses an address that differs from the message', async () => {
    const proof = await proofFor(newWallet(), kernel, at(0));
    await rejects(
      verifySignerProof({ ...proof, address: newWallet().address }, kernel, NOW),
      'message names a different signer',
    );
  });

  it('refuses proofs older than 10 minutes or more than a minute in the future', async () => {
    await rejects(
      verifySignerProof(
        await proofFor(newWallet(), kernel, at(-10 * 60_000 - 1)),
        kernel,
        NOW,
      ),
      'signer proof is older than 10 minutes',
    );
    await rejects(
      verifySignerProof(await proofFor(newWallet(), kernel, at(61_000)), kernel, NOW),
      'signer proof is dated in the future',
    );
    await expect(
      verifySignerProof(
        await proofFor(newWallet(), kernel, at(-10 * 60_000)),
        kernel,
        NOW,
      ),
    ).resolves.toBeDefined();
  });

  it('refuses malformed input', async () => {
    await rejects(
      verifySignerProof({ address: 'x', message: '', signature: '0x' }, kernel, NOW),
      'address must be an Ethereum address',
    );
    await rejects(
      verifySignerProof(
        { address: kernel, message: 'hello', signature: '0x00' },
        kernel,
        NOW,
      ),
      'message does not match the signer proof format',
    );
    await rejects(
      verifySignerProof(
        { address: kernel, message: 'x', signature: 'nothex' },
        kernel,
        NOW,
      ),
      'signature must be hex',
    );
  });
});

describe('PUT /api/me/signer', () => {
  it("stores the caller's verified signer and returns it checksummed", async () => {
    const user = await createUser();
    const wallet = newWallet();
    const proof = await proofFor(wallet, user.address!);

    const response = await read(
      await putSigner(
        await request('PUT', '/api/me/signer', { as: user.address!, body: proof }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.body.signerAddress).toBe(getAddress(wallet.address));
    expect(Date.parse(response.body.signerVerifiedAt)).not.toBeNaN();
    const stored = await User.findOne({ where: { id: user.id! } });
    expect(stored!.signer_address).toBe(wallet.address.toLowerCase());
  });

  it('refuses a proof made for another account', async () => {
    const user = await createUser();
    const other = await createUser();
    const proof = await proofFor(newWallet(), other.address!);

    const response = await read(
      await putSigner(
        await request('PUT', '/api/me/signer', { as: user.address!, body: proof }),
      ),
    );

    expect(response).toEqual({
      status: 400,
      body: {
        message: 'message names a different account',
        code: 'SIGNER_PROOF_INVALID',
      },
    });
  });

  it('refuses an anonymous caller and a body that is not JSON', async () => {
    const user = await createUser();
    expect(
      (await putSigner(await request('PUT', '/api/me/signer', { body: {} }))).status,
    ).toBe(401);
    expect(
      (
        await read(
          await putSigner(
            await request('PUT', '/api/me/signer', {
              as: user.address!,
              rawBody: 'nope',
            }),
          ),
        )
      ).body.code,
    ).toBe('SIGNER_PROOF_INVALID');
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/me-signer.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/me/signer/route"`.

- [ ] **Step 3: Write `src/services/signerProof.service.ts`**

```ts
import { getAddress, isAddress, isHex, recoverMessageAddress } from 'viem';

import { ApiError } from '@/utils/apiError';

const MAX_AGE_MS = 10 * 60_000;
const MAX_FUTURE_MS = 60_000;
const PROOF =
  /^DIMO Developer Console\nLink signer (0x[0-9a-fA-F]{40}) to account (0x[0-9a-fA-F]{40})\nIssued at (\S+)$/;

/** Contract C6: what the console asks the user's wallet (EOA) to sign. */
export const buildSignerProofMessage = (
  eoa: string,
  kernelAddress: string,
  issuedAt: string,
) =>
  `DIMO Developer Console\nLink signer ${eoa} to account ${kernelAddress}\nIssued at ${issuedAt}`;

export interface SignerProofInput {
  address: unknown;
  message: unknown;
  signature: unknown;
}

const invalid = (reason: string) => new ApiError(400, 'SIGNER_PROOF_INVALID', reason);

/**
 * Proves the caller controls `address` (signature) and is the account the message
 * names (their token's wallet). Returns the signer, checksummed.
 */
export const verifySignerProof = async (
  { address, message, signature }: SignerProofInput,
  userAddress: string,
  now = Date.now(),
): Promise<`0x${string}`> => {
  if (typeof address !== 'string' || !isAddress(address, { strict: false })) {
    throw invalid('address must be an Ethereum address');
  }
  if (typeof signature !== 'string' || !isHex(signature))
    throw invalid('signature must be hex');
  const match = typeof message === 'string' ? PROOF.exec(message) : null;
  if (!match) throw invalid('message does not match the signer proof format');

  const [, eoa, kernelAddress, issuedAt] = match;
  if (eoa.toLowerCase() !== address.toLowerCase())
    throw invalid('message names a different signer');
  if (kernelAddress.toLowerCase() !== userAddress.toLowerCase()) {
    throw invalid('message names a different account');
  }

  const issued = Date.parse(issuedAt);
  if (Number.isNaN(issued)) throw invalid('issued-at is not a date');
  if (now - issued > MAX_AGE_MS) throw invalid('signer proof is older than 10 minutes');
  if (issued - now > MAX_FUTURE_MS) throw invalid('signer proof is dated in the future');

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({ message: message as string, signature });
  } catch {
    throw invalid('signature could not be verified');
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw invalid('signature was not made by the signer');
  }
  return getAddress(address);
};
```

The `signature must be hex` check runs before the message check, so the last malformed-input case in the test still hits it. `'nothex'` fails `isHex` first.

- [ ] **Step 4: Write `src/app/api/me/signer/route.ts`**

```ts
import { User } from '@/models/user.model';
import { SignerProofInput, verifySignerProof } from '@/services/signerProof.service';
import { requireUser } from '@/services/teamContext.service';
import { ApiError, errorResponse } from '@/utils/apiError';

// Records the EOA that signs for the caller (their Turnkey wallet), after the
// console proves control of it with the contract C6 message.
export const PUT = async (request: NextRequest) => {
  try {
    const user = await requireUser(request);
    const body = (await request.json().catch(() => null)) as SignerProofInput | null;
    if (!body || typeof body !== 'object') {
      throw new ApiError(
        400,
        'SIGNER_PROOF_INVALID',
        'Expected { address, message, signature }',
      );
    }

    const signerAddress = await verifySignerProof(body, user.address ?? '');
    const signerVerifiedAt = new Date();
    await User.update(
      {
        signer_address: signerAddress.toLowerCase(),
        signer_verified_at: signerVerifiedAt,
      },
      { where: { id: user.id! } },
    );

    return Response.json({
      signerAddress,
      signerVerifiedAt: signerVerifiedAt.toISOString(),
    });
  } catch (error: unknown) {
    return errorResponse(error, '[Me] Register signer');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/me-signer.test.ts`
Expected: `10 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/signerProof.service.ts src/app/api/me/signer test
git add src/services/signerProof.service.ts src/app/api/me/signer test
git commit -m "feat(teams): verify and store the wallet that signs for each user"
```

---

### Task 11: Extend #80's Identity service: license lookups by token ID and client ID

#80 added `src/services/identity.service.ts`. It provides `getLicenseOwner(clientId)` and `isLicenseOwner(address, clientId)`, caches known owners for 60 seconds, doesn't cache unknown licenses, throws `IdentityUnavailableError` on HTTP or network failure, and reads the URL from `IDENTITY_API_URL ?? config.identityApiUrl`. `identityApiUrl` is already set in `default.ts` (dev) and `production.ts`; preview inherits the default.

This task keeps every one of those, with the same behavior. It adds the lookups the registry and the license-access route need, without a second client.

**Files:**

- Modify: `src/services/identity.service.ts` (whole file below)
- Modify: `src/utils/apiError.ts` (`apiErrorResponse` maps `IdentityUnavailableError` to 502 `IDENTITY_UNAVAILABLE`)
- Modify: `test/support/setup.ts` (clear the license cache before each test)
- Test: `test/services/identity.test.ts`

**Interfaces:**

- Consumes (Task 1): `fakeIdentity`, `newClientId`.
- Keeps (#80, unchanged): `getLicenseOwner(clientId: string): Promise<string | null>`, `isLicenseOwner(address: string | undefined, clientId: string): Promise<boolean>`, `class IdentityUnavailableError`.
- Produces:
  - `interface LicenseInfo { tokenId: number; owner: string; clientId: string }`.
  - `getLicenseByClientId(clientId: string): Promise<LicenseInfo | null>`: null for a non-address input or an unknown license.
  - `getLicenseByTokenId(tokenId: number): Promise<LicenseInfo | null>`: null for a non-positive or non-integer ID, or an unknown license.
  - `clearIdentityCache(): void`, for tests.
- Caching: a known license is cached for 60 seconds under both its token ID and its lowercase client ID. Unknown licenses and failures aren't cached.
- `apiErrorResponse` answers `IdentityUnavailableError` with 502 `{ message: 'Identity API is unavailable', code: 'IDENTITY_UNAVAILABLE' }`. The configuration routes check the error themselves first, so they keep #80's `{ error: 'Could not verify license ownership' }`.

- [ ] **Step 1: Write the failing tests**

`test/services/identity.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearIdentityCache,
  getLicenseByClientId,
  getLicenseByTokenId,
  getLicenseOwner,
  IdentityUnavailableError,
  isLicenseOwner,
} from '@/services/identity.service';
import { apiErrorResponse } from '@/utils/apiError';
import { fakeIdentity, newClientId } from '../support/identity';

const later = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms));
const requestBody = (fetchMock: ReturnType<typeof fakeIdentity>, call = 0) =>
  JSON.parse(String((fetchMock.mock.calls[call][1] as RequestInit).body));

describe('identity service', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('looks a license up by token id and reuses it for 60 seconds, by token or client id', async () => {
    const license = { tokenId: 7, clientId: newClientId(), owner: newClientId() };
    const fetchMock = fakeIdentity([license]);

    expect(await getLicenseByTokenId(7)).toEqual(license);
    later(59_999);
    expect(await getLicenseByTokenId(7)).toEqual(license);
    expect(await getLicenseByClientId(license.clientId.toLowerCase())).toEqual(license);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    later(1);
    await getLicenseByTokenId(7);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock.mock.calls[0][0]).toBe('http://identity.test/query');
    expect(requestBody(fetchMock).query).toContain(
      'developerLicense(by: { tokenId: $tokenId })',
    );
    expect(requestBody(fetchMock).variables).toEqual({ tokenId: 7 });
  });

  it('looks a license up by client id regardless of letter case', async () => {
    const license = { tokenId: 8, clientId: newClientId(), owner: newClientId() };
    const fetchMock = fakeIdentity([license]);

    expect(
      await getLicenseByClientId(license.clientId.toUpperCase().replace('0X', '0x')),
    ).toEqual(license);
    expect(await getLicenseByClientId(license.clientId.toLowerCase())).toEqual(license);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody(fetchMock).query).toContain(
      'developerLicense(by: { clientId: $clientId })',
    );
  });

  it('does not cache unknown licenses, and answers null for bad input without asking', async () => {
    const fetchMock = fakeIdentity([]);

    expect(await getLicenseByTokenId(404)).toBeNull();
    expect(await getLicenseByTokenId(404)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(await getLicenseByClientId('not-an-address')).toBeNull();
    expect(await getLicenseByTokenId(0)).toBeNull();
    expect(await getLicenseByTokenId(1.5)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws IdentityUnavailableError on failures and does not cache them', async () => {
    const fetchMock = fakeIdentity([], { status: 500 });

    await expect(getLicenseByTokenId(7)).rejects.toBeInstanceOf(IdentityUnavailableError);
    await expect(getLicenseByTokenId(7)).rejects.toBeInstanceOf(IdentityUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(getLicenseByClientId(newClientId())).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });

  it("keeps #80's getLicenseOwner and isLicenseOwner", async () => {
    const owner = newClientId();
    const license = { tokenId: 9, clientId: newClientId(), owner };
    fakeIdentity([license]);

    expect(await getLicenseOwner(license.clientId)).toBe(owner);
    expect(await isLicenseOwner(owner.toLowerCase(), license.clientId)).toBe(true);
    expect(await isLicenseOwner(newClientId(), license.clientId)).toBe(false);
    expect(await isLicenseOwner(undefined, license.clientId)).toBe(false);
    expect(await getLicenseOwner('nope')).toBeNull();
  });

  it('forgets everything on clearIdentityCache', async () => {
    const license = { tokenId: 10, clientId: newClientId(), owner: newClientId() };
    const fetchMock = fakeIdentity([license]);

    await getLicenseByTokenId(10);
    clearIdentityCache();
    await getLicenseByTokenId(10);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('turns IdentityUnavailableError into a 502 IDENTITY_UNAVAILABLE response', async () => {
    const response = apiErrorResponse(new IdentityUnavailableError('boom'))!;

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      message: 'Identity API is unavailable',
      code: 'IDENTITY_UNAVAILABLE',
    });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/services/identity.test.ts`
Expected: FAIL, `getLicenseByTokenId is not a function` (or the import has no such export).

- [ ] **Step 3: Rewrite `src/services/identity.service.ts`**

```ts
import config from '@/config';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const LICENSE_FIELDS = '{ tokenId owner clientId }';
const BY_CLIENT_ID = `query ($clientId: Address!) { developerLicense(by: { clientId: $clientId }) ${LICENSE_FIELDS} }`;
const BY_TOKEN_ID = `query ($tokenId: Int!) { developerLicense(by: { tokenId: $tokenId }) ${LICENSE_FIELDS} }`;

export interface LicenseInfo {
  tokenId: number;
  owner: string;
  clientId: string;
}

// License owners rarely change, so a known license is reused for a minute rather
// than costing an Identity round trip on every request. Unknown licenses are not
// cached: a license minted a moment ago must work as soon as Identity has it.
const LICENSE_TTL_MS = 60_000;
const licenses = new Map<string, { license: LicenseInfo; expires: number }>();
const clientKey = (clientId: string) => `client:${clientId.toLowerCase()}`;
const tokenKey = (tokenId: number) => `token:${tokenId}`;

export class IdentityUnavailableError extends Error {}

const identityUrl = () => process.env.IDENTITY_API_URL ?? config.identityApiUrl;

const fromCache = (key: string) => {
  const cached = licenses.get(key);
  return cached && cached.expires > Date.now() ? cached.license : null;
};

const remember = (license: LicenseInfo) => {
  const entry = { license, expires: Date.now() + LICENSE_TTL_MS };
  licenses.set(clientKey(license.clientId), entry);
  licenses.set(tokenKey(license.tokenId), entry);
};

const queryLicense = async (
  query: string,
  variables: Record<string, unknown>,
): Promise<LicenseInfo | null> => {
  let body: { data?: { developerLicense?: LicenseInfo | null } | null };
  try {
    const res = await fetch(identityUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Identity answered ${res.status}`);
    body = await res.json();
  } catch (error) {
    throw new IdentityUnavailableError(String(error));
  }

  // Identity answers an unknown license with an error and null data.
  const license = body.data?.developerLicense ?? null;
  if (license) remember(license);
  return license;
};

export const getLicenseByClientId = async (clientId: string) => {
  if (!ADDRESS.test(clientId)) return null;
  return fromCache(clientKey(clientId)) ?? queryLicense(BY_CLIENT_ID, { clientId });
};

export const getLicenseByTokenId = async (tokenId: number) => {
  if (!Number.isInteger(tokenId) || tokenId <= 0) return null;
  return fromCache(tokenKey(tokenId)) ?? queryLicense(BY_TOKEN_ID, { tokenId });
};

export const getLicenseOwner = async (clientId: string): Promise<string | null> =>
  (await getLicenseByClientId(clientId))?.owner ?? null;

// Whether the wallet owns the license with this client ID on-chain.
export const isLicenseOwner = async (address: string | undefined, clientId: string) => {
  if (!address) return false;
  const owner = await getLicenseOwner(clientId);
  return !!owner && owner.toLowerCase() === address.toLowerCase();
};

/** Forget every cached license. Tests call this between cases. */
export const clearIdentityCache = () => licenses.clear();
```

- [ ] **Step 4: Map Identity outages in `src/utils/apiError.ts`**

Replace `apiErrorResponse` with:

```ts
import { IdentityUnavailableError } from '@/services/identity.service';

export const apiErrorResponse = (error: unknown): Response | null => {
  if (error instanceof ApiError) {
    return Response.json(
      { message: error.message, code: error.code },
      { status: error.status },
    );
  }
  if (error instanceof IdentityUnavailableError) {
    return Response.json(
      { message: 'Identity API is unavailable', code: 'IDENTITY_UNAVAILABLE' },
      { status: 502 },
    );
  }
  return null;
};
```

Put the import with the other import at the top of the file.

- [ ] **Step 5: Clear the license cache between tests**

In `test/support/setup.ts`, import `clearIdentityCache` from `@/services/identity.service` and call it first thing in `beforeEach`:

```ts
beforeEach(async () => {
  clearIdentityCache();
  vi.clearAllMocks();
  // …truncation as before
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- test/services/identity.test.ts test/api/regressions-80.test.ts test/api/team-owned-resources.test.ts`
Expected: all pass. That's 7 identity tests, plus #80's and Task 6's configuration tests unchanged.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: exit 0.

```bash
npx prettier --write src/services/identity.service.ts src/utils/apiError.ts test
git add src/services/identity.service.ts src/utils/apiError.ts test
git commit -m "feat(teams): look licenses up by token or client id through the one Identity service"
```

---

### Task 12: Key registry endpoints

**Files:**

- Create: `src/services/licenseSigner.service.ts`
- Create: `src/app/api/my/licenses/[tokenId]/signers/route.ts`, `src/app/api/my/licenses/[tokenId]/signers/[address]/route.ts`, `src/app/api/my/licenses/[tokenId]/signers/[address]/disabled/route.ts`
- Test: `test/api/license-signers.test.ts`

**Interfaces:**

- Consumes (Tasks 3, 4 and 11): `TeamContext`, `resolveTeamContext`, `requireOwner`, `activeMembershipWhere`, `getLicenseByTokenId`, `LicenseSigner`, `LicenseSignerHolder`, the `@/types/teams` types, `ApiError`, `errorResponse`.
- Produces:
  - `assertLicenseInTeam(ctx, rawTokenId: string): Promise<number>`: 403 `LICENSE_NOT_IN_TEAM`. An Identity outage propagates as `IdentityUnavailableError`, which `apiErrorResponse` answers as 502 `IDENTITY_UNAVAILABLE`.
  - `listLicenseSigners(ctx, rawTokenId): Promise<LicenseSignerRecord[]>`.
  - `upsertLicenseSigner(ctx, rawTokenId, rawAddress, body: unknown): Promise<LicenseSignerRecord>`. Saving clears `disabledAt`; the console calls it right after enabling the key on-chain.
  - `markLicenseSignerDisabled(ctx, rawTokenId, rawAddress): Promise<LicenseSignerRecord>`.
- Check order for writes: owner (403 `OWNER_ONLY`), then path address (400 `INVALID_ADDRESS`, proposed as a C7 addition), then license (403 `LICENSE_NOT_IN_TEAM` or 502), then body (400 `INVALID_HOLDERS`).

- [ ] **Step 1: Write the failing tests**

`test/api/license-signers.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { POST as disableRoute } from '@/app/api/my/licenses/[tokenId]/signers/[address]/disabled/route';
import { PUT as putRoute } from '@/app/api/my/licenses/[tokenId]/signers/[address]/route';
import { GET as listRoute } from '@/app/api/my/licenses/[tokenId]/signers/route';
import { GET as listMembersRoute } from '@/app/api/my/team/members/route';
import { InvitationStatuses } from '@/models/teamCollaborator.model';
import { addMember, createOwner, createUser, newWallet } from '../support/fixtures';
import { read, request } from '../support/http';
import { fakeIdentity } from '../support/identity';

const CLIENT_ID = '0x' + '2'.repeat(40);

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser({ name: 'Mia' });
  const membership = await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  // License 7 is owned by Acme's owner wallet; anything else doesn't exist.
  fakeIdentity([{ tokenId: 7, owner: acme.user.address!, clientId: CLIENT_ID }]);
  return { acme, member, membership, outsider };
};

const put = async (
  as: string,
  address: string,
  body: unknown,
  opts: { tokenId?: string; teamId?: string } = {},
) =>
  read(
    await putRoute(await request('PUT', '/x', { as, body, teamId: opts.teamId }), {
      params: { tokenId: opts.tokenId ?? '7', address },
    }),
  );

const list = async (as: string, teamId?: string, tokenId = '7') =>
  read(
    await listRoute(await request('GET', '/x', { as, teamId }), { params: { tokenId } }),
  );

describe('license key registry', () => {
  it('records a member key and an API key with several holders, and lists them to members', async () => {
    const { acme, member } = await setup();
    const memberKey = newWallet().address;
    const apiKey = newWallet().address;

    const saved = await put(acme.user.address!, memberKey, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.signer).toMatchObject({
      signerAddress: getAddress(memberKey),
      kind: 'MEMBER',
      note: null,
      holders: [{ userId: member.id, name: 'Mia', email: member.email }],
      createdBy: acme.user.id,
      disabledAt: null,
      disabledBy: null,
    });

    await put(acme.user.address!, apiKey, {
      kind: 'API_KEY',
      note: '  Prod backend  ',
      holders: [{ userId: acme.user.id }, { name: 'Backend service' }],
    });

    const listed = await list(member.address!, acme.team.id!);
    expect(listed.status).toBe(200);
    expect(
      listed.body.signers.map((s: { signerAddress: string; note: string | null }) => [
        s.signerAddress,
        s.note,
      ]),
    ).toEqual([
      [getAddress(memberKey), null],
      [getAddress(apiKey), 'Prod backend'],
    ]);
    expect(listed.body.signers[1].holders).toEqual([
      { userId: acme.user.id, name: acme.user.name, email: acme.user.email },
      { userId: null, name: 'Backend service', email: null },
    ]);
  });

  it('treats checksummed and lowercase addresses as the same key', async () => {
    const { acme } = await setup();
    const key = newWallet().address;

    await put(acme.user.address!, key, { kind: 'EXTERNAL', holders: [{ name: 'Ops' }] });
    await put(acme.user.address!, key.toLowerCase(), {
      kind: 'EXTERNAL',
      holders: [{ name: 'Ops 2' }],
    });

    const listed = await list(acme.user.address!);
    expect(listed.body.signers).toHaveLength(1);
    expect(listed.body.signers[0].holders).toEqual([
      { userId: null, name: 'Ops 2', email: null },
    ]);
  });

  it('refuses invalid holders and kinds', async () => {
    const { acme, member } = await setup();
    const stranger = await createUser();
    const key = newWallet().address;
    const invalid = async (body: unknown) =>
      (await put(acme.user.address!, key, body)).body.code;

    expect(await invalid({ kind: 'MEMBER', holders: [{ userId: stranger.id }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(
      await invalid({ kind: 'MEMBER', holders: [{ userId: member.id }, { name: 'x' }] }),
    ).toBe('INVALID_HOLDERS');
    expect(await invalid({ kind: 'MEMBER', holders: [{ name: 'Mia' }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(await invalid({ kind: 'API_KEY', holders: [] })).toBe('INVALID_HOLDERS');
    expect(await invalid({ kind: 'API_KEY', holders: [{ name: '   ' }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(
      await invalid({
        kind: 'API_KEY',
        holders: [{ userId: member.id }, { userId: member.id }],
      }),
    ).toBe('INVALID_HOLDERS');
    expect(
      await invalid({ kind: 'API_KEY', note: 'x'.repeat(201), holders: [{ name: 'a' }] }),
    ).toBe('INVALID_HOLDERS');
    expect(await invalid({ kind: 'OWNER', holders: [{ name: 'a' }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(await invalid(null)).toBe('INVALID_HOLDERS');
  });

  it('refuses members, bad addresses, and licenses outside the team', async () => {
    const { acme, member, outsider } = await setup();
    const key = newWallet().address;
    const body = { kind: 'EXTERNAL', holders: [{ name: 'x' }] };

    expect(
      (await put(member.address!, key, body, { teamId: acme.team.id! })).body.code,
    ).toBe('OWNER_ONLY');
    expect(await put(acme.user.address!, 'not-an-address', body)).toEqual({
      status: 400,
      body: { message: 'Signer must be an Ethereum address', code: 'INVALID_ADDRESS' },
    });
    expect((await put(acme.user.address!, key, body, { tokenId: '8' })).body.code).toBe(
      'LICENSE_NOT_IN_TEAM',
    );
    expect((await put(acme.user.address!, key, body, { tokenId: 'abc' })).body.code).toBe(
      'LICENSE_NOT_IN_TEAM',
    );
    expect((await put(outsider.user.address!, key, body)).body.code).toBe(
      'LICENSE_NOT_IN_TEAM',
    );
    expect((await list(outsider.user.address!)).body.code).toBe('LICENSE_NOT_IN_TEAM');
  });

  it('answers 502 when Identity is down', async () => {
    const { acme } = await setup();
    fakeIdentity([], { status: 500 });

    expect((await list(acme.user.address!)).status).toBe(502);
  });

  it('marks a key disabled, and saving it again re-activates it', async () => {
    const { acme, member } = await setup();
    const key = newWallet().address;
    await put(acme.user.address!, key, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    const disable = async (address: string) =>
      read(
        await disableRoute(await request('POST', '/x', { as: acme.user.address! }), {
          params: { tokenId: '7', address },
        }),
      );

    const disabled = await disable(key);
    expect(disabled.status).toBe(200);
    expect(disabled.body.signer.disabledBy).toBe(acme.user.id);
    expect(Date.parse(disabled.body.signer.disabledAt)).not.toBeNaN();

    const saved = await put(acme.user.address!, key, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    expect(saved.body.signer).toMatchObject({ disabledAt: null, disabledBy: null });

    expect(await disable(newWallet().address)).toEqual({
      status: 404,
      body: { message: 'Key not found', code: 'NOT_FOUND' },
    });
  });

  it('lists a removed member while their member key is enabled, and drops them once it is disabled', async () => {
    const { acme, member, membership } = await setup();
    const key = newWallet().address;
    await put(acme.user.address!, key, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    await membership.update({ status: InvitationStatuses.REVOKED, deleted: true });
    const members = async () =>
      (
        await read(
          await listMembersRoute(await request('GET', '/x', { as: acme.user.address! })),
        )
      ).body.members.map((m: { email: string; status: string }) => [m.email, m.status]);

    expect(await members()).toEqual([
      [acme.user.email, 'ACCEPTED'],
      [member.email, 'REVOKED'],
    ]);

    await disableRoute(await request('POST', '/x', { as: acme.user.address! }), {
      params: { tokenId: '7', address: key },
    });
    expect(await members()).toEqual([[acme.user.email, 'ACCEPTED']]);
  });
});
```

Note on the last test: the `MEMBER` key is saved while Mia is still a member, because the holder check requires current membership. She is removed afterwards.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/license-signers.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/my/licenses/[tokenId]/signers/[address]/disabled/route"`.

- [ ] **Step 3: Write `src/services/licenseSigner.service.ts`**

```ts
import type { IncludeOptions } from 'sequelize';
import { getAddress, isAddress } from 'viem';

import { LicenseSigner } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { TeamCollaborator } from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import DB from '@/services/db';
import { getLicenseByTokenId } from '@/services/identity.service';
import { activeMembershipWhere } from '@/services/membership.service';
import { requireOwner, TeamContext } from '@/services/teamContext.service';
import type { HolderInput, LicenseSignerRecord, SignerKind } from '@/types/teams';
import { ApiError } from '@/utils/apiError';

const MAX_TOKEN_ID = 2_147_483_647;
const KINDS: SignerKind[] = ['MEMBER', 'API_KEY', 'EXTERNAL'];

const holdersInclude: IncludeOptions = {
  model: LicenseSignerHolder,
  as: 'holders',
  include: [{ model: User }],
};

const notInTeam = () =>
  new ApiError(
    403,
    'LICENSE_NOT_IN_TEAM',
    'This license does not belong to the active team',
  );
const invalidHolders = (message: string) => new ApiError(400, 'INVALID_HOLDERS', message);

const parseTokenId = (raw: string): number | null => {
  if (!/^\d+$/.test(raw)) return null;
  const tokenId = Number(raw);
  return tokenId > 0 && tokenId <= MAX_TOKEN_ID ? tokenId : null;
};

const parseSignerAddress = (raw: string) => {
  if (!isAddress(raw, { strict: false })) {
    throw new ApiError(400, 'INVALID_ADDRESS', 'Signer must be an Ethereum address');
  }
  return raw.toLowerCase();
};

/** The license must be owned, on-chain, by the active team owner's wallet. */
export const assertLicenseInTeam = async (ctx: TeamContext, rawTokenId: string) => {
  const tokenId = parseTokenId(rawTokenId);
  if (!tokenId || !ctx.team || !ctx.ownerAddress) throw notInTeam();
  const license = await getLicenseByTokenId(tokenId);
  if (!license || license.owner.toLowerCase() !== ctx.ownerAddress.toLowerCase()) {
    throw notInTeam();
  }
  return tokenId;
};

export const toLicenseSignerRecord = (row: LicenseSigner): LicenseSignerRecord => ({
  signerAddress: getAddress(row.signer_address) as `0x${string}`,
  kind: row.kind as SignerKind,
  note: row.note ?? null,
  // Members first, then free-text names, each alphabetical: holders saved together
  // share a created_at, so insertion order can't be relied on.
  holders: (row.holders ?? [])
    .map((holder) => ({
      userId: holder.user_id ?? null,
      name: holder.name ?? holder.User?.name ?? null,
      email: holder.User?.email ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.userId !== null) - Number(a.userId !== null) ||
        (a.name ?? '').localeCompare(b.name ?? ''),
    ),
  createdAt: (row.get('created_at') as Date).toISOString(),
  createdBy: row.created_by ?? null,
  disabledAt: row.disabled_at?.toISOString() ?? null,
  disabledBy: row.disabled_by ?? null,
});

const findRecord = async (teamId: string, tokenId: number, signerAddress: string) => {
  const row = await LicenseSigner.findOne({
    where: { team_id: teamId, license_token_id: tokenId, signer_address: signerAddress },
    include: [holdersInclude],
  });
  return row ? toLicenseSignerRecord(row) : null;
};

export const listLicenseSigners = async (ctx: TeamContext, rawTokenId: string) => {
  const tokenId = await assertLicenseInTeam(ctx, rawTokenId);
  const rows = await LicenseSigner.findAll({
    where: { team_id: ctx.team!.id!, license_token_id: tokenId },
    include: [holdersInclude],
    order: [['created_at', 'ASC']],
  });
  return rows.map(toLicenseSignerRecord);
};

interface SignerInput {
  kind: SignerKind;
  note: string | null;
  holders: { user_id: string | null; name: string | null }[];
}

const parseSignerInput = async (
  ctx: TeamContext,
  body: unknown,
): Promise<SignerInput> => {
  if (!body || typeof body !== 'object') throw invalidHolders('Expected a JSON object');
  const { kind, note, holders } = body as {
    kind?: unknown;
    note?: unknown;
    holders?: unknown;
  };

  if (typeof kind !== 'string' || !KINDS.includes(kind as SignerKind)) {
    throw invalidHolders('kind must be MEMBER, API_KEY or EXTERNAL');
  }
  if (
    note !== undefined &&
    note !== null &&
    (typeof note !== 'string' || note.trim().length > 200)
  ) {
    throw invalidHolders('note must be text of at most 200 characters');
  }
  if (!Array.isArray(holders) || holders.length === 0) {
    throw invalidHolders('holders must list at least one person');
  }

  const memberRows = await TeamCollaborator.findAll({
    where: { team_id: ctx.team!.id!, ...activeMembershipWhere },
    attributes: ['user_id'],
  });
  const memberIds = new Set(memberRows.map((row) => row.user_id));
  const seen = new Set<string>();

  const parsed = holders.map((holder: unknown) => {
    const input = holder as HolderInput;
    if (holder && typeof holder === 'object' && 'userId' in input) {
      if (typeof input.userId !== 'string' || !memberIds.has(input.userId)) {
        throw invalidHolders('every userId must be a member of this team');
      }
      if (seen.has(input.userId)) throw invalidHolders('a person is listed twice');
      seen.add(input.userId);
      return { user_id: input.userId, name: null };
    }
    if (holder && typeof holder === 'object' && 'name' in input) {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (!name || name.length > 100)
        throw invalidHolders('names must be 1 to 100 characters');
      return { user_id: null, name };
    }
    throw invalidHolders('each holder is { userId } or { name }');
  });

  if (kind === 'MEMBER' && (parsed.length !== 1 || !parsed[0].user_id)) {
    throw invalidHolders('a member key belongs to exactly one member');
  }
  const trimmed = typeof note === 'string' ? note.trim() : '';
  return { kind: kind as SignerKind, note: trimmed || null, holders: parsed };
};

export const upsertLicenseSigner = async (
  ctx: TeamContext,
  rawTokenId: string,
  rawAddress: string,
  body: unknown,
) => {
  requireOwner(ctx);
  const signerAddress = parseSignerAddress(rawAddress);
  const tokenId = await assertLicenseInTeam(ctx, rawTokenId);
  const input = await parseSignerInput(ctx, body);
  const teamId = ctx.team!.id!;

  await DB.connection!.transaction(async (transaction) => {
    const [row] = await LicenseSigner.findOrCreate({
      where: { license_token_id: tokenId, signer_address: signerAddress },
      defaults: {
        team_id: teamId,
        license_token_id: tokenId,
        signer_address: signerAddress,
        kind: input.kind,
        note: input.note,
        created_by: ctx.user.id,
      },
      transaction,
    });
    // Saving records the key as active: the console calls this after enabling it.
    await row.update(
      {
        team_id: teamId,
        kind: input.kind,
        note: input.note,
        disabled_at: null,
        disabled_by: null,
      },
      { transaction },
    );
    await LicenseSignerHolder.destroy({ where: { signer_id: row.id! }, transaction });
    await LicenseSignerHolder.bulkCreate(
      input.holders.map((holder) => ({ signer_id: row.id!, ...holder })),
      { transaction },
    );
  });

  return (await findRecord(teamId, tokenId, signerAddress))!;
};

export const markLicenseSignerDisabled = async (
  ctx: TeamContext,
  rawTokenId: string,
  rawAddress: string,
) => {
  requireOwner(ctx);
  const signerAddress = parseSignerAddress(rawAddress);
  const tokenId = await assertLicenseInTeam(ctx, rawTokenId);
  const teamId = ctx.team!.id!;

  const row = await LicenseSigner.findOne({
    where: { team_id: teamId, license_token_id: tokenId, signer_address: signerAddress },
  });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Key not found');
  await row.update({ disabled_at: new Date(), disabled_by: ctx.user.id });

  return (await findRecord(teamId, tokenId, signerAddress))!;
};
```

- [ ] **Step 4: Write the routes**

`src/app/api/my/licenses/[tokenId]/signers/route.ts`:

```ts
import { listLicenseSigners } from '@/services/licenseSigner.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { tokenId: string } };

export const GET = async (request: NextRequest, { params: { tokenId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json({ signers: await listLicenseSigners(ctx, tokenId) });
  } catch (error: unknown) {
    return errorResponse(error, '[License signers] List');
  }
};
```

`src/app/api/my/licenses/[tokenId]/signers/[address]/route.ts`:

```ts
import { upsertLicenseSigner } from '@/services/licenseSigner.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { tokenId: string; address: string } };

export const PUT = async (
  request: NextRequest,
  { params: { tokenId, address } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    const body = await request.json().catch(() => null);
    return Response.json({
      signer: await upsertLicenseSigner(ctx, tokenId, address, body),
    });
  } catch (error: unknown) {
    return errorResponse(error, '[License signers] Save');
  }
};
```

`src/app/api/my/licenses/[tokenId]/signers/[address]/disabled/route.ts`:

```ts
import { markLicenseSignerDisabled } from '@/services/licenseSigner.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

type Params = { params: { tokenId: string; address: string } };

// Records that the owner disabled this key in the console. The chain is still
// the truth for whether it works.
export const POST = async (
  request: NextRequest,
  { params: { tokenId, address } }: Params,
) => {
  try {
    const ctx = await resolveTeamContext(request);
    return Response.json({
      signer: await markLicenseSignerDisabled(ctx, tokenId, address),
    });
  } catch (error: unknown) {
    return errorResponse(error, '[License signers] Mark disabled');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/license-signers.test.ts`
Expected: `7 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/licenseSigner.service.ts src/app/api/my/licenses test
git add src/services/licenseSigner.service.ts src/app/api/my/licenses test
git commit -m "feat(teams): record who each license key belongs to"
```

---

### Task 13: `GET /api/my/license-access`, who may use a license

The console's data proxy asks this before it forwards a request (part 3). The answer depends only on the license and the caller, not on `X-Team-Id`.

**Files:**

- Create: `src/services/licenseAccess.service.ts`, `src/app/api/my/license-access/route.ts`
- Test: `test/api/license-access.test.ts`

**Interfaces:**

- Consumes (Tasks 4 and 11): `requireUser`, `findMembership`, `findPersonalMembership`, `getLicenseByClientId`, the `LicenseAccess` type, `errorResponse`.
- Produces: `getLicenseAccess(user: User, rawClientId: string | null): Promise<LicenseAccess>`, the response body `{ access, teamId, signerAddress, userEmail }`.
  - `OWNER` when the caller's wallet owns the license; `teamId` is their personal team (or `null`).
  - `MEMBER` when the caller has an accepted membership in a team created by the user whose wallet owns the license; `teamId` is that team.
  - `NONE` otherwise, including an unknown license; `teamId` and `signerAddress` are then `null`.
  - `signerAddress` is the caller's verified signer, checksummed, or `null`.
  - `userEmail` is always the caller's `users.email`, for the proxy's audit line.
  - `X-Team-Id` is ignored, so a stale header still gets 200.

- [ ] **Step 1: Write the failing tests**

`test/api/license-access.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { GET as accessRoute } from '@/app/api/my/license-access/route';
import { InvitationStatuses } from '@/models/teamCollaborator.model';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';
import { fakeIdentity } from '../support/identity';

const CLIENT_ID = '0xAbCdEf000000000000000000000000000000AbCd';

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser();
  await member.update({ signer_address: '0x' + 'ab'.repeat(20) });
  const membership = await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  // Identity reports the owner in lower case; console-api stores the wallet checksummed.
  fakeIdentity([
    { tokenId: 7, owner: acme.user.address!.toLowerCase(), clientId: CLIENT_ID },
  ]);
  return { acme, member, membership, outsider };
};

const access = async (as: string, clientId: string | null, teamId?: string) =>
  read(
    await accessRoute(
      await request(
        'GET',
        clientId === null
          ? '/api/my/license-access'
          : `/api/my/license-access?clientId=${clientId}`,
        { as, teamId },
      ),
    ),
  );

describe('GET /api/my/license-access', () => {
  it('answers OWNER for the wallet that owns the license, whatever the case of the ids', async () => {
    const { acme } = await setup();

    expect(await access(acme.user.address!, CLIENT_ID.toLowerCase())).toEqual({
      status: 200,
      body: {
        access: 'OWNER',
        teamId: acme.team.id,
        signerAddress: null,
        userEmail: acme.user.email,
      },
    });
  });

  it('answers MEMBER with the team and the verified signer for a team member', async () => {
    const { acme, member } = await setup();

    expect(await access(member.address!, CLIENT_ID)).toEqual({
      status: 200,
      body: {
        access: 'MEMBER',
        teamId: acme.team.id,
        signerAddress: getAddress('0x' + 'ab'.repeat(20)),
        userEmail: member.email,
      },
    });
  });

  it('answers NONE for outsiders, removed members and unknown licenses', async () => {
    const { acme, member, membership, outsider } = await setup();
    const none = (userEmail: string) => ({
      status: 200,
      body: { access: 'NONE', teamId: null, signerAddress: null, userEmail },
    });

    expect(await access(outsider.user.address!, CLIENT_ID, acme.team.id!)).toEqual(
      none(outsider.user.email),
    );
    expect(await access(member.address!, `0x${'9'.repeat(40)}`)).toEqual(
      none(member.email),
    );
    await membership.update({ status: InvitationStatuses.REVOKED, deleted: true });
    expect(await access(member.address!, CLIENT_ID)).toEqual(none(member.email));
  });

  it('ignores a stale X-Team-Id and still answers 200', async () => {
    const { acme, member, membership } = await setup();
    await membership.update({ status: InvitationStatuses.REVOKED, deleted: true });

    const asOwner = await access(acme.user.address!, CLIENT_ID, 'no-such-team');
    const asRemoved = await access(member.address!, CLIENT_ID, acme.team.id!);

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.access).toBe('OWNER');
    expect(asRemoved).toEqual({
      status: 200,
      body: {
        access: 'NONE',
        teamId: null,
        signerAddress: null,
        userEmail: member.email,
      },
    });
  });

  it('refuses a missing or malformed client id, and reports Identity outages', async () => {
    const { acme } = await setup();

    expect(await access(acme.user.address!, null)).toEqual({
      status: 400,
      body: {
        message: 'clientId must be an Ethereum address',
        code: 'INVALID_CLIENT_ID',
      },
    });
    expect((await access(acme.user.address!, 'nope')).body.code).toBe(
      'INVALID_CLIENT_ID',
    );

    fakeIdentity([], { status: 500 });
    expect((await access(acme.user.address!, CLIENT_ID)).body.code).toBe(
      'IDENTITY_UNAVAILABLE',
    );
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/license-access.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/my/license-access/route"`.

- [ ] **Step 3: Write `src/services/licenseAccess.service.ts`**

```ts
import { Op, col, fn, where as sqlWhere } from 'sequelize';
import { getAddress, isAddress } from 'viem';

import { Team } from '@/models/team.model';
import { User } from '@/models/user.model';
import { getLicenseByClientId } from '@/services/identity.service';
import { findMembership, findPersonalMembership } from '@/services/membership.service';
import type { LicenseAccess } from '@/types/teams';
import { ApiError } from '@/utils/apiError';

export const getLicenseAccess = async (
  user: User,
  rawClientId: string | null,
): Promise<LicenseAccess> => {
  if (!rawClientId || !isAddress(rawClientId, { strict: false })) {
    throw new ApiError(400, 'INVALID_CLIENT_ID', 'clientId must be an Ethereum address');
  }
  const userEmail = user.email;
  const none: LicenseAccess = {
    access: 'NONE',
    teamId: null,
    signerAddress: null,
    userEmail,
  };

  const license = await getLicenseByClientId(rawClientId);
  if (!license) return none;
  const owner = license.owner.toLowerCase();
  const signerAddress = user.signer_address
    ? (getAddress(user.signer_address) as `0x${string}`)
    : null;

  if (user.address?.toLowerCase() === owner) {
    const personal = await findPersonalMembership(user.id!);
    return {
      access: 'OWNER',
      teamId: personal?.team_id ?? null,
      signerAddress,
      userEmail,
    };
  }

  // Wallets are stored as the token carried them; compare without case.
  const ownerUsers = await User.findAll({
    where: sqlWhere(fn('lower', col('address')), owner),
  });
  if (!ownerUsers.length) return none;
  const teams = await Team.findAll({
    where: {
      created_by: { [Op.in]: ownerUsers.map((ownerUser) => ownerUser.id!) },
      deleted: { [Op.not]: true },
    },
  });
  for (const team of teams) {
    if (await findMembership(team.id!, user.id!)) {
      return { access: 'MEMBER', teamId: team.id!, signerAddress, userEmail };
    }
  }
  return none;
};
```

- [ ] **Step 4: Write `src/app/api/my/license-access/route.ts`**

```ts
import { getLicenseAccess } from '@/services/licenseAccess.service';
import { requireUser } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

// Asked by the console's data proxy before it forwards a request for a license.
// Ignores X-Team-Id: the answer depends only on the license and the caller.
export const GET = async (request: NextRequest) => {
  try {
    const user = await requireUser(request);
    const clientId = request.nextUrl.searchParams.get('clientId');
    return Response.json(await getLicenseAccess(user, clientId));
  } catch (error: unknown) {
    return errorResponse(error, '[License access] Resolve');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/license-access.test.ts`
Expected: `5 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/licenseAccess.service.ts src/app/api/my/license-access test
git add src/services/licenseAccess.service.ts src/app/api/my/license-access test
git commit -m "feat(teams): tell the console's data proxy whether the caller may use a license"
```

---

### Task 14: Docs, full verification, PR and release checklist

**Files:**

- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Document the tests and team scoping in `CLAUDE.md`**

Under `## Key Commands`, add to the bash block:

```bash
npm test             # vitest; needs Postgres on 127.0.0.1:55432 (or TEST_PG_URL)
npm run typecheck    # tsc --noEmit
```

Append to `## Patterns & Conventions`:

```markdown
- **Teams**: every `/api/my/*` route starts with `resolveTeamContext(request)` (`src/services/teamContext.service.ts`). It reads the optional `X-Team-Id` header; without it the caller's own team is active. Writes call `requireOwner(ctx)`. Errors are `ApiError(status, code, message)` and routes answer `{ message, code }`. The contract with the console is `docs/superpowers/plans/2026-10-02-console-teams.md` in the console repo.
- **Tests**: `test/` holds vitest suites that call route handlers directly against a disposable Postgres rebuilt from `src/scripts/db/init-db_*.sql`, with a local JWKS minting tokens (`test/support`). Mailer and Twenty are mocked.
- **Migrations**: add a new `src/scripts/db/init-db_NN.sql`. It must be safe to run twice, and it runs on preview and production **before** the code that reads it deploys.
```

- [ ] **Step 2: Add a "Running tests" section to `README.md`**

````markdown
## Running tests

Tests need a Postgres the suite can drop and recreate a database in. The default is
`postgres://admin@127.0.0.1:55432/console_api_test`; set `TEST_PG_URL` to use another.

```bash
# Homebrew Postgres, Unix sockets off
initdb -D /tmp/console-api-test-pg -U admin --auth=trust
pg_ctl -D /tmp/console-api-test-pg -o "-p 55432 -k '' -c listen_addresses=127.0.0.1" -l /tmp/console-api-test-pg.log start

# or docker
docker run -d --name console-api-test-pg -e POSTGRES_USER=admin -e POSTGRES_HOST_AUTH_METHOD=trust -p 55432:5432 postgres:16

npm test
```
````

- [ ] **Step 3: Verify everything from a clean state**

```bash
npm ci
npm run lint
npm run typecheck
npm test
PG_URL=postgres://u:p@127.0.0.1:1/x npm run build
```

Expected:

- lint reports no `Error:` lines;
- typecheck exits 0;
- vitest reports every file passing, with 0 failed;
- the build exits 0, and its route table lists `/api/my/teams`, `/api/my/team/members`, `/api/my/team/members/[id]`, `/api/my/team/invitations`, `/api/my/team/invitations/[id]`, `/api/my/team/invitations/[id]/resend`, `/api/invitations/accept`, `/api/me/signer`, `/api/my/licenses/[tokenId]/signers`, `/api/my/licenses/[tokenId]/signers/[address]`, `/api/my/licenses/[tokenId]/signers/[address]/disabled` and `/api/my/license-access`.

- [ ] **Step 4: Check that every `/api/my` route resolves the team**

Run: `grep -rL "resolveTeamContext\|requireUser" src/app/api/my --include=route.ts`
Expected: only `src/app/api/my/support/email/route.ts`, which stays open to members by design.

- [ ] **Step 5: Commit the docs and open the PR**

```bash
npx prettier --write CLAUDE.md README.md
git add CLAUDE.md README.md
git commit -m "docs: document team scoping, the test harness and migration order"
git push -u origin feat/teams
gh pr create --base master --head feat/teams \
  --title "feat(teams): team membership, invitations, signer proof and the license key registry" \
  --body-file - <<'EOF'
Part 2 of console teams. Spec: `docs/superpowers/specs/2026-10-01-console-teams-design.md`. Contracts: `docs/superpowers/plans/2026-10-02-console-teams.md` (both in dimo-developer-console).

## What changes
- **Team context:** every `/api/my/*` route answers for the active team. That's `X-Team-Id`, or the caller's own team without it. Members read; only the owner writes (`403 OWNER_ONLY`). Non-members get `403 NOT_A_MEMBER`. `POST /api/my/support/email` stays open.
- **Teams and members:**
  - `GET /api/my/teams`, `GET /api/my/team/members`, `DELETE /api/my/team/members/:id`.
  - Invitations: `POST /api/my/team/invitations` (with resend and cancel) and `POST /api/invitations/accept`.
  - Invite tokens are random, stored only as SHA-256, expire after 7 days, and are bound to the invited email. Existing accounts can be invited.
- **Signer proof:** `PUT /api/me/signer` verifies the C6 message and stores the wallet that signs for each user.
- **Key registry:** `GET`, `PUT` and `POST …/disabled` under `/api/my/licenses/:tokenId/signers`. It records who each license key belongs to; addresses only.
- **License access:** `GET /api/my/license-access?clientId=` answers `OWNER`, `MEMBER` or `NONE` for the console's data proxy, with the caller's `userEmail` for its audit line.
- **Migration:** `init-db_12.sql`. Collaborators become members, duplicate active rows are folded, and it adds the invite columns, the user signer columns and the registry tables. It also widens `configurations.client_id` to `VARCHAR(100)`, but only where it's still shorter than 42 characters, so production's hand-widened column is untouched. Safe to run twice.
- **Tests and CI:** vitest against a disposable Postgres, with a local JWKS and GitHub Actions. Also regression tests for #80.

## Builds on #80
- Configurations keep #80's license-owner rule; members of the owning team can now read them.
- Collaborator removal keeps #80's team scoping and messages.
- #80's `identity.service.ts` gains token ID and client ID lookups.

## Fixed along the way
- Legacy `invitation_code` acceptance ignored the invitee's email. It now requires the invited email, and never accepts token-based invites.
- `GET /api/me` now always shows the caller's own team. Before, it could pick up a team they had joined.

## Compatibility
- Today's console keeps working: the header is optional, and the retired team routes are thin adapters scoped to the caller's team.
- Invites created through the old route now email the new `sign-in?invite=` link. That link needs console part 3 to be accepted.

## Additions to contract C7 (proposed in the index)
- `502 EMAIL_FAILED` on invite and resend.
- `400 INVALID_ADDRESS` on the registry `PUT` and `disabled`.
- `401 UNAUTHORIZED` from every new route.

## Release checklist
1. Confirm #80 is merged and deployed. This branch builds on its Identity service.
2. Back up the database. Then run the migration on **preview**, and later **production**, before deploying this code. The User model reads the new columns.
   `psql "$PG_URL" -v ON_ERROR_STOP=1 --single-transaction -f src/scripts/db/init-db_12.sql`
3. Check `SELECT role, count(*) FROM team_collaborators GROUP BY role;`: no `COLLABORATOR` rows remain.
4. Check `\d license_signers` and `\d license_signer_holders`: both tables exist. Check `\d configurations`: `client_id` is at least 42 characters wide.
5. Merge. Vercel deploys console-api.
6. Smoke test: with a console session, `GET /api/my/teams` returns the personal team, and `GET /api/my/team/members` lists the owner.
7. Then ship console part 3.

## Verification
lint, typecheck, `npm test` and `next build` pass locally and in CI.
EOF
```

Expected: `gh` prints the PR URL.

---

## Self-review

**Spec coverage (part 2):**

| Spec item                                                                                                                                                 | Task        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Data model: membership role, status, invite token hash, expiry, invited_by, uniqueness; users signer columns; `license_signers`; `license_signer_holders` | 3           |
| Team context on every `/api/my/*` route; header optional                                                                                                  | 4, 5, 6, 9  |
| Owner-only writes on the listed paths; support email open                                                                                                 | 5, 6        |
| Every team endpoint (teams, members, invitations, resend, cancel, accept, remove)                                                                         | 7, 8        |
| `PUT /api/me/signer` (C6)                                                                                                                                 | 10          |
| Registry `GET`/`PUT`/`disabled` with the Identity ownership check (60 s cache) and holder validation                                                      | 11, 12      |
| `GET /api/my/license-access`                                                                                                                              | 13          |
| Retired routes kept working until part 3                                                                                                                  | 9           |
| Revoked members still holding an enabled `MEMBER` key appear in the members list                                                                          | 7, 12       |
| Route-level test harness with a disposable Postgres and local JWKS, plus #80 regressions                                                                  | 1, 2        |
| Migration before deploy; console-api ships before the console                                                                                             | 14          |
| #80's configuration, collaborator-removal and Identity behavior pinned by tests; configurations stay license-owner based under teams                      | 2, 6, 9, 11 |
| Schema drift: `configurations.client_id` widened only while shorter than 42 (harness and migration)                                                       | 1, 3        |

**Placeholder scan:** every code step carries complete code. There's no "TBD", no "similar to Task N", and no undefined function.

**Type consistency:**

- `TeamContext` (Task 4) is used unchanged in Tasks 5 to 13.
- `toTeamMember` and `toTeamSummary` (Task 7) are reused in Task 8.
- `getLicenseByTokenId` and `getLicenseByClientId`, added to #80's `identity.service.ts` in Task 11, are used in Tasks 12 and 13. Tests reach Identity only through `fakeIdentity` (Task 1).
- Fixture `createOwnerFor` is introduced in Task 4 and used in Task 7.
- `addMember` is introduced in Task 3.

**Review Focus coverage:**

1. User who owns a team and is a member of another: Task 4, `/api/me with several teams`.
2. Email case and spaces: Task 8, "refuses bad emails… ignoring case and spaces" and "makes the invitee a member".
3. Re-invite after removal: Task 8, "lets a removed member be invited and accept again".
4. Token reuse: Task 8, "refuses a different account, an expired link, garbage and a second use".
5. Mixed-case addresses: Task 12, "treats checksummed and lowercase addresses as the same key"; Task 13, lowercase owner versus checksummed stored wallet.
