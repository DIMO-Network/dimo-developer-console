# Console teams, part 3: dimo-developer-console implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a license owner invite teammates into a console team, show members the team's licenses, let a member use Vehicles through a developer JWT signed by their own Turnkey wallet, and record who every license key is for.

**Architecture:**

- **`TeamProvider`** sits inside `AuthorizedLayout`. It loads the caller's teams from console-api (part 2), keeps the active team in the `active_team` cookie, and accepts a pending invite from the `invite_token` cookie. Every console-api call made through `dimoDevAPIClient` sends `X-Team-Id`.
- **License lists** query Identity by the active team owner's wallet instead of the user's own.
- **Owner actions on-chain:** `enableSigner`/`disableSigner` go out as batched transactions through the existing `processTransactions`, and are recorded in console-api's key registry.
- **Members' developer JWTs:** a member gets one by signing the dex challenge (`address = clientId`) with their Turnkey EOA.
- **Data proxy:** `/api/data/*` asks console-api whether the session user may use the developer JWT's license, matches the JWT's `signer_address` claim for members, and logs one structured line per request.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Apollo Client (Identity), TanStack Query, Turnkey (`@turnkey/viem`), viem, ZeroDev kernel batching, Jest + React Testing Library, Playwright screenshot harness.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md`.
**Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md`. C1, C3, C4, C5, C6, C7 and C8 are used verbatim.

## Global Constraints

- Branch `console-teams` in `~/workspace/dimo-developer-console`. App Router only; Turnkey signing runs in the browser, never during SSR.
- **Header and cookies (C4):**
  - Header `X-Team-Id`.
  - Cookie `active_team`: `Path=/; Max-Age=31536000; SameSite=Lax`.
  - Cookie `invite_token`: `Path=/; Max-Age=86400; SameSite=Lax`, deleted after acceptance.
  - Query parameter `invite`.
- **Flag (C5):** `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED`, on only for the exact string `"true"`, read at build time like `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED`. When off, **Grant** is hidden and members can't use Vehicles. Invites, membership, the switcher and the key registry stay on.
- **JWT claim (C1):** `signer_address`, compared case-insensitively. dex puts it on the `access_token` (the developer JWT from `/auth/web3/submit_challenge`) whenever the challenge signature is a plain 65-byte ECDSA signature, which the member's Turnkey EOA always produces. Per C1's missing-claim rule, the console data proxy refuses a member's developer JWT without the claim; platform consumers allow it.
- **Webhook field (C3):** `createdBySigner`, optional and checksummed, only on the webhook objects from `GET /v1/webhooks` (`fetchWebhooks`). `GET /v1/webhooks/:id` returns the webhook's vehicles, not the webhook.
- **Signer proof (C6):** the exact message `DIMO Developer Console\nLink signer ${eoa} to account ${kernelAddress}\nIssued at ${issuedAt}`, with checksummed addresses and an ISO time, signed by the Turnkey EOA with EIP-191.
- **Endpoints (C7):** the console-api endpoints, error codes and wire types exactly as listed. The types are defined once, in `src/types/team.ts`. `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me` ignore `X-Team-Id` and never answer 403 for a stale one; `GET /api/my/license-access` returns `{ access, teamId, signerAddress, userEmail }`.
- **Copy (C8):**
  - Grant dialog warning: `Data access lets {name} use every permission vehicles have granted {license}, including commands, through the DIMO APIs — not only what the console shows.`
  - Member without access: `Ask {ownerEmail} for data access to {license}.`
  - Proxy refusing a removed member: `You no longer have access to this license.`
- **Error codes beyond the happy path (C7):**
  - `502 EMAIL_FAILED` on invite or resend reads `We couldn't email {email}. Try again.`
  - `403 NOT_A_MEMBER` from any team-scoped call means the user was removed mid-session. The server drops `active_team`, and `TeamProvider` toasts `You're no longer a member of {team name}.` and reloads into the personal team.
  - `401 UNAUTHORIZED` and `400 INVALID_ADDRESS` surface as console-api's message.
- **Fleet design system** (`docs/DESIGN.md`) is locked:
  - token classes only, no hex, sentence case, no `uppercase`;
  - one `primary` per surface;
  - status via `StatusChip` (dot plus `text-fg` label), names via neutral chips (`rounded-chip bg-highest px-2 py-0.5 text-label text-muted`);
  - `font-mono text-code` only for addresses, keys and JWTs;
  - `npm run visual:check` must pass on touched paths.
- **Commits:** no `Co-Authored-By` trailer, ever. The pre-commit hook runs `npm run lint` and Prettier on staged files; let it.
- **Dependencies:** console-api part 2 (endpoints C7) must be deployed before this ships. Unit tests mock the server actions and never call console-api.
- **Owners in their personal team** see no behavior change: the same licenses, API keys, developer JWTs and webhooks.

## Review Focus

1. **Stale `active_team` cookie** (the member was removed, or the team deleted): the console falls back to the personal team once, without a reload loop. The test is in Task 4.
2. **An invite opened while signed in with a different email:** a mismatch toast, the cookie cleared, no team switch and no retry on the next page. The test is in Task 4.
3. **Mixed-case addresses everywhere.** Identity returns checksummed addresses, Turnkey returns lowercase, and console-api may return either. Every signer and owner comparison is case-insensitive. Tests are in Tasks 7, 8, 9, 13 and 14.
4. **A member's developer JWT without `signer_address`** (minted from a shared API key): the proxy refuses with the C8 copy and never exchanges. The test is in Task 9.
5. **Grant transaction succeeds but the registry write fails twice:** no second `enableSigner`, and the toast offers **Assign** to retry only the registry write. The test is in Task 12.

---

### Task 1: Team wire types, data-access flag and team cookies

**Files:**

- Modify: `src/types/team.ts` (append; the old exports stay until Task 11)
- Modify: `src/utils/featureFlags.ts`
- Create: `src/utils/teamCookies.ts`
- Create: `src/config/teamCopy.ts`
- Test: `__tests__/unit/utils/teamCookies.test.ts`, `__tests__/unit/utils/featureFlags.test.ts`, `__tests__/unit/config/teamCopy.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - From `@/types/team`: `TeamRole`, `MembershipStatus`, `TeamSummary`, `TeamMember`, `SignerKind`, `LicenseSignerHolder`, `LicenseSignerRecord`, `HolderInput`, `LicenseSignerInput`, `LicenseAccess`, `SignerProofInput`, `ApiResult<T>`.
  - From `@/utils/featureFlags`: `TEAM_DATA_ACCESS_ENABLED: boolean`.
  - From `@/utils/teamCookies`:
    - constants `ACTIVE_TEAM_COOKIE`, `INVITE_TOKEN_COOKIE`, `INVITE_QUERY_PARAM`, `TEAM_ID_HEADER`, `ACTIVE_TEAM_MAX_AGE`, `INVITE_TOKEN_MAX_AGE`;
    - functions `getActiveTeamCookie(): string | null`, `setActiveTeamCookie(id: string): void`, `clearActiveTeamCookie(): void`, `getInviteTokenCookie(): string | null`, `clearInviteTokenCookie(): void`.
  - From `@/config/teamCopy`: `grantWarning(name, license)`, `askForAccess(ownerEmail, license)`, `NO_LONGER_HAS_ACCESS`, `formatList(names: string[])`.

- [ ] **Step 1: Record the baseline**

Run:

```bash
cd ~/workspace/dimo-developer-console && git status -sb && git log --oneline -3
npx jest 2>&1 | tail -5 | tee /tmp/console-teams-baseline.txt
npx tsc --noEmit -p . 2>&1 | tail -3
```

Expected: branch `console-teams`, clean. Write the failing-suite count from the Jest summary into the PR description later. Master already had stale failing suites (icon snapshots, CEL); only new failures count against this work.

- [ ] **Step 2: Write the failing tests**

`__tests__/unit/utils/teamCookies.test.ts`:

```ts
import {
  ACTIVE_TEAM_COOKIE,
  clearActiveTeamCookie,
  clearInviteTokenCookie,
  getActiveTeamCookie,
  getInviteTokenCookie,
  INVITE_TOKEN_COOKIE,
  setActiveTeamCookie,
  TEAM_ID_HEADER,
} from '@/utils/teamCookies';

const reset = () => {
  document.cookie = `${ACTIVE_TEAM_COOKIE}=; Path=/; Max-Age=0`;
  document.cookie = `${INVITE_TOKEN_COOKIE}=; Path=/; Max-Age=0`;
};

describe('team cookies', () => {
  beforeEach(reset);

  it('uses the contract names', () => {
    expect(ACTIVE_TEAM_COOKIE).toBe('active_team');
    expect(INVITE_TOKEN_COOKIE).toBe('invite_token');
    expect(TEAM_ID_HEADER).toBe('X-Team-Id');
  });

  it('round-trips the active team and clears it', () => {
    expect(getActiveTeamCookie()).toBeNull();
    setActiveTeamCookie('team-acme');
    expect(getActiveTeamCookie()).toBe('team-acme');
    clearActiveTeamCookie();
    expect(getActiveTeamCookie()).toBeNull();
  });

  it('encodes values that are not cookie-safe', () => {
    setActiveTeamCookie('a b;c');
    expect(getActiveTeamCookie()).toBe('a b;c');
  });

  it('reads and clears the invite token set by the middleware', () => {
    document.cookie = `${INVITE_TOKEN_COOKIE}=tok_123; Path=/`;
    expect(getInviteTokenCookie()).toBe('tok_123');
    clearInviteTokenCookie();
    expect(getInviteTokenCookie()).toBeNull();
  });
});
```

`__tests__/unit/utils/featureFlags.test.ts`:

```ts
const load = (value: string | undefined): boolean => {
  const previous = process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  if (value === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = value;
  let flag = false;
  jest.isolateModules(() => {
    flag = require('@/utils/featureFlags').TEAM_DATA_ACCESS_ENABLED;
  });
  if (previous === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = previous;
  return flag;
};

describe('TEAM_DATA_ACCESS_ENABLED', () => {
  it('is on only for the exact string "true"', () => {
    expect(load('true')).toBe(true);
    expect(load('TRUE')).toBe(false);
    expect(load('1')).toBe(false);
    expect(load(undefined)).toBe(false);
  });
});
```

`__tests__/unit/config/teamCopy.test.ts`:

```ts
import {
  askForAccess,
  formatList,
  grantWarning,
  NO_LONGER_HAS_ACCESS,
} from '@/config/teamCopy';

describe('team copy (index C8)', () => {
  it('words the grant warning exactly', () => {
    expect(grantWarning('Sam Rivera', 'Harness Fleet')).toBe(
      'Data access lets Sam Rivera use every permission vehicles have granted Harness Fleet, including commands, through the DIMO APIs — not only what the console shows.',
    );
  });

  it('words the member notice and the proxy refusal exactly', () => {
    expect(askForAccess('ops@acme.dev', 'Harness Fleet')).toBe(
      'Ask ops@acme.dev for data access to Harness Fleet.',
    );
    expect(NO_LONGER_HAS_ACCESS).toBe('You no longer have access to this license.');
  });

  it('joins license names in prose', () => {
    expect(formatList(['A'])).toBe('A');
    expect(formatList(['A', 'B'])).toBe('A and B');
    expect(formatList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts`
Expected: FAIL. `teamCookies` and `teamCopy` don't exist, and `TEAM_DATA_ACCESS_ENABLED` is `undefined`.

- [ ] **Step 4: Implement**

Append to `src/types/team.ts`:

```ts
// --- Wire types for the console-api team endpoints (contracts index C7) ---
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

export interface LicenseSignerInput {
  kind: SignerKind;
  note?: string | null;
  holders: HolderInput[];
}

export interface LicenseAccess {
  access: 'OWNER' | 'MEMBER' | 'NONE';
  teamId: string | null;
  signerAddress: `0x${string}` | null;
  userEmail: string;
}

export interface SignerProofInput {
  address: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}

// Server actions return this instead of throwing: Next replaces thrown errors
// with a generic one in production, and the UI needs the console-api code.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string | null; message: string };
```

Append to `src/utils/featureFlags.ts`:

```ts
// Off until dex emits signer_address and token-exchange-api checks isSigner in
// an environment (console teams spec, Rollout). While off, owners cannot grant
// data access and members cannot use Vehicles; teams and the key registry stay.
export const TEAM_DATA_ACCESS_ENABLED =
  process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED === 'true';
```

Create `src/utils/teamCookies.ts`:

```ts
// Cookies and header shared by the browser, server actions and the middleware
// (console teams contracts, C4). Client helpers no-op during SSR.
export const ACTIVE_TEAM_COOKIE = 'active_team';
export const INVITE_TOKEN_COOKIE = 'invite_token';
export const INVITE_QUERY_PARAM = 'invite';
export const TEAM_ID_HEADER = 'X-Team-Id';
export const ACTIVE_TEAM_MAX_AGE = 60 * 60 * 24 * 365;
export const INVITE_TOKEN_MAX_AGE = 60 * 60 * 24;

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!hit) return null;
  const value = decodeURIComponent(hit.slice(prefix.length));
  return value === '' ? null : value;
};

const writeCookie = (name: string, value: string, maxAge: number) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
};

export const getActiveTeamCookie = () => readCookie(ACTIVE_TEAM_COOKIE);
export const setActiveTeamCookie = (teamId: string) =>
  writeCookie(ACTIVE_TEAM_COOKIE, teamId, ACTIVE_TEAM_MAX_AGE);
export const clearActiveTeamCookie = () => writeCookie(ACTIVE_TEAM_COOKIE, '', 0);
export const getInviteTokenCookie = () => readCookie(INVITE_TOKEN_COOKIE);
export const clearInviteTokenCookie = () => writeCookie(INVITE_TOKEN_COOKIE, '', 0);
```

Create `src/config/teamCopy.ts`:

```ts
// Copy shared with the other console-teams parts (contracts index C8). Change
// it there first.
export const formatList = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

export const grantWarning = (name: string, license: string) =>
  `Data access lets ${name} use every permission vehicles have granted ${license}, including commands, through the DIMO APIs — not only what the console shows.`;

export const askForAccess = (ownerEmail: string, license: string) =>
  `Ask ${ownerEmail} for data access to ${license}.`;

export const NO_LONGER_HAS_ACCESS = 'You no longer have access to this license.';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts`
Expected: PASS, 3 suites.

- [ ] **Step 6: Commit**

```bash
git add src/types/team.ts src/utils/featureFlags.ts src/utils/teamCookies.ts src/config/teamCopy.ts __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts
git commit -m "feat(teams): wire types, data-access flag, team cookies and shared copy"
```

---

### Task 2: console-api client, `X-Team-Id` and team endpoints

**Files:**

- Modify: `src/services/dimoDevAPI.ts`
- Create: `src/services/teams.ts` (server-side calls)
- Create: `src/actions/teams.ts` (`'use server'` wrappers the client calls)
- Test: `__tests__/unit/services/dimoDevAPI.test.ts`, `__tests__/unit/services/teams.test.ts`

**Interfaces:**

- Consumes: Task 1 types and `ACTIVE_TEAM_COOKIE` / `TEAM_ID_HEADER`.
- Produces:
  - `clearStaleTeamOnNotAMember(error)`, an axios response interceptor on every `dimoDevAPIClient`. On `403` with code `NOT_A_MEMBER` it deletes the `active_team` cookie, where cookies are writable (server actions and route handlers), then rethrows. Task 4 turns that into the toast and reload.
- Server actions in `@/actions/teams`, each returning `Promise<ApiResult<…>>`:
  - `listMyTeams(): { teams: TeamSummary[] }`
  - `listTeamMembers(): { members: TeamMember[] }`
  - `inviteTeamMember(email: string): { member: TeamMember }`
  - `resendTeamInvite(id: string): { member: TeamMember }`
  - `cancelTeamInvite(id: string): null`
  - `acceptTeamInvite(token: string): { team: TeamSummary }`
  - `removeTeamMember(id: string): null`
  - `registerSigner(input: SignerProofInput): { signerAddress: \`0x${string}\`; signerVerifiedAt: string }`
  - `listLicenseSigners(tokenId: number): { signers: LicenseSignerRecord[] }`
  - `upsertLicenseSigner(tokenId: number, address: string, input: LicenseSignerInput): { signer: LicenseSignerRecord }`
  - `markLicenseSignerDisabled(tokenId: number, address: string): { signer: LicenseSignerRecord }`

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/services/dimoDevAPI.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
import { AxiosError, type AxiosResponse } from 'axios';
import { cookies } from 'next/headers';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

const withCookies = (values: Record<string, string>) =>
  (cookies as jest.Mock).mockResolvedValue({
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
  });

describe('dimoDevAPIClient', () => {
  it('sends the active team as X-Team-Id', async () => {
    withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
    const client = await dimoDevAPIClient();
    expect(client.defaults.headers['X-Team-Id']).toBe('team-acme');
    expect(client.defaults.headers['Authorization']).toBe('Bearer jwt');
  });

  it('omits the header without an active team', async () => {
    withCookies({ 'session-token': 'jwt' });
    const client = await dimoDevAPIClient();
    expect(client.defaults.headers['X-Team-Id']).toBeUndefined();
  });

  it('keeps an explicit token over the cookie', async () => {
    withCookies({ 'session-token': 'cookie-jwt' });
    const client = await dimoDevAPIClient(5000, 'explicit');
    expect(client.defaults.headers['Authorization']).toBe('Bearer explicit');
  });

  const refusedWith = (code: string) =>
    new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 403,
      data: { code, message: 'x' },
    } as AxiosResponse);
  const withDeletableCookies = () => {
    const remove = jest.fn();
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) =>
        name === 'active_team' ? { value: 'team-acme' } : undefined,
      delete: remove,
    });
    return remove;
  };

  it('drops the active team cookie when console-api says the user left the team', async () => {
    const remove = withDeletableCookies();
    const client = await dimoDevAPIClient();
    const refusal = refusedWith('NOT_A_MEMBER');
    await expect(
      client.get('/api/my/apps', {
        adapter: async () => {
          throw refusal;
        },
      }),
    ).rejects.toBe(refusal);
    expect(remove).toHaveBeenCalledWith('active_team');
  });

  it('leaves the cookie alone for any other refusal', async () => {
    const remove = withDeletableCookies();
    const client = await dimoDevAPIClient();
    await expect(
      client.post(
        '/api/my/apps',
        {},
        {
          adapter: async () => {
            throw refusedWith('OWNER_ONLY');
          },
        },
      ),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(remove).not.toHaveBeenCalled();
  });
});
```

`__tests__/unit/services/teams.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { AxiosError, type AxiosResponse } from 'axios';

const client = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => client),
}));
import * as teams from '@/services/teams';

const axiosFailure = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('team endpoints', () => {
  beforeEach(() => Object.values(client).forEach((fn) => fn.mockReset()));

  it('lists teams', async () => {
    client.get.mockResolvedValue({ data: { teams: [{ id: 't1' }] } });
    await expect(teams.fetchMyTeams()).resolves.toEqual({
      ok: true,
      data: { teams: [{ id: 't1' }] },
    });
    expect(client.get).toHaveBeenCalledWith('/api/my/teams');
  });

  it('posts an invitation and maps a console-api error code', async () => {
    client.post.mockRejectedValue(
      axiosFailure(409, { message: 'Already a member', code: 'ALREADY_MEMBER' }),
    );
    await expect(teams.postInvitation('sam@harness.dev')).resolves.toEqual({
      ok: false,
      status: 409,
      code: 'ALREADY_MEMBER',
      message: 'Already a member',
    });
    expect(client.post).toHaveBeenCalledWith('/api/my/team/invitations', {
      email: 'sam@harness.dev',
    });
  });

  it('uses the contract paths for every endpoint', async () => {
    client.post.mockResolvedValue({ data: {} });
    client.put.mockResolvedValue({ data: {} });
    client.delete.mockResolvedValue({ data: '' });
    client.get.mockResolvedValue({ data: {} });
    await teams.postResendInvitation('inv 1');
    await teams.deleteInvitation('inv-2');
    await teams.postAcceptInvitation('tok');
    await teams.deleteTeamMember('m-1');
    await teams.putSignerProof({
      address: '0xA',
      message: 'm',
      signature: '0xs',
    } as never);
    await teams.fetchTeamMembers();
    await teams.fetchLicenseSigners(42);
    await teams.putLicenseSigner(42, '0xAbC', {
      kind: 'API_KEY',
      holders: [{ name: 'Ops' }],
    });
    await teams.postLicenseSignerDisabled(42, '0xAbC');
    expect(client.post.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/invitations/inv%201/resend',
      '/api/invitations/accept',
      '/api/my/licenses/42/signers/0xAbC/disabled',
    ]);
    expect(client.post.mock.calls[1][1]).toEqual({ token: 'tok' });
    expect(client.delete.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/invitations/inv-2',
      '/api/my/team/members/m-1',
    ]);
    expect(client.put.mock.calls.map((c) => c[0])).toEqual([
      '/api/me/signer',
      '/api/my/licenses/42/signers/0xAbC',
    ]);
    expect(client.get.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/members',
      '/api/my/licenses/42/signers',
    ]);
  });

  it('answers a network failure with status 0', async () => {
    client.get.mockRejectedValue(new Error('socket hang up'));
    await expect(teams.fetchMyTeams()).resolves.toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'socket hang up',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/services/dimoDevAPI.test.ts __tests__/unit/services/teams.test.ts`
Expected: FAIL. There's no `X-Team-Id` header, and `@/services/teams` is missing.

- [ ] **Step 3: Implement**

`src/services/dimoDevAPI.ts`, full replacement:

```ts
import { cookies } from 'next/headers';
import axios, { AxiosError } from 'axios';

import config from '@/config';
import { ACTIVE_TEAM_COOKIE, TEAM_ID_HEADER } from '@/utils/teamCookies';

export const cookieName = 'session-token';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

export const dimoDevAPIClient = async (timeout: number = 5000, token?: string) => {
  let authHeader = undefined;

  if (token) {
    authHeader = `Bearer ${token}`;
  } else {
    const sessionToken = await getCookie(cookieName);
    if (sessionToken) {
      authHeader = `Bearer ${sessionToken}`;
    }
  }

  // console-api resolves every /api/my/* call against this team; without it the
  // caller's personal team is used (contracts C4/C7).
  const teamId = await getCookie(ACTIVE_TEAM_COOKIE);

  const client = axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
      ...(teamId ? { [TEAM_ID_HEADER]: teamId } : {}),
    },
  });
  client.interceptors.response.use(undefined, clearStaleTeamOnNotAMember);
  return client;
};

// The user was removed from the active team mid-session (403 NOT_A_MEMBER,
// contracts C7). Dropping the cookie makes every later call use the personal
// team, and TeamProvider notices the missing cookie to say so and reload.
// Cookies are only writable in server actions and route handlers; elsewhere
// (middleware, server components) the delete throws and is skipped.
export const clearStaleTeamOnNotAMember = async (error: unknown) => {
  const code =
    error instanceof AxiosError
      ? (error.response?.data as { code?: string } | undefined)?.code
      : undefined;
  if (
    error instanceof AxiosError &&
    error.response?.status === 403 &&
    code === 'NOT_A_MEMBER'
  ) {
    try {
      (await cookies()).delete(ACTIVE_TEAM_COOKIE);
    } catch {
      // read-only cookie store here; the next server action clears it
    }
  }
  throw error;
};
```

`src/services/teams.ts`:

```ts
import { AxiosError, type AxiosInstance } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import type {
  ApiResult,
  LicenseSignerInput,
  LicenseSignerRecord,
  SignerProofInput,
  TeamMember,
  TeamSummary,
} from '@/types/team';

export const toFailure = (error: unknown): ApiResult<never> => {
  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as { message?: string; code?: string } | undefined;
    return {
      ok: false,
      status: error.response.status,
      code: body?.code ?? null,
      message: body?.message ?? error.message,
    };
  }
  return {
    ok: false,
    status: 0,
    code: null,
    message: error instanceof Error ? error.message : 'Request failed',
  };
};

const call = async <T>(
  run: (client: AxiosInstance) => Promise<{ data: T }>,
): Promise<ApiResult<T>> => {
  try {
    const client = await dimoDevAPIClient();
    const { data } = await run(client);
    return { ok: true, data };
  } catch (error) {
    return toFailure(error);
  }
};

const id = (value: string) => encodeURIComponent(value);

export const fetchMyTeams = () =>
  call<{ teams: TeamSummary[] }>((c) => c.get('/api/my/teams'));

export const fetchTeamMembers = () =>
  call<{ members: TeamMember[] }>((c) => c.get('/api/my/team/members'));

export const postInvitation = (email: string) =>
  call<{ member: TeamMember }>((c) => c.post('/api/my/team/invitations', { email }));

export const postResendInvitation = (inviteId: string) =>
  call<{ member: TeamMember }>((c) =>
    c.post(`/api/my/team/invitations/${id(inviteId)}/resend`),
  );

export const deleteInvitation = async (inviteId: string) => {
  const result = await call<unknown>((c) =>
    c.delete(`/api/my/team/invitations/${id(inviteId)}`),
  );
  return result.ok ? ({ ok: true, data: null } as const) : result;
};

export const postAcceptInvitation = (token: string) =>
  call<{ team: TeamSummary }>((c) => c.post('/api/invitations/accept', { token }));

export const deleteTeamMember = async (memberId: string) => {
  const result = await call<unknown>((c) =>
    c.delete(`/api/my/team/members/${id(memberId)}`),
  );
  return result.ok ? ({ ok: true, data: null } as const) : result;
};

export const putSignerProof = (input: SignerProofInput) =>
  call<{ signerAddress: `0x${string}`; signerVerifiedAt: string }>((c) =>
    c.put('/api/me/signer', input),
  );

export const fetchLicenseSigners = (tokenId: number) =>
  call<{ signers: LicenseSignerRecord[] }>((c) =>
    c.get(`/api/my/licenses/${tokenId}/signers`),
  );

export const putLicenseSigner = (
  tokenId: number,
  address: string,
  input: LicenseSignerInput,
) =>
  call<{ signer: LicenseSignerRecord }>((c) =>
    c.put(`/api/my/licenses/${tokenId}/signers/${address}`, input),
  );

export const postLicenseSignerDisabled = (tokenId: number, address: string) =>
  call<{ signer: LicenseSignerRecord }>((c) =>
    c.post(`/api/my/licenses/${tokenId}/signers/${address}/disabled`),
  );
```

`src/actions/teams.ts`:

```ts
'use server';

import * as api from '@/services/teams';
import type { LicenseSignerInput, SignerProofInput } from '@/types/team';

// Thin server actions: the browser never holds the session token, so every
// console-api call goes through here and carries the session cookie and the
// active team header (dimoDevAPIClient).
export const listMyTeams = async () => api.fetchMyTeams();
export const listTeamMembers = async () => api.fetchTeamMembers();
export const inviteTeamMember = async (email: string) => api.postInvitation(email);
export const resendTeamInvite = async (inviteId: string) =>
  api.postResendInvitation(inviteId);
export const cancelTeamInvite = async (inviteId: string) =>
  api.deleteInvitation(inviteId);
export const acceptTeamInvite = async (token: string) => api.postAcceptInvitation(token);
export const removeTeamMember = async (memberId: string) =>
  api.deleteTeamMember(memberId);
export const registerSigner = async (input: SignerProofInput) =>
  api.putSignerProof(input);
export const listLicenseSigners = async (tokenId: number) =>
  api.fetchLicenseSigners(tokenId);
export const upsertLicenseSigner = async (
  tokenId: number,
  address: string,
  input: LicenseSignerInput,
) => api.putLicenseSigner(tokenId, address, input);
export const markLicenseSignerDisabled = async (tokenId: number, address: string) =>
  api.postLicenseSignerDisabled(tokenId, address);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/services/dimoDevAPI.test.ts __tests__/unit/services/teams.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/dimoDevAPI.ts src/services/teams.ts src/actions/teams.ts __tests__/unit/services/dimoDevAPI.test.ts __tests__/unit/services/teams.test.ts
git commit -m "feat(teams): send X-Team-Id, drop a stale team on NOT_A_MEMBER, add the team endpoints"
```

---

### Task 3: Capture invite links, retire `invitation_code`, drop the collaborator bypass

**Files:**

- Create: `src/utils/inviteCookie.ts`
- Modify: `src/middleware.ts` (wrap the response; look up the sub-organization by the user's own email)
- Modify: `src/services/user.ts` (no `invitation_code`; delete `acceptInvitation`)
- Modify: `src/utils/loggedUser.ts` (remove the collaborator bypass)
- Modify: `src/app/sign-in/components/View/View.tsx` (remove the collaborator redirect)
- Test: `__tests__/unit/utils/inviteCookie.test.ts`, `__tests__/unit/utils/loggedUser.test.ts`, `__tests__/unit/services/user.test.ts`

**Interfaces:**

- Consumes: `INVITE_QUERY_PARAM`, `INVITE_TOKEN_COOKIE`, `INVITE_TOKEN_MAX_AGE` (Task 1).
- Produces: `withInviteCookie<R extends Response>(request: NextRequest, response: R): R`, which sets `invite_token` on any `NextResponse` the middleware returns, redirects included.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/inviteCookie.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { withInviteCookie } from '@/utils/inviteCookie';

const TOKEN = 'Qm9vdHN0cmFwX3Rva2VuX2Zvcl90ZXN0aW5nXzEyMzQ1Ng';
const req = (query: string) => new NextRequest(`https://console.test/sign-in${query}`);

describe('withInviteCookie', () => {
  it('stores ?invite= on a pass-through response', () => {
    const res = withInviteCookie(req(`?invite=${TOKEN}`), NextResponse.next());
    const cookie = res.cookies.get('invite_token');
    expect(cookie?.value).toBe(TOKEN);
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBe(86400);
    expect(cookie?.sameSite).toBe('lax');
  });

  it('stores it on a redirect too (a signed-in user is sent to /app)', () => {
    const res = withInviteCookie(
      req(`?invite=${TOKEN}`),
      NextResponse.redirect(new URL('https://console.test/app')),
    );
    expect(res.cookies.get('invite_token')?.value).toBe(TOKEN);
  });

  it('ignores a missing or malformed token', () => {
    expect(
      withInviteCookie(req(''), NextResponse.next()).cookies.get('invite_token'),
    ).toBeUndefined();
    expect(
      withInviteCookie(req('?invite=a%3Cb'), NextResponse.next()).cookies.get(
        'invite_token',
      ),
    ).toBeUndefined();
  });
});
```

`__tests__/unit/utils/loggedUser.test.ts`:

```ts
import { LoggedUser } from '@/utils/loggedUser';
import type { IUser } from '@/types/user';
import type { ISubOrganization } from '@/types/wallet';

