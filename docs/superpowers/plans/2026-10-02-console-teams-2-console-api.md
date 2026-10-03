# Console teams, part 2 (console-api) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give dimo-developer-console-api real teams. That means:

- every `/api/my/*` route answers for the active team, refuses writes from members and hides secrets from them;
- owners invite people by email, with rate-limited, email-bound tokens; members can leave;
- each user proves which wallet signs for them, and that wallet can't be shared or swapped while it holds keys;
- a license key registry records who every key belongs to;
- the console's data proxy can ask whether the caller may use a license;
- the legacy team routes keep working until the console moves off them, and are then retired.

**Architecture:**

- `resolveTeamContext(request)` turns the token's user plus an optional `X-Team-Id` header into `{ user, team, company, role, owner, ownerAddress }`.
  - Every `/api/my/*` route starts from it, and `requireOwner(ctx)` guards writes.
  - **Owner** means `teams.created_by` and nothing else.
  - It never returns a context without a team and a company, so no list can fall back to "all companies".
- New services sit beside the existing controllers: team members, invitations (with limits), signer proof, the key registry and license access. #80's `identity.service.ts` gains license lookups. Each service throws an `ApiError(status, code, message)` that routes turn into `{ message, code }`.
- Routes that only the console calls (team, invite, signer, registry, license access) also require the token's `aud` to include `developer-platform` (C4).
- The retired team routes stay as thin adapters over the new services until the console (part 3) stops calling them. Task 15 then deletes them.

**Tech Stack:**

- Next.js 14.2 App Router route handlers, TypeScript strict (target `es2017`), Sequelize 6 on PostgreSQL.
- viem 2.41.2 for signature recovery and address checksums.
- vitest 3 with a disposable Postgres, a local JWKS and a fake Identity for tests.
- GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md` (console repo). **Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md` (console repo); this part implements C4, C6, C7 and the part 2 steps of _Rollout_. Executors read both before starting.

**Repository:** `~/workspace/dimo-developer-console-api`. **Branch:** `feat/teams` from `origin/master` after PR #80 has merged.

**Builds on #80 (last commit `04250f2`):**

- **Scoped user routes** and the `/api/me/complete` fix.
- **Sign-up's wallet check ignores letter case:** `findUserByWalletAddressAnyCase` (`lower(address)`, in `src/controllers/user.controller.ts`) backs `POST /api/user`'s 409.
- **Configurations** limited to the license owner (`isLicenseOwner`).
- **Collaborator removal** limited to the owner's team:
  - a soft-deleted target answers `Collaborator not found`;
  - the last-owner check counts `TeamCollaborator.count({ where: { team_id, role: OWNER, deleted: { [Op.not]: true } } })`.
- **Soft-deleted collaborator rows don't count anywhere:** `findTeamCollaboratorByUserId` and `getTeamCollaborator` (`src/services/teamCollaborator.service.ts`), and `findMyTeam` and `getCollaboratorTeam` (the controller), all filter `deleted: { [Op.not]: true }`.
- **Empty-company and empty-team guards:** `getMyApps` and `getMyConnections`; `getMyTeamCollaborators('')` answers `{ data: [], totalItems: 0, totalPages: 0 }`.
- **List filters:** `transformObject` (`src/utils/filter.ts`) accumulates every non-empty key, so a query parameter can't replace a scoping key.
- **`src/services/identity.service.ts`:** `License = { owner, tokenId }`, `getLicense(clientId)` with a 60-second cache of known licenses, `getLicenseOwner`, `isLicenseOwner`, `IdentityUnavailableError`, and the `IDENTITY_API_URL` override.
  - `getLicense` throws `IdentityUnavailableError` when `body.errors` has any error whose `extensions.code !== 'NOT_FOUND'`. `NOT_FOUND` alone means `null`.
- **The legacy invite** (`invitePersonToMyTeam(user, companyName, email)`):
  - the caller's membership must be `OWNER`, or it throws `ValidatorError('Only the team owner can invite collaborators')`;
  - at most 10 rows created per team per hour (`Too many invitations. Try again in an hour.`);
  - it counts and inserts inside `DB.connection!.transaction`, after `SELECT pg_advisory_xact_lock(hashtext(:teamId))`, and `addTeamCollaborator(input, transaction?)` takes the transaction;
  - always `COLLABORATOR`, and the route reads only `email`.
- **`acceptTeamInvitation`:** only a PENDING row sent to the caller's email. `markAsAccepted` sets `COLLABORATOR`.
- **The invite template:** a module-level `escapeHtml`, and `escapeHtml(userName.slice(0, 60))` for the inviter.
- **`POST /api/my/workspace`:** `getLicense(client_id)` must be owned by the caller and match `token_id`. Otherwise 403 `You do not own this license`; on an Identity failure, 502 `Could not verify license ownership`. It stores `license.owner`.

No task re-adds any of this. Tasks that change it keep #80's response bodies unless C7 says otherwise:

- **Task 3** renames `COLLABORATOR` to `MEMBER`;
- **Task 5** checks the workspace license against the team owner, and tests #80's filters as they are;
- **Task 8** extends the template, and keeps C7's limits race-safe the way #80 keeps its own: count and record under advisory locks;
- **Task 9** moves the legacy routes onto the team model;
- **Task 11** extends the Identity service, sharing `getLicense`'s request and error rule with the new token ID lookup.

## Global Constraints

- Every path, status, error `code`, field name and wire type in contracts C4, C6 and C7 is used exactly as written. Error bodies are `{ "message": string, "code": string }`.
- The header is `X-Team-Id` (read as `request.headers.get('x-team-id')`). Without it, the caller's personal team is active: the team they created (`teams.created_by`). A legacy collaborator with no team of their own gets their oldest accepted membership's team.
- **Owner** is `teams.created_by` and nothing else. `team_collaborators.role` is never trusted to grant owner rights. Accepted invites, and invites refreshed in place, are always `MEMBER`.
- `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me` ignore `X-Team-Id`. They never answer 403 for a stale header.
- Every route, `GET /api/me` included, answers `401 { message: 'User not found', code: 'UNAUTHORIZED' }` when the token maps to no console user. Team, invite, signer, registry and license-access routes answer the same 401 when the token's `aud` doesn't include `developer-platform`.
- Addresses are stored lowercase (`users.signer_address`, `license_signers.signer_address`) and returned checksummed with viem `getAddress`. `users.signer_address` is unique by `lower(...)`.
- New timestamp columns are `TIMESTAMPTZ`. Tests run with `TZ=UTC`.
- Invite tokens are `randomBytes(32).toString('base64url')`. Only `sha256(token)` as hex is stored. The link is `${config.frontendUrl}sign-in?invite=${token}`. Invites expire after 7 days.
- **Until part 3 ships** (C7), today's console keeps working:
  - `GET /api/me` reports a member's role as `COLLABORATOR` (Task 4);
  - the legacy `POST /api/my/team/invitation` emails the legacy `sign-in?code=<base64 row id>` link, with no token, accepted through `invitation_code` for the invited email only (Tasks 8 and 9).
  - Task 15 switches the role to `MEMBER` and removes the legacy link with its route.
- Invite limits (C7):
  - 10 invite or resend emails per team per hour;
  - 30 per inviting user per day;
  - 50 pending invites per team;
  - one resend per invite per 60 seconds.
  - Any of these answers `429 RATE_LIMITED`.
  - The inviter's name and the team name are HTML-escaped and capped at 60 characters in the email.
- The signer proof message is contract C6, verbatim. It may be at most 10 minutes old and at most 1 minute in the future.
- Identity:
  - All Identity access goes through #80's `src/services/identity.service.ts` (`IDENTITY_API_URL` overrides `config.identityApiUrl`); there is no second client.
  - A known license is cached for 60 seconds per token ID and per lowercase client ID. Unknown licenses and failures aren't cached.
  - An HTTP 200 carrying GraphQL errors is an outage (`IdentityUnavailableError`), unless every error has `extensions.code === 'NOT_FOUND'`. That is how Identity answers a license that doesn't exist (checked live on 2026-10-02).
  - The `tokenId` argument is `Int` (`DeveloperLicenseBy` in `~/workspace/dimo-developer-console/src/gql/graphql.ts`).
  - Tests reach Identity only through `fakeIdentity`, which passes every other URL (the JWKS) to the real `fetch`.
- Configurations stay authorized by #80's rule: the on-chain owner of the configuration's license, which under teams means the active team owner's wallet. There's no `owner_id` check.
- Secrets are owner-only:
  - members read connections with `connection_license_private_key` and `device_issuance_key` as `null`;
  - members read apps whose signers have no `api_key`.
- `viem` is pinned to `2.41.2`, the console's installed version. `vitest` is `^3.2.4`. `tsconfig.json` targets `es2017`, and the plan's code iterates `Set`s with `Array.from` regardless.
- Public routes stay untouched: `/api/configurations`, `/api/brand`, `/api/auth/exist`, `/api/crypto`.
- `POST /api/my/support/email` stays open to members, and answers 401 for an unknown user.
- Format only the files you touch, with `npx prettier --write <files>`. Prettier has no SQL parser, so never pass it `.sql` files. **Never** run `npm run lint:format`: it rewrites the whole repo.
- Commit messages use conventional prefixes and **never** include a `Co-Authored-By` trailer or any Claude attribution.
- Migrations are run by hand; console-api has no migration runner. `init-db_12.sql` runs on each database **before** the code that reads its columns deploys, with `init-db_12.down.sql` ready (Task 14).

## Review Focus

1. **A user who owns a team and is also a member of another.** With no header, the personal team (`teams.created_by`) is active, and `GET /api/me` shows the personal company, never the other team's. A membership row wrongly marked `OWNER` grants nothing. Covered in Tasks 3 and 4.
2. **Invite email case and whitespace.** Inviting `"  Alice@X.test "` lets the account `alice@x.test` accept. A second invite to `ALICE@x.test` gets 409 `ALREADY_INVITED`, and so does a concurrent duplicate. Concurrent invites can't pass C7's limits. Covered in Task 8.
3. **Re-inviting someone who was removed or who left.** Their `REVOKED` or `LEFT` row doesn't block a new invite or its acceptance. Covered in Task 8.
4. **Invite token reuse.** A token that was already accepted, or used by a different account, gets 400 `INVITE_INVALID` or 403 `INVITE_EMAIL_MISMATCH`, and never a second membership. Covered in Task 8.
5. **Mixed-case addresses.**
   - Registry calls with a checksummed or lowercase path address hit the same row.
   - `license-access` with a lowercase client ID finds an owner whose wallet is stored checksummed.
   - Two users can't register the same signer in different letter case.
   - Covered in Tasks 10, 12 and 13.

## File map

| File                                                                                           | Responsibility                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.mts`, `test/support/*`                                                          | Test harness: database, tokens (with `aud`), requests, fixtures, fake Identity                                                                                        |
| `.github/workflows/ci.yml`                                                                     | Lint, typecheck and tests on every PR                                                                                                                                 |
| `tsconfig.json` (modify)                                                                       | `"target": "es2017"`                                                                                                                                                  |
| `src/scripts/db/init-db_12.sql`, `init-db_12.down.sql`                                         | Migration and its rollback: owner demotion, membership columns and indexes, invite send log, user signer, key registry, `configurations.client_id` widening           |
| `src/models/teamCollaborator.model.ts` (modify)                                                | `OWNER`/`MEMBER`; `PENDING`/`ACCEPTED`/`REVOKED`/`LEFT`; invite columns                                                                                               |
| `src/models/user.model.ts` (modify)                                                            | `signer_address`, `signer_verified_at`                                                                                                                                |
| `src/models/licenseSigner.model.ts`, `licenseSignerHolder.model.ts`, `teamInviteSend.model.ts` | Key registry and invite send log                                                                                                                                      |
| `src/types/teams.ts`                                                                           | C7 wire types                                                                                                                                                         |
| `src/utils/apiError.ts`                                                                        | `ApiError` and route error responses                                                                                                                                  |
| `src/services/membership.service.ts`                                                           | Personal team and active-membership queries                                                                                                                           |
| `src/services/teamContext.service.ts`                                                          | `requireUser`, `resolveTeamContext`, `requireOwner`, `companyScope`                                                                                                   |
| `src/services/teamMembers.service.ts`                                                          | Team summaries, member list with `memberKeys`, removal, leaving                                                                                                       |
| `src/services/invitation.service.ts`                                                           | Create, resend, cancel, preview and accept invites, with limits                                                                                                       |
| `src/services/signerProof.service.ts`                                                          | C6 message, verification, `SIGNER_IN_USE` / `SIGNER_LOCKED`                                                                                                           |
| `src/services/identity.service.ts`                                                             | (from #80: `getLicense` with its `NOT_FOUND` rule, `getLicenseOwner`, `isLicenseOwner`) gains `getLicenseByTokenId`, sharing that request, and `clearIdentityCache` |
| `src/services/licenseSigner.service.ts`                                                        | Key registry, with `SIGNER_MISMATCH`, `KIND_CONFLICT` and `SIGNER_IN_USE`                                                                                             |
| `src/services/licenseAccess.service.ts`                                                        | Who may use a license, and `memberOfTeam`                                                                                                                             |
| `src/app/api/my/**` (modify)                                                                   | Team context, owner-only writes, members without secrets                                                                                                              |
| New routes                                                                                     | `teams`, `team/members`, `team/leave`, `team/invitations`, `invitations/preview`, `invitations/accept`, `me/signer`, `licenses/[tokenId]/signers`, `license-access`   |

---

### Task 1: Test harness, CI and a smoke test

**Files:**

- Create: `vitest.config.mts`
- Create: `test/support/testDatabase.ts`, `test/support/globalSetup.ts`, `test/support/setup.ts`, `test/support/auth.ts`, `test/support/http.ts`, `test/support/db.ts`, `test/support/fixtures.ts`, `test/support/identity.ts`
- Create: `test/api/harness.test.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (scripts, `viem`, `vitest`)
- Modify: `tsconfig.json` (`"target": "es2017"`)

**Interfaces:**

- Produces:
  - `request(method: string, path: string, options?: { as?: string; aud?: string | string[]; teamId?: string; body?: unknown; rawBody?: string }): Promise<NextRequest>`, where `as` is the wallet the bearer token is minted for;
  - `read(response: Response): Promise<{ status: number; body: any }>`;
  - `tokenFor(address: string, options?: { aud?: string | string[] }): Promise<string>`. `aud` defaults to `['developer-platform']`, the console's client ID (C4);
  - `sql<T>(query: string, replacements?: Record<string, unknown>): Promise<T[]>`;
  - `runSql(text: string): Promise<void>`;
  - `newWallet()` (a viem `PrivateKeyAccount`);
  - `createUser(overrides?)`;
  - `createOwner(label?)` and `createOwnerFor(user, label?)`, returning `{ user, company, team, membership }`;
  - `fakeIdentity(licenses: { tokenId: number; clientId: string; owner: string }[], options?: { status?: number; graphqlError?: string })`.
    - It stubs global `fetch`, which is the only way `@/services/identity.service` reaches Identity, and returns the mock.
    - It answers only requests to `process.env.IDENTITY_API_URL`. Every other URL goes to the real `fetch`. jose v6 reads global `fetch` lazily for the JWKS (`node_modules/jose/dist/webapi/jwks/remote.js`), so intercepting it would make every request 401.
    - A license that isn't listed gets Identity's real not-found answer: HTTP 200, `data.developerLicense: null`, and one error with `extensions.code: 'NOT_FOUND'`.
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

- [ ] **Step 3: Add the scripts to `package.json` and target es2017**

In `tsconfig.json`, add `"target": "es2017",` as the first entry of `compilerOptions`. Without it, TypeScript defaults to ES5, and `for…of` over a `Set` or `Map` fails to compile. Next builds with SWC, so the build output doesn't change.

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
      // Dates in assertions and TIMESTAMP columns read the same on every machine.
      TZ: 'UTC',
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

/** The console's client ID: dex puts it in `aud` of every console login (C4). */
export const CONSOLE_AUDIENCE = 'developer-platform';

/** A DIMO-shaped access token for `address`, signed by the test key set. */
export const tokenFor = async (
  address: string,
  { aud = [CONSOLE_AUDIENCE] }: { aud?: string | string[] } = {},
) => {
  if (!privateKey) throw new Error('startAuthServer() has not run');
  return new SignJWT({ ethereum_address: address })
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuer(process.env.JWT_ISSUER!)
    .setAudience(aud)
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
  /** The token's audience; defaults to the console's (`developer-platform`). */
  aud?: string | string[];
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
  if (options.as) {
    headers.set(
      'Authorization',
      `Bearer ${await tokenFor(options.as, { aud: options.aud })}`,
    );
  }
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

`test/support/identity.ts`:

```ts
import { vi } from 'vitest';

import { newWallet } from './fixtures';

export interface FakeLicense {
  tokenId: number;
  clientId: string;
  owner: string;
}

// Captured before any test stubs fetch: everything that isn't Identity, such as
// jose fetching the JWKS, must still reach the network.
const realFetch = globalThis.fetch;

const urlOf = (input: string | URL | Request) =>
  typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Stands in for the Identity API at IDENTITY_API_URL. It answers the
 * developerLicense query by `variables.clientId` (case-insensitive) or
 * `variables.tokenId`. A license it doesn't know gets Identity's real
 * not-found answer.
 * - `status`: any value other than 200 simulates an HTTP outage.
 * - `graphqlError`: simulates an HTTP 200 carrying a GraphQL error.
 */
export const fakeIdentity = (
  licenses: FakeLicense[],
  options: { status?: number; graphqlError?: string } = {},
) => {
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    if (urlOf(input) !== process.env.IDENTITY_API_URL) return realFetch(input, init);

    if (options.status && options.status !== 200) {
      return json({ message: 'unavailable' }, options.status);
    }
    if (options.graphqlError) {
      return json({
        errors: [
          {
            message: options.graphqlError,
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
          },
        ],
        data: null,
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
    if (license) return json({ data: { developerLicense: license } });
    return json({
      errors: [
        {
          message: 'No developer license with that id.',
          path: ['developerLicense'],
          extensions: { code: 'NOT_FOUND' },
        },
      ],
      data: { developerLicense: null },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/** A client ID no earlier test has used, so Identity's owner cache can't carry over. */
export const newClientId = () => newWallet().address;

/** The Identity calls a fetch mock received; JWKS fetches are left out. */
export const identityCalls = (fetchMock: ReturnType<typeof fakeIdentity>) =>
  fetchMock.mock.calls.filter(([input]) => urlOf(input) === process.env.IDENTITY_API_URL);
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
import { fakeIdentity, newClientId } from '../support/identity';

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

  it('lets the JWKS fetch through while Identity is faked', async () => {
    const { user } = await createOwner('Jwks');
    fakeIdentity([]);

    // The first token check in this file fetches the key set through global fetch.
    const response = await read(
      await getMe(await request('GET', '/api/me', { as: user.address! })),
    );

    expect(response.status).toBe(200);
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
Expected: `4 passed`. Without the `WIDEN_CONFIGURATION_CLIENT_ID` step, the configuration test fails with `value too long for type character varying(36)`.

Run: `npm test -- test/api/harness.test.ts -t "JWKS"`
Expected: `1 passed`. That test now makes the file's first token check, so it proves the key set is fetched through `fakeIdentity`. If it fails with `ECONNREFUSED 127.0.0.1:55432`, Postgres from step 2 isn't running.

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
npx prettier --write vitest.config.mts test .github/workflows/ci.yml package.json tsconfig.json
git add vitest.config.mts test .github/workflows/ci.yml package.json package-lock.json tsconfig.json
git commit -m "test: add a vitest harness with a disposable Postgres, local JWKS and CI"
```

---

### Task 2: Pin the #80 security fixes with regression tests

PR #80 had no tests. Its fixes are verified by hand and already in `master`, so these tests pass on the first run. They exist so later tasks can't reopen the holes. They cover every part of #80:

- scoped user routes and the `/api/me/complete` takeover;
- sign-up's one-account-per-wallet check, in any letter case;
- configurations limited to the license owner (via `@/services/identity.service`);
- collaborator removal limited to the caller's own team, refusing a row already removed, and counting only rows not removed for the last-owner check;
- the collaborator list: empty for a caller with no team, and never widened by a query parameter;
- soft-deleted rows granting nothing: no team in `/api/me`, no right to invite;
- legacy invites only by the team owner, always as `COLLABORATOR`, at most 10 per team per hour even when requests race, with the inviter's name escaped and cut to 60 characters, and `invitation_code` accepted only by the invited email (as `COLLABORATOR`);
- `POST /api/my/workspace` only for a license the caller owns and whose token ID the body names, storing the license's real owner, with an Identity GraphQL error answered as 502.

The assertions use #80's exact messages and roles (commit `04250f2`). Three later tasks change behavior these tests see, and each updates the assertion it changes:

- **Task 3** renames the role to `MEMBER`, in the two `COLLABORATOR` assertions.
- **Task 4** answers 401 for an unknown wallet on `/api/me`.
- **Task 9** moves the legacy invite onto C7's limits.

Two tests also allow for Task 9 without an update: a caller with no team gets #80's 400 or empty page before it, and 403 `NOT_A_MEMBER` after it. Their assertions only require that nothing is sent and no other team's row is shown.

**Files:**

- Create: `test/api/regressions-80.test.ts`

**Interfaces:**

- Consumes (Task 1): `request`, `read`, `sql`, `createUser`, `createOwner`, `newWallet`, `fakeIdentity`, `newClientId`.
- Consumes (#80, commit `04250f2`):
  - `getLicense`, `getLicenseOwner` and `isLicenseOwner` in `src/services/identity.service.ts`, with the `NOT_FOUND` rule;
  - `removeMyCollaboratorById`, `getMyTeamCollaborators`, `invitePersonToMyTeam` (advisory lock) and `acceptTeamInvitation` in `src/controllers/teamCollaborator.controller.ts`;
  - `markAsAccepted` and `findTeamCollaboratorByUserId` in `src/services/teamCollaborator.service.ts`;
  - `findUserByWalletAddressAnyCase` in `src/controllers/user.controller.ts`;
  - `transformObject` in `src/utils/filter.ts`;
  - the escaping in `src/templates/team.ts`.

- [ ] **Step 1: Write the tests**

`test/api/regressions-80.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

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
import { GET as listCollaborators } from '@/app/api/my/team/collaborator/route';
import { POST as legacyInvite } from '@/app/api/my/team/invitation/route';
import { POST as createWorkspace } from '@/app/api/my/workspace/route';
import { POST as createUserRoute } from '@/app/api/user/route';
import Mailer from '@/utils/mailer';
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

  it('POST /api/user refuses a second account for the same wallet in another letter case', async () => {
    const wallet = newWallet().address;
    await insertLegacyUser('lower@x.test', wallet.toLowerCase());

    const again = await createUserRoute(
      await request('POST', '/api/user', {
        as: wallet,
        body: { name: 'D', email: 'upper@x.test', auth: 'credentials', auth_login: 'd' },
      }),
    );

    expect(again.status).toBe(409);
    expect(await userByEmail('upper@x.test')).toBeUndefined();
  });

  it("gives a removed collaborator's account no team in GET /api/me", async () => {
    const acme = await createOwner('Acme');
    const removed = await createUser();
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted, deleted_at)
       VALUES (gen_random_uuid()::text, :team, :user, 'COLLABORATOR', 'ACCEPTED', now(), now(), true, now())`,
      { team: acme.team.id, user: removed.id },
    );

    const response = await read(
      await getMe(await request('GET', '/api/me', { as: removed.address! })),
    );

    expect(response.status).toBe(200);
    expect(response.body.team).toBeUndefined();
    expect(response.body.company).toBeUndefined();
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
    const owner = (await createOwner('Owner')).user;
    const other = (await createOwner('Other')).user;
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
    const owner = (await createOwner('Owner')).user;
    fakeIdentity([], { status: 500 });

    expect(await create(owner.address!, newClientId())).toEqual({
      status: 502,
      body: { error: 'Could not verify license ownership' },
    });
  });
});

describe('PR #80 regressions: legacy invites', () => {
  const addRow = (
    teamId: string,
    userId: string | null,
    role: string,
    email: string | null = null,
  ) =>
    sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, email, role, status, created_at, updated_at, deleted)
       VALUES (gen_random_uuid()::text, :teamId, :userId, :email, :role, :status, now(), now(), false)`,
      { teamId, userId, email, role, status: userId ? 'ACCEPTED' : 'PENDING' },
    );
  const invite = async (as: string, email: string) =>
    read(
      await legacyInvite(
        await request('POST', '/api/my/team/invitation', {
          as,
          body: { email, role: 'OWNER' },
        }),
      ),
    );
  const invitedRole = async (email: string) =>
    (
      await sql<{ role: string }>(
        'SELECT role FROM team_collaborators WHERE lower(email) = :email AND deleted IS NOT TRUE',
        { email },
      )
    )[0]?.role;

  it('lets only the team owner invite, always as a collaborator', async () => {
    const acme = await createOwner('Acme');
    const collaborator = await createUser();
    await addRow(acme.team.id!, collaborator.id!, 'COLLABORATOR');

    expect(await invite(collaborator.address!, 'sneaky@x.test')).toEqual({
      status: 400,
      body: { message: 'Only the team owner can invite collaborators' },
    });
    expect(await invitedRole('sneaky@x.test')).toBeUndefined();

    expect(await invite(acme.user.address!, 'pat@x.test')).toEqual({
      status: 200,
      body: { message: 'Invitation has been sent to pat@x.test' },
    });
    // The body asked for OWNER; the role is never taken from it.
    expect(await invitedRole('pat@x.test')).toBe('COLLABORATOR');
  });

  it('allows 10 invitations per team per hour', async () => {
    const acme = await createOwner('Acme');
    for (let n = 0; n < 10; n += 1) {
      await addRow(acme.team.id!, null, 'COLLABORATOR', `earlier${n}@x.test`);
    }

    expect(await invite(acme.user.address!, 'eleventh@x.test')).toEqual({
      status: 400,
      body: { message: 'Too many invitations. Try again in an hour.' },
    });
  });

  it('keeps the limit when invitations race', async () => {
    const acme = await createOwner('Acme');
    // Only invitations count toward the limit, not the owner's own row.
    await sql(
      "UPDATE team_collaborators SET created_at = now() - interval '2 hours' WHERE team_id = :team",
      { team: acme.team.id },
    );
    for (let n = 0; n < 8; n += 1) {
      expect((await invite(acme.user.address!, `early${n}@x.test`)).status).toBe(200);
    }

    // Four at once for the last two places. Four stays under Sequelize's default pool
    // of five: each request waiting on the lock holds a connection.
    const responses = await Promise.all(
      [0, 1, 2, 3].map((n) => invite(acme.user.address!, `race${n}@x.test`)),
    );

    expect(responses.filter((response) => response.status === 200)).toHaveLength(2);
    const [{ count }] = await sql<{ count: string }>(
      "SELECT count(*) FROM team_collaborators WHERE team_id = :team AND status = 'PENDING'",
      { team: acme.team.id },
    );
    expect(count).toBe('10');
  });

  it('gives a removed OWNER row no right to invite', async () => {
    const acme = await createOwner('Acme');
    const removed = await createUser();
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted, deleted_at)
       VALUES (gen_random_uuid()::text, :team, :user, 'OWNER', 'ACCEPTED', now(), now(), true, now())`,
      { team: acme.team.id, user: removed.id },
    );

    const response = await invite(removed.address!, 'sneaky@x.test');

    // #80 answers 400. From Task 9 the route answers 403 NOT_A_MEMBER, because the
    // caller has no team at all. Either way nothing is created or sent.
    expect([400, 403]).toContain(response.status);
    expect(await invitedRole('sneaky@x.test')).toBeUndefined();
    expect(Mailer.sendMail).not.toHaveBeenCalled();
  });

  it('escapes and shortens the inviter name in the email', async () => {
    const acme = await createOwner('Acme');
    await acme.user.update({ name: `<b>${'E'.repeat(70)}</b> Smith` });

    await invite(acme.user.address!, 'pat@x.test');

    const { html } = vi.mocked(Mailer.sendMail).mock.calls[0][0];
    expect(html).not.toContain('<b>');
    expect(html).toContain(`&lt;b&gt;${'E'.repeat(57)}`);
    expect(html).not.toContain('E'.repeat(58));
  });

  it('accepts an invitation_code only for the invited email, as a collaborator', async () => {
    const acme = await createOwner('Acme');
    await addRow(acme.team.id!, null, 'OWNER', 'Pat@x.test');
    const [row] = await sql<{ id: string }>(
      "SELECT id FROM team_collaborators WHERE email = 'Pat@x.test'",
    );
    const code = Buffer.from(row.id).toString('base64');
    const bob = await createUser({ email: 'bob@x.test' });
    const pat = await createUser({ email: 'pat@x.test' });
    const state = async () =>
      (
        await sql<{ status: string; role: string; user_id: string | null }>(
          'SELECT status, role, user_id FROM team_collaborators WHERE id = :id',
          { id: row.id },
        )
      )[0];

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: bob.address! }),
    );
    expect((await state()).status).toBe('PENDING');

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: pat.address! }),
    );
    expect(await state()).toEqual({
      status: 'ACCEPTED',
      role: 'COLLABORATOR',
      user_id: pat.id,
    });
  });
});

