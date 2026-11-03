# Console verified fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the per-license audit work, repair production brand data, and fix every issue that survived verification on 2026-11-02.

**Architecture:** Two repos: `dimo-developer-console` (Next 16, Jest) and `dimo-developer-console-api` (Next 14, Sequelize, Postgres, vitest). The chain, read through Identity, is the source of truth for who owns a license. Developer licenses are soulbound: every transfer and approval reverts, so an owner never changes.

**Tech Stack:** TypeScript, Next.js, Sequelize, Postgres, viem, Sentry, Node `crypto`.

**Spec:** the Scope table below. Each row was checked against the chain, Sentry, public source or a reproduction.

## Scope

| Task | Issue | Evidence |
|---|---|---|
| 1 | Finished work is uncommitted | Branch `fix/per-license-audit` in both repos |
| 2, 3 | Prod brand data: no default brand, misfiled brands | #82 bug; prod not yet read |
| 4 | Brand ownership check was justified by transfers, which can't happen | Decide from audit results |
| 5 | Connection balance check never blocks | License cost is $0; all 13 failing wallets hold 0 DIMO, about 62 needed |
| 6 | Server errors missing from Sentry | No Node-runtime event in 90 days; Edge events arrive |
| 7, 8 | Connection keys stored as sent, and lost if setup fails after mint | Reproduced; loss confirmed in code, never observed |
| 9 | Simulated vehicles don't reach the minting license | Grantee is DIMO's license #286. **Needs the owner's yes first** |
| 10 | 151-character sign-up crash; `+` emails break recovery | Both reproduced |
| 11 | Expired session on the data proxy reads as an upstream error | Reproduced |
| 12 | Unlisted webhook metrics can't be saved; dead `/api/webhook` | Error reproduced; route needs a session and has a placeholder RPC |
| 13 | `Vehicles.tsx` buttons ignore the license owner | Cosmetic: only by opening another team's license |

**Dropped after verification:** member "Reconnect" loop; old-grant vehicle listing.

**Gated, not planned:** accounts with no Global Account. Task 2 counts them. If the count is 0, close it. Otherwise it gets its own plan, because linking an account by email without proving the email allows takeover.

## Global Constraints

- Commit messages carry no `Co-Authored-By` trailer and no Claude attribution.
- Approving this plan authorizes commits and PRs on `fix/per-license-audit`. It does not authorize merging or deploying.
- The only production write in this plan is Task 3. It runs only after Task 2's results are reviewed.
- `~/.config/dimo/console-prod.env` is loaded, never printed, copied or committed. Audit output contains no emails.
- A connection private key is never written to the database unencrypted.
- No new on-chain grant ships without the owner's yes.
- console tests: `npx jest`. API tests: `npx vitest run`, with Postgres on port 55432 (README, "Running tests"; see the `console-api-test-postgres` memory for this Mac).
- Before each commit: `npx tsc --noEmit` is clean and ESLint is clean on changed files.
- API migrations run by hand: `init-db_NN.sql` must be safe to run twice, and its `.down.sql` must be safe on a database that never had it (docker `initdb.d` runs `.down` first).

## Review Focus

1. The browser dies after the mint lands and before `token_id` is saved. Resuming must find the existing connection, not re-mint into `NameAlreadyInUse`. Test in Task 8.
2. `CONNECTION_KEYS_SECRET` is missing or wrong in production. Writes must fail rather than store plaintext, and reads must error rather than return garbage. Tests in Task 7.
3. The key backfill runs twice, or stops halfway. Reads must handle plaintext and encrypted rows side by side. Tests in Task 7.
4. The DIMO balance read fails. The user must not be told they're short of DIMO. Test in Task 5.
5. Identity fails during the audit. A non-empty `unavailable` list means Task 4 can't conclude anything. Check in Task 4.

---

## Phase 1: Land and repair

### Task 1: Commit the finished work and open PRs

**Files:** everything on `fix/per-license-audit` in both repos, including this plan.

- [ ] **Step 1: Verify both repos**

Run `npx vitest run` in the API and `npx jest` in the console.
Expected: API 228 passing, console 1,193 passing, 0 failures.

- [ ] **Step 2: Commit and push the API**

```bash
git add -A && git commit -m "fix(brand): chain-checked ownership, clear save errors, data audit and repair"
git push -u origin fix/per-license-audit
```

