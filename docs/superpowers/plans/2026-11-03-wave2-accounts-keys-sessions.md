# Wave 2: accounts, signer keys and shared sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every login and lookup finds the one account that holds a user's data, then the duplicates are merged and made impossible (ACC-2, ACC-3, ACC-4); the drift and small bugs ACC-8 lists are fixed in code; signer API keys are stored encrypted (SEC-1); and every console tab shares one session (SES-1). ACC-1 is a read-only count the user runs.

**Architecture:** On console-api, one ordering decides which account a wallet or an email belongs to: the account holding data first, then the oldest. `processOAuth` and every wallet and email lookup use it, case-insensitively, so login is deterministic while duplicates still exist. A merge script then moves each duplicate group onto that same account (groups where more than one account holds data wait for the user's choice), and two migrations add `UNIQUE (lower(address))` and `UNIQUE (lower(email))`, refusing to run while duplicates remain. Signer keys reuse the connection keys' AES-GCM format and secret: encrypted on write, opened on read, one unreadable key flagged instead of failing the list, plus a backfill. In the console, the Turnkey session bundle moves from per-tab `sessionStorage` into one `localStorage` entry that also holds its own embedded key, and tabs announce sign-in and sign-out to each other over BroadcastChannel (the `storage` event when BroadcastChannel is missing).

**Tech Stack:** API: Next 14.2 route handlers, Sequelize 6.37 + pg, vitest against real Postgres (Homebrew `postgresql@16`, 127.0.0.1:55432), plain-node `.mjs` ops scripts. Console: Next 16.4 App Router, React 19, TanStack Query 5, `@turnkey/crypto`, Jest + Testing Library (jsdom, which has no BroadcastChannel).

**Spec:** `/Users/zer0stars/workspace/dimo-developer-console/docs/superpowers/plans/2026-11-03-console-remaining-issues.md` (master plan; untracked in the main checkout): Global Constraints, ACC-1 to ACC-4, ACC-8 (code parts), SEC-1, SES-1, Review Focus 1 and 3. The user's decisions for this wave are recorded where they apply, marked **Decision**.

**Worktrees:** console `/Users/zer0stars/workspace/dimo-developer-console/.worktrees/wave2`, API `/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave2`, branch `fix/wave2-accounts` in both.

**Out of scope (user):** ACC-5 (licenses owned by another wallet: leave them), ACC-6, ACC-7 (wave 1), and cleanup of data users can fix themselves (their redirect URIs, names, expiration dates).

## Global Constraints

- When both repos change, the API ships first. Every migration runs on prod before the merge that needs it; the user runs it.
- Migrations are numbered from **init-db_16** (wave 1 adds `init-db_15`), in the order they run on prod: 16–19 before the API deploys, 20–21 after the merge script. Each has a `.down.sql` that also runs on a fresh database (docker's initdb runs `init-db_N.down.sql` before `init-db_N.sql`) and where the table doesn't exist. Tests: `test/db/migration-N.test.ts`.
- If wave 1 lands a `schema_migrations` ledger before this merges, each new migration records itself in it exactly as wave 1's `init-db_15` does, and its down file removes its own row.
- Data scripts: dry run by default, `--apply` to write; they compute their targets at run time, print aggregates and account ids only (never an email or a wallet, never a key), refuse unsafe states before writing, and run in one transaction. The user reviews the dry run before `--apply`.
- No production DB write, Vercel setting change or redeploy without the user's go-ahead. Prod credentials (`~/.config/dimo/console-prod.env`: `PG_URL`, `CONNECTION_KEYS_SECRET`) are never printed, read by an agent, or passed to a subagent.
- Route bodies never carry upstream error text, tokens, keys or SQL.
- Commits carry no Co-Authored-By trailer or Claude/AI attribution.
- API verification: `npx vitest run`, `npm run typecheck`, `ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json <files>` (plain `npm run lint` fails in nested worktrees), `npx prettier --check <files>`. Never `npm run lint:format` (it writes).
- Console verification: `npm test`, `npx tsc --noEmit -p tsconfig.json`, `npm run lint`. `npm run compile` is GraphQL codegen, not a type check.

## Review Focus

1. **One wallet on two accounts (D1).** Login must pick the same account every time, the one holding the data, whatever the letter case of the stored wallet (Task 2; Task 4 checks the merge script agrees with login).
2. **A signer list mixing a plaintext key, an `enc:v1` key and one key that won't open.** The owner's app must still load; the bad row comes back flagged, not as a 500 (Task 8).
3. **Two tabs; the user signs in again in one.** The other tab must keep working: its next Turnkey call pairs the new bundle with the new key, never the old bundle with the new key (`invalid ghash tag`) (Task 11).
4. **Sign out in one tab.** Every other tab must reach `/sign-in` within about a second; expiry likewise (Tasks 10 and 11).
5. **A token without a wallet, or a receipt with an empty `owner_wallet`.** It must match no account, even though accounts without a wallet exist (Tasks 1 and 2).

---

## API (`/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave2`)

### Task 1: Empty wallets become no wallet; receipts need a real wallet; audit counts (ACC-2)

**Files:**
- Create: `src/scripts/db/init-db_16.sql`, `src/scripts/db/init-db_16.down.sql`, `test/db/migration-16.test.ts`
- Modify: `src/app/api/crypto/payment/receipt/route.ts`, `src/utils/vaslidations.ts`
- Modify: `src/scripts/ops/audit-console-data.mjs` (`CHECKS`)
- Test: create `test/api/payment-receipt.test.ts`; modify `test/db/audit-data.test.ts`

**Interfaces:**
- Produces (`src/utils/vaslidations.ts`): `isWalletAddress(value: unknown): value is string` — true only for `/^0x[0-9a-fA-F]{40}$/`.
- Produces SQL: constraint `users_address_not_empty CHECK (address <> '')` on `users`.
- `POST /api/crypto/payment/receipt` (unprotected, no console caller; Stripe-side): 400 `{ message: 'owner_wallet must be a wallet address' }` unless `isWalletAddress(payload.owner_wallet)`; nothing is recorded. Everything else unchanged (Task 2 swaps its lookup).

`init-db_16.sql` (idempotent):
```sql
UPDATE users SET address = NULL WHERE address = '';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_address_not_empty;
ALTER TABLE users ADD CONSTRAINT users_address_not_empty CHECK (address <> '');
```
`init-db_16.down.sql`: `ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_address_not_empty;` plus a comment: the NULLs stay, because every reader treats `''` and NULL as "no wallet".

Audit (`CHECKS`): `users_without_wallet` becomes `WHERE address IS NULL OR address = ''`; `users_sharing_wallet_ignoring_case` adds `AND address <> ''` so the empty rows stop counting as one shared wallet; add `migration_16_address_check: SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_address_not_empty')`.

- [ ] **Step 1: Write the failing tests**

`test/db/migration-16.test.ts` (pattern of `migration-14.test.ts`; `afterEach(() => runSql(MIGRATION))`; rows inserted with raw SQL after `ALTER TABLE users DROP CONSTRAINT users_address_not_empty`):
- `turns empty wallets into no wallet and leaves real ones`: two `''` rows and one `0xabc…` row → after the migration the two are NULL, the third unchanged.
- `refuses an empty wallet afterwards`: inserting `address = ''` rejects with a message containing `users_address_not_empty`.
- `runs twice without changing anything`.
- `init-db_16.down.sql lets an empty wallet in again and keeps the NULLs`.
- `the down file runs on a database that never had the migration` (down, down, up) and `where there is no users table` (the `CREATE SCHEMA empty_16; SET search_path …` pattern).

`test/api/payment-receipt.test.ts` (call the route's `POST` with `request('POST', '/api/crypto/payment/receipt', { body })`; a user without a wallet exists in every case):
- it.each `['empty', '']`, `['missing', undefined]`, `['not an address', 'abc']`, `['too short', '0x1234']` → `refuses an owner_wallet that is %s`: 400, body `{ message: 'owner_wallet must be a wallet address' }`, `payment_receipts` count 0.
- `records a receipt for the account that owns the wallet`: owner created with `createUser()`; body `{ receipt_link: 'https://r.test/1', owner_wallet: user.address, beneficiary_wallet: user.address, amount: 100 }` → 200, one row with `owner_id === user.id`, `amount === '0.10'` (with the default `DCX_IN_USD` of 0.001).

`test/db/audit-data.test.ts`:
- `counts empty and missing wallets as users without a wallet`: drop the constraint, insert one `''` and one NULL row → `users_without_wallet` is `'2'`, `users_sharing_wallet_ignoring_case` is `'0'`; `afterEach` re-runs `init-db_16.sql`.
- `reports whether migration 16 has run`: `'true'`; after the down file, `'false'`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-16.test.ts test/api/payment-receipt.test.ts test/db/audit-data.test.ts`
Expected: FAIL — `init-db_16.sql` not found; an empty `owner_wallet` answers 404 or 500; `users_without_wallet` is `'1'`.

- [ ] **Step 3: Implement** the two SQL files, `isWalletAddress`, the route check (before any lookup), and the three audit lines.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass (globalSetup now applies `init-db_16`).
Run: `npm run typecheck && ESLINT_USE_FLAT_CONFIG=false npx eslint --no-eslintrc -c .eslintrc.json src/app/api/crypto/payment/receipt/route.ts src/utils/vaslidations.ts src/scripts/ops/audit-console-data.mjs test/db/migration-16.test.ts test/api/payment-receipt.test.ts test/db/audit-data.test.ts && npx prettier --check src/app/api/crypto/payment/receipt/route.ts src/utils/vaslidations.ts src/scripts/ops/audit-console-data.mjs test/db test/api/payment-receipt.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/db/init-db_16.sql src/scripts/db/init-db_16.down.sql src/app/api/crypto/payment/receipt/route.ts src/utils/vaslidations.ts src/scripts/ops/audit-console-data.mjs test/db/migration-16.test.ts test/db/audit-data.test.ts test/api/payment-receipt.test.ts
git commit -m "fix(accounts): an empty wallet is no wallet; receipts need a wallet address (init-db_16)"
```

### Task 2: One deterministic account per wallet (ACC-3, part 1)

**Files:**
- Modify: `src/services/user.service.ts`, `src/controllers/auth.controller.ts`, `src/controllers/user.controller.ts`
- Modify (callers): `src/app/api/me/complete/route.ts`, `src/app/api/user/route.ts`, `src/app/api/crypto/payment/route.ts`, `src/app/api/crypto/payment/receipt/route.ts`
- Create: `test/support/accounts.ts`, `test/api/account-pick.test.ts`

**Interfaces:**
- Produces (`src/services/user.service.ts`):
  - `holdsData(alias: string): string` — the SQL boolean below, over the `users` row aliased `alias` (`'"User"'` in Sequelize queries, `u` in the merge script).
  - `findUserByWallet(wallet: unknown): Promise<User | null>` — null unless `wallet` is a string that is non-empty after `trim()`. Otherwise `where(fn('lower', col('address')), wallet.trim().toLowerCase())` (matches Task 5's index), `order: [[literal(holdsData('"User"')), 'DESC'], ['created_at', 'ASC NULLS LAST'], ['id', 'ASC']]`.
- Produces (`src/controllers/auth.controller.ts`): `processOAuth(token)` keeps its signature and its throw on a null token, and returns `findUserByWallet(token.ethereum_address)` — no default `''`.
- `src/controllers/user.controller.ts`: re-exports `findUserByWallet`; `findUserByWalletAddress` and `findUserByWalletAddressAnyCase` are deleted and their four callers use `findUserByWallet`.
- Produces (`test/support/accounts.ts`):
  - `insertAccount(values: { email?: string; address?: string | null; createdAt?: string }): Promise<User>` — raw insert (so `created_at` can be set), then `User.findByPk`.
  - `type DataKind = 'team' | 'membership' | 'configuration' | 'simulated vehicle' | 'key holder' | 'payment receipt' | 'signer'` and `giveData(kind: DataKind, user: User): Promise<void>` — `team`: `createOwnerFor(user)`; `membership`: `addMember` to a fresh owner's team; `configuration`, `simulated vehicle`, `payment receipt`: one raw row owned by `user.id`; `key holder`: a `license_signers` row on a fresh team plus a `license_signer_holders` row for `user.id`; `signer`: `signer_address` and `signer_verified_at` set.
  - `ACCOUNT_INDEX_MIGRATIONS: string[]` — `[]` here; Task 5 lists its files.
  - `allowDuplicateAccounts(): void` — registers `beforeEach`: `DROP INDEX IF EXISTS idx_users_address_lower; DROP INDEX IF EXISTS idx_users_email_lower`; `afterEach`: `TRUNCATE users CASCADE`, then runs each file in `ACCOUNT_INDEX_MIGRATIONS`.

**Decision (what "holds data" means).** An account holds data when any of these exist; the merge script (Task 4) repeats this text verbatim:
```sql
(EXISTS (SELECT 1 FROM teams t WHERE t.created_by = ${alias}.id AND t.deleted IS NOT TRUE)
 OR EXISTS (SELECT 1 FROM team_collaborators m WHERE m.user_id = ${alias}.id
            AND m.status = 'ACCEPTED' AND m.deleted IS NOT TRUE)
 OR EXISTS (SELECT 1 FROM configurations c WHERE c.owner_id = ${alias}.id AND c.deleted IS NOT TRUE)
 OR EXISTS (SELECT 1 FROM simulated_vehicles v WHERE v.user_id = ${alias}.id)
 OR EXISTS (SELECT 1 FROM license_signer_holders h WHERE h.user_id = ${alias}.id)
 OR EXISTS (SELECT 1 FROM payment_receipts r WHERE r.owner_id = ${alias}.id)
 OR ${alias}.signer_address IS NOT NULL)
```
Why these: a team it created carries the company and everything scoped to it (workspaces, brands, apps, signers, redirect URIs, connections); an accepted membership is access to someone else's team; configurations, simulated vehicles, key holdings and receipts point at the account itself; a verified signer is a proof the user made. Not counted: a company with no team (every read reaches a company through a team, so it is unreachable; the 147 such companies come from repeated registration, fixed in Task 7), a pending invite (it names an email, not an account), and audit columns (`invited_by`, `sent_by`, `license_signers.created_by`/`disabled_by`), which record who acted.

- [ ] **Step 1: Write the failing tests**

`test/api/account-pick.test.ts`, inside `describe` blocks that call `allowDuplicateAccounts()`. `W` is a checksummed wallet; "same wallet" rows store `W.toLowerCase()` or `W.toUpperCase().replace('0X', '0x')`:
- `picks the account holding a team over an older empty one`: A (`createdAt '2025-01-01'`, empty), B (`'2025-06-01'`, `giveData('team')`) → `processOAuth({ ethereum_address: W })` returns B, five calls in a row.
- `picks the oldest account when none holds data` → A.
- `picks the oldest of two accounts that hold data` → A (both `team`).
- it.each over every `DataKind`: `counts a %s as data` → B (newer, holding only that kind) is picked over empty older A.
- `does not count a deleted team, a removed membership or a pending invite`: B has a team with `deleted = TRUE`, a `REVOKED` row with its `user_id`, and a `PENDING` row for its email → A.
- `finds an account stored in another letter case` (stored lower, asked checksummed, and the reverse).
- `finds no account for a token without a wallet`: accounts with NULL wallets exist; `processOAuth({})`, `({ ethereum_address: '' })`, `({ ethereum_address: '  ' })` → null.
- `GET /api/me answers for the account holding the data`: `body.team.id === B's team id`.
- `PUT /api/me/complete updates the account holding the data`: body `{ name: 'Renamed' }` → B renamed, A untouched.
- `POST /api/crypto/payment/receipt records the receipt on the account holding the data`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/account-pick.test.ts`
Expected: FAIL — `findUserByWallet` not exported; exact-case lookups miss the other case and pick by table order.

- [ ] **Step 3: Implement** per Interfaces. `me/complete` keeps its 401/404/409 behavior; `POST /api/user` keeps its 409 for a wallet already on an account (now via `findUserByWallet`).

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass, including `regressions-80.test.ts`'s sign-up and relink cases.
Run: `npm run typecheck`, then eslint and `npx prettier --check` on every changed file.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/user.service.ts src/controllers/auth.controller.ts src/controllers/user.controller.ts src/app/api/me/complete/route.ts src/app/api/user/route.ts src/app/api/crypto/payment/route.ts src/app/api/crypto/payment/receipt/route.ts test/support/accounts.ts test/api/account-pick.test.ts
git commit -m "fix(auth): a wallet always resolves to the account holding the data, in any letter case"
```

### Task 3: Email lookups ignore case (ACC-4, part 1)

**Files:**
- Modify: `src/services/user.service.ts` (`findUserByEmail`), `src/controllers/user.controller.ts` (`findUserByEmail`, `findUserByEmailOrAddress`), `src/app/api/user/route.ts`
- Test: create `test/api/account-email.test.ts`

**Interfaces:**
- Consumes (Task 2): `holdsData`, `allowDuplicateAccounts`, `insertAccount`, `giveData`.
- Produces: `findUserByEmail(email: unknown, transaction?: Transaction): Promise<User | null>` in `src/services/user.service.ts` — null unless a non-blank string; `where(fn('lower', col('email')), email.trim().toLowerCase())`, same order as `findUserByWallet`. The controller's `findUserByEmail` re-exports it; `findUserByEmailOrAddress(item)` returns `findUserByEmail(item)`.
- `POST /api/user` answers 409 `{ message: 'An account already exists for this email' }` when `findUserByEmail(body.email)` finds one (checked after the wallet check). Today a case variant creates a duplicate; after Task 5 it would be a 500.

- [ ] **Step 1: Write the failing tests** (`allowDuplicateAccounts()` where duplicates are inserted)
- `finds an account whatever the letter case of the email`: stored `Jane@X.test`, asked `jane@x.TEST` → found.
- `picks the account holding the data among case variants`.
- it.each `''`, `'   '`, `undefined`, `null` → `finds nothing for an email that is %s`.
- `GET /api/auth/exist finds an account by email in another letter case`: `existItem: true`.
- `PUT /api/me/complete links a wallet-less account named in another letter case`: legacy row `Old@X.test`, address NULL; PUT as a new wallet with `email: 'old@x.test'` → 200 and the row now stores the wallet.
- `POST /api/user refuses a second account for an email in another letter case`: existing `jane@x.test`; POST as a new wallet with `JANE@x.test` → 409 with that message; user count unchanged.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/account-email.test.ts`
Expected: FAIL — the lookups are exact; the sign-up creates a second row.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`, `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/user.service.ts src/controllers/user.controller.ts src/app/api/user/route.ts test/api/account-email.test.ts
git commit -m "fix(accounts): find accounts by email in any letter case; refuse a case-variant sign-up"
```

### Task 4: Merge duplicate accounts (ACC-3 and ACC-4, part 2)

**Files:**
- Create: `src/scripts/db/init-db_19.sql`, `src/scripts/db/init-db_19.down.sql`, `test/db/migration-19.test.ts`
- Create: `src/scripts/ops/merge-duplicate-accounts.mjs`, `test/db/merge-accounts.test.ts`
- Modify: `src/scripts/ops/audit-console-data.mjs` (add `migration_19_account_merges: SELECT to_regclass('account_merges') IS NOT NULL`), `test/db/audit-data.test.ts`

**Interfaces:**
- Consumes (Task 2): `findUserByWallet`, `insertAccount`, `giveData`, `allowDuplicateAccounts`; (Task 3) `findUserByEmail`; the holds-data SQL, repeated in the script as `HOLDS_DATA` over alias `u` (plain node can't import TypeScript; the agreement test below keeps the two equal).
- `init-db_19.sql`: `CREATE TABLE IF NOT EXISTS account_merges (id VARCHAR(36) PRIMARY KEY NOT NULL, kept_user_id VARCHAR(36) NOT NULL, dropped_user_id VARCHAR(36) NOT NULL UNIQUE, dropped_user JSONB NOT NULL, moved JSONB NOT NULL, merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`. No foreign keys: the dropped account no longer exists. Down: `DROP TABLE IF EXISTS account_merges` with a comment that it loses the record and undoes no merge.
- Produces (`merge-duplicate-accounts.mjs`):
  - `optionsFrom(args: string[]): { apply: boolean; keep: string[] }` — accepts only `--apply` and repeated `--keep=<account id>`; anything else throws `Refused('Only --apply and --keep=<account id> are accepted')`.
  - `mergeAccounts(pgUrl: string | undefined, { apply = false, keep = [] } = {}): Promise<Report>`.
  - `Report = { groups: number; accounts: number; to_merge: number; needs_decision: number; merged: number; plan: Group[] }`, `Group = { group: string /* smallest account id */; shared: ('wallet' | 'email')[]; wallets: number; decision: 'merge' | 'needs decision'; reason?: 'several accounts hold data' | 'several wallets'; keep: string | null; accounts: { id: string; created: string | null /* YYYY-MM-DD */; wallet: boolean; holds: { teams: number; memberships: number; configurations: number; simulated_vehicles: number; key_holders: number; payment_receipts: number; signer: boolean } }[] }`. `merged` is the number of accounts deleted (0 on a dry run).
  - CLI: `node --env-file=<file holding PG_URL> src/scripts/ops/merge-duplicate-accounts.mjs [--apply] [--keep=<id> ...]` prints the report as JSON; a failure prints `Nothing was changed: <Refused message, or the error's code>` and exits 1.

**Decision (merge rules).**
- Groups are connected components over accounts sharing `lower(address)` (NULL and `''` are no wallet) or `lower(email)`, so one person's wallet duplicates and email-case duplicates form one group.
- The keeper is the `--keep` account of the group if one is given. Otherwise a group is merged automatically only when at most one account holds data **and** the group has at most one distinct non-empty `lower(address)`; the keeper is the data holder, else the oldest (`created_at` NULLS LAST, then id), the same as login. Every other group is listed as `needs decision` and left alone.
- Refusals before any write (transaction rolled back): no `PG_URL` (before connecting); a bad argument (before connecting); `--keep` naming an account in no duplicate group; two `--keep` in one group; `--apply` while `account_merges` doesn't exist (`Run init-db_19 first`).
- `--apply`: one transaction. `SELECT … FROM users … FOR UPDATE` on every row, plan computed inside it, then for each dropped account `d` of each group, oldest first, onto keeper `k`:
  1. soft-delete (`deleted = TRUE, deleted_at = NOW()`) `d`'s ACCEPTED, not-deleted `team_collaborators` rows in teams where `k` already has one;
  2. repoint to `k`: `team_collaborators.user_id`, `team_collaborators.invited_by`, `teams.created_by`, `companies.created_by`, `configurations.owner_id`, `payment_receipts.owner_id`, `simulated_vehicles.user_id`, `team_invite_sends.sent_by`, `license_signers.created_by`, `license_signers.disabled_by`;
  3. delete `d`'s `license_signer_holders` rows for a signer `k` already holds, then repoint the rest;
  4. insert `account_merges` (`dropped_user` = the whole `users` row as JSON; `moved` = `{ "<table>.<column>": [row ids] }` for every row changed or deleted above, deleted holder rows as full JSON);
  5. `DELETE FROM users WHERE id = d` (the foreign keys make this fail, and roll everything back, if any reference was missed);
  6. if `k` has no wallet, it takes the wallet of the first dropped account that had one; likewise `signer_address` with its `signer_verified_at`. `k` keeps its own email, name and everything else.
  After all groups: count references to any dropped id in the non-foreign-key columns of step 2; non-zero → `Refused('References to merged accounts remain')`. Then `COMMIT`. `updated_at` is left alone everywhere.
- A dry run uses `BEGIN READ ONLY` and the same planning code.

- [ ] **Step 1: Write the failing tests**

`test/db/migration-19.test.ts`: `creates the merge record table`, `runs twice`, down `drops it`, `runs on a database that never had it`, `runs where there is no table at all`.

`test/db/merge-accounts.test.ts` (`allowDuplicateAccounts()`; `run = (options) => mergeAccounts(process.env.PG_URL, options)`):
- `plans a merge onto the account holding the data and writes nothing on a dry run`: A older empty, B `team`, same wallet in two cases → `plan` is `[{ decision: 'merge', keep: B.id, shared: ['wallet'], wallets: 1, … }]`, `to_merge: 1`, `merged: 0`; both rows still there.
- `merges onto the account holding the data`: `{ apply: true }` → A gone, B kept, one `account_merges` row with `dropped_user_id: A.id, kept_user_id: B.id`, `merged: 1`; `findUserByWallet(W)` still returns B.
- `moves everything the dropped account had`: A holds every `DataKind` except `team` and `signer`, plus a company, an `invited_by`, a `sent_by` and a `license_signers.created_by`; B holds a team; `{ apply: true, keep: [B.id] }` → every one of those rows now points at B; `account_merges.moved` lists their ids.
- `keeps one membership when both accounts were in the same team`: both accepted members of team T → B's row active, A's row `deleted = TRUE` with `user_id = B.id`; the `idx_team_collaborators_member` index holds.
- `hands the kept account the wallet and signer it lacks`: email-case group, K holds a team and has no wallet, D has a wallet and a verified signer → after `--apply`, K has D's wallet, signer and `signer_verified_at`.
- `lists a group where several accounts hold data and leaves it alone`: dry run → `decision: 'needs decision', reason: 'several accounts hold data', keep: null`; `{ apply: true }` → nothing deleted, `merged: 0`.
- `lists a group with two different wallets for a decision`: same email in two cases, two wallets → `reason: 'several wallets'`, `wallets: 2`.
- `merges a listed group onto the account named by --keep`.
- `groups accounts linked through a wallet and an email`: A~B share a wallet, B~C an email in another case → one group of 3, `shared: ['wallet', 'email']`.
- `refuses --keep for an account in no duplicate group` and `refuses two --keep in one group`: rejects with the message; row counts unchanged.
- `refuses to apply before init-db_19`: `DROP TABLE account_merges` → rejects `Run init-db_19 first`; `afterEach` re-runs `init-db_19.sql`.
- `changes nothing when one group fails`: two mergeable groups; a test trigger `BEFORE DELETE ON users` raising for the second group's dropped id → rejects; both groups unchanged; `account_merges` empty (drop the trigger in `finally`).
- `agrees with login on every group's account`: for five fixture groups (data holder newer, none hold data, holder among three, email-only with one wallet, wallet in three cases), each automatic `keep` equals `(await findUserByWallet(wallet))!.id` (or `findUserByEmail` for the email-only group).
- `from the command line` (`execFile` + `envWithoutDatabase`, as in `audit-data.test.ts`): `prints account ids and counts, never an email or a wallet` (stdout has no `@` and no fixture wallet in lower case); `writes nothing without --apply`; `refuses a misspelled --aply before it connects` (the `listener()` count stays 0); `refuses a missing PG_URL before it connects anywhere`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-19.test.ts test/db/merge-accounts.test.ts`
Expected: FAIL — files not found.

- [ ] **Step 3: Implement** the migration and the script per Interfaces and the Decision. Header comment in the style of `encrypt-connection-keys.mjs`: what it does, what it prints, each refusal, and how to run it. Add the audit line.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`, `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/db/init-db_19.sql src/scripts/db/init-db_19.down.sql src/scripts/ops/merge-duplicate-accounts.mjs src/scripts/ops/audit-console-data.mjs test/db/migration-19.test.ts test/db/merge-accounts.test.ts test/db/audit-data.test.ts
git commit -m "feat(ops): merge duplicate accounts onto the one holding the data, recorded (init-db_19)"
```

### Task 5: One account per wallet and per email (ACC-3 and ACC-4, part 3)

**Files:**
- Create: `src/scripts/db/init-db_20.sql`, `init-db_20.down.sql`, `init-db_21.sql`, `init-db_21.down.sql`, `test/db/migration-20-21.test.ts`
- Modify: `test/support/accounts.ts` (`ACCOUNT_INDEX_MIGRATIONS = ['init-db_20.sql', 'init-db_21.sql']`), `src/scripts/ops/audit-console-data.mjs` (add `migration_20_wallet_index` and `migration_21_email_index`: `to_regclass(…) IS NOT NULL`), `test/db/audit-data.test.ts`

**Interfaces:**
- `init-db_20.sql`: a `DO` block that raises, before any change, `init-db_20: run init-db_16 first: % accounts have an empty wallet` when `address = ''` rows exist, and `init-db_20: % wallets are on more than one account. Merge them first: src/scripts/ops/merge-duplicate-accounts.mjs` when `SELECT lower(address) … WHERE address IS NOT NULL GROUP BY 1 HAVING count(*) > 1` finds any; then `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_address_lower ON users (lower(address)) WHERE address IS NOT NULL`.
- `init-db_21.sql`: same shape for `lower(email)`, message `init-db_21: % emails are on more than one account, ignoring case. Merge them first: …`; `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email))`. The existing case-sensitive `users_email_key` stays.
- Down files: `DROP INDEX IF EXISTS` of each index.
- The messages carry counts only: no wallet, email or id.

- [ ] **Step 1: Write the failing tests** (`test/db/migration-20-21.test.ts`; duplicate rows need `allowDuplicateAccounts()`)
- `init-db_20 refuses while two accounts share a wallet in different letter case, naming no one`: rejects with `1 wallets are on more than one account`; the message contains neither wallet spelling nor either email; the index is absent.
- `init-db_20 refuses while an empty wallet is left`: drop `users_address_not_empty`, insert `''` → `run init-db_16 first`; `afterEach` re-runs `init-db_16.sql`.
- `init-db_20 creates the index once wallets are unique, and runs twice`.
- `the wallet index refuses a second account for the same wallet in another letter case`; `allows any number of accounts without a wallet`.
- `the wallet lookup uses the index`: capture `findUserByWallet(W)`'s SQL with `captureQueries` (strip the `Executing (default): ` prefix); in one transaction `SET LOCAL enable_seqscan = off`, then `EXPLAIN` it → the plan text contains `idx_users_address_lower`.
- The same four refusal/creation/uniqueness cases for `init-db_21` and `lower(email)`.
- Down files: `drop the index`, `run on a database that never had it`, `run where there is no users table`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-20-21.test.ts`
Expected: FAIL — files not found.

- [ ] **Step 3: Implement** the four SQL files and the two one-line changes.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (Tasks 2–4 tests now drop and restore the indexes through `allowDuplicateAccounts`), `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/db/init-db_20.sql src/scripts/db/init-db_20.down.sql src/scripts/db/init-db_21.sql src/scripts/db/init-db_21.down.sql src/scripts/ops/audit-console-data.mjs test/support/accounts.ts test/db/migration-20-21.test.ts test/db/audit-data.test.ts
git commit -m "fix(accounts): one account per wallet and per email, ignoring case (init-db_20, init-db_21)"
```

### Task 6: Model and DB drift; enum typos (ACC-8, data step)

**Files:**
- Create: `src/scripts/db/init-db_17.sql`, `init-db_17.down.sql`, `test/db/migration-17.test.ts`
- Modify: `src/models/configuration.model.ts` (`client_id: DataTypes.STRING`), `src/services/configuration.service.ts` (`getConfigurationsByClientId`, `checkConfigurationByClientId`)
- Modify: `src/scripts/ops/audit-console-data.mjs`, `test/db/audit-data.test.ts`
- Test: create `test/api/configurations-client-id.test.ts`

**Interfaces:**
- `init-db_17.sql` (idempotent):
  ```sql
  ALTER TABLE team_collaborators ALTER COLUMN status SET DEFAULT 'PENDING';
  CREATE INDEX IF NOT EXISTS idx_configurations_client_id ON configurations (lower(client_id));
  UPDATE apps SET scope = 'sandbox' WHERE scope = 'sanbox';
  UPDATE users SET role = 'owner' WHERE role = 'OWNER';
  UPDATE companies SET type = 'Others' WHERE type = 'other';
  ```
  `sanbox` is the value the console's first app form sent for `apps.scope` (console commit `f6365ce1`). `OWNER` and `other` are mapped to the columns where the code's own value differs only by spelling: `users.role` defaults to `owner` (`team_collaborators.role` uses `OWNER` correctly and is not touched), and the console offers `Others` for `companies.type` (`DEVELOPER_TYPES`). The audit lines below show, before and after, whether drift remains elsewhere (see Release, step 2).
- `init-db_17.down.sql`: `ALTER TABLE IF EXISTS team_collaborators ALTER COLUMN status SET DEFAULT 'ACCEPTED'; DROP INDEX IF EXISTS idx_configurations_client_id;` and a comment that the corrected values stay.
- Configuration lookups: `where(fn('lower', col('client_id')), clientId.toLowerCase())`, so they use the index. Writes store `client_id` as sent.
- Audit additions (counts only, no values): `migration_17_collaborator_default` (`column_default LIKE '''PENDING''%'` for `team_collaborators.status`); `apps_scope_unknown` (`scope NOT IN ('production','sandbox')`); `users_role_not_lowercase` (`role <> lower(role)`); `companies_type_unknown` (`type NOT IN` the 12 `DEVELOPER_TYPES` of the console's `src/config/default.ts`); `companies_build_for_unknown` (`build_for NOT IN ('mobile-app','web-app','personal-project','something-else','web-app-single-login','web-app-multi-account')`).

- [ ] **Step 1: Write the failing tests**

`test/db/migration-17.test.ts` (`afterEach(() => runSql(MIGRATION))`):
- `a collaborator row inserted without a status is PENDING` (raw insert omitting `status`).
- `indexes configurations by client ID ignoring case` (`to_regclass('idx_configurations_client_id')` not null).
- `corrects sanbox, OWNER and other, and nothing else`: rows `apps.scope = 'sanbox'`, `users.role = 'OWNER'`, `companies.type = 'other'`, plus `team_collaborators.role = 'OWNER'` and `apps.scope = 'production'` → `sandbox`, `owner`, `Others`; the collaborator row and the production app unchanged.
- `runs twice`; down: `restores the old default and drops the index`, `runs on a database that never had it`, `runs where there are no tables`.

`test/api/configurations-client-id.test.ts`:
- `finds configurations saved with a checksummed client ID when asked in lower case` (and the reverse) via `getConfigurationsByClientId`.
- `the client ID lookup uses the index` (`enable_seqscan = off` + `EXPLAIN` of the captured SQL contains `idx_configurations_client_id`).
- `the model stores client_id as a string`: `Configuration.getAttributes().client_id.type.key === 'STRING'`.

`test/db/audit-data.test.ts`: `counts enum values outside each known set`: one row each of `apps.scope = 'beta'`, `users.role = 'Owner'`, `companies.type = 'Robots'`, `companies.build_for = 'kiosk'` → each new check is `'1'`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-17.test.ts test/api/configurations-client-id.test.ts test/db/audit-data.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`, `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/db/init-db_17.sql src/scripts/db/init-db_17.down.sql src/models/configuration.model.ts src/services/configuration.service.ts src/scripts/ops/audit-console-data.mjs test/db/migration-17.test.ts test/db/audit-data.test.ts test/api/configurations-client-id.test.ts
git commit -m "fix(drift): collaborator default, client ID index and lookups, enum typos (init-db_17)"
```

### Task 7: Registration, company deletion, expired invites, redirect URIs (ACC-8, code)

**Files:**
- Modify: `src/controllers/company.controller.ts` (`finishUpUserRegistration`, `deleteCompanyById`), `src/services/company.service.ts` (`deleteCompanyById`, `deleteMyCompany`), `src/app/api/me/complete/route.ts`, `src/controllers/team.controller.ts` (delete `associateTeam`: no caller left)
- Modify: `src/services/invitation.service.ts` (`assertPendingRoom`)
- Modify: `src/utils/vaslidations.ts`, `src/controllers/redirectUri.controller.ts`, `src/app/api/my/configurations/route.ts`, `src/app/api/my/configurations/[id]/route.ts`
- Test: create `test/api/registration.test.ts`, `test/api/redirect-uris.test.ts`; modify `test/api/invitations.test.ts`

**Interfaces:**
- `finishUpUserRegistration(user: User, incoming: Attributes<Company>): Promise<Company>` — when `findPersonalTeam(user.id)` returns a team, updates that team's company with `incoming` (the route already picks `COMPANY_MODIFIABLE_FIELDS`) and returns it; no new company or team. Otherwise creates the company, the team and the OWNER membership in one `DB.connection!.transaction` (what `initTeamOwner` did). `me/complete` calls only this.
- `deleteCompanyById` (both files) and `deleteMyCompany` set `deleted: true`.
- `assertPendingRoom` counts PENDING, not-deleted rows with `invite_expires_at > NOW()` only. A NULL expiry counts as expired, as `findValidInvite` and `createInvitation` already treat it.
- Produces (`src/utils/vaslidations.ts`): `isHttpUrl(value: unknown): value is string` — a string that `new URL()` parses with protocol `http:` or `https:`.
- Redirect URIs are checked on write only (**Decision**: existing rows are not cleaned): `POST /api/my/apps/:id/redirect-uris` (`uri`), `PUT /api/my/redirect-uris/:id` (`uri` when present), `POST /api/my/configurations` and `PUT /api/my/configurations/:id` (`configuration.redirectUri` when present and non-empty). A failure throws `new ApiError(400, 'INVALID_REDIRECT_URI', 'Redirect URI must start with http:// or https://')`, which both error helpers already answer as `{ message, code }` with 400. An owner re-saving a configuration that holds a legacy non-http(s) URI gets this 400 and picks another URI.

- [ ] **Step 1: Write the failing tests**

`test/api/registration.test.ts`:
- `completing sign-up twice leaves one company and one team`: `PUT /api/me/complete` with `company` twice → `companies` and `teams` counts for the user are 1.
- `a second completion updates the company's answers`: second body has `build_for: 'web-app'` → the one company has it.
- `a member of another team who completes sign-up gets a team of their own`.
- `deleteCompanyById marks the company deleted` (controller and service) and `deleteMyCompany marks the caller's company deleted`.

`test/api/invitations.test.ts`:
- Update `allows 50 pending invites per team`: the bulk rows get `invite_expires_at: new Date(Date.now() + 86_400_000)`.
- Add `an expired invite no longer counts toward the 50 pending`: 49 live + 1 expired (and 1 with NULL expiry) → inviting a new email succeeds (2xx); 50 live → still `RATE_LIMITED`.

`test/api/redirect-uris.test.ts` (owner fixtures as in `team-scoped-routes.test.ts`; `fakeIdentity` for the configuration routes):
- it.each `'myapp://callback'`, `'javascript:alert(1)'`, `'localhost:3000'`, `''`, `42` → `refuses %s as a redirect URI on create`: 400 `{ code: 'INVALID_REDIRECT_URI' }`, no row.
- `accepts http and https`; `refuses it on update and keeps the old URI`.
- `refuses a configuration whose redirectUri is not http(s)` (create and update) and `saves a configuration without a redirectUri`.
- `leaves an existing non-http redirect URI as it is` (a row inserted raw is still listed unchanged).

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/registration.test.ts test/api/invitations.test.ts test/api/redirect-uris.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (the `regressions-80` sign-up case still passes), `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/company.controller.ts src/services/company.service.ts src/app/api/me/complete/route.ts src/controllers/team.controller.ts src/services/invitation.service.ts src/utils/vaslidations.ts src/controllers/redirectUri.controller.ts src/app/api/my/configurations test/api/registration.test.ts test/api/invitations.test.ts test/api/redirect-uris.test.ts
git commit -m "fix: one company per sign-up, deleted means deleted, expired invites free room, http(s) redirect URIs"
```

### Task 8: Signer keys encrypted at rest (SEC-1, code)

**Files:**
- Create: `src/scripts/db/init-db_18.sql`, `init-db_18.down.sql`, `test/db/migration-18.test.ts`
- Create: `src/services/signerKeys.service.ts`, `test/api/signer-keys.test.ts`
- Modify: `src/services/signer.service.ts` (`createSigner`, `updateSigner`), `src/models/signer.model.ts` (`api_key: DataTypes.TEXT`; drop `api_key` from `findAllPaginated`'s `exact` filters: an encrypted column can't be filtered by value), `src/app/api/my/apps/[id]/route.ts` (owner `GET`), `src/app/api/my/apps/[id]/signers/route.ts` (`POST` response)
- Modify: `src/scripts/ops/audit-console-data.mjs` (`migration_18_signer_key_text`: `data_type = 'text'` for `signers.api_key`; `signer_keys_plaintext`: `count(*) WHERE api_key <> '' AND api_key NOT LIKE 'enc:%'`), `test/db/audit-data.test.ts`

Every path that touches `signers.api_key`: written by `createSigner` (from `POST /api/my/apps/:id/signers`) and `updateSigner`/`updateMySigner` (no caller today; encrypt anyway); read by `findMyApp`'s `include: Signer` (owner `GET /api/my/apps/:id`; members get `redactApp`, which drops the key and never decrypts) and by the create response. `deleteSigners`/`deleteSignerById` don't read it. `/api/my/apps` lists include no signers.

**Interfaces:**
- `init-db_18.sql`: `ALTER TABLE signers ALTER COLUMN api_key TYPE TEXT;` An `enc:v1` value is about 1.4× the plaintext plus 49 characters, so a 66-character key needs 137, more than today's `VARCHAR(100)`. `init-db_18.down.sql` holds only a comment: the column stays TEXT, because narrowing would fail on encrypted values.
- Consumes: `encryptSecret`, `decryptSecret` from `src/services/connectionKeys.service.ts` (same `CONNECTION_KEYS_SECRET`, same `enc:v1` format: **Decision**).
- Produces (`src/services/signerKeys.service.ts`):
  - `encryptSignerKey(plain: unknown): string` — 400 `INVALID_SIGNER_KEY` `'A signer key must be a string'` for a non-string; `''` stays `''`; 400 `INVALID_SIGNER_KEY` `"A signer key can't start with enc:"`; otherwise `encryptSecret`, with a `CONNECTION_KEYS_UNAVAILABLE` error rethrown as `new ApiError(500, 'SIGNER_KEYS_UNAVAILABLE', 'Signer keys are unavailable')`.
  - `openSigner<T extends { id?: string; api_key?: string | null }>(signer: T): T & { api_key_unreadable?: true }` — `api_key` through `decryptSecret` (plaintext passes as is); if that throws, `api_key: null, api_key_unreadable: true` and `console.error({ step: '[Signer keys]', reason: 'unreadable', signerId })`, never the stored value.
  - `decryptApp(app: App | null)` — the owner's view: `app.toJSON()` with `Signers` mapped through `openSigner`; null for null.
- Routes: the owner's `GET /api/my/apps/:id` answers `decryptApp(app)` (members keep `redactApp`); `POST /api/my/apps/:id/signers` answers `openSigner(created.toJSON())`, so the caller gets back the key it sent, never the stored `enc:v1` value.
- **Decision (one unreadable key):** the list still loads and that row is flagged, as SEC-5 asks for connections (Review Focus 3 of the master plan). If wave 1's SEC-5 has already named its flag differently, use its name here.

- [ ] **Step 1: Write the failing tests**

`test/db/migration-18.test.ts`: `makes signers.api_key TEXT and keeps every key`, `runs twice`, `the down file changes nothing and runs anywhere`. `afterEach` re-runs the migration.

`test/api/signer-keys.test.ts` (fixtures as in `team-scoped-routes.test.ts`; `ANOTHER_SECRET` as in `connection-keys.test.ts`):
- `stores a new signer key encrypted and answers with it`: POST `{ api_key: 'sk-live-1234', address }` → stored value starts with `enc:v1:` and differs from the key; response `api_key === 'sk-live-1234'`.
- `stores a 66-character key`: `'0x' + 'a'.repeat(64)` → 200; the owner reads it back.
- `gives the owner the key back` and `still hides keys from members` (no `api_key` property).
- `loads a list mixing a plaintext, an encrypted and an unreadable key`: three signers inserted directly: `'plain-key'`, `encryptSecret('enc-key')`, and one encrypted while `CONNECTION_KEYS_SECRET` is stubbed to `ANOTHER_SECRET` → owner `GET` is 200; keys `['plain-key', 'enc-key', null]`; only the third has `api_key_unreadable: true`; the body contains no `enc:v1`.
- `reads plaintext keys and flags encrypted ones while the secret is missing`.
- `refuses a key that starts with enc:` → 400 `INVALID_SIGNER_KEY`, no row.
- `refuses to store a key without the secret, without repeating it` → 500 `{ message: 'Signer keys are unavailable', code: 'SIGNER_KEYS_UNAVAILABLE' }`; no row; the body doesn't contain the key.
- `encrypts a key sent through updateSigner`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/migration-18.test.ts test/api/signer-keys.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (`team-scoped-routes.test.ts` still reads its plaintext fixture keys), `npm run typecheck`, eslint and prettier on the changed files.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/db/init-db_18.sql src/scripts/db/init-db_18.down.sql src/services/signerKeys.service.ts src/services/signer.service.ts src/models/signer.model.ts "src/app/api/my/apps/[id]/route.ts" "src/app/api/my/apps/[id]/signers/route.ts" src/scripts/ops/audit-console-data.mjs test/db/migration-18.test.ts test/db/audit-data.test.ts test/api/signer-keys.test.ts
git commit -m "fix(signers): store API keys encrypted, read old and new, flag one that won't open (init-db_18)"
```

### Task 9: Signer key backfill (SEC-1, data)

**Files:**
- Modify: `src/scripts/ops/encrypt-connection-keys.mjs` (export `Refused`, `readSecret`, `encrypt`, `opens`; nothing else changes)
- Create: `src/scripts/ops/encrypt-signer-keys.mjs`, `test/db/signer-key-backfill.test.ts`

**Interfaces:**
- Consumes: those four exports.
- Produces: `applyFrom(args: string[]): boolean` — only `--apply` is accepted; anything else (including `--dry-run`) throws `Refused('Only --apply is accepted as an argument')`. `backfillSignerKeys(pgUrl: string | undefined, secret: string | undefined, { apply = false } = {}): Promise<Counts>`, `Counts = { rows, plaintext_keys, encrypted_keys, unreadable_keys, empty_keys, connection_keys_open, connection_keys_unreadable, column_ready: boolean, written }`. The CLI prints the counts as JSON, or `Nothing was changed: <reason>` with exit 1.
- Refusals before connecting: a secret that isn't 32 bytes of base64; no `PG_URL`; a bad argument.
- Inside one transaction (`BEGIN READ ONLY` without `--apply`; `BEGIN` and `SELECT … FOR UPDATE` with it), over every signer row, deleted ones included: `column_ready` is false while `signers.api_key` has a `character_maximum_length`. The secret is checked against every encrypted key in `connections` (`connection_keys_open` / `connection_keys_unreadable`) as well as in `signers`: prod already holds 26 encrypted connection keys made by the deployed API. With `--apply` it refuses, rolling back, when: `!column_ready` (`signers.api_key is too short for an encrypted key: run init-db_18 first`); `unreadable_keys > 0` or `connection_keys_unreadable > 0` (`<n> stored keys do not open under this CONNECTION_KEYS_SECRET`); or `plaintext_keys > 0` while `encrypted_keys + connection_keys_open === 0` (`No stored key is encrypted yet, so CONNECTION_KEYS_SECRET cannot be checked against one. Create one through the deployed API first`). Otherwise each plaintext, non-empty key is updated with `encrypt`, leaving `updated_at` alone.

- [ ] **Step 1: Write the failing tests** (`test/db/signer-key-backfill.test.ts`)
- `encrypts plaintext keys once and leaves encrypted and empty ones`: second `--apply` run has `written: 0`.
- `writes what the API reads`: after `--apply`, the owner's `GET /api/my/apps/:id` returns the plaintext.
- `counts a key the API wrote as encrypted`.
- `writes nothing without --apply`.
- `checks the secret against the encrypted connection keys`: no encrypted signer key, one connection created through `POST /api/my/connections` → `--apply` succeeds; `connection_keys_open: 1`.
- `refuses to write while no stored key is encrypted, and says what to do`.
- `refuses a secret that cannot open the stored keys` (`ANOTHER_SECRET`, for an encrypted signer key and for an encrypted connection key).
- `refuses while a signer key is unreadable`.
- `refuses until signers.api_key is TEXT`: `ALTER … TYPE VARCHAR(100)` → dry run `column_ready: false`; `--apply` refuses with the init-db_18 message; `afterEach` re-runs `init-db_18.sql`.
- `counts deleted signers too` and `leaves updated_at alone`.
- `from the command line`: `prints only counts` (stdout parses as JSON; contains no key text); `refuses --dry-run and other arguments`; `refuses a missing PG_URL before it connects anywhere`; `refuses a missing secret before it connects`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/db/signer-key-backfill.test.ts`
Expected: FAIL — script not found.

- [ ] **Step 3: Implement** per Interfaces, with a header comment like the connection script's.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run` (`connection-keys.test.ts` unchanged and passing), `npm run typecheck`, eslint and prettier on both scripts and the test.
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/ops/encrypt-connection-keys.mjs src/scripts/ops/encrypt-signer-keys.mjs test/db/signer-key-backfill.test.ts
git commit -m "feat(ops): backfill signer keys into enc:v1, checked against the connection keys"
```

## Console (`/Users/zer0stars/workspace/dimo-developer-console/.worktrees/wave2`)

### Task 10: One session store for every tab (SES-1, part 1)

**Files:**
- Create: `src/utils/globalAccountSession.ts`, `src/utils/__fixtures__/fakeBroadcastChannel.ts` (outside `__tests__`, where Jest would run it as a suite)
- Test: create `__tests__/unit/utils/globalAccountSession.test.ts`

**Interfaces:**
- Produces (`src/utils/globalAccountSession.ts`, `'use client'`):
  - `SESSION_KEY = 'globalAccountSession'` (localStorage), `RESOLVED_ACCOUNT_KEY = 'globalAccountAddresses'` (now localStorage), `SESSION_CHANNEL = 'dimo-console-session'`, `LEGACY_TAB_SESSION_KEY = 'globalAccount'` (the old sessionStorage entry).
  - `interface StoredSession extends IGlobalAccountSession { eKey: string }`. **Decision:** the bundle and the embedded key it was encrypted to live in one entry, written in one `setItem`, so no tab can ever read one sign-in's bundle with another's key. `GlobalAccountEmbeddedKey` stays only for email recovery (`CheckEmail`, `EmailRecoveryForm`, `RewirePasskey`).
  - `type SessionEvent = { type: 'signed-in'; subOrganizationId: string } | { type: 'signed-out' }`.
  - `readSession(): StoredSession | null` — calls `migrateTabSession()` first; null on the server, when nothing is stored, or when the entry doesn't parse or lacks a string `token`, `eKey`, `subOrganizationId` or a number `expiry`.
  - `isLive(session: StoredSession | null, nowSeconds = Math.floor(Date.now() / 1000)): session is StoredSession` — `expiry >= nowSeconds`.
  - `writeSession(session: StoredSession): void` — stores it and posts `{ type: 'signed-in', subOrganizationId }`.
  - `clearSession(): void` — removes `SESSION_KEY`, `RESOLVED_ACCOUNT_KEY` and `GlobalAccountEmbeddedKey` from localStorage and `LEGACY_TAB_SESSION_KEY` from sessionStorage, then posts `{ type: 'signed-out' }`.
  - `migrateTabSession(): void` — does nothing without a sessionStorage `LEGACY_TAB_SESSION_KEY`. With one: if a valid shared session exists, it just removes the old entry; otherwise, if the old entry is live and `decryptCredentialBundle(old.token, <localStorage GlobalAccountEmbeddedKey>)` doesn't throw, it stores `{ ...old, eKey }` under `SESSION_KEY` **without announcing it**. It always removes the old entry (and the old sessionStorage `RESOLVED_ACCOUNT_KEY`). A tab whose bundle no longer matches the key (another tab signed in since) loses its old session, as it would today.
  - `onSessionChange(listener: (event: SessionEvent) => void): () => void` — a `BroadcastChannel(SESSION_CHANNEL)` when `typeof BroadcastChannel === 'function'`; otherwise the window `storage` event: `key === SESSION_KEY` with a value → `signed-in` with its `subOrganizationId`; `SESSION_KEY` removed, or `key === null` (storage cleared) → `signed-out`; other keys ignored. Returns the unsubscribe. A tab never hears its own posts (BroadcastChannel semantics; `storage` fires only in other tabs).
- Produces (fixture): `installFakeBroadcastChannel(): { otherTab(): { post(data: unknown): void; received: unknown[]; close(): void }; restore(): void }` — sets `globalThis.BroadcastChannel` to a class that delivers each post to every other open instance of the same name on a resolved promise (a real microtask, so Jest's fake timers don't hold it).

- [ ] **Step 1: Write the failing tests** (`__tests__/unit/utils/globalAccountSession.test.ts`; `jest.mock('@turnkey/crypto', () => ({ decryptCredentialBundle: jest.fn() }))`; `localStorage.clear()` and `sessionStorage.clear()` in `beforeEach`)
- `readSession`: `returns null when nothing is stored`; it.each `'{'`, an entry without `eKey`, an entry with a string `expiry` → `returns null for a malformed entry`; `reads what writeSession stored`.
- `writeSession`: `stores the bundle and its key together in localStorage` (one `SESSION_KEY` entry with `token` and `eKey`; nothing written to sessionStorage or `GlobalAccountEmbeddedKey`); `tells other tabs who signed in` (`otherTab().received` equals `[{ type: 'signed-in', subOrganizationId: 'sub-1' }]`); `does not hear its own announcement` (an `onSessionChange` listener in this module isn't called).
- `clearSession`: `removes the session, the cached addresses and the old key`; `tells other tabs it signed out`.
- `onSessionChange`: `hears another tab's sign-in and sign-out`; `stops after unsubscribe`; with `BroadcastChannel` deleted: `falls back to the storage event` (a `StorageEvent` for `SESSION_KEY` with a JSON value → `signed-in`; `newValue: null` → `signed-out`; `key: null` → `signed-out`; `key: 'theme'` → nothing).
- `migrateTabSession`: `moves a tab's old session into the shared store, without announcing it` (old entry plus `GlobalAccountEmbeddedKey` `'"key-1"'`, decrypt OK → `readSession()` has `eKey: 'key-1'`; old entry gone; `otherTab().received` empty); `drops an old session whose key another sign-in replaced` (decrypt throws `new Error('invalid ghash tag')` → `readSession()` null, old entry gone); `drops an expired old session`; `keeps the shared session when there already is one` (decrypt not called).
- `isLive`: `is live through its expiry second and not after`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false globalAccountSession`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** per Interfaces.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false globalAccountSession`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/globalAccountSession.ts src/utils/__fixtures__/fakeBroadcastChannel.ts __tests__/unit/utils/globalAccountSession.test.ts
git commit -m "feat(session): one session store for every tab, with its own key and cross-tab events"
```

### Task 11: Every tab uses the shared session; sign-in, sign-out and expiry reach all tabs (SES-1, part 2)

**Files:**
- Modify: `src/hoc/AuthProvider.tsx`, `src/hoc/GlobalAccountProvider.tsx`, `src/services/turnkey.ts`, `src/components/Menu/Menu.tsx`, `src/utils/sessionStorage.ts` (delete the `GlobalAccountSession` export; flash and focus keep using the helpers)
- Test: create `__tests__/unit/hoc/GlobalAccountProvider.test.tsx`, `__tests__/unit/hoc/AuthProvider.test.tsx`, `__tests__/unit/services/turnkey.test.ts`

**Interfaces:**
- Consumes (Task 10): everything it produces.
- `getSessionTurnkeyClient(): TurnkeyClient | null` — from `readSession()`'s own `token` and `eKey`; null without a session.
- `AuthProvider.createSession`: `saveToken`, `queryClient.clear()`, `startConsoleSession`, then `writeSession({ email, role: 'owner', subOrganizationId, token: credentialBundle, expiry: sessionExpiration, eKey: privateKey })`; it no longer writes `GlobalAccountEmbeddedKey`. `loadUserInformation` reads `readSession()`. `logout` calls `clearSession()` in place of its two removes.
- `GlobalAccountProvider`: every `getFromSession(GlobalAccountSession)` plus `getFromLocalStorage(EmbeddedKey)` pair becomes `readSession()` (key from the session). The resolved-address cache (#326) moves to `localStorage[RESOLVED_ACCOUNT_KEY]` (still keyed by `subOrganizationId`; addresses only, the same in every tab), so a new tab skips the Turnkey and RPC round trip. `logout()` = `turnkeyClient.logout()`, forget `rememberedUser`, `queryClient.clear()`, `clearSession()`, `endSession()`, `router.replace('/sign-in')`. A new effect, from mount:
  - another tab's `signed-out` → forget `rememberedUser`, `queryClient.clear()`, `hardNavigate('/sign-in')`; no `endSession` or `clearSession` (that tab did both);
  - another tab's `signed-in` with a `subOrganizationId` other than the one this tab loaded → forget `rememberedUser`, `hardNavigate('/app')`; the same account → nothing (the next Turnkey call reads the new pair);
  - an expiry check scheduled `expiry * 1000 - Date.now() + 1000` ms ahead, and run again on `visibilitychange` to visible and on `focus`: a live session (another tab may have signed in again) reschedules for its expiry; an expired one calls `logout()`; no session at all → `hardNavigate('/sign-in')`.
- `Menu.onSignOut`: `clearSession()` in place of its two removes (it posts `signed-out` to every other tab).
- **Decision:** closing every tab keeps the user signed in until the session expires (localStorage persists; the cookie already lives until expiry). Team switching is unchanged (TeamProvider's focus check).

- [ ] **Step 1: Write the failing tests**

Common mocks: `@/services/zerodev` (`getKernelAccount` → `{ address: KERNEL }`), `@/actions/user` (`endSession`), `@/config/turnkey` (`turnkeyClient.logout`, `passkeyClient`), `next/navigation` (`useRouter` → `{ replace }`), `@/hooks` (`useMixPanel`), `@/utils/hardNavigate`, `@/hoc/QueryProvider` (`queryClient.clear`); `installFakeBroadcastChannel()` per test.

`__tests__/unit/hoc/GlobalAccountProvider.test.tsx` (render `withGlobalAccounts(Probe)`, where `Probe` shows `currentUser?.email`; also mock `@/services/turnkey`'s `getTurnkeyClient`, `getTurnkeyWalletAddress`):
- `a new tab with the shared session shows the account without signing in again`: the session only in localStorage → the email renders; `replace` not called with `'/sign-in'`; `endSession` not called.
- `reuses the addresses another tab resolved`: `RESOLVED_ACCOUNT_KEY` set for `sub-1` → `getTurnkeyWalletAddress` not called.
- `goes to sign-in when another tab signs out`: `otherTab().post({ type: 'signed-out' })` → `hardNavigate` called with `'/sign-in'` (`waitFor`); `endSession` not called.
- `keeps working when another tab signs in to the same account`: post `signed-in` `sub-1` → `hardNavigate` not called; the email still renders.
- `reloads into the new account when another tab signs in as someone else`: `sub-2` → `hardNavigate('/app')`.
- `signs every tab out when the session expires`: fake timers, `expiry = now + 60` → advance 61 s → `endSession` once, `replace('/sign-in')`, `SESSION_KEY` gone, `otherTab().received` contains `{ type: 'signed-out' }`.
- `waits for the later expiry when another tab signed in again`: at +30 s replace the stored session with `expiry = now + 600` → at +61 s `endSession` not called; at +601 s called.
- `checks the session when the tab comes back`: `jest.setSystemTime` past expiry without running timers, dispatch `visibilitychange` → `endSession` called.

`__tests__/unit/services/turnkey.test.ts` (mock `@turnkey/crypto`: `decryptCredentialBundle` throws `new Error('invalid ghash tag')` unless the pair is `('bundle-n', 'key-n')` with the same n, and returns a hex key otherwise; `getPublicKey` stubbed):
- `builds the client from the session's own bundle and key, not the recovery key`: `GlobalAccountEmbeddedKey` = `'"recovery-key"'`, session `bundle-2`/`key-2` → called with `('bundle-2', 'key-2')`.
- `keeps working after another tab signs in again`: `writeSession(bundle-1/key-1)`, then `writeSession(bundle-2/key-2)` → `getSessionTurnkeyClient()` does not throw and was built from pair 2.
- `has no client without a session`.

`__tests__/unit/hoc/AuthProvider.test.tsx` (render `withAuth(Probe)`; `Probe` calls `setUser({ email, subOrganizationId: 'sub-1' })`, then `completeOtpLogin`; mock `@/services/globalAccount` (`otpLogin` → `{ credentialBundle: 'bundle-1' }`), `@turnkey/crypto` (`generateP256KeyPair` → `{ privateKey: 'key-1', publicKeyUncompressed: 'pub-1' }`), `@/actions/dimoAuth` (`getDimoChallenge`, `getDimoToken` → `{ access_token: 't' }`), `@/services/turnkey`, `@/services/zerodev` (`getKernelAccount` → `{ address: KERNEL, signMessage }`), `@/app/sign-up/actions`, `@/actions/user` (`saveToken`, `endSession`); `Probe` passes `existOnDevConsole: true, currentWalletValue: KERNEL`, so no sign-up call is made):
- `a sign-in stores one session for every tab, with its key, and tells them`: `readSession()` has `token: 'bundle-1', eKey: 'key-1', subOrganizationId: 'sub-1'`; sessionStorage has no `globalAccount`; localStorage has no `GlobalAccountEmbeddedKey`; `otherTab().received` contains `{ type: 'signed-in', subOrganizationId: 'sub-1' }`.
- `sends a visitor with a live shared session from the sign-in page to /app`.
- `clears an expired shared session on the sign-in page and tells the other tabs`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false GlobalAccountProvider AuthProvider turnkey`
Expected: FAIL — the providers read sessionStorage; no cross-tab handling.

- [ ] **Step 3: Implement** per Interfaces. `grep -rn "GlobalAccountSession\|EmbeddedKey" src` afterwards shows only `globalAccountSession.ts` and the three email-recovery files.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false GlobalAccountProvider AuthProvider turnkey globalAccountSession RewirePasskey TeamProvider`
Expected: PASS.
Run: `npm test && npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/hoc/AuthProvider.tsx src/hoc/GlobalAccountProvider.tsx src/services/turnkey.ts src/components/Menu/Menu.tsx src/utils/sessionStorage.ts __tests__/unit/hoc/GlobalAccountProvider.test.tsx __tests__/unit/hoc/AuthProvider.test.tsx __tests__/unit/services/turnkey.test.ts
git commit -m "fix(session): every tab shares one session; sign-in, sign-out and expiry reach them all"
```

---

## Release (the user's commands, each after the user's go-ahead; not tasks)

Every command runs in the API worktree, `cd /Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave2`, except steps 8 and 9, which run in the index branch's worktree, `cd /Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/wave2-indexes`, the only checkout with init-db_20/21 and their audit checks (`psql` is Homebrew `postgresql@16`'s, `/opt/homebrew/opt/postgresql@16/bin`). Credentials load from `~/.config/dimo/console-prod.env` and are never echoed. Below, `RO` is a read-only query:
`(set -a; . ~/.config/dimo/console-prod.env; set +a; PGOPTIONS='-c default_transaction_read_only=on' psql "$PG_URL" -X -At -c "<SQL>")`
and `MIGRATE N` is:
`(set -a; . ~/.config/dimo/console-prod.env; set +a; psql "$PG_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f src/scripts/db/init-db_N.sql)`

**Landing order.** console-api squash-merges PRs: each master commit is one `… (#N)`. The API PRs land in this order: #86 and #85, then #87 (wave 1), then the wave-2 API PR (`fix/wave2-accounts`), then the index PR (`fix/wave2-unique-indexes`). Wave 2's own commits sit on BASE2, `7e6ab45a8e1120d51dd6aa407877d4d724778c4d`: #87's head `2c3017b` with #86 and then #85 merged in. Once those three have landed, master's tree is BASE2's, so wave 2 replays onto master without a conflict. A trial on a scratch copy confirmed it, both squashing (steps 2, 3, 5, 8) and with merge commits.
- Merge commits are the alternative: "Create a merge commit" for each PR, in the same order. That needs no rebase, because wave 2 already contains #86, #85 and #87 through BASE2 and the index branch sits on wave 2. Only step 2's merge of master into the second of #85/#86 is still needed.

1. **ACC-1 (read-only, any time).** The audit appends `/api/account/<email>` to the base URL, which is the console's `NEXT_PUBLIC_GA_API` (`src/services/globalAccount.ts`; the console's Vercel project, production). Per the console's Sentry spans that is `https://accounts.dimo.org`; confirm it in DevTools on console.dimo.org's sign-in (requests to `…/api/account/…`). No code change is needed.
   `ACCOUNTS_API_URL=https://accounts.dimo.org node --env-file=$HOME/.config/dimo/console-prod.env src/scripts/ops/audit-console-data.mjs`
   Read `accounts: { checked, missing, unavailable }`. `missing` is ACC-1's answer; `unavailable` counts addresses the API refused (400) or couldn't answer, never as missing.
2. **#86 and #85** (squash; no migration). Either may go first. They conflict in one file, `test/support/auth.ts`, so once one has landed GitHub shows the other as conflicting. In the other's worktree (`.worktrees/hotfix-walletless` for #86, `.worktrees/hotfix-me-complete` for #85), merge master into it, take BASE2's version of the file, and push:
   `git fetch origin && git merge origin/master`, then `git checkout 7e6ab45 -- test/support/auth.ts && git commit -m "Merge master; test/support/auth.ts as in BASE2" && git push origin HEAD`.
   BASE2's resolution keeps #85's `email` and `emailVerified` options on `tokenFor` and builds the token through #86's `tokenWithClaims`. Taking that file keeps master's tree equal to BASE2's. Then squash.
3. **#87 (wave 1).** `MIGRATE 15` first, per wave 1's runbook: the build refuses a database without it. If GitHub asks for an update, run `git fetch origin && git rebase origin/master && git push --force-with-lease origin fix/wave1-hardening` in `.worktrees/wave1`; the trials found no conflict. Then squash.
4. **Before the wave-2 API deploys**, with #86 live (its guard keeps a token without a wallet from matching the rows that 16 turns from `''` into NULL):
   - `RO "SELECT count(*) FROM users WHERE address = ''"` (expect 211) → `MIGRATE 16` → the same query returns 0.
   - `RO "SELECT (SELECT count(*) FROM apps WHERE scope='sanbox'), (SELECT count(*) FROM users WHERE role='OWNER'), (SELECT count(*) FROM companies WHERE type='other')"` shows what 17 corrects; then `MIGRATE 17`. If step 9's audit still shows `users_role_not_lowercase`, `companies_type_unknown` or `companies_build_for_unknown` above 0, the typos sit elsewhere: decide before writing more.
   - `MIGRATE 18` makes signer keys TEXT. It is required before step 6's backfill, which refuses until then; no API code encrypts signer keys.
   - `MIGRATE 19` creates the merge record table.
5. **Wave-2 API PR.** Run `git fetch origin && git rebase --onto origin/master 7e6ab45 fix/wave2-accounts`. It replays only wave 2's own commits, and once #85, #86 and #87 are in that replay is clean. Then `git push --force-with-lease origin fix/wave2-accounts` (always name the branch: a bare push may be refused, and git's hint then suggests pushing to master — never take it) and squash. Its build refuses a database without 16–19. The console PR may follow (step 10).
6. **SEC-1 backfill.** `node --env-file=$HOME/.config/dimo/console-prod.env src/scripts/ops/encrypt-signer-keys.mjs` → expect `plaintext_keys` about 300, `unreadable_keys: 0`, `connection_keys_open >= 26`, `connection_keys_unreadable: 0`, `column_ready: true`. The user reviews, then the same command with `--apply`; rerun without it → `plaintext_keys: 0`.
7. **ACC-3/ACC-4 merge.**
   - **First, read-only:** `RO "SELECT count(*) FROM users WHERE address IS NOT NULL AND address !~ '^0x[0-9a-fA-F]{40}$'"` must be 0. The script treats any shared non-null address as one wallet, so two accounts sharing a malformed or placeholder value would merge on their own; if the count is above 0, list those rows (`RO "SELECT id, address FROM users WHERE address IS NOT NULL AND address !~ '^0x[0-9a-fA-F]{40}$'"`) and decide them before any `--apply`.
   - **Dry run.** `node --env-file=$HOME/.config/dimo/console-prod.env src/scripts/ops/merge-duplicate-accounts.mjs` → about 19 groups (18 wallets, 37 rows, plus one email-only group).
   - **What it merges by itself.** Only a group in which every account carries the group's one wallet. A group that an email alone joins is `needs decision` with the reason `joined by email only`: an account without a wallet, or no wallet at all. Sign-up takes the email from the request body, so the email proves nothing.
   - **What the report shows.** For each account: `wallet` (W1, W2… within the group, never the wallet itself), `teams` and `licenses`. For each group: `takes_wallet`, whether the account kept would take a wallet it lacks.
   - **Review every group whose `shared` includes `email`,** as well as every `needs decision` group (about 6 before this rule; the email-only group is now one of them).
   - **A `joined by email only` group** is merged only by `--keep`, and only after the accounts API (step 1's `/api/account/<email>`) returns, for the keeper's email, the wallet the group holds. A `--keep` dry run (the command with `--keep=<account id>`, without `--apply`) shows `takes_wallet: true` when the keeper takes that wallet. Otherwise `--skip`. The report labels wallets (W1, W2); to see a group's real wallets, `RO "SELECT id, address, email FROM users WHERE id IN (<account ids from the report>)"` (your terminal only).
   - **A group with two wallets: `--skip`,** per the user's rule (don't touch the licenses a different wallet owns). The script refuses a `--keep` that would drop an account on another wallet that belongs to a team or a license. Such a group can't be merged under that rule: it needs its owners' input, and stays in place until then. The script has no override: once the owners agree which account goes, the resolution is by hand outside this runbook (the abandoned account's email changed or the account removed), after which the dry run no longer lists the group.
   - **Apply.** Add `--apply` and one `--keep=<account id>` or `--skip=<account id>` per decided group. Rerun without `--apply` → only the groups deliberately left remain.
   - **Groups left in place.** Each one blocks 20 (a group sharing a wallet) or 21 (a group sharing an email), and the index PR needs both. So the index PR waits until those groups are resolved. Meanwhile wave 2's sign-up check and its 409 mapping already stop new duplicates; the indexes are race protection.
8. **Unique indexes, then the index PR**, in `.worktrees/wave2-indexes`:
   - Once step 7's rerun shows no group, `MIGRATE 20` and `MIGRATE 21`. Each refuses, changing nothing, while a duplicate remains; the error says how many. 20 can go alone once no wallet group is left.
   - Then the index PR: `git fetch origin && git rebase --onto origin/master d16310f fix/wave2-unique-indexes`, then `git push --force-with-lease origin fix/wave2-unique-indexes`, then squash. `d16310f` is the wave-2 head the index branch sits on; if wave 2 changes before it lands, rebase the index branch onto the new head first. Its build refuses a database without 20 and 21.
9. **Final audit** (read-only), in `.worktrees/wave2-indexes`, whose audit has the 20/21 checks: step 1's command, run there. Expect `users_sharing_wallet_ignoring_case` and `users_sharing_email_ignoring_case` at 0, `users_without_wallet` counting the former empty rows, `signer_keys_plaintext` at 0, and `migration_16` through `migration_21` all `true`.
10. **Merge and deploy the console PR.** Verify by hand: sign in; open a second tab on `/license/<tokenId>/details`: it loads with no `/sign-in` bounce. To sign in again in tab 2, first delete the `session-token` cookie in tab 2's DevTools (or wait for the session to expire); with the cookie still valid, `/sign-in` sends you to `/app`. Then sign in there, and act in tab 1 (open the Config tab): it works. Sign out in tab 2: tab 1 reaches `/sign-in` within about a second. In Sentry (`developer-console`), `hpkeDecrypt` `invalid ghash tag` events stop after the deploy.
    Deploy note: users with several tabs open during the deploy may need to sign in once afterwards. A tab still running the old code signs out only its own copy of the session, and a tab whose old session no longer matches its key drops it on first load and ends the shared cookie; both settle within one session lifetime (30 minutes at most).