describe('PR #80 regressions: workspaces', () => {
  const body = (clientId: string, tokenId: number) => ({
    name: 'Acme workspace',
    token_id: tokenId,
    client_id: clientId,
    owner: '0x9999999999999999999999999999999999999999',
  });
  const create = async (as: string, payload: unknown) =>
    read(
      await createWorkspace(
        await request('POST', '/api/my/workspace', { as, body: payload }),
      ),
    );
  const workspaceOwners = async () =>
    (await sql<{ owner: string }>('SELECT owner FROM workspaces')).map(
      (row) => row.owner,
    );
  const notYours = { status: 403, body: { message: 'You do not own this license' } };

  it('creates a workspace only for a license the caller owns, with the license owner stored', async () => {
    const acme = await createOwner('Acme');
    const other = await createOwner('Other');
    const clientId = newClientId();
    fakeIdentity([{ tokenId: 7, clientId, owner: acme.user.address! }]);

    expect(await create(other.user.address!, body(clientId, 7))).toEqual(notYours);
    // The right owner, but a token ID that isn't this license's.
    expect(await create(acme.user.address!, body(clientId, 8))).toEqual(notYours);
    expect(await workspaceOwners()).toEqual([]);

    expect((await create(acme.user.address!, body(clientId, 7))).status).toBe(200);
    expect(await workspaceOwners()).toEqual([acme.user.address]);
  });

  it('answers 502 when Identity fails', async () => {
    const acme = await createOwner('Acme');
    fakeIdentity([], { status: 500 });

    expect(await create(acme.user.address!, body(newClientId(), 7))).toEqual({
      status: 502,
      body: { message: 'Could not verify license ownership' },
    });
  });

  it('answers 502 for an Identity GraphQL error, and 403 for a license Identity does not know', async () => {
    const acme = await createOwner('Acme');

    fakeIdentity([], { graphqlError: 'database is down' });
    expect(await create(acme.user.address!, body(newClientId(), 7))).toEqual({
      status: 502,
      body: { message: 'Could not verify license ownership' },
    });

    // Identity's real answer for an unknown license: HTTP 200 with NOT_FOUND.
    fakeIdentity([]);
    expect(await create(acme.user.address!, body(newClientId(), 7))).toEqual(notYours);
    expect(await workspaceOwners()).toEqual([]);
  });
});

describe("PR #80 regressions: collaborator lists and removal stay inside the owner's team", () => {
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
  const list = async (as: string, query = '') =>
    read(
      await listCollaborators(
        await request('GET', `/api/my/team/collaborator${query}`, { as }),
      ),
    );
  const markRemoved = (id: string) =>
    sql('UPDATE team_collaborators SET deleted = true, deleted_at = now() WHERE id = :id', {
      id,
    });
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

  it('refuses a row that was already removed', async () => {
    const acme = await createOwner('Acme');
    const gone = await addCollaborator(acme.team.id!, (await createUser()).id!);
    await markRemoved(gone);

    expect(await remove(acme.user.address!, gone)).toEqual({
      status: 400,
      body: { message: 'Collaborator not found' },
    });
  });

  it('protects the last owner even with a removed OWNER row left in the team', async () => {
    const acme = await createOwner('Acme');
    await markRemoved(
      await addCollaborator(acme.team.id!, (await createUser()).id!, 'OWNER'),
    );

    expect(await remove(acme.user.address!, acme.membership.id!)).toEqual({
      status: 400,
      body: { message: 'Cannot remove the only administrator from the group.' },
    });
    expect(await isDeleted(acme.membership.id!)).toBe(false);
  });

  it('lists no collaborators to a caller with no team', async () => {
    const other = await createOwner('Other');
    await addCollaborator(
      other.team.id!,
      (await createUser({ email: 'member@other.test' })).id!,
    );
    const loner = await createUser();

    const response = await list(loner.address!);

    // #80 answers an empty page. From Task 9 the route answers 403 NOT_A_MEMBER,
    // because the caller has no team. Never another team's rows.
    expect(response.body.data ?? []).toEqual([]);
    expect(JSON.stringify(response.body)).not.toContain('member@other.test');
  });

  it("can't be widened past the caller's team by a query parameter", async () => {
    const acme = await createOwner('Acme');
    const other = await createOwner('Other');
    const outsider = await createUser({ email: 'member@other.test' });
    const outsiderRow = await addCollaborator(other.team.id!, outsider.id!);

    for (const query of [`?user_id=${outsider.id}`, `?id=${outsiderRow}`]) {
      const response = await list(acme.user.address!, query);

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('member@other.test');
      expect(
        response.body.data.every((row: { team_id: string }) => row.team_id === acme.team.id),
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run them**

Run: `npm test -- test/api/regressions-80.test.ts`
Expected: `34 passed`.

- [ ] **Step 3: Commit**

```bash
npx prettier --write test/api/regressions-80.test.ts
git add test/api/regressions-80.test.ts
git commit -m "test: pin the scoped user routes and the /api/me/complete takeover fix"
```

- [ ] **Step 4: Prove the tests detect the holes**

This is a one-off check in a throwaway worktree. It runs the same tests against the code from just before #80.

```bash
# master just before #80 (#80 branched from it): the code #80 fixed.
PRE80=d19dcc6
git worktree add --detach /tmp/console-api-pre80 "$PRE80"
cp -R test vitest.config.mts /tmp/console-api-pre80/
ln -s "$PWD/node_modules" /tmp/console-api-pre80/node_modules
(cd /tmp/console-api-pre80 && npx vitest run test/api/regressions-80.test.ts)
git worktree remove --force /tmp/console-api-pre80
```

Expected: in the pre-#80 worktree, at least these FAIL:

- the forged-role, PUT /api/me, takeover and deleted-routes tests, and the second account for a wallet in another letter case;
- the removed collaborator's team in `/api/me`;
- the other user's configuration read, update, delete, list and create;
- the cross-team collaborator removal, the already-removed row and the last owner beside a removed `OWNER` row;
- the collaborator list for a caller with no team, and through `?user_id=` and `?id=`;
- the legacy invite by a non-owner and by a removed `OWNER` row, and the racing invites (all four go through);
- the workspace created for someone else's license, and on an Identity GraphQL error.

The worktree is then removed, and the branch is untouched.

---

### Task 3: Migration (and its rollback), models, wire types and `ApiError`

**Files:**

- Create: `src/scripts/db/init-db_12.sql`, `src/scripts/db/init-db_12.down.sql`
- Modify: `src/models/teamCollaborator.model.ts` (whole file below)
- Modify: `src/models/user.model.ts` (two columns)
- Create: `src/models/licenseSigner.model.ts`, `src/models/licenseSignerHolder.model.ts`, `src/models/teamInviteSend.model.ts`
- Create: `src/types/teams.ts`, `src/utils/apiError.ts`
- Modify: `src/controllers/teamCollaborator.controller.ts`, `src/services/teamCollaborator.service.ts` (#80's two `TeamRoles.COLLABORATOR` uses become `MEMBER`)
- Modify: `test/support/fixtures.ts` (append `addMember`), `test/api/regressions-80.test.ts` (two role assertions)
- Test: `test/db/migration-12.test.ts`, `test/models/team-models.test.ts`

**Interfaces:**

- Produces:
  - `TeamRoles { OWNER = 'OWNER', MEMBER = 'MEMBER' }` and `InvitationStatuses { PENDING, ACCEPTED, REVOKED, LEFT }` from `@/models/teamCollaborator.model`. The `role` column is descriptive only; who owns a team comes from `teams.created_by` (Task 4).
  - `TeamCollaborator` gains `invite_token_hash`, `invite_expires_at` (TIMESTAMPTZ), `invited_by`, and the include accessors `User` and `Team`.
  - `User` gains `signer_address?: string | null` (unique by `lower()`) and `signer_verified_at?: Date | null` (TIMESTAMPTZ).
  - `LicenseSigner` (`team_id`, `license_token_id: number`, `signer_address`, `kind`, `note`, `created_by`, `disabled_by`, `disabled_at`, include alias `holders`) and `SignerKinds`.
  - `LicenseSignerHolder` (`signer_id`, `user_id`, `name`, include accessor `User`).
  - `TeamInviteSend` (`team_id`, `membership_id`, `sent_by`, `created_at`): one row per invite or resend email, for C7's limits.
  - `@/types/teams`: `TeamRole`, `MembershipStatus`, `TeamSummary`, `MemberKey`, `TeamMember`, `SignerKind`, `LicenseSignerHolder`, `LicenseSignerRecord`, `HolderInput`, `LicenseAccess`, `InvitationPreview`.
  - `@/utils/apiError`:
    - `ApiError(status, code, message)`;
    - `apiErrorResponse(error): Response | null`;
    - `errorResponse(error, step): Response`, with a 500 fallback;
    - `legacyErrorResponse(error, step): Response`, with a 400 `{ message }` fallback, as the existing routes do.
  - Fixture: `addMember(teamId: string, user: User): Promise<TeamCollaborator>`.

- [ ] **Step 1: Write the failing migration test**

`test/db/migration-12.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { runSql, sql } from '../support/db';
import { createOwner, createUser } from '../support/fixtures';

const read = (name: string) =>
  readFileSync(new URL(`../../src/scripts/db/${name}`, import.meta.url), 'utf8');
const MIGRATION = read('init-db_12.sql');
const ROLLBACK = read('init-db_12.down.sql');

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const dropUniqueIndexes = () =>
  runSql(
    'DROP INDEX IF EXISTS idx_team_collaborators_member; DROP INDEX IF EXISTS idx_team_collaborators_pending_email;',
  );
const columnType = async (table: string, column: string) =>
  (
    await sql<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns WHERE table_name = :table AND column_name = :column`,
      { table, column },
    )
  )[0]?.data_type;

describe('init-db_12.sql', () => {
  it('can run again on a database that already has it', async () => {
    await runSql(MIGRATION);
    await runSql(MIGRATION);

    const indexes = await sql<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE indexname IN
        ('idx_team_collaborators_member', 'idx_team_collaborators_pending_email',
         'idx_team_collaborators_invite_token', 'idx_license_signers_license_signer',
         'idx_users_signer_address')
       ORDER BY indexname`,
    );
    expect(indexes.map((row) => row.indexname)).toEqual([
      'idx_license_signers_license_signer',
      'idx_team_collaborators_invite_token',
      'idx_team_collaborators_member',
      'idx_team_collaborators_pending_email',
      'idx_users_signer_address',
    ]);
  });

  it('makes every new timestamp column TIMESTAMPTZ', async () => {
    for (const [table, column] of [
      ['team_collaborators', 'invite_expires_at'],
      ['users', 'signer_verified_at'],
      ['license_signers', 'disabled_at'],
      ['license_signers', 'created_at'],
      ['license_signer_holders', 'created_at'],
      ['team_invite_sends', 'created_at'],
    ]) {
      expect(await columnType(table, column), `${table}.${column}`).toBe(
        'timestamp with time zone',
      );
    }
  });

  it("demotes OWNER rows of anyone but the creator, and keeps the creator's row when folding duplicates", async () => {
    const { team, user: creator, membership } = await createOwner('Acme');
    const impostor = await createUser();
    await dropUniqueIndexes();
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, email, role, status, created_at, updated_at, deleted) VALUES
        (:a, :team, :impostor, NULL, 'OWNER', 'ACCEPTED', now(), now(), false),
        (:b, :team, :creator, NULL, 'COLLABORATOR', 'ACCEPTED', now() - interval '2 days', now(), false)`,
      { a: id(1), b: id(2), team: team.id, impostor: impostor.id, creator: creator.id },
    );

    await runSql(MIGRATION);

    const rows = await sql<{ id: string; role: string; deleted: boolean }>(
      `SELECT id, role, deleted FROM team_collaborators WHERE id IN (:ids) ORDER BY id`,
      { ids: [id(1), id(2), membership.id] },
    );
    expect(rows).toHaveLength(3);
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: id(1), role: 'MEMBER', deleted: false },
        // Older than the creator's OWNER row, but folded into it.
        { id: id(2), role: 'MEMBER', deleted: true },
        { id: membership.id, role: 'OWNER', deleted: false },
      ]),
    );
  });

  it('renames collaborators to members and keeps one active row per duplicate', async () => {
    const { team } = await createOwner('Dupes');
    const person = await createUser();
    await dropUniqueIndexes();
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

    try {
      await runSql('ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(255)');
      await runSql(MIGRATION);
      expect(await clientIdLength()).toBe(255);
    } finally {
      // Leave the column as the harness builds it for later test files.
      await runSql('ALTER TABLE configurations ALTER COLUMN client_id TYPE VARCHAR(100)');
    }
  });

  it('stores signer addresses in lower case, holders as a member or a name, and one user per signer', async () => {
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

    const other = await createUser();
    await sql(
      `UPDATE users SET signer_address = '0xdef0000000000000000000000000000000000000' WHERE id = :id`,
      {
        id: user.id,
      },
    );
    await expect(
      sql(
        `UPDATE users SET signer_address = '0xDEF0000000000000000000000000000000000000' WHERE id = :id`,
        {
          id: other.id,
        },
      ),
    ).rejects.toMatchObject({
      name: 'SequelizeUniqueConstraintError',
      parent: expect.objectContaining({ constraint: 'idx_users_signer_address' }),
    });
  });
});

