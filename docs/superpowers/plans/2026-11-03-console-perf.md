# Console PERF workstream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make console pages load their data side by side and fail fast: reads leave server actions for GET route handlers (PERF-1, PERF-2, PERF-7), and console-api answers each request with fewer, overlapping queries over a pool built for Fluid compute (PERF-3, PERF-4, OPS-4).

**Architecture:** Next runs server actions one at a time, so every read that is a server action queues behind the page's other actions. Each read moves to a GET route handler under `src/app/api/` that calls the same service function (so `dimoDevAPIClient` still forwards the session cookie and `X-Team-Id`), and the browser fetches it through TanStack Query. Team-scoped routes return the service's `ApiResult` as the body with its status, and the browser unwraps it into `TeamApiError`, so NOT_A_MEMBER still reaches TeamProvider. On console-api, `resolveTeamContext` stops repeating the membership lookup and runs company, owner and membership together; the brand ownership check compares stored owners instead of calling Identity; and the Sequelize pool gets Fluid-friendly limits plus `attachDatabasePool`.

**Tech Stack:** Console: Next 16.4, React 19, TanStack Query 5, axios, Jest + Testing Library. API: Next 14.2, Sequelize 6.37 + pg, vitest against real Postgres, `@vercel/functions` 3.10.

**Spec:** `docs/superpowers/plans/2026-11-03-console-remaining-issues.md` (master plan, untracked in the main checkout at `/Users/zer0stars/workspace/dimo-developer-console/docs/superpowers/plans/`), sections PERF-1, PERF-2, PERF-3, PERF-4, PERF-7 and OPS-4, plus its Review Focus items 2 and 3. Evidence for OPS-4: `/Users/zer0stars/.config/dimo/console-qa-2026-11-03/prod-data-audit.md` (licenses `unavailable`, `missing`, `clientIdMismatch`, `ownerMismatch` all `[]`). The OPS-4 rule comes from `docs/superpowers/plans/2026-11-02-console-verified-fixes.md` Task 4.

**Worktrees:** console `/Users/zer0stars/workspace/dimo-developer-console/.worktrees/perf`, API `/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/perf`, branch `perf/console-speed` in both.

## Global Constraints