const user = {
  name: 'Sam',
  email: 'sam@x.dev',
  role: 'COLLABORATOR',
} as unknown as IUser;

describe('LoggedUser', () => {
  it('no longer treats a collaborator without a sub-organization as a global account user', () => {
    const logged = new LoggedUser(user, {} as ISubOrganization);
    expect(logged.isGlobalAccountUser).toBe(false);
    expect(logged.missingFlow).toBe('wallet-creation');
  });

  it('accepts anyone with their own sub-organization', () => {
    const logged = new LoggedUser(user, {
      subOrganizationId: 'sub-1',
    } as ISubOrganization);
    expect(logged.isGlobalAccountUser).toBe(true);
  });
});
```

`__tests__/unit/services/user.test.ts`:

```ts
/**
 * @jest-environment node
 */
const get = jest.fn();
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => ({ get })),
  getCookie: jest.fn(async () => 'legacy-code'),
}));
import { getUserByToken } from '@/services/user';

describe('getUserByToken', () => {
  it('no longer forwards the legacy invitation_code cookie', async () => {
    get.mockResolvedValue({ data: { email: 'jane@harness.dev' } });
    await expect(getUserByToken()).resolves.toEqual({ email: 'jane@harness.dev' });
    expect(get).toHaveBeenCalledWith('/api/me');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts`
Expected: FAIL. `inviteCookie` is missing, the collaborator still passes as a global account user, and `/api/me?invitation_code=legacy-code` is still requested.

- [ ] **Step 3: Implement**

`src/utils/inviteCookie.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import {
  INVITE_QUERY_PARAM,
  INVITE_TOKEN_COOKIE,
  INVITE_TOKEN_MAX_AGE,
} from '@/utils/teamCookies';

// base64url of 32 random bytes is 43 characters; allow some slack, nothing else.
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

// An invite link (/sign-in?invite=…) may be redirected before any page runs
// (a signed-in user goes straight to /app), so the middleware keeps the token
// in a cookie that TeamProvider reads once the user is inside the console.
export const withInviteCookie = <R extends Response>(
  request: NextRequest,
  response: R,
): R => {
  const token = request.nextUrl.searchParams.get(INVITE_QUERY_PARAM);
  if (!token || !TOKEN.test(token) || !(response instanceof NextResponse))
    return response;
  response.cookies.set(INVITE_TOKEN_COOKIE, token, {
    path: '/',
    sameSite: 'lax',
    maxAge: INVITE_TOKEN_MAX_AGE,
  });
  return response;
};
```

`src/middleware.ts`:

- Add `import { withInviteCookie } from '@/utils/inviteCookie';` beside the other imports.
- In `validatePrivateSession`, replace

```ts
const subOrganization = await getUserSubOrganization(
  user.company_email_owner ?? user.email,
);
```

with

```ts
// Every console user signs in with their own global account; team members
// are no longer represented by the company owner's account.
const subOrganization = await getUserSubOrganization(user.email);
```

- In `middleware`, replace

```ts
if (token) {
  return validatePrivateSession(request);
}

return validatePublicSession(request);
```

with

```ts
const response = token
  ? await validatePrivateSession(request)
  : await validatePublicSession(request);
return withInviteCookie(request, response);
```

`src/services/user.ts`: replace `getUserByToken` and delete `acceptInvitation` (it has no callers):

```ts
export const getUserByToken = async () => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};
```

Also change the import to `import { dimoDevAPIClient } from '@/services/dimoDevAPI';` (`getCookie` is no longer used here).

`src/utils/loggedUser.ts`: delete the line `if (isCollaborator(this._user?.role ?? '')) return true;` and the now-unused `import { isCollaborator } from './user';`.

`src/app/sign-in/components/View/View.tsx`:

- Delete `import { isCollaborator } from '@/utils/user';`.
- Change `const { role, subOrganizationId, hasPasskey, currentWalletAddress } = userInformation;` to `const { subOrganizationId, hasPasskey, currentWalletAddress } = userInformation;`.
- Delete the block:

```ts
if (isCollaborator(role)) {
  router.replace('/app');
  return;
}
```

- [ ] **Step 4: Run the tests and type check**

Run: `npx jest __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts __tests__/unit/utils/middlewareUtils.test.ts && npx tsc --noEmit -p . 2>&1 | grep -E "middleware|loggedUser|sign-in|services/user" ; echo done`
Expected: PASS. The `grep` prints nothing before `done`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/inviteCookie.ts src/middleware.ts src/services/user.ts src/utils/loggedUser.ts src/app/sign-in/components/View/View.tsx __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts
git commit -m "feat(teams): keep invite links in a cookie and remove the collaborator sign-in bypass"
```

---

### Task 4: `TeamProvider`: active team, switching, invite acceptance

**Files:**

- Create: `src/context/TeamContext.ts`
- Create: `src/hoc/TeamProvider.tsx` (exports `TeamProvider` and `withTeams`)
- Create: `src/hooks/useTeam.ts`
- Create: `src/utils/hardNavigate.ts`
- Create: `src/utils/inviteErrors.ts`
- Modify: `src/hoc/index.ts`, `src/hooks/index.ts`, `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`
- Modify: `src/types/user.ts` (drop `role` from `IUserSession`), `src/hoc/GlobalAccountProvider.tsx` (no hard-coded `OWNER`)
- Modify: `src/components/AccountInfoButton/AccountInfoButton.tsx`, `src/components/CreditsWidget/CreditsWidget.tsx`, `src/app/settings/components/TeamManagement/TeamManagement.tsx`, `src/utils/user.ts`
- Test: `__tests__/unit/hoc/TeamProvider.test.tsx`

**Interfaces:**

- Consumes: `listMyTeams`, `acceptTeamInvite` (Task 2); cookie helpers (Task 1).
- Produces:
  - `useTeam(): TeamContextValue`, where `TeamContextValue` is

    ```ts
    {
      teams: TeamSummary[];
      activeTeam: TeamSummary | null;
      isLoading: boolean;
      isOwner: boolean;
      isMember: boolean;
      ownerAddress: `0x${string}` | null;
      switchTeam(teamId: string): void;
      refreshTeams(): Promise<void>;
    }
    ```

  - `withTeams` HOC.
  - `hardNavigate(path: string): void`.
  - `inviteErrorMessage(code: string | null): string`.
  - Session storage key `teamFlash`, holding `{ tone: 'success' | 'error'; message: string }` to toast after a reload.
  - `REMOVAL_CHECK_MS = 1000`. While a non-personal team is active, `TeamProvider` checks every second for a server-dropped `active_team` cookie (Task 2's interceptor). When it's gone, it toasts `You're no longer a member of {team name}.` (via the flash) and reloads into the personal team.
  - Invite acceptance runs only inside `AuthorizedLayout` (`withTeams`). It never runs on the guest sign-in or sign-up pages, so it happens after sign-up, including the company step, and the 1-day `invite_token` survives the whole flow.

- [ ] **Step 1: Write the failing test**

`__tests__/unit/hoc/TeamProvider.test.tsx`:

```tsx
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/teams', () => ({
  listMyTeams: jest.fn(),
  acceptTeamInvite: jest.fn(),
}));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
jest.mock('@/hooks/useSignerRegistration', () => ({ useSignerRegistration: jest.fn() }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { acceptTeamInvite, listMyTeams } from '@/actions/teams';
import { hardNavigate } from '@/utils/hardNavigate';
import { toast } from 'sonner';
import { REMOVAL_CHECK_MS, TeamProvider } from '@/hoc/TeamProvider';
import { useTeam } from '@/hooks/useTeam';
import type { TeamSummary } from '@/types/team';

const PERSONAL: TeamSummary = {
  id: 'team-harness',
  name: 'Harness Motors',
  companyName: 'Harness Motors',
  role: 'OWNER',
  ownerUserId: 'user-harness',
  ownerEmail: 'jane@harness.dev',
  ownerAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
  isPersonal: true,
};
const ACME: TeamSummary = {
  ...PERSONAL,
  id: 'team-acme',
  name: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'user-acme',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a',
  isPersonal: false,
};

const Probe = () => {
  const team = useTeam();
  return (
    <div data-testid="probe">
      {JSON.stringify({
        loading: team.isLoading,
        active: team.activeTeam?.id ?? null,
        isOwner: team.isOwner,
        isMember: team.isMember,
        owner: team.ownerAddress,
      })}
    </div>
  );
};
const probe = () => JSON.parse(screen.getByTestId('probe').textContent!);
const clearCookies = () => {
  document.cookie = 'active_team=; Path=/; Max-Age=0';
  document.cookie = 'invite_token=; Path=/; Max-Age=0';
};

describe('TeamProvider', () => {
  beforeEach(() => {
    clearCookies();
    sessionStorage.clear();
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teams: [PERSONAL, ACME] },
    });
  });

  it('defaults to the personal team', async () => {
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'team-harness',
      isOwner: true,
      isMember: false,
      owner: PERSONAL.ownerAddress,
    });
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('uses the team named by the active_team cookie', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'team-acme',
      isMember: true,
      owner: ACME.ownerAddress,
    });
  });

  it('falls back to the personal team once when the cookie names a team the user left', async () => {
    document.cookie = 'active_team=team-gone; Path=/';
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-harness');
  });

  it('accepts a pending invite, switches to the team and toasts after the reload', async () => {
    document.cookie = 'invite_token=tok_abcdefghijklmnopqrstu; Path=/';
    (acceptTeamInvite as jest.Mock).mockResolvedValue({ ok: true, data: { team: ACME } });
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(acceptTeamInvite).toHaveBeenCalledWith('tok_abcdefghijklmnopqrstu');
    expect(document.cookie).not.toContain('invite_token=');
    expect(document.cookie).toContain('active_team=team-acme');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'success',
      message: 'You joined Acme Mobility',
    });
  });

  it('makes the accepted team (role MEMBER, not personal) the active team by its id', async () => {
    document.cookie = 'invite_token=tok_abcdefghijklmnopqrstu; Path=/';
    const joined = {
      ...ACME,
      id: 'team-joined',
      role: 'MEMBER' as const,
      isPersonal: false,
    };
    (acceptTeamInvite as jest.Mock).mockResolvedValue({
      ok: true,
      data: { team: joined },
    });
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-joined');
  });

  it("accepts for a new user whose only team is someone else's (after sign-up)", async () => {
    document.cookie = 'invite_token=tok_abcdefghijklmnopqrstu; Path=/';
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: true, data: { teams: [] } });
    (acceptTeamInvite as jest.Mock).mockResolvedValue({ ok: true, data: { team: ACME } });
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() =>
      expect(acceptTeamInvite).toHaveBeenCalledWith('tok_abcdefghijklmnopqrstu'),
    );
    expect(document.cookie).toContain('active_team=team-acme');
  });

  it('keeps the invite for a later page when teams cannot be listed yet', async () => {
    document.cookie = 'invite_token=tok_abcdefghijklmnopqrstu; Path=/';
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(acceptTeamInvite).not.toHaveBeenCalled();
    expect(document.cookie).toContain('invite_token=tok_abcdefghijklmnopqrstu');
  });

  it('notices a removal mid-session, says so and reloads into the personal team', async () => {
    jest.useFakeTimers();
    document.cookie = 'active_team=team-acme; Path=/';
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    // A server action got 403 NOT_A_MEMBER and dropped the cookie (Task 2).
    document.cookie = 'active_team=; Path=/; Max-Age=0';
    await act(async () => {
      await jest.advanceTimersByTimeAsync(REMOVAL_CHECK_MS);
    });
    expect(hardNavigate).toHaveBeenCalledWith('/app');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'error',
      message: "You're no longer a member of Acme Mobility.",
    });
    jest.useRealTimers();
  });

  it('does not take a team switched in another tab for a removal', async () => {
    jest.useFakeTimers();
    document.cookie = 'active_team=team-acme; Path=/';
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    document.cookie = 'active_team=team-harness; Path=/';
    await act(async () => {
      await jest.advanceTimersByTimeAsync(REMOVAL_CHECK_MS * 3);
    });
    expect(hardNavigate).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('explains an email mismatch and does not retry or switch', async () => {
    document.cookie = 'invite_token=tok_abcdefghijklmnopqrstu; Path=/';
    (acceptTeamInvite as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'INVITE_EMAIL_MISMATCH',
      message: 'x',
    });
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'This invite was sent to a different email address. Sign in with that address to accept it.',
      ),
    );
    expect(document.cookie).not.toContain('invite_token=');
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('shows the flash left by the previous page, in its tone', async () => {
    sessionStorage.setItem(
      'teamFlash',
      JSON.stringify({ tone: 'success', message: 'You joined Acme Mobility' }),
    );
    const { unmount } = render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('You joined Acme Mobility'),
    );
    expect(sessionStorage.getItem('teamFlash')).toBeNull();
    unmount();
    sessionStorage.setItem(
      'teamFlash',
      JSON.stringify({
        tone: 'error',
        message: "You're no longer a member of Acme Mobility.",
      }),
    );
    render(
      <TeamProvider>
        <Probe />
      </TeamProvider>,
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "You're no longer a member of Acme Mobility.",
      ),
    );
  });

  it('switchTeam sets the cookie and reloads into Home', async () => {
    let switchTeam: (id: string) => void = () => {};
    const Grab = () => {
      switchTeam = useTeam().switchTeam;
      return null;
    };
    render(
      <TeamProvider>
        <Grab />
      </TeamProvider>,
    );
    switchTeam('team-acme');
    expect(document.cookie).toContain('active_team=team-acme');
    expect(hardNavigate).toHaveBeenCalledWith('/app');
  });
});
```

`__tests__/unit/hoc/inviteOrdering.test.ts` pins where acceptance can run. An invitee with no account goes through sign-in, sign-up and the company step on guest pages first; only `/app` (inside `AuthorizedLayout`) may accept.

```ts
/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const walk = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
const source = (dir: string) =>
  walk(path.join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f));

describe('invite acceptance ordering', () => {
  it('never runs on the guest sign-in or sign-up pages, so it follows the whole sign-up', () => {
    for (const file of [...source('src/app/sign-in'), ...source('src/app/sign-up')]) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(
        /AuthorizedLayout|TeamProvider|withTeams|acceptTeamInvite/,
      );
    }
    const authorized = fs.readFileSync(
      path.join(root, 'src/layouts/AuthorizedLayout/AuthorizedLayout.tsx'),
      'utf8',
    );
    expect(authorized).toMatch(/withTeams\(/);
  });

  it('lets only TeamProvider delete the invite cookie', () => {
    const deleters = source('src')
      .filter((f) => fs.readFileSync(f, 'utf8').includes('clearInviteTokenCookie('))
      .map((f) => path.relative(root, f))
      .sort();
    expect(deleters).toEqual(['src/hoc/TeamProvider.tsx', 'src/utils/teamCookies.ts']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts`
Expected: FAIL. `@/hoc/TeamProvider` can't be found, and `AuthorizedLayout` has no `withTeams`.

- [ ] **Step 3: Implement**

`src/utils/hardNavigate.ts`:

```ts
// A full page load, so server actions, Apollo and React Query all start over
// reading the new active_team cookie. Wrapped so tests can assert it.
export const hardNavigate = (path: string) => window.location.assign(path);
```

`src/utils/inviteErrors.ts`:

```ts
const MESSAGES: Record<string, string> = {
  INVITE_INVALID:
    "This invite link isn't valid any more. Ask the team owner for a new one.",
  INVITE_EXPIRED: 'This invite has expired. Ask the team owner to resend it.',
  INVITE_EMAIL_MISMATCH:
    'This invite was sent to a different email address. Sign in with that address to accept it.',
};

export const inviteErrorMessage = (code: string | null): string =>
  (code && MESSAGES[code]) || "We couldn't accept this invite. Open the link again.";
```

`src/context/TeamContext.ts`:

```ts
'use client';
import { createContext } from 'react';
import type { TeamSummary } from '@/types/team';

export interface TeamContextValue {
  teams: TeamSummary[];
  activeTeam: TeamSummary | null;
  isLoading: boolean;
  isOwner: boolean;
  isMember: boolean;
  ownerAddress: `0x${string}` | null;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

export const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  isLoading: true,
  isOwner: false,
  isMember: false,
  ownerAddress: null,
  switchTeam: () => {},
  refreshTeams: async () => {},
});
```

`src/hooks/useTeam.ts`:

```ts
'use client';
import { useContext } from 'react';
import { TeamContext } from '@/context/TeamContext';

export const useTeam = () => useContext(TeamContext);

export default useTeam;
```

`src/hoc/TeamProvider.tsx`:

```tsx
'use client';
import React, {
  type ComponentType,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { TeamContext } from '@/context/TeamContext';
import { acceptTeamInvite, listMyTeams } from '@/actions/teams';
import { useSignerRegistration } from '@/hooks/useSignerRegistration';
import type { TeamSummary } from '@/types/team';
import {
  clearActiveTeamCookie,
  clearInviteTokenCookie,
  getActiveTeamCookie,
  getInviteTokenCookie,
  setActiveTeamCookie,
} from '@/utils/teamCookies';
import { hardNavigate } from '@/utils/hardNavigate';
import { inviteErrorMessage } from '@/utils/inviteErrors';
import { getFromSession, removeFromSession, saveToSession } from '@/utils/sessionStorage';

const FLASH_KEY = 'teamFlash';
export const REMOVAL_CHECK_MS = 1000;

type Flash = { tone: 'success' | 'error'; message: string };
// A toast that must survive the reload a team change needs.
const flashAfterReload = (flash: Flash) => saveToSession(FLASH_KEY, flash);

const pickActive = (teams: TeamSummary[], cookieId: string | null) =>
  teams.find((t) => t.id === cookieId) ??
  teams.find((t) => t.isPersonal) ??
  teams[0] ??
  null;

export const TeamProvider = ({ children }: PropsWithChildren) => {
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useSignerRegistration();

  const load = useCallback(async (): Promise<TeamSummary[] | null> => {
    const result = await listMyTeams();
    if (!result.ok) {
      Sentry.captureMessage(
        `Could not list teams: ${result.status} ${result.code ?? ''}`,
      );
      return null;
    }
    setTeams(result.data.teams);
    return result.data.teams;
  }, []);

  const switchTeam = useCallback((teamId: string) => {
    setActiveTeamCookie(teamId);
    hardNavigate('/app');
  }, []);

  const acceptInvite = useCallback(
    async (token: string) => {
      // Cleared first: a refused invite must not be retried on every page.
      clearInviteTokenCookie();
      const result = await acceptTeamInvite(token);
      if (result.ok) {
        // The accepted team (role MEMBER, isPersonal false) becomes active.
        flashAfterReload({
          tone: 'success',
          message: `You joined ${result.data.team.name}`,
        });
        switchTeam(result.data.team.id);
        return;
      }
      if (result.code === 'ALREADY_MEMBER') {
        toast("You're already a member of this team.");
        return;
      }
      toast.error(inviteErrorMessage(result.code));
    },
    [switchTeam],
  );

  useEffect(() => {
    const flash = getFromSession<Flash>(FLASH_KEY);
    if (flash) {
      removeFromSession(FLASH_KEY);
      if (flash.tone === 'error') toast.error(flash.message);
      else toast.success(flash.message);
    }
    let cancelled = false;
    void (async () => {
      const loaded = await load();
      if (cancelled) return;
      if (!loaded) {
        setIsLoading(false);
        return;
      }
      const cookieId = getActiveTeamCookie();
      const active = pickActive(loaded, cookieId);
      if (cookieId && active?.id !== cookieId) {
        // The cookie names a team this user is no longer in, so every
        // team-scoped call would be refused: fall back to the personal team.
        // /api/my/teams ignores X-Team-Id (contracts C7), so this list is
        // always readable even with the stale cookie.
        if (active) setActiveTeamCookie(active.id);
        else clearActiveTeamCookie();
        hardNavigate('/app');
        return;
      }
      setActiveId(active?.id ?? null);
      setIsLoading(false);
      const invite = getInviteTokenCookie();
      if (invite) await acceptInvite(invite);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per page load; switching teams reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed mid-session: a team-scoped call answered 403 NOT_A_MEMBER and the
  // server dropped the active_team cookie (dimoDevAPIClient). A cookie switched
  // to another team in another tab is not a removal.
  useEffect(() => {
    const team = teams.find((t) => t.id === activeId);
    if (!team || team.isPersonal) return;
    const timer = setInterval(() => {
      if (getActiveTeamCookie() !== null) return;
      clearInterval(timer);
      clearActiveTeamCookie();
      flashAfterReload({
        tone: 'error',
        message: `You're no longer a member of ${team.name}.`,
      });
      hardNavigate('/app');
    }, REMOVAL_CHECK_MS);
    return () => clearInterval(timer);
  }, [teams, activeId]);

  const value = useMemo(() => {
    const activeTeam = teams.find((t) => t.id === activeId) ?? null;
    return {
      teams,
      activeTeam,
      isLoading,
      isOwner: activeTeam?.role === 'OWNER',
      isMember: activeTeam?.role === 'MEMBER',
      ownerAddress: activeTeam?.ownerAddress ?? null,
      switchTeam,
      refreshTeams: async () => {
        await load();
      },
    };
  }, [teams, activeId, isLoading, switchTeam, load]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const withTeams = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => (
    <TeamProvider>
      <WrappedComponent {...props} />
    </TeamProvider>
  );
  HOC.displayName = `withTeams(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
```

`useSignerRegistration` is created in Task 5. So the test and the type check pass in this task, add a placeholder that does nothing now. Task 5 replaces its body. `src/hooks/useSignerRegistration.ts`:

```ts
'use client';
// Registers the user's Turnkey wallet with console-api (contracts C6).
// Implemented in the next task; a no-op until then.
export const useSignerRegistration = (): void => {};
```

`src/hoc/index.ts`: add `export * from './TeamProvider';`.

`src/hooks/index.ts`: add `export * from './useTeam';`.

`src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`: import `withTeams` from `@/hoc` and wrap inside `withGlobalAccounts`:

```tsx
const Providers = withGlobalAccounts(
  withTeams(
    withLayout(
      withCredits(
        withApollo(
          withAccountInformation(({ children }: { children: React.ReactNode }) => (
            <>{children}</>
          )),
        ),
      ),
    ),
  ),
);
```

`src/types/user.ts`: delete the line `role: TeamRoles;` from `IUserSession`. Keep the `TeamRoles` import for now; `IUser.role` still uses it until Task 11.

`src/hoc/GlobalAccountProvider.tsx`:

- Delete `role: TeamRoles.OWNER,` from the `user` object in `loadUserSession`.
- Delete `$role: TeamRoles.OWNER,` from the `identifyUser` call.
- Delete `import { TeamRoles } from '@/types/team';`.

`src/components/AccountInfoButton/AccountInfoButton.tsx`: the account info modal shows the signed-in user's own wallet, so anyone may open it. Replace the handler and imports:

```tsx
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/hooks';
import { FC, useContext } from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Button } from '@/components/Button';
```

```tsx
const { data: user } = useUser();
const { setShowAccountInformation } = useContext(AccountInformationContext);
const handleOpenAccountInformationModal = () => setShowAccountInformation(true);
```

`src/components/CreditsWidget/CreditsWidget.tsx`:

- Replace `import { isCollaborator } ...` (and the `isOwner` import if present) with `import { useTeam } from '@/hooks/useTeam';`.
- In the component, add `const { isMember } = useTeam();` after the existing hooks.
- Delete the line `if (isCollaborator(currentUser?.role ?? '')) return;`.
- Make the effect `if (!currentUser || isMember) return;` with dependencies `[currentUser, isMember]`.
- Just before the component's `return (`, add `if (isMember) return null;`. The widget shows the user's own DCX, which means nothing inside someone else's team.
- Delete the commented-out `isOwner(currentUser?.role …)` blocks; they reference the removed field.

`src/app/settings/components/TeamManagement/TeamManagement.tsx` (deleted in Task 11; keep it compiling until then):

- Replace `import { isOwner } from '@/utils/user';` and the `useGlobalAccount` use with `import { useTeam } from '@/hooks/useTeam';` and `const { isOwner } = useTeam();`.
- Change `isOwner(currentUser!.role) &&` to `isOwner &&`.

`src/utils/user.ts`: delete `isOwner` and `isCollaborator` and the `TeamRoles` import.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx jest __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts __tests__/unit/components/Header.test.tsx __tests__/unit/utils/usert.test.ts && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` prints nothing new; compare against the Step 1 baseline of Task 1.

- [ ] **Step 5: Commit**

```bash
git add src/context/TeamContext.ts src/hoc/TeamProvider.tsx src/hooks/useTeam.ts src/hooks/useSignerRegistration.ts src/utils/hardNavigate.ts src/utils/inviteErrors.ts src/hoc/index.ts src/hooks/index.ts src/layouts/AuthorizedLayout/AuthorizedLayout.tsx src/types/user.ts src/hoc/GlobalAccountProvider.tsx src/components/AccountInfoButton/AccountInfoButton.tsx src/components/CreditsWidget/CreditsWidget.tsx src/app/settings/components/TeamManagement/TeamManagement.tsx src/utils/user.ts __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts
git commit -m "feat(teams): TeamProvider with the active team cookie, switching, invite acceptance and removal recovery"
```

---

### Task 5: Register the user's Turnkey wallet as their signer (C6)

**Files:**

- Create: `src/utils/signerProof.ts`
- Create: `src/services/turnkeyAccount.ts`
- Modify: `src/hooks/useSignerRegistration.ts` (replace the placeholder)
- Test: `__tests__/unit/utils/signerProof.test.ts`, `__tests__/unit/hooks/useSignerRegistration.test.tsx`

**Interfaces:**

- Consumes: `registerSigner` (Task 2); `useGlobalAccount().validateCurrentSession`; `getSessionTurnkeyClient` (`src/services/turnkey.ts`).
- Produces:
  - `buildSignerProofMessage({ eoa, kernelAddress, issuedAt }): string`
  - `getSessionEoaAccount(session: { subOrganizationId: string; walletAddress: \`0x${string}\` }): Promise<LocalAccount>`, the account Turnkey signs with as the EOA, not the kernel
  - `signerRegisteredKey(eoa: string): string`
  - `useSignerRegistration(): void`, which runs once per browser session per wallet

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/signerProof.test.ts`:

```ts
import { buildSignerProofMessage } from '@/utils/signerProof';

describe('buildSignerProofMessage (contracts C6)', () => {
  it('is the exact three-line message with checksummed addresses', () => {
    expect(
      buildSignerProofMessage({
        eoa: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
        kernelAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
        issuedAt: '2026-10-02T12:00:00.000Z',
      }),
    ).toBe(
      'DIMO Developer Console\n' +
        'Link signer 0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6 to account 0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d\n' +
        'Issued at 2026-10-02T12:00:00.000Z',
    );
  });
});
```

`__tests__/unit/hooks/useSignerRegistration.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { getAddress } from 'viem';

jest.mock('@/actions/teams', () => ({ registerSigner: jest.fn() }));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/turnkeyAccount', () => ({
  getSessionEoaAccount: jest.fn(async () => ({ signMessage })),
}));
import { registerSigner } from '@/actions/teams';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import {
  signerRegisteredKey,
  useSignerRegistration,
} from '@/hooks/useSignerRegistration';

const SESSION = {
  email: 'sam@harness.dev',
  subOrganizationId: 'sub-sam',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d' as const,
};
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalAccountContext.Provider
    value={{
      currentUser: SESSION,
      validateCurrentSession: async () => SESSION,
      getCurrentDcxBalance: async () => 0,
      getCurrentDimoBalance: async () => 0,
      logout: async () => {},
    }}
  >
    {children}
  </GlobalAccountContext.Provider>
);

describe('useSignerRegistration', () => {
  beforeEach(() => sessionStorage.clear());

  it('signs the C6 message with the EOA and registers it once per session', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    const { rerender } = renderHook(() => useSignerRegistration(), { wrapper });
    await waitFor(() => expect(registerSigner).toHaveBeenCalledTimes(1));
    const [input] = (registerSigner as jest.Mock).mock.calls[0];
    expect(input.address).toBe(getAddress(SESSION.walletAddress));
    expect(input.signature).toBe('0xsigned');
    expect(input.message).toMatch(
      new RegExp(
        `^DIMO Developer Console\\nLink signer ${getAddress(SESSION.walletAddress)} to account ${getAddress(SESSION.smartContractAddress)}\\nIssued at \\d{4}-\\d{2}-\\d{2}T`,
      ),
    );
    expect(signMessage).toHaveBeenCalledWith({ message: input.message });
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).toBe(
      'true',
    );
    rerender();
    expect(registerSigner).toHaveBeenCalledTimes(1);
  });

  it('does not mark the session when console-api refuses the proof', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      code: 'SIGNER_PROOF_INVALID',
      message: 'bad',
    });
    renderHook(() => useSignerRegistration(), { wrapper });
    await waitFor(() => expect(registerSigner).toHaveBeenCalled());
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/signerProof.test.ts __tests__/unit/hooks/useSignerRegistration.test.tsx`
Expected: FAIL. `signerProof` is missing, and the placeholder hook never calls `registerSigner`.

- [ ] **Step 3: Implement**

`src/utils/signerProof.ts`:

```ts
import { getAddress } from 'viem';

// Exact text from the console-teams contracts (C6). console-api rejects any
// other wording, casing or line ending.
export const buildSignerProofMessage = ({
  eoa,
  kernelAddress,
  issuedAt,
}: {
  eoa: string;
  kernelAddress: string;
  issuedAt: string;
}): string =>
  `DIMO Developer Console\nLink signer ${getAddress(eoa)} to account ${getAddress(kernelAddress)}\nIssued at ${issuedAt}`;
```

`src/services/turnkeyAccount.ts`:

```ts
'use client';
import { createAccount } from '@turnkey/viem';
import type { LocalAccount } from 'viem';
import { getSessionTurnkeyClient } from '@/services/turnkey';

// The user's Turnkey wallet as a plain EOA. License signers must be EOAs: the
// license account checks challenges with ECDSA.recover, so the kernel smart
// account cannot sign for a license.
export const getSessionEoaAccount = async (session: {
  subOrganizationId: string;
  walletAddress: `0x${string}`;
}): Promise<LocalAccount> => {
  const client = getSessionTurnkeyClient();
  if (!client) throw new Error('Turnkey session unavailable — sign in again');
  return (await createAccount({
    client,
    organizationId: session.subOrganizationId,
    signWith: session.walletAddress,
    ethereumAddress: session.walletAddress,
  })) as LocalAccount;
};
```

`src/hooks/useSignerRegistration.ts`, full replacement:

```ts
'use client';
import { useEffect } from 'react';
import { getAddress } from 'viem';
import * as Sentry from '@sentry/nextjs';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { registerSigner } from '@/actions/teams';
import { getSessionEoaAccount } from '@/services/turnkeyAccount';
import { buildSignerProofMessage } from '@/utils/signerProof';
import { getFromSession, saveToSession } from '@/utils/sessionStorage';