- [ ] **Step 3: Commit and push the console** with `fix(console): per-license workflows, honest failures, Server Action limits`.

- [ ] **Step 4: Open both PRs.** The API PR must list `init-db_13.sql` as a manual step. The console PR must state that `experimental.serverActions` puts `allowedOrigins` into effect for the first time, so `console-staging` needs a smoke test.

### Task 2: Audit production (read-only)

**Blocked until** `~/.config/dimo/console-prod.env` exists with `PG_URL=...`.

**Files:**
- Modify: `dimo-developer-console-api/src/scripts/ops/audit-console-data.mjs`
- Test: `dimo-developer-console-api/test/db/audit-data.test.ts`

**Interfaces:**
- Produces: `auditAccounts(client: pg.Client, accountsUrl: string): Promise<{ checked: number; missing: number; unavailable: number }>`. Counts only, never emails.

- [ ] **Step 1: Write the failing test** `counts console users with no Global Account, without printing them`: stub `fetch` so one email answers 404 and one 200, then assert `{ checked: 2, missing: 1, unavailable: 0 }` and that the JSON contains no `@`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run test/db/audit-data.test.ts`
Expected: FAIL, `auditAccounts` is not exported.

- [ ] **Step 3: Implement `auditAccounts`.** `GET ${accountsUrl}/api/account/${encodeURIComponent(email)}` per user, 5 at a time. 404 counts as missing; any other failure counts as unavailable. Add it to `runAudit` behind an `accountsUrl` option, read from `ACCOUNTS_API_URL` in the main block (the production value of the console's `NEXT_PUBLIC_GA_API`).

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run test/db/audit-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** with `feat(ops): count console users with no Global Account`.

- [ ] **Step 6: Run the audit against production**

```bash
ACCOUNTS_API_URL=<production NEXT_PUBLIC_GA_API> node --env-file=$HOME/.config/dimo/console-prod.env src/scripts/ops/audit-console-data.mjs
```

Expected: `session_read_only` is `on`, and `migration_11_*` and `migration_12_*` are `true`. If a migration is missing, stop and report it.

- [ ] **Step 7: Report the results to the owner** before Task 3, including `licenses.multiLicense`, which lists the possible misfiled brands.

### Task 3: Repair production brand data

**Blocked until** the owner has seen Task 2's results.

- [ ] **Step 1: Apply the repair**

```bash
sh -c 'set -a; . "$HOME/.config/dimo/console-prod.env"; set +a; psql "$PG_URL" -v ON_ERROR_STOP=1 --single-transaction -f src/scripts/db/init-db_13.sql'
```

Expected: exit 0.

- [ ] **Step 2: Re-run the audit**

Expected: `workspaces_without_default_brand` and `brands_with_mixed_case_client_id` are `0`, and `migration_13_applied` is `true`.

- [ ] **Step 3: Check the public lookup.** `GET https://console-api.dimo.org/api/brand?clientId=<a repaired client ID>` returns a brand with `isDefault: true`. It may take 10 minutes to appear, because that's the cache lifetime.

- [ ] **Step 4: Hand `licenses.multiLicense` to the owner.** Don't move any brand. Nothing in the data says which license a brand was meant for.

To undo, run `init-db_13.down.sql` the same way, before any owner picks a new default.

### Task 4: Decide the brand ownership check

**Depends on:** Task 2.

- [ ] **Step 1: Check the gate.** The check may revert only if `licenses.unavailable`, `licenses.missing`, `licenses.clientIdMismatch` and `licenses.ownerMismatch` are all empty. Otherwise keep it, record why in the PR, and skip this task.

- [ ] **Step 2: Revert `isWorkspaceInTeam`** in `src/controllers/workspace.controller.ts` to comparing `workspace.owner` with `teamCtx.ownerAddress`, ignoring case. Stored owners are verified at creation since #80 and can't go stale, so this drops the Identity dependency.

- [ ] **Step 3: Update the tests.** Remove the `a workspace whose stored owner is wrong` block and the Identity-down block from `test/api/brand-per-license.test.ts`, and the two `fakeIdentity` fixture lines added to `team-owned-resources` and `team-scoped-routes` tests.

- [ ] **Step 4: Run `npx vitest run`.** Expected: all pass.