- Writes stay server actions. Only reads move.
- Reads moved off server actions must keep `X-Team-Id` scoping and still throw `TeamApiError` on NOT_A_MEMBER, which TeamProvider's removal check listens for.
- Every new route handler answers with `Cache-Control: private, no-store` (#326's pattern) and never puts upstream error text, tokens or SQL in its body.
- No production DB write, Vercel setting change or redeploy without the user's go-ahead on the evidence for it.
- Prod credentials load from `~/.config/dimo/console-prod.env`. They are never printed and never passed to a subagent.
- Console tests: `npm test`, `npm run compile`, `npm run lint`. API tests: `npx vitest run` against Homebrew `postgresql@16` on port 55432 (already running), plus `npm run typecheck` and `npm run lint`. Do not run the API's `npm run lint:format` (it has `--write`); use `npx prettier --check <files>`.
- Commits carry no Co-Authored-By trailer or Claude attribution.
- When both repos change, the API ships first. Nothing in this plan needs a migration.

## Review Focus

1. **NOT_A_MEMBER through a GET.** A member removed from the team loads Settings: `/api/team/members` must answer 403 with `code: 'NOT_A_MEMBER'`, and `useTeamMembers` must surface a `TeamApiError` with that code (Task 1).
2. **X-Team-Id from a route handler.** A route handler must send the `active_team` cookie as `X-Team-Id`, exactly as the server action did (Task 1).
3. **The middleware answers instead of the route.** An expired session gets the middleware's 401, whose body is not an `ApiResult`; the browser helper must turn it into `{ ok: false, status: 401 }`, not throw a parse error (Task 1).
4. **A license with no workspace.** A member opening it sees an unbranded license with no error and no create attempt; the owner gets the workspace created once (Task 2).
5. **A credit tracker that hangs.** License details must show "unavailable" within about 3 s, not wait 10 s (Task 5).

---

## Console

### Task 1: Team reads as GET routes (teams, members, pending invite)

**Files:**
- Create: `src/utils/routeResponses.ts`, `src/utils/fetchApiResult.ts`
- Create: `src/app/api/teams/route.ts`, `src/app/api/team/members/route.ts`, `src/app/api/invites/pending/route.ts`
- Modify: `src/app/api/me/route.ts`, `src/app/api/configurations/route.ts` (use the shared `PRIVATE_HEADERS`; behavior unchanged)
- Modify: `src/hoc/TeamProvider.tsx` (`fetchTeams`), `src/hooks/useTeamMembers.ts`, `src/components/PendingInvite/PendingInvite.tsx`
- Modify: `src/actions/teams.ts` (delete `listMyTeams`, `listTeamMembers`; no callers remain)
- Test: `__tests__/unit/app/api/teamReadRoutes.test.ts`, `__tests__/unit/utils/fetchApiResult.test.ts`; update `__tests__/unit/hooks/useTeamMembers.test.tsx`, `__tests__/unit/hoc/TeamProvider.test.tsx`, `__tests__/unit/components/PendingInvite.test.tsx`, `__tests__/unit/hoc/inviteOrdering.test.ts` (mock the new fetch path instead of the actions)

**Interfaces:**
- Produces (`src/utils/routeResponses.ts`):
  - `PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' } as const`
  - `apiResultResponse<T>(result: ApiResult<T>): NextResponse` — body is `result` unchanged; status 200 when `ok`, else `result.status` when it is 400–599, else 502.
  - `upstreamFailure(error: unknown, message: string): NextResponse` — body `{ message }`; status = the AxiosError's response status when there is one, 502 for an AxiosError without a response, 500 otherwise. Always `PRIVATE_HEADERS`.
- Produces (`src/utils/fetchApiResult.ts`): `fetchApiResult<T>(path: string, init?: RequestInit): Promise<ApiResult<T>>` — never throws. A JSON body with a boolean `ok` is returned as is. Any other body (middleware 401, HTML, empty) becomes `{ ok: false, status: response.status, code: null, message: \`GET ${path} failed with ${response.status}\` }`. A rejected `fetch` becomes `{ ok: false, status: 0, code: null, message: <error message> }`.
- Produces routes: `GET /api/teams` → `ApiResult<{ teams: TeamSummary[] }>`; `GET /api/team/members` → `ApiResult<{ members: TeamMember[] }>`; `GET /api/invites/pending` → `ApiResult<InvitePreview | null>` (`{ ok: true, data: null }` when there is no invite cookie).
- Consumes: `fetchMyTeams`, `fetchTeamMembers` from `@/services/teams`; `previewPendingInvite` from `@/actions/invites` (it reads and may delete the HttpOnly invite cookie; cookie writes work in route handlers); `unwrap` from `@/utils/teamApiError`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/fetchApiResult.test.ts` (mock `global.fetch`):
- `returns the ApiResult body of a 200`: body `{ ok: true, data: { teams: [] } }` → same object.
- `returns a refusal body with its code`: status 403, body `{ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'x' }` → same object.
- `turns a non-ApiResult answer into a failure with its status`: status 401, body `{ message: 'Unauthorized' }` → `{ ok: false, status: 401, code: null }` (match with `toMatchObject`).
- `turns a body that is not JSON into a failure`: status 500, `json()` rejects → `{ ok: false, status: 500, code: null }`.
- `turns a network failure into status 0`: `fetch` rejects with `new TypeError('Failed to fetch')` → `{ ok: false, status: 0, code: null, message: 'Failed to fetch' }`.

`__tests__/unit/app/api/teamReadRoutes.test.ts` (`@jest-environment node`; mock `@/services/teams` and `@/actions/invites`, like `readRoutes.test.ts`):
- `GET /api/teams returns the list, never cached`: service `{ ok: true, data: { teams: [team] } }` → 200, same body, `res.headers.get('Cache-Control') === 'private, no-store'`.
- `GET /api/team/members passes NOT_A_MEMBER through`: service `{ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'gone' }` → 403, `body.code === 'NOT_A_MEMBER'`.
- `GET /api/team/members answers 502 when console-api was not reached`: service `{ ok: false, status: 0, code: null, message: 'socket hang up' }` → 502.
- `GET /api/invites/pending answers ok with null when there is no invite`: action resolves `null` → 200, body `{ ok: true, data: null }`.
- `GET /api/invites/pending passes a terminal code through`: action `{ ok: false, status: 410, code: 'INVITE_EXPIRED', message: 'x' }` → 410, `body.code === 'INVITE_EXPIRED'`.
- `GET /api/team/members sends the active team as X-Team-Id` — in its own `describe` that does NOT mock `@/services/teams`: mock `next/headers` `cookies()` to return `session-token=tok` and `active_team=team-9`, mock axios's adapter (follow `__tests__/unit/services/dimoDevAPI.test.ts`) to capture the request config and answer `{ members: [] }`; assert the captured headers have `X-Team-Id: 'team-9'` and `Authorization: 'Bearer tok'`, and the route answers 200.

`__tests__/unit/hooks/useTeamMembers.test.tsx`: mock `@/utils/fetchApiResult`. Keep the existing cases; the NOT_A_MEMBER case asserts `fetchApiResult` was called with `'/api/team/members'` and `result.current.error` is a `TeamApiError` with `code === 'NOT_A_MEMBER'` and `status === 403`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false fetchApiResult teamReadRoutes useTeamMembers`
Expected: FAIL — modules `@/utils/fetchApiResult` and `@/app/api/teams/route` not found.

- [ ] **Step 3: Implement**

Write the two utils and the three routes (each `export const GET`). `TeamProvider.fetchTeams` calls `fetchApiResult<{ teams: TeamSummary[] }>('/api/teams')` and keeps its contract (`null` on any failure; caches the list under `MY_TEAMS_KEY`). `useTeamMembers`' `queryFn` becomes `unwrap(await fetchApiResult<{ members: TeamMember[] }>('/api/team/members')).members`. `PendingInvite` calls `fetchApiResult<InvitePreview | null>('/api/invites/pending')`: `ok` with `data === null` is the old `null` branch (set `NO_PENDING_INVITE`); `ok` with data opens the modal; a failure goes to `explain(code, status)`. Accepting the invite stays the `acceptPendingInvite` server action. Delete `listMyTeams` and `listTeamMembers` from `src/actions/teams.ts`. Update the other listed tests to mock `fetchApiResult` (or `global.fetch`) where they mocked those actions.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false fetchApiResult teamReadRoutes useTeamMembers TeamProvider PendingInvite inviteOrdering readRoutes`
Expected: PASS.
Run: `npm test && npm run compile && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "perf(teams): load teams, members and the pending invite with GET"
```

### Task 2: License reads as GET routes (key registry, workspace and brands)

**Files:**
- Create: `src/app/api/licenses/[tokenId]/signers/route.ts`, `src/app/api/licenses/[tokenId]/brands/route.ts`, `src/hooks/useLicenseBrands.ts`
- Modify: `src/services/brand.ts` (add `LicenseBrands`), `src/hooks/useLicenseSignerRegistry.ts`, `src/app/license/[tokenId]/details/components/Brand/Brand.tsx`, `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ConfigurationForm.tsx`
- Modify: `src/actions/teams.ts` (delete `listLicenseSigners`), `src/actions/workspace.ts` (delete `getWorkspaceByTokenId`), `src/actions/brand.ts` (delete `fetchMyBrands` once no caller remains)
- Test: `__tests__/unit/app/api/licenseReadRoutes.test.ts`; update `__tests__/unit/hooks/useLicenseSignerRegistry.test.tsx`, `__tests__/unit/pages/license/[tokenId]/details/Brand.test.tsx`, and the ConfigurationForm test if one mocks `getWorkspaceByTokenId`/`fetchMyBrands` (`grep -rl` them)

**Interfaces:**
- Consumes (Task 1): `apiResultResponse`, `upstreamFailure`, `PRIVATE_HEADERS`, `fetchApiResult`; existing `fetchJson` (`src/utils/fetchJson.ts`, throws `HttpError`).
- Produces: `export interface LicenseBrands { workspace: IWorkspace | null; brands: BrandView[] }` in `src/services/brand.ts`.
- Produces routes: `GET /api/licenses/:tokenId/signers` → `ApiResult<{ signers: LicenseSignerRecord[] }>` (400 `{ ok: false, status: 400, code: 'BAD_TOKEN_ID', message }` unless `tokenId` matches `/^\d+$/`); `GET /api/licenses/:tokenId/brands` → `LicenseBrands` (same 400 rule with body `{ message }`; `brands` is `[]` and `listMyBrands` is not called when `workspace` is null; a failure → `upstreamFailure(error, 'Could not load brands')`).
- Produces: `licenseBrandsKey(tokenId: number) => ['license-brands', tokenId] as const` and `useLicenseBrands(tokenId: number)` (a `useQuery` over `fetchJson<LicenseBrands>(\`/api/licenses/${tokenId}/brands\`)`) in `src/hooks/useLicenseBrands.ts`.
- Consumes: `fetchLicenseSigners` (`@/services/teams`), `getMyWorkspaceByTokenId` (`@/services/workspace`, null on 403/404), `listMyBrands` (`@/services/brand`). The write `getOrCreateLicenseWorkspace` (`@/actions/workspace`) stays a server action.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/app/api/licenseReadRoutes.test.ts` (node env; mock the three services):
- `signers: returns the registry`: `fetchLicenseSigners` ok → 200, called with `1254` (a number), `Cache-Control: private, no-store`.
- `signers: refuses a token id that is not a number`: `tokenId: 'abc'` → 400, service not called.
- `signers: passes NOT_A_MEMBER through`: service 403 NOT_A_MEMBER → 403 with that code.
- `brands: returns the workspace and its brands`: workspace `{ id: 'ws-1', ... }`, brands `[{ id: 'b1' }]` → 200 `{ workspace, brands }`, `listMyBrands` called with `'ws-1'`.
- `brands: a license without a visible workspace has no brands`: `getMyWorkspaceByTokenId` → `null` → 200 `{ workspace: null, brands: [] }`, `listMyBrands` not called.
- `brands: answers 502 when console-api was not reached`: `getMyWorkspaceByTokenId` rejects with `new AxiosError('Network Error')` → 502, body has no `Network Error` text.

Route params in Next 16 are a promise: call `GET(request, { params: Promise.resolve({ tokenId: '1254' }) })`.

`Brand.test.tsx` (mock `global.fetch` or `@/utils/fetchJson`, and `@/actions/workspace`):
- `shows a member an unbranded license without creating a workspace`: brands route → `{ workspace: null, brands: [] }`, not owner → `getOrCreateLicenseWorkspace` not called, no error toast.
- `creates the workspace once for the owner when there is none`: route → `{ workspace: null, brands: [] }`, owner → `getOrCreateLicenseWorkspace` called once with `{ name, token_id, client_id, owner }` from the fragment; the Add brand button appears once it resolves with an `id`.
- `lists the brands from the route`: route → workspace + 2 brands → both names render.

`useLicenseSignerRegistry.test.tsx`: mock `@/utils/fetchApiResult`; assert the path `'/api/licenses/7/signers'` and that a 403 NOT_A_MEMBER surfaces as `TeamApiError`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false licenseReadRoutes Brand.test useLicenseSignerRegistry`
Expected: FAIL — route modules not found; Brand still calls the actions.

- [ ] **Step 3: Implement**

Routes and hook per Interfaces. `useLicenseSignerRegistry`'s `queryFn` becomes `unwrap(await fetchApiResult<{ signers: LicenseSignerRecord[] }>(\`/api/licenses/${tokenId}/signers\`)).signers`. `Brand.tsx` reads `useLicenseBrands(licenseTokenId)`; when the data has `workspace: null` and the user is the owner, it calls `getOrCreateLicenseWorkspace` once (a ref guards against a second call on re-render) and writes the result into the query cache (`setQueryData(licenseBrandsKey(tokenId), { workspace: ws, brands: [] })`); the existing owner-only error message and Sentry message stay for a null result. Save and delete update the cached `brands`; set-default refetches the query. A query error keeps today's message, `Failed to load brands. Check your connection and reload.` `ConfigurationForm` derives `brandNames` from `useLicenseBrands(fragment.tokenId).data?.brands` (names that are non-empty strings); a failure still leaves the list empty. Delete `listLicenseSigners`, `getWorkspaceByTokenId` and `fetchMyBrands` when `grep -rn` shows no caller in `src`.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false licenseReadRoutes Brand useLicenseSignerRegistry ConfigurationForm Signers`
Expected: PASS.
Run: `npm test && npm run compile && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "perf(license): load the key registry, workspace and brands with GET"
```

### Task 3: Configurator reads as GET routes

**Files:**
- Create: `src/app/api/configurations/[id]/route.ts`
- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationList/ConfigurationList.tsx`, `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx`
- Test: add to `__tests__/unit/app/api/readRoutes.test.ts`; update or add tests for `ConfigurationList` and the configurator edit `View` (`grep -rl ConfigurationList __tests__`)

**Interfaces:**
- Consumes (Task 1): `PRIVATE_HEADERS`, `upstreamFailure`; existing `fetchJson`, `GET /api/configurations?clientId=` (returns `IConfigurationListItem[]`, 502 on failure).
- Consumes: `getConfiguration({ id })` from `@/actions/configurations` (returns `IConfiguration`).
- Produces: `GET /api/configurations/:id` → `IConfiguration`; failure → `upstreamFailure(error, 'Could not load the configuration')` (a 404 from console-api stays 404).
- Query keys: the list uses `['configurations', clientId]`, the same key `LicenseCard` uses, so the two share a cache. The edit page uses `['configuration', id]`.

- [ ] **Step 1: Write the failing tests**

`readRoutes.test.ts`, new `describe('GET /api/configurations/[id]')`:
- `returns the configuration`: action resolves `{ id: 'c1', configuration_name: 'n', configuration: {} }` → 200, same body, `Cache-Control: private, no-store`, action called with `{ id: 'c1' }`.
- `keeps console-api's 404`: action rejects with an AxiosError of status 404 → 404.
- `answers 502 when console-api was not reached`: `new AxiosError('Network Error')` → 502.

ConfigurationList test:
- `lists the configurations from the route`: `fetch` → 200 `[{ id: 'c1', configuration_name: 'Main', entry_state: 'EMAIL_INPUT' }]` → "Main" and "Login with DIMO" render; fetch URL is `/api/configurations?clientId=<clientId>`.
- `says when the list could not be loaded`: fetch → 502 → `Could not load configurations. Reload to try again.` (use a QueryClient with `retry: false` in the test wrapper).
- `reloads the list after a delete`: after confirming delete (the `deleteConfiguration` action mocked to resolve), the list is fetched again.

Edit View test: `fills the form from the route`: fetch `/api/configurations/c1` → saved values appear in the form; on 502 the toast `Couldn't load this configuration. Reload the page to try again.` shows.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false readRoutes ConfigurationList configurator`
Expected: FAIL — route module not found; components still call the actions.

- [ ] **Step 3: Implement**

The route per Interfaces (params are a promise). `ConfigurationList` uses `useQuery({ queryKey: ['configurations', clientId], queryFn: () => fetchJson<IConfigurationListItem[]>(...) })`; `configs === null` becomes `isPending`, `loadFailed` becomes `isError`, and after a successful delete it calls `refetch()`. The edit `View` uses `useQuery({ queryKey: ['configuration', configurationId], enabled: !!configurationId, queryFn: () => fetchJson<IConfiguration>(\`/api/configurations/${encodeURIComponent(configurationId)}\`) })` and calls `reset(toFormValues(...))` in an effect when the data arrives, keeping the string-or-object parse of `configuration`. `getConfigurationsByClientId` and `getConfiguration` stay in `@/actions/configurations` (the routes import them, as `/api/configurations` already does).

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false readRoutes ConfigurationList configurator LicenseCard`
Expected: PASS.
Run: `npm test && npm run compile && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "perf(configurator): load configurations with GET and share the list cache"
```

### Task 4: Connections and simulator reads as GET routes; lists fail after one retry (PERF-7)

**Files:**
- Create: `src/app/api/connections/route.ts`, `src/app/api/connections/[id]/route.ts`, `src/app/api/simulated-vehicles/route.ts`
- Modify: `src/hoc/QueryProvider.tsx` (export the retry policy, one retry), `src/hooks/queries/useMyConnections.ts`, `src/app/connections/[id]/components/View/View.tsx`, `src/app/connections/create/[owner]/components/View/View.tsx`, `src/app/app/list/components/VehicleSimulator/index.tsx`, `src/app/license/vehicles/[clientId]/components/VehicleDetailsTable/VehicleDetailsTable.tsx`
- Test: `__tests__/unit/app/api/connectionReadRoutes.test.ts`, `__tests__/unit/hoc/QueryProvider.test.ts`; update tests that mock `getMyConnections`, `getConnectionById` or `getSimulatedVehicles` (`grep -rl` them)

**Interfaces:**
- Consumes (Task 1): `PRIVATE_HEADERS`, `upstreamFailure`; existing `fetchJson`, `HttpError`, `isClientError`.
- Consumes: `getMyConnections(): Promise<Connection[]>`, `getConnectionById(id): Promise<Connection | null>` (`@/actions/connections`); `getSimulatedVehicles({ clientId }): Promise<SimulatedVehicle[]>` (`@/actions/simulatedVehicles`, already returns `[]` on any failure — keep that; SES-4 changes it later).
- Produces routes: `GET /api/connections` → `Connection[]`; `GET /api/connections/:id` → `Connection | null` (200 with `null` for a deleted row, as console-api answers today; SEC-5 changes that later); `GET /api/simulated-vehicles?clientId=` → `SimulatedVehicle[]` (400 `{ message }` without `clientId`). Failures → `upstreamFailure`.
- Produces (`src/hoc/QueryProvider.tsx`): `export const QUERY_RETRIES = 1` and `export const defaultQueryRetry = (failureCount: number, error: unknown): boolean => !isClientError(error) && failureCount < QUERY_RETRIES`, used as the client's `defaultOptions.queries.retry`.
- Query keys stay: `['my-connections']`, `['connection', id]`, `['simulated-vehicles', clientId]` (VehicleDetailsTable switches from an effect to `useQuery` with this same key).

Ruling carried from the controller: the connections list (`getMyConnections`) was a server action too, and PERF-7 needs its HTTP status (a server action loses it, so every failure was retried 3 times). It moves to GET here even though PERF-1's list does not name it.

- [ ] **Step 1: Write the failing tests**

`QueryProvider.test.ts`:
- `retries a server failure once`: `defaultQueryRetry(0, new HttpError(500, 'x'))` → true; `defaultQueryRetry(1, new HttpError(500, 'x'))` → false.
- `never retries a refusal`: `defaultQueryRetry(0, new HttpError(404, 'x'))` → false.
- `retries a network failure once`: `defaultQueryRetry(0, new TypeError('Failed to fetch'))` → true; `(1, …)` → false.

`connectionReadRoutes.test.ts` (node env; mock the two action modules):
- `GET /api/connections returns the list`: 200, `Cache-Control: private, no-store`.
- `GET /api/connections keeps console-api's 403`: action rejects with AxiosError status 403 → 403.
- `GET /api/connections/[id] answers 200 null for a deleted connection`: action → `null` → 200, body `null`.
- `GET /api/simulated-vehicles requires a client id` → 400, action not called.
- `GET /api/simulated-vehicles returns the vehicles`: called with `{ clientId: '0xabc' }`.

Connections list (component or hook test, QueryClient with `retry: defaultQueryRetry, retryDelay: 0`):
- `shows the error after one retry`: fetch `/api/connections` → 500 twice → `There was a problem fetching your connections` renders and `fetch` was called exactly 2 times.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false QueryProvider connectionReadRoutes connections`
Expected: FAIL — `defaultQueryRetry` not exported; route modules not found.

- [ ] **Step 3: Implement**

The three routes per Interfaces. `useMyConnections`' `queryFn` becomes `() => fetchJson<Connection[]>('/api/connections')` (keep `staleTime` and `refetchOnWindowFocus`). Both connection-detail queries and the resume effect in `create/[owner]` fetch `/api/connections/${encodeURIComponent(id)}` with `fetchJson` (a rejection keeps the resume page's `LOAD_FAILED` path). `VehicleSimulator` and `VehicleDetailsTable` fetch `/api/simulated-vehicles?clientId=${encodeURIComponent(clientId)}`. Replace the inline retry in `QueryProvider` with `defaultQueryRetry` and update the comment above it to say one retry.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false QueryProvider connectionReadRoutes connections VehicleSimulator VehicleDetailsTable`
Expected: PASS.
Run: `npm test && npm run compile && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "perf(connections): load connections and simulated vehicles with GET; fail lists after one retry"
```

### Task 5: Credit usage as a GET route with a 3 s timeout (PERF-2)

**Files:**
- Create: `src/app/api/credit-usage/route.ts`
- Modify: `src/services/creditTracker.ts` (no longer `'use server'`; 3 s timeout), `src/hooks/useCreditTracker.ts`, `src/app/license/[tokenId]/details/components/Usage/Usage.tsx`
- Test: `__tests__/unit/app/api/creditUsageRoute.test.ts`; update `__tests__/unit/pages/license/[tokenId]/details/Usage.test.tsx` and any test of `getCreditConsumptionByLicense`

**Interfaces:**
- Consumes (Task 1): `PRIVATE_HEADERS`. Existing `HttpError`.
- Produces (`src/services/creditTracker.ts`): `export const CREDIT_TRACKER_TIMEOUT_MS = 3_000`; `getCreditConsumptionByLicense({ licenseId, fromDate, toDate, devJwt }): Promise<ICreditUsage>` keeps its signature and its throw-without-the-JWT behavior, with `timeout: CREDIT_TRACKER_TIMEOUT_MS`.
- Produces route: `GET /api/credit-usage?licenseId=<0x + 40 hex>` with header `X-Developer-Jwt: <dev JWT>` → `ICreditUsage`. The route computes `fromDate` (now minus one month) and `toDate` (now) as ISO strings, as the hook does today. 400 `{ message }` when `licenseId` fails `/^0x[0-9a-fA-F]{40}$/` or the header is missing; any tracker failure → 502 `{ message: 'Credit usage unavailable' }`.
- Produces (`useCreditTracker`): `getUsageByLicense({ licenseId, devJwt }): Promise<ICreditUsage>` — same signature, now `fetch('/api/credit-usage?licenseId=…', { headers: { 'X-Developer-Jwt': devJwt } })`; a non-2xx throws `HttpError`.
- The dev JWT travels in a header, never in the URL.

- [ ] **Step 1: Write the failing tests**

`creditUsageRoute.test.ts` (node env; mock axios `create` to capture its config and stub `get`, or mock `@/services/creditTracker` for the status cases):
- `asks the tracker with a 3 s timeout`: the axios instance is created with `timeout: 3000` and `Authorization: 'Bearer jwt-1'`; `get` is called with `/v1/credits/<licenseId>/usage`.
- `returns the usage`: tracker → `{ numOfCreditsUsed: 12, … }` → 200, same body, `Cache-Control: private, no-store`.
- `refuses a license id that is not an address`: `licenseId=../../x` → 400, tracker not called.
- `refuses a request without the developer JWT` → 400.
- `answers 502 when the tracker times out, without the JWT`: tracker rejects with an AxiosError code `ECONNABORTED` whose config carries the JWT → 502, `JSON.stringify(body)` does not contain `jwt-1`.

`Usage.test.tsx`:
- `shows the credits used`: fetch → 200 `{ numOfCreditsUsed: 12 }` → `12` renders.
- `says usage is unavailable when the tracker fails`: fetch → 502 → `Usage unavailable right now` renders and the number shows `—`.
- `sends the JWT as a header, not in the URL`: the fetch URL contains no `jwt`, and `init.headers['X-Developer-Jwt']` is the dev JWT.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx jest --coverage=false creditUsageRoute Usage`
Expected: FAIL — route module not found; Usage shows no unavailable text.

- [ ] **Step 3: Implement**

The route per Interfaces. `Usage.tsx` keeps `credits: number | null` and adds `unavailable: boolean`: a failed fetch sets it, a success clears it; when it is set and the user has a dev JWT, the hint line reads `Usage unavailable right now` (same `overview-stat-card__hint` class). Everything else on the card stays.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx jest --coverage=false creditUsageRoute Usage`
Expected: PASS.
Run: `npm test && npm run compile && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A src __tests__
git commit -m "perf(usage): load credit usage with GET, give up after 3 s and say so"
```

## API (`/Users/zer0stars/workspace/dimo-developer-console-api/.worktrees/perf`)

### Task 6: Fewer, overlapping queries in `resolveTeamContext` (PERF-3)

**Files:**
- Modify: `src/services/teamContext.service.ts` (`resolveTeamContext`)
- Create: `test/support/queries.ts`
- Test: `test/services/team-context.test.ts`

**Interfaces:**
- Produces (`test/support/queries.ts`): `captureQueries<T>(run: () => Promise<T>): Promise<{ result: T; queries: string[] }>` — sets `DB.connection!.options.logging` to push each SQL string, runs `run`, and restores the previous value in a `finally`. If Sequelize does not read `options.logging` per query, use the `beforeQuery` hook (`DB.connection!.addHook('beforeQuery', …)` / `removeHook`) instead; the signature stays.
- `resolveTeamContext(request, options)` keeps its signature and its `TeamContext` result, errors and codes.

- [ ] **Step 1: Write the failing tests**

New `describe('queries per request')` in `test/services/team-context.test.ts`, using `contextFor` and the fixtures already in that file:
- `looks up a member's membership once`: member of Acme sends `X-Team-Id: acme.team.id` → among the captured queries, exactly 1 matches `/FROM "team_collaborators"/`; the returned `membership` is that member's row and `role` is `MEMBER`.
- `asks for the owner's own row at most once`: the owner sends `X-Team-Id` → `queries.filter(q => /FROM "users"/.test(q)).length === 1` (the caller; the owner is the caller).
- `answers an owner with X-Team-Id in at most 4 queries` and `answers a member with X-Team-Id in at most 5 queries`.
- `still refuses a non-member before reading the company`: outsider sends Acme's id → `NOT_A_MEMBER`, and no captured query matches `/FROM "companies"/`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/services/team-context.test.ts`
Expected: FAIL — the member path matches `team_collaborators` twice; the member path runs 6 queries.

- [ ] **Step 3: Implement**

Keep the membership row the belonging check fetched (undefined when the caller is the creator or no header was sent). Once the team is known, run `Company.findOne`, the owner lookup (`user` itself when the caller created the team) and the membership lookup (skipped when already known) in one `Promise.all`, then apply the existing `!team || !company` and `!owner` checks in that order.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass (364 before this plan, plus the new ones).
Run: `npm run typecheck && npm run lint && npx prettier --check src/services/teamContext.service.ts test/support/queries.ts test/services/team-context.test.ts`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/teamContext.service.ts test/support/queries.ts test/services/team-context.test.ts
git commit -m "perf(team-context): one membership lookup, company/owner/membership side by side"
```

### Task 7: The brand ownership check compares stored owners (OPS-4)

**Files:**
- Modify: `src/controllers/workspace.controller.ts` (`isWorkspaceInTeam`, its doc comment, the `isLicenseOwner` import if unused), `src/app/api/my/workspace/by-token/[tokenId]/route.ts` (drop the `await` and any Identity-only error branch this makes dead)
- Test: `test/api/brand-per-license.test.ts`, plus the `fakeIdentity` lines that served only this check in `test/api/team-owned-resources.test.ts` and `test/api/team-scoped-routes.test.ts`

**Interfaces:**
- Produces: `isWorkspaceInTeam(teamCtx: TeamContext, workspace: Workspace): boolean` — true when both `teamCtx.ownerAddress` and `workspace.owner` are non-empty and equal ignoring case. No Identity call. `assertWorkspaceInTeam` keeps its signature.
- Unchanged: `POST /api/my/workspace` still verifies ownership through Identity before it stores `owner` (that is why stored owners can be trusted: `owner` is never taken from the body, and licenses are soulbound).

Ruling carried from the controller: the prior plan's gate for this revert is met (audit: `unavailable`, `missing`, `clientIdMismatch`, `ownerMismatch` all `[]` across 250 workspaces). This task is one commit so it can be dropped on its own if the user disagrees.

- [ ] **Step 1: Write the failing tests**

In `test/api/brand-per-license.test.ts`, replace `describe('a workspace whose stored owner is wrong')` and `describe('a brand route when Identity is down')` with:
- `describe('the stored owner decides')`:
  - `opens the workspace to the team whose owner's wallet is stored, ignoring case`: workspace `owner` stored in upper case → the owner's brand list is 200.
  - `shuts out a team whose owner's wallet is not stored`: another team's owner → 403 on read and write.
  - `lets a member of the stored owner's team read but not write`.
- `describe('brand reads without Identity')`:
  - `reads brands while Identity is down`: fake Identity failing (the existing down-fixture) → the owner's brand list is 200, not 502.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/api/brand-per-license.test.ts`
Expected: FAIL — the Identity-down read answers 502; the upper-case stored owner is decided by Identity.

- [ ] **Step 3: Implement** per Interfaces. Remove the `fakeIdentity` fixture lines in the two other test files that existed only for this check (each file still passes without them).

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run typecheck && npm run lint && npx prettier --check src/controllers/workspace.controller.ts "src/app/api/my/workspace/by-token/[tokenId]/route.ts" test/api`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A src test
git commit -m "refactor(brand): stored owner is enough, licenses can't transfer"
```

### Task 8: A Sequelize pool sized for Fluid compute, released before suspend (PERF-4)

**Files:**
- Create: `src/services/dbPool.ts`
- Modify: `src/services/db.ts`, `package.json` / `package-lock.json` (add `@vercel/functions` `^3.10.6`)
- Test: `test/services/db-pool.test.ts`

**Interfaces:**
- Produces (`src/services/db.ts`): `export const POOL = { max: 10, min: 0, idle: 5_000, acquire: 10_000, evict: 1_000 } as const`, passed as Sequelize's `pool` option; `DB.connect()` calls `attachSequelizePool(sequelize, POOL.idle)` right after creating the instance.
- Produces (`src/services/dbPool.ts`): `attachSequelizePool(sequelize: Sequelize, idleMs: number): EventEmitter`. `attachDatabasePool` from `@vercel/functions` recognizes pg's `Pool` by `on` plus `options.idleTimeoutMillis`, and throws `Unsupported database pool type` for Sequelize's own pool. So this builds an `EventEmitter` adapter with `options = { idleTimeoutMillis: idleMs }`, passes it to `attachDatabasePool`, and wraps `sequelize.connectionManager.releaseConnection` so that every release, after the original settles, emits `'release'` on the adapter. Returns the adapter (for tests).

- [ ] **Step 1: Write the failing tests**

`test/services/db-pool.test.ts` (build a fresh `new Sequelize(process.env.PG_URL!, { dialectModule: pg, pool: POOL, logging: false })` per test and `close()` it after):
- `is accepted by attachDatabasePool`: the real `attachDatabasePool` (not mocked) does not throw for the adapter `attachSequelizePool` builds.
- `tells the pool watcher about each released connection`: after `attachSequelizePool(seq, POOL.idle)`, a listener on the adapter's `'release'` is called once by `seq.query('SELECT 1')`.
- `waits for the pool's idle time`: `adapter.options.idleTimeoutMillis === 5000`.
- `bounds the pool`: `POOL` equals `{ max: 10, min: 0, idle: 5000, acquire: 10000, evict: 1000 }`, and the app's `DB.connection!.config.pool` has `max: 10` and `idle: 5000`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run test/services/db-pool.test.ts`
Expected: FAIL — `@/services/dbPool` not found.

- [ ] **Step 3: Implement**

`npm install @vercel/functions@^3.10.6`, then the two files per Interfaces. `attachDatabasePool` does nothing outside Vercel (`VERCEL_URL`/`VERCEL_REGION` unset), so tests and local dev are unaffected.

- [ ] **Step 4: Run the tests and the checks**

Run: `npx vitest run`
Expected: all pass.
Run: `npm run typecheck && npm run lint && npm run build && npx prettier --check src/services/db.ts src/services/dbPool.ts test/services/db-pool.test.ts`
Expected: pass (the build proves `@vercel/functions` bundles for the Next 14 server).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/services/db.ts src/services/dbPool.ts test/services/db-pool.test.ts
git commit -m "perf(db): bound the pool for Fluid compute and release idle connections before suspend"
```

---

## Release (the user's go-ahead, after review; not tasks)

1. Merge and deploy the API PR first. No migration.
2. Confirm that the API's `PG_URL` points at Neon's pooled host (`-pooler` in the host name). The user checks this; the value is never printed here.
3. Merge and deploy the console PR.
4. **Verify PERF-1:** Sentry traces of `/settings` and `/license/:tokenId/details` show the reads overlapping instead of chained.
5. **Verify PERF-4:** the Neon connection count stays bounded under load (Neon console, Monitoring).
6. OPS-5's three-day comparison (Fluid) now also covers this change; read it with that in mind.
