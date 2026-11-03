# Console wave 1 (hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the master plan's plain-code items in one PR pair: console-api stops leaking error text, retires the legacy app routes, reads and discards connections safely, keeps one connection name per team, lets the last brand go, purges brand caches on write and refuses to build ahead of its database (SEC-2, SEC-4, SEC-5, FLOW-1, ACC-7, BRAND-1, BRAND-3, REL-1); the console strips and reports upstream failures properly, stops sending a transaction when the Config tab opens, and fixes the connection, signer, redirect URI, configurator, brand and navigation rough edges (SEC-6, SES-2 to SES-5, SIG-1 to SIG-5, BRAND-1/2, UX-1 to UX-3, the console sides of SEC-5 and FLOW-1).

**Architecture:** API tasks come first and fix the wire contracts the console tasks consume; those contracts are copied verbatim into the console tasks' Interfaces. On console-api, every unexpected error becomes a logged 500 with a fixed body; the connection routes read each owner row on its own (an unreadable row is flagged, not fatal), answer 404 for deleted rows, let status move only forward, and discard only PENDING rows; `init-db_15` adds a partial unique index on `(company_id, lower(name))`; brand lookups carry a Vercel cache tag that every brand write deletes; a `schema_migrations` ledger written by each migration from 13 on is checked by a script that runs before `next build`. On the console, one module (`src/utils/upstreamErrors.ts`) strips request details and reports unexpected failures, Sentry fingerprints server-side AxiosErrors by upstream route and status, connection writes return `ApiResult` instead of throwing, the Signers card gets an explicit "Enable console access" button, and redirect URI changes are overlaid on Identity's list the way TeamSection overlays signer changes.

**Tech Stack:** Console: Next 16.4 App Router, React 19, TanStack Query 5, Apollo 4, axios, `@sentry/nextjs` 11, Jest 30 + Testing Library. API: Next 14.2 route handlers, Sequelize 6.37 + pg, vitest against real Postgres, `@vercel/functions` 3.10.6.

**Spec:** `/Users/zer0stars/workspace/dimo-developer-console/docs/superpowers/plans/2026-11-03-console-remaining-issues.md` (master plan, untracked in the main checkout): its Global Constraints, Review Focus and the sections SEC-2, SEC-4, SEC-5, SEC-6, SES-2, SES-3, SES-4, SES-5, SIG-1 to SIG-5, BRAND-1 to BRAND-3, UX-1 to UX-3, FLOW-1, ACC-7 and REL-1, plus the user's decisions in the wave-1 brief (remove the legacy app routes; `/api/brand` window `max-age=60, stale-while-revalidate=300` with a purge on every brand write; the approved SIG-1/SIG-2 design: the console handles developer JWTs by default).

**Worktrees:** console `/Users/zer0stars/workspace/dimo-developer-console/.worktrees/wave1`, API `/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave1`, branch `fix/wave1-hardening` in both.

## Global Constraints

- API ships before the console whenever both change; `init-db_15` runs on prod before the API merge (user-run).
- No production DB write, Vercel setting change or redeploy without the user's go-ahead; prod credentials are never printed or passed to subagents. Read-only prod sessions set `default_transaction_read_only=on`.
- No on-chain or paid action without explicit approval. Every test mocks chain, Turnkey and Identity calls.
- Writes stay server actions in the console; any new console read follows the GET route + TanStack Query pattern from the last wave (`src/utils/routeResponses.ts`, `src/utils/fetchApiResult.ts`, `src/utils/fetchJson.ts`).
- Route bodies never carry upstream error text, tokens or SQL.
- Commits carry no Co-Authored-By trailer or Claude/AI attribution.
- Console verification is `npm test`, `npx tsc --noEmit -p tsconfig.json`, `npm run lint` (never `npm run compile` as a type check).
- API verification is `npx vitest run` (Homebrew `postgresql@16` on 127.0.0.1:55432, running), `npm run typecheck`, `ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json <files>` (plain `npm run lint` fails in nested worktrees) and `npx prettier --check <files>`. Never `npm run lint:format` (it has `--write`).
- console-api has no migration runner: a migration is a hand-run `src/scripts/db/init-db_N.sql` plus `init-db_N.down.sql`, tested in `test/db/migration-N.test.ts`. docker-compose mounts that folder as `docker-entrypoint-initdb.d`, which runs every `.sql` there alphabetically on a fresh database (each `.down.sql` before its migration), so a down file must run on a database that never had its migration, and nothing else may be added to that folder.

## Review Focus

1. **A connection list mixing plaintext rows, `enc:v1` rows and one unreadable row (master Review Focus 3).** The owner's list loads with 200, the bad row flagged `keys_unreadable: true` and the others decrypted; the console shows the bad row as unreadable instead of failing the page (Tasks 3 and 11).
2. **A team member opening a license's Config tab (master Review Focus 4).** No "Enable console access" button, no Turnkey key lookup, no transaction; a note that the owner hasn't turned console access on (Task 12).
3. **Discarding a PENDING connection whose mint actually landed** (the browser died after the mint, before the row was updated). Discard must ask Identity and the chain first and refuse when the user's wallet holds the name, so the only copy of the keys isn't deleted (Task 11).
4. **Signing up with an account that already exists.** It must not look like a crash: "This account already exists — sign in instead" with a way to sign in, and no Sentry event (Task 10).
5. **A brand change on a license that gets one lookup a day (master Review Focus 5).** The purge must delete the cached entry, not mark it stale: `invalidateByTag` would serve the stale brand to that one lookup (Task 7).

## Decisions this plan makes (the spec left them open)