- [ ] **Step 5: Commit** with `refactor(brand): stored owner is enough, licenses can't transfer`.

---

## Phase 2: Stop the active failures

### Task 5: Make the connection balance check real

**Files:**
- Modify: `src/hooks/useTransactions.ts` (`useMintConnection`)
- Test: `__tests__/unit/hooks/useMintConnection.test.tsx`

**Interfaces:**
- Consumes: `getCurrentDimoBalance(): Promise<number>` from `useGlobalAccount`, in whole DIMO.

- [ ] **Step 1: Write the failing tests**

- `refuses a wallet short of DIMO before any transaction`: balance `0`, price `0.0169`. Expect `{ success: false, reason: expect.stringContaining('62.1') }` and `processTransactions` not called.
- `continues with enough DIMO`: balance `100`. Expect `processTransactions` called.
- `does not blame the wallet when the balance can't be read`: `getCurrentDimoBalance` rejects. Expect `reason` to contain `Couldn't check your DIMO balance` and not contain `Insufficient`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false useMintConnection`
Expected: FAIL. `processTransactions` is called for the empty wallet.

- [ ] **Step 3: Implement.** Replace `enoughBalance.dimo` with `(await getCurrentDimoBalance()) < requiredDIMO`, keeping the existing `Insufficient DIMO balance…` copy, and remove `checkEnoughBalance` from this hook. If the read rejects, return `{ success: false, reason: "Couldn't check your DIMO balance. Try again." }`. Leave `usePayLicenseFee` alone: it's a separate path, and the fee is $0.

- [ ] **Step 4: Run them to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit** with `fix(connections): check the DIMO a connection needs before minting`.

### Task 6: Get server errors into Sentry

The cause is unknown, so the first steps decide the fix.

**Files:**
- Create (only if Step 3 says so): `src/utils/reportedAction.ts`
- Modify (only if Step 3 says so): every file with `'use server'` under `src/actions`, `src/services` and `src/app/sign-up/actions.ts`
- Test: `__tests__/unit/utils/reportedAction.test.ts`

**Interfaces:**
- Produces: `reported<A extends unknown[], R>(name: string, action: (...args: A) => Promise<R>): (...args: A) => Promise<R>`. The result must be an `async` function, because Next requires that of `'use server'` exports.

- [ ] **Step 1: Reproduce locally.** Run a small HTTP server on `127.0.0.1:9911` that logs every envelope. Add a temporary Server Action that throws, then `next build && next start` with `NEXT_PUBLIC_SENTRY_DSN=http://k@127.0.0.1:9911/1`, and trigger it. Remove the temporary action afterward.

- [ ] **Step 2: Check `onRequestError`** with a throw in a route handler the same way, so route handlers and Server Actions are told apart.

- [ ] **Step 3: Decide.**
  - An envelope arrives for the Server Action: capture works, and the gap is production config. Compare the Vercel production env with preview, deploy a preview with the temporary action, confirm an event with `runtime.name:node`, commit any code change, and skip to Step 9.
  - No envelope arrives: continue to Step 4.

- [ ] **Step 4: Write the failing test** `reports a thrown action to Sentry and rethrows it`: mock `Sentry.withServerActionInstrumentation`, assert it's called with the action's name, and assert the original error still rejects.

- [ ] **Step 5: Run it to verify it fails.** Expected: FAIL, module not found.

- [ ] **Step 6: Implement `reported`** on `Sentry.withServerActionInstrumentation(name, () => action(...args))`, and wrap every exported Server Action.

- [ ] **Step 7: Run `npx jest` and repeat Step 1.** Expected: all pass, and the envelope arrives.

- [ ] **Step 8: Commit** with `fix(sentry): report Server Action failures from the server`.

- [ ] **Step 9: After deploy,** read the real `/sign-up` error from Sentry and report it. A fix for it is a new task.

---

## Phase 3: Protect connection keys

**Release order:** run `init-db_14.sql`, add `CONNECTION_KEYS_SECRET` to Vercel, deploy the API, run the key backfill, then deploy the console.

### Task 7: Encrypt connection keys and track setup status (API)