export const signerRegisteredKey = (eoa: string) =>
  `signerRegistered:${eoa.toLowerCase()}`;

// Tells console-api which EOA this user signs with (contracts C6), so an owner
// can grant it data access. Once per browser session per wallet; a refusal is
// retried on the next session.
export const useSignerRegistration = (): void => {
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const wallet = currentUser?.walletAddress;

  useEffect(() => {
    if (!wallet) return;
    const key = signerRegisteredKey(wallet);
    if (getFromSession<boolean>(key)) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await validateCurrentSession();
        if (!session || cancelled) return;
        const account = await getSessionEoaAccount(session);
        const message = buildSignerProofMessage({
          eoa: session.walletAddress,
          kernelAddress: session.smartContractAddress,
          issuedAt: new Date().toISOString(),
        });
        const signature = await account.signMessage({ message });
        const result = await registerSigner({
          address: getAddress(session.walletAddress),
          message,
          signature,
        });
        if (result.ok) saveToSession(key, true);
        else
          Sentry.captureMessage(`Signer proof refused: ${result.code ?? result.status}`);
      } catch (error) {
        Sentry.captureException(error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/utils/signerProof.test.ts __tests__/unit/hooks/useSignerRegistration.test.tsx __tests__/unit/hoc/TeamProvider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/signerProof.ts src/services/turnkeyAccount.ts src/hooks/useSignerRegistration.ts __tests__/unit/utils/signerProof.test.ts __tests__/unit/hooks/useSignerRegistration.test.tsx
git commit -m "feat(teams): register the user's Turnkey wallet as their license signer"
```

---

### Task 6: Team switcher, member navigation and Home shortcuts

**Files:**

- Create: `src/components/TeamSwitcher/TeamSwitcher.tsx`, `src/components/TeamSwitcher/index.ts`
- Modify: `src/components/Menu/Menu.tsx`, `src/config/navigation.ts`, `src/app/app/list/components/View/View.tsx`
- Test: `__tests__/unit/components/TeamSwitcher.test.tsx`, `__tests__/unit/config/navigation.test.ts` (extend), `__tests__/unit/pages/app/HomeShortcuts.test.tsx`

**Interfaces:**

- Consumes: `useTeam()` (Task 4).
- Produces:
  - `<TeamSwitcher collapsed?: boolean />`, which renders nothing with fewer than two teams.
  - `getNavSections(includeConnections?: boolean, options?: { isMember?: boolean }): NavSection[]`, where Webhooks is `hidden` for members.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/components/TeamSwitcher.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { TeamSwitcher } from '@/components/TeamSwitcher';

const team = (id: string, name: string, role: 'OWNER' | 'MEMBER') => ({
  id,
  name,
  role,
  companyName: name,
  ownerUserId: 'u',
  ownerEmail: 'o@x.dev',
  ownerAddress: '0x1',
  isPersonal: role === 'OWNER',
});
const PERSONAL = team('t1', 'Harness Motors', 'OWNER');
const ACME = team('t2', 'Acme Mobility', 'MEMBER');

describe('TeamSwitcher', () => {
  const switchTeam = jest.fn();

  it('renders nothing for a single team', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL],
      activeTeam: PERSONAL,
      switchTeam,
    });
    const { container } = render(<TeamSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the teams with roles and switches on pick', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL, ACME],
      activeTeam: PERSONAL,
      switchTeam,
    });
    render(<TeamSwitcher />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Team: Harness Motors. Switch team' }),
    );
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Member').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Acme Mobility'));
    expect(switchTeam).toHaveBeenCalledWith('t2');
  });

  it('does not reload when the active team is picked again', () => {
    (useTeam as jest.Mock).mockReturnValue({
      teams: [PERSONAL, ACME],
      activeTeam: ACME,
      switchTeam,
    });
    switchTeam.mockClear();
    render(<TeamSwitcher collapsed />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Team: Acme Mobility. Switch team' }),
    );
    fireEvent.click(screen.getAllByRole('option')[1].querySelector('button')!);
    expect(switchTeam).not.toHaveBeenCalled();
  });
});
```

Append to `__tests__/unit/config/navigation.test.ts`, inside the existing `describe`:

```ts
  it('hides Webhooks from members of someone else's team', () => {
    const member = getNavSections(true, { isMember: true }).find(
      (s) => s.label === 'Workspace',
    )!;
    expect(member.items.find((i) => i.label === 'Webhooks')?.hidden).toBe(true);
    expect(workspace.items.find((i) => i.label === 'Webhooks')?.hidden).toBeFalsy();
  });
```

`__tests__/unit/pages/app/HomeShortcuts.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/app',
  useSearchParams: () => new URLSearchParams(''),
}));
jest.mock('@/hooks', () => ({
  useUser: () => ({ data: { name: 'Sam Rivera' }, isLoading: false }),
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { View } from '@/app/app/list/components/View/View';

describe('Home shortcuts', () => {
  it('shows Webhooks to owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    render(<View />);
    expect(screen.getByRole('link', { name: /Webhooks/ })).toHaveAttribute(
      'href',
      '/webhooks',
    );
  });

  it('hides Webhooks from members', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    render(<View />);
    expect(screen.queryByRole('link', { name: /Webhooks/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Vehicles/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx`
Expected: FAIL. `TeamSwitcher` is missing, `hidden` is undefined, and Webhooks is shown to members.

- [ ] **Step 3: Implement**

`src/components/TeamSwitcher/TeamSwitcher.tsx`:

```tsx
'use client';
import { type FC, useEffect, useRef, useState } from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { useTeam } from '@/hooks/useTeam';
import type { TeamRole } from '@/types/team';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<TeamRole, string> = { OWNER: 'Owner', MEMBER: 'Member' };

// Sidebar team picker. Only rendered when the user belongs to more than one
// team; picking another team reloads into Home (TeamProvider.switchTeam).
export const TeamSwitcher: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const { teams, activeTeam, switchTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (teams.length < 2 || !activeTeam) return null;

  return (
    <div ref={ref} className="relative mb-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Team: ${activeTeam.name}. Switch team`}
        title={collapsed ? activeTeam.name : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left transition-colors hover:bg-nav-hover',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-7 flex-shrink-0 items-center justify-center rounded-chip bg-control text-label text-ink"
        >
          {activeTeam.name.charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body-sm font-medium text-ink">
                {activeTeam.name}
              </span>
              <span className="text-label text-muted">{ROLE_LABEL[activeTeam.role]}</span>
            </span>
            <ChevronUpDownIcon
              aria-hidden="true"
              className="size-4 flex-shrink-0 text-muted"
            />
          </>
        )}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Teams"
          className="absolute left-0 top-full z-20 mt-1 flex w-[220px] flex-col gap-0.5 rounded-control border border-outline bg-overlay p-1 shadow-float"
        >
          {teams.map((team) => {
            const selected = team.id === activeTeam.id;
            return (
              <li key={team.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!selected) switchTeam(team.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-chip px-2.5 py-2 text-left text-body-sm',
                    selected
                      ? 'bg-selected-bg text-selected-fg hover:bg-selected-bg'
                      : 'text-fg hover:bg-control',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  <span
                    className={cn(
                      'text-label',
                      selected ? 'text-selected-fg/75' : 'text-muted',
                    )}
                  >
                    {ROLE_LABEL[team.role]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TeamSwitcher;
```

`src/components/TeamSwitcher/index.ts`:

```ts
export * from './TeamSwitcher';
```

`src/config/navigation.ts`: change the signature and the Webhooks item.

```ts
export const getNavSections = (
  includeConnections: boolean = true,
  { isMember = false }: { isMember?: boolean } = {},
): NavSection[] => [
```

In the Webhooks item, after `disabled: false,`:

```ts
        // A webhook keeps sending data after its creator leaves the team, so only
        // the team owner manages webhooks (console teams spec).
        hidden: isMember,
```

`src/components/Menu/Menu.tsx`:

- Add the imports `import { TeamSwitcher } from '@/components/TeamSwitcher';` and `import { useTeam } from '@/hooks/useTeam';`.
- In the component, add `const { isMember } = useTeam();`.
- Change `const sections = getNavSections(licensesLoading || hasDeveloperLicenses);` to `const sections = getNavSections(licensesLoading || hasDeveloperLicenses, { isMember });`.
- Insert `<TeamSwitcher collapsed={isSidebarCollapsed} />` directly after the closing `</div>` of the `{/* Logo */}` row and before `{/* Grouped nav sections */}`.

`src/app/app/list/components/View/View.tsx`:

- Add `import { useTeam } from '@/hooks/useTeam';`.
- In `View`, add `const { isMember } = useTeam();` and
  `const visibleShortcuts = isMember ? shortcuts.filter((s) => s.href !== '/webhooks') : shortcuts;`.
- Render `visibleShortcuts.map(` instead of `shortcuts.map(`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx __tests__/unit/components/Menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TeamSwitcher src/components/Menu/Menu.tsx src/config/navigation.ts src/app/app/list/components/View/View.tsx __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx
git commit -m "feat(teams): sidebar team switcher; members don't see Webhooks"
```

---

### Task 7: List the active team's licenses, and owner checks against the team

**Files:**

- Modify: `src/types/webhook.ts` (`LocalDeveloperLicense`: tolerant input, `tokenId`, `owner`, `hasSigner`)
- Modify: `src/components/Webhooks/hooks/useValidDeveloperLicenses.ts` (team owner, plus `tokenId owner signers` fields). `VehiclesView`, `VehiclePage` and the webhooks page all read licenses through this hook, so they follow the active team without edits of their own.
- Modify: `src/hooks/useHasDeveloperLicenses.ts`, `src/app/licenses/page.tsx`, `src/hooks/useIsLicenseOwner.ts`
- Modify: `src/app/license/list/LicenseList.tsx` (members: no Create button, own empty state)
- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx` (`handleOwnerSigner` only for the owner)
- Regenerate: `src/gql/*` via `npm run compile`
- Test: `__tests__/unit/hooks/useIsLicenseOwner.test.tsx`, `__tests__/unit/hooks/useValidDeveloperLicenses.test.tsx`, `__tests__/unit/types/localDeveloperLicense.test.ts`, `__tests__/unit/pages/license/LicenseList.test.tsx`

**Interfaces:**

- Consumes: `useTeam()` (Task 4).
- Produces:
  - `LocalDeveloperLicense#tokenId: number | null`, `#owner: string | null`, `#hasSigner(address?: string | null): boolean` (case-insensitive).
  - `useValidDeveloperLicenses()` keeps its shape, but `loading` is true until the team owner is known.
  - `useIsLicenseOwner(license)` is true only when the user's wallet owns the license _and_ the active team is the user's own.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/types/localDeveloperLicense.test.ts`:

```ts
import { LocalDeveloperLicense } from '@/types/webhook';

describe('LocalDeveloperLicense', () => {
  const license = new LocalDeveloperLicense({
    alias: 'Harness Fleet',
    clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    tokenId: 42,
    owner: '0x2B6E1c4f8a0d3E5b7c9a1D2E3f4A5b6c7D8e9f0a',
    redirectURIs: { nodes: [{ uri: 'https://harness.dev/callback' }] },
    signers: { nodes: [{ address: '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6' }] },
  } as never);

  it('exposes the token id and owner', () => {
    expect(license.tokenId).toBe(42);
    expect(license.owner).toBe('0x2B6E1c4f8a0d3E5b7c9a1D2E3f4A5b6c7D8e9f0a');
  });

  it('matches signers whatever the letter case', () => {
    expect(license.hasSigner('0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6')).toBe(true);
    expect(license.hasSigner('0x0000000000000000000000000000000000000001')).toBe(false);
    expect(license.hasSigner(null)).toBe(false);
  });

  it('still accepts the old three-field shape', () => {
    const old = new LocalDeveloperLicense({
      alias: 'A',
      clientId: '0xaaa',
      redirectURIs: { nodes: [{ uri: 'x' }] },
    });
    expect(old.tokenId).toBeNull();
    expect(old.hasSigner('0xaaa')).toBe(false);
  });
});
```

`__tests__/unit/hooks/useIsLicenseOwner.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';

jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useTeam } from '@/hooks/useTeam';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';

const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const ACME = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a';
const asUser = (address: string | null) =>
  (useGlobalAccount as jest.Mock).mockReturnValue({
    currentUser: address ? { smartContractAddress: address } : null,
  });
const inTeam = (role: 'OWNER' | 'MEMBER' | null, ownerAddress?: string) =>
  (useTeam as jest.Mock).mockReturnValue({
    isLoading: role === null,
    activeTeam: role ? { role, ownerAddress } : null,
  });

describe('useIsLicenseOwner', () => {
  it('is true for the owner in their own team, whatever the case', () => {
    asUser(KERNEL);
    inTeam('OWNER', KERNEL.toUpperCase().replace('0X', '0x'));
    const { result } = renderHook(() =>
      useIsLicenseOwner({ owner: KERNEL.toUpperCase().replace('0X', '0x') }),
    );
    expect(result.current).toBe(true);
  });

  it("is false for a member looking at the team owner's license", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    const { result } = renderHook(() => useIsLicenseOwner({ owner: ACME }));
    expect(result.current).toBe(false);
  });

  it("is false for the user's own license while working in another team", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    const { result } = renderHook(() => useIsLicenseOwner({ owner: KERNEL }));
    expect(result.current).toBe(false);
  });

  it('trusts the wallet while teams are still loading', () => {
    asUser(KERNEL);
    inTeam(null);
    const { result } = renderHook(() => useIsLicenseOwner({ owner: KERNEL }));
    expect(result.current).toBe(true);
  });
});
```

`__tests__/unit/hooks/useValidDeveloperLicenses.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import {
  DEVELOPER_LICENSES_FOR_WEBHOOKS,
  useValidDeveloperLicenses,
} from '@/components/Webhooks/hooks/useValidDeveloperLicenses';

const ACME = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a';
const node = (tokenId: number, uris: string[], signers: string[]) => ({
  __typename: 'DeveloperLicense',
  alias: `License ${tokenId}`,
  clientId: `0x${String(tokenId).padStart(40, '0')}`,
  tokenId,
  owner: ACME,
  redirectURIs: {
    __typename: 'RedirectURIConnection',
    nodes: uris.map((uri) => ({ __typename: 'RedirectURI', uri })),
  },
  signers: {
    __typename: 'SignerConnection',
    nodes: signers.map((address) => ({ __typename: 'Signer', address })),
  },
});
const mocks = [
  {
    request: { query: DEVELOPER_LICENSES_FOR_WEBHOOKS, variables: { owner: ACME } },
    result: {
      data: {
        developerLicenses: {
          __typename: 'DeveloperLicenseConnection',
          nodes: [node(42, ['https://x'], ['0xABC']), node(43, [], [])],
        },
      },
    },
  },
];
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockedProvider mocks={mocks}>{children}</MockedProvider>
);

describe('useValidDeveloperLicenses', () => {
  it("queries the active team owner's licenses", async () => {
    (useTeam as jest.Mock).mockReturnValue({ ownerAddress: ACME });
    const { result } = renderHook(() => useValidDeveloperLicenses(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.developerLicenses.map((l) => l.tokenId)).toEqual([42]);
    expect(result.current.developerLicenses[0].hasSigner('0xabc')).toBe(true);
  });

  it('stays loading until the team owner is known', () => {
    (useTeam as jest.Mock).mockReturnValue({ ownerAddress: null });
    const { result } = renderHook(() => useValidDeveloperLicenses(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.developerLicenses).toEqual([]);
  });
});
```

`__tests__/unit/pages/license/LicenseList.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@/components/LicenseCard', () => ({
  LicenseCard: () => <div data-testid="license-card" />,
}));
jest.mock('@/app/app/list/components/CreateAppButton', () => ({
  __esModule: true,
  default: () => <button>Create a license</button>,
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { LicenseList } from '@/app/license/list/LicenseList';

describe('LicenseList', () => {
  it('lets owners create licenses', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: false,
      activeTeam: { name: 'Harness Motors' },
    });
    render(<LicenseList licenseConnection={{ nodes: [{}] } as never} />);
    expect(screen.getByText('Your developer licenses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a license' })).toBeInTheDocument();
  });

  it("shows members the team's licenses without a create button", () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: true,
      activeTeam: { name: 'Acme Mobility' },
    });
    render(<LicenseList licenseConnection={{ nodes: [] } as never} />);
    expect(screen.getByText('Acme Mobility licenses')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a license' })).toBeNull();
    expect(
      screen.getByText('This team has no developer licenses yet'),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/types/localDeveloperLicense.test.ts __tests__/unit/hooks/useIsLicenseOwner.test.tsx __tests__/unit/pages/license/LicenseList.test.tsx`
Expected: FAIL. The getters are missing, the member is treated as owner, and the list always shows Create. The `useValidDeveloperLicenses` test can only run after Step 4's codegen.

- [ ] **Step 3: Implement**

`src/types/webhook.ts`: replace the `LocalDeveloperLicense` class.

```ts
// Old call sites and tests build licenses from alias, clientId and redirect
// URIs only; the team fields are optional so they keep working.
type LicenseInput = Pick<
  DeveloperLicenseForWebhook,
  'alias' | 'clientId' | 'redirectURIs'
> &
  Partial<Pick<DeveloperLicenseForWebhook, 'tokenId' | 'owner' | 'signers'>>;

export class LocalDeveloperLicense {
  private gqlDeveloperLicense: LicenseInput;

  constructor(remoteDeveloperLicense: LicenseInput) {
    this.gqlDeveloperLicense = remoteDeveloperLicense;
  }

  get clientId() {
    return this.gqlDeveloperLicense.clientId;
  }

  get label() {
    return this.gqlDeveloperLicense.alias || this.gqlDeveloperLicense.clientId;
  }

  get firstRedirectURI() {
    return this.gqlDeveloperLicense.redirectURIs.nodes[0].uri;
  }

  get tokenId(): number | null {
    return this.gqlDeveloperLicense.tokenId ?? null;
  }

  get owner(): string | null {
    return this.gqlDeveloperLicense.owner ?? null;
  }

  // Identity returns checksummed addresses and Turnkey lowercase ones.
  hasSigner(address?: string | null): boolean {
    if (!address) return false;
    const target = address.toLowerCase();
    return (this.gqlDeveloperLicense.signers?.nodes ?? []).some(
      (signer) => String(signer.address).toLowerCase() === target,
    );
  }
}
```

`src/components/Webhooks/hooks/useValidDeveloperLicenses.ts`, full replacement:

```ts
import { useQuery } from '@apollo/client';
import { DeveloperLicenseForWebhook, LocalDeveloperLicense } from '@/types/webhook';
import { gql } from '@/gql';
import { useTeam } from '@/hooks/useTeam';

export const DEVELOPER_LICENSES_FOR_WEBHOOKS = gql(`
  query GetDeveloperLicensesForWebhooks($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      nodes {
        alias
        clientId
        tokenId
        owner
        redirectURIs(first:100) {
          nodes {
            uri
          }
        }
        signers(first:100) {
          nodes {
            address
          }
        }
      }
    }
  }
`);

// The active team's licenses (its owner's wallet), usable for a developer JWT.
export const useValidDeveloperLicenses = () => {
  const { ownerAddress } = useTeam();
  const { data, loading, ...rest } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
  });

  const isValid = (devLicense: DeveloperLicenseForWebhook) => {
    return !!(devLicense.clientId && devLicense.redirectURIs.nodes.length);
  };

  const convertLicense = (devLicense: DeveloperLicenseForWebhook) => {
    return new LocalDeveloperLicense(devLicense);
  };
  return {
    developerLicenses:
      data?.developerLicenses.nodes.filter(isValid).map(convertLicense) ?? [],
    // A skipped query is "not loading"; until the team owner is known it is.
    loading: loading || !ownerAddress,
    ...rest,
  };
};
```

`src/hooks/useHasDeveloperLicenses.ts`: replace the hook body.

```ts
import { useTeam } from '@/hooks/useTeam';
// …query unchanged…
export const useHasDeveloperLicenses = () => {
  const { ownerAddress } = useTeam();
  const hasAddress = !!ownerAddress;

  const { data, loading, error } = useQuery(
    CHECK_HAS_DEVELOPER_LICENSES as DocumentNode,
    {
      variables: { owner: ownerAddress ?? '' },
      skip: !hasAddress,
    },
  );

  return {
    hasDeveloperLicenses: (data?.developerLicenses?.totalCount ?? 0) > 0,
    loading: !hasAddress || loading,
    error,
  };
};
```

Remove the now-unused `useGlobalAccount` import there.

`src/app/licenses/page.tsx`: replace `LicensesView`.

```tsx
const LicensesView = () => {
  const { ownerAddress } = useTeam();
  const { data, loading } = useQuery(GET_ALL_LICENSES, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
  });

  if (loading || !ownerAddress || !data) {
    return <Loader isLoading={true} />;
  }

  return <LicenseList licenseConnection={data.developerLicenses} />;
};
```

Change the imports to `import { useTeam } from '@/hooks/useTeam';` in place of `useGlobalAccount`.

`src/hooks/useIsLicenseOwner.ts`, full replacement:

```ts
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useTeam } from '@/hooks/useTeam';

// Owner actions need the license owner's wallet, and inside someone else's team
// the user acts as a member even on a license their own wallet owns.
export const useIsLicenseOwner = (license: { owner: string }) => {
  const { currentUser } = useGlobalAccount();
  const { activeTeam, isLoading } = useTeam();
  const own = currentUser?.smartContractAddress?.toLowerCase();
  const licenseOwner = license.owner.toLowerCase();
  if (!own || own !== licenseOwner) return false;
  if (isLoading || !activeTeam) return true;
  return (
    activeTeam.role === 'OWNER' && activeTeam.ownerAddress.toLowerCase() === licenseOwner
  );
};
```

`src/app/license/list/LicenseList.tsx`:

- Add `import { useTeam } from '@/hooks/useTeam';`.
- Replace the component body's return.

```tsx
const { isMember, activeTeam } = useTeam();

return (
  <div className="license-list-content">
    <div className="description">
      <p className="title">
        {isMember ? `${activeTeam?.name ?? 'Team'} licenses` : 'Your developer licenses'}
      </p>
      {!isMember && <CreateAppButton disabled={atLimit} />}
    </div>
    {fragment.nodes.length ? (
      <div className="license-list">
        {fragment.nodes.map((licenseSummaryFragment, idx) => (
          <LicenseCard license={licenseSummaryFragment} key={idx} />
        ))}
      </div>
    ) : isMember ? (
      <div className="flex w-full flex-1 flex-col items-center justify-center rounded-card bg-card p-10 text-center">
        <p className="text-card-title text-ink">
          This team has no developer licenses yet
        </p>
        <p className="mt-1 text-body-sm text-muted">
          Licenses the team owner creates show up here.
        </p>
      </div>
    ) : (
      <EmptyList />
    )}
  </div>
);
```

`src/app/license/[tokenId]/details/components/Signers/Signers.tsx`: `handleOwnerSigner` enables the user's console key as a signer. Run it only where the user owns the license; a member's wallet can't sign the owner's transaction. Replace the effect

```tsx
useEffect(() => {
  if (!currentUser) return;
  void handleOwnerSigner();
}, [currentUser]);
```

with

```tsx
useEffect(() => {
  if (!currentUser || !isLicenseOwner) return;
  void handleOwnerSigner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentUser, isLicenseOwner]);
```

- [ ] **Step 4: Regenerate GraphQL types and run the tests**

Run: `npm run compile && npx jest __tests__/unit/types/localDeveloperLicense.test.ts __tests__/unit/hooks/useIsLicenseOwner.test.tsx __tests__/unit/hooks/useValidDeveloperLicenses.test.tsx __tests__/unit/pages/license/LicenseList.test.tsx __tests__/unit/pages/vehicles && npx tsc --noEmit -p . 2>&1 | head -20`
Expected:

- codegen rewrites `src/gql/gql.ts` and `src/gql/graphql.ts`;
- every listed suite passes, including the existing vehicles suites, which mock `useValidDeveloperLicenses` and so are unaffected;
- `tsc` reports nothing new.

`npm run compile` needs network access to `https://identity-api.dev.dimo.zone/query`.

- [ ] **Step 5: Commit**

```bash
git add src/types/webhook.ts src/components/Webhooks/hooks/useValidDeveloperLicenses.ts src/hooks/useHasDeveloperLicenses.ts src/app/licenses/page.tsx src/hooks/useIsLicenseOwner.ts src/app/license/list/LicenseList.tsx "src/app/license/[tokenId]/details/components/Signers/Signers.tsx" src/gql __tests__/unit/types/localDeveloperLicense.test.ts __tests__/unit/hooks/useIsLicenseOwner.test.tsx __tests__/unit/hooks/useValidDeveloperLicenses.test.tsx __tests__/unit/pages/license/LicenseList.test.tsx
git commit -m "feat(teams): list the active team's licenses and check ownership against the team"
```

---

### Task 8: Member developer JWT from the Turnkey wallet, and member states in Vehicles

**Files:**

- Create: `src/hooks/useMemberDevJwt.ts`, `src/hooks/useLicenseDataAccess.ts`
- Create: `src/components/DataAccess/ConnectWalletButton.tsx`, `src/components/DataAccess/DevJwtPrompt.tsx`, `src/components/DataAccess/index.ts`
- Modify: `src/services/subjects/client.ts` (`DataApiCode` adds `NO_ACCESS`, `ACCESS_CHECK_FAILED`)
- Modify: `src/app/vehicles/components/VehiclesView.tsx`
- Modify: `src/app/vehicles/[tokenId]/components/SourceRail.tsx` (`Access` adds `no-access`, `removed`)
- Modify: `src/app/vehicles/[tokenId]/components/AccessNotice.tsx`, `src/app/vehicles/[tokenId]/components/VehiclePage.tsx`
- Test: `__tests__/unit/hooks/useMemberDevJwt.test.tsx`, `__tests__/unit/hooks/useLicenseDataAccess.test.tsx`, `__tests__/unit/components/DevJwtPrompt.test.tsx`, `__tests__/unit/pages/vehicles/AccessNotice.test.tsx`

**Interfaces:**

- Consumes:
  - `getDimoChallenge`, `getDimoToken` (`src/actions/dimoAuth.ts`, server actions against `JWT_ISSUER`);
  - `getSessionEoaAccount` (Task 5);
  - `saveDevJwt` (`src/utils/devJwt.ts`);
  - `useTeam` (Task 4);
  - `askForAccess`, `NO_LONGER_HAS_ACCESS` (Task 1);
  - `TEAM_DATA_ACCESS_ENABLED` (Task 1).
- Produces:
  - `useMemberDevJwt(): (args: { clientId: string; domain: string }) => Promise<string>`, which throws `MemberDevJwtError`.
  - Constants `MEMBER_JWT_ATTEMPTS = 3` and `MEMBER_JWT_RETRY_MS = 5000`.
  - `useLicenseDataAccess(license?: LocalDeveloperLicense, enabled?: boolean): LicenseDataAccess`, where `LicenseDataAccess` is `{ kind: 'owner' } | { kind: 'member' } | { kind: 'member-no-access'; ownerEmail: string }`.
  - `<ConnectWalletButton clientId domain onSuccess />` and `<DevJwtPrompt license access onSuccess message />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hooks/useMemberDevJwt.test.tsx`:

```tsx
import React from 'react';
import { act, renderHook } from '@testing-library/react';

jest.mock('@/actions/dimoAuth', () => ({
  getDimoChallenge: jest.fn(),
  getDimoToken: jest.fn(),
}));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/turnkeyAccount', () => ({
  getSessionEoaAccount: jest.fn(async () => ({ signMessage })),
}));
jest.mock('@/utils/devJwt', () => ({ saveDevJwt: jest.fn() }));
import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { getSessionEoaAccount } from '@/services/turnkeyAccount';
import { saveDevJwt } from '@/utils/devJwt';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import {
  MEMBER_JWT_RETRY_MS,
  MemberDevJwtError,
  useMemberDevJwt,
} from '@/hooks/useMemberDevJwt';

const SESSION = {
  email: 'jane@harness.dev',
  subOrganizationId: 'sub-harness',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d' as const,
};
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GlobalAccountContext.Provider
    value={{
      currentUser: SESSION,
      validateCurrentSession: async () => SESSION,
      getCurrentDcxBalance: async () => 0,
      getCurrentDimoBalance: async () => 0,
      logout: async () => {},
    }}
  >
    {children}
  </GlobalAccountContext.Provider>
);
const ARGS = {
  clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  domain: 'https://harness.dev/callback',
};

describe('useMemberDevJwt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (getDimoChallenge as jest.Mock).mockResolvedValue({
      challenge: 'sign me',
      state: 'st',
    });
  });
  afterEach(() => jest.useRealTimers());

  it("asks dex for a challenge on the license's client ID and signs it with the EOA", async () => {
    (getDimoToken as jest.Mock).mockResolvedValue({ access_token: 'dev.jwt' });
    const { result } = renderHook(() => useMemberDevJwt(), { wrapper });
    await expect(result.current(ARGS)).resolves.toBe('dev.jwt');
    expect(getDimoChallenge).toHaveBeenCalledWith({
      address: ARGS.clientId,
      clientId: ARGS.clientId,
      domain: ARGS.domain,
    });
    expect(getSessionEoaAccount).toHaveBeenCalledWith(SESSION);
    expect(signMessage).toHaveBeenCalledWith({ message: 'sign me' });
    expect(getDimoToken).toHaveBeenCalledWith({
      state: 'st',
      signedChallenge: '0xsigned',
      clientId: ARGS.clientId,
      domain: ARGS.domain,
    });
    expect(saveDevJwt).toHaveBeenCalledWith(ARGS.clientId, 'dev.jwt');
  });

  it('retries while dex has not indexed the new signer', async () => {
    (getDimoToken as jest.Mock)
      .mockRejectedValueOnce(new Error('not a signer'))
      .mockResolvedValueOnce({ access_token: 'dev.jwt' });
    const { result } = renderHook(() => useMemberDevJwt(), { wrapper });
    let token: Promise<string>;
    act(() => {
      token = result.current(ARGS);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS);
    });
    await expect(token!).resolves.toBe('dev.jwt');
    expect(getDimoToken).toHaveBeenCalledTimes(2);
  });

  it('gives up after three attempts with the propagation message', async () => {
    (getDimoToken as jest.Mock).mockRejectedValue(new Error('not a signer'));
    const { result } = renderHook(() => useMemberDevJwt(), { wrapper });
    let token: Promise<string>;
    act(() => {
      token = result.current(ARGS);
    });
    const settled = expect(token!).rejects.toEqual(
      new MemberDevJwtError('Access is still propagating — try again in a minute'),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS * 2);
    });
    await settled;
    expect(getDimoToken).toHaveBeenCalledTimes(3);
    expect(saveDevJwt).not.toHaveBeenCalled();
  });
});
```

`__tests__/unit/hooks/useLicenseDataAccess.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { LocalDeveloperLicense } from '@/types/webhook';

const EOA = '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const license = (signers: string[]) =>
  new LocalDeveloperLicense({
    alias: 'Harness Fleet',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
    signers: { nodes: signers.map((address) => ({ address })) },
  } as never);

describe('useLicenseDataAccess', () => {
  beforeEach(() =>
    (useGlobalAccount as jest.Mock).mockReturnValue({
      currentUser: { walletAddress: EOA },
    }),
  );

  it('treats everyone outside a member team as the owner', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    const { result } = renderHook(() => useLicenseDataAccess(license([]), true));
    expect(result.current).toEqual({ kind: 'owner' });
  });

  it('gives a member access when their wallet is a signer (any case)', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: true,
      activeTeam: { ownerEmail: 'ops@acme.dev' },
    });
    const { result } = renderHook(() =>
      useLicenseDataAccess(license([EOA.toUpperCase().replace('0X', '0x')]), true),
    );
    expect(result.current).toEqual({ kind: 'member' });
  });

  it('refuses a member without a signer, or with the flag off', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: true,
      activeTeam: { ownerEmail: 'ops@acme.dev' },
    });
    expect(
      renderHook(() => useLicenseDataAccess(license([]), true)).result.current,
    ).toEqual({
      kind: 'member-no-access',
      ownerEmail: 'ops@acme.dev',
    });
    expect(
      renderHook(() => useLicenseDataAccess(license([EOA]), false)).result.current,
    ).toEqual({
      kind: 'member-no-access',
      ownerEmail: 'ops@acme.dev',
    });
  });
});
```

`__tests__/unit/components/DevJwtPrompt.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: () => <button>Connect with your wallet</button>,
}));
import { DevJwtPrompt } from '@/components/DataAccess';
import { LocalDeveloperLicense } from '@/types/webhook';

const license = new LocalDeveloperLicense({
  alias: 'Harness Fleet',
  clientId: '0xaaa',
  redirectURIs: { nodes: [{ uri: 'https://x' }] },
});

describe('DevJwtPrompt', () => {
  it('offers owners the API-key flow', () => {
    render(
      <DevJwtPrompt
        license={license}
        access={{ kind: 'owner' }}
        onSuccess={jest.fn()}
        message="m"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });

  it('offers members with access their wallet', () => {
    render(
      <DevJwtPrompt
        license={license}
        access={{ kind: 'member' }}
        onSuccess={jest.fn()}
        message="m"
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Connect with your wallet' }),
    ).toBeInTheDocument();
  });

  it('tells members without access whom to ask (C8)', () => {
    render(
      <DevJwtPrompt
        license={license}
        access={{ kind: 'member-no-access', ownerEmail: 'ops@acme.dev' }}
        onSuccess={jest.fn()}
        message="m"
      />,
    );
    expect(
      screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

`__tests__/unit/pages/vehicles/AccessNotice.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: () => <button>Connect with your wallet</button>,
}));
import { AccessNotice } from '@/app/vehicles/[tokenId]/components/AccessNotice';

const base = {
  licenseLabel: 'Harness Fleet',
  clientId: '0xaaa',
  redirectUri: 'https://x',
  onGenerated: jest.fn(),
  onViewSharing: jest.fn(),
};

describe('AccessNotice, member states', () => {
  it('asks the team owner for access', () => {
    render(
      <AccessNotice {...base} access="no-access" ownerEmail="ops@acme.dev" member />,
    );
    expect(
      screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.'),
    ).toBeInTheDocument();
  });

  it('says a removed member no longer has access (C8)', () => {
    render(<AccessNotice {...base} access="removed" member ownerEmail="ops@acme.dev" />);
    expect(
      screen.getByText('You no longer have access to this license.'),
    ).toBeInTheDocument();
  });

  it('offers a member their wallet instead of an API key', () => {
    render(<AccessNotice {...base} access="no-jwt" member ownerEmail="ops@acme.dev" />);
    expect(
      screen.getByRole('button', { name: 'Connect with your wallet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generate developer JWT' })).toBeNull();
  });

  it('keeps the owner flow unchanged', () => {
    render(<AccessNotice {...base} access="no-jwt" />);
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/pages/vehicles/AccessNotice.test.tsx`
Expected: FAIL. The modules are missing, and `AccessNotice` has no `member` prop.

- [ ] **Step 3: Implement**

`src/hooks/useMemberDevJwt.ts`:

```ts
'use client';
import { useCallback } from 'react';
import * as Sentry from '@sentry/nextjs';
import { getDimoChallenge, getDimoToken } from '@/actions/dimoAuth';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { getSessionEoaAccount } from '@/services/turnkeyAccount';
import { saveDevJwt } from '@/utils/devJwt';

export const MEMBER_JWT_ATTEMPTS = 3;
export const MEMBER_JWT_RETRY_MS = 5000;

export class MemberDevJwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemberDevJwtError';
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A member's developer JWT, signed by their own Turnkey EOA. The challenge is
// for the license (address = clientId); dex verifies it through the license
// account's ERC-1271 check, which accepts any signer the owner enabled. Right
// after a grant dex may not have indexed the signer yet, hence the retries
// (the same allowance the RentalOS flow makes).
export const useMemberDevJwt = () => {
  const { validateCurrentSession } = useGlobalAccount();
  return useCallback(
    async ({ clientId, domain }: { clientId: string; domain: string }) => {
      const session = await validateCurrentSession();
      if (!session)
        throw new MemberDevJwtError('Your session has expired. Sign in again.');
      const account = await getSessionEoaAccount(session);
      for (let attempt = 1; attempt <= MEMBER_JWT_ATTEMPTS; attempt++) {
        try {
          const { challenge, state } = await getDimoChallenge({
            address: clientId as `0x${string}`,
            clientId,
            domain,
          });
          const signedChallenge = await account.signMessage({ message: challenge });
          const { access_token } = await getDimoToken({
            state,
            signedChallenge,
            clientId,
            domain,
          });
          if (access_token) {
            saveDevJwt(clientId, access_token);
            return access_token;
          }
        } catch (error) {
          Sentry.captureException(error);
        }
        if (attempt < MEMBER_JWT_ATTEMPTS) await wait(MEMBER_JWT_RETRY_MS);
      }
      throw new MemberDevJwtError('Access is still propagating — try again in a minute');
    },
    [validateCurrentSession],
  );
};
```

`src/hooks/useLicenseDataAccess.ts`:

```ts
'use client';
import { useTeam } from '@/hooks/useTeam';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import type { LocalDeveloperLicense } from '@/types/webhook';

export type LicenseDataAccess =
  | { kind: 'owner' }
  | { kind: 'member' }
  | { kind: 'member-no-access'; ownerEmail: string };

// How the current user reads a license's data. Outside a member team the
// license list is the user's own, so they are the owner (API-key flow).
export const useLicenseDataAccess = (
  license?: LocalDeveloperLicense,
  enabled: boolean = TEAM_DATA_ACCESS_ENABLED,
): LicenseDataAccess => {
  const { isMember, activeTeam } = useTeam();
  const { currentUser } = useGlobalAccount();
  if (!isMember) return { kind: 'owner' };
  const ownerEmail = activeTeam?.ownerEmail ?? 'the team owner';
  if (!enabled || !license?.hasSigner(currentUser?.walletAddress)) {
    return { kind: 'member-no-access', ownerEmail };
  }
  return { kind: 'member' };
};
```

`src/components/DataAccess/ConnectWalletButton.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { MemberDevJwtError, useMemberDevJwt } from '@/hooks/useMemberDevJwt';

export const ConnectWalletButton: FC<{
  clientId: string;
  domain: string;
  onSuccess: () => void;
}> = ({ clientId, domain, onSuccess }) => {
  const getMemberDevJwt = useMemberDevJwt();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      await getMemberDevJwt({ clientId, domain });
      onSuccess();
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof MemberDevJwtError
          ? error.message
          : "Couldn't connect your wallet. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={connect} loading={busy}>
      Connect with your wallet
    </Button>
  );
};
```

`src/components/DataAccess/DevJwtPrompt.tsx`:

```tsx
'use client';
import type { FC } from 'react';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import { askForAccess } from '@/config/teamCopy';
import type { LicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import type { LocalDeveloperLicense } from '@/types/webhook';

// What a page shows when it needs a developer JWT for a license: owners use an
// API key, members their own wallet, members without access whom to ask.
export const DevJwtPrompt: FC<{
  license: LocalDeveloperLicense;
  access: LicenseDataAccess;
  onSuccess: () => void;
  message: string;
}> = ({ license, access, onSuccess, message }) => {
  if (access.kind === 'owner') {
    return (
      <GenerateDevJWTSection
        clientId={license.clientId}
        redirectUri={license.firstRedirectURI}
        onSuccess={onSuccess}
        message={message}
      />
    );
  }
  if (access.kind === 'member-no-access') {
    return (
      <p className="text-body-sm text-muted">
        {askForAccess(access.ownerEmail, license.label)}
      </p>
    );
  }
  return (
    <div>
      <p className="text-body-sm text-muted">
        Connect with your wallet to read {license.label}. The team owner gave your wallet
        access, and the token stays in this browser.
      </p>
      <div className="mt-2">
        <ConnectWalletButton
          clientId={license.clientId}
          domain={license.firstRedirectURI}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
};
```

`src/components/DataAccess/index.ts`:

```ts
export * from './ConnectWalletButton';
export * from './DevJwtPrompt';
```

`src/services/subjects/client.ts`: extend `DataApiCode`.

```ts
export type DataApiCode =
  | 'DEV_JWT_MISSING'
  | 'DEV_JWT_INVALID'
  | 'NOT_SHARED'
  | 'NO_ACCESS'
  | 'ACCESS_CHECK_FAILED'
  | 'UPSTREAM'
  | 'GRAPHQL';
```

`src/app/vehicles/components/VehiclesView.tsx`:

- Replace `import { GenerateDevJWTSection } …` with `import { DevJwtPrompt } from '@/components/DataAccess';` and `import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';`.
- In `Content`, after the `useGetDevJwts` call, add `const dataAccess = useLicenseDataAccess(selected);`.
- Replace

```tsx
{
  !isAuthenticatedAsDev && (
    <GenerateDevJWTSection
      clientId={selected.clientId}
      redirectUri={selected.firstRedirectURI}
      onSuccess={refetchJwts}
      message="Generate a developer JWT to see when each vehicle was last seen."
    />
  );
}
```

with

```tsx
{
  (!isAuthenticatedAsDev || dataAccess.kind === 'member-no-access') && (
    <DevJwtPrompt
      license={selected}
      access={dataAccess}
      onSuccess={refetchJwts}
      message="Generate a developer JWT to see when each vehicle was last seen."
    />
  );
}
```

`src/app/vehicles/[tokenId]/components/SourceRail.tsx`:

```ts
export type Access =
  | 'ok'
  | 'not-shared'
  | 'no-jwt'
  | 'jwt-expired'
  | 'no-access'
  | 'removed'
  | 'loading';
```

Add these to `ACCESS_LABEL`:

```ts
  'no-access': 'No data access',
  'removed': 'No data access',
```

`src/app/vehicles/[tokenId]/components/AccessNotice.tsx`, full replacement:

```tsx
'use client';
import { FC, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import { askForAccess, NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';
import type { Access } from './SourceRail';

interface Props {
  access: Exclude<Access, 'ok'>;
  licenseLabel: string;
  clientId?: string;
  redirectUri?: string;
  onGenerated: () => void;
  onViewSharing: () => void;
  // A member of someone else's team: their wallet, not an API key.
  member?: boolean;
  ownerEmail?: string;
}

const Card: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
    <h3 className="text-card-title text-ink">{title}</h3>
    {children}
  </div>
);

// What replaces the tab body when the license can't read the vehicle.
export const AccessNotice: FC<Props> = ({
  access,
  licenseLabel,
  clientId,
  redirectUri,
  onGenerated,
  onViewSharing,
  member = false,
  ownerEmail = 'the team owner',
}) => {
  if (access === 'loading') return null;
  if (access === 'no-access') {
    return (
      <Card title={`You don't have data access to ${licenseLabel}`}>
        <p className="max-w-xl text-body-sm text-muted">
          {askForAccess(ownerEmail, licenseLabel)}
        </p>
      </Card>
    );
  }
  if (access === 'removed') {
    return (
      <Card title={NO_LONGER_HAS_ACCESS}>
        <p className="max-w-xl text-body-sm text-muted">
          {askForAccess(ownerEmail, licenseLabel)}
        </p>
      </Card>
    );
  }
  if (access === 'not-shared') {
    return (
      <Card
        title={
          clientId
            ? `This vehicle isn't shared with ${licenseLabel}`
            : "This vehicle isn't shared with any of your licenses"
        }
      >
        <p className="max-w-xl text-body-sm text-muted">
          {clientId
            ? "The owner hasn't granted this license access"
            : "The owner hasn't granted any of your licenses access"}
          , so its data can&apos;t be read here. You can still see which apps it is shared
          with.
        </p>
        <Button variant="secondary" onClick={onViewSharing}>
          View sharing
        </Button>
      </Card>
    );
  }
  const expired = access === 'jwt-expired';
  if (member) {
    return (
      <Card
        title={
          expired
            ? `Your connection to ${licenseLabel} has expired`
            : 'Connect your wallet to read this vehicle'
        }
      >
        <p className="max-w-xl text-body-sm text-muted">
          Your wallet signs a developer JWT for {licenseLabel}; the token stays in this
          browser.
        </p>
        {clientId && redirectUri && (
          <ConnectWalletButton
            clientId={clientId}
            domain={redirectUri}
            onSuccess={onGenerated}
          />
        )}
      </Card>
    );
  }
  return (
    <Card
      title={
        expired
          ? `Your developer JWT for ${licenseLabel} has expired`
          : 'Generate a developer JWT to read this vehicle'
      }
    >
      <p className="max-w-xl text-body-sm text-muted">
        {expired ? (
          'Generate a new one to keep reading this vehicle.'
        ) : (
          <>
            {licenseLabel} has no developer JWT in this browser yet. Generating one uses
            the license&apos;s API key, and the token stays in this browser.
          </>
        )}
      </p>
      {clientId && redirectUri && (
        <GenerateDevJWT
          clientId={clientId}
          domain={redirectUri}
          onSuccess={onGenerated}
        />
      )}
    </Card>
  );
};
```

`src/app/vehicles/[tokenId]/components/VehiclePage.tsx`:

- Add the imports `import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';` and `import { useTeam } from '@/hooks/useTeam';`.
- After `const clientId = license?.clientId ?? '';`, add `const dataAccess = useLicenseDataAccess(license);` and `const { activeTeam } = useTeam();`.
- Replace the `granted` and `access` computations with:

```tsx
const granted: Access =
  licensesLoading || loading
    ? 'loading'
    : !license
      ? 'not-shared'
      : dataAccess.kind === 'member-no-access'
        ? 'no-access'
        : !isAuthenticatedAsDev
          ? 'no-jwt'
          : 'ok';
```

```tsx
const access: Access =
  granted !== 'ok'
    ? granted
    : exchangeCode === 'NOT_SHARED'
      ? 'not-shared'
      : // The console proxy refused: removed from the team, or access revoked.
        exchangeCode === 'NO_ACCESS'
        ? 'removed'
        : // MISSING here means the stored JWT expired since the page read it.
          exchangeCode === 'DEV_JWT_INVALID' || exchangeCode === 'DEV_JWT_MISSING'
          ? 'jwt-expired'
          : 'ok';
```

Then pass two more props to `<AccessNotice …>`:

```tsx
                    member={dataAccess.kind !== 'owner'}
                    ownerEmail={activeTeam?.ownerEmail}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/pages/vehicles && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS, including the existing `VehiclePage` and `VehiclesView` suites. They render without a `TeamProvider`, so `useTeam()` gives `isMember: false` and the owner path. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMemberDevJwt.ts src/hooks/useLicenseDataAccess.ts src/components/DataAccess src/services/subjects/client.ts src/app/vehicles __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/pages/vehicles/AccessNotice.test.tsx
git commit -m "feat(teams): members read Vehicles with a developer JWT signed by their own wallet"
```

---

### Task 9: Data proxy: check license access, match the signer claim, write an audit line

**Files:**

- Create: `src/services/licenseAccess.ts` (server only)
- Modify: `src/app/api/data/proxy.ts`
- Test: `__tests__/unit/services/licenseAccess.test.ts`, `__tests__/unit/app/api/dataProxy.test.ts` (extend)

**Interfaces:**

- Consumes: `GET /api/my/license-access?clientId=` (C7); `LicenseAccess` (Task 1); `NO_LONGER_HAS_ACCESS` (Task 1); `TEAM_DATA_ACCESS_ENABLED`.
- Produces:
  - `getLicenseAccess(sessionToken, clientId, deps?)`, cached 60 s per session and client ID.
  - `authorizeLicenseAccess({ devJwt, sessionToken }, deps?): Promise<AccessDecision>`.
  - `clearLicenseAccessCache()`.
  - `AccessDecision`, either
    - `{ allowed: true; access: 'OWNER' | 'MEMBER'; teamId: string | null; clientId: string; userEmail: string }`, or
    - `{ allowed: false; status: 401 | 403 | 503; code: 'NO_ACCESS' | 'ACCESS_CHECK_FAILED' | 'DEV_JWT_INVALID'; message: string }`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/services/licenseAccess.test.ts`:

```ts
/**
 * @jest-environment node
 */
import {
  authorizeLicenseAccess,
  clearLicenseAccessCache,
  getLicenseAccess,
} from '@/services/licenseAccess';
import type { LicenseAccess } from '@/types/team';

const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const EOA = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const jwt = (claims: Record<string, unknown>) =>
  [
    'eyJhbGciOiJub25lIn0',
    Buffer.from(JSON.stringify(claims)).toString('base64url'),
    'sig',
  ].join('.');

describe('getLicenseAccess', () => {
  beforeEach(() => clearLicenseAccessCache());

  it('caches the answer for 60 seconds per session and client ID', async () => {
    let now = 1_000_000;
    const request = jest.fn(
      async (): Promise<LicenseAccess> => ({
        access: 'NONE',
        teamId: null,
        signerAddress: null,
        userEmail: 'jane@harness.dev',
      }),
    );
    const deps = { request, now: () => now };
    await getLicenseAccess('session-a', CLIENT, deps);
    await getLicenseAccess('session-a', CLIENT.toUpperCase().replace('0X', '0x'), deps);
    expect(request).toHaveBeenCalledTimes(1);
    await getLicenseAccess('session-b', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(2);
    now += 60_001;
    await getLicenseAccess('session-a', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(3);
  });
});

describe('authorizeLicenseAccess', () => {
  const lookup = jest.fn();
  const decide = (claims: Record<string, unknown>, enabled = true) =>
    authorizeLicenseAccess(
      { devJwt: jwt(claims), sessionToken: 'session' },
      { lookup, dataAccessEnabled: enabled },
    );

  it('allows the license owner and carries the session email for the audit line', async () => {
    lookup.mockResolvedValue({
      access: 'OWNER',
      teamId: 't1',
      signerAddress: null,
      userEmail: 'jane@harness.dev',
    });
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: true,
      access: 'OWNER',
      teamId: 't1',
      clientId: CLIENT,
      userEmail: 'jane@harness.dev',
    });
  });

  it('allows a member whose JWT was signed by their registered wallet, any case', async () => {
    lookup.mockResolvedValue({
      access: 'MEMBER',
      teamId: 't2',
      signerAddress: EOA,
      userEmail: 'sam@harness.dev',
    });
    await expect(
      decide({ ethereum_address: CLIENT, signer_address: EOA.toLowerCase() }),
    ).resolves.toMatchObject({
      allowed: true,
      access: 'MEMBER',
      userEmail: 'sam@harness.dev',
    });
  });

  it('refuses a member JWT without signer_address (minted from a shared API key)', async () => {
    lookup.mockResolvedValue({
      access: 'MEMBER',
      teamId: 't2',
      signerAddress: EOA,
      userEmail: 'sam@harness.dev',
    });
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: false,
      status: 403,
      code: 'NO_ACCESS',
      message: 'You no longer have access to this license.',
    });
  });

  it("refuses a member signed by someone else's wallet, or while the flag is off", async () => {
    lookup.mockResolvedValue({
      access: 'MEMBER',
      teamId: 't2',
      signerAddress: EOA,
      userEmail: 'sam@harness.dev',
    });
    await expect(
      decide({
        ethereum_address: CLIENT,
        signer_address: '0x0000000000000000000000000000000000000001',
      }),
    ).resolves.toMatchObject({ allowed: false, code: 'NO_ACCESS' });
    await expect(
      decide({ ethereum_address: CLIENT, signer_address: EOA }, false),
    ).resolves.toMatchObject({ allowed: false, code: 'NO_ACCESS' });
  });

  it('refuses NONE and fails closed when console-api is unreachable', async () => {
    lookup.mockResolvedValue({
      access: 'NONE',
      teamId: null,
      signerAddress: null,
      userEmail: 'sam@harness.dev',
    });
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 403,
    });
    lookup.mockRejectedValue(new Error('timeout'));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
    });
  });

  it('answers 401 for an unreadable developer JWT or a missing session', async () => {
    await expect(
      authorizeLicenseAccess({ devJwt: 'garbage', sessionToken: 's' }, { lookup }),
    ).resolves.toMatchObject({ allowed: false, status: 401, code: 'DEV_JWT_INVALID' });
    await expect(
      authorizeLicenseAccess(
        { devJwt: jwt({ ethereum_address: CLIENT }), sessionToken: null },
        { lookup },
      ),
    ).resolves.toMatchObject({ allowed: false, status: 401, code: 'NO_ACCESS' });
  });
});
```

Extend `__tests__/unit/app/api/dataProxy.test.ts`:

- Add this mock next to the `subjectJwt` mock, before the route imports:

```ts
jest.mock('@/services/licenseAccess', () => ({ authorizeLicenseAccess: jest.fn() }));
import { authorizeLicenseAccess } from '@/services/licenseAccess';
```

- In `beforeEach`, add:

```ts
(authorizeLicenseAccess as jest.Mock).mockReset();
(authorizeLicenseAccess as jest.Mock).mockResolvedValue({
  allowed: true,
  access: 'OWNER',
  teamId: 'team-harness',
  clientId: '0xclient',
  userEmail: 'jane@harness.dev',
});
```

- Append inside `describe('data proxy routes', …)`:

```ts
it('refuses with the access decision and never exchanges', async () => {
  (authorizeLicenseAccess as jest.Mock).mockResolvedValue({
    allowed: false,
    status: 403,
    code: 'NO_ACCESS',
    message: 'You no longer have access to this license.',
  });
  const res = await telemetry(req({ asset: VEHICLE, query: 'query { x }' }));
  expect(res.status).toBe(403);
  expect(await res.json()).toEqual({
    error: 'You no longer have access to this license.',
    code: 'NO_ACCESS',
  });
  expect(getSubjectJwt).not.toHaveBeenCalled();
});

it('passes the session cookie to the access check and logs one audit line', async () => {
  const info = jest.spyOn(console, 'info').mockImplementation(() => {});
  fetchMock.mockResolvedValueOnce(new Response('{"data":{}}', { status: 200 }));
  const request = req({ asset: VEHICLE, query: 'query { x }' });
  request.cookies.set('session-token', 'session.jwt');
  await telemetry(request);
  expect(authorizeLicenseAccess).toHaveBeenCalledWith({
    devJwt: 'dev.jwt',
    sessionToken: 'session.jwt',
  });
  const line = JSON.parse(
    info.mock.calls.find(([m]) => String(m).includes('data_proxy'))![0],
  );
  expect(line).toEqual({
    event: 'data_proxy',
    api: 'telemetry',
    email: 'jane@harness.dev',
    teamId: 'team-harness',
    clientId: '0xclient',
    asset: VEHICLE,
    access: 'OWNER',
  });
  info.mockRestore();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/services/licenseAccess.test.ts __tests__/unit/app/api/dataProxy.test.ts`
Expected: FAIL. `licenseAccess` is missing, and the proxy neither calls the check nor logs.

- [ ] **Step 3: Implement**

`src/services/licenseAccess.ts`:

```ts
// Server only: may the signed-in user use this developer JWT's license?
// console-api answers OWNER / MEMBER / NONE (contracts C7); a member must also
// present a JWT signed by their own registered wallet (signer_address, C1).
import { createHash } from 'node:crypto';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import configuration from '@/config';
import { NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import type { LicenseAccess } from '@/types/team';

export type AccessDecision =
  | {
      allowed: true;
      access: 'OWNER' | 'MEMBER';
      teamId: string | null;
      clientId: string;
      // The signed-in user's email, from console-api, for the audit line.
      userEmail: string;
    }
  | {
      allowed: false;
      status: 401 | 403 | 503;
      code: 'NO_ACCESS' | 'ACCESS_CHECK_FAILED' | 'DEV_JWT_INVALID';
      message: string;
    };

const TTL_MS = 60_000;
const cache = new Map<string, { value: LicenseAccess; expiresAt: number }>();
export const clearLicenseAccessCache = () => cache.clear();

const requestLicenseAccess = async (
  sessionToken: string,
  clientId: string,
): Promise<LicenseAccess> => {
  const { data } = await axios.get<LicenseAccess>('/api/my/license-access', {
    baseURL: configuration.backendUrl,
    timeout: 5000,
    params: { clientId },
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  return data;
};

// Cached for 60 s per session and license, so a removed member is cut off within
// a minute while the proxy does not ask console-api on every query.
export const getLicenseAccess = async (
  sessionToken: string,
  clientId: string,
  deps = { request: requestLicenseAccess, now: Date.now },
): Promise<LicenseAccess> => {
  const key = `${createHash('sha256').update(sessionToken).digest('hex')}:${clientId.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > deps.now()) return hit.value;
  const value = await deps.request(sessionToken, clientId);
  cache.set(key, { value, expiresAt: deps.now() + TTL_MS });
  return value;
};

const readClaims = (devJwt: string) => {
  try {
    return jwtDecode<{ ethereum_address?: string; signer_address?: string }>(devJwt);
  } catch {
    return null;
  }
};

export const authorizeLicenseAccess = async (
  { devJwt, sessionToken }: { devJwt: string; sessionToken: string | null },
  deps: {
    lookup?: (sessionToken: string, clientId: string) => Promise<LicenseAccess>;
    dataAccessEnabled?: boolean;
  } = {},
): Promise<AccessDecision> => {
  const lookup = deps.lookup ?? ((s: string, c: string) => getLicenseAccess(s, c));
  const dataAccessEnabled = deps.dataAccessEnabled ?? TEAM_DATA_ACCESS_ENABLED;
  const claims = readClaims(devJwt);
  if (!claims?.ethereum_address) {
    return {
      allowed: false,
      status: 401,
      code: 'DEV_JWT_INVALID',
      message: 'The developer JWT could not be read',
    };
  }
  if (!sessionToken) {
    return {
      allowed: false,
      status: 401,
      code: 'NO_ACCESS',
      message: 'Sign in again to read this license.',
    };
  }
  const clientId = claims.ethereum_address;
  let access: LicenseAccess;
  try {
    access = await lookup(sessionToken, clientId);
  } catch {
    return {
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
      message: 'Could not verify your access to this license. Try again.',
    };
  }
  if (access.access === 'OWNER') {
    return {
      allowed: true,
      access: 'OWNER',
      teamId: access.teamId,
      clientId,
      userEmail: access.userEmail,
    };
  }
  const signer = claims.signer_address?.toLowerCase();
  if (
    access.access === 'MEMBER' &&
    dataAccessEnabled &&
    signer &&
    access.signerAddress &&
    signer === access.signerAddress.toLowerCase()
  ) {
    return {
      allowed: true,
      access: 'MEMBER',
      teamId: access.teamId,
      clientId,
      userEmail: access.userEmail,
    };
  }
  return {
    allowed: false,
    status: 403,
    code: 'NO_ACCESS',
    message: NO_LONGER_HAS_ACCESS,
  };
};
```

`src/app/api/data/proxy.ts`:

- Add the imports:

```ts
import { authorizeLicenseAccess, type AccessDecision } from '@/services/licenseAccess';
import { cookieName } from '@/services/dimoDevAPI';
```

- Add above `createDataProxy`:

```ts
// One structured line per proxied request, for the audit trail (spec: Audit):
// the session email comes from console-api's license-access answer (C7).
const audit = (
  api: DataApi,
  asset: string,
  decision: Extract<AccessDecision, { allowed: true }>,
) =>
  console.info(
    JSON.stringify({
      event: 'data_proxy',
      api,
      email: decision.userEmail,
      teamId: decision.teamId,
      clientId: decision.clientId,
      asset,
      access: decision.access,
    }),
  );
```

- Inside `createDataProxy`, between the `assetAllowed` check and the `try {` that calls `getSubjectJwt`, add:

```ts
const sessionToken = req.cookies.get(cookieName)?.value ?? null;
const decision = await authorizeLicenseAccess({ devJwt, sessionToken });
if (!decision.allowed) {
  return NextResponse.json(
    { error: decision.message, code: decision.code },
    { status: decision.status },
  );
}
audit(api, body.asset, decision);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/services/licenseAccess.test.ts __tests__/unit/app/api/dataProxy.test.ts __tests__/unit/services/subjectJwt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/licenseAccess.ts src/app/api/data/proxy.ts __tests__/unit/services/licenseAccess.test.ts __tests__/unit/app/api/dataProxy.test.ts
git commit -m "feat(teams): data proxy checks license access, matches the member's signer and logs each request"
```

---

### Task 10: Webhooks are owner-only

**Files:**

- Create: `src/components/OwnerOnly/OwnerOnly.tsx`, `src/components/OwnerOnly/index.ts`
- Delete: `src/app/webhooks/layout.ts`
- Create: `src/app/webhooks/layout.tsx`
- Test: `__tests__/unit/components/OwnerOnly.test.tsx`

**Interfaces:**

- Consumes: `useTeam()`.
- Produces: `<OwnerOnly feature="Webhooks">{children}</OwnerOnly>`, which renders its children for owners and a notice for members.

- [ ] **Step 1: Write the failing test**

`__tests__/unit/components/OwnerOnly.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { OwnerOnly } from '@/components/OwnerOnly';

describe('OwnerOnly', () => {
  it('renders the page for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isLoading: false, isMember: false });
    render(
      <OwnerOnly feature="Webhooks">
        <p>webhooks table</p>
      </OwnerOnly>,
    );
    expect(screen.getByText('webhooks table')).toBeInTheDocument();
  });

  it('tells members who manages webhooks and hides the page', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isLoading: false,
      isMember: true,
      activeTeam: { name: 'Acme Mobility', ownerEmail: 'ops@acme.dev' },
    });
    render(
      <OwnerOnly feature="Webhooks">
        <p>webhooks table</p>
      </OwnerOnly>,
    );
    expect(screen.queryByText('webhooks table')).toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Webhooks are managed by the team owner' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ops@acme\.dev manages webhooks for Acme Mobility/),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/unit/components/OwnerOnly.test.tsx`
Expected: FAIL. The module is missing.

- [ ] **Step 3: Implement**

`src/components/OwnerOnly/OwnerOnly.tsx`:

```tsx
'use client';
import type { FC, PropsWithChildren } from 'react';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';

// Pages only the team owner may use. A webhook keeps sending data after its
// creator leaves the team, so members of someone else's team never get here.
export const OwnerOnly: FC<PropsWithChildren<{ feature: string }>> = ({
  feature,
  children,
}) => {
  const { isLoading, isMember, activeTeam } = useTeam();
  if (isLoading) return <Loader isLoading={true} />;
  if (!isMember) return <>{children}</>;
  const lower = feature.toLowerCase();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
      <h2 className="text-card-title text-ink">
        {feature} are managed by the team owner
      </h2>
      <p className="max-w-xl text-body-sm text-muted">
        {activeTeam?.ownerEmail} manages {lower} for {activeTeam?.name}. Switch to your
        own team to manage {lower} for your licenses.
      </p>
    </div>
  );
};
```

`src/components/OwnerOnly/index.ts`:

```ts
export * from './OwnerOnly';
```

Replace `src/app/webhooks/layout.ts` (run `git rm src/app/webhooks/layout.ts`) with `src/app/webhooks/layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Webhooks">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/unit/components/OwnerOnly.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/webhooks src/components/OwnerOnly __tests__/unit/components/OwnerOnly.test.tsx
git commit -m "feat(teams): webhooks are owner-only"
```

---

### Task 11: Settings → Team: members, invites, resend and cancel

**Files:**

- Create: `src/hooks/useTeamMembers.ts`, `src/hooks/useTeamLicenses.ts`
- Create: `src/app/settings/components/Team/TeamSection.tsx`, `MembersTable.tsx`, `MemberActions.tsx`, `InviteMemberModal.tsx`, `memberStatus.ts`, `index.ts`
- Modify: `src/utils/inviteErrors.ts` (add `inviteSendError`)
- Modify: `src/app/settings/components/View/View.tsx`
- Delete:
  - `src/app/settings/components/TeamManagement/`, `TeamForm/`, `TeamFormModal/`
  - `src/hooks/useTeamCollaborators.ts`, `src/actions/team.ts`, `src/services/team.ts`
  - `__tests__/unit/pages/app/settings/TeamManagement.test.tsx` and its snapshot
- Modify: `src/hooks/index.ts`, `src/config/default.ts`, `src/config/index.ts` (drop `ROLES`), `src/types/team.ts` (drop the legacy collaborator types), `src/types/user.ts`, `src/types/next-auth.d.ts`
- Regenerate: `src/gql/*` (new `GetTeamLicenses` query)
- Test: `__tests__/unit/pages/settings/TeamSection.test.tsx`, `__tests__/unit/pages/settings/memberStatus.test.ts`, `__tests__/unit/pages/settings/MembersTable.test.tsx`, `__tests__/unit/hooks/useTeamLicenses.test.ts`, `__tests__/unit/hooks/useTeamMembers.test.tsx`

**Interfaces:**

- Consumes: `listTeamMembers`, `inviteTeamMember`, `resendTeamInvite`, `cancelTeamInvite` (Task 2); `useTeam` (Task 4).
- Produces:
  - `useTeamMembers(): { members: TeamMember[]; isLoading; error; refetch; upsertMember(member: TeamMember): void }`, with query key `['team-members', teamId]`.
  - `mergeMember(members, member): TeamMember[]`. It keeps the server's order (owner, accepted, pending, revoked): a member with a known id replaces its row in place, because re-inviting an expired invite returns `201` with the same id; a new invite goes before the revoked rows. Nothing in the console re-sorts the list.
  - `useTeamLicenses(): { licenses: TeamLicense[]; loading: boolean; refetch }`, with
    `TeamLicense = { tokenId: number; alias: string | null; clientId: string; label: string; redirectUri: string | null; signers: string[] }` (signers lowercase),
    `toTeamLicense(node)` and `licensesHeldBy(licenses, signer)`.
  - `memberRowState(member, now?): 'owner' | 'active' | 'invited' | 'invite-expired' | 'removed-signer'` and `STATE_CHIP`.
  - `inviteSendError(code, email, fallback): string`, where `EMAIL_FAILED` reads `We couldn't email {email}. Try again.`
  - `<TeamSection />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hooks/useTeamLicenses.test.ts`:

```ts
import { licensesHeldBy, toTeamLicense } from '@/hooks/useTeamLicenses';

const node = {
  tokenId: 42,
  alias: 'Harness Fleet',
  clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
  owner: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
  redirectURIs: { nodes: [{ uri: 'https://harness.dev/callback' }] },
  signers: { nodes: [{ address: '0x5aD1C3E5F7A9B1D3F5A7C9E1B3D5F7A9C1E3B5D7' }] },
};

describe('team licenses', () => {
  it('normalises a license node', () => {
    expect(toTeamLicense(node as never)).toEqual({
      tokenId: 42,
      alias: 'Harness Fleet',
      clientId: node.clientId,
      label: 'Harness Fleet',
      redirectUri: 'https://harness.dev/callback',
      signers: ['0x5ad1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7'],
    });
    expect(
      toTeamLicense({ ...node, alias: null, redirectURIs: { nodes: [] } } as never),
    ).toMatchObject({
      label: 'License #42',
      redirectUri: null,
    });
  });

  it('finds the licenses a signer holds, case-insensitively', () => {
    const licenses = [toTeamLicense(node as never)];
    expect(
      licensesHeldBy(licenses, '0x5ad1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7'),
    ).toHaveLength(1);
    expect(
      licensesHeldBy(licenses, '0x0000000000000000000000000000000000000001'),
    ).toHaveLength(0);
    expect(licensesHeldBy(licenses, null)).toHaveLength(0);
  });
});
```

`__tests__/unit/hooks/useTeamMembers.test.tsx`:

```tsx
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: () => ({ activeTeam: { id: 't1' } }) }));
import { listTeamMembers } from '@/actions/teams';
import { mergeMember, useTeamMembers } from '@/hooks/useTeamMembers';
import type { TeamMember } from '@/types/team';

const m = (
  id: string,
  status: TeamMember['status'],
  over: Partial<TeamMember> = {},
): TeamMember => ({
  id,
  userId: null,
  name: null,
  email: `${id}@harness.dev`,
  role: 'MEMBER',
  status,
  signerAddress: null,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
  ...over,
});
// The server's order: owner, accepted, pending, revoked-but-still-a-signer.
const SERVER_ORDER = [
  m('owner', 'ACCEPTED', { role: 'OWNER' }),
  m('sam', 'ACCEPTED'),
  m('lee', 'PENDING', { inviteExpiresAt: '2026-09-01T00:00:00Z' }),
  m('alex', 'REVOKED'),
];

describe('mergeMember', () => {
  it('replaces a re-invited (expired) row in place instead of adding a duplicate', () => {
    const refreshed = { ...SERVER_ORDER[2], inviteExpiresAt: '2026-10-09T00:00:00Z' };
    const merged = mergeMember(SERVER_ORDER, refreshed);
    expect(merged.map((x) => x.id)).toEqual(['owner', 'sam', 'lee', 'alex']);
    expect(merged[2].inviteExpiresAt).toBe('2026-10-09T00:00:00Z');
  });

  it('puts a new invite before the revoked rows, keeping the rest of the order', () => {
    expect(mergeMember(SERVER_ORDER, m('dana', 'PENDING')).map((x) => x.id)).toEqual([
      'owner',
      'sam',
      'lee',
      'dana',
      'alex',
    ]);
    expect(
      mergeMember(SERVER_ORDER.slice(0, 3), m('dana', 'PENDING')).map((x) => x.id),
    ).toEqual(['owner', 'sam', 'lee', 'dana']);
  });
});

describe('useTeamMembers', () => {
  it('keeps the server order and updates a row through upsertMember', async () => {
    (listTeamMembers as jest.Mock).mockResolvedValue({
      ok: true,
      data: { members: SERVER_ORDER },
    });
    const client = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTeamMembers(), { wrapper });
    await waitFor(() => expect(result.current.members).toHaveLength(4));
    expect(result.current.members.map((x) => x.id)).toEqual([
      'owner',
      'sam',
      'lee',
      'alex',
    ]);
    act(() =>
      result.current.upsertMember({
        ...SERVER_ORDER[2],
        inviteExpiresAt: '2026-10-09T00:00:00Z',
      }),
    );
    expect(result.current.members).toHaveLength(4);
    expect(result.current.members[2].inviteExpiresAt).toBe('2026-10-09T00:00:00Z');
  });
});
```

`__tests__/unit/pages/settings/MembersTable.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MembersTable } from '@/app/settings/components/Team/MembersTable';
import type { TeamMember } from '@/types/team';

const m = (
  id: string,
  status: TeamMember['status'],
  role: TeamMember['role'] = 'MEMBER',
): TeamMember => ({
  id,
  userId: id,
  name: null,
  email: `${id}@harness.dev`,
  role,
  status,
  signerAddress: null,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: '2099-01-01T00:00:00Z',
});

describe('MembersTable', () => {
  it('renders rows in the order the server sent them', () => {
    const members = [
      m('zed', 'ACCEPTED', 'OWNER'),
      m('amy', 'ACCEPTED'),
      m('bob', 'PENDING'),
      m('cat', 'REVOKED'),
    ];
    render(<MembersTable members={members} licenses={[]} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent?.match(/(\w+)@harness\.dev/)?.[1])).toEqual([
      'zed',
      'amy',
      'bob',
      'cat',
    ]);
  });
});
```

`__tests__/unit/pages/settings/memberStatus.test.ts`:

```ts
import { memberRowState, STATE_CHIP } from '@/app/settings/components/Team/memberStatus';
import type { TeamMember } from '@/types/team';

const base: TeamMember = {
  id: 'm',
  userId: 'u',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const NOW = Date.parse('2026-10-02T00:00:00Z');

describe('memberRowState', () => {
  it('classifies every row', () => {
    expect(memberRowState({ ...base, role: 'OWNER' }, NOW)).toBe('owner');
    expect(memberRowState(base, NOW)).toBe('active');
    expect(
      memberRowState(
        { ...base, status: 'PENDING', inviteExpiresAt: '2026-10-05T00:00:00Z' },
        NOW,
      ),
    ).toBe('invited');
    expect(
      memberRowState(
        { ...base, status: 'PENDING', inviteExpiresAt: '2026-09-30T00:00:00Z' },
        NOW,
      ),
    ).toBe('invite-expired');
    expect(memberRowState({ ...base, status: 'REVOKED' }, NOW)).toBe('removed-signer');
  });

  it('chips only rows that carry a state', () => {
    expect(STATE_CHIP.owner).toBeNull();
    expect(STATE_CHIP.active).toBeNull();
    expect(STATE_CHIP.invited).toEqual({ tone: 'pending', label: 'Invited' });
    expect(STATE_CHIP['invite-expired']).toEqual({
      tone: 'off',
      label: 'Invite expired',
    });
    expect(STATE_CHIP['removed-signer']).toEqual({ tone: 'error', label: 'Removed' });
  });
});
```

`__tests__/unit/pages/settings/TeamSection.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeamLicenses', () => ({
  ...jest.requireActual('@/hooks/useTeamLicenses'),
  useTeamLicenses: jest.fn(),
}));
jest.mock('@/actions/teams', () => ({
  inviteTeamMember: jest.fn(),
  resendTeamInvite: jest.fn(),
  cancelTeamInvite: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { cancelTeamInvite, inviteTeamMember, resendTeamInvite } from '@/actions/teams';
import { toast } from 'sonner';
import { TeamSection } from '@/app/settings/components/Team';
import type { TeamMember } from '@/types/team';

const SAM_EOA = '0x5ad1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7';
const member = (over: Partial<TeamMember>): TeamMember => ({
  id: 'm',
  userId: 'u',
  name: null,
  email: 'x@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
  ...over,
});
const MEMBERS = [
  member({
    id: 'm0',
    userId: 'user-harness',
    name: 'Jane Developer',
    email: 'jane@harness.dev',
    role: 'OWNER',
  }),
  member({
    id: 'm1',
    userId: 'user-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    signerAddress: SAM_EOA,
  }),
  member({
    id: 'm2',
    userId: null,
    email: 'lee@harness.dev',
    status: 'PENDING',
    inviteExpiresAt: '2999-01-01T00:00:00Z',
  }),
];
const LICENSES = [
  {
    tokenId: 42,
    alias: 'Harness Fleet',
    clientId: '0x3e8f',
    label: 'Harness Fleet',
    redirectUri: 'https://harness.dev/callback',
    signers: [SAM_EOA],
  },
];
const refetch = jest.fn();
const upsertMember = jest.fn();

const asOwner = (isOwner: boolean) =>
  (useTeam as jest.Mock).mockReturnValue({
    isOwner,
    isMember: !isOwner,
    activeTeam: { id: 't1', name: 'Harness Motors', ownerEmail: 'jane@harness.dev' },
  });

describe('TeamSection', () => {
  beforeEach(() => {
    (useTeamMembers as jest.Mock).mockReturnValue({
      members: MEMBERS,
      isLoading: false,
      refetch,
      upsertMember,
    });
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: LICENSES,
      loading: false,
      refetch: jest.fn(),
    });
  });

  it('shows members, their state and their data access to the owner', () => {
    asOwner(true);
    render(<TeamSection />);
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument();
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText('sam@harness.dev')).toBeInTheDocument();
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Harness Fleet')).toBeInTheDocument();
    expect(screen.getByText('All licenses')).toBeInTheDocument();
  });

  it('is read-only for a member', () => {
    asOwner(false);
    render(<TeamSection />);
    expect(screen.queryByRole('button', { name: 'Invite member' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Resend' })).toBeNull();
    expect(screen.getByText(/jane@harness\.dev manages this team/)).toBeInTheDocument();
  });

  it('invites by email, updates the returned row in place and refreshes the list', async () => {
    asOwner(true);
    (inviteTeamMember as jest.Mock).mockResolvedValue({
      ok: true,
      data: { member: MEMBERS[2] },
    });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: ' dana@harness.dev ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    await waitFor(() =>
      expect(inviteTeamMember).toHaveBeenCalledWith('dana@harness.dev'),
    );
    expect(toast.success).toHaveBeenCalledWith('Invite sent to dana@harness.dev');
    expect(upsertMember).toHaveBeenCalledWith(MEMBERS[2]);
    expect(refetch).toHaveBeenCalled();
  });

  it('keeps the form open to retry when the email could not be sent', async () => {
    asOwner(true);
    (inviteTeamMember as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: 'EMAIL_FAILED',
      message: 'x',
    });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'dana@harness.dev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    expect(
      await screen.findByText("We couldn't email dana@harness.dev. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeInTheDocument();
    expect(upsertMember).not.toHaveBeenCalled();
  });

  it('says so when a resent invite could not be emailed', async () => {
    asOwner(true);
    (resendTeamInvite as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: 'EMAIL_FAILED',
      message: 'x',
    });
    render(<TeamSection />);
    const row = screen.getByText('lee@harness.dev').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Resend' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't email lee@harness.dev. Try again.",
      ),
    );
  });

  it('explains a console-api refusal in the form', async () => {
    asOwner(true);
    (inviteTeamMember as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      code: 'ALREADY_MEMBER',
      message: 'x',
    });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Invite member' }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'sam@harness.dev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    expect(
      await screen.findByText('sam@harness.dev is already in this team.'),
    ).toBeInTheDocument();
  });

  it('resends and cancels a pending invite', async () => {
    asOwner(true);
    (resendTeamInvite as jest.Mock).mockResolvedValue({
      ok: true,
      data: { member: MEMBERS[2] },
    });
    (cancelTeamInvite as jest.Mock).mockResolvedValue({ ok: true, data: null });
    render(<TeamSection />);
    const row = screen.getByText('lee@harness.dev').closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: 'Resend' }));
    await waitFor(() => expect(resendTeamInvite).toHaveBeenCalledWith('m2'));
    fireEvent.click(within(row).getByRole('button', { name: 'Cancel invite' }));
    await waitFor(() => expect(cancelTeamInvite).toHaveBeenCalledWith('m2'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hooks/useTeamLicenses.test.ts __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/settings`
Expected: FAIL. The modules are missing.

- [ ] **Step 3: Implement the hooks**

`src/hooks/useTeamMembers.ts`:

```ts
'use client';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTeamMembers } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';
import type { TeamMember } from '@/types/team';

export const teamMembersKey = (teamId: string | null | undefined) =>
  ['team-members', teamId ?? null] as const;

// The server orders members owner, accepted, pending, revoked-but-still-a-signer
// (contracts C7), and nothing here re-sorts them. A known id replaces its row in
// place: re-inviting an expired invite returns 201 with the same member id. A
// new invite goes before the revoked rows until the refetch lands.
export const mergeMember = (members: TeamMember[], member: TeamMember): TeamMember[] => {
  const index = members.findIndex((m) => m.id === member.id);
  if (index >= 0) return members.map((m, i) => (i === index ? member : m));
  const firstRevoked = members.findIndex((m) => m.status === 'REVOKED');
  if (firstRevoked < 0) return [...members, member];
  return [...members.slice(0, firstRevoked), member, ...members.slice(firstRevoked)];
};

export const useTeamMembers = () => {
  const { activeTeam } = useTeam();
  const queryClient = useQueryClient();
  const key = teamMembersKey(activeTeam?.id);
  const query = useQuery({
    queryKey: key,
    enabled: !!activeTeam,
    queryFn: async () => {
      const result = await listTeamMembers();
      if (!result.ok) throw new Error(result.message);
      return result.data.members;
    },
  });
  const upsertMember = useCallback(
    (member: TeamMember) =>
      queryClient.setQueryData<TeamMember[]>(key, (current = []) =>
        mergeMember(current, member),
      ),
    // key is derived from the team id only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, activeTeam?.id],
  );
  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    upsertMember,
  };
};
```

`src/hooks/useTeamLicenses.ts`:

```ts
'use client';
import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { gql } from '@/gql';
import { useTeam } from '@/hooks/useTeam';

export const TEAM_LICENSES = gql(`
  query GetTeamLicenses($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      nodes {
        tokenId
        alias
        clientId
        owner
        redirectURIs(first: 1) {
          nodes {
            uri
          }
        }
        signers(first: 100) {
          nodes {
            address
          }
        }
      }
    }
  }
`);

export interface TeamLicense {
  tokenId: number;
  alias: string | null;
  clientId: string;
  label: string;
  redirectUri: string | null;
  signers: string[];
}

interface LicenseNode {
  tokenId: number;
  alias?: string | null;
  clientId: string;
  redirectURIs: { nodes: { uri: string }[] };
  signers: { nodes: { address: string }[] };
}

export const toTeamLicense = (node: LicenseNode): TeamLicense => ({
  tokenId: node.tokenId,
  alias: node.alias ?? null,
  clientId: node.clientId,
  label: node.alias || `License #${node.tokenId}`,
  redirectUri: node.redirectURIs.nodes[0]?.uri ?? null,
  signers: node.signers.nodes.map((s) => String(s.address).toLowerCase()),
});

// Data access is "the member's wallet is a current signer", read from Identity.
export const licensesHeldBy = (
  licenses: TeamLicense[],
  signer: string | null | undefined,
) => (signer ? licenses.filter((l) => l.signers.includes(signer.toLowerCase())) : []);

// Every license the active team owns, with its signers, for the Team page.
export const useTeamLicenses = () => {
  const { ownerAddress } = useTeam();
  const { data, loading, refetch } = useQuery(TEAM_LICENSES, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
    fetchPolicy: 'cache-and-network',
  });
  const licenses = useMemo(
    () => ((data?.developerLicenses.nodes ?? []) as LicenseNode[]).map(toTeamLicense),
    [data],
  );
  return { licenses, loading: loading || !ownerAddress, refetch };
};
```

- [ ] **Step 4: Implement the Team section**

`src/app/settings/components/Team/memberStatus.ts`:

```ts
import type { StatusTone } from '@/components/StatusChip/StatusChip';
import type { TeamMember } from '@/types/team';

export type MemberRowState =
  | 'owner'
  | 'active'
  | 'invited'
  | 'invite-expired'
  | 'removed-signer';

export const memberRowState = (
  member: TeamMember,
  now: number = Date.now(),
): MemberRowState => {
  if (member.role === 'OWNER') return 'owner';
  // console-api only lists a revoked member while their wallet still signs for
  // a team license (contracts C7), so a REVOKED row means "still a signer".
  if (member.status === 'REVOKED') return 'removed-signer';
  if (member.status === 'PENDING') {
    return member.inviteExpiresAt && Date.parse(member.inviteExpiresAt) < now
      ? 'invite-expired'
      : 'invited';
  }
  return 'active';
};

export const STATE_CHIP: Record<
  MemberRowState,
  { tone: StatusTone; label: string } | null
> = {
  'owner': null,
  'active': null,
  'invited': { tone: 'pending', label: 'Invited' },
  'invite-expired': { tone: 'off', label: 'Invite expired' },
  'removed-signer': { tone: 'error', label: 'Removed' },
};
```

Append to `src/utils/inviteErrors.ts`:

```ts
export const inviteSendError = (code: string | null, email: string, fallback: string) => {
  switch (code) {
    case 'ALREADY_MEMBER':
      return `${email} is already in this team.`;
    case 'ALREADY_INVITED':
      return `${email} already has a pending invite. Resend it from the list.`;
    case 'INVALID_EMAIL':
      return 'Enter a valid email address.';
    case 'OWNER_ONLY':
      return 'Only the team owner can invite people.';
    // On create the row was revoked, so sending again works; on resend the link
    // was refreshed but not delivered (contracts C7).
    case 'EMAIL_FAILED':
      return `We couldn't email ${email}. Try again.`;
    default:
      return fallback || "We couldn't send the invite. Try again.";
  }
};
```

`src/app/settings/components/Team/InviteMemberModal.tsx`:

```tsx
'use client';
import { type FC } from 'react';
import { useForm } from 'react-hook-form';
import { isEmail } from 'validator';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { Button } from '@/components/Button';
import { inviteTeamMember } from '@/actions/teams';
import { inviteSendError } from '@/utils/inviteErrors';
import type { TeamMember } from '@/types/team';

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onInvited: (member: TeamMember) => void;
}

export const InviteMemberModal: FC<Props> = ({ isOpen, setIsOpen, onInvited }) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: '' } });

  const close = () => {
    reset();
    setIsOpen(false);
  };

  const submit = async ({ email }: { email: string }) => {
    const address = email.trim();
    const result = await inviteTeamMember(address);
    if (result.ok) {
      toast.success(`Invite sent to ${address}`);
      onInvited(result.data.member);
      close();
      return;
    }
    setError('email', { message: inviteSendError(result.code, address, result.message) });
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={(open) => (open ? setIsOpen(true) : close())}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)} noValidate>
        <div className="flex flex-col gap-1 pr-8">
          <Title component="h3" className="text-panel-title">
            Invite a team member
          </Title>
          <p className="text-body-sm text-muted">
            They get an email with a link that works for 7 days. Once they accept, they
            see this team&apos;s licenses.
          </p>
        </div>
        <Label htmlFor="invite-email">
          Email
          <TextField
            id="invite-email"
            type="email"
            placeholder="name@company.com"
            {...register('email', {
              required: 'Enter an email address',
              validate: (value) => isEmail(value.trim()) || 'Enter a valid email address',
            })}
          />
          {errors.email?.message && <TextError errorMessage={errors.email.message} />}
        </Label>
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" loading={isSubmitting}>
            Send invite
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
```

`src/app/settings/components/Team/MemberActions.tsx` (Tasks 12 and 13 extend this file):

```tsx
'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { cancelTeamInvite, resendTeamInvite } from '@/actions/teams';
import { inviteSendError } from '@/utils/inviteErrors';
import type { TeamMember } from '@/types/team';

interface Props {
  member: TeamMember;
  onChanged: () => void;
}

export const MemberActions: FC<Props> = ({ member, onChanged }) => {
  const [busy, setBusy] = useState<'resend' | 'cancel' | null>(null);

  if (member.status === 'PENDING') {
    const resend = async () => {
      setBusy('resend');
      const result = await resendTeamInvite(member.id);
      setBusy(null);
      if (!result.ok) {
        return void toast.error(
          inviteSendError(result.code, member.email, result.message),
        );
      }
      toast.success(`Invite sent again to ${member.email}`);
      onChanged();
    };
    const cancel = async () => {
      setBusy('cancel');
      const result = await cancelTeamInvite(member.id);
      setBusy(null);
      if (!result.ok) return void toast.error(result.message);
      toast.success(`Invite to ${member.email} cancelled`);
      onChanged();
    };
    return (
      <>
        <Button variant="ghost" onClick={resend} loading={busy === 'resend'}>
          Resend
        </Button>
        <Button variant="destructive-ghost" onClick={cancel} loading={busy === 'cancel'}>
          Cancel invite
        </Button>
      </>
    );
  }
  return null;
};
```

`src/app/settings/components/Team/MembersTable.tsx`:

```tsx
'use client';
import { type FC, type ReactNode } from 'react';
import { Table } from '@/components/Table';
import { StatusChip } from '@/components/StatusChip';
import { formatList } from '@/config/teamCopy';
import { licensesHeldBy, type TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { memberRowState, STATE_CHIP } from './memberStatus';

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  renderActions?: (member: TeamMember) => ReactNode;
}

const chip = (label: string) => (
  <span key={label} className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
    {label}
  </span>
);

const DataAccess: FC<{ member: TeamMember; licenses: TeamLicense[] }> = ({
  member,
  licenses,
}) => {
  const held = licensesHeldBy(licenses, member.signerAddress);
  const state = memberRowState(member);
  if (state === 'owner') return <span className="text-muted">All licenses</span>;
  if (state === 'removed-signer') {
    return (
      <span className="break-normal text-body-sm text-fg">
        Removed — still a signer on{' '}
        {formatList(held.map((l) => l.label)) || 'a team license'}.
      </span>
    );
  }
  if (member.status === 'PENDING') return <span className="text-muted">—</span>;
  if (!member.signerAddress) {
    return <span className="text-label text-muted">Needs to sign in once</span>;
  }
  if (!held.length) return <span className="text-muted">None</span>;
  return <div className="flex flex-wrap gap-1.5">{held.map((l) => chip(l.label))}</div>;
};

export const MembersTable: FC<Props> = ({ members, licenses, renderActions }) => (
  <Table
    columns={[
      {
        name: 'email',
        label: 'Member',
        render: (m: TeamMember) => (
          <div className="flex flex-col">
            <span className="break-normal text-body-sm text-fg">{m.name ?? m.email}</span>
            {m.name && <span className="break-all text-label text-muted">{m.email}</span>}
          </div>
        ),
      },
      {
        name: 'role',
        label: 'Role',
        className: 'hidden md:table-cell',
        render: (m: TeamMember) => (
          <span className="whitespace-nowrap text-muted">
            {m.role === 'OWNER' ? 'Owner' : 'Member'}
          </span>
        ),
      },
      {
        name: 'status',
        label: 'Status',
        render: (m: TeamMember) => {
          const state = STATE_CHIP[memberRowState(m)];
          return state ? (
            <StatusChip tone={state.tone}>{state.label}</StatusChip>
          ) : (
            <span className="text-muted">Active</span>
          );
        },
      },
      {
        name: 'signerAddress',
        label: 'Data access',
        className: 'pr-4',
        render: (m: TeamMember) => <DataAccess member={m} licenses={licenses} />,
      },
    ]}
    data={members}
    actions={
      renderActions
        ? [(m: TeamMember) => <span key={m.id}>{renderActions(m)}</span>]
        : undefined
    }
  />
);
```

`src/app/settings/components/Team/TeamSection.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { MembersTable } from './MembersTable';
import { MemberActions } from './MemberActions';
import { InviteMemberModal } from './InviteMemberModal';

export const TeamSection: FC = () => {
  const { activeTeam, isOwner } = useTeam();
  const { members, isLoading, refetch, upsertMember } = useTeamMembers();
  const { licenses } = useTeamLicenses();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!activeTeam) return null;

  return (
    <Section>
      <SectionHeader title="Team">
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </SectionHeader>
      <p className="text-body-sm text-muted">
        {isOwner
          ? 'People you invite see your licenses. Give a member data access to let them use Vehicles with their own wallet.'
          : `You're a member of ${activeTeam.name}. ${activeTeam.ownerEmail} manages this team.`}
      </p>
      {isLoading ? (
        <Loader isLoading={true} />
      ) : (
        <div className="-mx-4 -mb-4">
          <MembersTable
            members={members}
            licenses={licenses}
            renderActions={
              isOwner
                ? (member) => (
                    <MemberActions member={member} onChanged={() => void refetch()} />
                  )
                : undefined
            }
          />
        </div>
      )}
      <InviteMemberModal
        isOpen={inviteOpen}
        setIsOpen={setInviteOpen}
        onInvited={(member) => {
          upsertMember(member);
          void refetch();
        }}
      />
    </Section>
  );
};
```

`src/app/settings/components/Team/index.ts`:

```ts
export * from './TeamSection';
```

`src/app/settings/components/View/View.tsx`, full replacement:

```tsx
'use client';

import { FC } from 'react';
import { TeamSection } from '@/app/settings/components/Team';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

import './View.css';

const View: FC = () => (
  <div className="settings-page">
    <UserDetails />
    <TeamSection />
    <DeveloperSupportButton variant={'large'} />
  </div>
);

export default View;
```

- [ ] **Step 5: Delete the legacy team code and its types**

```bash
git rm -r src/app/settings/components/TeamManagement src/app/settings/components/TeamForm src/app/settings/components/TeamFormModal src/hooks/useTeamCollaborators.ts src/actions/team.ts src/services/team.ts __tests__/unit/pages/app/settings/TeamManagement.test.tsx __tests__/unit/pages/app/settings/__snapshots__/TeamManagement.test.tsx.snap
```

- `src/hooks/index.ts`: delete `export * from './useTeamCollaborators';`.
- `src/config/default.ts`: delete `export const ROLES = ['Collaborator'];`.
- `src/config/index.ts`: delete `ROLES: string[];` from `Configuration`.
- `src/types/team.ts`: delete `TeamRoles`, `TeamRolesLabels`, `InvitationStatuses`, `InvitationStatusLabels`, `ITeamCollaborator` and `IInvitation`, and the `import { IUser } from './user';` they used. Keep `ITeam` and everything added in Task 1.
- `src/types/user.ts`: change the import to `import { ITeam, TeamRole } from './team';` and the field to `role?: TeamRole;`.
- `src/types/next-auth.d.ts`: change the import to `import { TeamRole } from './team';` and the field to `role: TeamRole;`.

Run: `grep -rn "TeamRoles\|ITeamCollaborator\|IInvitation\|InvitationStatus\|config.ROLES\|useTeamCollaborators\|actions/team'" src __tests__ | grep -v "src/gql"`
Expected: no output.

- [ ] **Step 6: Regenerate GraphQL types, run the tests and the type check**

Run: `npm run compile && npx jest __tests__/unit/hooks/useTeamLicenses.test.ts __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/settings && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/settings src/hooks/useTeamMembers.ts src/hooks/useTeamLicenses.ts src/hooks/index.ts src/utils/inviteErrors.ts src/config/default.ts src/config/index.ts src/types/team.ts src/types/user.ts src/types/next-auth.d.ts src/gql __tests__/unit/hooks/useTeamLicenses.test.ts __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/settings __tests__/unit/pages/app/settings
git commit -m "feat(teams): Settings team section with invites; remove the legacy collaborator UI"
```

---

### Task 12: Grant data access (batched `enableSigner`, registry rows, flag)

**Files:**

- Modify: `src/hooks/useTransactions.ts` (add `useSetLicenseSigners`)
- Create: `src/utils/registryWrite.ts`
- Create: `src/app/settings/components/Team/recordMemberKeys.ts`, `GrantAccessModal.tsx`, `PendingGrantBanner.tsx`
- Modify: `src/app/settings/components/Team/MemberActions.tsx`, `TeamSection.tsx`
- Test: `__tests__/unit/utils/registryWrite.test.ts`, `__tests__/unit/pages/settings/GrantAccessModal.test.tsx`, `__tests__/unit/pages/settings/PendingGrantBanner.test.tsx`

**Interfaces:**

- Consumes: `upsertLicenseSigner` (Task 2), `grantWarning` and `formatList` (Task 1), `TeamLicense` and `licensesHeldBy` (Task 11), `TEAM_DATA_ACCESS_ENABLED`.
- Order: the registry `PUT` clears `disabledAt` (C7), so every `MEMBER` write in this task runs only after `enableSigner` has succeeded. The same holds for the generated, RentalOS and console keys in Task 14. A failed transaction writes nothing.
- Produces:
  - `SignerFunction = 'enableSigner' | 'disableSigner'`.
  - `SetLicenseSigners = (fn: SignerFunction, tokenIds: number[], signer: \`0x${string}\`) => Promise<void>`.
  - `useSetLicenseSigners(): SetLicenseSigners`, which sends one user operation per call and throws if it fails.
  - `writeWithRetry<T>(write: () => Promise<ApiResult<T>>): Promise<ApiResult<T>>`, which makes at most two attempts.
  - `recordMemberKeys(licenses, member): Promise<TeamLicense[]>`, returning the licenses whose registry write failed twice.
  - `<GrantAccessModal member licenses isOpen setIsOpen onDone />` and `<PendingGrantBanner members licenses onGrant dataAccessEnabled? />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/registryWrite.test.ts`:

```ts
import { writeWithRetry } from '@/utils/registryWrite';

describe('writeWithRetry', () => {
  it('returns the first success', async () => {
    const write = jest.fn().mockResolvedValue({ ok: true, data: 1 });
    await expect(writeWithRetry(write)).resolves.toEqual({ ok: true, data: 1 });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('tries exactly twice', async () => {
    const failure = {
      ok: false,
      status: 502,
      code: 'IDENTITY_UNAVAILABLE',
      message: 'x',
    };
    const write = jest.fn().mockResolvedValue(failure);
    await expect(writeWithRetry(write)).resolves.toEqual(failure);
    expect(write).toHaveBeenCalledTimes(2);
  });
});
```

`__tests__/unit/pages/settings/GrantAccessModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const setSigners = jest.fn();
jest.mock('@/hooks/useTransactions', () => ({ useSetLicenseSigners: () => setSigners }));
jest.mock('@/actions/teams', () => ({ upsertLicenseSigner: jest.fn() }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { upsertLicenseSigner } from '@/actions/teams';
import { toast } from 'sonner';
import { GrantAccessModal } from '@/app/settings/components/Team/GrantAccessModal';
import type { TeamMember } from '@/types/team';

const SAM_EOA = '0x5aD1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7' as const;
const SAM: TeamMember = {
  id: 'm1',
  userId: 'user-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: SAM_EOA,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const license = (tokenId: number, label: string, signers: string[] = []) => ({
  tokenId,
  alias: label,
  clientId: `0x${tokenId}`,
  label,
  redirectUri: 'https://x',
  signers,
});
const LICENSES = [
  license(42, 'Harness Fleet', [SAM_EOA.toLowerCase()]),
  license(43, 'Sandbox App'),
];
const onDone = jest.fn();
const open = () =>
  render(
    <GrantAccessModal
      member={SAM}
      licenses={LICENSES}
      isOpen
      setIsOpen={jest.fn()}
      onDone={onDone}
    />,
  );

describe('GrantAccessModal', () => {
  beforeEach(() => {
    setSigners.mockReset().mockResolvedValue(undefined);
    (upsertLicenseSigner as jest.Mock).mockReset();
  });

  it('offers only licenses the member lacks and warns with the C8 copy', () => {
    open();
    expect(screen.queryByLabelText('Harness Fleet')).toBeNull();
    fireEvent.click(screen.getByLabelText('Sandbox App'));
    expect(
      screen.getByText(
        'Data access lets Sam Rivera use every permission vehicles have granted Sandbox App, including commands, through the DIMO APIs — not only what the console shows.',
      ),
    ).toBeInTheDocument();
  });

  it('enables the signer in one transaction, then records a MEMBER key', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    open();
    fireEvent.click(screen.getByLabelText('Sandbox App'));
    fireEvent.click(screen.getByRole('button', { name: 'Grant access' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(setSigners).toHaveBeenCalledTimes(1);
    expect(setSigners).toHaveBeenCalledWith('enableSigner', [43], SAM_EOA);
    // The registry PUT clears disabledAt (contracts C7), so it may only follow a
    // confirmed enableSigner.
    expect(setSigners.mock.invocationCallOrder[0]).toBeLessThan(
      (upsertLicenseSigner as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(upsertLicenseSigner).toHaveBeenCalledWith(43, SAM_EOA, {
      kind: 'MEMBER',
      note: null,
      holders: [{ userId: 'user-sam' }],
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Sam Rivera can now use Vehicles for Sandbox App.',
    );
  });

  it('writes nothing when the transaction fails', async () => {
    setSigners.mockRejectedValue(new Error('denied'));
    open();
    fireEvent.click(screen.getByLabelText('Sandbox App'));
    fireEvent.click(screen.getByRole('button', { name: 'Grant access' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'The transaction failed, so no access was granted.',
      ),
    );
    expect(upsertLicenseSigner).not.toHaveBeenCalled();
  });

  it('offers Assign, not a second transaction, when the registry write fails twice', async () => {
    (upsertLicenseSigner as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 502, code: null, message: 'x' })
      .mockResolvedValueOnce({ ok: false, status: 502, code: null, message: 'x' })
      .mockResolvedValueOnce({ ok: true, data: {} });
    open();
    fireEvent.click(screen.getByLabelText('Sandbox App'));
    fireEvent.click(screen.getByRole('button', { name: 'Grant access' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const [message, options] = (toast.error as jest.Mock).mock.calls.at(-1);
    expect(message).toBe(
      "Access granted, but who holds the key couldn't be saved for Sandbox App.",
    );
    expect(options.action.label).toBe('Assign');
    await options.action.onClick();
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(3);
    expect(setSigners).toHaveBeenCalledTimes(1);
  });
});
```

`__tests__/unit/pages/settings/PendingGrantBanner.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PendingGrantBanner } from '@/app/settings/components/Team/PendingGrantBanner';
import type { TeamMember } from '@/types/team';

const m = (over: Partial<TeamMember>): TeamMember => ({
  id: 'm',
  userId: 'u',
  name: 'Dana Lee',
  email: 'dana@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: '0x1111111111111111111111111111111111111111',
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
  ...over,
});
const LICENSES = [
  {
    tokenId: 42,
    alias: 'A',
    clientId: '0x1',
    label: 'A',
    redirectUri: null,
    signers: [],
  },
];

describe('PendingGrantBanner', () => {
  it('prompts for members who joined with a wallet but no data access', () => {
    const onGrant = jest.fn();
    render(
      <PendingGrantBanner
        members={[m({})]}
        licenses={LICENSES}
        onGrant={onGrant}
        dataAccessEnabled
      />,
    );
    expect(screen.getByText('Dana Lee joined. Grant data access?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(onGrant).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }));
  });

  it('stays hidden with the flag off, without a wallet, or for invites', () => {
    const { container, rerender } = render(
      <PendingGrantBanner
        members={[m({})]}
        licenses={LICENSES}
        onGrant={jest.fn()}
        dataAccessEnabled={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(
      <PendingGrantBanner
        members={[m({ signerAddress: null }), m({ id: 'p', status: 'PENDING' })]}
        licenses={LICENSES}
        onGrant={jest.fn()}
        dataAccessEnabled
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/settings/GrantAccessModal.test.tsx __tests__/unit/pages/settings/PendingGrantBanner.test.tsx`
Expected: FAIL. The modules are missing.

- [ ] **Step 3: Implement**

Append to `src/hooks/useTransactions.ts`:

```ts
export type SignerFunction = 'enableSigner' | 'disableSigner';
export type SetLicenseSigners = (
  fn: SignerFunction,
  tokenIds: number[],
  signer: `0x${string}`,
) => Promise<void>;

// One user operation for any number of licenses, so a grant or a revoke never
// half-applies across the licenses an owner picked.
export const useSetLicenseSigners = (): SetLicenseSigners => {
  const { processTransactions } = useContractGA();
  return useCallback(
    async (fn, tokenIds, signer) => {
      if (!tokenIds.length) return;
      const result = await processTransactions(
        tokenIds.map((tokenId) => ({
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoLicenseABI,
            functionName: fn,
            args: [tokenId, signer],
          }),
        })),
      );
      if (result && result.success === false) {
        throw new Error(result.reason ?? `${fn} failed`);
      }
    },
    [processTransactions],
  );
};
```

`src/utils/registryWrite.ts`:

```ts
import type { ApiResult } from '@/types/team';

// The registry write follows an on-chain change that already happened, so it
// is retried once rather than failing the whole action.
export const writeWithRetry = async <T>(
  write: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> => {
  const first = await write();
  if (first.ok) return first;
  return write();
};
```

`src/app/settings/components/Team/recordMemberKeys.ts`:

```ts
import { upsertLicenseSigner } from '@/actions/teams';
import { writeWithRetry } from '@/utils/registryWrite';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

// A member's own wallet key belongs to that member alone (spec: Key registry).
// Returns the licenses whose write failed twice.
export const recordMemberKeys = async (
  licenses: TeamLicense[],
  member: TeamMember,
): Promise<TeamLicense[]> => {
  if (!member.signerAddress || !member.userId) return licenses;
  const input = {
    kind: 'MEMBER' as const,
    note: null,
    holders: [{ userId: member.userId }],
  };
  const results = await Promise.all(
    licenses.map((license) =>
      writeWithRetry(() =>
        upsertLicenseSigner(license.tokenId, member.signerAddress!, input),
      ),
    ),
  );
  return licenses.filter((_, index) => !results[index].ok);
};
```

`src/app/settings/components/Team/GrantAccessModal.tsx`:

```tsx
'use client';
import { type FC, useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { WarningAmberIcon } from '@/components/Icons';
import { formatList, grantWarning } from '@/config/teamCopy';
import { useSetLicenseSigners } from '@/hooks/useTransactions';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { recordMemberKeys } from './recordMemberKeys';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onDone: () => void;
}

const labels = (licenses: TeamLicense[]) => formatList(licenses.map((l) => l.label));

export const GrantAccessModal: FC<Props> = ({
  member,
  licenses,
  isOpen,
  setIsOpen,
  onDone,
}) => {
  const setSigners = useSetLicenseSigners();
  const signer = member.signerAddress;
  const candidates = useMemo(
    () =>
      signer ? licenses.filter((l) => !l.signers.includes(signer.toLowerCase())) : [],
    [licenses, signer],
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isOpen) setSelected([]);
  }, [isOpen]);

  const name = member.name ?? member.email;
  const chosen = candidates.filter((l) => selected.includes(l.tokenId));

  const retryRecord = async (failed: TeamLicense[]) => {
    const again = await recordMemberKeys(failed, member);
    if (again.length)
      toast.error(`Still couldn't save who holds the key for ${labels(again)}.`);
    else toast.success(`Saved ${name} as the key holder for ${labels(failed)}.`);
  };

  const grant = async () => {
    if (!signer || !chosen.length) return;
    setBusy(true);
    try {
      await setSigners(
        'enableSigner',
        chosen.map((l) => l.tokenId),
        signer,
      );
    } catch (error) {
      Sentry.captureException(error);
      toast.error('The transaction failed, so no access was granted.');
      setBusy(false);
      return;
    }
    const failed = await recordMemberKeys(chosen, member);
    setBusy(false);
    setIsOpen(false);
    onDone();
    if (failed.length) {
      toast.error(
        `Access granted, but who holds the key couldn't be saved for ${labels(failed)}.`,
        {
          action: { label: 'Assign', onClick: () => retryRecord(failed) },
        },
      );
    } else {
      toast.success(`${name} can now use Vehicles for ${labels(chosen)}.`);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pr-8">
          <Title component="h3" className="text-panel-title">
            Grant data access
          </Title>
          <p className="text-body-sm text-muted">
            {name}
            {member.name ? ` (${member.email})` : ''} uses their own wallet. Pick the
            licenses it may sign for.
          </p>
        </div>
        {candidates.length === 0 ? (
          <p className="text-body-sm text-muted">
            {name} already has data access to every license in this team.
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label text-muted">Licenses</legend>
            {candidates.map((license) => (
              <div key={license.tokenId} className="flex items-center gap-3">
                <CheckboxField
                  id={`grant-${license.tokenId}`}
                  checked={selected.includes(license.tokenId)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, license.tokenId]
                        : current.filter((id) => id !== license.tokenId),
                    )
                  }
                />
                <label
                  htmlFor={`grant-${license.tokenId}`}
                  className="text-body-sm text-fg"
                >
                  {license.label}
                </label>
              </div>
            ))}
          </fieldset>
        )}
        {chosen.length > 0 && (
          <div className="flex gap-2 rounded-card border border-warning/40 bg-warning/10 p-3">
            <span data-testid="grant-warning-icon" className="pt-0.5">
              <WarningAmberIcon className="h-4 w-4 text-warning" />
            </span>
            <p className="text-body-sm text-fg">{grantWarning(name, labels(chosen))}</p>
          </div>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={grant} loading={busy} disabled={!chosen.length}>
            Grant access
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

`src/app/settings/components/Team/PendingGrantBanner.tsx`:

```tsx
'use client';
import type { FC } from 'react';
import { Button } from '@/components/Button';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { licensesHeldBy, type TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  onGrant: (member: TeamMember) => void;
  dataAccessEnabled?: boolean;
}

// Someone accepted an invite and registered their wallet; the owner's
// transaction is the step that gives them data access.
export const PendingGrantBanner: FC<Props> = ({
  members,
  licenses,
  onGrant,
  dataAccessEnabled = TEAM_DATA_ACCESS_ENABLED,
}) => {
  if (!dataAccessEnabled) return null;
  const waiting = members.filter(
    (m) =>
      m.role === 'MEMBER' &&
      m.status === 'ACCEPTED' &&
      !!m.signerAddress &&
      licensesHeldBy(licenses, m.signerAddress).length === 0,
  );
  if (!waiting.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {waiting.map((member) => (
        <div
          key={member.id}
          className="flex flex-col gap-3 rounded-control bg-control px-4 py-3 md:flex-row md:items-center md:justify-between"
        >
          <p className="text-body-sm text-fg">
            {member.name ?? member.email} joined. Grant data access?
          </p>
          <Button variant="secondary" onClick={() => onGrant(member)}>
            Grant
          </Button>
        </div>
      ))}
    </div>
  );
};
```

`src/app/settings/components/Team/MemberActions.tsx`, full replacement:

```tsx
'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { cancelTeamInvite, resendTeamInvite } from '@/actions/teams';
import { inviteSendError } from '@/utils/inviteErrors';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  onChanged: () => void;
  onGrant: (member: TeamMember) => void;
  dataAccessEnabled?: boolean;
}

export const MemberActions: FC<Props> = ({
  member,
  licenses,
  onChanged,
  onGrant,
  dataAccessEnabled = TEAM_DATA_ACCESS_ENABLED,
}) => {
  const [busy, setBusy] = useState<'resend' | 'cancel' | null>(null);

  if (member.status === 'PENDING') {
    const resend = async () => {
      setBusy('resend');
      const result = await resendTeamInvite(member.id);
      setBusy(null);
      if (!result.ok) {
        return void toast.error(
          inviteSendError(result.code, member.email, result.message),
        );
      }
      toast.success(`Invite sent again to ${member.email}`);
      onChanged();
    };
    const cancel = async () => {
      setBusy('cancel');
      const result = await cancelTeamInvite(member.id);
      setBusy(null);
      if (!result.ok) return void toast.error(result.message);
      toast.success(`Invite to ${member.email} cancelled`);
      onChanged();
    };
    return (
      <>
        <Button variant="ghost" onClick={resend} loading={busy === 'resend'}>
          Resend
        </Button>
        <Button variant="destructive-ghost" onClick={cancel} loading={busy === 'cancel'}>
          Cancel invite
        </Button>
      </>
    );
  }

  const signer = member.signerAddress?.toLowerCase();
  const canGrant =
    dataAccessEnabled &&
    member.role === 'MEMBER' &&
    member.status === 'ACCEPTED' &&
    !!signer &&
    licenses.some((l) => !l.signers.includes(signer));
  return canGrant ? (
    <Button variant="secondary" onClick={() => onGrant(member)}>
      Grant
    </Button>
  ) : null;
};
```

`src/app/settings/components/Team/TeamSection.tsx`, full replacement (adds the banner and the grant dialog):

```tsx
'use client';
import { type FC, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { MembersTable } from './MembersTable';
import { MemberActions } from './MemberActions';
import { InviteMemberModal } from './InviteMemberModal';
import { GrantAccessModal } from './GrantAccessModal';
import { PendingGrantBanner } from './PendingGrantBanner';

// Identity indexes a new signer within seconds; read it again shortly after.
const IDENTITY_SETTLE_MS = 5000;

export const TeamSection: FC = () => {
  const { activeTeam, isOwner } = useTeam();
  const { members, isLoading, refetch, upsertMember } = useTeamMembers();
  const { licenses, refetch: refetchLicenses } = useTeamLicenses();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [grantFor, setGrantFor] = useState<TeamMember | null>(null);

  if (!activeTeam) return null;

  const refreshAll = () => {
    void refetch();
    void refetchLicenses();
    setTimeout(() => void refetchLicenses(), IDENTITY_SETTLE_MS);
  };

  return (
    <Section>
      <SectionHeader title="Team">
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </SectionHeader>
      <p className="text-body-sm text-muted">
        {isOwner
          ? 'People you invite see your licenses. Give a member data access to let them use Vehicles with their own wallet.'
          : `You're a member of ${activeTeam.name}. ${activeTeam.ownerEmail} manages this team.`}
      </p>
      {isOwner && (
        <PendingGrantBanner members={members} licenses={licenses} onGrant={setGrantFor} />
      )}
      {isLoading ? (
        <Loader isLoading={true} />
      ) : (
        <div className="-mx-4 -mb-4">
          <MembersTable
            members={members}
            licenses={licenses}
            renderActions={
              isOwner
                ? (member) => (
                    <MemberActions
                      member={member}
                      licenses={licenses}
                      onChanged={refreshAll}
                      onGrant={setGrantFor}
                    />
                  )
                : undefined
            }
          />
        </div>
      )}
      <InviteMemberModal
        isOpen={inviteOpen}
        setIsOpen={setInviteOpen}
        onInvited={(member) => {
          upsertMember(member);
          refreshAll();
        }}
      />
      {grantFor && (
        <GrantAccessModal
          member={grantFor}
          licenses={licenses}
          isOpen={!!grantFor}
          setIsOpen={(open) => !open && setGrantFor(null)}
          onDone={refreshAll}
        />
      )}
    </Section>
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/settings`
Expected: PASS. Task 11's `TeamSection` tests still pass: the flag is off under Jest, so no Grant buttons appear.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTransactions.ts src/utils/registryWrite.ts src/app/settings/components/Team __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/settings
git commit -m "feat(teams): owners grant data access in one transaction and record the member's key"
```

---

### Task 13: Revoke and remove with batched `disableSigner`, and review the member's webhooks

**Files:**

- Modify: `src/types/webhook.ts` (`Webhook.createdBySigner?: string`, C3)
- Create: `src/app/settings/components/Team/revokeFlow.ts`, `RevokeAccessModal.tsx`, `WebhookReview.tsx`
- Modify: `src/app/settings/components/Team/MemberActions.tsx`, `TeamSection.tsx`
- Test: `__tests__/unit/pages/settings/revokeFlow.test.ts`, `__tests__/unit/pages/settings/WebhookReview.test.tsx`, `__tests__/unit/pages/settings/RevokeAccessModal.test.tsx`

**Interfaces:**

- Consumes:
  - `useSetLicenseSigners`, `writeWithRetry` (Task 12);
  - `markLicenseSignerDisabled`, `removeTeamMember` (Task 2);
  - `fetchWebhooks`, `deleteWebhook` (`src/services/webhook.ts`; `fetchWebhooks` is `GET /v1/webhooks`, the only endpoint that returns `createdBySigner`, per C3);
  - `getDevJwt` (`src/utils/devJwt.ts`).
- Produces:
  - `disableMemberKeys({ licenses, signer, setSigners }): Promise<void>`, which throws if the transaction fails.
  - `removeMember({ member, licenses, setSigners }): Promise<{ removed: boolean; stillSigner: TeamLicense[] }>`.
  - `<RevokeAccessModal target licenses teamName onClose onDone />`, where `target` is `{ member, mode: 'revoke' | 'remove' } | null`.
  - `<WebhookReview licenses signer onDone />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/pages/settings/revokeFlow.test.ts`:

```ts
jest.mock('@/actions/teams', () => ({
  markLicenseSignerDisabled: jest.fn(),
  removeTeamMember: jest.fn(),
}));
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));
import { markLicenseSignerDisabled, removeTeamMember } from '@/actions/teams';
import { captureMessage } from '@sentry/nextjs';
import {
  disableMemberKeys,
  removeMember,
} from '@/app/settings/components/Team/revokeFlow';
import type { TeamMember } from '@/types/team';

const EOA = '0x5aD1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7' as const;
const lic = (tokenId: number, signers: string[]) => ({
  tokenId,
  alias: `L${tokenId}`,
  clientId: `0x${tokenId}`,
  label: `L${tokenId}`,
  redirectUri: null,
  signers,
});
const LICENSES = [lic(42, [EOA.toLowerCase()]), lic(43, [])];
const SAM: TeamMember = {
  id: 'm1',
  userId: 'user-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: EOA,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};

describe('revoke flow', () => {
  const order: string[] = [];
  const setSigners = jest.fn(async (fn: string, ids: number[]) => {
    order.push(`${fn}:${ids.join(',')}`);
  });
  beforeEach(() => {
    order.length = 0;
    setSigners.mockClear();
    (markLicenseSignerDisabled as jest.Mock)
      .mockReset()
      .mockImplementation(async (id: number) => {
        order.push(`stamp:${id}`);
        return { ok: true, data: {} };
      });
    (removeTeamMember as jest.Mock).mockReset().mockImplementation(async () => {
      order.push('remove');
      return { ok: true, data: null };
    });
  });

  it('removes: disables only the licenses held, stamps them, then deletes the membership', async () => {
    await expect(
      removeMember({ member: SAM, licenses: LICENSES, setSigners }),
    ).resolves.toEqual({
      removed: true,
      stillSigner: [],
    });
    expect(order).toEqual(['disableSigner:42', 'stamp:42', 'remove']);
  });

  it('still removes the membership when the transaction fails, and reports the signer', async () => {
    setSigners.mockRejectedValueOnce(new Error('denied'));
    const result = await removeMember({ member: SAM, licenses: LICENSES, setSigners });
    expect(result.removed).toBe(true);
    expect(result.stillSigner.map((l) => l.tokenId)).toEqual([42]);
    expect(removeTeamMember).toHaveBeenCalledWith('m1');
    expect(markLicenseSignerDisabled).not.toHaveBeenCalled();
  });

  it('retries a removed member without deleting the membership again', async () => {
    await removeMember({
      member: { ...SAM, status: 'REVOKED' },
      licenses: LICENSES,
      setSigners,
    });
    expect(removeTeamMember).not.toHaveBeenCalled();
    expect(order).toEqual(['disableSigner:42', 'stamp:42']);
  });

  it('does not throw when the registry stamp fails twice', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: null,
      message: 'x',
    });
    await disableMemberKeys({ licenses: [LICENSES[0]], signer: EOA, setSigners });
    expect(markLicenseSignerDisabled).toHaveBeenCalledTimes(2);
    expect(captureMessage).toHaveBeenCalled();
  });
});
```

`__tests__/unit/pages/settings/WebhookReview.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/webhook', () => ({
  fetchWebhooks: jest.fn(),
  deleteWebhook: jest.fn(),
}));
jest.mock('@/utils/devJwt', () => ({ getDevJwt: jest.fn() }));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { deleteWebhook, fetchWebhooks } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { WebhookReview } from '@/app/settings/components/Team/WebhookReview';

const EOA = '0x5aD1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7';
const LICENSE = {
  tokenId: 42,
  alias: 'Harness Fleet',
  clientId: '0x3e8f',
  label: 'Harness Fleet',
  redirectUri: 'https://harness.dev/callback',
  signers: [],
};
const hook = (id: string, createdBySigner?: string) => ({
  id,
  displayName: `Hook ${id}`,
  description: '',
  metricName: 'speed',
  targetURL: `https://hooks.example/${id}`,
  createdBySigner,
});
const renderReview = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <WebhookReview licenses={[LICENSE]} signer={EOA} onDone={jest.fn()} />
    </QueryClientProvider>,
  );

describe('WebhookReview', () => {
  it("lists only the member's webhooks (case-insensitive) and deletes the selected ones", async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    (fetchWebhooks as jest.Mock).mockResolvedValue([
      hook('a', EOA.toLowerCase()),
      hook('b', '0x0000000000000000000000000000000000000001'),
      hook('c'),
    ]);
    (deleteWebhook as jest.Mock).mockResolvedValue(undefined);
    renderReview();
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
    expect(screen.queryByText('Hook b')).toBeNull();
    expect(screen.queryByText('Hook c')).toBeNull();
    expect(fetchWebhooks).toHaveBeenCalledWith({ token: 'owner.jwt' });
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    await waitFor(() =>
      expect(deleteWebhook).toHaveBeenCalledWith({ webhookId: 'a', token: 'owner.jwt' }),
    );
  });

  it('asks for a developer JWT when the owner has none for the license', () => {
    (getDevJwt as jest.Mock).mockReturnValue(null);
    renderReview();
    expect(
      screen.getByText(
        'Generate a developer JWT for Harness Fleet to check its webhooks.',
      ),
    ).toBeInTheDocument();
    expect(fetchWebhooks).not.toHaveBeenCalled();
  });

  it('says so when the member created none', async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    (fetchWebhooks as jest.Mock).mockResolvedValue([hook('b')]);
    renderReview();
    expect(
      await screen.findByText(
        'No webhooks on Harness Fleet were created by this member.',
      ),
    ).toBeInTheDocument();
  });
});
```

`__tests__/unit/pages/settings/RevokeAccessModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const setSigners = jest.fn();
jest.mock('@/hooks/useTransactions', () => ({ useSetLicenseSigners: () => setSigners }));
jest.mock('@/app/settings/components/Team/revokeFlow', () => ({
  disableMemberKeys: jest.fn(),
  removeMember: jest.fn(),
}));
jest.mock('@/app/settings/components/Team/WebhookReview', () => ({
  WebhookReview: () => <p>webhook review step</p>,
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { removeMember } from '@/app/settings/components/Team/revokeFlow';
import { toast } from 'sonner';
import { RevokeAccessModal } from '@/app/settings/components/Team/RevokeAccessModal';
import type { TeamMember } from '@/types/team';

const EOA = '0x5aD1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7' as const;
const SAM: TeamMember = {
  id: 'm1',
  userId: 'user-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: EOA,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES = [
  {
    tokenId: 42,
    alias: 'Harness Fleet',
    clientId: '0x1',
    label: 'Harness Fleet',
    redirectUri: null,
    signers: [EOA.toLowerCase()],
  },
];

describe('RevokeAccessModal', () => {
  it('removes the member, reports the result and moves on to their webhooks', async () => {
    (removeMember as jest.Mock).mockResolvedValue({ removed: true, stillSigner: [] });
    const onDone = jest.fn();
    render(
      <RevokeAccessModal
        target={{ member: SAM, mode: 'remove' }}
        licenses={LICENSES}
        teamName="Harness Motors"
        onClose={jest.fn()}
        onDone={onDone}
      />,
    );
    expect(
      screen.getByText(/their wallet stops being a signer on Harness Fleet/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(removeMember).toHaveBeenCalledWith({
      member: SAM,
      licenses: LICENSES,
      setSigners,
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Sam Rivera was removed from Harness Motors.',
    );
    expect(screen.getByText('webhook review step')).toBeInTheDocument();
  });

  it('says the member is still a signer when the transaction failed', async () => {
    (removeMember as jest.Mock).mockResolvedValue({
      removed: true,
      stillSigner: LICENSES,
    });
    render(
      <RevokeAccessModal
        target={{ member: SAM, mode: 'remove' }}
        licenses={LICENSES}
        teamName="Harness Motors"
        onClose={jest.fn()}
        onDone={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Sam Rivera was removed but is still a signer on Harness Fleet. Retry from the member list.',
      ),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/pages/settings/revokeFlow.test.ts __tests__/unit/pages/settings/WebhookReview.test.tsx __tests__/unit/pages/settings/RevokeAccessModal.test.tsx`
Expected: FAIL. The modules are missing.

- [ ] **Step 3: Implement**

`src/types/webhook.ts`: add to `interface Webhook`, after `failure_count: number;`:

```ts
  // vehicle-triggers-api: the developer JWT signer that created it, when known
  // (contracts C3; only on GET /v1/webhooks). Checksummed; compare ignoring case.
  createdBySigner?: string;
```

`src/app/settings/components/Team/revokeFlow.ts`:

```ts
import * as Sentry from '@sentry/nextjs';
import { markLicenseSignerDisabled, removeTeamMember } from '@/actions/teams';
import { writeWithRetry } from '@/utils/registryWrite';
import { licensesHeldBy, type TeamLicense } from '@/hooks/useTeamLicenses';
import type { SetLicenseSigners } from '@/hooks/useTransactions';
import type { TeamMember } from '@/types/team';

// One disableSigner transaction for every license, then the registry stamps.
// Throws when the transaction fails, so nothing is stamped that still signs.
export const disableMemberKeys = async ({
  licenses,
  signer,
  setSigners,
}: {
  licenses: TeamLicense[];
  signer: `0x${string}`;
  setSigners: SetLicenseSigners;
}) => {
  if (!licenses.length) return;
  await setSigners(
    'disableSigner',
    licenses.map((l) => l.tokenId),
    signer,
  );
  const stamps = await Promise.all(
    licenses.map((l) =>
      writeWithRetry(() => markLicenseSignerDisabled(l.tokenId, signer)),
    ),
  );
  stamps.forEach((result) => {
    if (!result.ok)
      Sentry.captureMessage(
        `Could not stamp a disabled key: ${result.code ?? result.status}`,
      );
  });
};

// Removing the membership cuts the console off at once whether or not the
// transaction went through; console-api keeps listing the member while their
// wallet still signs, so the owner can retry from the row.
export const removeMember = async ({
  member,
  licenses,
  setSigners,
}: {
  member: TeamMember;
  licenses: TeamLicense[];
  setSigners: SetLicenseSigners;
}): Promise<{ removed: boolean; stillSigner: TeamLicense[] }> => {
  const held = licensesHeldBy(licenses, member.signerAddress);
  let stillSigner: TeamLicense[] = [];
  if (member.signerAddress && held.length) {
    try {
      await disableMemberKeys({
        licenses: held,
        signer: member.signerAddress,
        setSigners,
      });
    } catch (error) {
      Sentry.captureException(error);
      stillSigner = held;
    }
  }
  if (member.status === 'REVOKED') return { removed: true, stillSigner };
  const result = await removeTeamMember(member.id);
  return { removed: result.ok, stillSigner };
};
```

`src/app/settings/components/Team/WebhookReview.tsx`:

```tsx
'use client';
import { type FC, type ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { CheckboxField } from '@/components/CheckboxField';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { deleteWebhook, fetchWebhooks } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import type { TeamLicense } from '@/hooks/useTeamLicenses';

const Box: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3 rounded-card bg-control p-4">
    <h4 className="text-card-title text-ink">{title}</h4>
    {children}
  </section>
);

const LicenseWebhooks: FC<{ license: TeamLicense; signer: string }> = ({
  license,
  signer,
}) => {
  const [token, setToken] = useState<string | null>(() => getDevJwt(license.clientId));
  const [selected, setSelected] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const query = useQuery({
    queryKey: ['member-webhooks', license.clientId, signer.toLowerCase(), token],
    enabled: !!token,
    queryFn: async () =>
      (await fetchWebhooks({ token: token! })).filter(
        (w) => w.createdBySigner?.toLowerCase() === signer.toLowerCase(),
      ),
  });

  if (!token) {
    return (
      <Box title={license.label}>
        {license.redirectUri ? (
          <>
            <p className="text-body-sm text-muted">
              Generate a developer JWT for {license.label} to check its webhooks.
            </p>
            <GenerateDevJWT
              clientId={license.clientId}
              domain={license.redirectUri}
              onSuccess={() => setToken(getDevJwt(license.clientId))}
            />
          </>
        ) : (
          <p className="text-body-sm text-muted">
            Add a redirect URI to {license.label} to check its webhooks.
          </p>
        )}
      </Box>
    );
  }
  if (query.isLoading) {
    return (
      <Box title={license.label}>
        <Loader isLoading={true} />
      </Box>
    );
  }
  if (query.error) {
    return (
      <Box title={license.label}>
        <p className="text-body-sm text-negative">
          Couldn&apos;t load webhooks for {license.label}.
        </p>
      </Box>
    );
  }
  const theirs = query.data ?? [];
  if (!theirs.length) {
    return (
      <Box title={license.label}>
        <p className="text-body-sm text-muted">
          No webhooks on {license.label} were created by this member.
        </p>
      </Box>
    );
  }
  const chosen = selected ?? theirs.map((w) => w.id);
  const remove = async () => {
    setDeleting(true);
    const results = await Promise.allSettled(
      chosen.map((webhookId) => deleteWebhook({ webhookId, token: token as string })),
    );
    setDeleting(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) {
      toast.error(
        failed === 1
          ? "1 webhook couldn't be deleted."
          : `${failed} webhooks couldn't be deleted.`,
      );
    } else {
      toast.success(
        `Deleted ${chosen.length} webhook${chosen.length === 1 ? '' : 's'} on ${license.label}.`,
      );
    }
    setSelected(null);
    void query.refetch();
  };
  return (
    <Box title={license.label}>
      <ul className="flex flex-col gap-2">
        {theirs.map((webhook) => (
          <li key={webhook.id} className="flex items-center gap-3">
            <CheckboxField
              id={`webhook-${webhook.id}`}
              checked={chosen.includes(webhook.id)}
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? [...chosen, webhook.id]
                    : chosen.filter((id) => id !== webhook.id),
                )
              }
            />
            <label htmlFor={`webhook-${webhook.id}`} className="flex min-w-0 flex-col">
              <span className="truncate text-body-sm text-fg">
                {webhook.displayName || webhook.description || webhook.metricName}
              </span>
              <span className="break-all text-label text-muted">{webhook.targetURL}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        variant="destructive"
        onClick={remove}
        loading={deleting}
        disabled={!chosen.length}
      >
        Delete selected
      </Button>
    </Box>
  );
};

// After a revoke or remove: webhooks the member created keep sending data until
// the owner deletes them (spec: Revocation → Console).
export const WebhookReview: FC<{
  licenses: TeamLicense[];
  signer: string;
  onDone: () => void;
}> = ({ licenses, signer, onDone }) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-1 pr-8">
      <Title component="h3" className="text-panel-title">
        Review their webhooks
      </Title>
      <p className="text-body-sm text-muted">
        Webhooks this member created keep sending data until you delete them.
      </p>
    </div>
    {licenses.map((license) => (
      <LicenseWebhooks key={license.tokenId} license={license} signer={signer} />
    ))}
    <div className="flex flex-col gap-2 pt-2">
      <Button variant="secondary" onClick={onDone}>
        Done
      </Button>
    </div>
  </div>
);
```

`src/app/settings/components/Team/RevokeAccessModal.tsx`:

```tsx
'use client';
import { type FC, useEffect, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { formatList } from '@/config/teamCopy';
import { useSetLicenseSigners } from '@/hooks/useTransactions';
import { licensesHeldBy, type TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { disableMemberKeys, removeMember } from './revokeFlow';
import { WebhookReview } from './WebhookReview';

export type RevokeTarget = { member: TeamMember; mode: 'revoke' | 'remove' } | null;

interface Props {
  target: RevokeTarget;
  licenses: TeamLicense[];
  teamName: string;
  onClose: () => void;
  onDone: () => void;
}

const labels = (licenses: TeamLicense[]) => formatList(licenses.map((l) => l.label));
const EXPIRY_NOTE = 'Vehicle tokens they already hold expire within 10 minutes.';

export const RevokeAccessModal: FC<Props> = ({
  target,
  licenses,
  teamName,
  onClose,
  onDone,
}) => {
  const setSigners = useSetLicenseSigners();
  const member = target?.member ?? null;
  const held = useMemo(
    () => licensesHeldBy(licenses, member?.signerAddress),
    [licenses, member],
  );
  const [step, setStep] = useState<'confirm' | 'webhooks'>('confirm');
  const [selected, setSelected] = useState<number[]>([]);
  const [scope, setScope] = useState<TeamLicense[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStep('confirm');
    setSelected(held.map((l) => l.tokenId));
    // Reset only when a new member or mode is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target || !member) return null;
  const name = member.name ?? member.email;

  const confirm = async () => {
    setBusy(true);
    let affected: TeamLicense[];
    if (target.mode === 'revoke') {
      affected = held.filter((l) => selected.includes(l.tokenId));
      try {
        await disableMemberKeys({
          licenses: affected,
          signer: member.signerAddress!,
          setSigners,
        });
      } catch (error) {
        Sentry.captureException(error);
        toast.error('The transaction failed, so access was not revoked.');
        setBusy(false);
        return;
      }
      toast.success(`${name} no longer has data access to ${labels(affected)}.`);
    } else {
      affected = held;
      const { removed, stillSigner } = await removeMember({
        member,
        licenses,
        setSigners,
      });
      if (!removed) {
        toast.error(`Couldn't remove ${name}. Try again.`);
        setBusy(false);
        return;
      }
      if (stillSigner.length) {
        toast.error(
          `${name} was removed but is still a signer on ${labels(stillSigner)}. Retry from the member list.`,
        );
      } else {
        toast.success(`${name} was removed from ${teamName}.`);
      }
    }
    setBusy(false);
    onDone();
    if (member.signerAddress && affected.length) {
      setScope(affected);
      setStep('webhooks');
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={!!target} setIsOpen={(open) => !open && onClose()}>
      {step === 'webhooks' ? (
        <WebhookReview licenses={scope} signer={member.signerAddress!} onDone={onClose} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 pr-8">
            <Title component="h3" className="text-panel-title">
              {target.mode === 'revoke' ? 'Revoke data access' : `Remove ${name}?`}
            </Title>
            <p className="text-body-sm text-muted">
              {target.mode === 'revoke'
                ? `${name}'s wallet stops being a signer on the licenses you pick. ${EXPIRY_NOTE}`
                : held.length
                  ? `${name} loses access to ${teamName}, and their wallet stops being a signer on ${labels(held)}. ${EXPIRY_NOTE}`
                  : `${name} loses access to ${teamName}.`}
            </p>
          </div>
          {target.mode === 'revoke' && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label text-muted">Licenses</legend>
              {held.map((license) => (
                <div key={license.tokenId} className="flex items-center gap-3">
                  <CheckboxField
                    id={`revoke-${license.tokenId}`}
                    checked={selected.includes(license.tokenId)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, license.tokenId]
                          : current.filter((id) => id !== license.tokenId),
                      )
                    }
                  />
                  <label
                    htmlFor={`revoke-${license.tokenId}`}
                    className="text-body-sm text-fg"
                  >
                    {license.label}
                  </label>
                </div>
              ))}
            </fieldset>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="destructive"
              onClick={confirm}
              loading={busy}
              disabled={target.mode === 'revoke' && !selected.length}
            >
              {target.mode === 'revoke' ? 'Revoke access' : 'Remove'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
```

`src/app/settings/components/Team/MemberActions.tsx`: add revoke, remove and retry.

- Add `import { licensesHeldBy } from '@/hooks/useTeamLicenses';`.
- Add `onRevoke: (member: TeamMember, mode: 'revoke' | 'remove') => void;` to `Props` and destructure it.
- Replace everything after the `PENDING` block with:

```tsx
if (member.role === 'OWNER') return null;
const held = licensesHeldBy(licenses, member.signerAddress);
if (member.status === 'REVOKED') {
  return (
    <Button variant="secondary" onClick={() => onRevoke(member, 'remove')}>
      Retry
    </Button>
  );
}
const signer = member.signerAddress?.toLowerCase();
const canGrant =
  dataAccessEnabled && !!signer && licenses.some((l) => !l.signers.includes(signer));
return (
  <>
    {canGrant && (
      <Button variant="secondary" onClick={() => onGrant(member)}>
        Grant
      </Button>
    )}
    {held.length > 0 && (
      <Button variant="ghost" onClick={() => onRevoke(member, 'revoke')}>
        Revoke
      </Button>
    )}
    <Button variant="destructive-ghost" onClick={() => onRevoke(member, 'remove')}>
      Remove
    </Button>
  </>
);
```

`src/app/settings/components/Team/TeamSection.tsx`:

- Add `import { RevokeAccessModal, type RevokeTarget } from './RevokeAccessModal';`.
- Add `const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);`.
- Pass `onRevoke={(member, mode) => setRevokeTarget({ member, mode })}` to `MemberActions`.
- Add, beside `GrantAccessModal`:

```tsx
<RevokeAccessModal
  target={revokeTarget}
  licenses={licenses}
  teamName={activeTeam.name}
  onClose={() => setRevokeTarget(null)}
  onDone={refreshAll}
/>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/pages/settings && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/types/webhook.ts src/app/settings/components/Team __tests__/unit/pages/settings
git commit -m "feat(teams): revoke and remove members in one transaction and review their webhooks"
```

---

### Task 14: License → API keys: "Belongs to" and the key registry

**Files:**

- Create: `src/hooks/useLicenseSignerRegistry.ts`
- Create, in `src/app/license/[tokenId]/details/components/Signers/`: `registryRows.ts`, `keyRegistry.ts`, `BelongsTo.tsx`, `KeyHoldersModal.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx`
- Test, in `__tests__/unit/pages/license/details/signers/`: `registryRows.test.ts`, `keyRegistry.test.ts`, `BelongsTo.test.tsx`, `KeyHoldersModal.test.tsx`

**Interfaces:**

- Consumes:
  - `listLicenseSigners`, `upsertLicenseSigner`, `markLicenseSignerDisabled` (Task 2);
  - `writeWithRetry` (Task 12);
  - `useTeamMembers` (Task 11);
  - `useUser` (`src/hooks/useUser.ts`, the console-api user with `id`).
- Produces:
  - `useLicenseSignerRegistry(tokenId): { records: LicenseSignerRecord[]; isLoading; error; refetch }`, with query key `['license-signers', teamId, tokenId]`.
  - `KeyRow = { address: string; enabledAt: string | null; record: LicenseSignerRecord | null; onChain: boolean }` and `buildKeyRows(onChain, records): KeyRow[]`.
  - `RENTAL_OS_NOTE`, `CONSOLE_KEY_NOTE`, `recordKey`, `recordRentalOsKey`, `recordConsoleKey`, `stampDisabledKey`, `isRentalOsRecord`.
  - `HolderSelection = { userIds: string[]; names: string[]; note: string }`, `EMPTY_SELECTION` and `toHolderInput(selection)`.
  - `<KeyHoldersModal …/>` and `<BelongsTo row canAssign onAssign />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/pages/license/details/signers/registryRows.test.ts`:

```ts
import { buildKeyRows } from '@/app/license/[tokenId]/details/components/Signers/registryRows';
import type { LicenseSignerRecord } from '@/types/team';

const record = (
  signerAddress: string,
  over: Partial<LicenseSignerRecord> = {},
): LicenseSignerRecord => ({
  signerAddress: signerAddress as `0x${string}`,
  kind: 'API_KEY',
  note: null,
  holders: [{ userId: null, name: 'Prod backend', email: null }],
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-harness',
  disabledAt: null,
  disabledBy: null,
  ...over,
});

describe('buildKeyRows', () => {
  const onChain = [
    {
      address: '0x5B2E4f6A8c0D2e4F6a8C0d2E4f6A8c0D2e4F6a8C',
      enabledAt: '2026-03-02T15:04:05Z',
    },
    {
      address: '0x6be2d4f6a8c0e2a4c6e8a0c2e4a6c8e0a2c4e6a8',
      enabledAt: '2026-03-03T15:04:05Z',
    },
  ];

  it('pairs on-chain signers with registry rows whatever the case, and leaves the rest unassigned', () => {
    const rows = buildKeyRows(onChain, [
      record('0x5b2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c'),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].record?.holders[0].name).toBe('Prod backend');
    expect(rows[0].onChain).toBe(true);
    expect(rows[1].record).toBeNull();
  });

  it('adds registry rows whose signer is gone on-chain, unless the console disabled them', () => {
    const rows = buildKeyRows(onChain, [
      record('0x7cf3e5a7b9d1f3b5d7f9b1d3f5b7d9f1b3d5f7b9'),
      record('0x8d04f6b8cae2a4c6e8a0c2e4a6c8e0a2c4e6a8ca', {
        disabledAt: '2026-09-02T00:00:00Z',
      }),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[2]).toMatchObject({ onChain: false, enabledAt: null });
    expect(rows[2].address.toLowerCase()).toBe(
      '0x7cf3e5a7b9d1f3b5d7f9b1d3f5b7d9f1b3d5f7b9',
    );
  });
});
```

`__tests__/unit/pages/license/details/signers/keyRegistry.test.ts`:

```ts
jest.mock('@/actions/teams', () => ({
  upsertLicenseSigner: jest.fn(),
  markLicenseSignerDisabled: jest.fn(),
}));
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import {
  isRentalOsRecord,
  recordConsoleKey,
  recordRentalOsKey,
  stampDisabledKey,
} from '@/app/license/[tokenId]/details/components/Signers/keyRegistry';

describe('keyRegistry', () => {
  beforeEach(() => {
    (upsertLicenseSigner as jest.Mock)
      .mockReset()
      .mockResolvedValue({ ok: true, data: {} });
    (markLicenseSignerDisabled as jest.Mock)
      .mockReset()
      .mockResolvedValue({ ok: true, data: {} });
  });

  it('records the RentalOS key in the registry instead of localStorage', async () => {
    await recordRentalOsKey(42, '0xAbC');
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, '0xAbC', {
      kind: 'API_KEY',
      note: 'RentalOS',
      holders: [{ name: 'RentalOS' }],
    });
    expect(isRentalOsRecord({ note: 'RentalOS' } as never)).toBe(true);
    expect(isRentalOsRecord(null)).toBe(false);
  });

  it("records the owner's console key as theirs", async () => {
    await recordConsoleKey(42, '0xAbC', 'user-harness');
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, '0xAbC', {
      kind: 'API_KEY',
      note: 'Developer Console key',
      holders: [{ userId: 'user-harness' }],
    });
  });

  it('stamps a disabled key, retrying once', async () => {
    (markLicenseSignerDisabled as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 502, code: null, message: 'x' })
      .mockResolvedValueOnce({ ok: true, data: {} });
    await expect(stampDisabledKey(42, '0xAbC')).resolves.toMatchObject({ ok: true });
    expect(markLicenseSignerDisabled).toHaveBeenCalledTimes(2);
  });
});
```

`__tests__/unit/pages/license/details/signers/BelongsTo.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BelongsTo } from '@/app/license/[tokenId]/details/components/Signers/BelongsTo';

const base = { address: '0xabc', enabledAt: '2026-03-02T15:04:05Z', onChain: true };
const record = (over: object) => ({
  signerAddress: '0xabc',
  kind: 'API_KEY',
  note: null,
  holders: [],
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: null,
  disabledAt: null,
  disabledBy: null,
  ...over,
});

describe('BelongsTo', () => {
  it("shows a member's name and email", () => {
    render(
      <BelongsTo
        row={
          {
            ...base,
            record: record({
              kind: 'MEMBER',
              holders: [{ userId: 'u', name: 'Sam Rivera', email: 'sam@harness.dev' }],
            }),
          } as never
        }
        canAssign
        onAssign={jest.fn()}
      />,
    );
    expect(screen.getByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText('sam@harness.dev')).toBeInTheDocument();
  });

  it('lists several holders and the note', () => {
    render(
      <BelongsTo
        row={
          {
            ...base,
            record: record({
              holders: [
                { userId: 'u1', name: 'Sam Rivera', email: 'sam@harness.dev' },
                { userId: null, name: 'Prod backend', email: null },
              ],
              note: 'Billing service',
            }),
          } as never
        }
        canAssign
        onAssign={jest.fn()}
      />,
    );
    expect(screen.getByText('Sam Rivera, Prod backend')).toBeInTheDocument();
    expect(screen.getByText('Billing service')).toBeInTheDocument();
  });

  it('offers Assign to the owner for an unassigned key only', () => {
    const onAssign = jest.fn();
    const { rerender } = render(
      <BelongsTo row={{ ...base, record: null }} canAssign onAssign={onAssign} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(onAssign).toHaveBeenCalledWith('0xabc');
    rerender(
      <BelongsTo row={{ ...base, record: null }} canAssign={false} onAssign={onAssign} />,
    );
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });

  it('marks a key the console never disabled but the chain no longer has', () => {
    render(
      <BelongsTo
        row={
          {
            ...base,
            onChain: false,
            enabledAt: null,
            record: record({
              holders: [{ userId: null, name: 'Old backend', email: null }],
            }),
          } as never
        }
        canAssign
        onAssign={jest.fn()}
      />,
    );
    expect(screen.getByText('Disabled outside the console')).toBeInTheDocument();
  });
});
```

`__tests__/unit/pages/license/details/signers/KeyHoldersModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  KeyHoldersModal,
  toHolderInput,
} from '@/app/license/[tokenId]/details/components/Signers/KeyHoldersModal';
import type { TeamMember } from '@/types/team';

const SAM: TeamMember = {
  id: 'm1',
  userId: 'user-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null,
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};

describe('KeyHoldersModal', () => {
  it('builds holders from members, free-text names (even unsubmitted) and the note', async () => {
    const onSubmit = jest.fn();
    render(
      <KeyHoldersModal
        isOpen
        setIsOpen={jest.fn()}
        members={[SAM]}
        description="d"
        confirmLabel="Generate key"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Sam Rivera/));
    fireEvent.change(screen.getByLabelText('People or services without an account'), {
      target: { value: 'Prod backend' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText('People or services without an account'), {
      target: { value: 'Ops laptop' },
    });
    fireEvent.change(screen.getByLabelText('Note (optional)'), {
      target: { value: ' billing ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate key' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const selection = onSubmit.mock.calls[0][0];
    expect(toHolderInput(selection)).toEqual({
      holders: [{ userId: 'user-sam' }, { name: 'Prod backend' }, { name: 'Ops laptop' }],
      note: 'billing',
    });
  });

  it('needs at least one holder', () => {
    const onSubmit = jest.fn();
    render(
      <KeyHoldersModal
        isOpen
        setIsOpen={jest.fn()}
        members={[]}
        description="d"
        confirmLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      screen.getByText('Pick at least one person or add a name.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/pages/license/details/signers`
Expected: FAIL. The modules are missing.

- [ ] **Step 3: Implement the registry pieces**

`src/hooks/useLicenseSignerRegistry.ts`:

```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { listLicenseSigners } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';

export const licenseSignersKey = (teamId: string | null | undefined, tokenId: number) =>
  ['license-signers', teamId ?? null, tokenId] as const;

// Who each key of a team license is for (console-api key registry). Errors for
// a license outside the active team (403 LICENSE_NOT_IN_TEAM); callers hide the
// column then rather than calling every key "Unassigned".
export const useLicenseSignerRegistry = (tokenId: number) => {
  const { activeTeam } = useTeam();
  const query = useQuery({
    queryKey: licenseSignersKey(activeTeam?.id, tokenId),
    enabled: !!activeTeam,
    queryFn: async () => {
      const result = await listLicenseSigners(tokenId);
      if (!result.ok) throw new Error(result.code ?? result.message);
      return result.data.signers;
    },
  });
  return {
    records: query.data ?? [],
    isLoading: query.isLoading || !activeTeam,
    error: query.error,
    refetch: query.refetch,
  };
};
```

`src/app/license/[tokenId]/details/components/Signers/registryRows.ts`:

```ts
import type { LicenseSignerRecord } from '@/types/team';

export interface KeyRow {
  address: string;
  enabledAt: string | null;
  record: LicenseSignerRecord | null;
  onChain: boolean;
}

// The chain decides whether a key works; the registry says who it is for. A
// row the registry has but the chain does not (and the console never disabled)
// is shown as disabled outside the console.
export const buildKeyRows = (
  onChain: { address: string; enabledAt: string }[],
  records: LicenseSignerRecord[],
): KeyRow[] => {
  const byAddress = new Map(records.map((r) => [r.signerAddress.toLowerCase(), r]));
  const rows: KeyRow[] = onChain.map((signer) => ({
    address: signer.address,
    enabledAt: signer.enabledAt,
    record: byAddress.get(signer.address.toLowerCase()) ?? null,
    onChain: true,
  }));
  const live = new Set(onChain.map((s) => s.address.toLowerCase()));
  for (const record of records) {
    if (!live.has(record.signerAddress.toLowerCase()) && !record.disabledAt) {
      rows.push({
        address: record.signerAddress,
        enabledAt: null,
        record,
        onChain: false,
      });
    }
  }
  return rows;
};
```

`src/app/license/[tokenId]/details/components/Signers/keyRegistry.ts`:

```ts
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { writeWithRetry } from '@/utils/registryWrite';
import type { LicenseSignerInput, LicenseSignerRecord } from '@/types/team';

export const RENTAL_OS_NOTE = 'RentalOS';
export const CONSOLE_KEY_NOTE = 'Developer Console key';

export const recordKey = (tokenId: number, address: string, input: LicenseSignerInput) =>
  writeWithRetry(() => upsertLicenseSigner(tokenId, address, input));

export const recordRentalOsKey = (tokenId: number, address: string) =>
  recordKey(tokenId, address, {
    kind: 'API_KEY',
    note: RENTAL_OS_NOTE,
    holders: [{ name: 'RentalOS' }],
  });

// The key the console enables for the owner's own Developer JWTs.
export const recordConsoleKey = (tokenId: number, address: string, userId: string) =>
  recordKey(tokenId, address, {
    kind: 'API_KEY',
    note: CONSOLE_KEY_NOTE,
    holders: [{ userId }],
  });

export const stampDisabledKey = (tokenId: number, address: string) =>
  writeWithRetry(() => markLicenseSignerDisabled(tokenId, address));

export const isRentalOsRecord = (record: LicenseSignerRecord | null) =>
  record?.note === RENTAL_OS_NOTE;
```

`src/app/license/[tokenId]/details/components/Signers/BelongsTo.tsx`:

```tsx
'use client';
import type { FC } from 'react';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/StatusChip';
import type { KeyRow } from './registryRows';

export const BelongsTo: FC<{
  row: KeyRow;
  canAssign: boolean;
  onAssign: (address: string) => void;
}> = ({ row, canAssign, onAssign }) => {
  const { record } = row;
  if (!record) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted">Unassigned</span>
        {canAssign && (
          <Button variant="ghost" onClick={() => onAssign(row.address)}>
            Assign
          </Button>
        )}
      </div>
    );
  }
  const people = record.holders.map((h) => h.name ?? h.email ?? 'Unknown').join(', ');
  const member = record.kind === 'MEMBER' ? record.holders[0] : null;
  return (
    <div className="flex flex-col items-start gap-1">
      {!row.onChain && <StatusChip tone="off">Disabled outside the console</StatusChip>}
      <span className="break-normal text-body-sm text-fg">{people}</span>
      {member?.name && member.email && (
        <span className="break-all text-label text-muted">{member.email}</span>
      )}
      {record.note && (
        <span className="break-normal text-label text-muted">{record.note}</span>
      )}
    </div>
  );
};
```

`src/app/license/[tokenId]/details/components/Signers/KeyHoldersModal.tsx`:

```tsx
'use client';
import { type FC, useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import type { HolderInput, TeamMember } from '@/types/team';

export interface HolderSelection {
  userIds: string[];
  names: string[];
  note: string;
}

export const EMPTY_SELECTION: HolderSelection = { userIds: [], names: [], note: '' };

export const toHolderInput = (selection: HolderSelection) => ({
  holders: [
    ...selection.userIds.map((userId) => ({ userId })),
    ...selection.names.map((name) => ({ name })),
  ] as HolderInput[],
  note: selection.note.trim() || null,
});

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  members: TeamMember[];
  initial?: HolderSelection;
  description: string;
  confirmLabel: string;
  onSubmit: (selection: HolderSelection) => Promise<void> | void;
}

// "Who is this key for?": team members, free-text people or services, a note.
export const KeyHoldersModal: FC<Props> = ({
  isOpen,
  setIsOpen,
  members,
  initial,
  description,
  confirmLabel,
  onSubmit,
}) => {
  const [selection, setSelection] = useState<HolderSelection>(initial ?? EMPTY_SELECTION);
  const [pendingName, setPendingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelection(initial ?? EMPTY_SELECTION);
    setPendingName('');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const people = members.filter((m) => m.status === 'ACCEPTED' && m.userId);

  const toggle = (userId: string) =>
    setSelection((current) => ({
      ...current,
      userIds: current.userIds.includes(userId)
        ? current.userIds.filter((id) => id !== userId)
        : [...current.userIds, userId],
    }));

  const withName = (current: HolderSelection, raw: string): HolderSelection => {
    const name = raw.trim();
    if (!name || current.names.includes(name)) return current;
    return { ...current, names: [...current.names, name] };
  };

  const addName = () => {
    setSelection((current) => withName(current, pendingName));
    setPendingName('');
  };

  const submit = async () => {
    // A name typed but not added yet still counts.
    const final = withName(selection, pendingName);
    if (!final.userIds.length && !final.names.length) {
      setError('Pick at least one person or add a name.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(final);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pr-8">
          <Title component="h3" className="text-panel-title">
            Who is this key for?
          </Title>
          <p className="text-body-sm text-muted">{description}</p>
        </div>
        {people.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label text-muted">Team members</legend>
            {people.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <CheckboxField
                  id={`holder-${member.userId}`}
                  checked={selection.userIds.includes(member.userId!)}
                  onChange={() => toggle(member.userId!)}
                />
                <label
                  htmlFor={`holder-${member.userId}`}
                  className="flex min-w-0 flex-col"
                >
                  <span className="text-body-sm text-fg">
                    {member.name ?? member.email}
                  </span>
                  {member.name && (
                    <span className="text-label text-muted">{member.email}</span>
                  )}
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <Label htmlFor="holder-name">
          People or services without an account
          <div className="flex gap-2">
            <TextField
              id="holder-name"
              value={pendingName}
              placeholder="e.g. Prod backend"
              wrapperClassName="flex-1"
              onChange={(event) => setPendingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addName();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addName}>
              Add
            </Button>
          </div>
        </Label>
        {selection.names.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {selection.names.map((name) => (
              <li
                key={name}
                className="flex items-center gap-1 rounded-chip bg-control px-2 py-0.5 text-label text-fg"
              >
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  className="text-muted hover:text-ink"
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      names: current.names.filter((n) => n !== name),
                    }))
                  }
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Label htmlFor="holder-note">
          Note (optional)
          <TextField
            id="holder-note"
            value={selection.note}
            placeholder="What the key is used for"
            onChange={(event) => {
              const note = event.target.value;
              setSelection((current) => ({ ...current, note }));
            }}
          />
        </Label>
        {error && <TextError errorMessage={error} />}
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={submit} loading={busy}>
            {confirmLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/pages/license/details/signers`
Expected: PASS.

- [ ] **Step 5: Wire the registry into `Signers.tsx`**

Make these edits in `src/app/license/[tokenId]/details/components/Signers/Signers.tsx`:

1. **Imports.**
   - Add:

     ```tsx
     import { toast } from 'sonner';
     import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
     import { useTeamMembers } from '@/hooks/useTeamMembers';
     import { useUser } from '@/hooks/useUser';
     import type { SignerKind } from '@/types/team';
     import { BelongsTo } from './BelongsTo';
     import { buildKeyRows, type KeyRow } from './registryRows';
     import {
       KeyHoldersModal,
       type HolderSelection,
       toHolderInput,
     } from './KeyHoldersModal';
     import {
       isRentalOsRecord,
       recordConsoleKey,
       recordKey,
       recordRentalOsKey,
       stampDisabledKey,
     } from './keyRegistry';
     ```

   - Delete `import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';`.

2. **Delete the RentalOS `localStorage` helpers.** Remove `rentalOSSignerKey`, `getRentalOSSigner` and `saveRentalOSSigner`, plus the `rentalOSSigner` state and every `setRentalOSSigner(...)` call.
3. **State.** After the existing `useState` hooks, add:

   ```tsx
   type HoldersTarget =
     | { mode: 'generate' }
     | { mode: 'assign'; address: string; kind: SignerKind; initial?: HolderSelection };
   const [holdersFor, setHoldersFor] = useState<HoldersTarget | null>(null);
   const {
     records,
     isLoading: registryLoading,
     error: registryError,
     refetch: refetchRegistry,
   } = useLicenseSignerRegistry(fragment.tokenId);
   const { members } = useTeamMembers();
   const { data: me } = useUser();
   ```

4. **`handleGenerateSigner`.** Replace its header and its success path so it takes the holder selection and records the key:

   ```tsx
   const handleGenerateSigner = async (selection: HolderSelection) => {
     try {
       setLoadingStatus({
         status: 'loading',
         label: 'Generating an API key for your developer license',
       });
       const account = generateWallet();
       await handleEnableSigner(account.address);
       const recorded = await recordKey(fragment.tokenId, account.address, {
         kind: 'API_KEY',
         ...toHolderInput(selection),
       });
       clearLoadingStatus();
       if (!recorded.ok) {
         toast.error("The key works, but who it's for couldn't be saved.", {
           action: {
             label: 'Assign',
             onClick: () =>
               setHoldersFor({
                 mode: 'assign',
                 address: account.address,
                 kind: 'API_KEY',
                 initial: selection,
               }),
           },
         });
       }
       void refetchRegistry();
       setApiKey(account.privateKey);
       setOptimisticAdditions((prev) => [
         ...prev,
         { address: account.address, enabledAt: new Date().toISOString() },
       ]);
       refetch().then(() => setOptimisticAdditions([]));
       trackEvent('API Key Generated', {
         distinct_id: fragment.owner,
         tokenId: fragment.tokenId,
         signerAddress: account.address,
       });
     } catch (error: unknown) {
       handleError(error);
     }
   };
   ```

5. **RentalOS success.** In `handleGenerateRentalOSTenant`, replace

   ```tsx
   saveRentalOSSigner(fragment.clientId, account.address);
   setRentalOSSigner(account.address.toLowerCase());
   ```

   with

   ```tsx
   await recordRentalOsKey(fragment.tokenId, account.address);
   void refetchRegistry();
   ```

6. **`handleDelete`.** Directly after `await handleDisableSigner(signer);`, add:

   ```tsx
   await stampDisabledKey(fragment.tokenId, signer);
   void refetchRegistry();
   ```

7. **`handleOwnerSigner`.** Directly after `publishEvent({ client_id: privateKeyAddress! }, true);`, add the console-key record:

   ```tsx
   const known = records.some(
     (r) => r.signerAddress.toLowerCase() === privateKeyAddress!.toLowerCase(),
   );
   if (!registryError && !known && me?.id) {
     await recordConsoleKey(fragment.tokenId, privateKeyAddress!, me.id);
     void refetchRegistry();
   }
   ```

   Then make the effect wait for the registry:

   ```tsx
   useEffect(() => {
     if (!currentUser || !isLicenseOwner || registryLoading) return;
     void handleOwnerSigner();
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentUser, isLicenseOwner, registryLoading]);
   ```

8. **Generate key button.** Change its `onClick={handleGenerateSigner}` to `onClick={() => setHoldersFor({ mode: 'generate' })}`.
9. **Rows.**
   - Replace `renderDeleteSignerAction`'s first line with `const renderDeleteSignerAction = (item: KeyRow, index: number) => {` and its condition with `if (isLicenseOwner && item.onChain) {`.
   - After `displaySigners`, add:

     ```tsx
     const rows = buildKeyRows(displaySigners, registryError ? [] : records);
     ```

   - In the `<Table>`:
     - set `data={rows}`;
     - in the address column `render`, use `(item: KeyRow)` and show the RentalOS chip when `isRentalOsRecord(item.record)` instead of comparing with `rentalOSSigner`;
     - insert a column after the address column, only when `!registryError`:

       ```tsx
                     ...(registryError
                       ? []
                       : [
                           {
                             name: 'belongsTo',
                             label: 'Belongs to',
                             className: 'pr-4',
                             render: (item: KeyRow) => (
                               <BelongsTo
                                 row={item}
                                 canAssign={isLicenseOwner}
                                 onAssign={(address) =>
                                   setHoldersFor({ mode: 'assign', address, kind: 'EXTERNAL' })
                                 }
                               />
                             ),
                           },
                         ]),
       ```

   - Change `renderEnabledAt` to `(item: KeyRow) => (item.enabledAt ? new Date(item.enabledAt).toLocaleDateString() : '—')`.

10. **Modal.** Render it beside `APIKeyModal`:

    ```tsx
    <KeyHoldersModal
      isOpen={!!holdersFor}
      setIsOpen={(open) => !open && setHoldersFor(null)}
      members={members}
      initial={holdersFor?.mode === 'assign' ? holdersFor.initial : undefined}
      description={
        holdersFor?.mode === 'generate'
          ? 'Record who will hold the new key. Pick team members, or name a person or service.'
          : 'Record who holds this key.'
      }
      confirmLabel={holdersFor?.mode === 'generate' ? 'Generate key' : 'Save'}
      onSubmit={async (selection) => {
        const target = holdersFor;
        setHoldersFor(null);
        if (target?.mode === 'generate') {
          await handleGenerateSigner(selection);
          return;
        }
        if (target?.mode === 'assign') {
          const saved = await recordKey(fragment.tokenId, target.address, {
            kind: target.kind,
            ...toHolderInput(selection),
          });
          if (saved.ok) {
            toast.success('Saved who this key is for');
            void refetchRegistry();
          } else {
            toast.error(saved.message);
          }
        }
      }}
    />
    ```

- [ ] **Step 6: Type check, lint and run the license suites**

Run: `npx tsc --noEmit -p . 2>&1 | head -20 && npx eslint "src/app/license/[tokenId]/details/components/Signers" && npx jest __tests__/unit/pages/license`
Expected: no new type errors, no lint errors, and every license suite passes.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useLicenseSignerRegistry.ts "src/app/license/[tokenId]/details/components/Signers" __tests__/unit/pages/license/details/signers
git commit -m "feat(teams): API keys show who each key belongs to and record new, RentalOS and console keys"
```

---

### Task 15: Screenshot harness, `DESIGN.md` recipes and README

**Files:**

- Modify: `scripts/visual/fixtures.mjs`, `scripts/visual/mock-server.mjs`, `scripts/visual/shoot.mjs`, `scripts/visual/routes.mjs`, `scripts/visual/harness.env`, `scripts/visual/README.md`
- Modify: `docs/DESIGN.md`, `README.md`

**Interfaces:**

- Consumes: everything above.
- Produces:
  - New route options in `routes.mjs`:
    - `teams: 'single' | 'multi'` (default `'single'`, which leaves the existing shots unchanged);
    - `activeTeam: 'team-acme'` (sets the `active_team` cookie; Identity answers as the Acme team);
    - `memberAccess: boolean` (default `true`);
    - `noDevJwt: boolean`.
  - Mock endpoint `POST http://localhost:3001/__harness/scenario`.

- [ ] **Step 1: Fixtures**

In `scripts/visual/fixtures.mjs`, replace the `license` helper and `LICENSES`:

```js
const signerNode = (address) => ({
  __typename: 'Signer',
  address,
  enabledAt: '2026-03-02T15:04:05Z',
});
const license = (l, withUris, { owner = KERNEL, extraSigners = [] } = {}) => ({
  __typename: 'DeveloperLicense',
  alias: l.alias,
  tokenId: l.tokenId,
  clientId: l.clientId,
  owner,
  mintedAt: '2026-03-02T15:04:05Z',
  signers: {
    __typename: 'SignerConnection',
    totalCount: 1 + extraSigners.length,
    pageInfo: PAGE_INFO,
    nodes: [SIGNER, ...extraSigners].map(signerNode),
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
```

The fixture uses `SAM_EOA`, `EX_EOA` and `UNASSIGNED_SIGNER` below. Define the team constants block (next code block) **above** this point in the file, directly after `const NOW = …`, so the license helper can use them.

```js
const LICENSES = [
  license(LICENSE, true, { extraSigners: [SAM_EOA, EX_EOA, UNASSIGNED_SIGNER] }),
  license(LICENSE_2, false),
];
// The same licenses seen from the Acme team, where Jane is a member and the
// licenses belong to Acme's owner. memberAccess: her wallet signs for LICENSE.
const memberLicenses = (memberAccess) => [
  license(LICENSE, true, {
    owner: ACME_OWNER,
    extraSigners: memberAccess ? [WALLET] : [],
  }),
  license(LICENSE_2, false, { owner: ACME_OWNER }),
];
```

Add this block directly after `const NOW = '2026-09-20T14:30:00Z';`:

```js
// Console teams (contracts C7): Jane's own team, and Acme where she is a member.
export const ACME_OWNER = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a';
export const SAM_EOA = '0x5ad1c3e5f7a9b1d3f5a7c9e1b3d5f7a9c1e3b5d7';
export const DANA_EOA = '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d';
export const EX_EOA = '0x4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b';
export const UNASSIGNED_SIGNER = '0x6be2d4f6a8c0e2a4c6e8a0c2e4a6c8e0a2c4e6a8';
export const GONE_SIGNER = '0x7cf3e5a7b9d1f3b5d7f9b1d3f5b7d9f1b3d5f7b9';

// src/types/team.ts TeamSummary
export const TEAM_PERSONAL = {
  id: 'team-harness',
  name: 'Harness Motors',
  companyName: 'Harness Motors',
  role: 'OWNER',
  ownerUserId: 'user-harness',
  ownerEmail: USER_EMAIL,
  ownerAddress: KERNEL,
  isPersonal: true,
};
export const TEAM_ACME = {
  id: 'team-acme',
  name: 'Acme Mobility',
  companyName: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'user-acme',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: ACME_OWNER,
  isPersonal: false,
};

// src/types/team.ts TeamMember
const teamMember = (over) => ({
  userId: null,
  name: null,
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null,
  invitedAt: NOW,
  inviteExpiresAt: null,
  ...over,
});
export const TEAM_MEMBERS = [
  teamMember({
    id: 'm-jane',
    userId: 'user-harness',
    name: 'Jane Developer',
    email: USER_EMAIL,
    role: 'OWNER',
  }),
  teamMember({
    id: 'm-sam',
    userId: 'user-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    signerAddress: SAM_EOA,
  }),
  teamMember({
    id: 'm-dana',
    userId: 'user-dana',
    name: 'Dana Lee',
    email: 'dana@harness.dev',
    signerAddress: DANA_EOA,
  }),
  teamMember({
    id: 'm-lee',
    email: 'lee@harness.dev',
    status: 'PENDING',
    inviteExpiresAt: '2099-01-01T00:00:00Z',
  }),
  teamMember({
    id: 'm-kim',
    email: 'kim@harness.dev',
    status: 'PENDING',
    inviteExpiresAt: '2026-01-01T00:00:00Z',
  }),
  teamMember({
    id: 'm-alex',
    userId: 'user-alex',
    name: 'Alex Former',
    email: 'alex@harness.dev',
    status: 'REVOKED',
    signerAddress: EX_EOA,
  }),
];
export const ACME_MEMBERS = [
  teamMember({
    id: 'a-owner',
    userId: 'user-acme',
    name: 'Acme Ops',
    email: 'ops@acme.dev',
    role: 'OWNER',
  }),
  teamMember({
    id: 'a-jane',
    userId: 'user-harness',
    name: 'Jane Developer',
    email: USER_EMAIL,
    signerAddress: WALLET,
  }),
];

// src/types/team.ts LicenseSignerRecord, by license token id
const keyHolder = (userId, name, email) => ({ userId, name, email });
const keyRecord = (signerAddress, kind, holders, note = null) => ({
  signerAddress,
  kind,
  note,
  holders,
  createdAt: NOW,
  createdBy: 'user-harness',
  disabledAt: null,
  disabledBy: null,
});
export const licenseSigners = (tokenId) => ({
  signers:
    Number(tokenId) === LICENSE.tokenId
      ? [
          keyRecord(
            SIGNER,
            'API_KEY',
            [keyHolder('user-harness', 'Jane Developer', USER_EMAIL)],
            'Developer Console key',
          ),
          keyRecord(SAM_EOA, 'MEMBER', [
            keyHolder('user-sam', 'Sam Rivera', 'sam@harness.dev'),
          ]),
          keyRecord(EX_EOA, 'MEMBER', [
            keyHolder('user-alex', 'Alex Former', 'alex@harness.dev'),
          ]),
          keyRecord(
            GONE_SIGNER,
            'API_KEY',
            [
              keyHolder(null, 'Old backend', null),
              keyHolder('user-sam', 'Sam Rivera', 'sam@harness.dev'),
            ],
            'Retired billing service',
          ),
        ]
      : [],
});
```

Update `identityData` to accept the member options:

```js
export const identityData = (
  vars,
  { noLicenses = false, notShared = false, member = false, memberAccess = true } = {},
) => {
  const pool = member ? memberLicenses(memberAccess) : LICENSES;
  const licenses = noLicenses ? [] : pool;
  const byVars = pool.find(
    (l) =>
      String(l.tokenId) === String(vars.tokenId) ||
      (vars.clientId && l.clientId.toLowerCase() === String(vars.clientId).toLowerCase()),
  );
```

In its returned object, change `developerLicense: byVars ?? LICENSES[0],` to `developerLicense: byVars ?? pool[0],`.

- [ ] **Step 2: Mock server**

In `scripts/visual/mock-server.mjs`:

- add `let scenario = { teams: 'single' };` under `const keys = …`;
- add these entries to `routes`:

```js
  [
    'GET',
    /^\/api\/my\/teams$/,
    () => ({
      teams:
        scenario.teams === 'multi' ? [fx.TEAM_PERSONAL, fx.TEAM_ACME] : [fx.TEAM_PERSONAL],
    }),
  ],
  [
    'GET',
    /^\/api\/my\/team\/members$/,
    (m, url, req) => ({
      members: req.headers['x-team-id'] === fx.TEAM_ACME.id ? fx.ACME_MEMBERS : fx.TEAM_MEMBERS,
    }),
  ],
  ['GET', /^\/api\/my\/licenses\/(\d+)\/signers$/, (m) => fx.licenseSigners(m[1])],
  [
    'GET',
    /^\/api\/my\/license-access$/,
    () => ({
      access: 'OWNER',
      teamId: fx.TEAM_PERSONAL.id,
      signerAddress: null,
      userEmail: fx.USER_EMAIL,
    }),
  ],
  [
    'PUT',
    /^\/api\/me\/signer$/,
    () => ({ signerAddress: fx.WALLET, signerVerifiedAt: '2026-09-20T14:30:00Z' }),
  ],
```

In the request handler, before the `for (const [method, re, handler] of routes)` loop, add the scenario switch, and pass `req` to handlers:

```js
if (req.method === 'POST' && url.pathname === '/__harness/scenario') {
  scenario = { teams: 'single', ...((await readBody(req)) ?? {}) };
  return send(res, 200, scenario);
}
for (const [method, re, handler] of routes) {
  const m = url.pathname.match(re);
  if (m && req.method === method) return send(res, 200, handler(m, url, req));
}
```

- [ ] **Step 3: Shooter**

In `scripts/visual/shoot.mjs`, `prepare`:

```js
await context.route('https://identity-api.dev.dimo.zone/query', (r) =>
  identityHandler(r, {
    noLicenses: route.noLicenses,
    notShared: route.notShared,
    member: route.activeTeam === fx.TEAM_ACME.id,
    memberAccess: route.memberAccess !== false,
  }),
);
```

After the `session-token` cookie, add:

```js
if (route.activeTeam) {
  await context.addCookies([
    {
      name: 'active_team',
      value: route.activeTeam,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}
```

Change the second `addInitScript` so the signer is already registered, and the developer JWT can be left out:

```js
await context.addInitScript(
  ({ session, embedded, devJwtKey, devJwts, signerKey }) => {
    sessionStorage.setItem('globalAccount', JSON.stringify(session));
    sessionStorage.setItem(signerKey, 'true');
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
    devJwts: route.noDevJwt
      ? []
      : [{ token: keys.devJwt, createdAt: Date.parse('2026-09-20T14:30:00Z') }],
    // useSignerRegistration skips signing when this is set (no Turnkey mock needed).
    signerKey: `signerRegistered:${fx.WALLET.toLowerCase()}`,
  },
);
```

In the main loop, directly after `const file = path.join(…)`, set the mock's scenario for the route:

```js
await fetch('http://localhost:3001/__harness/scenario', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ teams: route.teams ?? 'single' }),
});
```

- [ ] **Step 4: Routes, env and the harness README**

Append to `ROUTES` in `scripts/visual/routes.mjs` (before the closing `]`):

```js
  // Console teams.
  {
    name: 'team-switcher',
    path: '/app',
    ready: 'Welcome',
    teams: 'multi',
    click: '[aria-label^="Team: "]',
    after: 'Acme Mobility',
    viewports: ['desktop'],
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    name: 'settings-team',
    path: '/settings',
    ready: 'sam@harness.dev',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-invite',
    path: '/settings',
    ready: 'sam@harness.dev',
    click: 'role=button[name="Invite member"]',
    after: 'Send invite',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    // The banner's Grant (Dana has a wallet but no access), one license picked.
    name: 'settings-team-grant',
    path: '/settings',
    ready: 'Dana Lee joined. Grant data access?',
    click: ['role=button[name="Grant"] >> nth=0', 'role=checkbox >> nth=0'],
    after: 'Data access lets',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-remove',
    path: '/settings',
    ready: 'sam@harness.dev',
    click: 'role=button[name="Remove"] >> nth=0',
    after: 'loses access',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-member',
    path: '/settings',
    ready: 'ops@acme.dev',
    teams: 'multi',
    activeTeam: 'team-acme',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'licenses-member',
    path: '/licenses',
    ready: 'Acme Mobility licenses',
    teams: 'multi',
    activeTeam: 'team-acme',
  },
  {
    name: 'license-details-config-assign',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: ['role=tab[name="Config"]', 'role=button[name="Assign"]'],
    after: 'Who is this key for?',
  },
  {
    name: 'license-details-config-member',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    teams: 'multi',
    activeTeam: 'team-acme',
    click: 'role=tab[name="Config"]',
    after: 'Belongs to',
  },
  {
    name: 'vehicles-member-connect',
    path: `/vehicles?license=${c}`,
    ready: 'Connect with your wallet',
    teams: 'multi',
    activeTeam: 'team-acme',
    noDevJwt: true,
  },
  {
    name: 'vehicles-member-no-access',
    path: `/vehicles?license=${c}`,
    ready: 'Ask ops@acme.dev for data access to Harness Fleet.',
    teams: 'multi',
    activeTeam: 'team-acme',
    memberAccess: false,
  },
  {
    name: 'webhooks-member',
    path: '/webhooks',
    ready: 'Webhooks are managed by the team owner',
    teams: 'multi',
    activeTeam: 'team-acme',
  },
```

In the comment block at the top of `routes.mjs`, document the new options:

```js
// teams: 'multi' makes /api/my/teams return Jane's team and Acme (switcher shown);
// activeTeam: 'team-acme' sets the active_team cookie and answers Identity as Acme,
// where Jane is a member; memberAccess: false removes her wallet from Acme's
// license signers; noDevJwt: no stored developer JWT for the harness license.
```

Append to `scripts/visual/harness.env`:

```
NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED=true
```

In `scripts/visual/README.md`, add a bullet under Groups:

```md
- Teams: the sidebar switcher (`team-switcher`), Settings → Team as owner (members,
  invite, grant with the C8 warning, remove) and as a member, member views of
  `/licenses`, the API keys "Belongs to" column and Assign, Vehicles for a member
  (connect with wallet, no access) and the owner-only Webhooks notice. The mock
  server's scenario is set per route through `POST /__harness/scenario`.
```

- [ ] **Step 5: DESIGN.md and README**

In `docs/DESIGN.md`, add a pattern after the **Vehicles** bullets:

```md
**Teams** (`src/components/TeamSwitcher`, `src/app/settings/components/Team/**`,
the API keys card in license details, `src/components/OwnerOnly`, `src/components/DataAccess`):

- **Team switcher** (sidebar, only with more than one team): a nav-item-shaped
  button, `rounded-control px-3 py-2 hover:bg-nav-hover`, holding a 28px initial tile
  (`rounded-chip bg-control text-label text-ink`), the team name `text-body-sm
font-medium text-ink` and the role `text-label text-muted`. Its menu is the select
  menu recipe (`rounded-control border border-outline bg-overlay p-1 shadow-float`,
  `role="listbox"`); the active team is a toggled control (`bg-selected-bg
text-selected-fg`). Collapsed: the tile only, with `title`.
- **Members table**: the shared `Table` inside the Team section card. State is a
  `StatusChip`: `pending` Invited, `off` Invite expired, `error` Removed; an
  accepted member has no chip ("Active", `text-muted`). Data access lists licenses
  as neutral chips (`rounded-chip bg-highest px-2 py-0.5 text-label text-muted`).
  Row actions are text buttons: `secondary` Grant / Retry, `ghost` Resend / Revoke,
  `destructive-ghost` Remove / Cancel invite.
- **Pending grant banner**: `rounded-control bg-control px-4 py-3` row inside the
  section card, `text-body-sm text-fg` sentence and a `secondary` Grant.
- **Grant warning**: the status tint, `rounded-card border border-warning/40
bg-warning/10 p-3`, `WarningAmberIcon` in `text-warning`, the C8 sentence in
  `text-body-sm text-fg`.
- **Belongs to** (API keys): holder names `text-body-sm text-fg`, member email
  and note `text-label text-muted`, "Unassigned" `text-muted` with a `ghost` Assign;
  a key the chain no longer has gets `<StatusChip tone="off">Disabled outside the
console</StatusChip>`. Free-text holders in the "Who is this key for?" modal are
  removable chips on the overlay (`rounded-chip bg-control text-label text-fg`).
- **Owner-only notice** and **member data-access notices**: section cards
  (`rounded-card bg-card p-6`, `text-card-title text-ink` title, `text-body-sm
text-muted` body); the C8 sentences are used verbatim.
```

In `docs/DESIGN.md` "Checking your work", add the new route names to the list of reference routes:

```md
the Teams routes (`team-switcher`, `settings-team`, `settings-team-invite`,
`settings-team-grant`, `settings-team-remove`, `settings-team-member`,
`licenses-member`, `license-details-config-assign`, `license-details-config-member`,
`vehicles-member-connect`, `vehicles-member-no-access`, `webhooks-member`; route
options `teams`, `activeTeam`, `memberAccess`, `noDevJwt`),
```

In `README.md`, in the `.env.local` block after `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED="true"`, add:

```bash

# Team data access is off unless this is "true" (read at build time). While off,
# owners can't grant members data access and members can't use Vehicles; invites,
# teams and the key registry still work. Turn it on only in an environment where
# dex emits signer_address and token-exchange-api checks isSigner.
NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED="true"
```

- [ ] **Step 6: Shoot the new states**

Terminal 1: `npm run visual:dev` (restart it if it was running; the mock reads the fixtures at startup).

Terminal 2:

```bash
npm run visual:shoot -- --label=teams --only='^(team-|settings|licenses|license-details-config|vehicles-member|webhooks-member)'
```

Expected:

- every route prints `ok` in both themes and both viewports;
- `scripts/visual/out/teams/errors.json` holds only the known hydration warnings for `/app` and `/settings`.

Open the PNGs and check:

- one primary per surface, with Invite member as the only primary in the Team card;
- no teal outside status;
- the Data access chips wrap at 390 px;
- the switcher menu sits above the nav.

- [ ] **Step 7: Commit**

```bash
git add scripts/visual docs/DESIGN.md README.md
git commit -m "chore(teams): harness states for teams, DESIGN.md recipes and the data-access flag in README"
```

---

### Task 16: Full verification and pull request

**Files:**

- None new. This is a verification and PR task.

**Interfaces:**

- Consumes: Tasks 1–15.
- Produces: an open PR from `console-teams` to `master`.

- [ ] **Step 1: Run the whole suite and compare against the baseline**

Run: `npx jest 2>&1 | tail -6`
Expected:

- the failing-suite count is no higher than the baseline recorded in Task 1, Step 1;
- every suite added by this plan passes.

List any suite that fails now but didn't before, and fix it before continuing.

- [ ] **Step 2: Static checks**

```bash
npm run lint
npm run lint:format
npx tsc --noEmit -p .
npm run check:template-types
npm run visual:check -- src/components/TeamSwitcher src/components/DataAccess src/components/OwnerOnly src/app/settings src/app/license src/app/licenses src/app/vehicles src/app/webhooks
```

Expected: every command exits 0. `lint:format` rewrites nothing; if it does, commit the rewrite as `style: prettier`.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exit 0, with `/settings`, `/webhooks` and `/vehicles` in the route table. `prebuild` runs lint and the template-type check again.

- [ ] **Step 4: Check the commit history**

Run: `git log --format='%h %s%n%b' origin/master..HEAD | grep -i "co-authored-by" ; echo "trailers checked"`
Expected: only `trailers checked`.

- [ ] **Step 5: Push and open the PR**

The verification lines are filled in from the commands' own output, not by hand.

```bash
git push -u origin console-teams
JEST_NOW=$(npx jest 2>&1 | grep -E '^Test Suites:')
JEST_BASE=$(grep -E '^Test Suites:' /tmp/console-teams-baseline.txt)
cat > /tmp/console-teams-pr.md <<'BODY'
## What

Console teams, part 3 (spec `docs/superpowers/specs/2026-10-01-console-teams-design.md`, contracts `docs/superpowers/plans/2026-10-02-console-teams.md`).

- Team context: `TeamProvider`, the `active_team` cookie and `X-Team-Id` on every console-api call; sidebar team switcher; invite links (`/sign-in?invite=`) kept in the `invite_token` cookie and accepted after sign-in or sign-up.
- Members see the team's licenses (Identity by the team owner's wallet); owner-only actions follow `useIsLicenseOwner`'s new team rule; Webhooks are owner-only.
- Settings → Team: members, invites (resend, cancel), grant data access in one `enableSigner` transaction, revoke and remove in one `disableSigner` transaction, review of the member's webhooks (`createdBySigner` from `GET /v1/webhooks`).
- Members read Vehicles with a developer JWT signed by their own Turnkey wallet (`useMemberDevJwt`, dex retries).
- Key registry: API keys show who each key belongs to; Generate asks first; RentalOS and the console key are recorded; Assign for unassigned keys.
- Data proxy: `GET /api/my/license-access` (60 s cache), member JWTs must carry their registered `signer_address`, one `data_proxy` audit line per request with the session email.
- Removed: the legacy collaborator UI, the sign-in collaborator bypass and `invitation_code`.

## Rollout

- Needs console-api part 2 (C7 endpoints) deployed first.
- `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` stays unset (off) until dex emits `signer_address` and token-exchange-api checks `isSigner` in that environment (part 1) and its live pass succeeds. Off: no Grant, members can't use Vehicles; teams and the key registry work.

## Verification

- Jest on this branch: @@JEST_NOW@@
- Jest on master before this branch: @@JEST_BASE@@ (failures that predate this branch)
- `npm run lint`, `npm run lint:format`, `tsc --noEmit`, `check:template-types`, `visual:check`, `npm run build`: clean.
- Screenshots: `scripts/visual/out/teams/` (team switcher, Settings → Team as owner and member, grant, remove, licenses as member, API keys Belongs to and Assign, Vehicles member states, Webhooks for members), dark and light, desktop and 390 px.
BODY
JEST_NOW="$JEST_NOW" JEST_BASE="$JEST_BASE" perl -pi -e 's/\@\@JEST_NOW\@\@/$ENV{JEST_NOW}/; s/\@\@JEST_BASE\@\@/$ENV{JEST_BASE}/' /tmp/console-teams-pr.md
grep -n "Jest" /tmp/console-teams-pr.md
gh pr create --base master --head console-teams --title "feat: console teams — members, per-person data access and a key registry" --body-file /tmp/console-teams-pr.md
```

Expected: `gh` prints the PR URL.