- **SEC-2 scope.** `grep -rnE "my/apps|redirect-uris|my/signers|workspace/.*/apps" src` in the console finds callers only in `src/services/app.ts`, whose only importer is `src/actions/app.ts`, which nothing imports (`grep -rn "actions/app'" src __tests__` is empty). So nothing calls `/api/my/apps`, `/api/my/apps/:id`, `/api/my/apps/:id/redirect-uris`, `/api/my/apps/:id/signers`, `/api/my/redirect-uris/:id`, `/api/my/signers/:id` or `/api/my/workspace/:id/apps`; all seven go (Task 2), with the dead console modules (Task 8). The `apps`, `signers` and `redirect_uris` tables and models stay: the audit script and SEC-1 read them. After this, nothing in the API reads or writes `signers.api_key`, which shrinks SEC-1 to a data-only change.
- **ACC-7.** The console calls `/api/my/workspace` only with POST (`src/services/workspace.ts:31`) and reads workspaces through `/api/my/workspace/by-token/:tokenId`. `GET /api/my/workspace` is retired, not fixed (Task 2).
- **SEC-5 status transitions.** The console records `PENDING → MINTED → READY` (`src/app/connections/create/[owner]/components/View/View.tsx`, `recordMintAndComplete`), so "PENDING to READY only" is enforced as "forward only": PENDING → MINTED, PENDING → READY, MINTED → READY, and a write of the current status (a retry) are allowed; anything backwards answers 409. Owner-only is already enforced by `requireOwner` and gets a test.
- **FLOW-1 Discard is the existing `DELETE /api/my/connections/:id`, restricted to PENDING.** The console deletes a connection in two places only: after a refused first mint (the row is PENDING) and Discard. A MINTED or READY row holds the only copy of the private keys of a paid, on-chain connection license; deleting it loses them for good and frees nothing (the name stays taken on-chain). Such rows are removed only by hand, by the user, in SQL.
- **FLOW-1 index.** `connections.deleted` is a nullable BOOLEAN with default FALSE (`init-db_07.sql`), and the list reads `deleted IS NOT TRUE` (`Op.not: true`), so the index is partial on `deleted IS NOT TRUE`: a NULL counts as active, as it does on reads.
- **BRAND-3 mechanism.** Live headers (`curl -sI` on 2026-11-02): `cf-cache-status: DYNAMIC` (Cloudflare does not cache `/api/brand` and passes `Cache-Control` through, so no Cloudflare purge and no Cloudflare token are needed), and `x-vercel-cache: MISS` then `HIT` with `age: 3` on the 404's `public, max-age=60`: Vercel's CDN caches these responses. Responses carry the `Vercel-Cache-Tag` header (Vercel's documented equivalent of `addCacheTag`, and testable without a Vercel request context); writes call `dangerouslyDeleteByTag` (see Review Focus 5). `POST …/brand/upload` changes no brand row, so it doesn't purge; the save that stores the CID does.
- **REL-1 design.** The ledger starts at migration 13: 00–12 predate it and are known applied. Each tracked migration creates the ledger if missing and records itself in the same transaction. The check runs inside `npm run build` (a failed Vercel build is never promoted, so the live deployment stays), skips without `PG_URL`, and fails closed when the database can't be read; `SKIP_MIGRATION_CHECK=1` is the escape hatch for an emergency deploy.
- **SES-5 server half.** console-api already answers 409 for an existing wallet; Task 1 adds `code: 'ACCOUNT_EXISTS'`, and maps a duplicate email (a 500 today) to 409 `EMAIL_TAKEN`.
- **SIG-4.** The QA log says Identity had indexed the deletion before the spinner closed: the wait after the transaction was the registry stamp (a server action, queued) and the refetch. The confirm dialog shows the progress and closes when the transaction confirms; the rest runs in the background (Task 13).

---

## API (`/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave1`)

### Task 1: Unexpected errors answer 500 without their text (SEC-4; SES-5 server half)

**Files:**
- Modify: `src/utils/apiError.ts` (`legacyErrorResponse`)
- Modify: `src/app/api/brand/route.ts`, `src/app/api/my/workspace/[id]/brand/route.ts`, `src/app/api/my/workspace/[id]/brand/upload/route.ts`, `src/app/api/my/workspace/[id]/brands/route.ts`, `src/app/api/my/workspace/[id]/brands/[brandId]/route.ts`, `src/app/api/my/workspace/[id]/brands/[brandId]/default/route.ts`, `src/app/api/my/workspace/by-token/[tokenId]/route.ts` (each drops its local `failed` helper or inline `error.message` body)
- Modify: `src/app/api/me/route.ts` (GET catch), `src/app/api/my/support/email/route.ts`, `src/controllers/email.controller.ts` (input checks throw `ValidatorError`)
- Modify: `src/models/connection.model.ts` (`name` and `token_id` validation, so bad input stays a 400 once database errors become 500s)
- Modify: `src/app/api/user/route.ts` (codes)
- Create: `test/support/brands.ts` (move `licenseWorkspace`, `onWorkspace`, `onBrand`, `brandApi`, `byToken` and `ownedLicense` out of `test/api/brand-per-license.test.ts`, which then imports them; Tasks 6 and 7 use them too)
- Test: `test/utils/api-error.test.ts`, `test/api/error-responses.test.ts`; update `test/api/regressions-80.test.ts` only where a `toEqual` on a `/api/user` 409 body breaks

**Interfaces:**
- Produces: `legacyErrorResponse(error: unknown, step: string): Response`, in this order: `apiErrorResponse` (ApiError, IdentityUnavailableError) as today; `ValidatorError` → 400 `{ message: error.message }`; Sequelize `UniqueConstraintError` → 409 `{ message: 'This conflicts with an existing record', code: 'CONFLICT' }`; any other Sequelize `ValidationError` → 400 `{ message: 'Invalid input', code: 'INVALID_INPUT' }`; anything else → `errorResponse(error, step)` (logs `{ error, step }`, 500 `{ message: 'Something went wrong' }`). `UniqueConstraintError` extends `ValidationError`, so test it first.
- Produces: authenticated brand routes and by-token answer an unexpected error with `errorResponse(error, step)`; the public `GET /api/brand` answers 500 `{ error: 'internal' }` (its consumers read `error`) and logs `{ error, step: '[Brand] GET by clientId' }`; support email answers a `ValidatorError` 400 `{ success: false, message }` and anything else through `errorResponse`.
- Produces: `Connection` model validation `name: { len: [1, 255] }` (the column is VARCHAR(255)) and `token_id: { is: /^\d{1,78}$/ }` (a uint256 in decimal).
- Produces (wire, consumed by Task 10): `POST /api/user` → 409 `{ message: 'An account already exists for this wallet', code: 'ACCOUNT_EXISTS' }`; a `UniqueConstraintError` on `users_email_key` → 409 `{ message: 'An account already uses this email', code: 'EMAIL_TAKEN' }`; other failures 500 `{ message: 'Error creating user' }` as today.

- [ ] **Step 1: Write the failing tests**

`test/utils/api-error.test.ts` (a real database error: `const failure = await DB.connection!.query('SELECT secret_column FROM no_such_table').catch((e: unknown) => e)`):
- `answers a database error with a 500 that holds no SQL`: `legacyErrorResponse(failure, '[Test] step')` → status 500, body `{ message: 'Something went wrong' }`; `JSON.stringify(body)` contains neither `no_such_table` nor `SELECT`; a `console.error` spy was called with `expect.objectContaining({ step: '[Test] step' })`.
- `never answers an unknown error with its message`: `new Error('password=hunter2')` → 500, body has no `hunter2`.
- `keeps an ApiError's status, message and code`: `new ApiError(409, 'X_TAKEN', 'Taken')` → 409 `{ message: 'Taken', code: 'X_TAKEN' }`.
- `keeps a ValidatorError a 400 in its own words`: `new ValidatorError('Collaborator not found')` → 400 `{ message: 'Collaborator not found' }`.
- `answers a model validation error with a fixed 400`: the rejection of `Connection.build({ name: 'x', company_id: 'c', status: 'DONE' as never }).validate()` → 400 `{ message: 'Invalid input', code: 'INVALID_INPUT' }`.
- `answers an unmapped unique violation with 409 CONFLICT`: the rejection of a second `User.create` with an existing email → 409 `{ code: 'CONFLICT' }`, body has no `users_email_key`.

`test/api/error-responses.test.ts`:
- `GET /api/my/connections answers a database failure with 500 and no SQL`: `vi.spyOn(Connection, 'findAllPaginated').mockRejectedValue(failure)` → `{ status: 500, body: { message: 'Something went wrong' } }`.
- `GET /api/brand answers a database failure without its text`: `vi.spyOn(WorkspaceBrand, 'findOne').mockRejectedValue(failure)` → `{ status: 500, body: { error: 'internal' } }`.
- `a brand write answers an unexpected failure without its text`: `ownedLicense()` from `test/support/brands.ts`, `vi.spyOn(WorkspaceBrand, 'create').mockRejectedValue(failure)` → POST brands answers 500 `{ message: 'Something went wrong' }`.
- `GET /api/my/workspace/by-token/:tokenId answers an unexpected failure without its text`: `vi.spyOn(Workspace, 'findOne').mockRejectedValue(failure)` → 500, body has no `no_such_table`.
- `refuses a connection name over 255 characters with 400`: owner POST with `name: 'x'.repeat(256)` → 400, no row.
- `POST /api/user names an existing wallet ACCOUNT_EXISTS`: the same wallet twice → second answers `{ status: 409, body: { message: 'An account already exists for this wallet', code: 'ACCOUNT_EXISTS' } }`.
- `POST /api/user names a taken email EMAIL_TAKEN`: a user with `taken@x.test` exists; a new wallet signs up with it → 409 `{ code: 'EMAIL_TAKEN' }`, one row with that email.
- `support email refuses bad input with 400 and its reason`: member POST without `inquiryType` → 400 `{ success: false, message: 'Invalid inquiryType' }`.

The existing `refuses a token ID too long for a uint256` (`connection-keys.test.ts`) and the retired-team-route 400s (`regressions-80.test.ts`, `retired-team-routes.test.ts`) must still pass unchanged.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/utils/api-error.test.ts test/api/error-responses.test.ts`
Expected: FAIL: `legacyErrorResponse` answers 400 with the database's text; `/api/brand` answers `{ error: 'relation "no_such_table" does not exist' }`.

- [ ] **Step 3: Implement** per Interfaces. Where an existing test now gets a 500 for bad input, make the check explicit (model validation or an `ApiError`/`ValidatorError` 400); never widen the catch-all again.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/utils src/app/api src/controllers/email.controller.ts src/models/connection.model.ts test/utils test/api test/support/brands.ts && npx prettier --check src/utils src/app/api src/controllers/email.controller.ts src/models/connection.model.ts test/utils/api-error.test.ts test/api/error-responses.test.ts test/support/brands.ts test/api/brand-per-license.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "fix(errors): answer unexpected failures with a 500 that carries no error text"
```

### Task 2: Retire the legacy app routes and `GET /api/my/workspace` (SEC-2, ACC-7)

**Files:**
- Delete: `src/app/api/my/apps/route.ts`, `src/app/api/my/apps/[id]/route.ts`, `src/app/api/my/apps/[id]/redirect-uris/route.ts`, `src/app/api/my/apps/[id]/signers/route.ts`, `src/app/api/my/redirect-uris/[id]/route.ts`, `src/app/api/my/signers/[id]/route.ts`, `src/app/api/my/workspace/[id]/apps/route.ts`
- Delete: `src/controllers/app.controller.ts`, `src/controllers/redirectUri.controller.ts`, `src/controllers/signer.controller.ts`, `src/services/app.service.ts` (already unused), `src/services/redirectUri.service.ts`, `src/services/signer.service.ts`
- Modify: `src/app/api/my/workspace/route.ts` (drop `GET`), `src/utils/redact.ts` (drop `redactApp`), `src/controllers/workspace.controller.ts` and `src/services/workspace.service.ts` (drop `findMyWorkspace`, `updateWorkspace`, `getWorkspace` where `grep -rn` shows no caller left)
- Keep: `src/models/app.model.ts`, `src/models/signer.model.ts`, `src/models/redirectUri.model.ts`
- Test: `test/api/retired-legacy-routes.test.ts`; update `test/api/team-scoped-routes.test.ts`

**Interfaces:**
- Produces: no route under `/api/my/apps`, `/api/my/redirect-uris`, `/api/my/signers` or `/api/my/workspace/:id/apps` (Next answers 404); `/api/my/workspace` exports only `POST` (Next answers GET with 405). Evidence for each removal is in "Decisions" above; repeat the console grep before deleting.

- [ ] **Step 1: Write the failing tests**

`test/api/retired-legacy-routes.test.ts`:
- `it.each(['my/apps', 'my/redirect-uris', 'my/signers', 'my/workspace/[id]/apps'])('has no /api/%s route', …)`: `existsSync(new URL(\`../../src/app/api/${dir}\`, import.meta.url))` is false.
- `answers GET /api/my/workspace with nothing`: `const route = await import('@/app/api/my/workspace/route')`; `expect(route).not.toHaveProperty('GET')`; `expect(typeof route.POST).toBe('function')`.

`test/api/team-scoped-routes.test.ts`: delete `describe('apps under a team')`, the `appFor` fixture, the imports of removed routes and of `App`, `RedirectUri`, `Signer`, the `GET /api/my/workspace` half of `resolves the workspace by license token…` (keep the by-token assertions), and the eight removed entries of `member writes` (PUT and DELETE `/api/my/apps/:id`, POST `…/redirect-uris`, POST `…/signers`, PUT and DELETE `/api/my/redirect-uris/:id`, DELETE `/api/my/signers/:id`, POST `/api/my/workspace/:id/apps`).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/retired-legacy-routes.test.ts`
Expected: FAIL: the route folders exist; the workspace route exports GET.

- [ ] **Step 3: Implement**: delete per Files; then `grep -rn "app.controller\|redirectUri.controller\|signer.controller\|signer.service\|redirectUri.service\|redactApp\|findMyWorkspace\|updateWorkspace" src test` prints nothing.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run && npm run typecheck`
Expected: pass.
Run: `ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/app/api/my/workspace src/utils/redact.ts src/controllers/workspace.controller.ts src/services/workspace.service.ts test/api && npx prettier --check src/app/api/my/workspace/route.ts src/utils/redact.ts src/controllers/workspace.controller.ts src/services/workspace.service.ts test/api/retired-legacy-routes.test.ts test/api/team-scoped-routes.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "refactor(api): retire the legacy app routes and GET /api/my/workspace"
```

### Task 3: Connection reads survive an unreadable row; 404 for a deleted row; status only moves forward (SEC-5)

**Files:**
- Modify: `src/services/connectionKeys.service.ts` (`UnreadableKeyError`, `readConnectionForOwner`)
- Modify: `src/controllers/connection.controller.ts` (`assertStatusTransition`, `connectionNotFound`)
- Modify: `src/app/api/my/connections/route.ts` (owner rows through `readConnectionForOwner`), `src/app/api/my/connections/[id]/route.ts` (GET 404 and owner read; PUT transition check; every 404 through `connectionNotFound`)
- Create: `test/support/connections.ts` (move `team`, `post`, `list`, `getOne`, `put`, `remove`, `insertRow`, `stored`, `KEYS`, `LICENSE_KEY`, `DEVICE_KEY`, `UNAVAILABLE`, `ANOTHER_SECRET`, `watchLogs` out of `connection-keys.test.ts`, which then imports them)
- Test: `test/api/connection-reads.test.ts`; update `test/api/connection-keys.test.ts`

**Interfaces:**
- Produces (`connectionKeys.service.ts`):
  - `export class UnreadableKeyError extends ApiError`: status 500, code `CONNECTION_KEYS_UNAVAILABLE`, message `Connection keys are unavailable`, so a caller that doesn't catch it answers as today. `decryptSecret` throws it (after the existing `unavailable(reason)` log line) for a value in no readable format and for one that doesn't open under the secret. A missing or malformed `CONNECTION_KEYS_SECRET` still throws the plain `ApiError`.
  - `readConnectionForOwner(connection: Connection): ReturnType<typeof decryptConnection> & { keys_unreadable: boolean }`: `decryptConnection` plus `keys_unreadable: false`; on `UnreadableKeyError`, the row with `connection_license_private_key: null`, `device_issuance_key: null`, `keys_unreadable: true`. Any other error propagates.
  - `decryptConnection` is unchanged (POST and PUT answers keep refusing a row they can't read).
- Produces (`connection.controller.ts`): `assertStatusTransition(from: ConnectionStatuses | undefined, to: unknown): void`, order `PENDING < MINTED < READY` (`from` undefined counts as READY). A `to` that is not a `ConnectionStatuses` value returns (model validation answers 400); a lower `to` throws `ApiError(409, 'INVALID_STATUS_TRANSITION', "A connection's status only moves forward: PENDING, MINTED, READY")`. `connectionNotFound(): ApiError` → `ApiError(404, 'CONNECTION_NOT_FOUND', 'Connection not found')`.
- Produces (wire, consumed by Task 11):
  - Owner rows of `GET /api/my/connections` (`data[]`) and of `GET /api/my/connections/:id` carry `keys_unreadable: boolean`; when `true`, `connection_license_private_key` and `device_issuance_key` are `null`. Member rows are unchanged (keys `null`, no `keys_unreadable`).
  - `GET`, `PUT` and `DELETE /api/my/connections/:id` for a missing or deleted row → 404 `{ message: 'Connection not found', code: 'CONNECTION_NOT_FOUND' }` (GET answered 200 `null` before).
  - `PUT /api/my/connections/:id` moving status backwards → 409 `{ message: "A connection's status only moves forward: PENDING, MINTED, READY", code: 'INVALID_STATUS_TRANSITION' }`; nothing written.
  - A missing or malformed `CONNECTION_KEYS_SECRET` still fails the owner's list and reads with 500 `CONNECTION_KEYS_UNAVAILABLE`: that's a deploy fault, not a row fault.

- [ ] **Step 1: Write the failing tests**

`test/api/connection-reads.test.ts`:
- `lists plaintext, encrypted and unreadable rows side by side`: `insertRow(companyId, { name: 'Plain link' })`; `post(owner, { name: 'Sealed link', ...KEYS })`; `insertRow(companyId, { name: 'Broken link', license: <encryptSecret(LICENSE_KEY) with one ciphertext byte flipped, as in UNREADABLE_VALUES> })` → owner list 200 with 3 rows; Broken is `{ keys_unreadable: true, connection_license_private_key: null, device_issuance_key: null }`; Plain and Sealed have `keys_unreadable: false` and `connection_license_private_key: LICENSE_KEY`; `watchLogs()` contains `[Connection keys]` and not `LICENSE_KEY`.
- `flags a row that does not open under the secret`: post, then `vi.stubEnv('CONNECTION_KEYS_SECRET', ANOTHER_SECRET)` → `getOne(owner, id)` is `{ status: 200 }` with `keys_unreadable: true` and null keys; the list is 200 with that row flagged.
- `still fails reads when the secret itself is missing`: post, `vi.stubEnv('CONNECTION_KEYS_SECRET', undefined)` → list and getOne `{ status: 500, body: UNAVAILABLE }`.
- `answers 404 for a deleted connection`: post `status: 'PENDING'`, remove → for owner and member, `getOne` is `{ status: 404, body: { message: 'Connection not found', code: 'CONNECTION_NOT_FOUND' } }`.
- `answers 404 for another company's connection`.
- `moves status forward only`: from PENDING: `put MINTED` 200; `put PENDING` → 409 `INVALID_STATUS_TRANSITION`, stored stays MINTED; `put READY` 200; `put PENDING` and `put MINTED` → 409; `put READY` again → 200.
- `lets PENDING go straight to READY`.
- `refuses a member's status change`: member `put READY` → 403 `OWNER_ONLY`, stored stays PENDING.

`test/api/connection-keys.test.ts`: `answers an owner with an error, not garbage, under another key` becomes `flags rows that do not open under another key` (owner getOne and list 200 with `keys_unreadable: true`; member list 200; logs as before); `hides a deleted connection` expects 404 from `getOne`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/connection-reads.test.ts`
Expected: FAIL: the list answers 500 for one unreadable row; a deleted row answers 200 `null`; MINTED → PENDING answers 200.

- [ ] **Step 3: Implement** per Interfaces. PUT calls `assertStatusTransition(existing.status, body.status)` after loading the row and before writing.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/services/connectionKeys.service.ts src/controllers/connection.controller.ts src/app/api/my/connections test/support/connections.ts test/api && npx prettier --check src/services/connectionKeys.service.ts src/controllers/connection.controller.ts src/app/api/my/connections test/support/connections.ts test/api/connection-reads.test.ts test/api/connection-keys.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "fix(connections): flag an unreadable row instead of failing the list; 404 for deleted rows; status only moves forward"
```

### Task 4: A migration ledger, checked before every build; a PR template line (REL-1)

**Files:**
- Modify: `src/scripts/db/init-db_13.sql`, `src/scripts/db/init-db_14.sql` (append the ledger block), `src/scripts/db/init-db_13.down.sql`, `src/scripts/db/init-db_14.down.sql` (append the ledger removal)
- Create: `src/scripts/ops/check-migrations.mjs`
- Modify: `package.json` (`build`)
- Create: `.github/pull_request_template.md`
- Test: `test/db/check-migrations.test.ts`

**Interfaces:**
- Produces: the ledger block, appended last to every tracked migration (`N` = its number), so that under `psql --single-transaction` a migration is recorded only if all of it applied:

```sql
-- Records this migration for src/scripts/ops/check-migrations.mjs, which fails a
-- build whose database is missing a tracked migration.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO schema_migrations (version) VALUES (N) ON CONFLICT (version) DO NOTHING;
```

  and in its down file, which must work where the ledger doesn't exist:

```sql
DO $$
BEGIN
  IF to_regclass('schema_migrations') IS NOT NULL THEN
    DELETE FROM schema_migrations WHERE version = N;
  END IF;
END $$;
```

- Produces (`check-migrations.mjs`, plain node ESM like `encrypt-connection-keys.mjs`, with the same `import.meta.url === pathToFileURL(process.argv[1]).href` entry guard):
  - `export const FIRST_TRACKED_MIGRATION = 13`.
  - `export const trackedMigrations = (dir = <src/scripts/db resolved from import.meta.url>): number[]`: every `N >= 13` of `init-db_N.sql`, ascending.
  - `export const missingMigrations = async (client: pg.Client, versions: number[]): Promise<number[]>`: versions without a ledger row, all of them when `schema_migrations` doesn't exist (SQLSTATE `42P01`). Reads inside `BEGIN READ ONLY` … `ROLLBACK` (no startup `options`: Neon's pooler may refuse them).
  - CLI, exact output (it never prints `PG_URL`, a host or a driver message):
    - `SKIP_MIGRATION_CHECK=1` → stdout `check-migrations: skipped (SKIP_MIGRATION_CHECK=1)`, exit 0, no connection.
    - no `PG_URL` → stdout `check-migrations: PG_URL is not set, skipping`, exit 0, no connection (never falls back to `PG*` variables).
    - all recorded → stdout `check-migrations: all <n> tracked migrations are recorded`, exit 0.
    - some missing → stderr `check-migrations: the database is missing init-db_15.sql. Run it on this database (psql --single-transaction -f src/scripts/db/<file>), then deploy again.` with every missing file, comma-separated, exit 1.
    - connection or query failure → stderr `check-migrations: could not check the database (<error.code ?? error.name>)`, exit 1. The client is created with `{ connectionString: process.env.PG_URL, connectionTimeoutMillis: 10_000 }`.
- Produces (`package.json`): `"build": "node src/scripts/ops/check-migrations.mjs && next build"` (explicit rather than `prebuild`, so it runs however the build is invoked through npm).
- Produces (`.github/pull_request_template.md`): sections `## What and why`, `## How it was tested`, `## Release`, the last holding the line `Prod migration applied: yes / no / none`.

- [ ] **Step 1: Write the failing tests**

`test/db/check-migrations.test.ts` (CLI runs follow `connection-keys.test.ts`'s `from the command line` block: `execFile(process.execPath, [script])`, `listener`, `pgEnvFor`, `envWithoutDatabase` from `test/support/ops.ts`):
- `tracks every migration from 13 on`: `trackedMigrations()` contains 13 and 14 and every value is ≥ 13.
- `every tracked migration records itself`: for each `N`, the file contains `CREATE TABLE IF NOT EXISTS schema_migrations` and `INSERT INTO schema_migrations (version) VALUES (${N}) ON CONFLICT (version) DO NOTHING;`, and `init-db_${N}.down.sql` contains `DELETE FROM schema_migrations WHERE version = ${N};`.
- `records a migration once, and its rollback forgets it`: `runSql(init-db_14.sql)` twice → `SELECT version FROM schema_migrations` is `[{ version: 14 }]`; `runSql(init-db_14.down.sql)` → no row 14; `afterEach` runs `init-db_14.sql` again (the suite reads its columns).
- `skips without PG_URL and connects nowhere`: env `envWithoutDatabase(pgEnvFor(listener.url))` → exit 0, stdout `check-migrations: PG_URL is not set, skipping`, `listener.connections() === 0`.
- `skips when told to`: `{ ...process.env, PG_URL: listener.url, SKIP_MIGRATION_CHECK: '1' }` → exit 0, no connection.
- `passes when every tracked migration is recorded`: insert every tracked version → exit 0, stdout `check-migrations: all ${n} tracked migrations are recorded`.
- `fails and names a missing migration`: insert all but the last → exit 1, stderr contains `init-db_${last}.sql`, and neither `postgres://` nor `127.0.0.1`.
- `fails when there is no ledger at all`: `DROP TABLE schema_migrations` (`afterEach` recreates it with the block's DDL) → exit 1 naming every tracked file.
- `fails closed when the database can't be reached`: `PG_URL: listener.url` → exit 1, stderr starts with `check-migrations: could not check the database`, no URL in it.
- `runs before next build`: `scripts.build` in `package.json` is `node src/scripts/ops/check-migrations.mjs && next build`.
- `asks every PR whether the prod migration ran`: `.github/pull_request_template.md` contains `Prod migration applied: yes / no / none`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/check-migrations.test.ts`
Expected: FAIL: the script doesn't exist; 13 and 14 don't record themselves.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (every migration test must still pass: the down files run before their migrations on a fresh database).
Expected: all pass.
Run: `npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/scripts/ops/check-migrations.mjs test/db/check-migrations.test.ts && npx prettier --check src/scripts/ops/check-migrations.mjs test/db/check-migrations.test.ts package.json .github/pull_request_template.md`
Run: `env -u PG_URL npm run build`
Expected: pass; the build log starts with `check-migrations: PG_URL is not set, skipping`.

- [ ] **Step 5: Commit**

```bash
git add package.json src/scripts test/db/check-migrations.test.ts .github/pull_request_template.md
git commit -m "feat(release): record migrations in a ledger and fail a build whose database is behind"
```

### Task 5: Discard only a PENDING connection; one name per team (FLOW-1, init-db_15)

**Files:**
- Create: `src/scripts/db/init-db_15.sql`, `src/scripts/db/init-db_15.down.sql`
- Modify: `src/controllers/connection.controller.ts` (`createConnection` and `updateMyConnection` map the name index; `deleteMyConnection` deletes only a PENDING row)
- Modify: `src/app/api/my/connections/[id]/route.ts` (DELETE answers 409 for a row past PENDING)
- Test: `test/db/migration-15.test.ts`, `test/api/connection-discard.test.ts`; update `test/api/connection-keys.test.ts` (`lets a name be used again`, `hides a deleted connection`, `finds no deleted connection to change or delete again` create PENDING rows) and any test that inserts two active rows with the same name in one company (give them distinct names)

**Interfaces:**
- Consumes (Task 3): `connectionNotFound`, `test/support/connections.ts`. (Task 4): the ledger block, with `N = 15`.
- Produces (`init-db_15.sql`, in order): a header comment in the style of `init-db_14.sql` (what, why, safe to rerun, run before the API that reads it); a `DO $$` pre-check that counts `(company_id, lower(name))` groups with more than one row `WHERE deleted IS NOT TRUE` and, when any exist, `RAISE EXCEPTION 'init-db_15: % connection name(s) are used by more than one active connection in the same company. Rename or delete the extra rows, then run this again.'` (a count only: no names, no ids); `CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_company_name ON connections (company_id, lower(name)) WHERE deleted IS NOT TRUE;`; the ledger block. `init-db_15.down.sql`: `DROP INDEX IF EXISTS idx_connections_company_name;` and the ledger removal.
- Produces: `CONNECTION_NAME_INDEX = 'idx_connections_company_name'`; a `UniqueConstraintError` whose `parent.constraint` is it becomes `ApiError(409, 'CONNECTION_NAME_TAKEN', 'Your team already has a connection with this name')`.
- Produces (wire, consumed by Task 11):
  - `DELETE /api/my/connections/:id`: owner only (403 `OWNER_ONLY` as today); PENDING → 200 `{ message: 'Connection deleted successfully' }`; MINTED or READY → 409 `{ message: 'Only a connection whose setup has not minted it can be discarded', code: 'CONNECTION_NOT_PENDING' }`, nothing written; missing or deleted → 404 `CONNECTION_NOT_FOUND`. The soft-delete's `where` includes `status: PENDING`, so a row that moved on since it was read is not deleted (answer 409).
  - `POST /api/my/connections` and `PUT /api/my/connections/:id` with a name another active connection of the same company uses, ignoring case → 409 `{ message: 'Your team already has a connection with this name', code: 'CONNECTION_NAME_TAKEN' }`; nothing written.

- [ ] **Step 1: Write the failing tests**

`test/db/migration-15.test.ts` (`script()` helper as in `migration-14.test.ts`; `afterEach`: `runSql('DELETE FROM connections')` then `runSql(MIGRATION)`):
- `refuses duplicate active names in one company, ignoring case, and says how many`: `runSql(ROLLBACK)`; insert active `Fleet` and `fleet` for one company → `runSql(MIGRATION)` rejects with a message matching `/init-db_15: 1 connection name\(s\)/` and containing neither `Fleet` nor the company id; `idx_connections_company_name` is absent from `pg_indexes`.
- `allows a name in two companies and next to a deleted row`: rollback; same name in two companies plus a `deleted = TRUE` duplicate → migration succeeds; the index exists.
- `counts a NULL deleted as active`: rollback; `Fleet` with `deleted = NULL` and `Fleet` with `deleted = FALSE` in one company → migration refuses.
- `makes the database refuse a second active name`: after the migration, inserting `FLEET` next to `Fleet` rejects with `constraint === 'idx_connections_company_name'`.
- `records itself once`: run it twice → one ledger row 15.
- `init-db_15.down.sql drops the index and its ledger row`, `can run on a database that never had the migration` (rollback twice, then migration), `can run where there is no connections table at all` (the empty-schema form of `migration-14.test.ts`).

`test/api/connection-discard.test.ts`:
- `discards a PENDING connection`: owner posts `status: 'PENDING'`, removes → 200; the owner's list is empty; the stored row has `deleted: true`.
- `it.each(['MINTED', 'READY'])('refuses to discard a %s connection', …)`: → 409 `{ code: 'CONNECTION_NOT_PENDING' }`; stored row not deleted, keys unchanged.
- `refuses a member with OWNER_ONLY`.
- `answers 404 for a connection already discarded`.
- `refuses a second connection with the same name in the team, ignoring case`: `Fleet link`, then `fleet LINK` → 409 `CONNECTION_NAME_TAKEN`; one row.
- `refuses a rename onto a taken name`: rows `A` and `B`; `put(B, { name: 'a' })` → 409; B keeps its name.
- `allows the same name in another team`.
- `allows a discarded connection's name again`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-15.test.ts test/api/connection-discard.test.ts`
Expected: FAIL: `init-db_15.sql` is missing; DELETE removes a READY row; a duplicate name saves.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (the globalSetup rebuilds the test database with `init-db_15.sql`, and Task 4's ledger test now covers 15)
Expected: all pass.
Run: `npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/controllers/connection.controller.ts "src/app/api/my/connections/[id]/route.ts" test/db test/api && npx prettier --check src/controllers/connection.controller.ts "src/app/api/my/connections/[id]/route.ts" test/db/migration-15.test.ts test/api/connection-discard.test.ts test/api/connection-keys.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "feat(connections): discard only a PENDING connection; one name per team (init-db_15)"
```

### Task 6: A license's last brand can be deleted (BRAND-1)

**Files:**
- Modify: `src/services/workspaceBrand.service.ts` (`deleteBrandById`), `src/app/api/my/workspace/[id]/brands/[brandId]/route.ts` (DELETE and its doc comment)
- Test: `test/api/brand-per-license.test.ts`

**Interfaces:**
- Produces: `deleteBrandById(id: string, workspace_id: string): Promise<{ deleted: boolean; error?: 'not_found' }>`; the default hand-over to the oldest remaining brand stays.
- Produces (wire, consumed by Task 16): `DELETE /api/my/workspace/:id/brands/:brandId` → 204, or 404 `{ error: 'not_found' }`; never 409 `last_brand`. `GET /api/brand?clientId=` for a license with no active brand → 404 `{ error: 'not_found' }` (existing path).

- [ ] **Step 1: Write the failing tests**: replace `refuses to delete the last brand with 409` with:
- `deletes the last brand, and the public lookup then answers 404`: add `Fleet App`, remove → 204; `publicBrand` → `{ status: 404, body: { error: 'not_found' } }`; `brands.list` → `[]`.
- `makes the next brand the default after the last was deleted`: remove the only brand, add `Consumer App` → public lookup 200 `{ name: 'Consumer App', isDefault: true }`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/brand-per-license.test.ts`
Expected: FAIL: the delete answers 409 `last_brand`.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run && npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/services/workspaceBrand.service.ts "src/app/api/my/workspace/[id]/brands" test/api/brand-per-license.test.ts && npx prettier --check src/services/workspaceBrand.service.ts "src/app/api/my/workspace/[id]/brands/[brandId]/route.ts" test/api/brand-per-license.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "fix(brand): allow deleting a license's last brand"
```

### Task 7: Brand lookups cached for a minute and purged on every brand write (BRAND-3)

**Files:**
- Create: `src/services/brandCache.service.ts`
- Modify: `src/app/api/brand/route.ts` (headers and doc comment), and the five write routes: `src/app/api/my/workspace/[id]/brands/route.ts` (POST), `src/app/api/my/workspace/[id]/brands/[brandId]/route.ts` (PUT, DELETE), `src/app/api/my/workspace/[id]/brands/[brandId]/default/route.ts` (POST), `src/app/api/my/workspace/[id]/brand/route.ts` (PUT)
- Test: `test/api/brand-cache.test.ts`

**Interfaces:**
- Produces (`brandCache.service.ts`):
  - `BRAND_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300'` (200); `BRAND_MISS_CACHE_CONTROL = 'public, max-age=60'` (404, unchanged).
  - `brandCacheTag(clientId: string): string` → `` `brand-${clientId.toLowerCase()}` `` (no commas: Vercel's limit).
  - `purgeBrandCache(clientId: string): Promise<void>`: `await dangerouslyDeleteByTag(brandCacheTag(clientId))` from `@vercel/functions` (a no-op outside Vercel). Never throws: a failure logs `{ step: '[Brand cache] purge', reason: <error name> }` and returns, since the write already happened and the 60 s window bounds what's left.
- Produces: `/api/brand` 200 and 404 responses carry `Vercel-Cache-Tag: brand-<clientId lowercased>` next to their `Cache-Control`, whatever the case of `clientId` in the query and whether `brandName` is set, so one purge reaches every variant of a license's lookup.
- Produces: each write route awaits `purgeBrandCache(guard.workspace.client_id)` after its write succeeds and before it answers; a refused write (403, 404, 409, 400) doesn't purge. `POST …/brand/upload` doesn't purge.
- Ruling: `dangerouslyDeleteByTag`, not `invalidateByTag` (Review Focus 5); no Cloudflare purge (`cf-cache-status: DYNAMIC`).

- [ ] **Step 1: Write the failing tests**

`test/api/brand-cache.test.ts` (`vi.mock('@vercel/functions', async (importOriginal) => ({ ...(await importOriginal<typeof import('@vercel/functions')>()), dangerouslyDeleteByTag: vi.fn(async () => undefined), invalidateByTag: vi.fn(async () => undefined) }))`; `ownedLicense` and `brandApi` from `test/support/brands.ts` (Task 1)):
- `caches a found brand for a minute and serves it stale for five`: add a brand; GET `/api/brand?clientId=<clientId upper-cased>` → `Cache-Control` is `public, max-age=60, stale-while-revalidate=300`; `Vercel-Cache-Tag` is `brand-<clientId lower-cased>`; the same tag with `&brandName=Fleet%20App`.
- `tags a miss with the license's tag`: no brand → 404, `Cache-Control: public, max-age=60`, same tag.
- `purges the license's lookups on every brand write`: create, update, set-default, `updateDefault` (PUT `/brand`) and delete each call `dangerouslyDeleteByTag` exactly once with `brand-<clientId>` (assert after each call, clearing the mock between); `invalidateByTag` is never called.
- `purges nothing for a refused write`: a member's write (403) and a duplicate name (409) → `dangerouslyDeleteByTag` not called.
- `answers the write when the purge fails`: the mock rejects → POST still 201, DELETE still 204; a `console.error` spy saw `expect.objectContaining({ step: '[Brand cache] purge' })`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/brand-cache.test.ts`
Expected: FAIL: `Cache-Control` is `max-age=600, stale-while-revalidate=86400`; no tag; no purge.

- [ ] **Step 3: Implement** per Interfaces; rewrite the route's doc comment to describe the new window and the purge.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run && npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/services/brandCache.service.ts src/app/api/brand "src/app/api/my/workspace/[id]" test/api && npx prettier --check src/services/brandCache.service.ts src/app/api/brand/route.ts "src/app/api/my/workspace/[id]" test/api/brand-cache.test.ts`
Run: `env -u PG_URL npm run build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "fix(brand): cache lookups for a minute and purge a license's lookups on every brand write"
```

---

## Console (`/Users/zer0stars/workspace/dimo-developer-console/.worktrees/wave1`)

### Task 8: Failed dex calls leave no signature or auth code behind; the dead app actions go (SEC-6)

**Files:**
- Create: `src/utils/upstreamErrors.ts`
- Modify: `src/services/dimoDevAPI.ts` (imports `stripRequestDetails` instead of defining it), `src/actions/dimoAuth.ts` (`getDimoChallenge`, `getDimoToken`, `exchangeDimoToken` wrap their post)
- Delete: `src/services/app.ts` (holds `testMyApp`), `src/actions/app.ts`: nothing imports either, and Task 2 removes the routes they call
- Test: `__tests__/unit/actions/dimoAuth.test.ts`, `__tests__/unit/utils/upstreamErrors.test.ts`; `__tests__/unit/services/dimoDevAPI.test.ts` passes unchanged

**Interfaces:**
- Produces (`src/utils/upstreamErrors.ts`, no `'use server'`):
  - `stripRequestDetails(error: unknown): void`: moved unchanged from `dimoDevAPI.ts` (with `dropAuthorization`): an AxiosError loses `Authorization` from `config.headers` and `response.config.headers`, `config.data`, `request` and `response.request`; message, code, status and response data stay.
  - `withoutRequestDetails<T>(request: Promise<T>): Promise<T>`: rejects with the same error after `stripRequestDetails`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/actions/dimoAuth.test.ts` (keep the file's axios mock; build the rejection as `new AxiosError('Bad Request', 'ERR_BAD_REQUEST', { headers: new AxiosHeaders({ Authorization: 'Bearer t' }), data: 'signature=0xsecret' } as never, { body: '0xsecret' }, { status: 400, data: {} } as AxiosResponse)`):
- `strips the signed challenge from a failed submit`: `getDimoToken(INPUT)` rejects with that same error; `error.config.data` and `error.request` are undefined; `inspect(error, { depth: null })` doesn't contain `0xsecret`.
- `strips the auth code from a failed exchange`: the same for `exchangeDimoToken('code-123')` with `data: 'code=code-123'` → no `code-123`.
- `keeps the status a caller reads`: `error.response.status === 400`.

`__tests__/unit/utils/upstreamErrors.test.ts`: `drops Authorization from AxiosHeaders and from plain headers`, `keeps message, code, status and response data`, `ignores an error that is not an AxiosError`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false dimoAuth upstreamErrors`
Expected: FAIL: `@/utils/upstreamErrors` not found; the rejected error still holds `0xsecret`.

- [ ] **Step 3: Implement** per Interfaces; then `grep -rn "services/app'\|actions/app'\|testMyApp" src __tests__` prints nothing.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false dimoAuth upstreamErrors dimoDevAPI`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(auth): strip signatures and auth codes from failed dex calls; drop the dead app actions"
```

### Task 9: Swallowed failures are reported; server errors group by upstream route and status (SES-4, SES-3)

**Files:**
- Modify: `src/utils/upstreamErrors.ts` (add `isUnexpectedFailure`, `reportUnexpected`; `toFailure` moves here)
- Modify: `src/services/teams.ts` (`export { toFailure } from '@/utils/upstreamErrors'`, local copy removed)
- Modify: `src/actions/dimoAuth.ts` (`dexFailure`), `src/actions/user.ts` (`getUser`), `src/services/dimoDev.ts` (`getDeveloperJwt`), `src/actions/simulatedVehicles.ts` (`getSimulatedVehicles`)
- Create: `src/utils/sentryFingerprint.ts`; Modify: `sentry.server.config.ts`
- Test: `__tests__/unit/utils/upstreamErrors.test.ts` (extend), `__tests__/unit/utils/sentryFingerprint.test.ts`, `__tests__/unit/actions/swallowedFailures.test.ts`, `__tests__/unit/config/sentryServerConfig.test.ts`; `__tests__/unit/services/teamsFailure.test.ts` passes unchanged

**Interfaces:**
- Consumes (Task 8): `stripRequestDetails`.
- Produces (`upstreamErrors.ts`):
  - `isUnexpectedFailure(error: unknown): boolean`: AxiosError with `response.status >= 500` → true; AxiosError without a response → true; AxiosError with a status below 500 → false; anything else → true.
  - `reportUnexpected(error: unknown): void`: `stripRequestDetails(error)`, then `Sentry.captureException(error)` when `isUnexpectedFailure(error)`.
  - `toFailure(error: unknown): ApiResult<never>`: same results as today; reports through `reportUnexpected`, so what reaches Sentry is stripped.
- Produces (`sentryFingerprint.ts`, types `ErrorEvent`, `EventHint` from `@sentry/nextjs`):
  - `upstreamRoute(config?: { method?: string; url?: string; baseURL?: string }): string` → `` `${METHOD} ${path}` ``: method upper-cased (`GET` when absent); host and query dropped; each path segment that is a UUID, `0x` hex, or all digits becomes `:id`; `'unknown'` without a config or URL.
  - `fingerprintUpstreamError(event: ErrorEvent, hint: EventHint): ErrorEvent`: when `isAxiosError(hint.originalException)`, sets `event.fingerprint = ['axios', upstreamRoute(error.config), String(error.response?.status ?? error.code ?? 'no-response')]` and tags `upstream_route`, `upstream_status`; any other event is returned unchanged.
  - `sentry.server.config.ts` passes `beforeSend: fingerprintUpstreamError` to `Sentry.init`.
- Callers keep their results: `dexFailure` → `{ ok: false, status }`, `getUser` → `null`, `getDeveloperJwt` → `null`, `getSimulatedVehicles` → `[]`; each now calls `reportUnexpected(error)` in its catch.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/sentryFingerprint.test.ts`:
- `groups by upstream route and status`: AxiosError status 400, config `{ method: 'post', url: '/api/my/connections' }` → `['axios', 'POST /api/my/connections', '400']`.
- `keeps a 401 and a 400 on one route apart`.
- `replaces ids in the path`: `/api/my/connections/7b0c2f7e-1d2a-4c3b-9e8f-0a1b2c3d4e5f` → `GET /api/my/connections/:id`; `/api/my/licenses/1254/signers/0x3ab3dDf8` → `GET /api/my/licenses/:id/signers/:id`.
- `drops the host and the query`: `https://console-api.dimo.org/api/brand?clientId=0xabc` → `GET /api/brand`.
- `names a failure without a response by its code`: code `ECONNABORTED`, no response → third element `ECONNABORTED`.
- `leaves other errors alone`: `new Error('x')` → `event.fingerprint` undefined.

`__tests__/unit/actions/swallowedFailures.test.ts` (node env; mock `@sentry/nextjs` `captureException`; mock `@/services/dimoDevAPI` so `dimoDevAPIClient` resolves `{ get: mockGet }`; mock `@/services/user` `getUserByToken`; mock `@dimo-network/data-sdk` so `new DIMO().auth.getDeveloperJwt` is a jest fn; mock axios `create` for dimoAuth as `dimoAuth.test.ts` does):
- `it.each` over `getUser` (→ `null`), `getSimulatedVehicles({ clientId: '0xabc' })` (→ `[]`), `getDeveloperJwt({ client_id, domain, private_key })` (→ `null`), `submitDexChallenge(INPUT)` (→ `{ ok: false, status }`):
  - `reports a 500 from %s once and returns what it always did`.
  - `stays quiet about a 4xx from %s`.
  - `reports a network failure from %s`.
- `reports getDeveloperJwt's failure without its request body`: the AxiosError's `config.data` holds `private-key-1` → the captured error has no `config.data`.
- `stays quiet when a visitor without a session asks for the user`: `getUserByToken` rejects with a 401 AxiosError → `null`, nothing captured.

`__tests__/unit/config/sentryServerConfig.test.ts`: mock `@sentry/nextjs` as `{ init: jest.fn() }`, `require('../../../sentry.server.config')` → `init` was called with `expect.objectContaining({ beforeSend: fingerprintUpstreamError })`.

`upstreamErrors.test.ts`: `isUnexpectedFailure` for 503, 404, no response, `new Error`; `reportUnexpected strips before it captures` (the captured error has no `config.data`).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false sentryFingerprint swallowedFailures sentryServerConfig upstreamErrors`
Expected: FAIL: modules not found; the four callers capture nothing.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false sentryFingerprint swallowedFailures sentryServerConfig upstreamErrors teamsFailure teams dimoAuth`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__ sentry.server.config.ts
git commit -m "fix(sentry): report swallowed upstream failures and group server errors by route and status"
```

### Task 10: Sign-in stays quiet without a session; sign-up says when an account exists (SES-2, SES-5)

SES-2 root cause (from the code; the QA event was `POST /sign-in` 401 "when a new tab bounced to /sign-in"): a tab without a session bundle still renders the authorized page. `GlobalAccountProvider.loadUserSession` calls `logout()`, which awaits the `endSession()` server action (it deletes the session cookie) and then `router.replace('/sign-in')`. Next runs server actions one at a time, so a read queued behind `endSession` goes out without the cookie; the proxy answers that POST with a 307 to `/sign-in` (`src/proxy.ts`, `validatePublicSession`), the browser replays the POST there with its `Next-Action` header, the proxy lets it through because `/sign-in` is a login page, console-api answers 401, and `onRequestError` reports it as `POST /sign-in`. Before #343 the read was most likely `getMyConnections` (the /connections page's list, a throwing server action); #343 moved it and every other mount-time read to GET routes, whose 401 the proxy answers itself. The one server action left that a page can start on its own and that throws a 401 is `getOrCreateLicenseWorkspace` (the Brand tab's create effect). Sign-in, sign-up and `withAuth` start no session-only call before login.

**Files:**
- Modify: `src/proxy.ts` (`validatePublicSession`: a server action without a session gets a 401, never a redirect)
- Modify: `src/app/license/[tokenId]/details/components/Brand/Brand.tsx` (the create effect waits for a signed-in user)
- Modify: `src/app/sign-up/actions.ts` (`createNewUser` returns a result)
- Create: `src/app/sign-up/signUpResult.ts`
- Modify: `src/hoc/AuthProvider.tsx` (`signIntoDimo` throws `SignUpRefusedError` for a refused result)
- Modify: `src/app/sign-up/components/WalletCreation/WalletCreation.tsx` (`continueAfterCreation`), `src/app/sign-up/components/WalletCreation/OtpSignup.tsx` (its `completeOtpLogin` catch): every catch around a login with `existOnDevConsole: false` (`grep -rn "existOnDevConsole: false" src`)
- Test: `__tests__/unit/middleware.test.ts`, `__tests__/unit/pages/license/[tokenId]/details/Brand.test.tsx`, `__tests__/unit/actions/createNewUser.test.ts`, `__tests__/unit/pages/sign-up/signUpRefusal.test.tsx`

**Interfaces:**
- Consumes (Task 1 wire): `POST /api/user` → 409 `{ code: 'ACCOUNT_EXISTS' }` or 409 `{ code: 'EMAIL_TAKEN' }`. (Task 9): `reportUnexpected`.
- Produces (SES-2, proxy): a request with a `next-action` header, no verified session, to a path that is not in `LOGIN_PAGES` → 401 with the API branch's body `{ error: 'Your session has expired', code: 'SESSION_EXPIRED', message: 'Unauthorized Access' }` and no `Location`, so an action is never replayed at `/sign-in`. A page visit without a session still gets the 307; an action posted to a login page without a session still runs (sign-in's own pre-login actions: `getUserInformation`, `getDimoChallenge`, `getDimoToken`, `exchangeDimoToken`, `saveToken`, `endSession`, `createNewUser`).
- Produces (SES-2, Brand): the create effect also requires `useGlobalAccount().currentUser`, which a tab without a session never resolves, so `getOrCreateLicenseWorkspace` is skipped there.
- Produces (`signUpResult.ts`):
  - `type SignUpRefusal = 'ACCOUNT_EXISTS' | 'UNREACHABLE' | 'FAILED'`; `type SignUpResult = { ok: true; data: IUser } | { ok: false; reason: SignUpRefusal }`.
  - `class SignUpRefusedError extends Error { constructor(readonly reason: SignUpRefusal) }` (name `SignUpRefusedError`).
  - `ACCOUNT_EXISTS_MESSAGE = 'This account already exists — sign in instead.'`; `UNREACHABLE_MESSAGE = "Couldn't reach the console, try again."`; `SIGN_UP_FAILED_MESSAGE = 'Something went wrong while creating your account. Try again.'`.
  - `explainSignUpRefusal(error: unknown, goToSignIn: () => void): boolean`: for a `SignUpRefusedError`, ACCOUNT_EXISTS → `toast.error(ACCOUNT_EXISTS_MESSAGE, { action: { label: 'Sign in', onClick: goToSignIn } })`; UNREACHABLE → `toast.error(UNREACHABLE_MESSAGE)`; FAILED → `toast.error(SIGN_UP_FAILED_MESSAGE)`; returns true, and the caller skips its own `Sentry.captureException` and `giveUp()` toast. Anything else → false.
- Produces: `createNewUser(user: Partial<IAuth>, token?: string): Promise<SignUpResult>`: 409 (either code) → `ACCOUNT_EXISTS`, not reported; an AxiosError without a response (`ECONNABORTED` included) → `UNREACHABLE`, not reported; a 5xx or any other error → `FAILED`, reported once with `reportUnexpected`. It never throws.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/middleware.test.ts` (the file's existing request helpers):
- `answers a server action without a session with 401 instead of replaying it at sign-in`: POST `/connections` with header `next-action: abc123`, no cookie → status 401, `body.code === 'SESSION_EXPIRED'`, no `location` header.
- `lets a server action on the sign-in page run without a session`: POST `/sign-in` with `next-action`, no cookie → passes through (`NextResponse.next()`, no redirect, not 401).
- The existing `sends pages to sign in` still passes.

`Brand.test.tsx`: `does not create a workspace in a tab without a session`: owner, brands route → `{ workspace: null, brands: [] }`, `useGlobalAccount` → `{ currentUser: null }` → `getOrCreateLicenseWorkspace` not called and no error shown; the existing `creates the workspace once for the owner when there is none` sets a `currentUser`.

`__tests__/unit/actions/createNewUser.test.ts` (node env; mock `@/services/dimoDevAPI` so `dimoDevAPIClient` resolves `{ post: mockPost }`; mock `@sentry/nextjs`):
- `returns the user`: post resolves `{ data: user }` → `{ ok: true, data: user }`.
- `says an account exists for a 409, without reporting it`: 409 `{ code: 'ACCOUNT_EXISTS' }` → `{ ok: false, reason: 'ACCOUNT_EXISTS' }`; same for `EMAIL_TAKEN`; `captureException` not called.
- `says the console could not be reached for a network failure, without reporting it`: AxiosError code `ECONNABORTED`, no response → `{ ok: false, reason: 'UNREACHABLE' }`; not captured.
- `reports a 500 once`: → `{ ok: false, reason: 'FAILED' }`; `captureException` called once.

`__tests__/unit/pages/sign-up/signUpRefusal.test.tsx`:
- `explainSignUpRefusal` per reason: the toast text and, for ACCOUNT_EXISTS, `action.label === 'Sign in'` whose `onClick` calls `goToSignIn`; false for `new Error('x')`.
- `WalletCreation tells an existing account to sign in, without reporting a crash`: mock `useAuth().loginWithPasskey` to reject with `new SignUpRefusedError('ACCOUNT_EXISTS')` once creation completes (follow `__tests__/unit/pages/sign-up/WalletCreation.test.tsx`'s setup) → `toast.error` called with `ACCOUNT_EXISTS_MESSAGE`; `Sentry.captureException` not called.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false createNewUser signUpRefusal middleware "details/Brand.test"`
Expected: FAIL: `createNewUser` throws the AxiosError; `@/app/sign-up/signUpResult` not found.

- [ ] **Step 3: Implement** per Interfaces. `signIntoDimo` checks `createNewUser`'s result and throws `new SignUpRefusedError(result.reason)` when it isn't `ok`.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false createNewUser signUpRefusal WalletCreation sign-in middleware Brand`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(sign-in): no authenticated call before login; sign-up says an account exists instead of failing"
```

### Task 11: Connections: unreadable rows, gone rows, Discard, taken names (SEC-5, FLOW-1 console sides)

**Files:**
- Modify: `src/actions/connections.ts` (types; `createConnection` and `deleteConnection` return `ApiResult`; `getConnectionById` no longer returns null)
- Modify: `src/app/api/connections/[id]/route.ts` (comment only: a deleted row now answers 404, which `upstreamFailure` passes through)
- Create: `src/app/connections/components/DiscardConnection.tsx`, `src/app/connections/copy.ts`
- Modify: `src/app/connections/components/View/View.tsx`, `src/app/connections/[id]/components/View/View.tsx`, `src/app/connections/create/[owner]/components/View/View.tsx`
- Test: `__tests__/unit/actions/connections.test.ts`, `__tests__/unit/app/api/connectionReadRoutes.test.ts` (the `200 null` case becomes 404), `__tests__/unit/pages/connections/CreateConnection.test.tsx`, `__tests__/unit/pages/connections/DiscardConnection.test.tsx`, `__tests__/unit/pages/connections/ConnectionDetails.test.tsx`, `__tests__/unit/pages/connections/ConnectionsList.test.tsx`

**Interfaces:**
- Consumes (Task 3 wire), verbatim: owner rows carry `keys_unreadable: boolean`; when `true`, `connection_license_private_key` and `device_issuance_key` are `null`; member rows have keys `null` and no `keys_unreadable`. `GET|PUT|DELETE /api/my/connections/:id` for a missing or deleted row → 404 `{ message: 'Connection not found', code: 'CONNECTION_NOT_FOUND' }`. Backwards status → 409 `INVALID_STATUS_TRANSITION`.
- Consumes (Task 5 wire), verbatim: `DELETE /api/my/connections/:id`: PENDING → 200; MINTED or READY → 409 `{ message: 'Only a connection whose setup has not minted it can be discarded', code: 'CONNECTION_NOT_PENDING' }`; 404 `CONNECTION_NOT_FOUND`. POST/PUT with a name the team uses → 409 `{ message: 'Your team already has a connection with this name', code: 'CONNECTION_NAME_TAKEN' }`.
- Consumes (Task 9): `toFailure`. Existing: `findMintedConnection` (`@/services/connectionLookup`), `HttpError`, `invalidateMyConnectionsQuery`, `OwnerAction`, `DeleteConfirmationModal`.
- Produces (`src/actions/connections.ts`): `Connection` keys typed `string | null` and `keys_unreadable?: boolean` (absent reads as false); `createConnection(data: CreateConnectionRequest): Promise<ApiResult<Connection>>` and `deleteConnection(id: string): Promise<ApiResult<null>>`, both through `toFailure` (never throw for an HTTP failure; the AxiosError, which carries the keys in its config, is stripped before it is reported); `getConnectionById(id: string): Promise<Connection>` (a deleted row rejects with the 404).
- Produces (`src/app/connections/copy.ts`): `KEYS_UNREADABLE_CHIP = "Keys can't be read"`, `CONNECTION_GONE_DETAIL = 'This connection no longer exists.'`, `KEYS_UNREADABLE_DETAIL = "This connection's keys can't be read. Contact developer support."`, `KEYS_UNREADABLE_ON_RESUME = "This connection's keys can't be read, so setup can't continue. Contact developer support."`, `NAME_TAKEN_IN_TEAM = 'Your team already has a connection with this name. Choose another.'`, `DISCARD_SUBTITLE = 'Its saved keys are deleted for good. Discard only a connection whose setup never minted it.'`, `DISCARD_MINTED = 'This connection was minted. Use Finish setup instead.'`, `DISCARD_LOOKUP_FAILED = "Couldn't check whether this connection was minted, so nothing was discarded. Try again."`, `DISCARD_NOT_PENDING = "This connection is past setup, so it can't be discarded."`, `DISCARD_FAILED = "Couldn't discard the connection. Try again."`, `DISCARDED = 'Connection discarded'`.
- Produces: `DiscardConnection({ connection }: { connection: Connection })`: renders nothing unless `connection.status === 'PENDING'`; wrapped in `OwnerAction`; a secondary `Discard` button opens `DeleteConfirmationModal` titled `` `Discard ${connection.name}?` `` with `DISCARD_SUBTITLE`. On confirm, in order: `findMintedConnection(connection.name)`; a holder equal to `currentUser.smartContractAddress` (case-insensitive) → `toast.error(DISCARD_MINTED)`, stop; a lookup that throws → `toast.error(DISCARD_LOOKUP_FAILED)`, stop; otherwise `deleteConnection(id)`: ok → `toast.success(DISCARDED)`; `code === 'CONNECTION_NOT_PENDING'` → `toast.error(DISCARD_NOT_PENDING)`; `status === 404` → no toast; anything else → `toast.error(DISCARD_FAILED)`; every outcome but the two stops ends with `invalidateMyConnectionsQuery()`.
- List (`View.tsx`): an unreadable row shows a `StatusChip tone="off"` reading `KEYS_UNREADABLE_CHIP` and no Finish setup link; `<DiscardConnection>` sits under Finish setup.
- Details: a query error that is an `HttpError` with status 404 renders `CONNECTION_GONE_DETAIL` and a `Back to Connections` link instead of the generic error; `keys_unreadable` replaces the private-key and device-key rows (and the derived device address) with `KEYS_UNREADABLE_DETAIL`; the public key still shows.
- Resume (`create/[owner]`): a rejection that is an `HttpError` 404 → `CONNECTION_GONE`; any other rejection → `LOAD_FAILED`; `keys_unreadable` → `KEYS_UNREADABLE_ON_RESUME`, checked before `OWNER_ONLY`. New setup: `createConnection`'s result with `code === 'CONNECTION_NAME_TAKEN'` shows `NAME_TAKEN_IN_TEAM` under the name field (the `nameValidationError` slot) and closes the purchase modal; any other failure stays `KEYS_NOT_SAVED`. `removeRefusedConnection` reads `deleteConnection`'s result instead of catching.

- [ ] **Step 1: Write the failing tests**

`connections.test.ts` (actions): `createConnection returns console-api's refusal instead of throwing` (409 `CONNECTION_NAME_TAKEN` → `{ ok: false, status: 409, code: 'CONNECTION_NAME_TAKEN' }`); `deleteConnection returns CONNECTION_NOT_PENDING`; `a failed create never reports the keys` (500 whose `config.data` holds the private key → the captured error has no `config.data`).

`connectionReadRoutes.test.ts`: `GET /api/connections/[id] answers 404 for a deleted connection` (action rejects with an AxiosError of status 404 → 404).

`DiscardConnection.test.tsx` (mock `@/actions/connections`, `@/services/connectionLookup`, `@/hooks` `useGlobalAccount`, `sonner`, `@/hooks/queries/useMyConnections`; render inside a `TeamContext` owner value, as `OwnerOnly.test.tsx` does):
- `offers Discard only on a PENDING connection` (none for MINTED or READY) `and only to the owner` (none for a member).
- `asks before discarding`: click → dialog `Discard Fleet link?` with `DISCARD_SUBTITLE`; `deleteConnection` not called until confirm.
- `discards when nobody holds the name`: lookup → `null` → `deleteConnection('c1')`, `toast.success('Connection discarded')`, the list invalidated.
- `refuses to discard a connection the user's wallet minted`: lookup → `{ owner: <smartContractAddress upper-cased>, tokenId: '1' }` → `DISCARD_MINTED`; `deleteConnection` not called.
- `discards when another wallet holds the name`.
- `discards nothing when the lookup fails`: lookup rejects → `DISCARD_LOOKUP_FAILED`; `deleteConnection` not called.
- `says when the connection moved past setup`: `{ ok: false, status: 409, code: 'CONNECTION_NOT_PENDING' }` → `DISCARD_NOT_PENDING`, list invalidated.

`ConnectionsList.test.tsx`: `shows an unreadable row instead of failing the page`: `/api/connections` answers a plaintext row, a decrypted row and `{ keys_unreadable: true, status: 'PENDING', connection_license_private_key: null }` → three cards, the third with `Keys can't be read`, no Finish setup link on it, Discard offered.

`ConnectionDetails.test.tsx`: `says a deleted connection no longer exists` (fetch 404 → `CONNECTION_GONE_DETAIL`, `Back to Connections`); `says when the keys can't be read` (`keys_unreadable: true` → `KEYS_UNREADABLE_DETAIL`, public key shown, no Copy for the private keys).

`CreateConnection.test.tsx`: `stops a resume of a deleted connection as gone` (fetch 404 → `CONNECTION_GONE`); `stops a resume whose keys can't be read` (→ `KEYS_UNREADABLE_ON_RESUME`); `says the team already uses the name` (`createConnection` → 409 `CONNECTION_NAME_TAKEN` → `NAME_TAKEN_IN_TEAM` shown, no mint attempted).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false connections connectionReadRoutes CreateConnection DiscardConnection ConnectionDetails ConnectionsList`
Expected: FAIL: `createConnection` throws; no Discard; the details page renders nothing for a deleted row.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false connections connectionReadRoutes CreateConnection DiscardConnection ConnectionDetails ConnectionsList ConnectionsListFailure`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "feat(connections): show unreadable and deleted connections as such, discard a PENDING one, refuse a taken name"
```

### Task 12: Console access is a button, never a transaction on open (SIG-1, SIG-2)

**Files:**
- Modify: `src/hooks/useDimoAuth.ts` (add `findConsoleKeyAddress`)
- Create: `src/app/license/[tokenId]/details/components/Signers/consoleAccess.ts` (copy and pure helpers), `src/app/license/[tokenId]/details/components/Signers/ConsoleAccess.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx` (remove `handleOwnerSigner` and its mount effect; `enableConsoleAccess`; console key row; button label), `.../Signers/BelongsTo.tsx` (`consoleKey` prop), `.../Signers/KeyHoldersModal.tsx` (generate-mode copy), `src/components/GenerateDevJWTModal/GenerateDevJWTModal.tsx` (subtitle)
- Test: `__tests__/unit/pages/license/[tokenId]/details/Signers.test.tsx` (the mount-time case `does not re-enable an owner key listed in another letter case` becomes a button case), `__tests__/unit/pages/license/[tokenId]/details/ConsoleAccess.test.tsx`

**Interfaces:**
- Consumes: `useEnableSigner`, `useEventEmitter('generate-my-developer-jwt')`, `useDimoAuth().hasGlobalAccountPrivateKey` (may create the Turnkey "Dev-Console" key: off-chain) and `.getGlobalAccountDeveloperJwt`, `getDevJwt` (`@/utils/devJwt`: the newest stored JWT for the license that hasn't expired), `upsertLicenseSigner` + `registryWrite`, `txErrorStatus` (`@/utils/txErrorStatus`), `useTeamMembers`, `useEventEmitter('developer-jwt-updated')`.
- Produces (`useDimoAuth`): `findConsoleKeyAddress(): Promise<`0x${string}` | null>`: `validateCurrentSession`, then `getPrivateKeys` only; never creates a key, never signs.
- Produces (`consoleAccess.ts`):
  - `CONSOLE_KEY_NOTE = 'Console'`: the registry note on the console key's row (`kind: 'API_KEY'`, holders `[{ userId: <the OWNER member's userId> }]`), which is how a member learns console access is on.
  - `isConsoleAccessOn({ consoleKey, signers, registry }: { consoleKey: string | null; signers: string[]; registry: Map<string, LicenseSignerRecord> }): boolean`: for the owner (`consoleKey` set), the key is an on-chain signer; for a member (`consoleKey` null), some on-chain signer has a registry row with `note === CONSOLE_KEY_NOTE` and no `disabledAt`. Addresses compared lower-case.
  - Copy: `CONSOLE_ACCESS_EXPLAINER = 'Console access lets this console make developer JWTs for this license, so you can test without creating an API key. Turning it on adds your console key as a signer, in one transaction.'`; button `Enable console access`; progress `Turning on console access…`; `MEMBER_CONSOLE_OFF = "The license owner hasn't turned on console access yet."`; `NOT_LICENSE_OWNER_ON_CHAIN = "Your console wallet doesn't own this license on-chain, so it can't turn on console access."`; `CONSOLE_KEY_LABEL = 'Console (you)'`; `Copy JWT`; `NO_REDIRECT_URI_FOR_JWT = 'Add a redirect URI below to make developer JWTs.'`; `JWT_FAILED = "Couldn't make a JWT. Try again."`; `API_KEY_BUTTON = 'Create an API key for your server'`; `API_KEY_EXPLAINER = 'For apps that mint developer JWTs on their own servers. To test from the console, use Copy JWT.'`.
- Produces (`ConsoleAccess.tsx`): `ConsoleAccess(props: { isLicenseOwner: boolean; on: boolean; enabling: boolean; error: string | null; onEnable: () => void; clientId: `0x${string}`; domain: string | undefined })`. Off, owner: explainer, the button (disabled while `enabling`), inline progress, inline `error` (`role="alert"`). Off, member: `MEMBER_CONSOLE_OFF`, no button. On, owner: `Copy JWT` (disabled with `NO_REDIRECT_URI_FOR_JWT` when `domain` is undefined): copies `getDevJwt(clientId)`; when there is none, `getGlobalAccountDeveloperJwt({ clientId, domain })` first, then reads again; `navigator.clipboard.writeText(token)`, `toast.success('JWT copied!')`, `publishEvent({}, true)` on `developer-jwt-updated`; a failure → `toast.error(JWT_FAILED)`. On, member: nothing.
- Produces (`Signers.tsx`):
  - No effect sends a transaction, calls `hasGlobalAccountPrivateKey` or publishes `generate-my-developer-jwt` on mount. The owner's console key comes from `useQuery({ queryKey: ['console-key', currentUser?.subOrganizationId], queryFn: findConsoleKeyAddress, enabled: isLicenseOwner && !!currentUser })`; members never run it.
  - `enableConsoleAccess()`: when `fragment.owner` isn't `currentUser.smartContractAddress` (case-insensitive) → error `NOT_LICENSE_OWNER_ON_CHAIN`, nothing sent; else `hasGlobalAccountPrivateKey()`; when that key isn't an on-chain signer, `handleEnableSigner(address)` (the one transaction) and `await refetch()`; record the registry row (`registryWrite(() => upsertLicenseSigner(tokenId, address, { kind: 'API_KEY', note: CONSOLE_KEY_NOTE, holders: [{ userId }] }))`, a failure ignored as `recordKey` does); `publishEvent({ client_id: address }, true)`; refresh the `console-key` query. Errors show inline via `txErrorStatus(error).label`; `setLoadingStatus` is not used.
  - Owner, console key already an on-chain signer with no registry row (licenses like #1254): record the registry row once per mount. A console-api write, not a transaction.
  - The console key's row: `BelongsTo` gets `consoleKey` and renders `CONSOLE_KEY_LABEL` with no Assign; row actions are only `{ label: 'Turn off console access', destructive: true }` (the existing delete flow).
  - The `Generate key` button reads `API_KEY_BUTTON`; `KeyHoldersModal` in generate mode shows `API_KEY_EXPLAINER`; `GenerateDevJWTModal`'s subtitle becomes `Test an API key you created for your server: this makes a developer JWT from it and the license's first redirect URI. To get a JWT without an API key, turn on console access and use Copy JWT.`

- [ ] **Step 1: Write the failing tests**

`Signers.test.tsx` (extend the file's mocks: `useDimoAuth` → `{ hasGlobalAccountPrivateKey, findConsoleKeyAddress, getGlobalAccountDeveloperJwt }`, `useEnableSigner` → `enableSigner`, `useGlobalAccount` → a user whose `smartContractAddress` equals the fragment owner; wrap renders in a `QueryClientProvider` with `retry: false`):
- `sends no transaction when the owner opens the tab`: console key not a signer → explainer and `Enable console access` shown; `enableSigner`, `hasGlobalAccountPrivateKey` and `publishEvent` not called.
- `sends exactly one transaction from the button`: click → `enableSigner` called once with the key address; `refetch` called; `upsertLicenseSigner` called with `(tokenId, address, { kind: 'API_KEY', note: 'Console', holders: [{ userId: <owner's userId> }] })`; `publishEvent` called with `{ client_id: address }`.
- `shows a member no button and triggers nothing`: member → no `Enable console access`; `MEMBER_CONSOLE_OFF` shown; `findConsoleKeyAddress`, `hasGlobalAccountPrivateKey`, `enableSigner` not called.
- `tells a member nothing once console access is on`: a registry row with note `Console` for an on-chain signer → no `MEMBER_CONSOLE_OFF`.
- `labels the console key Console (you) with no Assign`: the key is a signer → its row reads `Console (you)`; no `Assign` in that row; its menu holds exactly `Turn off console access`.
- `records the registry row for a key enabled before, without a transaction`: key is a signer, no registry row → `upsertLicenseSigner` called once; `enableSigner` not called.
- `shows a failed enable on the card`: `enableSigner` rejects `{ code: 4001 }` → `role="alert"` reads `The transaction was denied`; `setLoadingStatus` not called.
- `refuses before sending when the console wallet doesn't own the license`: `fragment.owner` differs → `NOT_LICENSE_OWNER_ON_CHAIN`; `enableSigner` not called.
- `labels the API key button for servers`: `Create an API key for your server`.

`ConsoleAccess.test.tsx` (mock `@/hooks` `useDimoAuth`/`useEventEmitter`, `navigator.clipboard.writeText`, `sonner`; seed JWTs with `saveDevJwt`):
- `copies the license's stored JWT`: an unexpired JWT stored → click `Copy JWT` → `writeText` called with it; `getGlobalAccountDeveloperJwt` not called; `toast.success('JWT copied!')`.
- `makes a JWT to copy when none is stored`: none stored → `getGlobalAccountDeveloperJwt` called once with `{ clientId, domain: 'https://a.test' }` (it stores one, as the real hook does) → `writeText` called with that token.
- `skips an expired JWT`.
- `can't copy without a redirect URI`: `domain` undefined → button disabled, `NO_REDIRECT_URI_FOR_JWT` shown.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false Signers ConsoleAccess KeyHoldersModal`
Expected: FAIL: mounting as owner calls `hasGlobalAccountPrivateKey`; no button; `ConsoleAccess` not found.

- [ ] **Step 3: Implement** per Interfaces. `ConsoleAccess` renders between the card header and the table.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false Signers ConsoleAccess KeyHoldersModal DevJwtPrompt devJwt`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "feat(signers): turn on console access with a button instead of a transaction on open; Copy JWT"
```

### Task 13: Deleting an API key doesn't hold the page (SIG-4)

**Files:**
- Modify: `src/components/DeleteConfirmationModal/DeleteConfirmationModal.tsx` (optional progress label and error), `src/app/license/[tokenId]/details/components/Signers/Signers.tsx` (`handleDelete`, the dialog's copy)
- Test: `__tests__/unit/pages/license/[tokenId]/details/Signers.test.tsx`, `__tests__/unit/components/DeleteConfirmationModal.test.tsx`

**Interfaces:**
- Consumes (Task 12): the console key row and its `Turn off console access` action.
- Produces (`DeleteConfirmationModal`): props `loadingLabel?: string` (shown under the buttons while `onConfirm` runs) and `error?: string | null` (shown with `role="alert"`; the dialog stays open); `onConfirm` may reject, which ends the loading state. Existing callers are unaffected.
- Produces (`Signers.tsx`):
  - Subtitles: `DELETE_KEY_SUBTITLE = 'Apps using this key stop getting new developer JWTs. JWTs already issued with it keep working until they expire, up to 14 days.'`; for the console key, title `Turn off console access?` and `CONSOLE_OFF_SUBTITLE = 'The console stops making developer JWTs for this license. JWTs it already made keep working until they expire, up to 14 days.'`
  - `loadingLabel = 'Waiting for the network to confirm…'`.
  - `onConfirm` awaits only `handleDisableSigner(signer)`; the dialog closes when it resolves. Then, without awaiting: add the address to `pendingRemovals`, `registryWrite(() => markLicenseSignerDisabled(...))`, `registry.refetch()`, `refetch()` (which clears `pendingRemovals` as today); `toast.success('API key deleted. JWTs already issued with it work until they expire (up to 14 days).')` (for the console key: `'Console access turned off.'`). A rejection sets the dialog's `error` to `txErrorStatus(error).label` and reports it to Sentry; the row stays. `setLoadingStatus` is no longer used for a delete.

- [ ] **Step 1: Write the failing tests**

`Signers.test.tsx`:
- `closes the dialog as soon as the transaction confirms`: `disableSigner` returns a deferred promise; `markLicenseSignerDisabled` returns a promise that never settles → after confirm the dialog shows `Waiting for the network to confirm…`; resolve the deferred → the dialog is gone and the row is gone, although the registry stamp is still pending.
- `never covers the page with the loading modal`: `setLoadingStatus` never called with `expect.objectContaining({ status: 'loading' })` during a delete.
- `says before deleting that issued JWTs keep working`: the dialog's subtitle contains `up to 14 days`.
- `shows a failed transaction in the dialog`: `disableSigner` rejects `{ code: 4001 }` → the dialog stays with `The transaction was denied`; the row is still listed.
- Update `stamps the registry when an API key is deleted` to the new flow.

`DeleteConfirmationModal.test.tsx`: `shows the progress label while confirming`, `shows an error and stays open when confirming fails`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false Signers DeleteConfirmationModal`
Expected: FAIL: the dialog closes at once and `setLoadingStatus` shows the blocking modal until the registry stamp returns.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false Signers DeleteConfirmationModal`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(signers): close the delete dialog when the transaction confirms and say issued JWTs keep working"
```

### Task 14: Redirect URI changes show at once (SIG-3)

**Files:**
- Create: `src/utils/identityOverlay.ts`
- Modify: `src/app/settings/components/Team/signerOverlay.ts` (re-export `OVERLAY_MS` from `identityOverlay`; `applySignerOverlay` built on `applyToggles`), `src/app/settings/components/Team/TeamSection.tsx` (import `IDENTITY_INDEX_DELAY_MS`)
- Create: `src/app/license/[tokenId]/details/components/redirectUriOverlay.tsx`
- Modify: `src/app/license/[tokenId]/details/components/View/View.tsx` (the provider in `LicenseDetailsContent`; `IDENTITY_API_UPDATE_DELAY` replaced by the imported `IDENTITY_INDEX_DELAY_MS`), `.../RedirectUris/RedirectUris.tsx` (drop its own `optimisticAdditions`/`pendingRemovals`), `.../DeveloperJwts/DeveloperJwts.tsx`, `.../Signers/Signers.tsx` (RentalOS URI check; `ConsoleAccess`'s `domain`)
- Test: `__tests__/unit/utils/identityOverlay.test.ts`, `__tests__/unit/pages/license/[tokenId]/details/RedirectUris.test.tsx`; the existing signer overlay and TeamSection tests pass unchanged

**Interfaces:**
- Produces (`identityOverlay.ts`): `IDENTITY_INDEX_DELAY_MS = 6000` and `OVERLAY_MS = 60_000` (moved, values unchanged); `interface ValueToggle { value: string; enabled: boolean; at: number }`; `applyToggles(values: string[], toggles: ValueToggle[], now: number): string[]`: toggles younger than `OVERLAY_MS` apply in order (enabled → appended if missing; disabled → removed); exact string match (`signerOverlay` lower-cases before calling).
- Produces (`redirectUriOverlay.tsx`): `RedirectUriOverlayProvider({ refetch, children }: PropsWithChildren<{ refetch: () => Promise<void> }>)` and `useRedirectUris(indexed: { uri: string }[]): { uris: { uri: string }[]; recordUriChange: (uri: string, enabled: boolean) => void }`. `recordUriChange` adds a toggle stamped `Date.now()` and calls `refetch()` (the page's refetch already waits `IDENTITY_INDEX_DELAY_MS`); the overlay re-renders when its oldest live toggle expires. Outside a provider the hook returns `indexed` and a no-op.
- Consumers: `RedirectUris` lists `useRedirectUris(fragment.redirectURIs.nodes).uris` and passes `recordUriChange(uri, true|false)` as `onAdded`/`onRemoved`; `DeveloperJwts` takes its `domain` and its auto-JWT check from the overlaid list; `Signers` uses it for the RentalOS URI check and for `ConsoleAccess`'s `domain`.

- [ ] **Step 1: Write the failing tests**

`identityOverlay.test.ts`: `adds an enabled value Identity doesn't list yet`, `removes a disabled value Identity still lists`, `applies changes in order` (add then remove the same value → absent), `forgets a change after a minute` (`now = at + OVERLAY_MS` → unchanged list).

`RedirectUris.test.tsx` (render `RedirectUris` and `DeveloperJwts` inside `RedirectUriOverlayProvider` with a mocked `refetch`; mock `RedirectUriForm`/`RedirectUriList` to expose their `onAdded`/`onRemoved`; fake timers):
- `lists an added URI through a refetch that doesn't have it yet`: `onAdded('https://a.test')` → listed; rerender with the same empty fragment (a stale refetch) → still listed; `refetch` called once; advance 60 s → gone.
- `drops a deleted URI at once and keeps it dropped through a stale refetch`.
- `lets Generate new JWT use a URI the moment it is added`: `GenerateDevJWT` mocked; after `onAdded('https://a.test')` its `domain` prop is `https://a.test`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false identityOverlay RedirectUris`
Expected: FAIL: `@/utils/identityOverlay` not found; the added URI disappears after the stale refetch.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false identityOverlay RedirectUris signerOverlay TeamSection Signers View`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(redirect-uris): show an added or removed URI until Identity catches up"
```

### Task 15: The configurator says why it can't save, shows no fake value, and waits for saved values (SIG-5)

**Files:**
- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ConfigurationForm.tsx` (no-URI notice), `.../ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx` (template ID field), `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx` (loader), `src/app/license/[tokenId]/details/components/View/View.tsx` (`?tab=`)
- Test: `__tests__/unit/configurator/ConfigurationForm.test.tsx`, `__tests__/unit/configurator/EditView.test.tsx`, `__tests__/unit/pages/license/[tokenId]/details/View.test.tsx`

**Interfaces:**
- Produces: `NO_REDIRECT_URI = "This license has no redirect URI yet, so a configuration can't be saved. Add one on the license's Config tab."`, shown under the Redirect URI select when `fragment.redirectURIs.nodes` is empty, with a link `Go to the Config tab` to `` `/license/${tokenId}/details?tab=config` ``.
- Produces: license details read `tab` from `useSearchParams()`; one of `overview | config | vehicles | brand` opens that tab, anything else opens `overview` (the `Tab` type).
- Produces: the permissions template ID field has no placeholder and a hint below it, `TEMPLATE_ID_HINT = 'The number of a permissions template, for example 1.'`; the `required` message stays.
- Produces (edit page): a `filled` state set by the effect that calls `reset(toFormValues(...))`; until then `<Loader isLoading />` replaces the form; a load error replaces it with `Couldn't load this configuration. Reload the page to try again.` (the toast stays). The last wave's `useRestQuery` (`staleTime: Infinity`, `gcTime: 0`) and fill-once ref stay.

- [ ] **Step 1: Write the failing tests**

`ConfigurationForm.test.tsx`:
- `says why it can't save without a redirect URI and links to the Config tab`: fragment with no URIs → `NO_REDIRECT_URI` shown; the link's `href` is `/license/1254/details?tab=config`.
- `shows no notice when the license has a redirect URI`.
- `leaves the template ID empty with a hint`: Share vehicles, template mode → the input has no `placeholder` attribute and value `''`; `TEMPLATE_ID_HINT` shown.

`EditView.test.tsx`:
- `shows a loader, not empty defaults, until the saved values arrive`: the configuration fetch pending → a loader and no `configuration_name` input; resolve → the name input holds the saved name.
- `says when the configuration can't be loaded`: fetch 502 → the load error text, no form.

`View.test.tsx` (license details): `opens the Config tab from ?tab=config` (mock `useSearchParams` → `tab=config` → the Config tab is `aria-selected="true"`); `ignores an unknown tab`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false ConfigurationForm EditView "details/View"`
Expected: FAIL: no notice; placeholder `1`; the edit form renders defaults while loading.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false configurator "details/View"`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(configurator): say why a license without a redirect URI can't save, no fake template ID, load before editing"
```

### Task 16: Brands: confirm before deleting; the last brand can go (BRAND-1 UI, BRAND-2)

**Files:**
- Modify: `src/app/license/[tokenId]/details/components/Brand/components/BrandRow.tsx` (`canDelete`), `src/app/license/[tokenId]/details/components/Brand/Brand.tsx` (confirm dialog)
- Test: `__tests__/unit/pages/license/[tokenId]/details/BrandRow.test.tsx`, `__tests__/unit/pages/license/[tokenId]/details/Brand.test.tsx`

**Interfaces:**
- Consumes (Task 6 wire): `DELETE /api/my/workspace/:id/brands/:brandId` → 204 for the last brand too; the public lookup then answers 404.
- Produces: `canDelete = !isMultiple || !brand.isDefault` (the default among several still waits for another default, which the disabled button's title already says). The comment above it is rewritten.
- Produces: the trash button opens `DeleteConfirmationModal` titled `` `Delete ${brand.name}?` ``; subtitle `LAST_BRAND_DELETE = "Login with DIMO goes back to DIMO's own look for this license. Pages already open can take a few minutes to change."` when it is the only brand, else `BRAND_DELETE = "Sites that ask for this brand by name get DIMO's own look instead. Pages already open can take a few minutes to change."`; `handleDelete` runs only from the dialog's confirm.

- [ ] **Step 1: Write the failing tests**

`BrandRow.test.tsx`: `lets the only brand be deleted` (single default → trash enabled); `keeps the default among several undeletable` (title `Set another brand as default before deleting this one`).

`Brand.test.tsx`:
- `asks before deleting a brand`: click trash → `Delete Fleet App?` with `BRAND_DELETE`; `deleteMyBrand` not called; Cancel → still not called.
- `deletes the last brand after confirming`: one default brand → confirm → `deleteMyBrand(workspaceId, brandId)`; the empty state renders; the dialog said `LAST_BRAND_DELETE`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false BrandRow "details/Brand.test"`
Expected: FAIL: the last brand's trash is disabled; a click deletes without asking.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false BrandRow Brand BrandForm`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "fix(brand): confirm before deleting a brand, and allow deleting the last one"
```

### Task 17: The Connections link stays, titles are right, an empty list says so; the PR template (UX-1, UX-2, UX-3, REL-1)

UX-1 root cause (from the code, medium confidence; confirm in the network tab next time it happens by reading the `CheckHasDeveloperLicenses` response): `Menu` shows Connections when `licensesLoading || hasDeveloperLicenses` (`src/components/Menu/Menu.tsx`). `useHasDeveloperLicenses` turns a failed Identity query into "no licenses": with Apollo's default `errorPolicy: 'none'` and no retry, a failed request leaves `data` undefined and `loading` false, so `hasDeveloperLicenses` is false and the link drops. Errors aren't cached, so the next section (each mounts its own `AuthorizedLayout`) asks again and the link comes back: present while loading, gone after one load, back later, as QA saw. Ruled out: another query overwriting the `developerLicenses(first: 1, …)` cache field (no other query uses those arguments), `skip` toggling (Apollo reports `loading: true` in the same render), `isMember` (it would hide Webhooks too), and the fallback team (it would show the link).

**Files:**
- Modify: `src/hooks/useHasDeveloperLicenses.ts`, `src/components/Menu/Menu.tsx`
- Modify: `src/app/license/[tokenId]/configurator/page.tsx`, `src/app/license/[tokenId]/configurator/new/page.tsx`, `src/app/license/[tokenId]/configurator/[id]/page.tsx`, `src/app/license/vehicles/[clientId]/page.tsx` (`metadata.title`)
- Create: `src/components/Table/paginationSummary.ts`; Modify: `src/components/Table/PaginatedTable.tsx`, `src/components/Table/PaginatedTableIdentityAPI.tsx`
- Create: `.github/pull_request_template.md`
- Test: `__tests__/unit/hooks/useHasDeveloperLicenses.test.tsx`, `__tests__/unit/components/Menu.test.tsx`, `__tests__/unit/pages/pageTitles.test.ts`, `__tests__/unit/components/paginationSummary.test.ts`, `__tests__/unit/pages/license/vehicles/[clientId]/VehicleDetailsTable.test.tsx`

**Interfaces:**
- Produces (UX-1): `useHasDeveloperLicenses(): { hasDeveloperLicenses: boolean | null; loading: boolean; error: ErrorLike | undefined }`: `null` means unknown (no owner address yet, loading, an error, or no data); `true`/`false` only from an answered count. `Menu` passes `hasDeveloperLicenses !== false` to `getNavSections`, so only a definite "no licenses" hides Connections; `isMember` still hides it for members. `grep -rn useHasDeveloperLicenses src` must show no other caller reading the old boolean.
- Produces (UX-2): titles `` `SDK configurator | ${configuration.appName}` `` (list), `` `New configuration | ${configuration.appName}` ``, `` `Edit configuration | ${configuration.appName}` ``, `` `Licensed vehicles | ${configuration.appName}` ``, matching `getPageTitle`'s header titles.
- Produces (UX-3): `paginationSummary(pageIndex: number, pageSize: number, total: number): string` → `'Showing 0 of 0'` when `total` is 0, else `` `Showing ${first}–${last} of ${total}` ``; both tables use it.
- Produces (REL-1): `.github/pull_request_template.md` with `## What and why`, `## How it was tested`, `## Release` holding `Prod migration applied: yes / no / none` and `Needs console-api deployed first: yes / no`.

- [ ] **Step 1: Write the failing tests**

`useHasDeveloperLicenses.test.tsx` (`MockedProvider` from `@apollo/client/testing/react`; `TeamContext` value with an `ownerAddress`):
- `is unknown while there is no owner address` → `null`.
- `is unknown when Identity fails`: the mock answers with an error → `hasDeveloperLicenses === null`, `loading === false`, `error` set.
- `is true for a count above 0` and `is false for a count of 0`.

`Menu.test.tsx` (mock `@/hooks` `useHasDeveloperLicenses`):
- `keeps Connections when the license count is unknown`: `{ hasDeveloperLicenses: null, loading: false, error: new Error('x') }` → a `Connections` link.
- `hides Connections only for a definite no`: `false` → no link.
- `hides Connections from a member whatever the count`.

`pageTitles.test.ts` (mock each page's View module with a stub so only `metadata` is read): each of the four pages' `metadata.title` equals the value above.

`paginationSummary.test.ts`: `(0, 10, 0)` → `Showing 0 of 0`; `(0, 10, 25)` → `Showing 1–10 of 25`; `(2, 10, 25)` → `Showing 21–25 of 25`.

`VehicleDetailsTable.test.tsx`: `says an empty list is empty`: no vehicles → `Showing 0 of 0`, never `Showing 1–0 of 0`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false pageTitles paginationSummary VehicleDetailsTable useHasDeveloperLicenses`
Expected: FAIL: titles read `Settings` and `Vehicle Details`; `Showing 1–0 of 0`.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false pageTitles paginationSummary VehicleDetailsTable SubscribedVehicles Menu useHasDeveloperLicenses`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__ .github/pull_request_template.md
git commit -m "fix(ux): keep the Connections link, right page titles, empty lists say so; PR template asks about migrations"
```

---

## Release (the user's go-ahead, after review; not tasks)

Every prod command is the user's, run from their own terminal with their own credentials; nothing here prints a credential.

1. **init-db_13** (in progress, by the user). Confirm 13 and 14 are on prod, read-only:
   `SELECT to_regclass('workspace_brand_repairs_13') IS NOT NULL AS has_13, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND column_name = 'status') AS has_14;` Expected: `t, t`.
2. **Pre-check for init-db_15**, read-only (`SET default_transaction_read_only = on;` first): count only, no names:
   `SELECT count(*) AS duplicate_names, coalesce(sum(n), 0) AS rows_involved FROM (SELECT count(*) AS n FROM connections WHERE deleted IS NOT TRUE GROUP BY company_id, lower(name) HAVING count(*) > 1) d;` Expected `0, 0`. If not zero, list the rows to decide on, without keys: `SELECT id, company_id, status, created_at FROM connections WHERE deleted IS NOT TRUE AND (company_id, lower(name)) IN (SELECT company_id, lower(name) FROM connections WHERE deleted IS NOT TRUE GROUP BY 1, 2 HAVING count(*) > 1) ORDER BY company_id, created_at;` The user decides which to rename or delete (a PENDING test row from OPS-1 is the likely one).
3. **Ledger backfill** for what is already applied (a prod write; go-ahead needed):
   `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); INSERT INTO schema_migrations (version) VALUES (13), (14) ON CONFLICT (version) DO NOTHING;` If the API's Preview environment has its own `PG_URL`, repeat steps 1–4 on that database too, or preview builds fail the check.
4. **Apply init-db_15** before the API merge: `psql "$PG_URL" --single-transaction -v ON_ERROR_STOP=1 -f src/scripts/db/init-db_15.sql`. It records 15 itself. Verify: `SELECT version FROM schema_migrations ORDER BY version;` → 13, 14, 15.
5. **Build command.** In the console-api Vercel project (`--scope dimo-network`), check read-only that Build Command is the default (`npm run build`); an override to `next build` skips the check.
6. **Merge and deploy the API PR.** The build log shows `check-migrations: all 3 tracked migrations are recorded`.
7. **Verify BRAND-3:** `curl -sI "https://console-api.dimo.org/api/brand?clientId=<a branded license>"` twice: `cache-control: public, max-age=60, stale-while-revalidate=300`, `cf-cache-status: DYNAMIC`, second `x-vercel-cache: HIT`. Edit that brand in the console, then curl again: `x-vercel-cache: MISS`.
8. **Merge and deploy the console PR.**
9. **BRAND-1 cleanup** (master plan): delete QA Brand Two on #1254 and #1255 through the UI.
10. **Sentry:** DEVELOPER-CONSOLE-HY stops growing; new server-side AxiosErrors arrive as separate issues per upstream route and status (expect a burst of new issues on day one; that is the regrouping, not new failures). DEVELOPER-CONSOLE-10 gets no events for existing accounts.
11. **FLOW-1 leftover** (master plan OPS-1): if a PENDING "Finish setup" row from the OPS-1 test remains on TestOEM, the owner can now Discard it.