**Files:**
- Create: `src/scripts/db/init-db_14.sql`, `src/scripts/db/init-db_14.down.sql`
- Create: `src/services/connectionKeys.service.ts`
- Create: `src/scripts/ops/encrypt-connection-keys.mjs`
- Modify: `src/models/connection.model.ts`, `src/controllers/connection.controller.ts`, `src/app/api/my/connections/route.ts`, `src/app/api/my/connections/[id]/route.ts`
- Test: `test/api/connection-keys.test.ts`, `test/db/migration-14.test.ts`

**Interfaces:**
- Produces: `encryptSecret(plain: string): string`, returning `enc:v1:<iv>:<tag>:<ciphertext>` (AES-256-GCM, base64).
- Produces: `decryptSecret(stored: string): string`. A value without the `enc:` prefix is returned as it is.
- Produces: `connections.status` (`'PENDING' | 'MINTED' | 'READY'`) and `connections.token_id` (string, nullable). Both are added to `CONNECTION_MODIFIABLE_FIELDS`.
- The key is `CONNECTION_KEYS_SECRET`, 32 bytes in base64. My call: an env secret over KMS, because console-api runs on Vercel with no KMS client today. The `v1` prefix leaves room to rotate.

- [ ] **Step 1: Write the failing tests**

- `stores neither private key as sent`: POST, then read the row with raw SQL. Both columns start with `enc:v1:`.
- `gives the owner the keys back`: GET list and GET by id return the original values.
- `still hides keys from members`: the member gets `null`.
- `refuses to save when CONNECTION_KEYS_SECRET is missing`: POST answers 5xx and no row exists.
- `errors on a value encrypted under another key`: `decryptSecret` throws.
- `reads a row that is still plaintext`: a raw-inserted plain key comes back unchanged.
- `hides a deleted connection`: after DELETE, list and GET by id don't return it. This is a bug today: `getMyConnections` and `findMyConnection` don't filter `deleted`.
- `encrypts existing rows once`: run the backfill twice, then every row decrypts to its original value.
- `defaults existing rows to READY`, plus the migration's run-twice and `.down`-first checks.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/connection-keys.test.ts test/db/migration-14.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `init-db_14.sql`.** Add `status VARCHAR(16) NOT NULL DEFAULT 'READY'` and `token_id VARCHAR(78)` with `IF NOT EXISTS`. The default covers existing rows and a console that hasn't deployed yet. The new console sends `status: 'PENDING'` on create (Task 8).

- [ ] **Step 4: Implement the service,** then encrypt in `createConnection` and `updateMyConnection`, decrypt in every owner-facing response, and add `deleted: notDeleted` to `findMyConnection` and `getMyConnections`.

- [ ] **Step 5: Write the backfill.** `encrypt-connection-keys.mjs` reads `PG_URL` and `CONNECTION_KEYS_SECRET`, encrypts rows without the prefix in one transaction, prints only counts, and supports `--dry-run`.

- [ ] **Step 6: Run `npx vitest run`.** Expected: all pass.

- [ ] **Step 7: Commit** with `feat(connections): encrypt keys at rest and track setup status`.

### Task 8: Save keys before minting, and let setup resume (console)

**Files:**
- Modify: `src/hooks/useTransactions.ts`, `src/actions/connections.ts`, `src/app/connections/create/[owner]/components/View/View.tsx`, `src/app/connections/components/View/View.tsx`
- Test: `__tests__/unit/hooks/useMintConnection.test.tsx`, `__tests__/unit/pages/connections/CreateConnection.test.tsx`

**Interfaces:**
- Consumes: Task 7's `status` and `token_id`.
- Produces: `useMintConnection(): { mint, grant }`, where
  - `mint(name: string): Promise<{ success: true; connectionId: bigint } | { success: false; reason: string }>`
  - `grant(input: { connectionId: bigint; licenseGrantee: `0x${string}`; deviceIssuanceGrantee: `0x${string}`; onStep?: (step: MintConnectionStep) => void }): Promise<void>`
- Produces: `updateConnection(id: string, patch: { status: string; token_id?: string }): Promise<void>` and `deleteConnection(id: string): Promise<void>`.

- [ ] **Step 1: Write the failing tests** for the create page:

- `saves the keys before spending anything`: `createConnection` runs before `mint`, with `status: 'PENDING'`.
- `spends nothing if the keys can't be saved`: `createConnection` rejects, `mint` isn't called, and the page shows `Couldn't save your connection keys, so nothing was minted.`
- `removes the row when the mint is refused`: `mint` returns `{ success: false }`, and `deleteConnection` is called.
- `keeps everything when granting fails`: `grant` rejects, status stays `MINTED`, `deleteConnection` isn't called, and the page says setup can be finished from Connections.
- `resumes a minted connection without minting again`: `?resume=<id>` with `status: 'MINTED'` calls `grant` only, with the stored keys.
- `finds a mint the browser never recorded`: `?resume=<id>` with `status: 'PENDING'`, and Identity's `connection(by: { name })` returns a connection owned by this wallet. `mint` isn't called and `token_id` is saved.
- `offers Finish setup for an unfinished connection`: the Connections list shows the link for `PENDING` and `MINTED`, to owners only.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.

- [ ] **Step 3: Split `useMintConnection`** into `mint` and `grant`. Put `assertUserOperation` on both `processTransactions` calls, leave the error translation and Task 5's balance check in `mint`, and point Task 5's tests at `mint`.

- [ ] **Step 4: Add the `Connection` fields and actions,** then build the create flow: generate keys, save `PENDING`, mint, save `MINTED` and `token_id`, grant, save `READY`, redirect.

- [ ] **Step 5: Add resume and "Finish setup".** Resume loads the row with `getConnectionById`. For `PENDING`, ask Identity for `connection(by: { name })` first, and mint only if it isn't there.

- [ ] **Step 6: Run `npx jest`.** Expected: all pass.

- [ ] **Step 7: Commit** with `fix(connections): save keys before minting and resume unfinished setups`.

---

## Phase 4: Remaining fixes

### Task 9: Grant simulated vehicles to their license

**Blocked until** the owner confirms why `0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37` (license #286, "DIMO") gets this grant. The plan assumes the simulator reads through it, so it stays and the minting license is added.

**Files:**
- Modify: `src/hooks/useMintVehicle.ts`, `src/app/app/list/components/VehicleSimulator/index.tsx`, `src/app/app/list/components/VehicleSimulator/notices.ts`
- Test: `__tests__/unit/hooks/useMintVehicle.test.tsx`, `__tests__/unit/pages/license/details/simulatorNotices.test.ts`

**Interfaces:**
- Produces: `MintVehicleParams.sacdGrantees: `0x${string}`[]`, replacing `sacdGrantee`. The hook returns `{ ...result, tokenId, sacdFailed: boolean }`.
- Produces: `mintNotice({ tokenId, recorded, registered, shared })`.

- [ ] **Step 1: Write the failing tests**

- `grants every grantee in one operation`: two `signAndUploadPermissionSACD` calls and one `processTransactions` call with two `setPermissions`.
- `reports a failed grant without losing the vehicle`: signing rejects, the hook resolves with `tokenId` and `sacdFailed: true`.
- `rejects a reverted grant`: `{ success: false }` from the grant also gives `sacdFailed: true`.
- `warns when the license wasn't granted`: `mintNotice` with `shared: false` has tone `warning`.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.

- [ ] **Step 3: Implement,** and pass `[SIMULATOR_GRANTEE, clientId]` from `handleMint`, with the address as a named constant. Record the vehicle even when `sacdFailed` is true.

- [ ] **Step 4: Run `npx jest`.** Expected: all pass.

- [ ] **Step 5: Mint one vehicle on testnet** and confirm it's listed by `vehicles(filterBy: { privileged: <clientId> })`.

- [ ] **Step 6: Commit** with `fix(simulator): grant simulated vehicles to the license that minted them`.

### Task 10: Sign-up and recovery input

**Files:**
- Create: `src/utils/recoveryEmail.ts`
- Modify: `src/app/sign-up/components/BuildForForm.tsx`, `src/app/email-recovery/components/RewirePasskey.tsx`
- Test: `__tests__/unit/pages/sign-up/BuildForForm.test.tsx`, `__tests__/unit/utils/recoveryEmail.test.ts`

**Interfaces:**
- Produces: `emailFromRecoveryLink(raw: string | null): string | null`.

Fix the reader, not the link. The accounts service puts the URL into Turnkey's `magicLinkTemplate` next to `%s`, so a `%2B` in the link risks the template substitution. An email can't contain a space, so restoring `+` is safe.

- [ ] **Step 1: Write the failing tests**