describe('init-db_12.down.sql', () => {
  it('undoes the migration, and the migration applies again afterwards', async () => {
    const { team } = await createOwner('Acme');
    const member = await createUser();
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted)
       VALUES (:id, :team, :member, 'MEMBER', 'LEFT', now(), now(), true)`,
      { id: id(5), team: team.id, member: member.id },
    );

    try {
      await runSql(ROLLBACK);

      const tables = await sql<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_name IN ('license_signers', 'license_signer_holders', 'team_invite_sends')`,
      );
      expect(tables).toEqual([]);
      expect(await columnType('users', 'signer_address')).toBeUndefined();
      expect(await columnType('team_collaborators', 'invite_token_hash')).toBeUndefined();
      const [row] = await sql<{ role: string; status: string; deleted: boolean }>(
        'SELECT role, status, deleted FROM team_collaborators WHERE id = :id',
        { id: id(5) },
      );
      expect(row).toEqual({ role: 'COLLABORATOR', status: 'ACCEPTED', deleted: true });
    } finally {
      // Later test files need the migrated schema.
      await runSql(MIGRATION);
    }

    expect(await columnType('users', 'signer_address')).toBe('character varying');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- test/db/migration-12.test.ts`
Expected: FAIL, `ENOENT: no such file or directory … init-db_12.sql`.

- [ ] **Step 3: Write the migration**

`src/scripts/db/init-db_12.sql`:

```sql
-- Console teams. Safe to run more than once; init-db_12.down.sql undoes it.
-- console-api has no migration runner: run this by hand on each database
-- before deploying the code that reads it (see the PR's release checklist).

-- Owner means the team's creator (teams.created_by). Rows claiming OWNER for
-- anyone else are demoted; old collaborator rows become members.
UPDATE team_collaborators tc SET role = 'MEMBER'
FROM teams t
WHERE t.id = tc.team_id
  AND tc.role = 'OWNER'
  AND tc.user_id IS DISTINCT FROM t.created_by;
UPDATE team_collaborators SET role = 'MEMBER' WHERE role = 'COLLABORATOR';
UPDATE team_collaborators SET status = 'PENDING' WHERE status = 'SENT';

ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invite_token_hash VARCHAR(64);
ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;
ALTER TABLE team_collaborators ADD COLUMN IF NOT EXISTS invited_by VARCHAR(36);

-- Before the unique indexes: one active row per (team, user). The creator's
-- OWNER row wins, then the earliest row.
UPDATE team_collaborators SET deleted = TRUE, deleted_at = NOW()
WHERE id IN (
  SELECT id FROM (
    SELECT tc.id, ROW_NUMBER() OVER (
      PARTITION BY tc.team_id, tc.user_id
      ORDER BY COALESCE(tc.role = 'OWNER' AND tc.user_id = t.created_by, FALSE) DESC,
               tc.created_at NULLS LAST,
               tc.id
    ) AS position
    FROM team_collaborators tc
    LEFT JOIN teams t ON t.id = tc.team_id
    WHERE tc.status = 'ACCEPTED' AND tc.deleted IS NOT TRUE AND tc.user_id IS NOT NULL
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

-- One row per invite or resend email, for the limits in contract C7.
CREATE TABLE IF NOT EXISTS team_invite_sends (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  team_id VARCHAR(36) NOT NULL,
  membership_id VARCHAR(36) NOT NULL,
  sent_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_team_invite_sends_team FOREIGN KEY (team_id) REFERENCES teams(id)
);
CREATE INDEX IF NOT EXISTS idx_team_invite_sends_team ON team_invite_sends (team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_team_invite_sends_sender ON team_invite_sends (sent_by, created_at);
CREATE INDEX IF NOT EXISTS idx_team_invite_sends_membership
  ON team_invite_sends (membership_id, created_at);

ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_address VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS signer_verified_at TIMESTAMPTZ;
-- A wallet signs for one user only (contract C6), whatever its letter case.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_signer_address
  ON users (lower(signer_address))
  WHERE signer_address IS NOT NULL;

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
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_license_signer_holders_signer
    FOREIGN KEY (signer_id) REFERENCES license_signers(id) ON DELETE CASCADE,
  CONSTRAINT fk_license_signer_holders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT license_signer_holders_one_of CHECK ((user_id IS NULL) <> (name IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_license_signer_holders_signer
  ON license_signer_holders (signer_id);
```

`src/scripts/db/init-db_12.down.sql`:

```sql
-- Undoes init-db_12.sql. Roll the code back first (the old code reads none of
-- this, so the code alone can be rolled back safely and this can wait). Data in
-- the dropped tables and columns is lost.
DROP TABLE IF EXISTS license_signer_holders;
DROP TABLE IF EXISTS license_signers;
DROP TABLE IF EXISTS team_invite_sends;

DROP INDEX IF EXISTS idx_users_signer_address;
ALTER TABLE users DROP COLUMN IF EXISTS signer_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS signer_address;

DROP INDEX IF EXISTS idx_team_collaborators_invite_token;
DROP INDEX IF EXISTS idx_team_collaborators_pending_email;
DROP INDEX IF EXISTS idx_team_collaborators_member;
ALTER TABLE team_collaborators DROP COLUMN IF EXISTS invited_by;
ALTER TABLE team_collaborators DROP COLUMN IF EXISTS invite_expires_at;
ALTER TABLE team_collaborators DROP COLUMN IF EXISTS invite_token_hash;

-- The old code knows OWNER/COLLABORATOR and PENDING/ACCEPTED. Members who were
-- removed or left stay out of the team: their rows are deleted.
UPDATE team_collaborators SET role = 'COLLABORATOR' WHERE role = 'MEMBER';
UPDATE team_collaborators
  SET deleted = TRUE, deleted_at = COALESCE(deleted_at, NOW())
  WHERE status IN ('REVOKED', 'LEFT');
UPDATE team_collaborators SET status = 'ACCEPTED' WHERE status IN ('REVOKED', 'LEFT');

-- Not undone, on purpose:
-- - duplicate rows folded into one stay deleted;
-- - OWNER rows demoted for non-creators stay COLLABORATOR;
-- - configurations.client_id stays wide (narrowing could fail or truncate).
```

- [ ] **Step 4: Run the migration test**

Run: `npm test -- test/db/migration-12.test.ts`
Expected: `7 passed`. The global setup applies `init-db_12.sql` along with the other scripts, because it picks up `init-db_*.sql`. Its pattern, `/^init-db_\d+\.sql$/`, skips `init-db_12.down.sql`.

- [ ] **Step 5: Write the failing model test**

`test/models/team-models.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { TeamInviteSend } from '@/models/teamInviteSend.model';
import { User } from '@/models/user.model';
import { addMember, createOwner, createUser } from '../support/fixtures';

describe('team models', () => {
  it('accepts MEMBER and LEFT, and rejects the retired COLLABORATOR role', async () => {
    const { team } = await createOwner();
    const person = await createUser();

    const member = await addMember(team.id!, person);
    expect(member.role).toBe(TeamRoles.MEMBER);
    await member.update({ status: InvitationStatuses.LEFT, deleted: true });
    expect(member.status).toBe('LEFT');

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

  it("stores a user's verified signer and logs invite sends", async () => {
    const { team, user, membership } = await createOwner();
    const verifiedAt = new Date('2026-10-02T12:00:00Z');

    await user.update({
      signer_address: '0xdef0000000000000000000000000000000000000',
      signer_verified_at: verifiedAt,
    });
    const send = await TeamInviteSend.create({
      team_id: team.id!,
      membership_id: membership.id!,
      sent_by: user.id!,
    });

    const reloaded = await User.findOne({ where: { id: user.id! } });
    expect(reloaded!.signer_address).toBe('0xdef0000000000000000000000000000000000000');
    expect(reloaded!.signer_verified_at!.toISOString()).toBe(verifiedAt.toISOString());
    expect(send.get('created_at')).toBeInstanceOf(Date);
  });
});
```

Append to `test/support/fixtures.ts`, and move the new `import` up to join the others:

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

// Descriptive only: who owns a team is teams.created_by (see teamContext.service).
export enum TeamRoles {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum InvitationStatuses {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  LEFT = 'LEFT',
}

// One row per person per team: the owner's own row, accepted members, pending
// invites (user_id null until accepted), and members who were removed or left.
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

`DataTypes.DATE` is `TIMESTAMP WITH TIME ZONE` in Sequelize's Postgres dialect, which matches the new columns.

`TeamRoles.COLLABORATOR` no longer exists, and #80 uses it in two places. Point both at `TeamRoles.MEMBER`, so new rows match what the migration turns old ones into:

- `src/controllers/teamCollaborator.controller.ts`, in `invitePersonToMyTeam`: `role: TeamRoles.COLLABORATOR` becomes `role: TeamRoles.MEMBER`;
- `src/services/teamCollaborator.service.ts`, in `markAsAccepted`: `role: TeamRoles.COLLABORATOR` becomes `role: TeamRoles.MEMBER`. Keep its comment, with "collaborator" changed to "member".

In `test/api/regressions-80.test.ts`, the two role assertions follow:

- `expect(await invitedRole('pat@x.test')).toBe('COLLABORATOR');` becomes `.toBe('MEMBER')`;
- in the `invitation_code` test, `role: 'COLLABORATOR'` becomes `role: 'MEMBER'`.

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

- [ ] **Step 9: Write the registry and invite-send models**

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

`src/models/teamInviteSend.model.ts`:

```ts
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import DB from '@/services/db';

/** One invite or resend email, counted by the invite limits. */
export class TeamInviteSend extends Model<
  InferAttributes<TeamInviteSend>,
  InferCreationAttributes<TeamInviteSend>
> {
  declare id?: string;
  declare team_id: string;
  declare membership_id: string;
  declare sent_by: string;
}

TeamInviteSend.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    team_id: { type: DataTypes.UUID, allowNull: false },
    membership_id: { type: DataTypes.UUID, allowNull: false },
    sent_by: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize: DB.connection as Sequelize,
    modelName: 'TeamInviteSend',
    tableName: 'team_invite_sends',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);
```

- [ ] **Step 10: Write the wire types and `ApiError`**

`src/types/teams.ts`:

```ts
// Wire shapes shared with the console. Contract C7 in the console repo:
// docs/superpowers/plans/2026-10-02-console-teams.md. Change them there first.

export type TeamRole = 'OWNER' | 'MEMBER';
export type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'LEFT';

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

export interface MemberKey {
  licenseTokenId: number;
  signerAddress: `0x${string}`;
}

export interface TeamMember {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  role: TeamRole;
  status: MembershipStatus;
  signerAddress: `0x${string}` | null;
  memberKeys: MemberKey[];
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
  memberOfTeam: boolean;
  teamId: string | null;
  signerAddress: `0x${string}` | null;
  userEmail: string;
}

export interface InvitationPreview {
  teamName: string;
  ownerEmail: string;
  expiresAt: string;
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
npx prettier --write src/models src/types/teams.ts src/utils/apiError.ts src/controllers/teamCollaborator.controller.ts src/services/teamCollaborator.service.ts test
git add src/scripts/db/init-db_12.sql src/scripts/db/init-db_12.down.sql src/models src/types/teams.ts src/utils/apiError.ts src/controllers/teamCollaborator.controller.ts src/services/teamCollaborator.service.ts test
git commit -m "feat(teams): migrate memberships, signers and the key registry, with a rollback script"
```

---

### Task 4: Team context: owner by `teams.created_by`, the audience rule, and `/api/me`

**Files:**

- Create: `src/services/membership.service.ts`, `src/services/teamContext.service.ts`
- Modify: `src/controllers/user.controller.ts` (`getCompanyAndTeam`)
- Modify: `src/app/api/me/route.ts` (401 `UNAUTHORIZED` for an unknown user)
- Modify: `test/api/regressions-80.test.ts` (one assertion, from 404 to 401)
- Test: `test/services/team-context.test.ts`

**Interfaces:**

- Consumes (Task 3): `Team`, `TeamCollaborator`, `TeamRoles`, `InvitationStatuses`, `ApiError`. Consumes (#80): `getToken` from `@/utils/auth`.
- Produces, in `@/services/membership.service`:
  - `notDeleted`, a where fragment (`deleted IS NOT TRUE`);
  - `activeMembershipWhere`, a where fragment (accepted and not deleted);
  - `findPersonalTeam(userId): Promise<Team | null>`, the team the user created (`teams.created_by`), oldest first;
  - `findMembership(teamId, userId): Promise<TeamCollaborator | null>`, accepted and not deleted;
  - `findDefaultTeam(userId): Promise<Team | null>`: the personal team; for a legacy collaborator without one, the team of their oldest accepted membership.
- Produces, in `@/services/teamContext.service`:
  - `TEAM_HEADER = 'x-team-id'` and `CONSOLE_AUDIENCE = 'developer-platform'`.
  - `interface TeamContext { user: User; role: TeamRoles; team: Team; company: Company; membership: TeamCollaborator | null; owner: User; ownerAddress: string | null }`. `team` and `company` are never null.
  - `requireUser(request, options?: { consoleOnly?: boolean }): Promise<User>`. It answers 401 `UNAUTHORIZED` (`User not found`); with `consoleOnly`, also when the token's `aud` lacks `developer-platform`.
  - `resolveTeamContext(request, options?: { consoleOnly?: boolean }): Promise<TeamContext>`. Errors:
    - 401 `UNAUTHORIZED`;
    - 403 `NOT_A_MEMBER` (`You are not a member of this team`);
    - 403 `NOT_A_MEMBER` (`Finish setting up your team first`) when there's no team or company to act for.
  - `requireOwner(ctx): void`: 403 `OWNER_ONLY` (`Only the team owner can do this`). `ctx.role` is `OWNER` exactly when `team.created_by === user.id`.
  - `companyScope(ctx): IUserWithCompanyAndTeam`, for the existing company-scoped controllers.
- `consoleOnly` is passed by the routes that only the console calls (Tasks 7, 8, 10, 12 and 13). The existing `/api/my/*` data routes don't pass it.

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
import { sql } from '../support/db';
import { addMember, createOwner, createOwnerFor, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

const contextFor = async (
  address: string | undefined,
  teamId?: string,
  options: { aud?: string[]; consoleOnly?: boolean } = {},
) =>
  resolveTeamContext(
    await request('GET', '/api/my/anything', { as: address, teamId, aud: options.aud }),
    { consoleOnly: options.consoleOnly },
  );

const insertRow = (
  teamId: string,
  userId: string,
  role: string,
  status = 'ACCEPTED',
  deleted = false,
) =>
  sql(
    `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted)
     VALUES (gen_random_uuid()::text, :teamId, :userId, :role, :status, now() - interval '1 day', now(), :deleted)`,
    { teamId, userId, role, status, deleted },
  );

describe('resolveTeamContext', () => {
  it('uses the team the caller created when no header is sent', async () => {
    const { user, team, company } = await createOwner('Acme');

    const ctx = await contextFor(user.address!);

    expect(ctx.role).toBe(TeamRoles.OWNER);
    expect(ctx.team.id).toBe(team.id);
    expect(ctx.company.id).toBe(company.id);
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
    expect(ctx.company.id).toBe(acme.company.id);
  });

  it('never trusts an OWNER membership row of someone who did not create the team', async () => {
    const acme = await createOwner('Acme');
    const impostor = await createUser();
    await insertRow(acme.team.id!, impostor.id!, 'OWNER');

    const ctx = await contextFor(impostor.address!, acme.team.id!);

    expect(ctx.role).toBe(TeamRoles.MEMBER);
    expect(() => requireOwner(ctx)).toThrow('Only the team owner can do this');
  });

  it('lets the creator into their own team even without a membership row', async () => {
    const acme = await createOwner('Acme');
    await acme.membership.destroy();

    const ctx = await contextFor(acme.user.address!, acme.team.id!);

    expect(ctx.role).toBe(TeamRoles.OWNER);
  });

  it('refuses a team the caller does not belong to', async () => {
    const acme = await createOwner('Acme');
    const outsider = await createOwner('Other');

    await expect(contextFor(outsider.user.address!, acme.team.id!)).rejects.toMatchObject(
      {
        status: 403,
        code: 'NOT_A_MEMBER',
        message: 'You are not a member of this team',
      },
    );
  });

  it('refuses removed, departed and pending memberships', async () => {
    const acme = await createOwner('Acme');
    const removed = await createUser();
    const left = await createUser();
    const invited = await createUser();
    await (
      await addMember(acme.team.id!, removed)
    ).update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
    });
    await (
      await addMember(acme.team.id!, left)
    ).update({
      status: InvitationStatuses.LEFT,
      deleted: true,
    });
    await TeamCollaborator.create({
      team_id: acme.team.id!,
      user_id: invited.id!,
      email: invited.email,
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
    });

    for (const person of [removed, left, invited]) {
      await expect(contextFor(person.address!, acme.team.id!)).rejects.toMatchObject({
        code: 'NOT_A_MEMBER',
      });
    }
  });

  it('refuses an unknown user, an anonymous caller, and (console-only) another audience with 401', async () => {
    const { user } = await createOwner('Acme');

    await expect(
      contextFor('0x1111111111111111111111111111111111111111'),
    ).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
    await expect(contextFor(undefined)).rejects.toMatchObject({ status: 401 });
    await expect(
      contextFor(user.address!, undefined, {
        aud: ['some-other-app'],
        consoleOnly: true,
      }),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    // Not console-only: another audience is still accepted, as today.
    await expect(
      contextFor(user.address!, undefined, { aud: ['some-other-app'] }),
    ).resolves.toMatchObject({ role: TeamRoles.OWNER });
  });

  it('never returns an empty company: a user who has not finished sign-up gets nothing to act on', async () => {
    const user = await createUser();

    await expect(contextFor(user.address!)).rejects.toMatchObject({
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'Finish setting up your team first',
    });
  });

  it('gives a legacy collaborator with no team of their own the oldest team they joined', async () => {
    const older = await createOwner('Older');
    const newer = await createOwner('Newer');
    const collaborator = await createUser();
    await insertRow(older.team.id!, collaborator.id!, 'MEMBER');
    await addMember(newer.team.id!, collaborator);

    const ctx = await contextFor(collaborator.address!);

    expect(ctx.team.id).toBe(older.team.id);
    expect(ctx.role).toBe(TeamRoles.MEMBER);
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

describe('/api/me', () => {
  const me = async (as: string, teamId?: string) =>
    read(await getMe(await request('GET', '/api/me', { as, teamId })));

  it("shows the caller's own company even when they joined another team first", async () => {
    const other = await createOwner('Other');
    const person = await createUser();
    await addMember(other.team.id!, person); // the oldest membership row
    const own = await createOwnerFor(person, 'Mine');

    const response = await me(person.address!);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('OWNER');
    expect(response.body.team.id).toBe(own.team.id);
    expect(response.body.company.name).toBe('Mine Co');
  });

  it('ignores X-Team-Id, even for a team the caller has left', async () => {
    const other = await createOwner('Other');
    const person = await createUser();
    const row = await addMember(other.team.id!, person);
    await row.update({ status: InvitationStatuses.LEFT, deleted: true });
    const own = await createOwnerFor(person, 'Mine');

    const response = await me(person.address!, other.team.id!);

    expect(response.status).toBe(200);
    expect(response.body.team.id).toBe(own.team.id);
  });

  it('keeps a legacy collaborator working: their oldest team, reported as COLLABORATOR', async () => {
    const acme = await createOwner('Acme');
    const collaborator = await createUser();
    await addMember(acme.team.id!, collaborator);

    const response = await me(collaborator.address!);

    expect(response.body.team.id).toBe(acme.team.id);
    expect(response.body.company.name).toBe('Acme Co');
    // Until part 3 ships (contract C7); Task 15 makes this MEMBER.
    expect(response.body.role).toBe('COLLABORATOR');
  });

  it('answers 401 UNAUTHORIZED for a wallet with no console account', async () => {
    expect(await me('0x1111111111111111111111111111111111111111')).toEqual({
      status: 401,
      body: { message: 'User not found', code: 'UNAUTHORIZED' },
    });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/services/team-context.test.ts`
Expected: FAIL, `Failed to resolve import "@/services/teamContext.service"`.

- [ ] **Step 3: Write `src/services/membership.service.ts`**

```ts
import { Op } from 'sequelize';

import { Team } from '@/models/team.model';
import { InvitationStatuses, TeamCollaborator } from '@/models/teamCollaborator.model';

export const notDeleted = { [Op.not]: true };

/** A membership counts only while accepted and not deleted. */
export const activeMembershipWhere = {
  status: InvitationStatuses.ACCEPTED,
  deleted: notDeleted,
};

/** The team the user created at sign-up: the only kind of team anyone owns. */
export const findPersonalTeam = (userId: string) =>
  Team.findOne({
    where: { created_by: userId, deleted: notDeleted },
    order: [['created_at', 'ASC']],
  });

export const findMembership = (teamId: string, userId: string) =>
  TeamCollaborator.findOne({
    where: { team_id: teamId, user_id: userId, ...activeMembershipWhere },
  });

/**
 * The team a request without X-Team-Id acts for: the caller's own. A legacy
 * collaborator who never created a team gets the oldest team they joined, so
 * they keep working through the deploy (contract C7, GET /api/me).
 */
export const findDefaultTeam = async (userId: string): Promise<Team | null> => {
  const personal = await findPersonalTeam(userId);
  if (personal) return personal;

  const oldest = await TeamCollaborator.findOne({
    where: { user_id: userId, ...activeMembershipWhere },
    order: [['created_at', 'ASC']],
  });
  return oldest
    ? Team.findOne({ where: { id: oldest.team_id, deleted: notDeleted } })
    : null;
};
```

- [ ] **Step 4: Write `src/services/teamContext.service.ts`**

```ts
import { AuthenticationMiddleware } from '@/middlewares/authentication.middleware';
import { Company } from '@/models/company.model';
import { Team } from '@/models/team.model';
import { TeamCollaborator, TeamRoles } from '@/models/teamCollaborator.model';
import { User } from '@/models/user.model';
import {
  findDefaultTeam,
  findMembership,
  notDeleted,
} from '@/services/membership.service';
import type { ICompany } from '@/types/company';
import type { IUserWithCompanyAndTeam } from '@/types/user';
import { ApiError } from '@/utils/apiError';
import { getToken } from '@/utils/auth';

/** Sent by the console while a team other than the caller's own is active (contract C4). */
export const TEAM_HEADER = 'x-team-id';

/** The console's client ID: dex puts it in `aud` of every console login (contract C4). */
export const CONSOLE_AUDIENCE = 'developer-platform';

export interface TeamContext {
  /** The signed-in caller. */
  user: User;
  /** OWNER exactly when the caller created the team. */
  role: TeamRoles;
  team: Team;
  company: Company;
  membership: TeamCollaborator | null;
  /** The team's creator. Their wallet owns the team's licenses. */
  owner: User;
  ownerAddress: string | null;
}

const unauthorized = () => new ApiError(401, 'UNAUTHORIZED', 'User not found');

const audienceOf = async (request: NextRequest): Promise<string[]> => {
  try {
    const aud = (await getToken({ req: request }))?.aud;
    return Array.isArray(aud) ? aud : aud ? [aud] : [];
  } catch {
    return [];
  }
};

/**
 * The signed-in console user. Team, invite, signer, registry and license-access
 * routes pass `consoleOnly`: their token must be a console login (contract C4).
 */
export const requireUser = async (
  request: NextRequest,
  { consoleOnly = false }: { consoleOnly?: boolean } = {},
): Promise<User> => {
  if (consoleOnly && !(await audienceOf(request)).includes(CONSOLE_AUDIENCE)) {
    throw unauthorized();
  }
  await AuthenticationMiddleware(request);
  const user = request.user?.user as User | null | undefined;
  if (!user?.id) throw unauthorized();
  return user;
};

const notAMember = (message = 'You are not a member of this team') =>
  new ApiError(403, 'NOT_A_MEMBER', message);

export const resolveTeamContext = async (
  request: NextRequest,
  options: { consoleOnly?: boolean } = {},
): Promise<TeamContext> => {
  const user = await requireUser(request, options);
  const teamId = request.headers.get(TEAM_HEADER);

  let team: Team | null;
  if (teamId) {
    team = await Team.findOne({ where: { id: teamId, deleted: notDeleted } });
    // The creator always belongs to their own team, row or no row.
    const belongs =
      !!team &&
      (team.created_by === user.id || !!(await findMembership(team.id!, user.id!)));
    if (!belongs) throw notAMember();
  } else {
    team = await findDefaultTeam(user.id!);
  }

  const company = team ? await Company.findOne({ where: { id: team.company_id } }) : null;
  // Without a team and a company there's nothing to scope to; an empty company ID
  // must never reach a query (some list filters drop empty values).
  if (!team || !company) throw notAMember('Finish setting up your team first');

  const isOwner = team.created_by === user.id;
  const owner = isOwner ? user : await User.findOne({ where: { id: team.created_by } });
  if (!owner) throw notAMember();

  return {
    user,
    role: isOwner ? TeamRoles.OWNER : TeamRoles.MEMBER,
    team,
    company,
    membership: await findMembership(team.id!, user.id!),
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
    company: ctx.company.get({ plain: true }) as ICompany,
  }) as IUserWithCompanyAndTeam;
```

- [ ] **Step 5: Point `getCompanyAndTeam` at the default team**

`/api/me` keeps today's console working until part 3 ships: a member's `role` is reported as `COLLABORATOR`, as today (contract C7, "Until part 3 ships"). Task 15 switches it to `MEMBER`.

In `src/controllers/user.controller.ts`:

- Replace `import { findTeamCollaboratorByUserId } from '@/services/teamCollaborator.service';` with `import { findDefaultTeam } from '@/services/membership.service';`.
- Replace the whole `getCompanyAndTeam` with:

```ts
export const getCompanyAndTeam = async (user: User) => {
  const userId = user?.id ?? '';
  // The caller's own team. A legacy collaborator who never created one gets the
  // oldest team they joined; other teams are reached with X-Team-Id.
  const team = await findDefaultTeam(userId);
  const company = await findCompanyById(team?.company_id ?? '');
  const companyOwner = await findUserById(company?.created_by ?? '');

  return {
    ...(user.dataValues || user),
    // Until part 3 ships, today's console reads a member's role as COLLABORATOR
    // (contract C7, "Until part 3 ships"). Task 15 switches it to MEMBER.
    role: team ? (team.created_by === userId ? 'OWNER' : 'COLLABORATOR') : undefined,
    company: company?.dataValues,
    team: team?.dataValues,
    company_email_owner: companyOwner?.dataValues.email,
  };
};
```

`findTeamById` is no longer used here. Remove its import if nothing else in the file uses it.

- [ ] **Step 6: Answer 401 for an unknown user in `/api/me`**

In `src/app/api/me/route.ts`:

- In `GET`, replace `return Response.json({ message: 'User not found' }, { status: 404 });` with:

```ts
return Response.json(
  { message: 'User not found', code: 'UNAUTHORIZED' },
  { status: 401 },
);
```

- At the top of `PUT`, after `await AuthenticationMiddleware(request);`, add:

```ts
if (!request.user?.user?.id) {
  return Response.json(
    { message: 'User not found', code: 'UNAUTHORIZED' },
    { status: 401 },
  );
}
```

`PUT /api/me/complete` keeps its 404 for "no account yet". It's the sign-up path, where a missing account is expected, and Task 2 pins that answer.

In `test/api/regressions-80.test.ts`, the takeover test's `expect(asAttacker.status).toBe(404);` becomes `expect(asAttacker.status).toBe(401);`.

- [ ] **Step 7: Run the tests**

Run: `npm test -- test/services/team-context.test.ts test/api`
Expected: all pass. That's 10 `resolveTeamContext` tests and 4 `/api/me` tests, plus the harness and the #80 regressions.

- [ ] **Step 8: Typecheck and commit**

Run: `npm run typecheck`
Expected: exit 0.

```bash
npx prettier --write src/services/membership.service.ts src/services/teamContext.service.ts src/controllers/user.controller.ts src/app/api/me/route.ts test
git add src/services/membership.service.ts src/services/teamContext.service.ts src/controllers/user.controller.ts src/app/api/me/route.ts test
git commit -m "feat(teams): resolve the active team, with ownership from teams.created_by and the console audience rule"
```

---

### Task 5: Apps, connections, redirect URIs, signers and workspace under a team

These routes looked up the company with `getCompanyAndTeam(user)`. Now they take it from the active team. Every non-GET handler calls `requireOwner(ctx)` first, and members never see secrets.

The lists below scope by company through `transformObject` (`src/utils/filter.ts`). #80 (`04250f2`) made it keep every non-empty key; before, only the last one survived, which could drop the company condition. This task doesn't change it: Steps 1 and 2 pin that behavior, because the routes below depend on it.

Along the way this task fixes four existing problems:

- **Redirect URIs and signers can attach to any app.** Their POSTs never checked that the app belongs to the caller's company.
- **Their DELETEs match the wrong column.** They matched the row's ID against `app_id`.
- **`PUT /api/my/apps/:id` passes the body straight through,** so it could set `company_id` and move an app to another company.
- **Support email crashes for an unknown user.** It answered 400 instead of 401.

**Files:**

- Modify: `src/services/redirectUri.service.ts`, `src/services/signer.service.ts`, `src/controllers/redirectUri.controller.ts`, `src/controllers/signer.controller.ts` (delete one row by its ID)
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
  - `src/app/api/my/support/email/route.ts`
- Create: `src/utils/redact.ts`
- Test: `test/utils/filter.test.ts`, `test/api/team-scoped-routes.test.ts`

**Interfaces:**

- Consumes (Task 4): `resolveTeamContext`, `requireOwner`, `requireUser`, `companyScope`, `TeamRoles`. Consumes (Task 3): `legacyErrorResponse`, `apiErrorResponse`. Consumes (#80): `getLicense`, `IdentityUnavailableError`.
- Produces:
  - `redactConnection(connection)`: the connection as JSON, with `connection_license_private_key` and `device_issuance_key` set to `null`;
  - `redactApp(app)`: the app as JSON, with `api_key` removed from every signer;
  - `deleteRedirectUriById(id, companyId)` and `deleteSignerById(id, companyId)`, which soft-delete one row of that company.

- [ ] **Step 1: Pin #80's list filters**

These tests describe `transformObject` as #80 (`04250f2`) left it. They pass on the first run.

`test/utils/filter.test.ts`:

```ts
import { Op } from 'sequelize';
import { describe, expect, it } from 'vitest';

import { transformObject, transformObjectToSequelize } from '@/utils/filter';

describe("list filters (#80's transformObject)", () => {
  it('keeps every non-empty key, not only the last one', () => {
    const where = transformObject(
      ['workspace_id', 'company_id'],
      {
        workspace_id: 'w1',
        company_id: 'c1',
      },
      (key, value) => ({ [key]: value }),
    );

    expect(where).toEqual({ workspace_id: 'w1', company_id: 'c1' });
  });

  it('skips empty values', () => {
    const where = transformObject(
      ['workspace_id', 'company_id'],
      {
        workspace_id: '',
        company_id: 'c1',
      },
      (key, value) => ({ [key]: value }),
    );

    expect(where).toEqual({ company_id: 'c1' });
  });

  it('combines like and exact filters', () => {
    const where = transformObjectToSequelize(
      { name: 'fleet', scope: 'all', company_id: 'c1', workspace_id: 'w1' },
      { like: ['name', 'scope'], exact: ['workspace_id', 'company_id'] },
    ) as Record<string, unknown>;

    expect(where).toMatchObject({
      name: { [Op.like]: '%fleet%' },
      scope: { [Op.like]: '%all%' },
      workspace_id: 'w1',
      company_id: 'c1',
    });
  });
});
```

- [ ] **Step 2: Run them**

Run: `npm test -- test/utils/filter.test.ts`
Expected: `3 passed`, with no change to `src/utils/filter.ts`. If any fails, `master` doesn't have #80's `04250f2`: stop and rebase onto it.

- [ ] **Step 3: Write the failing route tests**

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
  GET as getConnection,
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
import { App } from '@/models/app.model';
import { Connection } from '@/models/connection.model';
import { RedirectUri } from '@/models/redirectUri.model';
import { Signer } from '@/models/signer.model';
import { Workspace } from '@/models/workspace.model';
import Mailer from '@/utils/mailer';
import { addMember, createOwner, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

type Owner = Awaited<ReturnType<typeof createOwner>>;

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser({ name: 'Mia Member' });
  await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  return { acme, member, outsider };
};

const workspaceFor = (owner: Owner, tokenId = '7') =>
  Workspace.create({
    name: `${owner.team.name} workspace`,
    token_id: tokenId,
    owner: owner.user.address!,
    client_id: `0x${tokenId.padStart(40, '1')}`,
    company_id: owner.company.id!,
  });

const appFor = async (owner: Owner) => {
  const workspace = await workspaceFor(owner);
  const app = await App.create({
    name: 'Fleet app',
    scope: 'production',
    workspace_id: workspace.id!,
    company_id: owner.company.id!,
  });
  await Signer.create({
    api_key: 'super-secret-key',
    address: '0x' + '3'.repeat(40),
    app_id: app.id!,
    company_id: owner.company.id!,
  });
  return app;
};

const ownerOnly = { message: 'Only the team owner can do this', code: 'OWNER_ONLY' };
const notAMember = { message: 'You are not a member of this team', code: 'NOT_A_MEMBER' };

describe('connections under a team', () => {
  it('lets the owner write and a member read, without the private keys', async () => {
    const { acme, member } = await setup();
    const created = await read(
      await createConnection(
        await request('POST', '/api/my/connections', {
          as: acme.user.address!,
          body: {
            name: 'Fleet link',
            connection_license_private_key: 'license-secret',
            device_issuance_key: 'device-secret',
          },
        }),
      ),
    );
    expect(created.status).toBe(200);
    const asMember = { as: member.address!, teamId: acme.team.id! };

    const listed = await read(
      await listConnections(await request('GET', '/api/my/connections', asMember)),
    );
    const one = await read(
      await getConnection(await request('GET', '/x', asMember), {
        params: { id: created.body.id },
      }),
    );
    const asOwner = await read(
      await getConnection(await request('GET', '/x', { as: acme.user.address! }), {
        params: { id: created.body.id },
      }),
    );

    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).toMatchObject({
      name: 'Fleet link',
      connection_license_private_key: null,
      device_issuance_key: null,
    });
    expect(one.body).toMatchObject({
      connection_license_private_key: null,
      device_issuance_key: null,
    });
    expect(asOwner.body).toMatchObject({
      connection_license_private_key: 'license-secret',
      device_issuance_key: 'device-secret',
    });
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

  it('lists nothing for a user who has not finished sign-up', async () => {
    const { acme } = await setup();
    await Connection.create({
      name: 'Acme link',
      company_id: acme.company.id!,
      connection_license_public_key: '',
      connection_license_private_key: '',
      device_issuance_key: '',
    });
    const newcomer = await createUser();

    const response = await read(
      await listConnections(
        await request('GET', '/api/my/connections', { as: newcomer.address! }),
      ),
    );

    expect(response).toEqual({
      status: 403,
      body: { message: 'Finish setting up your team first', code: 'NOT_A_MEMBER' },
    });
  });
});

describe('apps under a team', () => {
  it("shows a member the team's apps without signer API keys, and the owner with them", async () => {
    const { acme, member } = await setup();
    const app = await appFor(acme);
    const asMember = { as: member.address!, teamId: acme.team.id! };

    const listed = await read(
      await listApps(await request('GET', '/api/my/apps', asMember)),
    );
    const one = await read(
      await getApp(await request('GET', '/x', asMember), { params: { id: app.id! } }),
    );
    const asOwner = await read(
      await getApp(await request('GET', '/x', { as: acme.user.address! }), {
        params: { id: app.id! },
      }),
    );
    const missing = await read(
      await getApp(await request('GET', '/x', asMember), {
        params: { id: 'no-such-app' },
      }),
    );

    expect(listed.body.data.map((row: { name: string }) => row.name)).toEqual([
      'Fleet app',
    ]);
    expect(one.body.name).toBe('Fleet app');
    expect(one.body.Signers).toHaveLength(1);
    expect(one.body.Signers[0]).not.toHaveProperty('api_key');
    expect(asOwner.body.Signers[0].api_key).toBe('super-secret-key');
    expect(missing).toEqual({ status: 200, body: null });
  });

  it('updates only the name and scope of an app, never its company', async () => {
    const { acme, outsider } = await setup();
    const app = await appFor(acme);

    const response = await putApp(
      await request('PUT', '/x', {
        as: acme.user.address!,
        body: {
          name: 'Renamed',
          company_id: outsider.company.id,
          workspace_id: 'elsewhere',
        },
      }),
      { params: { id: app.id! } },
    );

    expect(response.status).toBe(200);
    await app.reload();
    expect(app).toMatchObject({ name: 'Renamed', company_id: acme.company.id });
    expect(app.workspace_id).not.toBe('elsewhere');
  });

  it("refuses redirect URIs and signers on another company's app", async () => {
    const { acme, outsider } = await setup();
    const theirs = await appFor(outsider);
    const params = { params: { id: theirs.id! } };
    const as = acme.user.address!;

    const uri = await read(
      await createRedirectUri(
        await request('POST', '/x', { as, body: { uri: 'https://evil.test' } }),
        params,
      ),
    );
    const signer = await read(
      await createAppSigner(
        await request('POST', '/x', {
          as,
          body: { api_key: 'k', address: '0x' + '4'.repeat(40) },
        }),
        params,
      ),
    );

    expect(uri).toEqual({ status: 404, body: { message: 'App not found' } });
    expect(signer).toEqual({ status: 404, body: { message: 'App not found' } });
    expect(await RedirectUri.count({ where: { app_id: theirs.id! } })).toBe(0);
  });

  it('deletes the one redirect URI or signer asked for', async () => {
    const { acme } = await setup();
    const app = await appFor(acme);
    const [keep, drop] = await Promise.all(
      ['https://keep.test', 'https://drop.test'].map((uri) =>
        RedirectUri.create({
          uri,
          app_id: app.id!,
          company_id: acme.company.id!,
          status: true,
        }),
      ),
    );
    const extraSigner = await Signer.create({
      api_key: 'other',
      address: '0x' + '5'.repeat(40),
      app_id: app.id!,
      company_id: acme.company.id!,
    });
    const as = acme.user.address!;

    await deleteRedirectUri(await request('DELETE', '/x', { as }), {
      params: { id: drop.id! },
    });
    await deleteSigner(await request('DELETE', '/x', { as }), {
      params: { id: extraSigner.id! },
    });

    await keep.reload();
    await drop.reload();
    await extraSigner.reload();
    expect(keep.deleted).toBeFalsy();
    expect(drop.deleted).toBe(true);
    expect(extraSigner.deleted).toBe(true);
    expect(await Signer.count({ where: { app_id: app.id!, deleted: false } })).toBe(1);
  });
});

describe('workspace and support', () => {
  it('resolves the workspace by license token for members and refuses outsiders', async () => {
    const { acme, member, outsider } = await setup();
    await workspaceFor(acme);

    const asMember = await workspaceByToken(
      await request('GET', '/api/my/workspace/by-token/7', {
        as: member.address!,
        teamId: acme.team.id!,
      }),
      { params: Promise.resolve({ tokenId: '7' }) },
    );
    const asOutsider = await workspaceByToken(
      await request('GET', '/api/my/workspace/by-token/7', {
        as: outsider.user.address!,
      }),
      { params: Promise.resolve({ tokenId: '7' }) },
    );
    const team = await read(
      await getWorkspace(
        await request('GET', '/api/my/workspace', {
          as: member.address!,
          teamId: acme.team.id!,
        }),
      ),
    );

    expect(asMember.status).toBe(200);
    expect(asOutsider.status).toBe(403);
    expect(team.body.name).toBe('Acme Co workspace');
  });

  it('keeps support email open to members, and answers 401 for an unknown user', async () => {
    const { acme, member } = await setup();
    const body = { walletAddress: member.address, inquiryType: 'Data', message: 'Help' };

    const asMember = await sendSupport(
      await request('POST', '/api/my/support/email', {
        as: member.address!,
        teamId: acme.team.id!,
        body,
      }),
    );
    const unknown = await read(
      await sendSupport(
        await request('POST', '/api/my/support/email', {
          as: '0x1111111111111111111111111111111111111111',
          body,
        }),
      ),
    );

    expect(asMember.status).toBe(200);
    expect(vi.mocked(Mailer.sendMail)).toHaveBeenCalledOnce();
    expect(unknown).toEqual({
      status: 401,
      body: { message: 'User not found', code: 'UNAUTHORIZED' },
    });
  });
});

describe('member writes', () => {
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
});
```

- [ ] **Step 4: Run them to confirm they fail**

Run: `npm test -- test/api/team-scoped-routes.test.ts`
Expected: FAIL. Among the failures:

- members get the owner's private keys and signer API keys;
- the outsider gets 200;
- a redirect URI is created on another company's app;
- deleting one redirect URI deletes none;
- the app moves company;
- member writes aren't refused with `OWNER_ONLY`.

- [ ] **Step 5: Delete one redirect URI or signer by its ID, and add the redaction helpers**

In `src/services/redirectUri.service.ts`, add:

```ts
export const deleteRedirectUriById = async (id: string, companyId: string) => {
  return RedirectUri.update(
    { status: false, deleted: true, deleted_at: new Date() },
    { where: { id, company_id: companyId } },
  );
};
```

In `src/controllers/redirectUri.controller.ts`, replace the body of `deleteOwnRedirectUri` with `return deleteRedirectUriById(id, user?.company?.id ?? '');`, and import `deleteRedirectUriById` in place of `deleteRedirectUris`.

In `src/services/signer.service.ts`, add:

```ts
export const deleteSignerById = async (id: string, companyId: string) => {
  return Signer.update(
    { deleted: true, deleted_at: new Date() },
    { where: { id, company_id: companyId } },
  );
};
```

In `src/controllers/signer.controller.ts`, `deleteOwnSigner` becomes:

```ts
export const deleteOwnSigner = async (id: string, user: IUserWithCompanyAndTeam) => {
  const companyId = user?.company?.id ?? '';
  return deleteSignerById(id, companyId);
};
```

Import `deleteSignerById` in place of `deleteSigners`. `deleteSigners` and `deleteRedirectUris` stay: `deleteOwnApp` uses them to delete every row of an app, by `app_id`, which is correct there.

`src/utils/redact.ts`:

```ts
import type { App } from '@/models/app.model';
import type { Connection } from '@/models/connection.model';

// Secrets are owner-only (contract C7): members read the same rows without them.

export const redactConnection = (connection: Connection | null) =>
  connection
    ? {
        ...connection.toJSON(),
        connection_license_private_key: null,
        device_issuance_key: null,
      }
    : null;

export const redactApp = (app: App | null) => {
  if (!app) return null;
  const json = app.toJSON() as Record<string, unknown> & {
    Signers?: Record<string, unknown>[];
  };
  return {
    ...json,
    Signers: (json.Signers ?? []).map(({ api_key: _apiKey, ...signer }) => signer),
  };
};
```

- [ ] **Step 6: Rewrite the apps routes**

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

    // The list includes workspaces only, no signers, so nothing to redact.
    const apps = await getMyApps(params, pagination, ctx.company.id!);

    return Response.json(apps);
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Get app created by the logged user');
  }
};
```

`src/app/api/my/apps/[id]/route.ts`:

```ts
import _ from 'lodash';

import { deleteOwnApp, findMyApp, updateMyApp } from '@/controllers/app.controller';
import { updateWorkspace } from '@/controllers/workspace.controller';
import { TeamRoles } from '@/models/teamCollaborator.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { redactApp } from '@/utils/redact';

type Params = { params: { id: string } };

// What an owner may change on an app. Never company_id or workspace_id.
const APP_UPDATABLE_FIELDS = ['name', 'scope'];

export const GET = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    const app = await findMyApp(appId, ctx.company.id!);
    return Response.json(ctx.role === TeamRoles.OWNER ? app : redactApp(app));
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Get app created by the logged user');
  }
};

export const DELETE = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    await deleteOwnApp(appId, ctx.company.id!);
    return Response.json({});
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My App] Delete app');
  }
};

export const PUT = async (request: NextRequest, { params: { id: appId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    requireOwner(ctx);
    const companyId = ctx.company.id!;

    const newData = await request.json();
    const app = await findMyApp(appId, companyId);
    await updateMyApp(appId, companyId, _.pick(newData, APP_UPDATABLE_FIELDS));

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

import { findMyApp } from '@/controllers/app.controller';
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
    if (!(await findMyApp(appId, ctx.company.id!))) {
      return Response.json({ message: 'App not found' }, { status: 404 });
    }

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

import { findMyApp } from '@/controllers/app.controller';
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
    if (!(await findMyApp(appId, ctx.company.id!))) {
      return Response.json({ message: 'App not found' }, { status: 404 });
    }

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

- [ ] **Step 7: Rewrite the connection routes**

`src/app/api/my/connections/route.ts`:

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createConnection, getMyConnections } from '@/controllers/connection.controller';
import { Connection, CONNECTION_MODIFIABLE_FIELDS } from '@/models/connection.model';
import { TeamRoles } from '@/models/teamCollaborator.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { getPaginationFromParams } from '@/utils/paginateData';
import { redactConnection } from '@/utils/redact';

const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const pagination = getPaginationFromParams(params);

    const page = await getMyConnections(params, pagination, ctx.company.id!);
    if (ctx.role === TeamRoles.OWNER) return Response.json(page);
    return Response.json({ ...page, data: page.data.map(redactConnection) });
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

    const createdConnection = await createConnection(connectionInput, ctx.company.id!);

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
import { TeamRoles } from '@/models/teamCollaborator.model';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { redactConnection } from '@/utils/redact';

type Params = { params: { id: string } };

const GET = async (request: NextRequest, { params: { id: connectionId } }: Params) => {
  try {
    const ctx = await resolveTeamContext(request);
    const connection = await findMyConnection(connectionId, ctx.company.id!);
    return Response.json(
      ctx.role === TeamRoles.OWNER ? connection : redactConnection(connection),
    );
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
    const companyId = ctx.company.id!;

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
    const companyId = ctx.company.id!;

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

- [ ] **Step 8: Rewrite the redirect URI and legacy signer routes**

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

- [ ] **Step 9: Rewrite the workspace and support routes**

`src/app/api/my/workspace/route.ts`. #80 (`04250f2`) made `POST` check through Identity (`getLicense`) that the caller's wallet owns the license and that `token_id` is that license's, and store `license.owner`. Its bodies are 403 `{ message: 'You do not own this license' }` and 502 `{ message: 'Could not verify license ownership' }`. The version below keeps all of that. The only change is whose wallet must own the license: the active team's owner. Members are refused before the check.

```ts
import _ from 'lodash';
import { Attributes } from 'sequelize';

import { createWorkspace, findMyWorkspace } from '@/controllers/workspace.controller';
import { Workspace, MODIFIABLE_FIELDS } from '@/models/workspace.model';
import { getLicense, IdentityUnavailableError } from '@/services/identity.service';
import { requireOwner, resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';

export const GET = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    const workspace = await findMyWorkspace(ctx.company.id!);

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

    // Branding is authorized by the workspace owner, so the owner and the license
    // it names come from Identity, never from the body: the team owner must own the
    // license on-chain, and token_id must be that license's.
    const license = await getLicense(workspaceInput.client_id ?? '');
    const teamOwner = ctx.ownerAddress?.toLowerCase();
    if (
      !license ||
      !teamOwner ||
      license.owner.toLowerCase() !== teamOwner ||
      String(license.tokenId) !== String(workspaceInput.token_id)
    ) {
      return Response.json({ message: 'You do not own this license' }, { status: 403 });
    }

    const createdWorkspace = await createWorkspace(
      { ...workspaceInput, owner: license.owner },
      ctx.company.id!,
    );

    return Response.json(createdWorkspace);
  } catch (error: unknown) {
    if (error instanceof IdentityUnavailableError) {
      return Response.json(
        { message: 'Could not verify license ownership' },
        { status: 502 },
      );
    }
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
    const companyId = ctx.company.id!;
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

`src/app/api/my/support/email/route.ts`:

```ts
import { NextResponse } from 'next/server';

import { sendSupportEmail } from '@/controllers/email.controller';
import { requireUser } from '@/services/teamContext.service';
import { apiErrorResponse } from '@/utils/apiError';

// Open to every signed-in user, members included. It acts for no team.
export const POST = async (request: NextRequest) => {
  try {
    const user = await requireUser(request);
    const { walletAddress, inquiryType, message } = await request.json();

    await sendSupportEmail({
      userName: user.name,
      userEmail: user.email,
      walletAddress,
      inquiryType,
      message,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const handled = apiErrorResponse(error);
    if (handled) return handled;
    console.error('Error sending support email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
  }
};
```

- [ ] **Step 10: Run the tests**

Run: `npm test -- test/utils/filter.test.ts test/api/team-scoped-routes.test.ts test/api/regressions-80.test.ts`
Expected: all pass. That's 3 filter tests, 9 named route tests plus 12 `it.each` cases, and the #80 regressions, including the workspace check.

- [ ] **Step 11: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/utils/redact.ts src/services/redirectUri.service.ts src/services/signer.service.ts src/controllers/redirectUri.controller.ts src/controllers/signer.controller.ts src/app/api/my/apps src/app/api/my/connections src/app/api/my/redirect-uris src/app/api/my/signers src/app/api/my/workspace/route.ts "src/app/api/my/workspace/[id]/apps" src/app/api/my/workspace/by-token src/app/api/my/support test
git add src test
git commit -m "feat(teams): scope apps, connections, signers and workspaces to the active team, without secrets for members"
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
  DELETE as deleteConfiguration,
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
import { PUT as putDefaultBrandFields } from '@/app/api/my/workspace/[id]/brand/route';
import { POST as uploadBrandImage } from '@/app/api/my/workspace/[id]/brand/upload/route';
import { POST as makeDefaultBrand } from '@/app/api/my/workspace/[id]/brands/[brandId]/default/route';
import {
  DELETE as deleteBrand,
  PUT as putBrand,
} from '@/app/api/my/workspace/[id]/brands/[brandId]/route';
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

  it('refuses every other branding write to a member with OWNER_ONLY', async () => {
    const { acme, member, workspace } = await setup();
    const brand = await WorkspaceBrand.create({
      workspace_id: workspace.id!,
      client_id: workspace.client_id,
      name: 'Acme',
      is_default: true,
      updated_by: acme.user.address!,
    });
    const asMember = () =>
      request('POST', '/x', {
        as: member.address!,
        teamId: acme.team.id!,
        body: { name: 'x' },
      });
    const workspaceParams = () => ({ params: Promise.resolve({ id: workspace.id! }) });
    const brandParams = () => ({
      params: Promise.resolve({ id: workspace.id!, brandId: brand.id! }),
    });

    const responses = [
      await putDefaultBrandFields(await asMember(), workspaceParams()),
      await uploadBrandImage(await asMember(), workspaceParams()),
      await putBrand(await asMember(), brandParams()),
      await deleteBrand(await asMember(), brandParams()),
      await makeDefaultBrand(await asMember(), brandParams()),
    ];

    for (const response of responses) {
      expect(await read(response)).toEqual({ status: 403, body: ownerOnly });
    }
    await brand.reload();
    expect(brand.name).toBe('Acme');
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
    const memberDelete = await read(
      await deleteConfiguration(await request('DELETE', '/x', asMember), {
        params: { id: saved.body.id },
      }),
    );

    expect(memberCreate).toEqual({ status: 403, body: ownerOnly });
    expect(memberWrite).toEqual({ status: 403, body: ownerOnly });
    expect(memberDelete).toEqual({ status: 403, body: ownerOnly });
    expect(await Configuration.count({ where: { id: saved.body.id } })).toBe(1);
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

Task 2's configuration regressions keep passing. Their users finished sign-up (`createOwner`), so with no header each is the owner of their own team, and #80's license-owner rule applies to their own wallet exactly as before.

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

### Task 7: Teams, members (with `memberKeys`), removal and leaving

**Files:**

- Create: `src/services/teamMembers.service.ts`
- Create: `src/app/api/my/teams/route.ts`, `src/app/api/my/team/members/route.ts`, `src/app/api/my/team/members/[id]/route.ts`, `src/app/api/my/team/leave/route.ts`
- Test: `test/api/teams-and-members.test.ts`

**Interfaces:**

- Consumes (Tasks 3–4): `TeamContext`, `requireUser`, `resolveTeamContext`, `requireOwner`, `notDeleted`, `activeMembershipWhere`, `LicenseSigner`, `LicenseSignerHolder`, `SignerKinds`, `errorResponse`.
- Produces:
  - `toTeamSummary(args: { team: Team; company: Company | null; owner: User; callerId: string }): TeamSummary`. `role` and `isPersonal` both come from `team.created_by === callerId`.
  - `toTeamMember(row: TeamCollaborator, ownerUserId: string, memberKeys?: MemberKey[]): TeamMember`. `role` is `OWNER` exactly when `row.user_id === ownerUserId`. Load `row.User` with `include: [{ model: User }]` for accepted rows. Pending rows have no `User`, and their `email` comes from the row.
  - `listTeamsForUser(user: User): Promise<TeamSummary[]>`: the team they created first, then teams they joined, by name. Teams whose owner has no wallet are left out.
  - `listMembers(ctx: TeamContext): Promise<TeamMember[]>`, ordered as C7 says: owner, accepted members, pending invites, then `REVOKED` and `LEFT` members who still hold an enabled `MEMBER` key, each group oldest first.
    - The owner is listed even when the team has no membership row for them. That row's `id` is `owner:<teamId>`, and `DELETE /api/my/team/members/owner:<teamId>` answers 404.
  - `removeMember(ctx, membershipId): Promise<void>`: status `REVOKED`, `deleted = true`. Errors: 404 `NOT_FOUND`, 400 `CANNOT_REMOVE_OWNER`, 403 `OWNER_ONLY`.
  - `leaveTeam(ctx): Promise<void>`: status `LEFT`, `deleted = true`. Errors: 400 `CANNOT_LEAVE_OWN_TEAM`.
- Every route here passes `consoleOnly: true` (C4).

- [ ] **Step 1: Write the failing tests**

`test/api/teams-and-members.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { POST as leaveRoute } from '@/app/api/my/team/leave/route';
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
import { sql } from '../support/db';
import { addMember, createOwner, createOwnerFor, createUser } from '../support/fixtures';
import { read, request } from '../support/http';

type Owner = Awaited<ReturnType<typeof createOwner>>;

const teams = async (as: string, options: { teamId?: string; aud?: string[] } = {}) =>
  read(await listTeamsRoute(await request('GET', '/api/my/teams', { as, ...options })));
const members = async (as: string, teamId?: string) =>
  read(
    await listMembersRoute(await request('GET', '/api/my/team/members', { as, teamId })),
  );

const memberKey = async (
  owner: Owner,
  userId: string,
  tokenId: number,
  address: string,
) => {
  const key = await LicenseSigner.create({
    team_id: owner.team.id!,
    license_token_id: tokenId,
    signer_address: address.toLowerCase(),
    kind: SignerKinds.MEMBER,
  });
  await LicenseSignerHolder.create({ signer_id: key.id!, user_id: userId });
  return key;
};

describe('GET /api/my/teams', () => {
  it('lists the team the caller created first, then teams they joined', async () => {
    const zeta = await createOwner('Zeta');
    const person = await createUser({ name: 'Pat' });
    await addMember(zeta.team.id!, person);
    const own = await createOwnerFor(person, 'Mine');

    const response = await teams(person.address!);

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

  it('marks a team OWNER only for its creator, whatever the membership row says', async () => {
    const zeta = await createOwner('Zeta');
    const impostor = await createUser();
    await sql(
      `INSERT INTO team_collaborators (id, team_id, user_id, role, status, created_at, updated_at, deleted)
       VALUES (gen_random_uuid()::text, :team, :user, 'OWNER', 'ACCEPTED', now(), now(), false)`,
      { team: zeta.team.id, user: impostor.id },
    );
    await zeta.membership.destroy();

    expect((await teams(impostor.address!)).body.teams).toMatchObject([
      { id: zeta.team.id, role: 'MEMBER', isPersonal: false },
    ]);
    expect((await teams(zeta.user.address!)).body.teams).toMatchObject([
      { id: zeta.team.id, role: 'OWNER', isPersonal: true },
    ]);
  });

  it('leaves out teams the caller was removed from or left, and ignores a stale X-Team-Id', async () => {
    const zeta = await createOwner('Zeta');
    const yank = await createOwner('Yank');
    const person = await createUser();
    await (
      await addMember(zeta.team.id!, person)
    ).update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
    });
    await (
      await addMember(yank.team.id!, person)
    ).update({
      status: InvitationStatuses.LEFT,
      deleted: true,
    });
    const own = await createOwnerFor(person, 'Mine');

    const response = await teams(person.address!, { teamId: zeta.team.id! });

    expect(response.status).toBe(200);
    expect(response.body.teams.map((team: { id: string }) => team.id)).toEqual([
      own.team.id,
    ]);
  });

  it('refuses an anonymous caller and a token from another app', async () => {
    const { user } = await createOwner('Acme');
    const unauthorized = { message: 'User not found', code: 'UNAUTHORIZED' };

    expect(
      await read(await listTeamsRoute(await request('GET', '/api/my/teams'))),
    ).toEqual({
      status: 401,
      body: unauthorized,
    });
    expect(await teams(user.address!, { aud: ['some-other-app'] })).toEqual({
      status: 401,
      body: unauthorized,
    });
  });
});

describe('GET /api/my/team/members', () => {
  it('orders owner, members, pending invites, then departed members still holding keys', async () => {
    const acme = await createOwner('Acme');
    const mia = await createUser({ name: 'Mia' });
    await mia.update({ signer_address: '0x' + 'ab'.repeat(20) });
    await addMember(acme.team.id!, mia);
    // Mia's key is under her previous wallet: memberKeys still lists it.
    await memberKey(acme, mia.id!, 7, '0x' + 'ee'.repeat(20));
    const expires = new Date(Date.now() + 86_400_000);
    await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'invitee@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
      invite_token_hash: 'a'.repeat(64),
      invite_expires_at: expires,
    });
    const gone = await createUser({ name: 'Gone' });
    await (
      await addMember(acme.team.id!, gone)
    ).update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
    });
    await memberKey(acme, gone.id!, 7, '0x' + 'cd'.repeat(20));
    const quit = await createUser({ name: 'Quit' });
    await (
      await addMember(acme.team.id!, quit)
    ).update({
      status: InvitationStatuses.LEFT,
      deleted: true,
    });
    await memberKey(acme, quit.id!, 8, '0x' + 'ef'.repeat(20));
    const forgotten = await createUser({ name: 'Forgotten' });
    await (
      await addMember(acme.team.id!, forgotten)
    ).update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
    });

    const response = await members(mia.address!, acme.team.id!);

    expect(response.status).toBe(200);
    expect(
      response.body.members.map((m: { email: string; role: string; status: string }) => [
        m.email,
        m.role,
        m.status,
      ]),
    ).toEqual([
      [acme.user.email, 'OWNER', 'ACCEPTED'],
      [mia.email, 'MEMBER', 'ACCEPTED'],
      ['invitee@x.test', 'MEMBER', 'PENDING'],
      [gone.email, 'MEMBER', 'REVOKED'],
      [quit.email, 'MEMBER', 'LEFT'],
    ]);
    const [owner, miaRow, invitee] = response.body.members;
    expect(owner).toMatchObject({ signerAddress: null, memberKeys: [] });
    expect(miaRow).toMatchObject({
      userId: mia.id,
      name: 'Mia',
      signerAddress: getAddress('0x' + 'ab'.repeat(20)),
      memberKeys: [
        { licenseTokenId: 7, signerAddress: getAddress('0x' + 'ee'.repeat(20)) },
      ],
      inviteExpiresAt: null,
    });
    expect(invitee).toMatchObject({
      userId: null,
      name: null,
      memberKeys: [],
      inviteExpiresAt: expires.toISOString(),
    });
  });

  it('lists the owner first even without a membership row', async () => {
    const acme = await createOwner('Acme');
    await acme.membership.destroy();
    const mia = await createUser({ name: 'Mia' });
    await addMember(acme.team.id!, mia);

    const response = await members(mia.address!, acme.team.id!);

    expect(
      response.body.members.map((m: { id: string; email: string; role: string }) => [
        m.id,
        m.email,
        m.role,
      ]),
    ).toEqual([
      [`owner:${acme.team.id}`, acme.user.email, 'OWNER'],
      [expect.any(String), mia.email, 'MEMBER'],
    ]);
  });

  it('refuses someone outside the team', async () => {
    const acme = await createOwner('Acme');
    const outsider = await createOwner('Other');

    expect((await members(outsider.user.address!, acme.team.id!)).body.code).toBe(
      'NOT_A_MEMBER',
    );
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

  it('marks the member REVOKED and deleted, and they lose the team at once', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    const row = await addMember(acme.team.id!, member);

    expect(await remove(acme.user.address!, row.id!)).toEqual({
      status: 204,
      body: null,
    });

    await row.reload();
    expect(row.status).toBe('REVOKED');
    expect(row.deleted).toBe(true);
    expect((await members(member.address!, acme.team.id!)).body.code).toBe(
      'NOT_A_MEMBER',
    );
  });

  it('refuses members, the owner, pending invites and rows of other teams', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    const row = await addMember(acme.team.id!, member);
    const pending = await TeamCollaborator.create({
      team_id: acme.team.id!,
      email: 'pending@x.test',
      role: TeamRoles.MEMBER,
      status: InvitationStatuses.PENDING,
    });
    const other = await createOwner('Other');
    const otherRow = await addMember(other.team.id!, await createUser());
    const notFound = {
      status: 404,
      body: { message: 'Member not found', code: 'NOT_FOUND' },
    };

    expect((await remove(member.address!, row.id!, acme.team.id!)).body.code).toBe(
      'OWNER_ONLY',
    );
    expect(await remove(acme.user.address!, acme.membership.id!)).toEqual({
      status: 400,
      body: { message: 'The team owner cannot be removed', code: 'CANNOT_REMOVE_OWNER' },
    });
    expect(await remove(acme.user.address!, pending.id!)).toEqual(notFound);
    expect(await remove(acme.user.address!, otherRow.id!)).toEqual(notFound);
  });
});

describe('POST /api/my/team/leave', () => {
  const leave = async (as: string, teamId?: string) =>
    read(await leaveRoute(await request('POST', '/api/my/team/leave', { as, teamId })));

  it('marks the member LEFT and deleted, and they lose the team at once', async () => {
    const acme = await createOwner('Acme');
    const member = await createUser();
    const row = await addMember(acme.team.id!, member);

    expect(await leave(member.address!, acme.team.id!)).toEqual({
      status: 204,
      body: null,
    });

    await row.reload();
    expect(row.status).toBe('LEFT');
    expect(row.deleted).toBe(true);
    expect((await leave(member.address!, acme.team.id!)).body.code).toBe('NOT_A_MEMBER');
  });

  it('refuses the owner leaving their own team', async () => {
    const acme = await createOwner('Acme');

    expect(await leave(acme.user.address!)).toEqual({
      status: 400,
      body: { message: 'You cannot leave a team you own', code: 'CANNOT_LEAVE_OWN_TEAM' },
    });
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/teams-and-members.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/my/team/leave/route"`.

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
import { activeMembershipWhere, notDeleted } from '@/services/membership.service';
import { requireOwner, TeamContext } from '@/services/teamContext.service';
import type { MemberKey, MembershipStatus, TeamMember, TeamSummary } from '@/types/teams';
import { ApiError } from '@/utils/apiError';

const toChecksum = (address: string) => getAddress(address) as `0x${string}`;

export const toTeamSummary = ({
  team,
  company,
  owner,
  callerId,
}: {
  team: Team;
  company: Company | null;
  owner: User;
  callerId: string;
}): TeamSummary => {
  const isOwner = team.created_by === callerId;
  return {
    id: team.id!,
    name: team.name,
    companyName: company?.name ?? null,
    role: isOwner ? TeamRoles.OWNER : TeamRoles.MEMBER,
    ownerUserId: owner.id!,
    ownerEmail: owner.email,
    ownerAddress: toChecksum(owner.address!),
    isPersonal: isOwner,
  };
};

export const toTeamMember = (
  row: TeamCollaborator,
  ownerUserId: string,
  memberKeys: MemberKey[] = [],
): TeamMember => {
  const user = row.User ?? null;
  const createdAt = row.get('created_at') as Date;
  return {
    id: row.id!,
    userId: row.user_id ?? null,
    name: user?.name ?? null,
    email: user?.email ?? row.email ?? '',
    role: row.user_id && row.user_id === ownerUserId ? TeamRoles.OWNER : TeamRoles.MEMBER,
    status: row.status as MembershipStatus,
    signerAddress: user?.signer_address ? toChecksum(user.signer_address) : null,
    memberKeys,
    invitedAt: createdAt.toISOString(),
    inviteExpiresAt:
      row.status === InvitationStatuses.PENDING && row.invite_expires_at
        ? row.invite_expires_at.toISOString()
        : null,
  };
};

export const listTeamsForUser = async (user: User): Promise<TeamSummary[]> => {
  const created = await Team.findAll({
    where: { created_by: user.id!, deleted: notDeleted },
  });
  const memberships = await TeamCollaborator.findAll({
    where: { user_id: user.id!, ...activeMembershipWhere },
  });
  const joinedIds = memberships
    .map((membership) => membership.team_id)
    .filter((teamId) => !created.some((team) => team.id === teamId));
  const joined = joinedIds.length
    ? await Team.findAll({ where: { id: { [Op.in]: joinedIds }, deleted: notDeleted } })
    : [];

  const summaries: TeamSummary[] = [];
  for (const team of [...created, ...joined]) {
    const owner =
      team.created_by === user.id
        ? user
        : await User.findOne({ where: { id: team.created_by } });
    if (!owner?.address) {
      console.warn({ step: '[Teams] Team owner has no wallet', teamId: team.id });
      continue;
    }
    const company = await Company.findOne({ where: { id: team.company_id } });
    summaries.push(toTeamSummary({ team, company, owner, callerId: user.id! }));
  }

  return summaries.sort(
    (a, b) => Number(b.isPersonal) - Number(a.isPersonal) || a.name.localeCompare(b.name),
  );
};

/** Every enabled MEMBER key in the team, by holder: what an owner must revoke. */
const memberKeysByUser = async (teamId: string) => {
  const keys = await LicenseSigner.findAll({
    where: { team_id: teamId, kind: SignerKinds.MEMBER, disabled_at: null },
    include: [{ model: LicenseSignerHolder, as: 'holders' }],
    order: [['created_at', 'ASC']],
  });
  const byUser = new Map<string, MemberKey[]>();
  for (const key of keys) {
    for (const holder of key.holders ?? []) {
      if (!holder.user_id) continue;
      byUser.set(holder.user_id, [
        ...(byUser.get(holder.user_id) ?? []),
        {
          licenseTokenId: key.license_token_id,
          signerAddress: toChecksum(key.signer_address),
        },
      ]);
    }
  }
  return byUser;
};

const rank = (member: TeamMember) => {
  if (member.role === TeamRoles.OWNER) return 0;
  const order: Record<MembershipStatus, number> = {
    ACCEPTED: 1,
    PENDING: 2,
    REVOKED: 3,
    LEFT: 3,
  };
  return order[member.status];
};

export const listMembers = async (ctx: TeamContext): Promise<TeamMember[]> => {
  const teamId = ctx.team.id!;
  const ownerUserId = ctx.team.created_by;

  const rows = await TeamCollaborator.findAll({
    where: {
      team_id: teamId,
      deleted: notDeleted,
      status: { [Op.in]: [InvitationStatuses.ACCEPTED, InvitationStatuses.PENDING] },
    },
    include: [{ model: User }],
    order: [['created_at', 'ASC']],
  });
  const keysByUser = await memberKeysByUser(teamId);
  const activeUserIds = new Set(rows.map((row) => row.user_id).filter(Boolean));

  // Someone removed or gone stays listed while they still hold an enabled member
  // key, so the owner can see what is left to revoke.
  const departedIds = Array.from(keysByUser.keys()).filter(
    (id) => !activeUserIds.has(id),
  );
  const departed: TeamCollaborator[] = [];
  for (const userId of departedIds) {
    const latest = await TeamCollaborator.findOne({
      where: {
        team_id: teamId,
        user_id: userId,
        status: { [Op.in]: [InvitationStatuses.REVOKED, InvitationStatuses.LEFT] },
      },
      include: [{ model: User }],
      order: [['updated_at', 'DESC']],
    });
    if (latest) departed.push(latest);
  }

  const members = [...rows, ...departed].map((row) =>
    toTeamMember(row, ownerUserId, keysByUser.get(row.user_id ?? '') ?? []),
  );

  // The creator owns the team even without a membership row; C7 lists them first.
  if (!members.some((member) => member.userId === ownerUserId)) {
    members.push({
      id: `owner:${teamId}`,
      userId: ownerUserId,
      name: ctx.owner.name ?? null,
      email: ctx.owner.email,
      role: TeamRoles.OWNER,
      status: InvitationStatuses.ACCEPTED as MembershipStatus,
      signerAddress: ctx.owner.signer_address ? toChecksum(ctx.owner.signer_address) : null,
      memberKeys: keysByUser.get(ownerUserId) ?? [],
      invitedAt: (ctx.team.get('created_at') as Date).toISOString(),
      inviteExpiresAt: null,
    });
  }

  return members.sort((a, b) => rank(a) - rank(b) || a.invitedAt.localeCompare(b.invitedAt));
};

export const removeMember = async (ctx: TeamContext, membershipId: string) => {
  requireOwner(ctx);
  const row = await TeamCollaborator.findOne({
    where: {
      id: membershipId,
      team_id: ctx.team.id!,
      status: InvitationStatuses.ACCEPTED,
      deleted: notDeleted,
    },
  });
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Member not found');
  if (row.user_id === ctx.team.created_by) {
    throw new ApiError(400, 'CANNOT_REMOVE_OWNER', 'The team owner cannot be removed');
  }
  await row.update({
    status: InvitationStatuses.REVOKED,
    deleted: true,
    deleted_at: new Date(),
  });
};

export const leaveTeam = async (ctx: TeamContext) => {
  if (ctx.role === TeamRoles.OWNER) {
    throw new ApiError(400, 'CANNOT_LEAVE_OWN_TEAM', 'You cannot leave a team you own');
  }
  // resolveTeamContext only lets a non-owner in with an active membership.
  await ctx.membership!.update({
    status: InvitationStatuses.LEFT,
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
    const user = await requireUser(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
    await removeMember(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Remove member');
  }
};
```

`src/app/api/my/team/leave/route.ts`:

```ts
import { resolveTeamContext } from '@/services/teamContext.service';
import { leaveTeam } from '@/services/teamMembers.service';
import { errorResponse } from '@/utils/apiError';

// A member leaves the active team. Their keys stay until the owner revokes them;
// the members list keeps showing them until then.
export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
    await leaveTeam(ctx);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Leave');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/teams-and-members.test.ts`
Expected: `11 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/teamMembers.service.ts src/app/api/my/teams src/app/api/my/team/members src/app/api/my/team/leave test
git add src/services/teamMembers.service.ts src/app/api/my/teams src/app/api/my/team/members src/app/api/my/team/leave test
git commit -m "feat(teams): list teams and members with their keys, remove members and let members leave"
```

---

### Task 8: Invitations: create, resend, cancel, preview and accept, with limits

**Files:**

- Create: `src/services/invitation.service.ts`
- Modify: `src/templates/team.ts` (#80's escaping extends to the team name)
- Modify: `src/controllers/teamCollaborator.controller.ts` (#80's legacy call to the template, until Task 9 replaces it)
- Create: `src/app/api/my/team/invitations/route.ts`, `src/app/api/my/team/invitations/[id]/route.ts`, `src/app/api/my/team/invitations/[id]/resend/route.ts`, `src/app/api/invitations/preview/route.ts`, `src/app/api/invitations/accept/route.ts`
- Test: `test/api/invitations.test.ts`

**Interfaces:**

- Consumes (Tasks 3, 4 and 7): `TeamContext`, `requireOwner`, `requireUser`, `resolveTeamContext`, `findMembership`, `activeMembershipWhere`, `notDeleted`, `toTeamMember`, `toTeamSummary`, `TeamInviteSend`, `ApiError`, `errorResponse`.
- Produces:
  - `generateInviteToken(): string`, `hashInviteToken(token: string): string`, `inviteLink(token: string): string`.
  - `createInvitation(ctx, rawEmail: unknown, options?: { legacyLink?: boolean }): Promise<TeamMember>`.
    - `legacyLink` exists only until part 3 ships (C7). Task 9's legacy route passes it: the row gets no token hash, and the email carries the legacy `sign-in?code=<base64 row id>` link, which the legacy `invitation_code` path accepts for the invited email.
    - Task 15 removes the option.
    - Errors:
    - 400 `INVALID_EMAIL`;
    - 409 `ALREADY_MEMBER`;
    - 409 `ALREADY_INVITED`, also for a concurrent duplicate caught by the unique index;
    - 403 `OWNER_ONLY`;
    - 429 `RATE_LIMITED`;
    - 502 `EMAIL_FAILED`, after which the row is revoked so the invite can be retried.
  - `resendInvitation(ctx, id: string): Promise<TeamMember>`. Errors: 404 `NOT_FOUND`, 403 `OWNER_ONLY`, 429 `RATE_LIMITED`, and 502 `EMAIL_FAILED`, after which the row keeps its new token.
  - `cancelInvitation(ctx, id: string): Promise<void>`. Errors: 404 `NOT_FOUND`, 403 `OWNER_ONLY`.
  - `previewInvitation(user, rawToken): Promise<InvitationPreview>` and `acceptInvitation(user, rawToken): Promise<TeamSummary>`. Both check the token the same way (`INVITE_INVALID`, `INVITE_EXPIRED`, `INVITE_EMAIL_MISMATCH`, `ALREADY_MEMBER`). Acceptance always makes the row `MEMBER`.
  - `generateTeamInvitationTemplate({ inviterName, teamName, cta })`. It reuses #80's module-level `escapeHtml` and #80's 60-character cut (`slice(0, 60)`), now for the team name too. Escaping happens inside the template only.
- Limits (C7), counted from `team_invite_sends`:
  - 10 sends per team in the last hour;
  - 30 per sender in the last 24 hours;
  - 50 pending invites per team;
  - one send per invite in the last 60 seconds.
  - Each answers 429 `RATE_LIMITED`.
- The limits are race-safe, as #80 (`04250f2`) made its own:
  - create and resend each run one transaction that takes `pg_advisory_xact_lock(hashtext('invites:team:<teamId>'))`, then `pg_advisory_xact_lock(hashtext('invites:sender:<userId>'))`, always in that order;
  - under both locks they count, write the row and record the `team_invite_sends` row, and every query passes the transaction;
  - the email is sent after commit.
- Every route here passes `consoleOnly: true` (C4).

- [ ] **Step 1: Write the failing tests**

`test/api/invitations.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { POST as acceptRoute } from '@/app/api/invitations/accept/route';
import { POST as previewRoute } from '@/app/api/invitations/preview/route';
import { DELETE as cancelRoute } from '@/app/api/my/team/invitations/[id]/route';
import { POST as resendRoute } from '@/app/api/my/team/invitations/[id]/resend/route';
import { POST as inviteRoute } from '@/app/api/my/team/invitations/route';
import { POST as leaveRoute } from '@/app/api/my/team/leave/route';
import { DELETE as removeMemberRoute } from '@/app/api/my/team/members/[id]/route';
import { GET as listMembersRoute } from '@/app/api/my/team/members/route';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { TeamInviteSend } from '@/models/teamInviteSend.model';
import { createInvitation, hashInviteToken } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import Mailer from '@/utils/mailer';
import { sql } from '../support/db';
import { addMember, createOwner, createOwnerFor, createUser } from '../support/fixtures';
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
const resend = async (owner: Owner, id: string) =>
  read(
    await resendRoute(await request('POST', '/x', { as: owner.user.address! }), {
      params: { id },
    }),
  );
const accept = async (as: string | undefined, token: unknown, aud?: string[]) =>
  read(
    await acceptRoute(
      await request('POST', '/api/invitations/accept', { as, aud, body: { token } }),
    ),
  );
const preview = async (as: string, token: unknown) =>
  read(
    await previewRoute(
      await request('POST', '/api/invitations/preview', { as, body: { token } }),
    ),
  );

/** The token from the link in the nth email sent during this test. */
const sentToken = (n = 0) => {
  const { html } = vi.mocked(Mailer.sendMail).mock.calls[n][0];
  return /sign-in\?invite=([A-Za-z0-9_-]+)/.exec(html)![1];
};
const sentHtml = (n = 0) => vi.mocked(Mailer.sendMail).mock.calls[n][0].html;

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
      memberKeys: [],
    });
    const [mail] = vi.mocked(Mailer.sendMail).mock.calls[0];
    expect(mail.to).toBe('new.person@x.test');
    expect(mail.html).toContain('http://localhost:3000/sign-in?invite=');
    const token = sentToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    const [row] = await sql<{ invite_token_hash: string; role: string }>(
      'SELECT invite_token_hash, role FROM team_collaborators WHERE id = :id',
      { id: response.body.member.id },
    );
    expect(row.invite_token_hash).toBe(hashInviteToken(token));
    expect(row.role).toBe('MEMBER');
  });

  it('invites people who already have an account', async () => {
    const acme = await createOwner('Acme');
    const existing = await createUser({ email: 'existing@x.test' });

    expect((await invite(acme, existing.email)).status).toBe(201);
  });

  it('refuses bad emails, current members, duplicate invites and members of the team', async () => {
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

  it('answers ALREADY_INVITED, not 500, when a concurrent invite wins the race', async () => {
    const acme = await createOwner('Acme');
    // A writer that doesn't take the lock (an older instance mid-deploy) inserts its
    // pending row after this one checked and before it creates its own: the window
    // the unique index guards.
    const realCreate = TeamCollaborator.create.bind(TeamCollaborator);
    vi.spyOn(TeamCollaborator, 'create').mockImplementationOnce((async (
      ...args: Parameters<typeof realCreate>
    ) => {
      await sql(
        `INSERT INTO team_collaborators (id, team_id, email, role, status, created_at, updated_at, deleted)
         VALUES (gen_random_uuid()::text, :team, 'Race@x.test', 'MEMBER', 'PENDING', now(), now(), false)`,
        { team: acme.team.id },
      );
      return realCreate(...args);
    }) as never);

    expect(await invite(acme, 'race@x.test')).toEqual({
      status: 409,
      body: { message: 'race@x.test already has a pending invitation', code: 'ALREADY_INVITED' },
    });
    expect(
      await TeamCollaborator.count({ where: { team_id: acme.team.id!, status: 'PENDING' } }),
    ).toBe(1);
  });

  it('refreshes an expired invite in place, as a member', async () => {
    const acme = await createOwner('Acme');
    const first = await invite(acme, 'late@x.test');
    await sql(
      `UPDATE team_collaborators SET invite_expires_at = now() - interval '1 minute', role = 'OWNER'
       WHERE id = :id`,
      { id: first.body.member.id },
    );
    await sql("UPDATE team_invite_sends SET created_at = now() - interval '2 minutes'");

    const again = await invite(acme, 'late@x.test');

    expect(again.status).toBe(201);
    expect(again.body.member).toMatchObject({ id: first.body.member.id, role: 'MEMBER' });
    expect(sentToken(1)).not.toBe(sentToken(0));
    const [row] = await sql<{ role: string }>(
      'SELECT role FROM team_collaborators WHERE id = :id',
      {
        id: first.body.member.id,
      },
    );
    expect(row.role).toBe('MEMBER');
  });

  it('answers 502 EMAIL_FAILED and leaves no pending invite when the email cannot be sent', async () => {
    const acme = await createOwner('Acme');
    vi.mocked(Mailer.sendMail).mockRejectedValueOnce(new Error('Error sending email'));

    const response = await invite(acme, 'bounce@x.test');

    expect(response).toEqual({
      status: 502,
      body: { message: 'The invitation email could not be sent', code: 'EMAIL_FAILED' },
    });
    expect(await TeamCollaborator.count({ where: { status: 'PENDING' } })).toBe(0);
  });

  it('with legacyLink, emails the legacy sign-in?code= link and stores no token', async () => {
    const acme = await createOwner('Acme');
    const ctx = await resolveTeamContext(
      await request('POST', '/x', { as: acme.user.address! }),
    );

    const member = await createInvitation(ctx, 'legacy@x.test', { legacyLink: true });

    const code = Buffer.from(member.id).toString('base64');
    expect(sentHtml()).toContain(`sign-in?code=${code}`);
    expect(sentHtml()).not.toContain('sign-in?invite=');
    const [row] = await sql<{ invite_token_hash: string | null; invite_expires_at: Date }>(
      'SELECT invite_token_hash, invite_expires_at FROM team_collaborators WHERE id = :id',
      { id: member.id },
    );
    expect(row.invite_token_hash).toBeNull();
    expect(row.invite_expires_at).not.toBeNull();
  });

  it('escapes and caps the inviter and team names in the email', async () => {
    const acme = await createOwner('Acme');
    await acme.user.update({ name: '<script>alert(1)</script> & Co' });
    await acme.team.update({ name: 'T'.repeat(80) });

    await invite(acme, 'pat@x.test');

    const html = sentHtml();
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('T'.repeat(60));
    expect(html).not.toContain('T'.repeat(61));
  });
});

describe('invite limits', () => {
  const sends = (owner: Owner, count: number) =>
    TeamInviteSend.bulkCreate(
      Array.from({ length: count }, () => ({
        team_id: owner.team.id!,
        membership_id: owner.membership.id!,
        sent_by: owner.user.id!,
      })),
    );

  it('allows 10 emails per team per hour', async () => {
    const acme = await createOwner('Acme');
    await sends(acme, 10);

    expect((await invite(acme, 'eleventh@x.test')).body).toEqual({
      message: 'This team has sent 10 invitations in the last hour. Try again later.',
      code: 'RATE_LIMITED',
    });
  });

  it('allows 30 emails per inviter per day', async () => {
    const acme = await createOwner('Acme');
    await sends(acme, 30);
    await sql("UPDATE team_invite_sends SET created_at = now() - interval '2 hours'");

    expect((await invite(acme, 'more@x.test')).body).toEqual({
      message: 'You have sent 30 invitations today. Try again tomorrow.',
      code: 'RATE_LIMITED',
    });
  });

  it('allows 50 pending invites per team', async () => {
    const acme = await createOwner('Acme');
    await TeamCollaborator.bulkCreate(
      Array.from({ length: 50 }, (_, n) => ({
        team_id: acme.team.id!,
        email: `pending${n}@x.test`,
        role: TeamRoles.MEMBER,
        status: InvitationStatuses.PENDING,
      })),
    );

    expect((await invite(acme, 'fifty-first@x.test')).body).toEqual({
      message: 'This team has 50 pending invitations. Cancel some before inviting more.',
      code: 'RATE_LIMITED',
    });
  });

  it('keeps the team limit when invites race', async () => {
    const acme = await createOwner('Acme');
    await sends(acme, 8);

    // Four at once for the last two places. Four stays under Sequelize's default pool
    // of five: each request waiting on the lock holds a connection.
    const responses = await Promise.all(
      [0, 1, 2, 3].map((n) => invite(acme, `race${n}@x.test`)),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 201, 429, 429,
    ]);
    expect(await TeamInviteSend.count({ where: { team_id: acme.team.id! } })).toBe(10);
  });

  it("keeps the sender's daily limit when invites to two of their teams race", async () => {
    const acme = await createOwner('Acme');
    const beta = await createOwnerFor(acme.user, 'Beta');
    await sends(acme, 28);
    // Outside the team's hour, inside the sender's day.
    await sql("UPDATE team_invite_sends SET created_at = now() - interval '2 hours'");

    // Two teams take two different team locks; only the sender's lock orders these.
    const responses = await Promise.all([
      invite(acme, 'a1@x.test'),
      invite(acme, 'a2@x.test'),
      invite(beta, 'b1@x.test', beta.user.address!, beta.team.id!),
      invite(beta, 'b2@x.test', beta.user.address!, beta.team.id!),
    ]);

    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    expect(await TeamInviteSend.count({ where: { sent_by: acme.user.id! } })).toBe(30);
  });

  it('allows one email per invite per minute', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');

    expect((await resend(acme, created.body.member.id)).body).toEqual({
      message: 'This invitation was sent less than a minute ago.',
      code: 'RATE_LIMITED',
    });

    await sql("UPDATE team_invite_sends SET created_at = now() - interval '61 seconds'");
    expect((await resend(acme, created.body.member.id)).status).toBe(200);
  });
});

describe('resend and cancel', () => {
  const backdateSends = () =>
    sql("UPDATE team_invite_sends SET created_at = now() - interval '61 seconds'");

  it('resend replaces the token; the old link stops working', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const oldToken = sentToken(0);
    const pat = await createUser({ email: 'pat@x.test' });
    await backdateSends();

    const resent = await resend(acme, created.body.member.id);

    expect(resent.status).toBe(200);
    expect(resent.body.member.inviteExpiresAt).not.toBeNull();
    expect((await accept(pat.address!, oldToken)).body.code).toBe('INVITE_INVALID');
    expect((await accept(pat.address!, sentToken(1))).status).toBe(200);
  });

  it('keeps the new token when the resend email fails', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const oldToken = sentToken(0);
    const pat = await createUser({ email: 'pat@x.test' });
    await backdateSends();
    vi.mocked(Mailer.sendMail).mockRejectedValueOnce(new Error('Error sending email'));

    const failed = await resend(acme, created.body.member.id);

    expect(failed).toEqual({
      status: 502,
      body: { message: 'The invitation email could not be sent', code: 'EMAIL_FAILED' },
    });
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

    const asMember = await read(
      await cancelRoute(
        await request('DELETE', '/x', { as: member.address!, teamId: acme.team.id! }),
        { params: { id: created.body.member.id } },
      ),
    );

    expect(await resend(acme, 'nope')).toEqual({
      status: 404,
      body: { message: 'Invitation not found', code: 'NOT_FOUND' },
    });
    expect(asMember.body.code).toBe('OWNER_ONLY');
  });
});

describe('POST /api/invitations/preview', () => {
  it('describes the invite to the invitee without accepting it', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const pat = await createUser({ email: 'pat@x.test' });

    const response = await preview(pat.address!, sentToken());

    expect(response).toEqual({
      status: 200,
      body: {
        teamName: 'Acme Co',
        ownerEmail: acme.user.email,
        expiresAt: created.body.member.inviteExpiresAt,
      },
    });
    const [row] = await sql<{ status: string }>(
      'SELECT status FROM team_collaborators WHERE id = :id',
      { id: created.body.member.id },
    );
    expect(row.status).toBe('PENDING');
  });

  it('checks the token the way accept does', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    const bob = await createUser({ email: 'bob@x.test' });
    const pat = await createUser({ email: 'pat@x.test' });

    expect((await preview(bob.address!, sentToken())).body.code).toBe(
      'INVITE_EMAIL_MISMATCH',
    );
    expect((await preview(pat.address!, 'garbage')).body.code).toBe('INVITE_INVALID');
    await sql(
      "UPDATE team_collaborators SET invite_expires_at = now() - interval '1 second' WHERE id = :id",
      { id: created.body.member.id },
    );
    expect((await preview(pat.address!, sentToken())).body.code).toBe('INVITE_EXPIRED');
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
    const [row] = await sql<{ role: string; status: string }>(
      'SELECT role, status FROM team_collaborators WHERE user_id = :user',
      { user: alice.id },
    );
    expect(row).toEqual({ role: 'MEMBER', status: 'ACCEPTED' });
    const members = await read(
      await listMembersRoute(
        await request('GET', '/x', { as: alice.address!, teamId: acme.team.id! }),
      ),
    );
    expect(members.status).toBe(200);
  });

  it('accepts as a member even if the invite row says OWNER', async () => {
    const acme = await createOwner('Acme');
    const created = await invite(acme, 'pat@x.test');
    await sql("UPDATE team_collaborators SET role = 'OWNER' WHERE id = :id", {
      id: created.body.member.id,
    });
    const pat = await createUser({ email: 'pat@x.test' });

    expect((await accept(pat.address!, sentToken())).body.team.role).toBe('MEMBER');
    const [row] = await sql<{ role: string }>(
      'SELECT role FROM team_collaborators WHERE id = :id',
      {
        id: created.body.member.id,
      },
    );
    expect(row.role).toBe('MEMBER');
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
    expect(
      await TeamCollaborator.count({
        where: { team_id: acme.team.id!, user_id: alice.id! },
      }),
    ).toBe(1);
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

  it('lets someone who was removed, or who left, be invited and accept again', async () => {
    const acme = await createOwner('Acme');
    const removed = await createUser({ email: 'removed@x.test' });
    const left = await createUser({ email: 'left@x.test' });
    const removedRow = await addMember(acme.team.id!, removed);
    await addMember(acme.team.id!, left);
    await removeMemberRoute(await request('DELETE', '/x', { as: acme.user.address! }), {
      params: { id: removedRow.id! },
    });
    await leaveRoute(
      await request('POST', '/x', { as: left.address!, teamId: acme.team.id! }),
    );

    expect((await invite(acme, 'removed@x.test')).status).toBe(201);
    expect((await invite(acme, 'left@x.test')).status).toBe(201);
    expect((await accept(removed.address!, sentToken(0))).status).toBe(200);
    expect((await accept(left.address!, sentToken(1))).status).toBe(200);
  });

  it('refuses an anonymous caller and a token from another app', async () => {
    const acme = await createOwner('Acme');
    await invite(acme, 'pat@x.test');
    const pat = await createUser({ email: 'pat@x.test' });

    expect((await accept(undefined, 'anything')).status).toBe(401);
    expect((await accept(pat.address!, sentToken(), ['some-other-app'])).status).toBe(
      401,
    );
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/invitations.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/invitations/accept/route"`.

- [ ] **Step 3: Escape the team name too, in #80's template**

#80 (`04250f2`) already has, in `src/templates/team.ts`:

- a module-level `escapeHtml`;
- `const inviter = escapeHtml(userName.slice(0, 60));` at the top of `generateTeamInvitationTemplate(userName, cta)`;
- `${inviter}` in the sentence.

Keep the helper and the 60-character cut. Change only the signature, add the team name, and escape the link:

```ts
export const generateTeamInvitationTemplate = ({
  inviterName,
  teamName,
  cta,
}: {
  inviterName: string;
  teamName: string;
  cta: string;
}): string => {
  // Names come from users: escaped and cut to 60 characters (contract C7).
  const inviter = escapeHtml(inviterName.slice(0, 60));
  const team = escapeHtml(teamName.slice(0, 60));
  const link = escapeHtml(cta);
  return `
```

- In the template body, the sentence `${inviter} invited you to collaborate with them on the DIMO Developer Platform. Click` becomes `${inviter} invited you to join ${team} on the DIMO Developer Console. Click`.
- Both `${cta}` (the `href` and `data-saferedirecturl`) become `${link}`.
- Leave the rest of the template as it is.

#80's legacy `invitePersonToMyTeam` (`src/controllers/teamCollaborator.controller.ts`) calls the old signature. Until Task 9 replaces it, update the call to:

```ts
const template = generateTeamInvitationTemplate({
  inviterName: user.name.split(' ')[0],
  teamName: companyName,
  cta: `${config.frontendUrl}sign-in?code=${code}`,
});
```

Task 2's escaping test (`&lt;b&gt;` followed by 57 `E`s) still passes: the cut and the helper are #80's.

- [ ] **Step 4: Write `src/services/invitation.service.ts`**

```ts
import { createHash, randomBytes } from 'node:crypto';
import { Op, Transaction, UniqueConstraintError, col, fn, where as sqlWhere } from 'sequelize';
import isEmail from 'validator/lib/isEmail';

import config from '@/config';
import { Company } from '@/models/company.model';
import { Team } from '@/models/team.model';
import {
  InvitationStatuses,
  TeamCollaborator,
  TeamRoles,
} from '@/models/teamCollaborator.model';
import { TeamInviteSend } from '@/models/teamInviteSend.model';
import { User } from '@/models/user.model';
import DB from '@/services/db';
import {
  activeMembershipWhere,
  findMembership,
  notDeleted,
} from '@/services/membership.service';
import { requireOwner, TeamContext } from '@/services/teamContext.service';
import { toTeamMember, toTeamSummary } from '@/services/teamMembers.service';
import { generateTeamInvitationTemplate } from '@/templates/team';
import type { InvitationPreview, TeamMember, TeamSummary } from '@/types/teams';
import { ApiError } from '@/utils/apiError';
import Mailer from '@/utils/mailer';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const LIMITS = { teamPerHour: 10, senderPerDay: 30, pendingPerTeam: 50 };

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

const rateLimited = (message: string) => new ApiError(429, 'RATE_LIMITED', message);
const createdSince = (ms: number) =>
  sqlWhere(col('created_at'), { [Op.gt]: new Date(Date.now() - ms) });

/**
 * Takes C7's limit locks for this transaction: the team's, then the sender's. Always
 * in that order, so two requests never wait on each other. A send is counted and
 * recorded under both, so concurrent requests can't all pass a limit before any of
 * them is recorded. #80's legacy invite uses the same per-team advisory lock.
 *
 * Every query made while holding them passes `transaction`. One that didn't would
 * wait for a second pool connection, while the requests queued on the lock hold the
 * others.
 */
const lockInviteLimits = async (ctx: TeamContext, transaction: Transaction) => {
  for (const key of [`invites:team:${ctx.team.id}`, `invites:sender:${ctx.user.id}`]) {
    await DB.connection!.query('SELECT pg_advisory_xact_lock(hashtext(:key))', {
      replacements: { key },
      transaction,
    });
  }
};

/** Contract C7's limits on invite and resend emails. Call under lockInviteLimits. */
const assertCanSend = async (
  ctx: TeamContext,
  membershipId: string | undefined,
  transaction: Transaction,
) => {
  const teamSends = await TeamInviteSend.count({
    where: { team_id: ctx.team.id!, [Op.and]: [createdSince(HOUR)] },
    transaction,
  });
  if (teamSends >= LIMITS.teamPerHour) {
    throw rateLimited(
      'This team has sent 10 invitations in the last hour. Try again later.',
    );
  }
  const senderSends = await TeamInviteSend.count({
    where: { sent_by: ctx.user.id!, [Op.and]: [createdSince(DAY)] },
    transaction,
  });
  if (senderSends >= LIMITS.senderPerDay) {
    throw rateLimited('You have sent 30 invitations today. Try again tomorrow.');
  }
  if (membershipId) {
    const recent = await TeamInviteSend.count({
      where: { membership_id: membershipId, [Op.and]: [createdSince(MINUTE)] },
      transaction,
    });
    if (recent > 0) throw rateLimited('This invitation was sent less than a minute ago.');
  }
};

const assertPendingRoom = async (teamId: string, transaction: Transaction) => {
  const pending = await TeamCollaborator.count({
    where: { team_id: teamId, status: InvitationStatuses.PENDING, deleted: notDeleted },
    transaction,
  });
  if (pending >= LIMITS.pendingPerTeam) {
    throw rateLimited(
      'This team has 50 pending invitations. Cancel some before inviting more.',
    );
  }
};

/** Records a send under lockInviteLimits; it counts even if the email then fails. */
const recordSend = (ctx: TeamContext, membershipId: string, transaction: Transaction) =>
  TeamInviteSend.create(
    { team_id: ctx.team.id!, membership_id: membershipId, sent_by: ctx.user.id! },
    { transaction },
  );

/** The email itself, sent after the transaction has committed. */
const mailInvite = async (ctx: TeamContext, email: string, link: string) => {
  const inviter = ctx.user.name?.split(' ')[0] || ctx.user.email;
  try {
    await Mailer.sendMail({
      to: email,
      subject: `${inviter.slice(0, 60)} invited you to ${ctx.team.name.slice(0, 60)} on the DIMO Developer Console`,
      // The subject is a header, not HTML: cut, not escaped. The body escapes.
      html: generateTeamInvitationTemplate({
        inviterName: inviter,
        teamName: ctx.team.name,
        cta: link,
      }),
    });
  } catch (error) {
    console.error({ error, step: '[Invitations] Send invite email' });
    throw new ApiError(502, 'EMAIL_FAILED', 'The invitation email could not be sent');
  }
};

const findPendingInTeam = (teamId: string, id: string, transaction?: Transaction) =>
  TeamCollaborator.findOne({
    where: {
      id,
      team_id: teamId,
      status: InvitationStatuses.PENDING,
      deleted: notDeleted,
    },
    transaction,
  });

const alreadyInvited = (email: string) =>
  new ApiError(409, 'ALREADY_INVITED', `${email} already has a pending invitation`);

/**
 * `legacyLink`: until part 3 ships, the legacy POST /api/my/team/invitation keeps
 * emailing the old `sign-in?code=<base64 row id>` link, accepted through the legacy
 * invitation_code path (contract C7, "Until part 3 ships"). Such rows carry no
 * token hash. Task 15 removes the option.
 */
export const createInvitation = async (
  ctx: TeamContext,
  rawEmail: unknown,
  { legacyLink = false }: { legacyLink?: boolean } = {},
): Promise<TeamMember> => {
  requireOwner(ctx);
  const teamId = ctx.team.id!;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  if (!isEmail(email))
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address');
  const lower = email.toLowerCase();

  const members = await TeamCollaborator.findAll({
    where: { team_id: teamId, ...activeMembershipWhere },
    include: [{ model: User }],
  });
  if (
    ctx.owner.email.toLowerCase() === lower ||
    members.some((row) => row.User?.email.toLowerCase() === lower)
  ) {
    throw new ApiError(
      409,
      'ALREADY_MEMBER',
      `${email} is already a member of this team`,
    );
  }

  const { token, fields: tokenFields } = freshInvite();
  const fields = legacyLink ? { ...tokenFields, invite_token_hash: null } : tokenFields;
  let row: TeamCollaborator;
  try {
    row = await DB.connection!.transaction(async (transaction) => {
      await lockInviteLimits(ctx, transaction);
      const pending = await TeamCollaborator.findOne({
        where: {
          team_id: teamId,
          status: InvitationStatuses.PENDING,
          deleted: notDeleted,
          [Op.and]: [sqlWhere(fn('lower', col('email')), lower)],
        },
        transaction,
      });
      if (pending?.invite_expires_at && pending.invite_expires_at.getTime() > Date.now()) {
        throw alreadyInvited(email);
      }
      if (!pending) await assertPendingRoom(teamId, transaction);
      await assertCanSend(ctx, pending?.id, transaction);

      // An expired invite, or one sent before links carried a token, is refreshed in
      // place. It is always a member's invite, whatever the old row said.
      const saved = pending
        ? await pending.update(
            { ...fields, role: TeamRoles.MEMBER, invited_by: ctx.user.id },
            { transaction },
          )
        : await TeamCollaborator.create(
            {
              team_id: teamId,
              email,
              role: TeamRoles.MEMBER,
              status: InvitationStatuses.PENDING,
              invited_by: ctx.user.id,
              ...fields,
            },
            { transaction },
          );
      await recordSend(ctx, saved.id!, transaction);
      return saved;
    });
  } catch (error) {
    // A pending invite for the same email written without the lock (say, by an older
    // instance mid-deploy): the unique index lets only one through.
    if (error instanceof UniqueConstraintError) throw alreadyInvited(email);
    throw error;
  }

  try {
    const link = legacyLink
      ? `${config.frontendUrl}sign-in?code=${Buffer.from(row.id!).toString('base64')}`
      : inviteLink(token);
    await mailInvite(ctx, email, link);
  } catch (error) {
    await row.update({
      status: InvitationStatuses.REVOKED,
      deleted: true,
      deleted_at: new Date(),
      invite_token_hash: null,
    });
    throw error;
  }
  return toTeamMember(row, ctx.team.created_by);
};

export const resendInvitation = async (
  ctx: TeamContext,
  id: string,
): Promise<TeamMember> => {
  requireOwner(ctx);
  const { token, fields } = freshInvite();
  const row = await DB.connection!.transaction(async (transaction) => {
    await lockInviteLimits(ctx, transaction);
    const found = await findPendingInTeam(ctx.team.id!, id, transaction);
    if (!found) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found');
    await assertCanSend(ctx, found.id, transaction);

    await found.update(
      { ...fields, role: TeamRoles.MEMBER, invited_by: ctx.user.id },
      { transaction },
    );
    await recordSend(ctx, found.id!, transaction);
    return found;
  });
  // If the email fails, the row keeps the new token (C7): the old link is dead
  // either way, and the owner can resend after a minute.
  await mailInvite(ctx, row.email!, inviteLink(token));
  return toTeamMember(row, ctx.team.created_by);
};

export const cancelInvitation = async (ctx: TeamContext, id: string) => {
  requireOwner(ctx);
  const row = await findPendingInTeam(ctx.team.id!, id);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found');

  await row.update({
    status: InvitationStatuses.REVOKED,
    deleted: true,
    deleted_at: new Date(),
    invite_token_hash: null,
  });
};

/** The pending invite a token names, checked for this user: what preview and accept share. */
const findValidInvite = async (user: User, rawToken: unknown) => {
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
  return { row, team, owner };
};

export const previewInvitation = async (
  user: User,
  rawToken: unknown,
): Promise<InvitationPreview> => {
  const { row, team, owner } = await findValidInvite(user, rawToken);
  return {
    teamName: team.name,
    ownerEmail: owner.email,
    expiresAt: row.invite_expires_at!.toISOString(),
  };
};

export const acceptInvitation = async (
  user: User,
  rawToken: unknown,
): Promise<TeamSummary> => {
  const { row, team, owner } = await findValidInvite(user, rawToken);

  await row.update({
    status: InvitationStatuses.ACCEPTED,
    role: TeamRoles.MEMBER,
    user_id: user.id,
    invite_token_hash: null,
    invite_expires_at: null,
  });

  const company = await Company.findOne({ where: { id: team.company_id } });
  return toTeamSummary({ team, company, owner, callerId: user.id! });
};
```

- [ ] **Step 5: Write the routes**

`src/app/api/my/team/invitations/route.ts`:

```ts
import { createInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
    return Response.json({ member: await resendInvitation(ctx, id) });
  } catch (error: unknown) {
    return errorResponse(error, '[Team] Resend invite');
  }
};
```

`src/app/api/invitations/preview/route.ts`:

```ts
import { previewInvitation } from '@/services/invitation.service';
import { requireUser } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

// What the console shows before the invitee accepts: "Join {teamName} owned by {ownerEmail}?"
export const POST = async (request: NextRequest) => {
  try {
    const user = await requireUser(request, { consoleOnly: true });
    const body = await request.json().catch(() => ({}));
    return Response.json(await previewInvitation(user, body?.token));
  } catch (error: unknown) {
    return errorResponse(error, '[Invitations] Preview');
  }
};
```

`src/app/api/invitations/accept/route.ts`:

```ts
import { acceptInvitation } from '@/services/invitation.service';
import { requireUser } from '@/services/teamContext.service';
import { errorResponse } from '@/utils/apiError';

// The token in the body must belong to an invite sent to the caller's email.
export const POST = async (request: NextRequest) => {
  try {
    const user = await requireUser(request, { consoleOnly: true });
    const body = await request.json().catch(() => ({}));
    return Response.json({ team: await acceptInvitation(user, body?.token) });
  } catch (error: unknown) {
    return errorResponse(error, '[Invitations] Accept');
  }
};
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- test/api/invitations.test.ts`
Expected: `26 passed`.

- [ ] **Step 7: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/invitation.service.ts src/templates/team.ts src/controllers/teamCollaborator.controller.ts src/app/api/my/team/invitations src/app/api/invitations test
git add src/services/invitation.service.ts src/templates/team.ts src/controllers/teamCollaborator.controller.ts src/app/api/my/team/invitations src/app/api/invitations test
git commit -m "feat(teams): rate-limited, email-bound invitations with preview, resend, cancel and accept"
```

---

### Task 9: Keep the retired team routes working, scoped to the caller's team

Today's console calls these until part 3 ships:

- `GET /api/my/team/collaborator`, `POST /api/my/team/invitation`, `DELETE /api/my/team/collaborator/:id` (`src/services/team.ts` in the console);
- `GET /api/me?invitation_code=` (`src/services/user.ts`).

They become thin adapters over the new services and the active team. #80 (`04250f2`) already made them safe:

- removal is scoped to the owner's team, refuses a row already removed, and counts only rows not removed for the last-owner check;
- the list is empty for a caller with no team, and a query parameter can't widen it;
- soft-deleted rows grant no team and no owner rights;
- invites are owner-only, always `COLLABORATOR` (`MEMBER` since Task 3), and limited to 10 rows per team per hour, counted and inserted under a per-team advisory lock;
- `invitation_code` acceptance needs a PENDING row sent to the caller's email.

This task doesn't redo any of that. It moves the routes onto the team model:

- **Owner** is `teams.created_by`, through the team context, instead of a membership row's `role`.
- **The legacy invite** goes through `createInvitation` with `legacyLink`: C7's limits, expiry and `MEMBER` rows. Until part 3 ships it keeps emailing the legacy `sign-in?code=` link, which today's console sends to `invitation_code` (C7, "Until part 3 ships"). It keeps #80's refusal message for non-owners, which the old Settings page shows. Task 15 removes the route and the link.
- **Removal** keeps #80's messages, marks rows `REVOKED`, and cancels pending invites through the invitation service.
- **`invitation_code` acceptance** keeps #80's checks and `markAsAccepted`, and adds three: it never accepts a token-based invite, an expired one, or one for someone already in the team.
- **The collaborator list** returns only the fields the old page reads, for the active team only, ignoring query parameters.
- **A caller with no team** now gets 403 `NOT_A_MEMBER` from all four routes, from `resolveTeamContext`, where #80 answered 400 or an empty page. Task 2's two tests for that case accept either.

**Files:**

- Modify (rewrite): `src/controllers/teamCollaborator.controller.ts`
- Modify (whole files below): `src/app/api/my/team/route.ts`, `src/app/api/my/team/collaborator/route.ts`, `src/app/api/my/team/collaborator/[id]/route.ts`, `src/app/api/my/team/invitation/route.ts`
- Modify: `test/api/regressions-80.test.ts` (the legacy rate-limit test, now C7's)
- Unchanged: `src/app/api/me/route.ts`. It still calls `acceptTeamInvitation(user, invitationCode)`, which keeps its signature.
- Test: `test/api/retired-team-routes.test.ts`

**Interfaces:**

- Consumes (Tasks 4, 7 and 8): `resolveTeamContext`, `TeamContext`, `findMembership`, `removeMember`, `createInvitation`, `cancelInvitation`, `legacyErrorResponse`. Consumes (#80): `ValidatorError` from `@/utils/error.utils`, and `markAsAccepted` from `@/services/teamCollaborator.service`, which sets `MEMBER` since Task 3.
- Produces:
  - `removeMyCollaboratorById(ctx: TeamContext, id: string): Promise<void>`. It replaces #80's `(user, id)` version and throws #80's `ValidatorError` messages: `Do not have enough permissions to remove a collaborator`, `Collaborator not found`, `Cannot remove the only administrator from the group.` The route answers each as 400 `{ message }`.
  - `acceptTeamInvitation(user: User, invitationCode: string | null): Promise<void>`. It keeps #80's checks (PENDING, the caller's email, case-insensitive) and `markAsAccepted`. It adds three: no token hash, not expired, and not already a member.
  - `listLegacyCollaborators(team: Team)`, returning `{ data, totalItems, totalPages }`:
    - the creator is shown as `OWNER` and everyone else as `COLLABORATOR`, so the old Settings page keeps its labels;
    - each row carries only `id`, `team_id`, `user_id`, `email`, `status`, `role`, `User` (`id`, `name`, `email`, `avatar_url`) and `Team` (`id`, `name`). Never the whole user row.
- The legacy invite keeps #80's 400 `Only the team owner can invite collaborators` for non-owners. Its limit becomes C7's: 429 `RATE_LIMITED`, counted from `team_invite_sends`. Step 4 updates Task 2's rate-limit test to match.
- The legacy invite's email carries `${frontendUrl}sign-in?code=<base64 row id>`, and its row has no token hash, so `acceptTeamInvitation` accepts it for the invited email.

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
import { TeamInviteSend } from '@/models/teamInviteSend.model';
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
    // Only what the old Settings page reads: no wallet, tokens or auth fields.
    expect(Object.keys(response.body.data[1].User).sort()).toEqual([
      'avatar_url',
      'email',
      'id',
      'name',
    ]);
  });

  it('keeps emailing the legacy sign-in?code= link, which the invited email accepts', async () => {
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
    // C7's limits and expiry apply, but the link is still the one today's console reads.
    const row = await TeamCollaborator.findOne({ where: { email: 'pat@x.test' } });
    expect(row).toMatchObject({ role: 'MEMBER', status: 'PENDING', invite_token_hash: null });
    expect(row!.invite_expires_at).not.toBeNull();
    expect(await TeamInviteSend.count({ where: { membership_id: row!.id! } })).toBe(1);
    const code = Buffer.from(row!.id!).toString('base64');
    const html = vi.mocked(Mailer.sendMail).mock.calls[0][0].html as string;
    expect(html).toContain(`sign-in?code=${code}`);
    expect(html).not.toContain('sign-in?invite=');

    const pat = await createUser({ email: 'pat@x.test' });
    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: pat.address! }),
    );
    await row!.reload();
    expect(row).toMatchObject({ status: 'ACCEPTED', user_id: pat.id, role: 'MEMBER' });
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
- The old invite route records no `team_invite_sends` row and sets no `invite_expires_at`: #80 counts rows and never expires them.
- Removed rows keep `status = 'ACCEPTED'`, because #80 only sets `deleted`.
- Pat accepts the token-based invite through `invitation_code`, because #80 doesn't look at the token hash.

The invited-email test and the `GET /api/my/team` test already pass: #80 added both behaviors, and they guard them here.

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
import { markAsAccepted } from '@/services/teamCollaborator.service';
import type { TeamContext } from '@/services/teamContext.service';
import { removeMember } from '@/services/teamMembers.service';
import { ValidatorError } from '@/utils/error.utils';

const notDeleted = { [Op.not]: true };

/** What the old Settings page reads about a person; never the whole user row. */
const LEGACY_USER_FIELDS = ['id', 'name', 'email', 'avatar_url'];

/**
 * Old invite links carried base64(row id). #80 honoured them only for a PENDING
 * row sent to the caller's email. On top of that: never for an invite sent with a
 * token link, an expired one, or one for someone already in the team.
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

  // #80's markAsAccepted: ACCEPTED, the user, and always MEMBER (contract C7).
  await markAsAccepted(row.id!, user);
};

/** The old paginated collaborator list, for one team, without removed rows. */
export const listLegacyCollaborators = async (team: Team) => {
  const rows = await TeamCollaborator.findAll({
    where: {
      team_id: team.id!,
      deleted: notDeleted,
      status: { [Op.in]: [InvitationStatuses.ACCEPTED, InvitationStatuses.PENDING] },
    },
    include: [
      { model: User, attributes: LEGACY_USER_FIELDS },
      { model: Team, attributes: ['id', 'name'] },
    ],
    order: [['created_at', 'ASC']],
  });
  // The old Settings page labels only OWNER and COLLABORATOR, and the owner is the
  // team's creator, whatever the row says.
  const data = rows.map((row) => ({
    id: row.id,
    team_id: row.team_id,
    user_id: row.user_id,
    email: row.email,
    status: row.status,
    role: row.user_id && row.user_id === team.created_by ? 'OWNER' : 'COLLABORATOR',
    User: row.User?.toJSON() ?? null,
    Team: row.Team?.toJSON() ?? null,
  }));
  return { data, totalItems: data.length, totalPages: data.length ? 1 : 0 };
};

/**
 * Removes a member, or cancels a pending invite, of the active team. #80 limited
 * this to the owner's own team; the messages stay #80's because the old Settings
 * page shows them. A team has one owner, who can't be removed.
 */
export const removeMyCollaboratorById = async (ctx: TeamContext, id: string) => {
  if (ctx.role !== TeamRoles.OWNER) {
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
  if (row.user_id === ctx.team.created_by) {
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
    // A creator without a membership row still answers with a JSON body.
    return Response.json(ctx.membership?.dataValues ?? {});
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
    return Response.json(await listLegacyCollaborators(ctx.team));
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
import _ from 'lodash';

import { TeamRoles } from '@/models/teamCollaborator.model';
import { createInvitation } from '@/services/invitation.service';
import { resolveTeamContext } from '@/services/teamContext.service';
import { legacyErrorResponse } from '@/utils/apiError';
import { ValidatorError } from '@/utils/error.utils';

// Retired: replaced by POST /api/my/team/invitations. Only the email is read from
// the body; invitations are always for a member. The email carries the legacy link,
// accepted through GET /api/me?invitation_code=.
export const POST = async (request: NextRequest) => {
  try {
    const ctx = await resolveTeamContext(request);
    // #80's message, which the old Settings page shows.
    if (ctx.role !== TeamRoles.OWNER) {
      throw new ValidatorError('Only the team owner can invite collaborators');
    }
    const { email } = _.pick(await request.json().catch(() => ({})), ['email']) as {
      email?: unknown;
    };
    // Until part 3 ships, today's console only reads the legacy sign-in?code= link
    // (contract C7). Task 15 removes this route.
    await createInvitation(ctx, email, { legacyLink: true });
    return Response.json(
      { message: `Invitation has been sent to ${String(email).trim()}` },
      { status: 200 },
    );
  } catch (error: unknown) {
    return legacyErrorResponse(error, '[My Team Invitation] Send team invitation');
  }
};
```

The legacy invite now counts C7's sends, not #80's rows. In `test/api/regressions-80.test.ts`, replace the test `'allows 10 invitations per team per hour'` with:

```ts
it('allows 10 invitation emails per team per hour', async () => {
  const acme = await createOwner('Acme');
  await TeamInviteSend.bulkCreate(
    Array.from({ length: 10 }, () => ({
      team_id: acme.team.id!,
      membership_id: acme.membership.id!,
      sent_by: acme.user.id!,
    })),
  );

  expect(await invite(acme.user.address!, 'eleventh@x.test')).toEqual({
    status: 429,
    body: {
      message: 'This team has sent 10 invitations in the last hour. Try again later.',
      code: 'RATE_LIMITED',
    },
  });
});
```

Add `import { TeamInviteSend } from '@/models/teamInviteSend.model';` to that file's imports.

- [ ] **Step 5: Confirm nothing else used the deleted controller functions**

The rewrite drops #80's `getTeamCollaborators`, `getMyTeamCollaborators`, `findTeamCollaboratorById`, `deleteTeamCollaboratorById`, `findMyTeam`, `findTeamInvitationByEmail`, `addTeamCollaborator`, `getCollaboratorTeam` and `invitePersonToMyTeam`, with its advisory lock (Task 8's locks replace it).

Run: `grep -rn "@/controllers/teamCollaborator.controller" src`
Expected: only `src/app/api/me/route.ts` (`acceptTeamInvitation`) and the two collaborator routes (`listLegacyCollaborators`, `removeMyCollaboratorById`). `src/controllers/team.controller.ts` has its own, unrelated `findMyTeam`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, including Task 2's regressions:

- the collaborator removal answers 400 `Collaborator not found` for another team's row;
- a non-owner's legacy invite answers 400 `Only the team owner can invite collaborators`;
- the new rate-limit test answers 429;
- the racing legacy invites still let exactly two through, now under Task 8's locks;
- the removed `OWNER` row and the caller with no team now get 403 `NOT_A_MEMBER`.

Typecheck exits 0.

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

- Consumes: `requireUser` (Task 4); `ApiError` and `errorResponse` (Task 3); `LicenseSigner`, `LicenseSignerHolder`, `SignerKinds` (Task 3); viem `recoverMessageAddress`, `getAddress`, `isAddress`, `isHex`.
- Produces:
  - `buildSignerProofMessage(eoa: string, kernelAddress: string, issuedAt: string): string`, the exact C6 text.
  - `verifySignerProof(input: { address: unknown; message: unknown; signature: unknown }, userAddress: string, now?: number): Promise<\`0x${string}\`>`. Returns the checksummed signer, or throws 400 `SIGNER_PROOF_INVALID` with a reason.
  - `assertSignerAvailable(user: User, signer: string): Promise<void>`, enforcing C6's last two rules:
    - 409 `SIGNER_IN_USE` when another user already has this signer, in any letter case, or the address is an `API_KEY` or `EXTERNAL` key in the registry;
    - 409 `SIGNER_LOCKED` when the caller holds an enabled `MEMBER` key under a different address.
  - A concurrent registration that trips `idx_users_signer_address` also answers 409 `SIGNER_IN_USE`.
- The route passes `consoleOnly: true` (C4).
- The console shows C8's copy for `SIGNER_IN_USE` and `SIGNER_LOCKED`, chosen by `code`. The `message` here is for API callers and logs.

- [ ] **Step 1: Write the failing tests**

`test/api/me-signer.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { PUT as putSigner } from '@/app/api/me/signer/route';
import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { User } from '@/models/user.model';
import {
  buildSignerProofMessage,
  verifySignerProof,
} from '@/services/signerProof.service';
import { createOwner, createUser, newWallet } from '../support/fixtures';
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

  const register = async (user: User, wallet = newWallet()) =>
    read(
      await putSigner(
        await request('PUT', '/api/me/signer', {
          as: user.address!,
          body: await proofFor(wallet, user.address!),
        }),
      ),
    );

  it('lets the same user register the same wallet again', async () => {
    const user = await createUser();
    const wallet = newWallet();

    expect((await register(user, wallet)).status).toBe(200);
    expect((await register(user, wallet)).status).toBe(200);
  });

  it("refuses another user's wallet, in any letter case, and a license API key", async () => {
    const owner = await createOwner('Acme');
    const taken = newWallet();
    const holder = await createUser();
    await holder.update({
      signer_address: taken.address.toUpperCase().replace('0X', '0x'),
    });
    const apiKey = newWallet();
    await LicenseSigner.create({
      team_id: owner.team.id!,
      license_token_id: 7,
      signer_address: apiKey.address.toLowerCase(),
      kind: SignerKinds.API_KEY,
    });
    const user = await createUser();

    expect((await register(user, taken)).body).toEqual({
      message: 'This wallet already signs for another account',
      code: 'SIGNER_IN_USE',
    });
    expect((await register(user, apiKey)).body).toEqual({
      message: 'This wallet is a license API key and cannot sign for an account',
      code: 'SIGNER_IN_USE',
    });
  });

  it('refuses a new wallet while the caller still holds member keys under the old one', async () => {
    const owner = await createOwner('Acme');
    const user = await createUser();
    const oldWallet = newWallet();
    expect((await register(user, oldWallet)).status).toBe(200);
    const key = await LicenseSigner.create({
      team_id: owner.team.id!,
      license_token_id: 7,
      signer_address: oldWallet.address.toLowerCase(),
      kind: SignerKinds.MEMBER,
    });
    await LicenseSignerHolder.create({ signer_id: key.id!, user_id: user.id });

    expect((await register(user, newWallet())).body).toEqual({
      message:
        'Your access is tied to another wallet. Ask the team owner to revoke it first.',
      code: 'SIGNER_LOCKED',
    });
    expect((await register(user, oldWallet)).status).toBe(200);

    await key.update({ disabled_at: new Date() });
    expect((await register(user, newWallet())).status).toBe(200);
  });

  it('refuses an anonymous caller, another app, and a body that is not JSON', async () => {
    const user = await createUser();
    expect(
      (await putSigner(await request('PUT', '/api/me/signer', { body: {} }))).status,
    ).toBe(401);
    expect(
      (
        await putSigner(
          await request('PUT', '/api/me/signer', {
            as: user.address!,
            aud: ['some-other-app'],
            body: await proofFor(newWallet(), user.address!),
          }),
        )
      ).status,
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

Append to the same file. Merge the new imports into the import block at the top.

```ts
import { Op, col, fn, where as sqlWhere } from 'sequelize';

import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { User } from '@/models/user.model';

/**
 * Contract C6's last two rules. A wallet signs for one account and is never also a
 * license API key; and while someone holds member keys under one wallet, they can't
 * switch to another (an owner revokes those keys first).
 */
export const assertSignerAvailable = async (user: User, signer: string) => {
  const lower = signer.toLowerCase();

  const otherUser = await User.findOne({
    where: {
      id: { [Op.ne]: user.id! },
      [Op.and]: [sqlWhere(fn('lower', col('signer_address')), lower)],
    },
  });
  if (otherUser) {
    throw new ApiError(
      409,
      'SIGNER_IN_USE',
      'This wallet already signs for another account',
    );
  }

  const sharedKey = await LicenseSigner.findOne({
    where: {
      signer_address: lower,
      kind: { [Op.in]: [SignerKinds.API_KEY, SignerKinds.EXTERNAL] },
    },
  });
  if (sharedKey) {
    throw new ApiError(
      409,
      'SIGNER_IN_USE',
      'This wallet is a license API key and cannot sign for an account',
    );
  }

  const heldElsewhere = await LicenseSigner.count({
    where: {
      kind: SignerKinds.MEMBER,
      disabled_at: null,
      signer_address: { [Op.ne]: lower },
    },
    include: [
      {
        model: LicenseSignerHolder,
        as: 'holders',
        where: { user_id: user.id! },
        required: true,
      },
    ],
  });
  if (heldElsewhere > 0) {
    throw new ApiError(
      409,
      'SIGNER_LOCKED',
      'Your access is tied to another wallet. Ask the team owner to revoke it first.',
    );
  }
};
```

- [ ] **Step 4: Write `src/app/api/me/signer/route.ts`**

```ts
import { UniqueConstraintError } from 'sequelize';

import { User } from '@/models/user.model';
import {
  assertSignerAvailable,
  SignerProofInput,
  verifySignerProof,
} from '@/services/signerProof.service';
import { requireUser } from '@/services/teamContext.service';
import { ApiError, errorResponse } from '@/utils/apiError';

// Records the EOA that signs for the caller (their Turnkey wallet), after the
// console proves control of it with the contract C6 message.
export const PUT = async (request: NextRequest) => {
  try {
    const user = await requireUser(request, { consoleOnly: true });
    const body = (await request.json().catch(() => null)) as SignerProofInput | null;
    if (!body || typeof body !== 'object') {
      throw new ApiError(
        400,
        'SIGNER_PROOF_INVALID',
        'Expected { address, message, signature }',
      );
    }

    const signerAddress = await verifySignerProof(body, user.address ?? '');
    await assertSignerAvailable(user, signerAddress);
    const signerVerifiedAt = new Date();
    try {
      await User.update(
        {
          signer_address: signerAddress.toLowerCase(),
          signer_verified_at: signerVerifiedAt,
        },
        { where: { id: user.id! } },
      );
    } catch (error) {
      // Another account registered the same wallet at the same moment.
      if (error instanceof UniqueConstraintError) {
        throw new ApiError(
          409,
          'SIGNER_IN_USE',
          'This wallet already signs for another account',
        );
      }
      throw error;
    }

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
Expected: `13 passed`.

- [ ] **Step 6: Run everything, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass, typecheck exits 0.

```bash
npx prettier --write src/services/signerProof.service.ts src/app/api/me/signer test
git add src/services/signerProof.service.ts src/app/api/me/signer test
git commit -m "feat(teams): verify and store the one wallet that signs for each user"
```

---

### Task 11: Extend #80's Identity service with a lookup by token ID

#80 (`04250f2`) added `src/services/identity.service.ts`:

- `export type License = { owner: string; tokenId: number }`;
- `getLicense(clientId)`, which queries `developerLicense(by: { clientId }) { owner tokenId }`, caches known licenses for 60 seconds under the lowercase client ID, doesn't cache unknown ones, and answers `null` for non-address input;
- `getLicenseOwner` and `isLicenseOwner`, built on `getLicense`;
- `IdentityUnavailableError`, thrown on HTTP or network failure, and when `body.errors` has any error whose `extensions.code !== 'NOT_FOUND'` (C7's rule; `NOT_FOUND` alone means `null`);
- the `IDENTITY_API_URL ?? config.identityApiUrl` override.

`identityApiUrl` is set in `default.ts` (dev) and `production.ts`; preview inherits the default.

This task keeps all of that and adds two things:

- `getLicenseByTokenId` for the registry. It shares `getLicense`'s request and `NOT_FOUND` rule: they move, unchanged, into one helper both lookups call, so the rule exists once;
- `clearIdentityCache` for tests.

There's no second client. Tasks 5, 6 and 13 use `getLicense`, and Task 12 uses `getLicenseByTokenId`.

**Files:**

- Modify: `src/services/identity.service.ts` (edits to #80's file, below)
- Modify: `src/utils/apiError.ts` (`apiErrorResponse` maps `IdentityUnavailableError` to 502 `IDENTITY_UNAVAILABLE`)
- Modify: `test/support/setup.ts` (clear the license cache before each test)
- Test: `test/services/identity.test.ts`

**Interfaces:**

- Consumes (Task 1): `fakeIdentity`, `newClientId`.
- Keeps (#80, same signatures and behavior): `License`, `getLicense(clientId)`, `getLicenseOwner(clientId)`, `isLicenseOwner(address, clientId)`, `IdentityUnavailableError`, and the `NOT_FOUND` rule.
- Produces:
  - `getLicenseByTokenId(tokenId: number): Promise<License | null>`. It answers `null` for a non-positive or non-integer ID, or for an unknown license, and caches a known license for 60 seconds per token ID. The query's variable is `Int!`, matching `DeveloperLicenseBy.tokenId` in the Identity schema (`~/workspace/dimo-developer-console/src/gql/graphql.ts`).
  - `getLicenseByTokenId` follows #80's rule through the shared helper: `IdentityUnavailableError` when an HTTP 200 carries GraphQL errors, unless every error has `extensions.code === 'NOT_FOUND'`. That is how Identity answers a license that doesn't exist (checked live on 2026-10-02).
  - `clearIdentityCache(): void`.
  - `apiErrorResponse` answers `IdentityUnavailableError` with 502 `{ message: 'Identity API is unavailable', code: 'IDENTITY_UNAVAILABLE' }`. The configuration and workspace routes check the error themselves first, so they keep #80's `{ error | message: 'Could not verify license ownership' }`.

- [ ] **Step 1: Write the failing tests**

`test/services/identity.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearIdentityCache,
  getLicense,
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
const fakeLicense = (tokenId: number) => ({
  tokenId,
  clientId: newClientId(),
  owner: newClientId(),
});

describe('identity service', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('looks a license up by token id and reuses it for 60 seconds', async () => {
    const license = fakeLicense(7);
    const fetchMock = fakeIdentity([license]);

    expect(await getLicenseByTokenId(7)).toEqual({ owner: license.owner, tokenId: 7 });
    later(59_999);
    await getLicenseByTokenId(7);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    later(1);
    await getLicenseByTokenId(7);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect(fetchMock.mock.calls[0][0]).toBe('http://identity.test/query');
    expect(requestBody(fetchMock).query).toContain(
      'developerLicense(by: { tokenId: $tokenId })',
    );
    expect(requestBody(fetchMock).query).toContain('$tokenId: Int!');
    expect(requestBody(fetchMock).variables).toEqual({ tokenId: 7 });
  });

  it("keeps #80's getLicense: by client id, any letter case, cached", async () => {
    const license = fakeLicense(8);
    const fetchMock = fakeIdentity([license]);

    expect(await getLicense(license.clientId.toLowerCase())).toEqual({
      owner: license.owner,
      tokenId: 8,
    });
    expect(await getLicense(license.clientId)).toEqual({
      owner: license.owner,
      tokenId: 8,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody(fetchMock).query).toContain(
      'developerLicense(by: { clientId: $clientId })',
    );
  });

  it('does not cache unknown licenses, and answers null for bad input without asking', async () => {
    const fetchMock = fakeIdentity([]);

    expect(await getLicenseByTokenId(404)).toBeNull();
    expect(await getLicenseByTokenId(404)).toBeNull();
    expect(await getLicense(newClientId())).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(await getLicense('not-an-address')).toBeNull();
    expect(await getLicenseByTokenId(0)).toBeNull();
    expect(await getLicenseByTokenId(1.5)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws IdentityUnavailableError on HTTP and network failures, without caching', async () => {
    const fetchMock = fakeIdentity([], { status: 500 });

    await expect(getLicenseByTokenId(7)).rejects.toBeInstanceOf(IdentityUnavailableError);
    await expect(getLicenseByTokenId(7)).rejects.toBeInstanceOf(IdentityUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(getLicense(newClientId())).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );
  });

  // getLicense's half pins #80's rule; getLicenseByTokenId's half is new.
  it('treats a GraphQL error answered with HTTP 200 as an outage, unless it is NOT_FOUND', async () => {
    fakeIdentity([], { graphqlError: 'database is down' });
    await expect(getLicenseByTokenId(7)).rejects.toBeInstanceOf(IdentityUnavailableError);
    await expect(getLicense(newClientId())).rejects.toBeInstanceOf(
      IdentityUnavailableError,
    );

    // The fake's unknown-license answer is Identity's real NOT_FOUND shape.
    fakeIdentity([]);
    await expect(getLicenseByTokenId(7)).resolves.toBeNull();
    await expect(getLicense(newClientId())).resolves.toBeNull();
  });

  it("keeps #80's getLicenseOwner and isLicenseOwner", async () => {
    const license = fakeLicense(9);
    fakeIdentity([license]);

    expect(await getLicenseOwner(license.clientId)).toBe(license.owner);
    expect(await isLicenseOwner(license.owner.toLowerCase(), license.clientId)).toBe(
      true,
    );
    expect(await isLicenseOwner(newClientId(), license.clientId)).toBe(false);
    expect(await isLicenseOwner(undefined, license.clientId)).toBe(false);
    expect(await getLicenseOwner('nope')).toBeNull();
  });

  it('forgets everything on clearIdentityCache', async () => {
    const license = fakeLicense(10);
    const fetchMock = fakeIdentity([license]);

    await getLicenseByTokenId(10);
    await getLicense(license.clientId);
    clearIdentityCache();
    await getLicenseByTokenId(10);
    await getLicense(license.clientId);

    expect(fetchMock).toHaveBeenCalledTimes(4);
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
Expected: FAIL. The import has no `getLicenseByTokenId` or `clearIdentityCache` export.

- [ ] **Step 3: Share #80's request with a token ID lookup in `src/services/identity.service.ts`**

Everything #80 exports keeps its name, signature and behavior. These are edits to #80's file, not a rewrite.

1. Below `LICENSE_QUERY`, add:

```ts
// DeveloperLicenseBy.tokenId is an Int in the Identity schema.
const LICENSE_BY_TOKEN_QUERY =
  'query ($tokenId: Int!) { developerLicense(by: { tokenId: $tokenId }) { owner tokenId } }';
```

2. Below `const licenses = new Map<…>();`, add:

```ts
const licensesByToken = new Map<number, { license: License; expires: number }>();
```

3. Move the middle of `getLicense` into a helper. Everything from `let body: {` down to and including `const license = { owner: found.owner, tokenId: Number(found.tokenId) };` moves into `queryLicense`, unchanged except for two things:

- the `fetch` body sends the helper's `query` and `variables`;
- the helper returns `null` or the license.

Put this above `getLicense`:

```ts
/** One developerLicense query. Null when Identity says the license doesn't exist. */
const queryLicense = async (
  query: string,
  variables: Record<string, unknown>,
): Promise<License | null> => {
  let body: {
    data?: { developerLicense?: { owner?: string; tokenId?: number } | null } | null;
    errors?: { message?: string; extensions?: { code?: string } }[];
  };
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

  // Identity answers an unknown license with HTTP 200 and a NOT_FOUND error. Any
  // other GraphQL error means Identity couldn't answer, which must not read as
  // "this caller doesn't own the license".
  const errors = body.errors ?? [];
  if (errors.some((e) => e.extensions?.code !== 'NOT_FOUND')) {
    throw new IdentityUnavailableError(errors.map((e) => e.message).join('; '));
  }

  const found = body.data?.developerLicense;
  if (!found?.owner || found.tokenId === undefined) return null;
  return { owner: found.owner, tokenId: Number(found.tokenId) };
};
```

`getLicense` becomes:

```ts
export const getLicense = async (clientId: string): Promise<License | null> => {
  if (!ADDRESS.test(clientId)) return null;
  const key = clientId.toLowerCase();
  const cached = licenses.get(key);
  if (cached && cached.expires > Date.now()) return cached.license;

  const license = await queryLicense(LICENSE_QUERY, { clientId });
  if (license) licenses.set(key, { license, expires: Date.now() + OWNER_TTL_MS });
  return license;
};
```

4. Below `getLicense`, add:

```ts
export const getLicenseByTokenId = async (tokenId: number): Promise<License | null> => {
  if (!Number.isInteger(tokenId) || tokenId <= 0) return null;
  const cached = licensesByToken.get(tokenId);
  if (cached && cached.expires > Date.now()) return cached.license;

  const license = await queryLicense(LICENSE_BY_TOKEN_QUERY, { tokenId });
  if (license)
    licensesByToken.set(tokenId, { license, expires: Date.now() + OWNER_TTL_MS });
  return license;
};
```

5. At the end of the file, add:

```ts
/** Forget every cached license. Tests call this between cases. */
export const clearIdentityCache = () => {
  licenses.clear();
  licensesByToken.clear();
};
```

`getLicenseOwner` and `isLicenseOwner` don't change.

Run: `grep -c "extensions?.code !== 'NOT_FOUND'" src/services/identity.service.ts`
Expected: `1`. The rule exists once, and both lookups go through it.

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

In `test/support/setup.ts`, import `clearIdentityCache` from `@/services/identity.service`, and make `beforeEach`:

```ts
beforeEach(async () => {
  clearIdentityCache();
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
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- test/services/identity.test.ts test/api/regressions-80.test.ts test/api/team-owned-resources.test.ts test/api/team-scoped-routes.test.ts`
Expected: all pass. That's 8 identity tests, plus #80's configuration and workspace tests (the GraphQL-error one included) and Tasks 5 and 6.

- [ ] **Step 7: Typecheck and commit**

Run: `npm run typecheck`
Expected: exit 0.

```bash
npx prettier --write src/services/identity.service.ts src/utils/apiError.ts test
git add src/services/identity.service.ts src/utils/apiError.ts test
git commit -m "feat(teams): look licenses up by token id through the Identity request #80 already checks"
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
- Check order for writes:
  1. owner (403 `OWNER_ONLY`);
  2. path address (400 `INVALID_ADDRESS`);
  3. license (403 `LICENSE_NOT_IN_TEAM`, or 502);
  4. body (400 `INVALID_HOLDERS`);
  5. kind change (409 `KIND_CONFLICT`: an `API_KEY` or `EXTERNAL` key can't become `MEMBER`, and a `MEMBER` key can't become anything else);
  6. for a `MEMBER` key, the member's wallet (400 `SIGNER_MISMATCH`: its address must equal its one holder's verified `signer_address`);
  7. for a **new** `API_KEY` or `EXTERNAL` key, the address mustn't be any user's verified `signer_address` (409 `SIGNER_IN_USE`).
- Every route here passes `consoleOnly: true` (C4).

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
  // Mia's verified wallet: the only address a member key of hers may have.
  const memberWallet = newWallet().address;
  await member.update({ signer_address: memberWallet.toLowerCase() });
  const membership = await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  // License 7 is owned by Acme's owner wallet; anything else doesn't exist.
  fakeIdentity([{ tokenId: 7, owner: acme.user.address!, clientId: CLIENT_ID }]);
  return { acme, member, memberWallet, membership, outsider };
};

type Options = { tokenId?: string; teamId?: string; aud?: string[] };

const put = async (as: string, address: string, body: unknown, opts: Options = {}) =>
  read(
    await putRoute(
      await request('PUT', '/x', { as, body, teamId: opts.teamId, aud: opts.aud }),
      {
        params: { tokenId: opts.tokenId ?? '7', address },
      },
    ),
  );

const disable = async (as: string, address: string, opts: Options = {}) =>
  read(
    await disableRoute(await request('POST', '/x', { as, teamId: opts.teamId }), {
      params: { tokenId: opts.tokenId ?? '7', address },
    }),
  );

const list = async (as: string, teamId?: string, tokenId = '7') =>
  read(
    await listRoute(await request('GET', '/x', { as, teamId }), { params: { tokenId } }),
  );

describe('license key registry', () => {
  it('records a member key and an API key with several holders, and lists them to members', async () => {
    const { acme, member, memberWallet } = await setup();
    const apiKey = newWallet().address;

    const saved = await put(acme.user.address!, memberWallet, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    expect(saved.status).toBe(200);
    expect(saved.body.signer).toMatchObject({
      signerAddress: getAddress(memberWallet),
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
      holders: [{ name: 'Backend service' }, { userId: acme.user.id }],
    });

    const listed = await list(member.address!, acme.team.id!);
    expect(listed.status).toBe(200);
    expect(
      listed.body.signers.map((s: { signerAddress: string; note: string | null }) => [
        s.signerAddress,
        s.note,
      ]),
    ).toEqual([
      [getAddress(memberWallet), null],
      [getAddress(apiKey), 'Prod backend'],
    ]);
    // Members first, then free-text names.
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
    const { acme, member, memberWallet } = await setup();
    const stranger = await createUser();
    const key = newWallet().address;
    const invalid = async (address: string, body: unknown) =>
      (await put(acme.user.address!, address, body)).body.code;

    expect(
      await invalid(memberWallet, { kind: 'MEMBER', holders: [{ userId: stranger.id }] }),
    ).toBe('INVALID_HOLDERS');
    expect(
      await invalid(memberWallet, {
        kind: 'MEMBER',
        holders: [{ userId: member.id }, { name: 'x' }],
      }),
    ).toBe('INVALID_HOLDERS');
    expect(
      await invalid(memberWallet, { kind: 'MEMBER', holders: [{ name: 'Mia' }] }),
    ).toBe('INVALID_HOLDERS');
    expect(await invalid(key, { kind: 'API_KEY', holders: [] })).toBe('INVALID_HOLDERS');
    expect(await invalid(key, { kind: 'API_KEY', holders: [{ name: '   ' }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(
      await invalid(key, {
        kind: 'API_KEY',
        holders: [{ userId: member.id }, { userId: member.id }],
      }),
    ).toBe('INVALID_HOLDERS');
    expect(
      await invalid(key, {
        kind: 'API_KEY',
        note: 'x'.repeat(201),
        holders: [{ name: 'a' }],
      }),
    ).toBe('INVALID_HOLDERS');
    expect(await invalid(key, { kind: 'OWNER', holders: [{ name: 'a' }] })).toBe(
      'INVALID_HOLDERS',
    );
    expect(await invalid(key, null)).toBe('INVALID_HOLDERS');
  });

  it("refuses a member key that isn't the member's verified wallet", async () => {
    const { acme, member } = await setup();
    const unverified = await createUser({ name: 'Nova' });
    await addMember(acme.team.id!, unverified);
    const mismatch = {
      status: 400,
      body: {
        message: "A member key must be the member's verified wallet",
        code: 'SIGNER_MISMATCH',
      },
    };

    expect(
      await put(acme.user.address!, newWallet().address, {
        kind: 'MEMBER',
        holders: [{ userId: member.id }],
      }),
    ).toEqual(mismatch);
    expect(
      await put(acme.user.address!, newWallet().address, {
        kind: 'MEMBER',
        holders: [{ userId: unverified.id }],
      }),
    ).toEqual(mismatch);
  });

  it('refuses turning a member key into an API key or external key', async () => {
    const { acme, member, memberWallet } = await setup();
    await put(acme.user.address!, memberWallet, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });

    for (const kind of ['API_KEY', 'EXTERNAL']) {
      expect(
        await put(acme.user.address!, memberWallet, { kind, holders: [{ name: 'Backend' }] }),
      ).toEqual({
        status: 409,
        body: {
          message: 'A member key cannot become an API key or external key',
          code: 'KIND_CONFLICT',
        },
      });
    }
  });

  it("refuses a new API key or external key at a user's verified wallet", async () => {
    const { acme, memberWallet } = await setup();

    for (const kind of ['API_KEY', 'EXTERNAL']) {
      expect(
        await put(acme.user.address!, memberWallet.toLowerCase(), {
          kind,
          holders: [{ name: 'Backend' }],
        }),
      ).toEqual({
        status: 409,
        body: {
          message: "This wallet is a user's verified wallet and cannot be recorded as a shared key",
          code: 'SIGNER_IN_USE',
        },
      });
    }
  });

  it('refuses turning an API key or external key into a member key', async () => {
    const { acme, member } = await setup();
    // An API key recorded before Mia verified that wallet as her own.
    const wallet = newWallet().address;
    await put(acme.user.address!, wallet, { kind: 'API_KEY', holders: [{ name: 'Backend' }] });
    await member.update({ signer_address: wallet.toLowerCase() });

    expect(
      await put(acme.user.address!, wallet, {
        kind: 'MEMBER',
        holders: [{ userId: member.id }],
      }),
    ).toEqual({
      status: 409,
      body: {
        message: 'An API key or external key cannot become a member key',
        code: 'KIND_CONFLICT',
      },
    });
  });

  it('refuses members, bad addresses, licenses outside the team, and other apps', async () => {
    const { acme, member, outsider } = await setup();
    const key = newWallet().address;
    const body = { kind: 'EXTERNAL', holders: [{ name: 'x' }] };
    const invalidAddress = {
      status: 400,
      body: { message: 'Signer must be an Ethereum address', code: 'INVALID_ADDRESS' },
    };

    expect(
      (await put(member.address!, key, body, { teamId: acme.team.id! })).body.code,
    ).toBe('OWNER_ONLY');
    expect(
      (await disable(member.address!, key, { teamId: acme.team.id! })).body.code,
    ).toBe('OWNER_ONLY');
    expect(await put(acme.user.address!, 'not-an-address', body)).toEqual(invalidAddress);
    expect(await disable(acme.user.address!, 'not-an-address')).toEqual(invalidAddress);
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
    expect(
      (await put(acme.user.address!, key, body, { aud: ['some-other-app'] })).status,
    ).toBe(401);
  });

  it('answers 502 IDENTITY_UNAVAILABLE when Identity is down', async () => {
    const { acme } = await setup();
    fakeIdentity([], { status: 500 });
    const unavailable = {
      status: 502,
      body: { message: 'Identity API is unavailable', code: 'IDENTITY_UNAVAILABLE' },
    };

    expect(await list(acme.user.address!)).toEqual(unavailable);
    expect(await disable(acme.user.address!, newWallet().address)).toEqual(unavailable);
  });

  it('marks a key disabled, and saving it again re-activates it', async () => {
    const { acme, member, memberWallet } = await setup();
    await put(acme.user.address!, memberWallet, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });

    const disabled = await disable(acme.user.address!, memberWallet);
    expect(disabled.status).toBe(200);
    expect(disabled.body.signer.disabledBy).toBe(acme.user.id);
    expect(Date.parse(disabled.body.signer.disabledAt)).not.toBeNaN();

    const saved = await put(acme.user.address!, memberWallet, {
      kind: 'MEMBER',
      holders: [{ userId: member.id }],
    });
    expect(saved.body.signer).toMatchObject({ disabledAt: null, disabledBy: null });

    expect(await disable(acme.user.address!, newWallet().address)).toEqual({
      status: 404,
      body: { message: 'Key not found', code: 'NOT_FOUND' },
    });
  });

  it('lists a removed member while their member key is enabled, and drops them once it is disabled', async () => {
    const { acme, member, memberWallet, membership } = await setup();
    await put(acme.user.address!, memberWallet, {
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

    await disable(acme.user.address!, memberWallet);
    expect(await members()).toEqual([[acme.user.email, 'ACCEPTED']]);
  });
});
```

The `MEMBER` key in the last test is saved while Mia is still a member, because the holder check requires current membership. She is removed afterwards.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npm test -- test/api/license-signers.test.ts`
Expected: FAIL, `Failed to resolve import "@/app/api/my/licenses/[tokenId]/signers/[address]/disabled/route"`.

- [ ] **Step 3: Write `src/services/licenseSigner.service.ts`**

```ts
import { col, fn, where as sqlWhere } from 'sequelize';
import type { IncludeOptions } from 'sequelize';
import { getAddress, isAddress } from 'viem';

import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
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

  const existing = await LicenseSigner.findOne({
    where: { license_token_id: tokenId, signer_address: signerAddress },
  });
  // A member key stays a member key, and an API or external key never becomes one
  // (contract C7).
  if (existing && (existing.kind === SignerKinds.MEMBER) !== (input.kind === 'MEMBER')) {
    throw new ApiError(
      409,
      'KIND_CONFLICT',
      existing.kind === SignerKinds.MEMBER
        ? 'A member key cannot become an API key or external key'
        : 'An API key or external key cannot become a member key',
    );
  }

  if (input.kind === 'MEMBER') {
    // A member key is the member's own verified wallet (C6), so the console can
    // tell their developer JWT apart from anyone else's.
    const holder = await User.findOne({ where: { id: input.holders[0].user_id! } });
    if (holder?.signer_address?.toLowerCase() !== signerAddress) {
      throw new ApiError(
        400,
        'SIGNER_MISMATCH',
        "A member key must be the member's verified wallet",
      );
    }
  } else if (!existing) {
    // A user's verified wallet signs for them alone (C6); it can't also be
    // recorded as a shared key.
    const walletOwner = await User.findOne({
      where: sqlWhere(fn('lower', col('signer_address')), signerAddress),
    });
    if (walletOwner) {
      throw new ApiError(
        409,
        'SIGNER_IN_USE',
        "This wallet is a user's verified wallet and cannot be recorded as a shared key",
      );
    }
  }
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
    const ctx = await resolveTeamContext(request, { consoleOnly: true });
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
Expected: `11 passed`.

Run: `npm test -- test/api/license-signers.test.ts -t "marks a key disabled"`
Expected: `1 passed`. Run alone, that test makes the file's first token check while `fakeIdentity` stubs `fetch`, so it proves the JWKS fetch passes through the fake.

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

- Consumes (Tasks 3, 4 and 11): `requireUser`, `findMembership`, `findPersonalTeam`, `notDeleted`, `getLicense` (#80), `LicenseSigner`, `LicenseSignerHolder`, `SignerKinds`, the `LicenseAccess` type, `errorResponse`.
- Produces: `getLicenseAccess(user: User, rawClientId: string | null): Promise<LicenseAccess>`, the response body `{ access, memberOfTeam, teamId, signerAddress, userEmail }`:
  - **`OWNER`:** the caller's wallet owns the license. `memberOfTeam` is `true`, and `teamId` is their personal team (or `null`).
  - **`MEMBER`:** the caller is an accepted member of a team created by the user whose wallet owns the license, **and** holds an enabled `MEMBER` key on that license (by token ID) whose address equals their current `signer_address`. `teamId` is that team.
  - **`NONE`** otherwise:
    - a member without such a key gets `memberOfTeam: true`, with that team's `teamId` and their `signerAddress`, so the console can say "ask for access";
    - everyone else, including callers of an unknown license, gets `memberOfTeam: false`, `teamId: null` and `signerAddress: null`.
  - **`signerAddress`** is the caller's verified signer, checksummed, or `null`.
  - **`userEmail`** is always the caller's `users.email`, for the proxy's audit line.
  - **`X-Team-Id`** is ignored, so a stale header still gets 200.
- Errors: 400 `INVALID_CLIENT_ID`, 502 `IDENTITY_UNAVAILABLE`, and 401 `UNAUTHORIZED` (including another `aud`, because the route passes `consoleOnly: true`).

- [ ] **Step 1: Write the failing tests**

`test/api/license-access.test.ts`:

```ts
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import { GET as accessRoute } from '@/app/api/my/license-access/route';
import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { InvitationStatuses } from '@/models/teamCollaborator.model';
import { addMember, createOwner, createUser, newWallet } from '../support/fixtures';
import { read, request } from '../support/http';
import { fakeIdentity } from '../support/identity';

const CLIENT_ID = '0xAbCdEf000000000000000000000000000000AbCd';

const setup = async () => {
  const acme = await createOwner('Acme');
  const member = await createUser();
  const wallet = newWallet().address;
  await member.update({ signer_address: wallet.toLowerCase() });
  const membership = await addMember(acme.team.id!, member);
  const outsider = await createOwner('Other');
  // Identity reports the owner in lower case; console-api stores the wallet checksummed.
  fakeIdentity([
    { tokenId: 7, owner: acme.user.address!.toLowerCase(), clientId: CLIENT_ID },
    {
      tokenId: 8,
      owner: acme.user.address!.toLowerCase(),
      clientId: '0x' + '8'.repeat(40),
    },
  ]);
  const grant = async (tokenId = 7, address = wallet) => {
    const key = await LicenseSigner.create({
      team_id: acme.team.id!,
      license_token_id: tokenId,
      signer_address: address.toLowerCase(),
      kind: SignerKinds.MEMBER,
    });
    await LicenseSignerHolder.create({ signer_id: key.id!, user_id: member.id });
    return key;
  };
  return { acme, member, wallet, membership, outsider, grant };
};

const access = async (
  as: string,
  clientId: string | null,
  options: { teamId?: string; aud?: string[] } = {},
) =>
  read(
    await accessRoute(
      await request(
        'GET',
        clientId === null
          ? '/api/my/license-access'
          : `/api/my/license-access?clientId=${clientId}`,
        { as, ...options },
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
        memberOfTeam: true,
        teamId: acme.team.id,
        signerAddress: null,
        userEmail: acme.user.email,
      },
    });
  });

  it('answers MEMBER for a member holding an enabled member key on this license under their wallet', async () => {
    const { acme, member, wallet, grant } = await setup();
    await grant();

    expect(await access(member.address!, CLIENT_ID)).toEqual({
      status: 200,
      body: {
        access: 'MEMBER',
        memberOfTeam: true,
        teamId: acme.team.id,
        signerAddress: getAddress(wallet),
        userEmail: member.email,
      },
    });
  });

  it('answers NONE with memberOfTeam for a member without a usable key', async () => {
    const { acme, member, wallet, grant } = await setup();
    const noAccess = {
      status: 200,
      body: {
        access: 'NONE',
        memberOfTeam: true,
        teamId: acme.team.id,
        signerAddress: getAddress(wallet),
        userEmail: member.email,
      },
    };

    // No key at all.
    expect(await access(member.address!, CLIENT_ID)).toEqual(noAccess);
    // A key on another license only.
    await grant(8);
    expect(await access(member.address!, CLIENT_ID)).toEqual(noAccess);
    // A key on this license, but not their current wallet.
    await grant(7, newWallet().address);
    expect(await access(member.address!, CLIENT_ID)).toEqual(noAccess);
    // The right key, disabled.
    const key = await grant(7);
    await key.update({ disabled_at: new Date() });
    expect(await access(member.address!, CLIENT_ID)).toEqual(noAccess);
  });

  it('answers NONE for outsiders, removed members and unknown licenses', async () => {
    const { acme, member, membership, outsider, grant } = await setup();
    await grant();
    const none = (userEmail: string) => ({
      status: 200,
      body: {
        access: 'NONE',
        memberOfTeam: false,
        teamId: null,
        signerAddress: null,
        userEmail,
      },
    });

    expect(
      await access(outsider.user.address!, CLIENT_ID, { teamId: acme.team.id! }),
    ).toEqual(none(outsider.user.email));
    expect(await access(member.address!, `0x${'9'.repeat(40)}`)).toEqual(
      none(member.email),
    );
    await membership.update({ status: InvitationStatuses.REVOKED, deleted: true });
    expect(await access(member.address!, CLIENT_ID)).toEqual(none(member.email));
  });

  it('ignores a stale X-Team-Id and still answers 200', async () => {
    const { acme, member, membership } = await setup();
    await membership.update({ status: InvitationStatuses.LEFT, deleted: true });

    const asOwner = await access(acme.user.address!, CLIENT_ID, {
      teamId: 'no-such-team',
    });
    const asFormer = await access(member.address!, CLIENT_ID, { teamId: acme.team.id! });

    expect(asOwner.status).toBe(200);
    expect(asOwner.body.access).toBe('OWNER');
    expect(asFormer).toMatchObject({
      status: 200,
      body: { access: 'NONE', memberOfTeam: false },
    });
  });

  it('refuses a missing or malformed client id, another app, and reports Identity outages', async () => {
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
    expect(
      (await access(acme.user.address!, CLIENT_ID, { aud: ['some-other-app'] })).status,
    ).toBe(401);

    fakeIdentity([], { status: 500 });
    expect(await access(acme.user.address!, `0x${'7'.repeat(40)}`)).toEqual({
      status: 502,
      body: { message: 'Identity API is unavailable', code: 'IDENTITY_UNAVAILABLE' },
    });
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

import { LicenseSigner, SignerKinds } from '@/models/licenseSigner.model';
import { LicenseSignerHolder } from '@/models/licenseSignerHolder.model';
import { Team } from '@/models/team.model';
import { User } from '@/models/user.model';
import { getLicense } from '@/services/identity.service';
import {
  findMembership,
  findPersonalTeam,
  notDeleted,
} from '@/services/membership.service';
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
  const signerAddress = user.signer_address
    ? (getAddress(user.signer_address) as `0x${string}`)
    : null;
  const none: LicenseAccess = {
    access: 'NONE',
    memberOfTeam: false,
    teamId: null,
    signerAddress: null,
    userEmail,
  };

  const license = await getLicense(rawClientId);
  if (!license) return none;
  const owner = license.owner.toLowerCase();

  if (user.address?.toLowerCase() === owner) {
    const personal = await findPersonalTeam(user.id!);
    return {
      access: 'OWNER',
      memberOfTeam: true,
      teamId: personal?.id ?? null,
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
      deleted: notDeleted,
    },
  });
  let memberTeam: Team | null = null;
  for (const team of teams) {
    if (await findMembership(team.id!, user.id!)) {
      memberTeam = team;
      break;
    }
  }
  if (!memberTeam) return none;

  // A member uses the license only through an enabled member key on it that is
  // their current wallet (contract C7). Anything less is "ask for access".
  const key = user.signer_address
    ? await LicenseSigner.findOne({
        where: {
          team_id: memberTeam.id!,
          license_token_id: license.tokenId,
          kind: SignerKinds.MEMBER,
          disabled_at: null,
          signer_address: user.signer_address.toLowerCase(),
        },
        include: [
          {
            model: LicenseSignerHolder,
            as: 'holders',
            where: { user_id: user.id! },
            required: true,
          },
        ],
      })
    : null;

  return {
    access: key ? 'MEMBER' : 'NONE',
    memberOfTeam: true,
    teamId: memberTeam.id!,
    signerAddress,
    userEmail,
  };
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
    const user = await requireUser(request, { consoleOnly: true });
    const clientId = request.nextUrl.searchParams.get('clientId');
    return Response.json(await getLicenseAccess(user, clientId));
  } catch (error: unknown) {
    return errorResponse(error, '[License access] Resolve');
  }
};
```

- [ ] **Step 5: Run the tests**

Run: `npm test -- test/api/license-access.test.ts`
Expected: `6 passed`.

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

- [ ] **Step 1: Document the tests, team scoping and migrations in `CLAUDE.md`**

Under `## Key Commands`, add to the bash block:

```bash
npm test             # vitest; needs Postgres on 127.0.0.1:55432 (or TEST_PG_URL)
npm run typecheck    # tsc --noEmit
```

Append to `## Patterns & Conventions`:

```markdown
- **Teams**:
  - Every `/api/my/*` route starts with `resolveTeamContext(request)` (`src/services/teamContext.service.ts`). It reads the optional `X-Team-Id` header; without it, the caller's own team (`teams.created_by`) is active.
  - The owner is the team's creator, never whatever `team_collaborators.role` says.
  - Writes call `requireOwner(ctx)`; members get no secrets.
  - Console-only routes (team, invite, signer, registry, license access) pass `{ consoleOnly: true }`, which requires `aud` to include `developer-platform`.
  - Errors are `ApiError(status, code, message)`, and routes answer `{ message, code }`.
  - The contract with the console is `docs/superpowers/plans/2026-10-02-console-teams.md` in the console repo.
- **Identity**: only through `src/services/identity.service.ts`. A GraphQL error other than `NOT_FOUND` is an outage (502), never "no such license".
- **Tests**: `test/` holds vitest suites that call route handlers directly against a disposable Postgres rebuilt from `src/scripts/db/init-db_*.sql`. `test/support` provides a local JWKS that mints tokens and a fake Identity. Mailer and Twenty are mocked. Tests run with `TZ=UTC`.
- **Migrations**:
  - There is no migration runner. Add `src/scripts/db/init-db_NN.sql`, safe to run twice, and `init-db_NN.down.sql`.
  - Run both by hand with `psql`: on preview, then production, **before** the code that reads them deploys.
  - Vercel builds a preview deployment on every push, against the preview database. Migrate preview before pushing a branch whose code reads new columns.
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
- the build exits 0, and its route table lists:
  - `/api/my/teams`, `/api/my/team/members`, `/api/my/team/members/[id]` and `/api/my/team/leave`;
  - `/api/my/team/invitations`, `/api/my/team/invitations/[id]` and `/api/my/team/invitations/[id]/resend`;
  - `/api/invitations/preview` and `/api/invitations/accept`;
  - `/api/me/signer`;
  - `/api/my/licenses/[tokenId]/signers`, `/api/my/licenses/[tokenId]/signers/[address]` and `/api/my/licenses/[tokenId]/signers/[address]/disabled`;
  - `/api/my/license-access`.

- [ ] **Step 4: Check that every `/api/my` route resolves the caller**

Run: `grep -rL "resolveTeamContext\|requireUser" src/app/api/my --include=route.ts`
Expected: no output. Support email uses `requireUser`; everything else uses `resolveTeamContext`.

- [ ] **Step 5: Compare production's schema with the one the code expects**

console-api has no migration runner, and production has been changed by hand before (`configurations.client_id` is wider than `init-db_08` creates it). Diff the schemas before running anything. Use a read-only connection string for production.

```bash
# The schema the code expects: the test database, as the last `npm test` built it.
export TEST_PG_URL="${TEST_PG_URL:-postgres://admin@127.0.0.1:55432/console_api_test}"
npm test -- test/api/harness.test.ts
pg_dump --schema-only --no-owner --no-privileges "$TEST_PG_URL" > "$TMPDIR/harness-schema.sql"
pg_dump --schema-only --no-owner --no-privileges "$PROD_PG_URL_READONLY" > "$TMPDIR/prod-schema.sql"
diff -u "$TMPDIR/prod-schema.sql" "$TMPDIR/harness-schema.sql" > "$TMPDIR/schema.diff"; echo "exit $?"
```

Expected: `exit 1`, a non-empty diff. Read it.

- **Acceptable differences:** objects `init-db_12.sql` adds (the harness already has them), and columns production widened by hand.
- **Stop and fix `init-db_12.sql` first** if production has anything the migration doesn't expect:
  - a missing table or column it alters;
  - a different type on a column it indexes;
  - existing indexes or constraints with the same names.

Attach `schema.diff` to the PR.

- [ ] **Step 6: Commit the docs and open the PR**

```bash
npx prettier --write CLAUDE.md README.md
git add CLAUDE.md README.md
git commit -m "docs: document team scoping, the test harness and how migrations run"
git push -u origin feat/teams
gh pr create --base master --head feat/teams \
  --title "feat(teams): team membership, invitations, signer proof and the license key registry" \
  --body-file - <<'EOF'
Part 2 of console teams. Spec: `docs/superpowers/specs/2026-10-01-console-teams-design.md`. Contracts: `docs/superpowers/plans/2026-10-02-console-teams.md` (both in dimo-developer-console).

## What changes
- **Team context:**
  - Every `/api/my/*` route answers for the active team: `X-Team-Id`, or the caller's own team without it.
  - The owner is the team's creator (`teams.created_by`). Members read, and only the owner writes (`403 OWNER_ONLY`). Non-members get `403 NOT_A_MEMBER`.
  - No context ever has an empty company, so no list can fall back to every company.
  - Members never see connection private keys or app signer API keys.
- **Teams and members:**
  - `GET /api/my/teams` and `GET /api/my/team/members`, the latter with `memberKeys` and C7's ordering.
  - `DELETE /api/my/team/members/:id` (status `REVOKED`) and `POST /api/my/team/leave` (status `LEFT`).
- **Invitations:**
  - Create, resend and cancel under `/api/my/team/invitations`, plus `POST /api/invitations/preview` and `POST /api/invitations/accept`.
  - Tokens are random, stored only as SHA-256, expire after 7 days and are bound to the invited email. Acceptance always makes a member.
  - C7's limits answer 429 `RATE_LIMITED`. Names in the email are escaped and capped.
- **Signer proof:** `PUT /api/me/signer` verifies the C6 message. One wallet per account (`409 SIGNER_IN_USE`), and no switching while holding member keys (`409 SIGNER_LOCKED`).
- **Key registry:** `GET`, `PUT` and `POST …/disabled` under `/api/my/licenses/:tokenId/signers`, with `SIGNER_MISMATCH`, `KIND_CONFLICT` (no kind change to or from `MEMBER`) and `SIGNER_IN_USE` (no new shared key at a user's verified wallet).
- **License access:** `GET /api/my/license-access?clientId=` answers `OWNER`, `MEMBER` or `NONE`, with `memberOfTeam` and the caller's email.
- **Console-only routes** (team, invite, signer, registry, license access) require `aud` to include `developer-platform`.
- **`/api/me`:** a legacy collaborator with no team of their own gets their oldest team, still reported as `COLLABORATOR` until part 3 ships. An unknown wallet gets `401 UNAUTHORIZED`.
- **Identity:** a lookup by token ID, through the same request as #80's `getLicense`, so a GraphQL error that isn't `NOT_FOUND` is a 502 there too.
- **Migration:** `init-db_12.sql` and `init-db_12.down.sql`.
  - It demotes non-creator `OWNER` rows, turns collaborators into members and folds duplicates (keeping the creator's row).
  - It adds the invite columns and the `team_invite_sends` log, the user signer (unique, case-insensitive) and the registry tables, all timestamps `TIMESTAMPTZ`.
  - It widens `configurations.client_id` only where it's shorter than 42.
- **Tests and CI:** vitest against a disposable Postgres, with a local JWKS, a fake Identity and GitHub Actions. Also #80 regressions.

## Fixed along the way
- Redirect URIs and signers could be attached to another company's app, and deleting one matched it against `app_id`.
- `PUT /api/my/apps/:id` passed the body through, `company_id` included.
- Legacy `invitation_code` acceptance now always makes a member.
- `POST /api/my/support/email` answers 401 for an unknown user.

## Builds on #80
- The scoped user routes, and sign-up's any-case wallet check.
- Configurations limited to the license owner; members of the owning team can now read them.
- Collaborator removal scoped to the team, with #80's messages kept. Removed rows still grant nothing.
- The empty-company and empty-team guards, and `transformObject` keeping every filter key (now tested).
- `identity.service.ts`, with #80's `NOT_FOUND` rule, now shared with a token ID lookup.
- The legacy invite rules and the workspace license check, now checked against the team owner. C7's invite limits are counted and recorded under advisory locks, as #80's limit is.

## Compatibility
- Today's console keeps working: the header is optional, and the retired team routes are thin adapters scoped to the caller's team. They're deleted by this plan's final task, after part 3 ships.
- Until part 3 ships (contract C7):
  - `GET /api/me` still reports a member's role as `COLLABORATOR`;
  - the old invite route still emails the `sign-in?code=` link, accepted through `invitation_code` for the invited email only, now with C7's limits and a 7-day expiry.
- The final task switches the role to `MEMBER` and removes the old link. Part 3 ships within 7 days of this deploy.

## Release checklist
Migrations are run by hand; console-api has no migration runner.
1. Confirm #80 is merged and deployed.
2. Diff production's schema against the harness's (`schema.diff` attached; see the plan's Task 14, step 5). Resolve anything unexpected first.
3. **Preview:**
   - Back up the preview database, then run `psql "$PREVIEW_PG_URL" -v ON_ERROR_STOP=1 --single-transaction -f src/scripts/db/init-db_12.sql`.
   - Vercel builds this branch's preview against the preview database. Until this step runs, preview deployments fail on the new columns; that's expected and harmless.
4. **Production:**
   - Back up the database, then run the same command against production **before** merging. The User model reads the new columns, so the code can't deploy first.
5. Check `SELECT role, count(*) FROM team_collaborators GROUP BY role;`: only `OWNER` and `MEMBER` remain.
6. Check `SELECT count(*) FROM team_collaborators tc JOIN teams t ON t.id = tc.team_id WHERE tc.role = 'OWNER' AND tc.user_id <> t.created_by;`: the answer is 0.
7. Check `\d license_signers`, `\d license_signer_holders` and `\d team_invite_sends`: all three tables exist. Check `\d configurations`: `client_id` is at least 42 characters wide.
8. Merge. Vercel deploys console-api.
9. Run `init-db_12.sql` once more on production. It's idempotent. Any `COLLABORATOR` rows the old code wrote between steps 4 and 8 become `MEMBER`.
10. Smoke test: with a console session, `GET /api/my/teams` returns the personal team, and `GET /api/my/team/members` lists the owner.
11. Ship console part 3 within 7 days (contract C7, "Until part 3 ships").

**Rollback:**
- Rolling back the code alone is safe. The old code reads none of the new columns or tables, and `MEMBER` rows behave as collaborators there.
- `init-db_12.down.sql` is only for removing the schema afterwards. Run it after the code rollback, never before, because the new code reads those columns.

## Verification
lint, typecheck, `npm test` and `next build` pass locally and in CI.
EOF
```

Expected: `gh` prints the PR URL.

---

### Task 15: Retire the legacy team routes (after part 3 has shipped)

C7 retires these routes once the console no longer calls them:

- `GET /api/my/team`
- `GET /api/my/team/collaborator`
- `DELETE /api/my/team/collaborator/:id`
- `POST /api/my/team/invitation`
- the `invitation_code` query on `GET /api/me`

It also ends C7's "Until part 3 ships" rules: `/api/me` reports a member's role as `MEMBER`, and the legacy `sign-in?code=` invite link goes away with the route that sent it.

This is a separate PR from Task 14's, made only after console part 3 is in production.

**Files:**

- Delete: `src/app/api/my/team/route.ts`, `src/app/api/my/team/collaborator/route.ts`, `src/app/api/my/team/collaborator/[id]/route.ts`, `src/app/api/my/team/invitation/route.ts`
- Delete: `src/controllers/teamCollaborator.controller.ts`
- Delete: `test/api/retired-team-routes.test.ts`
- Modify: `src/app/api/me/route.ts` (drop `invitation_code`)
- Modify: `src/controllers/user.controller.ts` (`getCompanyAndTeam` reports `MEMBER`)
- Modify: `src/services/invitation.service.ts` (drop `createInvitation`'s `legacyLink` option)
- Modify: `test/services/team-context.test.ts` (the legacy collaborator's role is `MEMBER`)
- Modify: `test/api/invitations.test.ts` (drop the `legacyLink` test)
- Modify: `test/api/regressions-80.test.ts` (drop the describes for routes that no longer exist; pin their absence)

**Interfaces:**

- Removes: `acceptTeamInvitation`, `listLegacyCollaborators` and `removeMyCollaboratorById` (Task 9), and `createInvitation`'s `legacyLink` option (Task 8).
- Nothing else in console-api imports them. Step 3 checks.
- Changes: `GET /api/me` answers `role: 'MEMBER'` for a member (was `COLLABORATOR`, Task 4).

- [ ] **Step 1: Confirm nothing still calls the routes**

```bash
grep -rnE "/api/my/team/collaborator|/api/my/team/invitation['\`/]|invitation_code|'/api/my/team'" ~/workspace/dimo-developer-console/src
```

Expected: no output.

Then, in the Vercel request logs for console-api production, filter on each retired path for the last 7 days.
Expected: no requests after part 3's production deploy. If there are some, find the caller first and don't delete yet.

Then count the pending invites that only the legacy link can accept:

```bash
psql "$PROD_PG_URL" -c "SELECT count(*) FROM team_collaborators WHERE status = 'PENDING' AND invite_token_hash IS NULL AND deleted IS NOT TRUE AND (invite_expires_at IS NULL OR invite_expires_at > now());"
```

Expected: 0. Invites from the legacy route expire 7 days after they're sent, and that route stopped being called when part 3 shipped. Any left are older invites without an expiry. After this PR they can't be accepted; their owners resend them from the console's Team page, which issues a token link.

- [ ] **Step 2: Branch and write the failing test**

```bash
cd ~/workspace/dimo-developer-console-api
git fetch origin && git switch -c chore/retire-legacy-team-routes origin/master
```

In `test/services/team-context.test.ts`, in `'keeps a legacy collaborator working: their oldest team, reported as COLLABORATOR'`:

- rename it `'keeps a legacy collaborator working: their oldest team, as a member'`;
- delete the `// Until part 3 ships …` comment;
- replace `expect(response.body.role).toBe('COLLABORATOR');` with `expect(response.body.role).toBe('MEMBER');`.

In `test/api/invitations.test.ts`, delete the test `'with legacyLink, emails the legacy sign-in?code= link and stores no token'`, and `createInvitation` and `resolveTeamContext` from its imports if nothing else there uses them.

In `test/api/regressions-80.test.ts`:

- Delete the whole `describe('PR #80 regressions: legacy invites', …)` block. Its rules live on in Task 8's tests: owner-only invites, C7's limits and their locks, the escaped names and email-bound acceptance.
- Keep the `describe('PR #80 regressions: workspaces', …)` block as it is, and the main `describe('PR #80 regressions', …)` block, including the any-case wallet and removed-collaborator `/api/me` tests.
- Delete the `describe("PR #80 regressions: collaborator lists and removal stay inside the owner's team", …)` block. Task 7's member list and removal tests cover the team API that replaces those routes.
- Delete the imports these leave unused: `legacyInvite`, `deleteCollaborator`, `listCollaborators`, `Mailer`, `TeamInviteSend` (added by Task 9), and `vi` from the `vitest` import. `getMe`, `sql`, `createOwner`, `createUser`, `insertLegacyUser` and `userByEmail` stay; the remaining tests use them.
- Add:

```ts
describe('retired team routes', () => {
  it('are gone', () => {
    for (const route of [
      'src/app/api/my/team/route.ts',
      'src/app/api/my/team/collaborator/route.ts',
      'src/app/api/my/team/collaborator/[id]/route.ts',
      'src/app/api/my/team/invitation/route.ts',
      'src/controllers/teamCollaborator.controller.ts',
    ]) {
      expect(existsSync(route), route).toBe(false);
    }
  });

  it('ignores invitation_code on GET /api/me', async () => {
    const acme = await createOwner('Acme');
    const pat = await createUser({ email: 'pat@x.test' });
    const [row] = await sql<{ id: string }>(
      `INSERT INTO team_collaborators (id, team_id, email, role, status, created_at, updated_at, deleted)
       VALUES (gen_random_uuid()::text, :team, 'pat@x.test', 'MEMBER', 'PENDING', now(), now(), false)
       RETURNING id`,
      { team: acme.team.id },
    );
    const code = Buffer.from(row.id).toString('base64');

    await getMe(
      await request('GET', `/api/me?invitation_code=${code}`, { as: pat.address! }),
    );

    const [after] = await sql<{ status: string }>(
      'SELECT status FROM team_collaborators WHERE id = :id',
      { id: row.id },
    );
    expect(after.status).toBe('PENDING');
  });
});
```

Run: `npm test -- test/api/regressions-80.test.ts test/services/team-context.test.ts`
Expected: FAIL.

- The route files still exist.
- `invitation_code` still accepts the invite.
- `/api/me` still reports the legacy collaborator as `COLLABORATOR`.

- [ ] **Step 3: Delete the routes and the adapters**

```bash
git rm src/app/api/my/team/route.ts src/app/api/my/team/collaborator/route.ts "src/app/api/my/team/collaborator/[id]/route.ts" src/app/api/my/team/invitation/route.ts src/controllers/teamCollaborator.controller.ts test/api/retired-team-routes.test.ts
grep -rnE "acceptTeamInvitation|listLegacyCollaborators|removeMyCollaboratorById|teamCollaborator.controller" src test
```

Expected: the only matches are in `src/app/api/me/route.ts`.

In `src/app/api/me/route.ts`:

- delete the `acceptTeamInvitation` import;
- delete the `invitationCode` line;
- delete the `await acceptTeamInvitation(...)` statement.

`GET` then reads the token, finds the user (401 if none) and returns `getCompanyAndTeam(user)`.

In `src/controllers/user.controller.ts`, in `getCompanyAndTeam`, replace the role line and its comment with:

```ts
    role: team ? (team.created_by === userId ? 'OWNER' : 'MEMBER') : undefined,
```

In `src/services/invitation.service.ts`:

- delete the `legacyLink` doc comment above `createInvitation` and its third parameter, so the signature is `createInvitation(ctx: TeamContext, rawEmail: unknown)`;
- replace `const { token, fields: tokenFields } = freshInvite();` and the `const fields = legacyLink ? …` line after it with `const { token, fields } = freshInvite();`;
- replace the `const link = legacyLink ? … : inviteLink(token);` statement and the `mailInvite` call after it with `await mailInvite(ctx, email, inviteLink(token));`.

Run: `grep -rn "legacyLink\|sign-in?code" src test`
Expected: no output.

- [ ] **Step 4: Run everything**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass, including the three Step 2 tests. Typecheck exits 0, and lint has no errors.

Run: `PG_URL=postgres://u:p@127.0.0.1:1/x npm run build`
Expected: exit 0. The route table no longer lists `/api/my/team`, `/api/my/team/collaborator`, `/api/my/team/collaborator/[id]` or `/api/my/team/invitation`.

- [ ] **Step 5: Commit and open the PR**

```bash
npx prettier --write src/app/api/me/route.ts src/controllers/user.controller.ts src/services/invitation.service.ts test
git add -A src test
git commit -m "chore(teams): retire the legacy team routes now that the console uses the team API"
git push -u origin chore/retire-legacy-team-routes
gh pr create --base master --head chore/retire-legacy-team-routes \
  --title "chore(teams): retire the legacy team routes" \
  --body "Removes GET /api/my/team, GET /api/my/team/collaborator, DELETE /api/my/team/collaborator/:id, POST /api/my/team/invitation, its legacy sign-in?code= invite link and the invitation_code query on GET /api/me (contract C7). GET /api/me now reports a member's role as MEMBER instead of COLLABORATOR. Console part 3 no longer calls the removed routes; Vercel logs show no requests to them in the 7 days since it shipped. No schema change."
```

Expected: `gh` prints the PR URL.

---

## Self-review

**Spec and contract coverage (part 2):**

| Requirement (spec / index)                                                                                                                                                                                                                                                     | Task                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Data model: membership role/status (`LEFT`), invite token hash, expiry, invited_by; uniqueness; users signer (unique `lower()`); `license_signers`; `license_signer_holders`; `team_invite_sends`; TIMESTAMPTZ                                                                 | 3                    |
| Owner is `teams.created_by` only: migration demotes others; context, summaries and members derive it; acceptance and refreshes set `MEMBER`                                                                                                                                    | 3, 4, 7, 8, 9        |
| Team context on every `/api/my/*` route; header optional; never an empty company                                                                                                                                                                                               | 4, 5, 6, 9           |
| `transformObject` keeps every filter key (#80, pinned)                                                                                                                                                                                                                         | 2, 5                 |
| Owner-only writes on the listed paths; support email open (401 for unknown users)                                                                                                                                                                                              | 5, 6                 |
| Secrets owner-only (connection keys, signer API keys)                                                                                                                                                                                                                          | 5                    |
| Audience rule (`aud` includes `developer-platform`) on team, invite, signer, registry and license-access routes                                                                                                                                                                | 4, 7, 8, 10, 12, 13  |
| Teams list, members list with `memberKeys` and C7 ordering (owner listed even without a row), removal (`REVOKED`), leaving (`LEFT`)                                                                                                                                            | 7                    |
| Invitations, resend, cancel, preview, accept; limits and `429`, counted and recorded under per-team and per-sender advisory locks; escaping; concurrent duplicates                                                                                                             | 8                    |
| `PUT /api/me/signer` (C6) with `SIGNER_IN_USE` and `SIGNER_LOCKED`                                                                                                                                                                                                             | 10                   |
| Identity lookups; GraphQL errors other than `NOT_FOUND` are 502 (#80's rule, shared, not re-implemented); `tokenId` is `Int`                                                                                                                                                   | 2, 11                |
| Registry `GET`/`PUT`/`disabled` with ownership check, holder validation, `SIGNER_MISMATCH`, `KIND_CONFLICT` both ways, `SIGNER_IN_USE` for a new shared key at a verified wallet                                                                                               | 12                   |
| `GET /api/my/license-access` with `memberOfTeam`, `MEMBER` only through a matching enabled key                                                                                                                                                                                 | 13                   |
| `GET /api/me`: personal team, legacy-collaborator fallback, `401 UNAUTHORIZED`, ignores `X-Team-Id`                                                                                                                                                                            | 4                    |
| Retired routes kept working until part 3, then deleted; until then `/api/me` reports `COLLABORATOR` and the old invite emails `sign-in?code=` (C7, "Until part 3 ships")                                                                                                       | 4, 8, 9, 15          |
| Existing issues: redirect-uri/signer POST app check, deletes by row ID, `PUT /api/my/apps/:id` whitelist, legacy list trimmed fields                                                                                                                                           | 5, 9                 |
| #80 behaviors pinned with its exact messages (scoped user routes, takeover, any-case wallet, configurations, collaborator removal and lists, soft-deleted rows, legacy invite owner check, limit under a lock, role and escaping, `invitation_code` email check, workspace license and token check, Identity `NOT_FOUND` rule) and preserved or deliberately updated | 2, 3, 5, 6, 8, 9, 11 |
| Schema drift (`configurations.client_id`) handled in harness and migration                                                                                                                                                                                                     | 1, 3                 |
| Test harness: disposable Postgres, local JWKS with `aud`, fake Identity that passes the JWKS through, `TZ=UTC`, es2017 target; CI                                                                                                                                              | 1                    |
| Migration operations: down script, schema diff, manual runs, rollback safety, preview deploy timing                                                                                                                                                                            | 3, 14                |

**Placeholder scan:**

- Every code step carries complete code. There's no "TBD", no "similar to Task N", and no partial code block.
- Every #80 behavior the plan touches is quoted from commit `04250f2`: the workspace POST (Task 5), the list filters (Tasks 2 and 5), the template's escaping (Task 8), the legacy invite with its advisory lock, removal and acceptance (Tasks 2, 3 and 9), soft-deleted rows (Task 2), sign-up's any-case wallet check (Task 2), and the Identity service with its `NOT_FOUND` rule (Task 11). No step depends on code that hasn't been read, and none re-implements what #80 has.

**Type consistency:**

- `TeamContext` (Task 4) has a non-null `team` and `company`, and is used unchanged in Tasks 5–13.
- `toTeamMember(row, ownerUserId, memberKeys?)` and `toTeamSummary({ team, company, owner, callerId })` (Task 7) are reused in Task 8.
- `findPersonalTeam`, `findMembership`, `findDefaultTeam`, `notDeleted` and `activeMembershipWhere` (Task 4) are used in Tasks 7, 8, 9 and 13.
- #80's `getLicense` (returns `{ owner, tokenId }`) is used in Tasks 5 and 13, and `isLicenseOwner` in Task 6. `getLicenseByTokenId`, added next to them in Task 11, is used in Task 12. There's no second Identity client.
- `requireUser(request, { consoleOnly })` and `resolveTeamContext(request, { consoleOnly })` have the same option everywhere.
- Fixtures `createOwnerFor` (Task 1) and `addMember` (Task 3) are used throughout.
- Wire types in `src/types/teams.ts` (Task 3) match C7: `MembershipStatus` includes `LEFT`, `TeamMember.memberKeys`, `LicenseAccess.memberOfTeam`, `InvitationPreview`.
- No `for…of` over a `Set` or `Map`: `listMembers` uses `Array.from(keysByUser.keys())`. `tsconfig.json` targets es2017 regardless.

**Review Focus coverage:**

1. **Owner of one team and member of another; wrongly marked `OWNER` rows:**
   - Task 4: "uses the team the caller created", "never trusts an OWNER membership row", "shows the caller's own company even when they joined another team first";
   - Task 3: the demotion migration test;
   - Task 7: "marks a team OWNER only for its creator".
2. **Email case and spaces; concurrent duplicates and limits:** Task 8, "refuses bad emails…", "answers ALREADY_INVITED, not 500, when a concurrent invite wins the race" (it reaches the unique-index branch), "keeps the team limit when invites race", "keeps the sender's daily limit when invites to two of their teams race" and "makes the invitee a member". Task 2 pins #80's own lock with "keeps the limit when invitations race".
3. **Re-invite after removal or leaving:** Task 8, "lets someone who was removed, or who left, be invited and accept again".
4. **Token reuse:** Task 8, "refuses a different account, an expired link, garbage and a second use".
5. **Mixed-case addresses:**
   - Task 12: "treats checksummed and lowercase addresses as the same key";
   - Task 13: lowercase owner versus a checksummed stored wallet;
   - Task 10: "refuses another user's wallet, in any letter case";
   - Task 3: the unique index test.