- `stops a build description over 150 characters`: 151 characters shows `Use at most 150 characters` and doesn't submit. 150 submits.
- `emailFromRecoveryLink('dev fleet@x.test')` returns `dev+fleet@x.test`.
- `emailFromRecoveryLink(null)` returns `null`.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.

- [ ] **Step 3: Implement.** Add `maxLength: { value: 150, message: 'Use at most 150 characters' }` to `buildForText`, and read the recovery email through `emailFromRecoveryLink`.

- [ ] **Step 4: Run them to verify they pass.** Expected: PASS.

- [ ] **Step 5: Commit** with `fix(sign-up): cap the build description, keep + in recovery emails`.

### Task 11: Say when the data proxy session expired

**Files:**
- Modify: `src/proxy.ts`, `src/services/subjects/client.ts`, `src/app/vehicles/[tokenId]/components/accessFromError.ts`, `src/app/vehicles/[tokenId]/components/SourceRail.tsx`, `src/app/vehicles/[tokenId]/components/AccessNotice.tsx`
- Test: `__tests__/unit/pages/vehicles/accessFromError.test.ts`, `__tests__/unit/pages/vehicles/AccessNotice.test.tsx`

**Interfaces:**
- Produces: `DataApiCode` gains `'SESSION_EXPIRED'`. `Access` gains `'session-expired'`.

- [ ] **Step 1: Write the failing tests**

- `accessFromError` with code `SESSION_EXPIRED` returns `session-expired`.
- `postSubjectQuery` given a 401 with `{ error, code: 'SESSION_EXPIRED' }` throws that code.
- `AccessNotice` for `session-expired` shows `Your session has expired` and a link to `/sign-in`.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL.

- [ ] **Step 3: Implement.** Add `error: 'Your session has expired'` and `code: 'SESSION_EXPIRED'` to the proxy's API 401, keeping `message`. Add the code to `KNOWN_CODES`, and add the label `'session-expired': 'Session expired'` to `SourceRail`.

- [ ] **Step 4: Run `npx jest`.** Expected: all pass.

- [ ] **Step 5: Commit** with `fix(vehicles): say when the session has expired`.

### Task 12: Webhook metrics and the dead route

**Files:**
- Modify: `src/utils/webhook.ts`
- Delete: `src/app/api/webhook/route.ts`, `src/services/smartContract.ts`
- Test: `__tests__/unit/utils/webhook.test.ts`

- [ ] **Step 1: Write the failing tests** for `formatAndGenerateCEL`:

- `saves a metric outside the list with a numeric value`: field `somethingNew`, value `5`, gives `valueNumber > 5`.
- `saves a metric outside the list with a text value`: value `abc`, gives `valueString`.
- `keeps the type of a listed metric`: unchanged.

- [ ] **Step 2: Run them to verify they fail.** Expected: FAIL with `Could not find condition config`.

- [ ] **Step 3: Implement.** In `getValueType`, when no config matches, use `valueNumber` if `Number(condition.value)` is a number and `valueString` otherwise, instead of throwing.

- [ ] **Step 4: Delete the route and `smartContract.ts`.** Confirm first with `grep -rn "mintDimoCredits\|services/smartContract\|api/webhook'" src __tests__` returning only those two files.

- [ ] **Step 5: Run `npx jest` and `npx tsc --noEmit`.** Expected: all pass.

- [ ] **Step 6: Commit** with `fix(webhooks): save unlisted metrics, remove the dead /api/webhook route`.

### Task 13: Vehicles tab follows the license owner

**Files:**
- Modify: `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`, generated `src/gql/*`
- Test: `__tests__/unit/pages/license/details/VehiclesTab.test.tsx`

- [ ] **Step 1: Write the failing test** `offers no simulator or sharing setup on a license another wallet owns`: `useTeam` returns `{ isOwner: true, ownerAddress: '0xabc' }`, the license owner is `0xother`, and neither button shows.

- [ ] **Step 2: Run it to verify it fails.** Expected: FAIL.

- [ ] **Step 3: Implement.** Add `owner` to `DeveloperLicenseVehiclesFragment`, regenerate with `npm run compile`, and pass `licenseOwner={fragment.owner}` to both `OwnerAction`s.

- [ ] **Step 4: Run `npx jest`.** Expected: all pass.

- [ ] **Step 5: Commit** with `fix(vehicles): gate the Vehicles tab on the license owner`.
