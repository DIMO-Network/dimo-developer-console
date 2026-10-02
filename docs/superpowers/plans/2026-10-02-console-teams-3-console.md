# Console teams, part 3: dimo-developer-console implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a license owner invite teammates into a console team, show members the team's licenses, let a member use Vehicles through a developer JWT signed by their own Turnkey wallet, record who every license key is for, and roll it out for DIMO's own support team.

**Architecture:**
- **`TeamProvider`** sits inside `AuthorizedLayout`.
  - It loads the caller's teams from console-api (part 2) and keeps the active team in the `active_team` cookie, which `dimoDevAPIClient` sends as `X-Team-Id`.
  - It accepts a pending invite after a "Join {team} owned by {owner}?" confirmation, through server actions that read the HttpOnly `invite_token` cookie.
  - It notices a removal: on a `NOT_A_MEMBER` answer, a proxy refusal, or when the tab regains focus.
- **License lists** query Identity by the active team owner's wallet.
- **Owner-only UI** (webhooks, connections, configurator writes, simulator, renounce, quick actions) follows `useTeam().isOwner`.
- **On-chain changes:** `enableSigner`/`disableSigner` go out as batched user operations and are recorded in console-api's key registry. Removal covers every `MEMBER` key a member ever held (`memberKeys`).
- **Members' developer JWTs:** a member signs the dex challenge (`address = clientId`) with their Turnkey EOA. The JWT is stored per wallet.
- **Data proxy (`/api/data/*`):**
  - Owners skip console-api when Identity shows their wallet owns the license.
  - Members need console-api's `MEMBER` plus a matching `signer_address`.
  - It requests only the C9 privileges and logs one audit line per request, after token exchange.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Apollo Client (Identity), TanStack Query, Turnkey (`@turnkey/viem`), viem, ZeroDev kernel batching, Mixpanel, Jest + React Testing Library, Playwright screenshot harness.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md`.
**Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md`. Re-read it before each task. Rollout, C1, C3, C4, C5, C6, C7, C8 and C9 are used verbatim.

## Global Constraints

- Branch `console-teams` in `~/workspace/dimo-developer-console`. App Router only. Turnkey signing runs in the browser, and `@/services/turnkeyAccount` is imported lazily (`await import`) so modules that only *might* sign don't pull `src/config/turnkey.ts`, which needs Turnkey env, into every test.
- **Header and cookies (C4):**
  - Header `X-Team-Id`.
  - `active_team`: `Path=/; SameSite=Lax; Max-Age=31536000`, plus `Secure` on https.
  - `invite_token`: `HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`, plus `Secure` on https.
    - Set only by the middleware on `/sign-in?invite=`, which then strips `invite` from the URL.
    - Read and deleted only by server actions: on success, or on `INVITE_INVALID` / `INVITE_EXPIRED` / `INVITE_EMAIL_MISMATCH` / `ALREADY_MEMBER`. A network failure keeps it.
  - Sign-out deletes `active_team`, `invite_token` and every stored developer JWT.
- **Flag (C5):** `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED`, on only for the exact string `"true"`. When off:
  - Grant and the Data access column are hidden;
  - members don't see Vehicles, and opening it shows `Data access for team members isn't available yet.`;
  - invites, membership, leaving, the switcher and the key registry stay on.
- **JWT claim (C1):** `signer_address`, compared case-insensitively. The console data proxy refuses a member's developer JWT without it.
- **Webhook fields (C3):** `createdBySigner` and `updatedBySigner`, only on `GET /v1/webhooks` objects. A webhook goes into the removal review when either field matches any address the member used (`memberKeys` and their current wallet), case-insensitively.
- **Signer proof (C6):**
  - the exact message `DIMO Developer Console\nLink signer ${eoa} to account ${kernelAddress}\nIssued at ${issuedAt}`, with checksummed addresses and an ISO time, signed by the Turnkey EOA with EIP-191;
  - `409 SIGNER_LOCKED` shows the C8 copy;
  - `409 SIGNER_IN_USE` shows the C8 copy (`SIGNER_IN_USE_MESSAGE`, Task 6).
- **Endpoints (C7):** endpoints, error codes and wire types exactly as listed, with the types defined once in `src/types/team.ts`.
  - `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me` ignore `X-Team-Id`.
  - `license-access` answers `{ access, memberOfTeam, teamId, signerAddress, userEmail }`. `MEMBER` means the caller holds an enabled `MEMBER` key on that license under their current signer.
  - Registry upserts: `409 KIND_CONFLICT` also covers turning a `MEMBER` key into any other kind, and `409 SIGNER_IN_USE` refuses an `API_KEY` or `EXTERNAL` key at an address that is a user's verified `signerAddress`. The console never offers Assign on a team member's wallet (Task 16).
- **Copy (C8)**, verbatim:
  - Grant warning, with the DCX sentence.
  - `Ask {ownerEmail} for data access to {license}.`
  - `You no longer have access to this license.`
  - `Data access for team members isn't available yet.`
  - `You're no longer a member of {team name}.`
  - `Your access is tied to another wallet. Ask {ownerEmail} to revoke it first.`
  - `This wallet is already recorded as someone else's key, so it can't be used for data access. Contact DIMO support.` (`SIGNER_IN_USE` on registration)
  - `Leave {team name}? {ownerEmail} will be asked to revoke your data access.`
- **Proxy privileges (C9):** `GetNonLocationHistory`, `GetCurrentLocation`, `GetLocationHistory`, `GetRawData`, `GetApproximateLocation`, and only those the license holds. Never `ExecuteCommands`. Vehicles reads current and approximate coordinates, location history (trips) and raw events, so all five stay.
- **Error codes:**
  - `502 EMAIL_FAILED`: `We couldn't email {email}. Try again.`
  - `429 RATE_LIMITED`: console-api's message as given (C7 lists the four), or `Too many invites right now. Try again in a while.` when it has none.
  - invitation `403 NOT_A_MEMBER`: console-api's own message (`Finish setting up your team first`).
  - `NOT_A_MEMBER` anywhere else, in a team that isn't the user's own: `TeamProvider.reportRemoved()`.
  - `401 UNAUTHORIZED`, `INVALID_ADDRESS`, `INVALID_HOLDERS`, `SIGNER_MISMATCH`, `KIND_CONFLICT` and a registry `SIGNER_IN_USE`: console-api's message, never retried and never offered Try again.
  - A registry write that rejects or answers 5xx is retried once (`registryWrite`); if it still fails, the UI offers Try again (grant) or Assign (API keys).
- **User operations:** `useContractGA().processTransactions` resolves with `success: false`, without throwing, when a user operation reverts without a reason. Every signer change in this plan goes through `assertUserOperation` (Task 14), which throws on `!success`, so a revert is never treated as done.
- **Fleet design system** (`docs/DESIGN.md`) is locked:
  - token classes only, no hex, sentence case;
  - one `primary` per surface;
  - status via `StatusChip`, names via neutral chips;
  - `font-mono text-code` only for addresses and keys;
  - a table's action cell fits a 390 px phone (`DESIGN.md`, Table: hide low-priority columns, collapse row actions into a `⋯` menu);
  - `npm run visual:check` passes on touched paths.
- **Analytics:** Mixpanel via `useMixPanel().trackEvent` (as `Signers.tsx` does), with these event names:
  - `Team Invite Sent`, `Team Invite Resent`, `Team Invite Accepted`
  - `Team Switched`, `Team Left`, `Team Member Removed`
  - `Data Access Granted`, `Data Access Revoked`
  - `API Key Assigned`, `Wallet Connected`

  `identifyUser` keeps `$role`, set from the active team once teams load.
- **Commits:** no `Co-Authored-By` or other attribution lines. The pre-commit hook runs `npm run lint` (with `--fix`) and Prettier on staged files; let it. Tests therefore never rely on a `let` that only a later task reassigns (`--fix` turns it into `const`): mutable test state lives in a holder object. Plan files are in `.prettierignore`; never run Prettier on them.
- **Dependencies:** console-api part 2 must be deployed before this ships. Unit tests mock server actions and never call console-api.
- **Owners must not regress:**
  - If teams can't load, the console falls back to the personal team (owner wallet from the session) and says so.
  - The data proxy serves owners without console-api.

## Review Focus

1. **Owners during a console-api outage:** `/api/my/teams` failing must still show the owner their own licenses (fallback team plus toast), and the proxy must still serve their vehicles (Identity fast path; the middleware doesn't call `/api/me` for `/api/data/*`). Tests are in Tasks 4 and 12.
2. **A member removed while the tab is open:** a `NOT_A_MEMBER` answer from any team-scoped call, a proxy `NO_ACCESS` with `memberOfTeam: false`, or returning to the tab after removal all end in one `You're no longer a member of {team}.` and a reload into the personal team. Never for the user's own team. Tests are in Tasks 4 and 11.
3. **Mixed-case addresses everywhere:** Identity, Turnkey, console-api and vehicle-triggers-api return different cases, and every signer and owner comparison is case-insensitive. Tests are in Tasks 8, 10, 12, 15 and 16.
4. **A member whose wallet changed:** keys under an old wallet (`memberKeys`) are still revoked and their webhooks still reviewed, and the member's old developer JWT is never used. Tests are in Tasks 10 and 15.
5. **A registry write that rejects, rather than answering `ok: false`:** it never undoes an on-chain change, never hides a freshly generated API key, and offers Assign. Tests are in Tasks 14 and 16.

---

### Task 1: Team wire types, data-access flag, team cookies and shared copy

**Files:**

- Modify: `src/types/team.ts` (append; the old exports stay until Task 13)
- Modify: `src/utils/featureFlags.ts`
- Create: `src/utils/teamCookies.ts`, `src/config/teamCopy.ts`, `src/utils/teamApiError.ts`
- Test: `__tests__/unit/utils/teamCookies.test.ts`, `__tests__/unit/utils/featureFlags.test.ts`, `__tests__/unit/config/teamCopy.test.ts`, `__tests__/unit/utils/teamApiError.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - From `@/types/team`: `TeamRole`, `MembershipStatus` (now with `LEFT`), `TeamSummary`, `MemberKey`, `TeamMember` (with `memberKeys`), `SignerKind`, `LicenseSignerHolder`, `LicenseSignerRecord`, `HolderInput`, `LicenseSignerInput`, `LicenseAccess` (with `memberOfTeam` and `userEmail`), `InvitePreview`, `SignerProofInput`, `ApiResult<T>`.
  - From `@/utils/featureFlags`: `TEAM_DATA_ACCESS_ENABLED`.
  - From `@/utils/teamCookies`:
    - constants `ACTIVE_TEAM_COOKIE`, `INVITE_TOKEN_COOKIE`, `INVITE_QUERY_PARAM`, `TEAM_ID_HEADER`, `ACTIVE_TEAM_MAX_AGE`, `INVITE_TOKEN_MAX_AGE`;
    - `buildCookie(name, value, maxAge, secure)`, `getActiveTeamCookie()`, `setActiveTeamCookie(id)`, `clearActiveTeamCookie()`.
    - There are no client helpers for `invite_token`: it's HttpOnly.
  - From `@/config/teamCopy`: `formatList`, `grantWarning`, `askForAccess`, `NO_LONGER_HAS_ACCESS`, `DATA_ACCESS_UNAVAILABLE`, `removedFromTeam`, `signerLocked`, `leaveConfirm`.
  - From `@/utils/teamApiError`: `TeamApiError(status, code, message)` and `unwrap(result)`.

- [ ] **Step 1: Record the baseline**

Run:

```bash
cd ~/workspace/dimo-developer-console && git status -sb && git log --oneline -3
npx jest 2>&1 | tee /tmp/console-teams-baseline.log | grep -E '^(Test Suites|Tests):'
grep -E '^FAIL ' /tmp/console-teams-baseline.log | awk '{print $2}' | sort -u > /tmp/console-teams-baseline-failing.txt
wc -l < /tmp/console-teams-baseline-failing.txt
npx tsc --noEmit -p . 2>&1 | tail -3
```

Expected: branch `console-teams`, clean. `/tmp/console-teams-baseline-failing.txt` lists, one path per line, the suites that already fail before this work (124 when this plan was written). Task 18 compares names against it, so only a suite missing from this list counts as a new failure.

- [ ] **Step 2: Write the failing tests**

`__tests__/unit/utils/teamCookies.test.ts`:

```ts
import {
  ACTIVE_TEAM_COOKIE,
  buildCookie,
  clearActiveTeamCookie,
  getActiveTeamCookie,
  INVITE_TOKEN_COOKIE,
  setActiveTeamCookie,
  TEAM_ID_HEADER,
} from '@/utils/teamCookies';

describe('team cookies', () => {
  beforeEach(() => {
    document.cookie = `${ACTIVE_TEAM_COOKIE}=; Path=/; Max-Age=0`;
  });

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

  it('marks the cookie Secure on https only', () => {
    expect(buildCookie('active_team', 't', 60, true)).toBe(
      'active_team=t; Path=/; Max-Age=60; SameSite=Lax; Secure',
    );
    expect(buildCookie('active_team', 't', 60, false)).toBe(
      'active_team=t; Path=/; Max-Age=60; SameSite=Lax',
    );
  });
});
```

`__tests__/unit/utils/featureFlags.test.ts` (the flag is read at module load, so each case loads a fresh module, as `__tests__/unit/app/templatesGate.test.tsx` does):

```ts
const load = async (value: string | undefined): Promise<boolean> => {
  const previous = process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  if (value === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = value;
  let flag = false;
  await jest.isolateModulesAsync(async () => {
    flag = (await import('@/utils/featureFlags')).TEAM_DATA_ACCESS_ENABLED;
  });
  if (previous === undefined) delete process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED;
  else process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED = previous;
  return flag;
};

describe('TEAM_DATA_ACCESS_ENABLED', () => {
  it('is on only for the exact string "true"', async () => {
    expect(await load('true')).toBe(true);
    expect(await load('TRUE')).toBe(false);
    expect(await load('1')).toBe(false);
    expect(await load(undefined)).toBe(false);
  });
});
```

`__tests__/unit/config/teamCopy.test.ts`:

```ts
import {
  askForAccess,
  DATA_ACCESS_UNAVAILABLE,
  formatList,
  grantWarning,
  leaveConfirm,
  NO_LONGER_HAS_ACCESS,
  removedFromTeam,
  signerLocked,
} from '@/config/teamCopy';

describe('team copy (contracts C8)', () => {
  it('words the grant warning exactly, DCX sentence included', () => {
    expect(grantWarning('Sam Rivera', 'Harness Fleet')).toBe(
      "Data access lets Sam Rivera use every permission vehicles have granted Harness Fleet, including commands, through the DIMO APIs — not only what the console shows. Their queries spend Harness Fleet's DCX credits.",
    );
  });

  it('words every other C8 sentence exactly', () => {
    expect(askForAccess('ops@acme.dev', 'Harness Fleet')).toBe(
      'Ask ops@acme.dev for data access to Harness Fleet.',
    );
    expect(NO_LONGER_HAS_ACCESS).toBe('You no longer have access to this license.');
    expect(DATA_ACCESS_UNAVAILABLE).toBe("Data access for team members isn't available yet.");
    expect(removedFromTeam('Acme Mobility')).toBe("You're no longer a member of Acme Mobility.");
    expect(signerLocked('ops@acme.dev')).toBe(
      'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
    );
    expect(leaveConfirm('Acme Mobility', 'ops@acme.dev')).toBe(
      'Leave Acme Mobility? ops@acme.dev will be asked to revoke your data access.',
    );
  });

  it('joins license names in prose', () => {
    expect(formatList(['A'])).toBe('A');
    expect(formatList(['A', 'B'])).toBe('A and B');
    expect(formatList(['A', 'B', 'C'])).toBe('A, B and C');
  });
});
```

`__tests__/unit/utils/teamApiError.test.ts`:

```ts
import { TeamApiError, unwrap } from '@/utils/teamApiError';

describe('unwrap', () => {
  it('returns the data of a success', () => {
    expect(unwrap({ ok: true, data: 1 })).toBe(1);
  });

  it('throws a TeamApiError carrying the console-api code', () => {
    expect(() =>
      unwrap({ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'Not a member' }),
    ).toThrow(new TeamApiError(403, 'NOT_A_MEMBER', 'Not a member'));
    try {
      unwrap({ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'x' });
    } catch (error) {
      expect(error).toBeInstanceOf(TeamApiError);
      expect((error as TeamApiError).code).toBe('NOT_A_MEMBER');
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts __tests__/unit/utils/teamApiError.test.ts`
Expected: FAIL. The modules are missing, and the flag is `undefined`.

- [ ] **Step 4: Implement**

Append to `src/types/team.ts`:

```ts
// --- Wire types for the console-api team endpoints (contracts index C7) ---
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
  // Every enabled MEMBER registry key this user holds in this team, whatever
  // their current signerAddress (they may have changed wallet since).
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

export interface LicenseSignerInput {
  kind: SignerKind;
  note?: string | null;
  holders: HolderInput[];
}

export interface LicenseAccess {
  access: 'OWNER' | 'MEMBER' | 'NONE';
  // NONE + true: a member without a key (ask the owner); NONE + false: not in the team.
  memberOfTeam: boolean;
  teamId: string | null;
  signerAddress: `0x${string}` | null;
  userEmail: string;
}

export interface InvitePreview {
  teamName: string;
  ownerEmail: string;
  expiresAt: string;
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

// Off until part 1 enforces the signer check in an environment and the team
// live pass succeeds there (contracts Rollout 5). While off: no Grant, no Data
// access column, members don't get Vehicles; teams and the key registry stay.
export const TEAM_DATA_ACCESS_ENABLED =
  process.env.NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED === 'true';
```

`src/utils/teamCookies.ts`:

```ts
// Cookies and header shared by the browser, server actions and the middleware
// (contracts C4). invite_token is HttpOnly: only the middleware and server
// actions touch it, so there are no browser helpers for it here.
export const ACTIVE_TEAM_COOKIE = 'active_team';
export const INVITE_TOKEN_COOKIE = 'invite_token';
export const INVITE_QUERY_PARAM = 'invite';
export const TEAM_ID_HEADER = 'X-Team-Id';
export const ACTIVE_TEAM_MAX_AGE = 60 * 60 * 24 * 365;
export const INVITE_TOKEN_MAX_AGE = 60 * 60 * 24;

export const buildCookie = (name: string, value: string, maxAge: number, secure: boolean) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`;

const isHttps = () => typeof location !== 'undefined' && location.protocol === 'https:';

export const getActiveTeamCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const prefix = `${ACTIVE_TEAM_COOKIE}=`;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!hit) return null;
  const value = decodeURIComponent(hit.slice(prefix.length));
  return value === '' ? null : value;
};

export const setActiveTeamCookie = (teamId: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = buildCookie(ACTIVE_TEAM_COOKIE, teamId, ACTIVE_TEAM_MAX_AGE, isHttps());
};

export const clearActiveTeamCookie = () => {
  if (typeof document === 'undefined') return;
  document.cookie = buildCookie(ACTIVE_TEAM_COOKIE, '', 0, isHttps());
};
```

`src/config/teamCopy.ts`:

```ts
// Copy shared with the other console-teams parts (contracts index C8). Change
// it there first.
export const formatList = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

export const grantWarning = (name: string, license: string) =>
  `Data access lets ${name} use every permission vehicles have granted ${license}, including commands, through the DIMO APIs — not only what the console shows. Their queries spend ${license}'s DCX credits.`;

export const askForAccess = (ownerEmail: string, license: string) =>
  `Ask ${ownerEmail} for data access to ${license}.`;

export const NO_LONGER_HAS_ACCESS = 'You no longer have access to this license.';

export const DATA_ACCESS_UNAVAILABLE = "Data access for team members isn't available yet.";

export const removedFromTeam = (teamName: string) =>
  `You're no longer a member of ${teamName}.`;

export const signerLocked = (ownerEmail: string) =>
  `Your access is tied to another wallet. Ask ${ownerEmail} to revoke it first.`;

export const leaveConfirm = (teamName: string, ownerEmail: string) =>
  `Leave ${teamName}? ${ownerEmail} will be asked to revoke your data access.`;
```

`src/utils/teamApiError.ts`:

```ts
import type { ApiResult } from '@/types/team';

// Thrown by React Query functions so TeamProvider can see a console-api code
// (NOT_A_MEMBER) from any team-scoped query.
export class TeamApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'TeamApiError';
  }
}

export const unwrap = <T>(result: ApiResult<T>): T => {
  if (result.ok) return result.data;
  throw new TeamApiError(result.status, result.code, result.message);
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts __tests__/unit/utils/teamApiError.test.ts && npx eslint __tests__/unit/utils/featureFlags.test.ts`
Expected: PASS, and ESLint reports nothing; the test uses `import()`, not `require`.

- [ ] **Step 6: Commit**

```bash
git add src/types/team.ts src/utils/featureFlags.ts src/utils/teamCookies.ts src/config/teamCopy.ts src/utils/teamApiError.ts __tests__/unit/utils/teamCookies.test.ts __tests__/unit/utils/featureFlags.test.ts __tests__/unit/config/teamCopy.test.ts __tests__/unit/utils/teamApiError.test.ts
git commit -m "feat(teams): wire types, data-access flag, team cookies and shared copy"
```

---

### Task 2: console-api client: `X-Team-Id`, a stale team on `NOT_A_MEMBER`, team endpoints

**Files:**

- Modify: `src/services/dimoDevAPI.ts`
- Create: `src/services/teams.ts` (server-side calls), `src/actions/teams.ts` (`'use server'`)
- Test: `__tests__/unit/services/dimoDevAPI.test.ts`, `__tests__/unit/services/teams.test.ts`

**Interfaces:**

- Consumes: Task 1 types and cookie constants.
- Produces:
  - `clearStaleTeamOnNotAMember(error)`, an axios response interceptor on every `dimoDevAPIClient`. On `403 NOT_A_MEMBER` it deletes `active_team` where cookies are writable (server actions, route handlers) and rethrows.
  - Service functions in `@/services/teams`, used by Tasks 3 and 5 for invites: `fetchMyTeams`, `fetchTeamMembers`, `postInvitation`, `postResendInvitation`, `deleteInvitation`, `postInvitePreview(token)`, `postAcceptInvitation(token)`, `deleteTeamMember`, `postLeaveTeam`, `putSignerProof`, `fetchLicenseSigners`, `putLicenseSigner`, `postLicenseSignerDisabled`, `toFailure`.
  - Server actions in `@/actions/teams`, each returning `Promise<ApiResult<…>>`:
    - `listMyTeams(): { teams }`
    - `listTeamMembers(): { members }`
    - `inviteTeamMember(email): { member }`
    - `resendTeamInvite(id): { member }`
    - `cancelTeamInvite(id): null`
    - `removeTeamMember(id): null`
    - `leaveTeam(): null`
    - `registerSigner(input): { signerAddress, signerVerifiedAt }`
    - `listLicenseSigners(tokenId): { signers }`
    - `upsertLicenseSigner(tokenId, address, input): { signer }`
    - `markLicenseSignerDisabled(tokenId, address): { signer }`

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

const withCookies = (values: Record<string, string>, remove = jest.fn()) => {
  (cookies as jest.Mock).mockResolvedValue({
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
    delete: remove,
  });
  return remove;
};
const refusedWith = (code: string) =>
  new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 403,
    data: { code, message: 'x' },
  } as AxiosResponse);

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

  it('drops the active team cookie when console-api says the user left the team', async () => {
    const remove = withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
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
    const remove = withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
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

  it('maps a console-api error code', async () => {
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
    await teams.postInvitePreview('tok');
    await teams.postAcceptInvitation('tok');
    await teams.deleteTeamMember('m-1');
    await teams.postLeaveTeam();
    await teams.putSignerProof({ address: '0xA', message: 'm', signature: '0xs' } as never);
    await teams.fetchTeamMembers();
    await teams.fetchLicenseSigners(42);
    await teams.putLicenseSigner(42, '0xAbC', { kind: 'API_KEY', holders: [{ name: 'Ops' }] });
    await teams.postLicenseSignerDisabled(42, '0xAbC');
    expect(client.post.mock.calls.map((c) => c[0])).toEqual([
      '/api/my/team/invitations/inv%201/resend',
      '/api/invitations/preview',
      '/api/invitations/accept',
      '/api/my/team/leave',
      '/api/my/licenses/42/signers/0xAbC/disabled',
    ]);
    expect(client.post.mock.calls[1][1]).toEqual({ token: 'tok' });
    expect(client.post.mock.calls[2][1]).toEqual({ token: 'tok' });
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
Expected: FAIL. There's no header and no interceptor, and `@/services/teams` is missing.

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

// The user was removed from the active team (403 NOT_A_MEMBER, contracts C7):
// later calls fall back to the personal team. Cookies are writable only in
// server actions and route handlers; elsewhere the delete throws and is
// skipped. TeamProvider tells the user (reportRemoved).
export const clearStaleTeamOnNotAMember = async (error: unknown) => {
  const code =
    error instanceof AxiosError
      ? (error.response?.data as { code?: string } | undefined)?.code
      : undefined;
  if (error instanceof AxiosError && error.response?.status === 403 && code === 'NOT_A_MEMBER') {
    try {
      (await cookies()).delete(ACTIVE_TEAM_COOKIE);
    } catch {
      // read-only cookie store here
    }
  }
  throw error;
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
```

`src/services/teams.ts`:

```ts
import { AxiosError, type AxiosInstance } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import type {
  ApiResult,
  InvitePreview,
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

const noContent = async (run: (client: AxiosInstance) => Promise<unknown>) => {
  const result = await call<unknown>(async (client) => ({ data: await run(client) }));
  return result.ok ? ({ ok: true, data: null } as const) : result;
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

export const deleteInvitation = (inviteId: string) =>
  noContent((c) => c.delete(`/api/my/team/invitations/${id(inviteId)}`));

export const postInvitePreview = (token: string) =>
  call<InvitePreview>((c) => c.post('/api/invitations/preview', { token }));

export const postAcceptInvitation = (token: string) =>
  call<{ team: TeamSummary }>((c) => c.post('/api/invitations/accept', { token }));

export const deleteTeamMember = (memberId: string) =>
  noContent((c) => c.delete(`/api/my/team/members/${id(memberId)}`));

export const postLeaveTeam = () => noContent((c) => c.post('/api/my/team/leave'));

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
// console-api call goes through here with the session cookie and X-Team-Id.
// Invite preview and acceptance live in @/actions/invites (they read the
// HttpOnly invite cookie).
export const listMyTeams = async () => api.fetchMyTeams();
export const listTeamMembers = async () => api.fetchTeamMembers();
export const inviteTeamMember = async (email: string) => api.postInvitation(email);
export const resendTeamInvite = async (inviteId: string) =>
  api.postResendInvitation(inviteId);
export const cancelTeamInvite = async (inviteId: string) => api.deleteInvitation(inviteId);
export const removeTeamMember = async (memberId: string) => api.deleteTeamMember(memberId);
export const leaveTeam = async () => api.postLeaveTeam();
export const registerSigner = async (input: SignerProofInput) => api.putSignerProof(input);
export const listLicenseSigners = async (tokenId: number) => api.fetchLicenseSigners(tokenId);
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

### Task 3: Invite cookie (HttpOnly) and invite server actions; sign-out clears team state; drop the collaborator bypass

**Files:**

- Create: `src/utils/inviteCookie.ts`, `src/actions/invites.ts`, `src/utils/consoleSession.ts`
- Modify: `src/middleware.ts` (invite redirect first, before the `try`; look up the sub-organization by the user's own email)
- Modify: `src/utils/devJwt.ts` (`clearAllDevJwts`)
- Modify: `src/actions/user.ts` (`signOut` deletes `active_team` and `invite_token` too)
- Modify: `src/components/Menu/Menu.tsx`, `src/hoc/GlobalAccountProvider.tsx`, `src/hoc/AuthProvider.tsx` (sign-out clears browser team state)
- Modify: `src/services/user.ts` (no `invitation_code`; delete `acceptInvitation`), `src/utils/loggedUser.ts`, `src/app/sign-in/components/View/View.tsx` (no collaborator bypass)
- Test: `__tests__/unit/utils/inviteCookie.test.ts`, `__tests__/unit/middleware/invite.test.ts`, `__tests__/unit/actions/invites.test.ts`, `__tests__/unit/actions/signOut.test.ts`, `__tests__/unit/utils/consoleSession.test.ts`, `__tests__/unit/utils/loggedUser.test.ts`, `__tests__/unit/services/user.test.ts`

**Interfaces:**

- Consumes: Task 1 constants; `postInvitePreview` and `postAcceptInvitation` (Task 2).
- Produces:
  - `inviteRedirect(request): NextResponse | null`. For `/sign-in?invite=` it returns a 307 to the same URL without `invite`, setting the HttpOnly cookie when the token is well formed.
  - Server actions in `@/actions/invites`:
    - `previewPendingInvite(): Promise<ApiResult<InvitePreview> | null>`
    - `acceptPendingInvite(): Promise<ApiResult<{ team: TeamSummary }> | null>`
    - Both return `null` when there's no invite, and delete the cookie on success (accept only) or a terminal code.
  - `clearAllDevJwts()` in `@/utils/devJwt`.
  - `clearConsoleBrowserState()` in `@/utils/consoleSession`, which clears every developer JWT and `active_team`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/inviteCookie.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { inviteRedirect } from '@/utils/inviteCookie';

const TOKEN = 'Qm9vdHN0cmFwX3Rva2VuX2Zvcl90ZXN0aW5nXzEyMzQ1Ng';

describe('inviteRedirect', () => {
  it('keeps a well-formed token in an HttpOnly cookie and strips it from the URL', () => {
    const res = inviteRedirect(
      new NextRequest(`http://console.test/sign-in?invite=${TOKEN}&focus=rentals_os_signup`),
    )!;
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/sign-in');
    expect(location.searchParams.get('invite')).toBeNull();
    expect(location.searchParams.get('focus')).toBe('rentals_os_signup');
    const cookie = res.cookies.get('invite_token')!;
    expect(cookie.value).toBe(TOKEN);
    expect(cookie).toMatchObject({ path: '/', httpOnly: true, sameSite: 'lax', maxAge: 86400 });
    expect(cookie.secure).toBeFalsy();
  });

  it('marks the cookie Secure on https', () => {
    const res = inviteRedirect(new NextRequest(`https://console.test/sign-in?invite=${TOKEN}`))!;
    expect(res.cookies.get('invite_token')?.secure).toBe(true);
  });

  it('strips a malformed token without storing it', () => {
    const res = inviteRedirect(new NextRequest('http://console.test/sign-in?invite=a%3Cb'))!;
    expect(res.status).toBe(307);
    expect(res.cookies.get('invite_token')).toBeUndefined();
  });

  it('ignores every path but /sign-in, and /sign-in without the parameter', () => {
    expect(inviteRedirect(new NextRequest(`http://console.test/app?invite=${TOKEN}`))).toBeNull();
    expect(inviteRedirect(new NextRequest('http://console.test/sign-in'))).toBeNull();
  });
});
```

`__tests__/unit/middleware/invite.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/services/dimoDevAPI', () => ({
  cookieName: 'session-token',
  getCookie: jest.fn(async () => 'session.jwt'),
}));
jest.mock('@/utils/middlewareUtils', () => ({
  ...jest.requireActual('@/utils/middlewareUtils'),
  decodeJwtToken: jest.fn(async () => ({ ethereum_address: '0xkernel' })),
}));
jest.mock('@/services/user', () => ({
  getUserByToken: jest.fn(async () => {
    throw new Error('console-api is down');
  }),
}));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { middleware } from '@/middleware';

const TOKEN = 'Qm9vdHN0cmFwX3Rva2VuX2Zvcl90ZXN0aW5nXzEyMzQ1Ng';

describe('middleware and invite links', () => {
  it('keeps the invite even when the session check would fail and redirect', async () => {
    const res = (await middleware(
      new NextRequest(`http://console.test/sign-in?invite=${TOKEN}`),
      {} as never,
    )) as Response & { cookies: { get: (n: string) => { value: string } | undefined } };
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get('location')!).searchParams.get('invite')).toBeNull();
    expect(res.cookies.get('invite_token')?.value).toBe(TOKEN);
  });
});
```

`__tests__/unit/actions/invites.test.ts`:

```ts
/**
 * @jest-environment node
 */
const store = new Map<string, string>();
const remove = jest.fn((name: string) => store.delete(name));
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) => (store.has(name) ? { value: store.get(name) } : undefined),
    delete: remove,
  })),
}));
jest.mock('@/services/teams', () => ({
  postInvitePreview: jest.fn(),
  postAcceptInvitation: jest.fn(),
}));
import { postAcceptInvitation, postInvitePreview } from '@/services/teams';
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';

const failure = (status: number, code: string | null) => ({ ok: false, status, code, message: 'x' });

describe('invite server actions', () => {
  beforeEach(() => {
    store.clear();
    remove.mockClear();
  });

  it('answers null without an invite cookie', async () => {
    await expect(previewPendingInvite()).resolves.toBeNull();
    await expect(acceptPendingInvite()).resolves.toBeNull();
    expect(postInvitePreview).not.toHaveBeenCalled();
  });

  it('previews without deleting the cookie', async () => {
    store.set('invite_token', 'tok');
    (postInvitePreview as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teamName: 'Acme Mobility', ownerEmail: 'ops@acme.dev', expiresAt: '2026-10-09T00:00:00Z' },
    });
    await expect(previewPendingInvite()).resolves.toMatchObject({ ok: true });
    expect(postInvitePreview).toHaveBeenCalledWith('tok');
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes the cookie on success and on terminal errors only', async () => {
    store.set('invite_token', 'tok');
    (postAcceptInvitation as jest.Mock).mockResolvedValueOnce({ ok: true, data: { team: { id: 't' } } });
    await acceptPendingInvite();
    expect(remove).toHaveBeenCalledWith('invite_token');

    for (const code of ['INVITE_INVALID', 'INVITE_EXPIRED', 'INVITE_EMAIL_MISMATCH', 'ALREADY_MEMBER']) {
      store.set('invite_token', 'tok');
      remove.mockClear();
      (postAcceptInvitation as jest.Mock).mockResolvedValueOnce(failure(400, code));
      await acceptPendingInvite();
      expect(remove).toHaveBeenCalledWith('invite_token');
    }
  });

  it('keeps the cookie on a network failure or an unknown error', async () => {
    store.set('invite_token', 'tok');
    (postAcceptInvitation as jest.Mock).mockResolvedValueOnce(failure(0, null));
    await acceptPendingInvite();
    (postInvitePreview as jest.Mock).mockResolvedValueOnce(failure(502, null));
    await previewPendingInvite();
    expect(remove).not.toHaveBeenCalled();
  });
});
```

`__tests__/unit/actions/signOut.test.ts`:

```ts
/**
 * @jest-environment node
 */
const remove = jest.fn();
jest.mock('next/headers', () => ({ cookies: jest.fn(async () => ({ delete: remove })) }));
import { signOut } from '@/actions/user';

describe('signOut (contracts C4)', () => {
  it('deletes the session, the active team and a pending invite', async () => {
    await signOut();
    expect(remove.mock.calls.map(([name]) => name).sort()).toEqual([
      'active_team',
      'invite_token',
      'session-token',
    ]);
  });
});
```

`__tests__/unit/utils/consoleSession.test.ts`:

```ts
import { clearConsoleBrowserState } from '@/utils/consoleSession';

describe('clearConsoleBrowserState', () => {
  it('removes every stored developer JWT and the active team, nothing else', () => {
    localStorage.setItem('devJwt_0xaaa_list_v1', '[]');
    localStorage.setItem('devJwt_0xaaa_0x9f1e_list_v1', '[]');
    localStorage.setItem('theme', '"dark"');
    document.cookie = 'active_team=team-acme; Path=/';
    clearConsoleBrowserState();
    expect(localStorage.getItem('devJwt_0xaaa_list_v1')).toBeNull();
    expect(localStorage.getItem('devJwt_0xaaa_0x9f1e_list_v1')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('"dark"');
    expect(document.cookie).not.toContain('active_team=team-acme');
  });
});
```

`__tests__/unit/utils/loggedUser.test.ts`:

```ts
import { LoggedUser } from '@/utils/loggedUser';
import type { IUser } from '@/types/user';
import type { ISubOrganization } from '@/types/wallet';

const user = { name: 'Sam', email: 'sam@x.dev', role: 'COLLABORATOR' } as unknown as IUser;

describe('LoggedUser', () => {
  it('no longer treats a collaborator without a sub-organization as a global account user', () => {
    const logged = new LoggedUser(user, {} as ISubOrganization);
    expect(logged.isGlobalAccountUser).toBe(false);
    expect(logged.missingFlow).toBe('wallet-creation');
  });

  it('accepts anyone with their own sub-organization', () => {
    const logged = new LoggedUser(user, { subOrganizationId: 'sub-1' } as ISubOrganization);
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

Run: `npx jest __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/middleware __tests__/unit/actions __tests__/unit/utils/consoleSession.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts`
Expected: FAIL. The modules are missing, `signOut` deletes only the session, the collaborator still passes, and `invitation_code` is still sent.

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

// /sign-in?invite=<token> (contracts C4): keep the token in an HttpOnly cookie
// and send the browser back to the same URL without it. Runs before any session
// check, so neither a redirect nor a console-api failure can lose the invite.
export const inviteRedirect = (request: NextRequest): NextResponse | null => {
  if (request.nextUrl.pathname !== '/sign-in') return null;
  const token = request.nextUrl.searchParams.get(INVITE_QUERY_PARAM);
  if (token === null) return null;
  const url = request.nextUrl.clone();
  url.searchParams.delete(INVITE_QUERY_PARAM);
  const response = NextResponse.redirect(url, { status: 307 });
  if (TOKEN.test(token)) {
    response.cookies.set(INVITE_TOKEN_COOKIE, token, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      maxAge: INVITE_TOKEN_MAX_AGE,
    });
  }
  return response;
};
```

`src/middleware.ts`:
- Add `import { inviteRedirect } from '@/utils/inviteCookie';`.
- Make the first statement of `middleware`:

```ts
  // Before anything that can fail or redirect: an invite link keeps its token.
  const invite = inviteRedirect(request);
  if (invite) return invite;
```

- In `validatePrivateSession`, replace `getUserSubOrganization(user.company_email_owner ?? user.email)` with:

```ts
  // Every console user signs in with their own global account; team members
  // are no longer represented by the company owner's account.
  const subOrganization = await getUserSubOrganization(user.email);
```

`src/actions/invites.ts`:

```ts
'use server';

import { cookies } from 'next/headers';
import { postAcceptInvitation, postInvitePreview } from '@/services/teams';
import { INVITE_TOKEN_COOKIE } from '@/utils/teamCookies';
import type { ApiResult, InvitePreview, TeamSummary } from '@/types/team';

// Codes after which the invite can never succeed (contracts C4); any other
// failure, a network one included, keeps the cookie for a later page.
const TERMINAL = new Set([
  'INVITE_INVALID',
  'INVITE_EXPIRED',
  'INVITE_EMAIL_MISMATCH',
  'ALREADY_MEMBER',
]);

const readToken = async () => (await cookies()).get(INVITE_TOKEN_COOKIE)?.value ?? null;

const settle = async <T>(result: ApiResult<T>, consumed: boolean): Promise<ApiResult<T>> => {
  if ((result.ok && consumed) || (!result.ok && result.code && TERMINAL.has(result.code))) {
    (await cookies()).delete(INVITE_TOKEN_COOKIE);
  }
  return result;
};

export const previewPendingInvite = async (): Promise<ApiResult<InvitePreview> | null> => {
  const token = await readToken();
  if (!token) return null;
  return settle(await postInvitePreview(token), false);
};

export const acceptPendingInvite = async (): Promise<ApiResult<{ team: TeamSummary }> | null> => {
  const token = await readToken();
  if (!token) return null;
  return settle(await postAcceptInvitation(token), true);
};
```

`src/actions/user.ts`: replace `signOut`:

```ts
export const signOut = async () => {
  const userCookies = await cookies();
  userCookies.delete(cookieName);
  // Contracts C4: sign-out also forgets the active team and a pending invite.
  userCookies.delete(ACTIVE_TEAM_COOKIE);
  userCookies.delete(INVITE_TOKEN_COOKIE);
  return true;
};
```

Also add `import { ACTIVE_TEAM_COOKIE, INVITE_TOKEN_COOKIE } from '@/utils/teamCookies';`.

`src/utils/devJwt.ts`: append:

```ts

// Sign-out (contracts C4): every developer JWT this browser holds, owner keys
// and member keys alike.
export const clearAllDevJwts = () => {
  if (typeof window === 'undefined') return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith('devJwt_'))
    .forEach((key) => localStorage.removeItem(key));
};
```

`src/utils/consoleSession.ts`:

```ts
'use client';
import { clearAllDevJwts } from '@/utils/devJwt';
import { clearActiveTeamCookie } from '@/utils/teamCookies';

// The browser half of sign-out; the server half is signOut() (cookies).
export const clearConsoleBrowserState = () => {
  clearAllDevJwts();
  clearActiveTeamCookie();
};
```

Call `clearConsoleBrowserState()` immediately before `await signOut()` in:
- `src/components/Menu/Menu.tsx` (`onSignOut`)
- `src/hoc/GlobalAccountProvider.tsx` (`logout`)
- `src/hoc/AuthProvider.tsx` (`logout`)

In each file, import it with `import { clearConsoleBrowserState } from '@/utils/consoleSession';`.

`src/services/user.ts`:
- Replace `getUserByToken` with the version below, and delete `acceptInvitation` (it has no callers):

```ts
export const getUserByToken = async () => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};
```

- Change the import to `import { dimoDevAPIClient } from '@/services/dimoDevAPI';`.

`src/utils/loggedUser.ts`: delete `if (isCollaborator(this._user?.role ?? '')) return true;` and the `import { isCollaborator } from './user';`.

`src/app/sign-in/components/View/View.tsx`:
- Delete `import { isCollaborator } from '@/utils/user';`.
- Destructure `const { subOrganizationId, hasPasskey, currentWalletAddress } = userInformation;`.
- Delete the `if (isCollaborator(role)) { router.replace('/app'); return; }` block.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx jest __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/middleware __tests__/unit/actions __tests__/unit/utils/consoleSession.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts __tests__/unit/utils/middlewareUtils.test.ts && npx tsc --noEmit -p . 2>&1 | grep -E "middleware|loggedUser|sign-in|services/user|actions/(user|invites)|consoleSession" ; echo done`
Expected: PASS. The `grep` prints nothing before `done`.

- [ ] **Step 5: Commit**

```bash
git add src/utils/inviteCookie.ts src/actions/invites.ts src/utils/consoleSession.ts src/middleware.ts src/utils/devJwt.ts src/actions/user.ts src/components/Menu/Menu.tsx src/hoc/GlobalAccountProvider.tsx src/hoc/AuthProvider.tsx src/services/user.ts src/utils/loggedUser.ts src/app/sign-in/components/View/View.tsx __tests__/unit/utils/inviteCookie.test.ts __tests__/unit/middleware __tests__/unit/actions __tests__/unit/utils/consoleSession.test.ts __tests__/unit/utils/loggedUser.test.ts __tests__/unit/services/user.test.ts
git commit -m "feat(teams): HttpOnly invite cookie with server-side acceptance; sign-out clears team state"
```

---

### Task 4: `TeamProvider`: active team, owner fallback, switching, removal detection

**Files:**

- Create: `src/context/TeamContext.ts`, `src/hoc/TeamProvider.tsx` (`TeamProvider` and `withTeams`), `src/hooks/useTeam.ts`, `src/utils/hardNavigate.ts`, `src/utils/inviteErrors.ts`, `src/hooks/useSignerRegistration.ts` (a no-op until Task 6)
- Modify: `src/hoc/index.ts`, `src/hooks/index.ts`, `src/layouts/AuthorizedLayout/AuthorizedLayout.tsx`
- Modify: `src/types/user.ts` (drop `role` from `IUserSession`), `src/hoc/GlobalAccountProvider.tsx` (no hard-coded `OWNER`; `$role` moves to `TeamProvider`)
- Modify: `src/components/AccountInfoButton/AccountInfoButton.tsx`, `src/components/CreditsWidget/CreditsWidget.tsx`, `src/app/settings/components/TeamManagement/TeamManagement.tsx`, `src/utils/user.ts`
- Test: `__tests__/unit/hoc/TeamProvider.test.tsx`, `__tests__/unit/components/CreditsWidget.test.tsx`

**Interfaces:**

- Consumes:
  - `listMyTeams` (Task 2);
  - the cookie helpers and `removedFromTeam` (Task 1);
  - `TeamApiError` (Task 1);
  - `useGlobalAccount().currentUser`, `useMixPanel()`, and `useQueryClient()` (TanStack, provided by `RootLayout`).
- Produces:
  - `useTeam(): TeamContextValue`, where `TeamContextValue` is

    ```ts
    {
      teams: TeamSummary[];
      activeTeam: TeamSummary | null;
      isLoading: boolean;
      teamsUnavailable: boolean;
      isOwner: boolean;
      isMember: boolean;
      ownerAddress: `0x${string}` | null;
      switchTeam(teamId: string, via?: 'switcher' | 'invite'): void;
      refreshTeams(): Promise<void>;
      reportRemoved(): void;
      flashAfterReload(flash: Flash): void;
    }
    ```

  - **Default context (no provider, e.g. in unit tests):** `isOwner: true`, `isLoading: false`, `activeTeam: null`. Code outside a team keeps today's owner behavior.
  - **Inside the provider:**
    - `isOwner` is false while loading;
    - after loading, `isOwner` is true only when the active team is `OWNER` and has an `ownerAddress` (license lists need one);
    - if teams can't load, `activeTeam` is a synthesized personal `OWNER` team (`id: 'personal-fallback'`, `ownerAddress = currentUser.smartContractAddress`) and `teamsUnavailable` is true;
    - if they load but the list is empty (`GET /api/my/teams` leaves out teams without an owner wallet), `activeTeam` is the same fallback team, without the toast, so license lists never wait forever.
  - **`reportRemoved()`** applies only while a team that isn't the user's own is active. It stores the C8 `You're no longer a member of {team}.` flash, points `active_team` at the personal team and reloads into Home.
  - **Flash:** `Flash = { tone: 'success' | 'error'; message: string }`, kept in session storage under `teamFlash`.
  - `hardNavigate(path)` and `inviteErrorMessage(code)`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hoc/TeamProvider.test.tsx`:

```tsx
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listMyTeams: jest.fn() }));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
jest.mock('@/hooks/useSignerRegistration', () => ({ useSignerRegistration: jest.fn() }));
const identifyUser = jest.fn();
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ identifyUser, trackEvent }) }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { listMyTeams } from '@/actions/teams';
import { hardNavigate } from '@/utils/hardNavigate';
import { toast } from 'sonner';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { TeamProvider } from '@/hoc/TeamProvider';
import { useTeam } from '@/hooks/useTeam';
import { TeamApiError } from '@/utils/teamApiError';
import type { TeamSummary } from '@/types/team';

const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const PERSONAL: TeamSummary = {
  id: 'team-harness',
  name: 'Harness Motors',
  companyName: 'Harness Motors',
  role: 'OWNER',
  ownerUserId: 'user-harness',
  ownerEmail: 'jane@harness.dev',
  ownerAddress: KERNEL,
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
const USER = {
  email: 'jane@harness.dev',
  subOrganizationId: 'sub',
  walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6' as const,
  smartContractAddress: KERNEL as `0x${string}`,
};

let api: ReturnType<typeof useTeam>;
const Probe = () => {
  api = useTeam();
  return (
    <div data-testid="probe">
      {JSON.stringify({
        loading: api.isLoading,
        active: api.activeTeam?.id ?? null,
        isOwner: api.isOwner,
        isMember: api.isMember,
        owner: api.ownerAddress,
        unavailable: api.teamsUnavailable,
      })}
    </div>
  );
};
const probe = () => JSON.parse(screen.getByTestId('probe').textContent!);
const renderProvider = (child: React.ReactNode = <Probe />, client = new QueryClient()) =>
  render(
    <QueryClientProvider client={client}>
      <GlobalAccountContext.Provider
        value={{
          currentUser: USER,
          validateCurrentSession: async () => USER,
          getCurrentDcxBalance: async () => 0,
          getCurrentDimoBalance: async () => 0,
          logout: async () => {},
        }}
      >
        <TeamProvider>{child}</TeamProvider>
      </GlobalAccountContext.Provider>
    </QueryClientProvider>,
  );

describe('TeamProvider', () => {
  beforeEach(() => {
    document.cookie = 'active_team=; Path=/; Max-Age=0';
    sessionStorage.clear();
    localStorage.clear();
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: true, data: { teams: [PERSONAL, ACME] } });
  });

  it('is not an owner until the teams load, then defaults to the personal team', async () => {
    renderProvider();
    expect(probe()).toMatchObject({ loading: true, isOwner: false });
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'team-harness',
      isOwner: true,
      isMember: false,
      owner: KERNEL,
    });
    expect(identifyUser).toHaveBeenCalledWith(KERNEL, { $role: 'OWNER', $team: 'team-harness' });
  });

  it('uses the team named by the active_team cookie', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({ active: 'team-acme', isMember: true, owner: ACME.ownerAddress });
  });

  it('falls back to the personal team once, with the C8 removed copy, for a stale cookie', async () => {
    localStorage.setItem('lastActiveTeam', JSON.stringify({ id: 'team-gone', name: 'Gone Co' }));
    document.cookie = 'active_team=team-gone; Path=/';
    renderProvider();
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-harness');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'error',
      message: "You're no longer a member of Gone Co.",
    });
  });

  it('treats a user with no team as the owner of their own wallet, without a toast', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: true, data: { teams: [] } });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'personal-fallback',
      isOwner: true,
      owner: KERNEL,
      unavailable: false,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('is not an owner while the active team has no owner wallet', async () => {
    (listMyTeams as jest.Mock).mockResolvedValue({
      ok: true,
      data: { teams: [{ ...PERSONAL, ownerAddress: null }] },
    });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({ active: 'team-harness', isOwner: false });
  });

  it('keeps owners working when teams cannot load', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: false, status: 502, code: null, message: 'x' });
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    expect(probe()).toMatchObject({
      active: 'personal-fallback',
      isOwner: true,
      owner: KERNEL,
      unavailable: true,
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't load your teams. Showing your own licenses for now.",
    );
    expect(document.cookie).not.toContain('active_team=team-acme');
  });

  it('reportRemoved flashes the C8 copy, points at the personal team and reloads', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    act(() => api.reportRemoved());
    expect(hardNavigate).toHaveBeenCalledWith('/app');
    expect(document.cookie).toContain('active_team=team-harness');
    expect(JSON.parse(sessionStorage.getItem('teamFlash')!)).toEqual({
      tone: 'error',
      message: "You're no longer a member of Acme Mobility.",
    });
  });

  it("never reports a removal from the user's own team", async () => {
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-harness'));
    act(() => api.reportRemoved());
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it('re-checks the teams when the tab becomes visible again', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    (listMyTeams as jest.Mock).mockResolvedValue({ ok: true, data: { teams: [PERSONAL] } });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
  });

  it('reports a removal when any team query fails with NOT_A_MEMBER', async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    // Team-scoped queries run once the active team is known, as in the app.
    const Failing = () => {
      const { isLoading } = useTeam();
      useQuery({
        queryKey: ['failing'],
        enabled: !isLoading,
        retry: false,
        queryFn: async () => {
          throw new TeamApiError(403, 'NOT_A_MEMBER', 'Not a member');
        },
      });
      return <Probe />;
    };
    renderProvider(<Failing />);
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
  });

  it('switchTeam sets the cookie, tracks it and reloads into Home', async () => {
    renderProvider();
    await waitFor(() => expect(probe().loading).toBe(false));
    act(() => api.switchTeam('team-acme'));
    expect(document.cookie).toContain('active_team=team-acme');
    expect(trackEvent).toHaveBeenCalledWith('Team Switched', { teamId: 'team-acme', via: 'switcher' });
    expect(hardNavigate).toHaveBeenCalledWith('/app');
  });

  it('shows the flash left by the previous page, in its tone', async () => {
    sessionStorage.setItem('teamFlash', JSON.stringify({ tone: 'error', message: 'Gone' }));
    renderProvider();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gone'));
    expect(sessionStorage.getItem('teamFlash')).toBeNull();
  });
});
```

`__tests__/unit/components/CreditsWidget.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/components/AccountInfoButton', () => ({
  AccountInfoButton: () => <button>Account info</button>,
}));
import { useTeam } from '@/hooks/useTeam';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { CreditsWidget } from '@/components/CreditsWidget';

const withUser = (ui: React.ReactNode) =>
  render(
    <GlobalAccountContext.Provider
      value={{
        currentUser: null,
        validateCurrentSession: async () => null,
        getCurrentDcxBalance: async () => 0,
        getCurrentDimoBalance: async () => 0,
        logout: async () => {},
      }}
    >
      {ui}
    </GlobalAccountContext.Provider>,
  );

describe('CreditsWidget for members', () => {
  it("hides the header balance, which is the member's own wallet, not the team's", () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    const { container } = withUser(<CreditsWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps Account info in the large variant but drops the balance', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    withUser(<CreditsWidget variant="large" />);
    expect(screen.getByRole('button', { name: 'Account info' })).toBeInTheDocument();
    expect(screen.queryByText('Current Balance')).toBeNull();
  });

  it('is unchanged for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    withUser(<CreditsWidget variant="large" />);
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/components/CreditsWidget.test.tsx`
Expected: FAIL. `@/hoc/TeamProvider` is missing, and `CreditsWidget` shows the balance to members.

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
  INVITE_INVALID: "This invite link isn't valid any more. Ask the team owner for a new one.",
  INVITE_EXPIRED: 'This invite has expired. Ask the team owner to resend it.',
  INVITE_EMAIL_MISMATCH:
    'This invite was sent to a different email address. Sign in with that address to accept it.',
};

export const inviteErrorMessage = (code: string | null): string =>
  (code && MESSAGES[code]) || "We couldn't accept this invite. Open the link again.";
```

`src/hooks/useSignerRegistration.ts` (replaced in Task 6):

```ts
'use client';
// Registers the user's Turnkey wallet with console-api (contracts C6).
// Implemented in Task 6; a no-op until then.
export const useSignerRegistration = (lockOwnerEmail: string | null): void => {
  void lockOwnerEmail;
};
```

`src/context/TeamContext.ts`:

```ts
'use client';
import { createContext } from 'react';
import type { TeamSummary } from '@/types/team';

export type Flash = { tone: 'success' | 'error'; message: string };

export interface TeamContextValue {
  teams: TeamSummary[];
  activeTeam: TeamSummary | null;
  isLoading: boolean;
  teamsUnavailable: boolean;
  isOwner: boolean;
  isMember: boolean;
  ownerAddress: `0x${string}` | null;
  switchTeam: (teamId: string, via?: 'switcher' | 'invite') => void;
  refreshTeams: () => Promise<void>;
  reportRemoved: () => void;
  flashAfterReload: (flash: Flash) => void;
}

// Outside a TeamProvider (unit tests, guest pages) code behaves as the owner it
// always was before teams existed.
export const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  isLoading: false,
  teamsUnavailable: false,
  isOwner: true,
  isMember: false,
  ownerAddress: null,
  switchTeam: () => {},
  refreshTeams: async () => {},
  reportRemoved: () => {},
  flashAfterReload: () => {},
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
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TeamContext, type Flash } from '@/context/TeamContext';
import { listMyTeams } from '@/actions/teams';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSignerRegistration } from '@/hooks/useSignerRegistration';
import { removedFromTeam } from '@/config/teamCopy';
import type { TeamSummary } from '@/types/team';
import type { IUserSession } from '@/types/user';
import { TeamApiError } from '@/utils/teamApiError';
import {
  clearActiveTeamCookie,
  getActiveTeamCookie,
  setActiveTeamCookie,
} from '@/utils/teamCookies';
import { hardNavigate } from '@/utils/hardNavigate';
import { getFromSession, removeFromSession, saveToSession } from '@/utils/sessionStorage';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';

const FLASH_KEY = 'teamFlash';
const LAST_TEAM_KEY = 'lastActiveTeam';
export const TEAMS_UNAVAILABLE = "Couldn't load your teams. Showing your own licenses for now.";

const flashAfterReload = (flash: Flash) => saveToSession(FLASH_KEY, flash);

const pickActive = (teams: TeamSummary[], cookieId: string | null) =>
  teams.find((t) => t.id === cookieId) ??
  teams.find((t) => t.isPersonal) ??
  teams[0] ??
  null;

// Owners must not regress when console-api is down: their own wallet's licenses.
const fallbackTeam = (user: IUserSession): TeamSummary => ({
  id: 'personal-fallback',
  name: 'Your team',
  companyName: null,
  role: 'OWNER',
  ownerUserId: '',
  ownerEmail: user.email,
  ownerAddress: user.smartContractAddress,
  isPersonal: true,
});

export const TeamProvider = ({ children }: PropsWithChildren) => {
  const { currentUser } = useGlobalAccount();
  const { identifyUser, trackEvent } = useMixPanel();
  const queryClient = useQueryClient();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamsUnavailable, setTeamsUnavailable] = useState(false);

  const activeTeam = useMemo(() => {
    // No list (console-api down) or an empty one: the user's own wallet, as
    // before teams existed, so license lists don't wait for an owner forever.
    if (teamsUnavailable || (!isLoading && teams.length === 0))
      return currentUser ? fallbackTeam(currentUser) : null;
    return teams.find((t) => t.id === activeId) ?? null;
  }, [teams, activeId, teamsUnavailable, isLoading, currentUser]);

  useSignerRegistration(
    (activeTeam && !activeTeam.isPersonal ? activeTeam : teams.find((t) => !t.isPersonal))
      ?.ownerEmail ?? null,
  );

  const fetchTeams = useCallback(async (): Promise<TeamSummary[] | null> => {
    const result = await listMyTeams();
    return result.ok ? result.data.teams : null;
  }, []);

  const switchTeam = useCallback(
    (teamId: string, via: 'switcher' | 'invite' = 'switcher') => {
      trackEvent('Team Switched', { teamId, via });
      setActiveTeamCookie(teamId);
      hardNavigate('/app');
    },
    [trackEvent],
  );

  const reportRemoved = useCallback(() => {
    if (!activeTeam || activeTeam.isPersonal) return;
    const personal = teams.find((t) => t.isPersonal);
    flashAfterReload({ tone: 'error', message: removedFromTeam(activeTeam.name) });
    if (personal) setActiveTeamCookie(personal.id);
    else clearActiveTeamCookie();
    hardNavigate('/app');
  }, [activeTeam, teams]);

  // First load: the flash from the previous page, then the teams.
  useEffect(() => {
    const flash = getFromSession<Flash>(FLASH_KEY);
    if (flash) {
      removeFromSession(FLASH_KEY);
      if (flash.tone === 'error') toast.error(flash.message);
      else toast.success(flash.message);
    }
    let cancelled = false;
    void (async () => {
      const loaded = await fetchTeams();
      if (cancelled) return;
      if (!loaded) {
        clearActiveTeamCookie();
        setTeamsUnavailable(true);
        setIsLoading(false);
        toast.error(TEAMS_UNAVAILABLE);
        return;
      }
      setTeams(loaded);
      const cookieId = getActiveTeamCookie();
      const active = pickActive(loaded, cookieId);
      if (cookieId && active?.id !== cookieId) {
        // The cookie names a team this user is no longer in. /api/my/teams
        // ignores X-Team-Id (C7), so the list above is trustworthy.
        const last = getFromLocalStorage<{ id: string; name: string }>(LAST_TEAM_KEY);
        flashAfterReload({
          tone: 'error',
          message: removedFromTeam(last?.id === cookieId ? last.name : 'that team'),
        });
        if (active) setActiveTeamCookie(active.id);
        else clearActiveTeamCookie();
        hardNavigate('/app');
        return;
      }
      if (active) saveToLocalStorage(LAST_TEAM_KEY, { id: active.id, name: active.name });
      setActiveId(active?.id ?? null);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per page load; switching teams reloads the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // $role for Mixpanel comes from the active team once it is known.
  useEffect(() => {
    if (!currentUser || !activeTeam) return;
    identifyUser(currentUser.smartContractAddress, {
      $role: activeTeam.role,
      $team: activeTeam.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.smartContractAddress, activeTeam?.id]);

  // Removed while away: re-check when the tab becomes visible or focused.
  useEffect(() => {
    if (!activeTeam || activeTeam.isPersonal) return;
    const recheck = async () => {
      if (document.visibilityState === 'hidden') return;
      const loaded = await fetchTeams();
      if (loaded && !loaded.some((t) => t.id === activeTeam.id)) reportRemoved();
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [activeTeam, fetchTeams, reportRemoved]);

  // Removed mid-session: any team-scoped query that fails with NOT_A_MEMBER.
  useEffect(
    () =>
      queryClient.getQueryCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return;
        const error = event.action.error;
        if (error instanceof TeamApiError && error.code === 'NOT_A_MEMBER') reportRemoved();
      }),
    [queryClient, reportRemoved],
  );

  const value = useMemo(
    () => ({
      teams,
      activeTeam,
      isLoading,
      teamsUnavailable,
      isOwner: activeTeam?.role === 'OWNER' && !!activeTeam.ownerAddress,
      isMember: activeTeam?.role === 'MEMBER',
      ownerAddress: activeTeam?.ownerAddress ?? null,
      switchTeam,
      refreshTeams: async () => {
        const loaded = await fetchTeams();
        if (loaded) setTeams(loaded);
      },
      reportRemoved,
      flashAfterReload,
    }),
    [teams, activeTeam, isLoading, teamsUnavailable, switchTeam, fetchTeams, reportRemoved],
  );

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

`src/hoc/index.ts`: add `export * from './TeamProvider';`. `src/hooks/index.ts`: add `export * from './useTeam';`.

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

`src/types/user.ts`: delete `role: TeamRoles;` from `IUserSession`. Keep the `TeamRoles` import until Task 13, because `IUser.role` uses it.

`src/hoc/GlobalAccountProvider.tsx`:
- Delete `role: TeamRoles.OWNER,` from the `user` object in `loadUserSession`, and `import { TeamRoles } from '@/types/team';`.
- Change the `identifyUser` call to omit `$role` (`{ $email: email, $subOrganizationId: subOrganizationId }`). `TeamProvider` sets `$role` once the active team is known.

`src/components/AccountInfoButton/AccountInfoButton.tsx`: the account info modal shows the user's own wallet, so anyone may open it.

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

`src/components/CreditsWidget/CreditsWidget.tsx`: the balance is the user's own wallet, which means nothing inside someone else's team; Account info (large variant) stays.
- Replace the `isCollaborator`/`isOwner` imports with `import { useTeam } from '@/hooks/useTeam';`.
- Add `const { isMember } = useTeam();`.
- Delete `if (isCollaborator(currentUser?.role ?? '')) return;` and the commented-out `isOwner(currentUser?.role …)` blocks.
- Make the effect `if (!currentUser || isMember) return;` with dependencies `[currentUser, isMember]`.
- In the large branch, wrap the balance block (the `flex flex-col gap-4` div holding `WalletIcon`, the metric and `Current Balance`) in `{!isMember && ( … )}`. Keep `<AccountInfoButton variant="button" />`.
- Directly before the small variant's `return (`, add `if (isMember) return null;`.

`src/app/settings/components/TeamManagement/TeamManagement.tsx` (deleted in Task 13; keep it compiling): replace the `isOwner` import and `useGlobalAccount` use with `const { isOwner } = useTeam();` (`import { useTeam } from '@/hooks/useTeam';`), and `isOwner(currentUser!.role) &&` with `isOwner &&`.

`src/utils/user.ts`: delete `isOwner`, `isCollaborator` and the `TeamRoles` import.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx jest __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/components/CreditsWidget.test.tsx __tests__/unit/components/Header.test.tsx __tests__/unit/utils/usert.test.ts && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/context/TeamContext.ts src/hoc/TeamProvider.tsx src/hooks/useTeam.ts src/hooks/useSignerRegistration.ts src/utils/hardNavigate.ts src/utils/inviteErrors.ts src/hoc/index.ts src/hooks/index.ts src/layouts/AuthorizedLayout/AuthorizedLayout.tsx src/types/user.ts src/hoc/GlobalAccountProvider.tsx src/components/AccountInfoButton/AccountInfoButton.tsx src/components/CreditsWidget/CreditsWidget.tsx src/app/settings/components/TeamManagement/TeamManagement.tsx src/utils/user.ts __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/components/CreditsWidget.test.tsx
git commit -m "feat(teams): TeamProvider with owner fallback, switching and removal detection"
```

---

### Task 5: "Join {team} owned by {owner}?": invite acceptance after sign-in or sign-up

**Files:**

- Create: `src/components/PendingInvite/PendingInvite.tsx`, `src/components/PendingInvite/index.ts`
- Modify: `src/hoc/TeamProvider.tsx` (render `PendingInvite` once the teams have loaded)
- Test: `__tests__/unit/components/PendingInvite.test.tsx`, `__tests__/unit/hoc/inviteOrdering.test.ts`

**Interfaces:**

- Consumes: `previewPendingInvite` and `acceptPendingInvite` (Task 3); `inviteErrorMessage`, `flashAfterReload` and `switchTeam` (Task 4); `useMixPanel`.
- Produces: `<PendingInvite onJoined={(team) => …} />`, which renders nothing without a pending invite.
- **Ordering:** `PendingInvite` lives only inside `TeamProvider`, which only `AuthorizedLayout` mounts.
  - An invitee with no account goes through sign-in, sign-up and the company step on guest pages first. The middleware sends anyone not yet compliant to `/sign-up?flow=…`, so they can't reach `AuthorizedLayout` before then.
  - The HttpOnly cookie (1 day) survives the whole flow, because nothing on the way deletes it.
- **"Not now"** closes the dialog without deleting the cookie (C4: only success or a terminal error deletes it), so the question comes back on a later page.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/components/PendingInvite.test.tsx`:

```tsx
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/invites', () => ({
  previewPendingInvite: jest.fn(),
  acceptPendingInvite: jest.fn(),
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';
import { toast } from 'sonner';
import { PendingInvite } from '@/components/PendingInvite';

const PREVIEW = { teamName: 'Acme Mobility', ownerEmail: 'ops@acme.dev', expiresAt: '2026-10-09T00:00:00Z' };
const TEAM = {
  id: 'team-joined',
  name: 'Acme Mobility',
  companyName: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'u',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a',
  isPersonal: false,
};

// Resolves once the component has handled preview call n (0-based): its
// continuation was queued on the same promise before ours.
const previewHandled = async (n: number) => {
  await waitFor(() => expect(previewPendingInvite).toHaveBeenCalledTimes(n + 1));
  await act(async () => {
    await (previewPendingInvite as jest.Mock).mock.results[n].value;
  });
};

describe('PendingInvite', () => {
  it('renders nothing without a pending invite', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue(null);
    const { container } = render(<PendingInvite onJoined={jest.fn()} />);
    await previewHandled(0);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks before joining and hands the accepted team (MEMBER, not personal) to onJoined', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue({ ok: true, data: PREVIEW });
    (acceptPendingInvite as jest.Mock).mockResolvedValue({ ok: true, data: { team: TEAM } });
    const onJoined = jest.fn();
    render(<PendingInvite onJoined={onJoined} />);
    expect(await screen.findByText('Join Acme Mobility owned by ops@acme.dev?')).toBeInTheDocument();
    expect(acceptPendingInvite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Join team' }));
    await waitFor(() => expect(onJoined).toHaveBeenCalledWith(TEAM));
    expect(onJoined.mock.calls[0][0]).toMatchObject({ id: 'team-joined', role: 'MEMBER', isPersonal: false });
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Accepted', { teamId: 'team-joined' });
  });

  it('closes on "Not now" without accepting', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValue({ ok: true, data: PREVIEW });
    render(<PendingInvite onJoined={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    expect(screen.queryByText('Join Acme Mobility owned by ops@acme.dev?')).toBeNull();
    expect(acceptPendingInvite).not.toHaveBeenCalled();
  });

  it('explains a terminal error and stays quiet on a network failure', async () => {
    (previewPendingInvite as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      code: 'INVITE_EMAIL_MISMATCH',
      message: 'x',
    });
    const { unmount } = render(<PendingInvite onJoined={jest.fn()} />);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'This invite was sent to a different email address. Sign in with that address to accept it.',
      ),
    );
    unmount();
    (toast.error as jest.Mock).mockClear();
    (previewPendingInvite as jest.Mock).mockResolvedValueOnce({ ok: false, status: 0, code: null, message: 'x' });
    render(<PendingInvite onJoined={jest.fn()} />);
    await previewHandled(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
```

`__tests__/unit/hoc/inviteOrdering.test.ts`:

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
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    );
const source = (dir: string) => walk(path.join(root, dir)).filter((f) => /\.(ts|tsx)$/.test(f));
const read = (file: string) =>
  fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8');
const rel = (file: string) => path.relative(root, file);

describe('invite acceptance ordering (contracts C4)', () => {
  it('never runs on the guest sign-in or sign-up pages, so it follows the whole sign-up', () => {
    for (const file of [...source('src/app/sign-in'), ...source('src/app/sign-up')]) {
      expect(read(file)).not.toMatch(
        /AuthorizedLayout|TeamProvider|withTeams|PendingInvite|actions\/invites/,
      );
    }
    expect(read('src/layouts/AuthorizedLayout/AuthorizedLayout.tsx')).toMatch(/withTeams\(/);
    expect(read('src/hoc/TeamProvider.tsx')).toMatch(/<PendingInvite/);
  });

  it('keeps the HttpOnly invite token server-side and deletes it only where C4 allows', () => {
    const users = source('src')
      .filter((f) => read(f).includes('INVITE_TOKEN_COOKIE'))
      .map(rel)
      .sort();
    expect(users).toEqual([
      'src/actions/invites.ts',
      'src/actions/user.ts',
      'src/utils/inviteCookie.ts',
      'src/utils/teamCookies.ts',
    ]);
    for (const file of users) expect(read(file)).not.toMatch(/^'use client'/m);
    const deleters = source('src')
      .filter((f) => /delete\(INVITE_TOKEN_COOKIE\)/.test(read(f)))
      .map(rel)
      .sort();
    expect(deleters).toEqual(['src/actions/invites.ts', 'src/actions/user.ts']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/components/PendingInvite.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts`
Expected: FAIL. `PendingInvite` is missing, and `TeamProvider` doesn't render it.

- [ ] **Step 3: Implement**

`src/components/PendingInvite/PendingInvite.tsx`:

```tsx
'use client';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';
import { useMixPanel } from '@/hooks/useMixPanel';
import { inviteErrorMessage } from '@/utils/inviteErrors';
import type { InvitePreview, TeamSummary } from '@/types/team';

const explain = (code: string | null, status: number) => {
  // A network failure keeps the cookie; a later page asks again.
  if (status === 0) return;
  if (code === 'ALREADY_MEMBER') toast("You're already a member of this team.");
  else toast.error(inviteErrorMessage(code));
};

// A pending invite (HttpOnly cookie, contracts C4) is accepted only after the
// user confirms which team and owner they are joining.
export const PendingInvite: FC<{ onJoined: (team: TeamSummary) => void }> = ({ onJoined }) => {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const { trackEvent } = useMixPanel();

  useEffect(() => {
    void (async () => {
      const result = await previewPendingInvite();
      if (!result) return;
      if (result.ok) setPreview(result.data);
      else explain(result.code, result.status);
    })();
  }, []);

  const join = async () => {
    setBusy(true);
    const result = await acceptPendingInvite();
    setBusy(false);
    setPreview(null);
    if (!result) return;
    if (result.ok) {
      trackEvent('Team Invite Accepted', { teamId: result.data.team.id });
      onJoined(result.data.team);
      return;
    }
    explain(result.code, result.status);
  };

  if (!preview) return null;
  return (
    <Modal
      isOpen
      setIsOpen={(open) => {
        if (!open && !busy) setPreview(null);
      }}
      showClose={!busy}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pr-8">
          <Title component="h3" className="text-panel-title">
            {`Join ${preview.teamName} owned by ${preview.ownerEmail}?`}
          </Title>
          <p className="text-body-sm text-muted">
            You&apos;ll see the team&apos;s licenses. The owner decides whether you also get
            data access.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={join} loading={busy}>
            Join team
          </Button>
          <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>
            Not now
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

`src/components/PendingInvite/index.ts`:

```ts
export * from './PendingInvite';
```

`src/hoc/TeamProvider.tsx`:
- Add `import { PendingInvite } from '@/components/PendingInvite';`.
- Replace the provider's return with:

```tsx
  return (
    <TeamContext.Provider value={value}>
      {children}
      {!isLoading && !teamsUnavailable && (
        <PendingInvite
          onJoined={(team) => {
            // The accepted team (always MEMBER) becomes active by its id.
            flashAfterReload({ tone: 'success', message: `You joined ${team.name}` });
            switchTeam(team.id, 'invite');
          }}
        />
      )}
    </TeamContext.Provider>
  );
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/components/PendingInvite.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts __tests__/unit/hoc/TeamProvider.test.tsx`
Expected: PASS. `TeamProvider.test.tsx` needs one extra mock now; add it at the top of that file:
`jest.mock('@/components/PendingInvite', () => ({ PendingInvite: () => null }));`

- [ ] **Step 5: Commit**

```bash
git add src/components/PendingInvite src/hoc/TeamProvider.tsx __tests__/unit/components/PendingInvite.test.tsx __tests__/unit/hoc/inviteOrdering.test.ts __tests__/unit/hoc/TeamProvider.test.tsx
git commit -m "feat(teams): confirm before joining a team from an invite link"
```

---

### Task 6: Register the user's Turnkey wallet as their signer (C6)

**Files:**

- Create: `src/utils/signerProof.ts`, `src/services/turnkeyAccount.ts`
- Modify: `src/hooks/useSignerRegistration.ts` (replace the placeholder), `src/config/teamCopy.ts` (the C8 copy for `SIGNER_IN_USE`)
- Test: `__tests__/unit/utils/signerProof.test.ts`, `__tests__/unit/hooks/useSignerRegistration.test.tsx`

**Interfaces:**

- Consumes:
  - `registerSigner` (Task 2) and `signerLocked` (Task 1);
  - `useGlobalAccount().validateCurrentSession`;
  - `getSessionTurnkeyClient` (`src/services/turnkey.ts`), reached only through a lazy `await import('@/services/turnkeyAccount')`, so `src/config/turnkey.ts` isn't evaluated by modules that merely import the hook.
- Produces:
  - `buildSignerProofMessage({ eoa, kernelAddress, issuedAt }): string`.
  - `getSessionEoaAccount(session): Promise<LocalAccount>`: the Turnkey EOA, not the kernel.
  - `signerRegisteredKey(eoa)`.
  - `useSignerRegistration(lockOwnerEmail: string | null): void`.
    - It registers once per browser session per wallet.
    - On `409 SIGNER_LOCKED` it shows `Your access is tied to another wallet. Ask {ownerEmail} to revoke it first.`
    - On `409 SIGNER_IN_USE` it shows `SIGNER_IN_USE_MESSAGE`.
    - It doesn't retry either one this session.
  - `SIGNER_IN_USE_MESSAGE` in `@/config/teamCopy`.

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
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock('@sentry/nextjs', () => ({ captureMessage: jest.fn(), captureException: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import { registerSigner } from '@/actions/teams';
import { toast } from 'sonner';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { signerRegisteredKey, useSignerRegistration } from '@/hooks/useSignerRegistration';
import { SIGNER_IN_USE_MESSAGE } from '@/config/teamCopy';

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
const refused = (code: string) => ({ ok: false, status: 409, code, message: 'x' });

describe('useSignerRegistration', () => {
  beforeEach(() => sessionStorage.clear());

  it('signs the C6 message with the EOA and registers it once per session', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    const { rerender } = renderHook(() => useSignerRegistration(null), { wrapper });
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
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).not.toBeNull();
    rerender();
    expect(registerSigner).toHaveBeenCalledTimes(1);
  });

  it('explains SIGNER_LOCKED with the C8 copy and does not retry this session', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_LOCKED'));
    renderHook(() => useSignerRegistration('ops@acme.dev'), { wrapper });
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Your access is tied to another wallet. Ask ops@acme.dev to revoke it first.',
      ),
    );
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).not.toBeNull();
  });

  it('explains SIGNER_IN_USE', async () => {
    (registerSigner as jest.Mock).mockResolvedValue(refused('SIGNER_IN_USE'));
    renderHook(() => useSignerRegistration(null), { wrapper });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SIGNER_IN_USE_MESSAGE));
  });

  it('retries on a later session after any other refusal', async () => {
    (registerSigner as jest.Mock).mockResolvedValue({ ok: false, status: 400, code: 'SIGNER_PROOF_INVALID', message: 'x' });
    renderHook(() => useSignerRegistration(null), { wrapper });
    // The refusal is handled (reported) before the negative checks run.
    await waitFor(() =>
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Signer proof refused: SIGNER_PROOF_INVALID'),
    );
    expect(sessionStorage.getItem(signerRegisteredKey(SESSION.walletAddress))).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/signerProof.test.ts __tests__/unit/hooks/useSignerRegistration.test.tsx`
Expected: FAIL. `signerProof` is missing, and the placeholder never registers.

- [ ] **Step 3: Implement**

Append to `src/config/teamCopy.ts` (contracts index C8, "Wallet already used as another key"):

```ts

// 409 SIGNER_IN_USE on PUT /api/me/signer: the wallet is another user's signer
// or an API key (C8).
export const SIGNER_IN_USE_MESSAGE =
  "This wallet is already recorded as someone else's key, so it can't be used for data access. Contact DIMO support.";
```

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
// account cannot sign for a license. Import this lazily (await import): it
// pulls src/config/turnkey.ts, which needs the Turnkey env at module load.
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
import { useEffect, useRef } from 'react';
import { getAddress } from 'viem';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { registerSigner } from '@/actions/teams';
import { buildSignerProofMessage } from '@/utils/signerProof';
import { getFromSession, saveToSession } from '@/utils/sessionStorage';
import { SIGNER_IN_USE_MESSAGE, signerLocked } from '@/config/teamCopy';

export const signerRegisteredKey = (eoa: string) => `signerRegistered:${eoa.toLowerCase()}`;

// Tells console-api which EOA this user signs with (contracts C6), so an owner
// can grant it data access. Once per browser session per wallet; a refusal
// other than the two 409s is retried on the next session.
export const useSignerRegistration = (lockOwnerEmail: string | null): void => {
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const wallet = currentUser?.walletAddress;
  // The teams load after this starts; read the owner at toast time.
  const lockOwner = useRef(lockOwnerEmail);
  lockOwner.current = lockOwnerEmail;

  useEffect(() => {
    if (!wallet) return;
    const key = signerRegisteredKey(wallet);
    if (getFromSession<unknown>(key)) return;
    let cancelled = false;
    void (async () => {
      try {
        const session = await validateCurrentSession();
        if (!session || cancelled) return;
        const { getSessionEoaAccount } = await import('@/services/turnkeyAccount');
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
        if (result.ok) return saveToSession(key, 'done');
        if (result.code === 'SIGNER_LOCKED' || result.code === 'SIGNER_IN_USE') {
          saveToSession(key, 'blocked');
          toast.error(
            result.code === 'SIGNER_LOCKED'
              ? signerLocked(lockOwner.current ?? 'the team owner')
              : SIGNER_IN_USE_MESSAGE,
          );
          return;
        }
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
git add src/utils/signerProof.ts src/services/turnkeyAccount.ts src/hooks/useSignerRegistration.ts src/config/teamCopy.ts __tests__/unit/utils/signerProof.test.ts __tests__/unit/hooks/useSignerRegistration.test.tsx
git commit -m "feat(teams): register the user's Turnkey wallet as their license signer"
```

---

### Task 7: Team switcher, member navigation and Home shortcuts

**Files:**

- Create: `src/components/TeamSwitcher/TeamSwitcher.tsx`, `src/components/TeamSwitcher/index.ts`
- Modify: `src/components/Menu/Menu.tsx`, `src/config/navigation.ts`, `src/app/app/list/components/View/View.tsx`
- Test: `__tests__/unit/components/TeamSwitcher.test.tsx`, `__tests__/unit/config/navigation.test.ts` (extend), `__tests__/unit/pages/app/HomeShortcuts.test.tsx`

**Interfaces:**

- Consumes: `useTeam()` (Task 4) and `TEAM_DATA_ACCESS_ENABLED` (Task 1).
- Produces:
  - `<TeamSwitcher collapsed?: boolean />`, which renders nothing with fewer than two teams.
  - `getNavSections(includeConnections?, options?: { isMember?: boolean; dataAccessEnabled?: boolean })`. Members don't get Webhooks or Connections (owner-only, Task 9), and get Vehicles only when data access is enabled (C5).
  - The same filter on the Home shortcut grid, as `visibleShortcuts(isMember, dataAccessEnabled)`.

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
const switchTeam = jest.fn();

describe('TeamSwitcher', () => {
  it('renders nothing for a single team', () => {
    (useTeam as jest.Mock).mockReturnValue({ teams: [PERSONAL], activeTeam: PERSONAL, switchTeam });
    const { container } = render(<TeamSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the teams with roles and switches on pick', () => {
    (useTeam as jest.Mock).mockReturnValue({ teams: [PERSONAL, ACME], activeTeam: PERSONAL, switchTeam });
    render(<TeamSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'Team: Harness Motors. Switch team' }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByText('Acme Mobility'));
    expect(switchTeam).toHaveBeenCalledWith('t2');
  });

  it('does not reload when the active team is picked again', () => {
    (useTeam as jest.Mock).mockReturnValue({ teams: [PERSONAL, ACME], activeTeam: ACME, switchTeam });
    render(<TeamSwitcher collapsed />);
    fireEvent.click(screen.getByRole('button', { name: 'Team: Acme Mobility. Switch team' }));
    fireEvent.click(screen.getAllByRole('option')[1].querySelector('button')!);
    expect(switchTeam).not.toHaveBeenCalled();
  });
});
```

Append to `__tests__/unit/config/navigation.test.ts`, inside the existing `describe` (the test name has an apostrophe, so it uses double quotes):

```ts
  it("hides owner-only pages from members of someone else's team", () => {
    const item = (label: string, options: { isMember?: boolean; dataAccessEnabled?: boolean }) =>
      getNavSections(true, options)
        .find((s) => s.label === 'Workspace')!
        .items.find((i) => i.label === label);
    expect(item('Webhooks', { isMember: true })?.hidden).toBe(true);
    expect(item('Connections', { isMember: true })?.hidden).toBe(true);
    expect(item('Webhooks', {})?.hidden).toBeFalsy();
    expect(item('Connections', {})?.hidden).toBeFalsy();
  });

  it('shows members Vehicles only while team data access is enabled (C5)', () => {
    const vehicles = (options: { isMember?: boolean; dataAccessEnabled?: boolean }) =>
      getNavSections(true, options)
        .find((s) => s.label === 'Workspace')!
        .items.find((i) => i.label === 'Vehicles');
    expect(vehicles({ isMember: true, dataAccessEnabled: false })?.hidden).toBe(true);
    expect(vehicles({ isMember: true, dataAccessEnabled: true })?.hidden).toBeFalsy();
    expect(vehicles({ isMember: false, dataAccessEnabled: false })?.hidden).toBeFalsy();
  });
```

`__tests__/unit/pages/app/HomeShortcuts.test.tsx`:

```tsx
import { visibleShortcuts } from '@/app/app/list/components/View/View';

const hrefs = (isMember: boolean, dataAccessEnabled: boolean) =>
  visibleShortcuts(isMember, dataAccessEnabled).map((s) => s.href);

describe('Home shortcuts', () => {
  it('shows owners every shortcut', () => {
    expect(hrefs(false, false)).toEqual(['/licenses', '/connections', '/webhooks', '/vehicles']);
  });

  it('hides owner-only pages from members, and Vehicles while data access is off', () => {
    expect(hrefs(true, true)).toEqual(['/licenses', '/vehicles']);
    expect(hrefs(true, false)).toEqual(['/licenses']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx`
Expected: FAIL. `TeamSwitcher` and `visibleShortcuts` are missing, and nothing is hidden.

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
            <ChevronUpDownIcon aria-hidden="true" className="size-4 flex-shrink-0 text-muted" />
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
                    className={cn('text-label', selected ? 'text-selected-fg/75' : 'text-muted')}
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

`src/config/navigation.ts`:
- Change the signature to:

```ts
export const getNavSections = (
  includeConnections: boolean = true,
  {
    isMember = false,
    dataAccessEnabled = false,
  }: { isMember?: boolean; dataAccessEnabled?: boolean } = {},
): NavSection[] => [
```

- In the Vehicles item, after `disabled: false,`, add:

```ts
        // Members read Vehicles through their own wallet, which needs the
        // platform signer check (contracts C5).
        hidden: isMember && !dataAccessEnabled,
```

- In the Webhooks item, and in the Connections item inside the `includeConnections` spread, after `disabled: false,` add:

```ts
        // Owner-only (Task 9): a member's webhook outlives their membership,
        // and connection keys are secrets.
        hidden: isMember,
```

`src/components/Menu/Menu.tsx`:
- Add these imports:

```ts
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { useTeam } from '@/hooks/useTeam';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
```

- In the component, add `const { isMember } = useTeam();`, and change `const sections = getNavSections(licensesLoading || hasDeveloperLicenses);` to:

```ts
  const sections = getNavSections(licensesLoading || hasDeveloperLicenses, {
    isMember,
    dataAccessEnabled: TEAM_DATA_ACCESS_ENABLED,
  });
```

- Insert `<TeamSwitcher collapsed={isSidebarCollapsed} />` directly after the closing `</div>` of the `{/* Logo */}` row.

`src/app/app/list/components/View/View.tsx`:
- After the `shortcuts` array, add:

```ts
// Members don't manage connections or webhooks (owner-only), and read
// Vehicles only while team data access is enabled (contracts C5).
export const visibleShortcuts = (isMember: boolean, dataAccessEnabled: boolean) =>
  shortcuts.filter((shortcut) => {
    if (!isMember) return true;
    if (shortcut.href === '/vehicles') return dataAccessEnabled;
    return shortcut.href !== '/connections' && shortcut.href !== '/webhooks';
  });
```

- In `View`, add `const { isMember } = useTeam();`, then render `visibleShortcuts(isMember, TEAM_DATA_ACCESS_ENABLED).map(` instead of `shortcuts.map(`.
- Import `useTeam` from `@/hooks/useTeam` and `TEAM_DATA_ACCESS_ENABLED` from `@/utils/featureFlags`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx __tests__/unit/components/Menu.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TeamSwitcher src/components/Menu/Menu.tsx src/config/navigation.ts src/app/app/list/components/View/View.tsx __tests__/unit/components/TeamSwitcher.test.tsx __tests__/unit/config/navigation.test.ts __tests__/unit/pages/app/HomeShortcuts.test.tsx
git commit -m "feat(teams): sidebar team switcher; members see only what they may use"
```

---

### Task 8: List the active team's licenses, and owner checks against the team

**Files:**

- Modify: `src/types/webhook.ts` (`LocalDeveloperLicense`: tolerant input, plus `tokenId`, `owner` and `hasSigner`)
- Modify: `src/components/Webhooks/hooks/useValidDeveloperLicenses.ts` (team owner; adds `tokenId owner signers`)
- Modify: `src/hooks/useHasDeveloperLicenses.ts`, `src/app/licenses/page.tsx`, `src/hooks/useIsLicenseOwner.ts`
- Modify: `src/app/license/list/LicenseList.tsx` (members get no Create button and their own empty state)
- Modify: `src/app/vehicles/components/VehiclesView.tsx` (a member's empty state never offers to create a license)
- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx` (`handleOwnerSigner` runs only for the owner)
- Regenerate: `src/gql/*` (`npm run compile`)
- Test: `__tests__/unit/hooks/useIsLicenseOwner.test.tsx`, `__tests__/unit/hooks/useValidDeveloperLicenses.test.tsx`, `__tests__/unit/types/localDeveloperLicense.test.ts`, `__tests__/unit/pages/license/LicenseList.test.tsx`, `__tests__/unit/pages/vehicles/VehiclesView.test.tsx` (extend)

**Interfaces:**

- Consumes: `useTeam()`.
- Produces:
  - `LocalDeveloperLicense#tokenId: number | null`, `#owner: string | null`, and `#hasSigner(address?)`, which is case-insensitive.
  - `useValidDeveloperLicenses()` has the same shape as before; `loading` stays true until the team owner is known.
  - `useIsLicenseOwner(license)` is true only when the user's wallet owns the license *and* the active team is the user's own, or teams are still loading.

`VehiclesView`, `VehiclePage` and the webhooks page read licenses through `useValidDeveloperLicenses`, so they follow the active team with no edits beyond VehiclesView's empty state.

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
const KERNEL_UPPER = '0x7A3C9E1F2B4D6A8C0E1F3A5B7C9D1E2F4A6B8C0D';
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
    inTeam('OWNER', KERNEL_UPPER);
    expect(renderHook(() => useIsLicenseOwner({ owner: KERNEL_UPPER })).result.current).toBe(true);
  });

  it("is false for a member looking at the team owner's license", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    expect(renderHook(() => useIsLicenseOwner({ owner: ACME })).result.current).toBe(false);
  });

  it("is false for the user's own license while working in another team", () => {
    asUser(KERNEL);
    inTeam('MEMBER', ACME);
    expect(renderHook(() => useIsLicenseOwner({ owner: KERNEL })).result.current).toBe(false);
  });

  it('trusts the wallet while teams are still loading', () => {
    asUser(KERNEL);
    inTeam(null);
    expect(renderHook(() => useIsLicenseOwner({ owner: KERNEL })).result.current).toBe(true);
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
    (useTeam as jest.Mock).mockReturnValue({ isMember: false, activeTeam: { name: 'Harness Motors' } });
    render(<LicenseList licenseConnection={{ nodes: [{}] } as never} />);
    expect(screen.getByText('Your developer licenses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a license' })).toBeInTheDocument();
  });

  it("shows members the team's licenses without a create button", () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true, activeTeam: { name: 'Acme Mobility' } });
    render(<LicenseList licenseConnection={{ nodes: [] } as never} />);
    expect(screen.getByText('Acme Mobility licenses')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a license' })).toBeNull();
    expect(screen.getByText('This team has no developer licenses yet')).toBeInTheDocument();
  });
});
```

Extend `__tests__/unit/pages/vehicles/VehiclesView.test.tsx`:
- Add `jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn(() => ({ isMember: false })) }));` beside the other mocks.
- Add `import { useTeam } from '@/hooks/useTeam';`.
- Append this test:

```tsx
  it("never offers a member to create a license on an empty team", () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    (useValidDeveloperLicenses as jest.Mock).mockReturnValue({ developerLicenses: [], loading: false });
    render(<VehiclesView />);
    expect(screen.getByText('This team has no developer licenses yet.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to licenses' })).toBeNull();
    expect(screen.queryByText(/Create a developer license/)).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/types/localDeveloperLicense.test.ts __tests__/unit/hooks/useIsLicenseOwner.test.tsx __tests__/unit/pages/license/LicenseList.test.tsx __tests__/unit/pages/vehicles/VehiclesView.test.tsx`
Expected: FAIL. The getters are missing, the member is treated as owner, the list always offers Create, and the empty state invites members to create a license. The `useValidDeveloperLicenses` test can only run after Step 4's codegen.

- [ ] **Step 3: Implement**

`src/types/webhook.ts`: replace the `LocalDeveloperLicense` class.

```ts
// Old call sites and tests build licenses from alias, clientId and redirect
// URIs only; the team fields are optional so they keep working.
type LicenseInput = Pick<DeveloperLicenseForWebhook, 'alias' | 'clientId' | 'redirectURIs'> &
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

`src/hooks/useHasDeveloperLicenses.ts`: replace the hook body (the query is unchanged).

```ts
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

Import `useTeam` from `@/hooks/useTeam` there, and remove the unused `useGlobalAccount` import.

`src/app/licenses/page.tsx`: replace `LicensesView` (with `import { useTeam } from '@/hooks/useTeam';` in place of `useGlobalAccount`).

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

`src/app/license/list/LicenseList.tsx`: add `import { useTeam } from '@/hooks/useTeam';` and replace the return.

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
          <p className="text-card-title text-ink">This team has no developer licenses yet</p>
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

`src/app/vehicles/components/VehiclesView.tsx`: import `useTeam`, add `const { isMember } = useTeam();` in `Content`, and replace the zero-license block with:

```tsx
  if (!loading && developerLicenses.length === 0) {
    return (
      <Section>
        {isMember ? (
          <p className="text-body text-fg">This team has no developer licenses yet.</p>
        ) : (
          <>
            <p className="text-body text-fg">
              Create a developer license to see the vehicles shared with it.
            </p>
            <Link href="/licenses" className="text-body-sm text-ink underline">
              Go to licenses
            </Link>
          </>
        )}
      </Section>
    );
  }
```

`src/app/license/[tokenId]/details/components/Signers/Signers.tsx`: `handleOwnerSigner` enables the user's console key, which only the license owner's wallet can do. Replace the effect

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
Expected: codegen rewrites `src/gql/gql.ts` and `src/gql/graphql.ts`, every listed suite passes, and `tsc` reports nothing new. `npm run compile` needs network access to `https://identity-api.dev.dimo.zone/query`.

- [ ] **Step 5: Commit**

```bash
git add src/types/webhook.ts src/components/Webhooks/hooks/useValidDeveloperLicenses.ts src/hooks/useHasDeveloperLicenses.ts src/app/licenses/page.tsx src/hooks/useIsLicenseOwner.ts src/app/license/list/LicenseList.tsx src/app/vehicles/components/VehiclesView.tsx "src/app/license/[tokenId]/details/components/Signers/Signers.tsx" src/gql __tests__/unit/types/localDeveloperLicense.test.ts __tests__/unit/hooks/useIsLicenseOwner.test.tsx __tests__/unit/hooks/useValidDeveloperLicenses.test.tsx __tests__/unit/pages/license/LicenseList.test.tsx __tests__/unit/pages/vehicles/VehiclesView.test.tsx
git commit -m "feat(teams): list the active team's licenses and check ownership against the team"
```

---

### Task 9: Owner-only UI

**Files:**

- Create: `src/components/OwnerOnly/OwnerOnly.tsx` (page gate), `src/components/OwnerOnly/OwnerAction.tsx` (inline gate), `src/components/OwnerOnly/index.ts`
- Delete and recreate: `src/app/webhooks/layout.ts` becomes `src/app/webhooks/layout.tsx`; delete `src/app/connections/layout.ts` and rewrite `src/app/connections/layout.tsx`
- Modify: `src/app/connections/components/View/View.tsx` (Create a connection)
- Modify: `src/app/license/[tokenId]/configurator/components/ListView/ListView.tsx` (New configuration), `src/app/license/[tokenId]/configurator/components/ConfigurationList/ConfigurationList.tsx` (Delete, and "Create your first configuration"), `src/app/license/[tokenId]/configurator/new/page.tsx` (the whole page), `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ConfigurationForm.tsx` and `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ConfigurationForm.tsx` (Save)
- Create: `src/app/license/[tokenId]/details/components/View/OverviewQuickActions.tsx`; Modify: `src/app/license/[tokenId]/details/components/View/View.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx` (vehicle simulator, Configure sharing)
- Modify: `src/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants.tsx` and `VehicleDetailsTable.tsx` (Renounce)
- Test: `__tests__/unit/components/OwnerOnly.test.tsx`, `__tests__/unit/configurator/ConfigurationListMember.test.tsx`, `__tests__/unit/pages/license/details/OverviewQuickActions.test.tsx`, `__tests__/unit/pages/license/details/VehiclesTab.test.tsx`, `__tests__/unit/pages/license/vehicles/columns.test.tsx`

**Interfaces:**

- Consumes: `useTeam().isOwner` and `isMember`, `isLoading` and `activeTeam`. Outside a provider `isOwner` is true, so existing suites are unaffected.
- Produces:
  - `<OwnerOnly feature="Webhooks" | "Connections" | "Configurations">`: children for owners, a "{feature} are managed by the team owner" card for members, a loader while teams load.
  - `<OwnerAction fallback?>`: children only for owners.
  - `buildColumns(…, opts.canRenounce?: boolean)`: no actions column when false.
- **Why each surface:** console-api answers members `403 OWNER_ONLY` on these writes and nulls connection secrets (C7). The UI must not offer what will fail:
  - the vehicle simulator mints from the member's own wallet;
  - Renounce signs from it too;
  - the quick actions lead to owner-only tabs.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/components/OwnerOnly.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { OwnerAction, OwnerOnly } from '@/components/OwnerOnly';

const MEMBER = {
  isLoading: false,
  isOwner: false,
  isMember: true,
  activeTeam: { name: 'Acme Mobility', ownerEmail: 'ops@acme.dev' },
};

describe('OwnerOnly', () => {
  it('renders the page for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isLoading: false, isOwner: true, isMember: false });
    render(<OwnerOnly feature="Webhooks"><p>webhooks table</p></OwnerOnly>);
    expect(screen.getByText('webhooks table')).toBeInTheDocument();
  });

  it.each(['Webhooks', 'Connections', 'Configurations'])(
    'tells members who manages %s and hides the page',
    (feature) => {
      (useTeam as jest.Mock).mockReturnValue(MEMBER);
      render(<OwnerOnly feature={feature}><p>secret page</p></OwnerOnly>);
      expect(screen.queryByText('secret page')).toBeNull();
      expect(
        screen.getByRole('heading', { name: `${feature} are managed by the team owner` }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(`ops@acme\\.dev manages ${feature.toLowerCase()} for Acme Mobility`)),
      ).toBeInTheDocument();
    },
  );

  it('waits for the teams before deciding', () => {
    (useTeam as jest.Mock).mockReturnValue({ isLoading: true, isOwner: false, isMember: false });
    render(<OwnerOnly feature="Connections"><p>secret page</p></OwnerOnly>);
    expect(screen.queryByText('secret page')).toBeNull();
  });
});

describe('OwnerAction', () => {
  it('shows the action to owners and the fallback to members', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    const { rerender } = render(
      <OwnerAction fallback={<p>owner only</p>}>
        <button>Save</button>
      </OwnerAction>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    rerender(
      <OwnerAction fallback={<p>owner only</p>}>
        <button>Save</button>
      </OwnerAction>,
    );
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByText('owner only')).toBeInTheDocument();
  });
});
```

`__tests__/unit/configurator/ConfigurationListMember.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: () => ({ isOwner: false, isLoading: false }) }));
jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  deleteConfiguration: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
import { getConfigurationsByClientId } from '@/actions/configurations';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';

describe('ConfigurationList for members', () => {
  it('lists configurations without Delete', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([
      { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
    ]);
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('My Config')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('never offers to create the first configuration', async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([]);
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);
    expect(await screen.findByText('No configurations yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create your first configuration' })).toBeNull();
  });
});
```

`__tests__/unit/pages/license/details/OverviewQuickActions.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { OverviewQuickActions } from '@/app/license/[tokenId]/details/components/View/OverviewQuickActions';

describe('OverviewQuickActions', () => {
  it('gives owners every quick action', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    render(<OverviewQuickActions tokenId={42} onSelectTab={jest.fn()} />);
    for (const label of ['Generate API key', 'Configure branding', 'Setup vehicle sharing', 'Docs']) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('leaves members only the docs', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    render(<OverviewQuickActions tokenId={42} onSelectTab={jest.fn()} />);
    expect(screen.getByText(/Docs/)).toBeInTheDocument();
    expect(screen.queryByText(/Generate API key/)).toBeNull();
    expect(screen.queryByText(/Configure branding/)).toBeNull();
    expect(screen.queryByText(/Setup vehicle sharing/)).toBeNull();
  });
});
```

`__tests__/unit/pages/license/details/VehiclesTab.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: () => ({ data: { vehicles: { totalCount: 6 } }, loading: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal', () => ({
  VehicleSimulatorModal: () => <button>Vehicle simulator</button>,
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { Vehicles } from '@/app/license/[tokenId]/details/components/Vehicles/Vehicles';

const LICENSE = { clientId: '0xaaa', tokenId: 42 } as never;

describe('license Vehicles tab', () => {
  it("doesn't offer members the simulator, which mints from their own wallet", () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    render(<Vehicles license={LICENSE} />);
    expect(screen.getByRole('button', { name: 'Vehicle list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vehicle simulator' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Configure sharing' })).toBeNull();
  });

  it('keeps both for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    render(<Vehicles license={LICENSE} />);
    expect(screen.getByRole('button', { name: 'Vehicle simulator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure sharing' })).toBeInTheDocument();
  });
});
```

`__tests__/unit/pages/license/vehicles/columns.test.tsx`:

```tsx
import { buildColumns } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';

const ids = (canRenounce?: boolean) =>
  buildColumns(new Set(), jest.fn(), { clientId: '0xaaa', canRenounce }).map(
    (c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey,
  );

describe('vehicle table columns', () => {
  it('offers Renounce (the actions column) only to owners', () => {
    expect(ids(undefined)).toContain('actions');
    expect(ids(true)).toContain('actions');
    expect(ids(false)).not.toContain('actions');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/components/OwnerOnly.test.tsx __tests__/unit/configurator/ConfigurationListMember.test.tsx __tests__/unit/pages/license/details/OverviewQuickActions.test.tsx __tests__/unit/pages/license/details/VehiclesTab.test.tsx __tests__/unit/pages/license/vehicles/columns.test.tsx`
Expected: FAIL. The modules are missing, members see Delete, the simulator and the first-configuration button, and `canRenounce` is ignored.

- [ ] **Step 3: Implement the gates**

`src/components/OwnerOnly/OwnerOnly.tsx`:

```tsx
'use client';
import type { FC, PropsWithChildren } from 'react';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';

// Pages only the team owner may use (console-api answers members 403 OWNER_ONLY
// on their writes and nulls their secrets, contracts C7).
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
      <h2 className="text-card-title text-ink">{feature} are managed by the team owner</h2>
      <p className="max-w-xl text-body-sm text-muted">
        {activeTeam?.ownerEmail} manages {lower} for {activeTeam?.name}. Switch to your own
        team to manage {lower} for your licenses.
      </p>
    </div>
  );
};
```

`src/components/OwnerOnly/OwnerAction.tsx`:

```tsx
'use client';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useTeam } from '@/hooks/useTeam';

// An action only the team owner may take; members see the fallback, if any.
export const OwnerAction: FC<PropsWithChildren<{ fallback?: ReactNode }>> = ({
  children,
  fallback = null,
}) => {
  const { isOwner } = useTeam();
  return <>{isOwner ? children : fallback}</>;
};
```

`src/components/OwnerOnly/index.ts`:

```ts
export * from './OwnerOnly';
export * from './OwnerAction';
```

- [ ] **Step 4: Apply them**

1. **Webhooks.** Run `git rm src/app/webhooks/layout.ts` and create `src/app/webhooks/layout.tsx`:

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

2. **Connections.** The detail page shows `connection_license_private_key` and `device_issuance_key`. Run `git rm src/app/connections/layout.ts`, and replace `src/app/connections/layout.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

export default function ConnectionsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Connections">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
```

   In `src/app/connections/components/View/View.tsx`, wrap the "Create a connection" `<Button …>` in `<OwnerAction>…</OwnerAction>` (import from `@/components/OwnerOnly`).

3. **Configurator.**
   - `ListView.tsx`: wrap the "New configuration" `<Button …>` in `<OwnerAction>`.
   - `ConfigurationList.tsx` (import `OwnerAction` from `@/components/OwnerOnly`): wrap the empty state's "Create your first configuration" `<Button …>` in `<OwnerAction>…</OwnerAction>`, and the row's "Delete" `<Button variant="destructive-ghost" …>` in `<OwnerAction>…</OwnerAction>`. Edit stays (its Save is gated below), and so does Copy link.
   - In both `ConfigurationForm.tsx` files, replace the Save button with:

```tsx
        <OwnerAction
          fallback={
            <p className="text-body-sm text-muted">
              Only the team owner can change configurations.
            </p>
          }
        >
          <Button type="submit" className="w-full">
            Save
          </Button>
        </OwnerAction>
```

   - Replace `src/app/license/[tokenId]/configurator/new/page.tsx` with:

```tsx
import { Metadata } from 'next';
import { View } from './components/View';
import { OwnerOnly } from '@/components/OwnerOnly';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const NewConfiguratorPage = () => (
  <OwnerOnly feature="Configurations">
    <View />
  </OwnerOnly>
);
export default NewConfiguratorPage;
```

4. **Overview quick actions.** Create `src/app/license/[tokenId]/details/components/View/OverviewQuickActions.tsx` (the markup moved from `View.tsx`, with the owner-only entries gated):

```tsx
'use client';
import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OwnerAction } from '@/components/OwnerOnly';

export const OverviewQuickActions: FC<{
  tokenId: number;
  onSelectTab: (tab: 'config' | 'brand') => void;
}> = ({ tokenId, onSelectTab }) => {
  const router = useRouter();
  return (
    <div className="overview-quick-actions">
      <p className="overview-quick-actions__label">Quick actions</p>
      <div className="overview-quick-actions__grid">
        <OwnerAction>
          <button className="overview-quick-action" onClick={() => onSelectTab('config')}>
            🔑 Generate API key
          </button>
          <button className="overview-quick-action" onClick={() => onSelectTab('brand')}>
            🪪 Configure branding
          </button>
          <button
            className="overview-quick-action"
            onClick={() => router.push(`/license/${tokenId}/configurator`)}
          >
            ⚙️ Setup vehicle sharing
          </button>
        </OwnerAction>
        <Link href="https://docs.dimo.org" target="_blank" className="overview-quick-action">
          📖 Docs
        </Link>
      </div>
    </div>
  );
};
```

   In `View.tsx`, replace the whole `<div className="overview-quick-actions">…</div>` block with `<OverviewQuickActions tokenId={licenseFragment.tokenId} onSelectTab={setActiveTab} />`, and import it from `./OverviewQuickActions`.

5. **Vehicles tab.** In `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`, wrap both `<div className="flex-1 [&>button]:w-full"><VehicleSimulatorModal … /></div>` and the "Configure sharing" `<Button …>` in `<OwnerAction>…</OwnerAction>`.

6. **Renounce.** In `constants.tsx`:
   - Widen `opts` to `{ showSources?: boolean; showLastSeen?: boolean; clientId: string; canRenounce?: boolean }`.
   - Replace the trailing actions column with:

```tsx
  // Renounce signs from the user's own wallet: owners only.
  ...(opts.canRenounce === false
    ? []
    : [
        columnHelper.display({
          id: 'actions',
          header: '',
          cell: (info) => (
            <ActionsCell tokenId={info.row.original.tokenId} onRenounce={onRenounce} />
          ),
        }),
      ]),
```

   In `VehicleDetailsTable.tsx`, add `const { isOwner } = useTeam();` (`import { useTeam } from '@/hooks/useTeam';`) and pass `canRenounce: isOwner` in both `buildColumns(…)` option objects.

- [ ] **Step 5: Run the tests, the license suites and the type check**

Run: `npx jest __tests__/unit/components/OwnerOnly.test.tsx __tests__/unit/pages/license __tests__/unit/configurator && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS, including the existing configurator suites (`ConfigurationList.test.tsx` still finds Delete: without a provider `isOwner` is true) and the vehicle-table suites. `tsc` reports nothing new.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/OwnerOnly src/app/webhooks src/app/connections "src/app/license/[tokenId]" "src/app/license/vehicles/[clientId]/components/VehicleDetailsTable" __tests__/unit/components/OwnerOnly.test.tsx __tests__/unit/configurator/ConfigurationListMember.test.tsx __tests__/unit/pages/license/details __tests__/unit/pages/license/vehicles
git commit -m "feat(teams): owner-only pages and actions (webhooks, connections, configurator, simulator, renounce)"
```

---

### Task 10: Member developer JWT, signed by their own wallet and stored per wallet

**Files:**

- Modify: `src/utils/devJwt.ts` (per-wallet keys for members; only JWTs whose `signer_address` is the member's wallet)
- Modify: `src/hoc/TeamProvider.tsx` (set the member signer before children read stored JWTs)
- Modify: `src/actions/dimoAuth.ts` (stop logging `signedChallenge`; status-aware `requestDexChallenge` and `submitDexChallenge`)
- Create: `src/hooks/useMemberDevJwt.ts`, `src/hooks/useLicenseDataAccess.ts`
- Create: `src/components/DataAccess/ConnectWalletButton.tsx`, `src/components/DataAccess/DevJwtPrompt.tsx`, `src/components/DataAccess/index.ts`
- Modify: `src/app/vehicles/components/VehiclesView.tsx` (use `DevJwtPrompt`)
- Test: `__tests__/unit/utils/devJwt.test.ts`, `__tests__/unit/actions/dimoAuth.test.ts`, `__tests__/unit/hooks/useMemberDevJwt.test.tsx`, `__tests__/unit/hooks/useLicenseDataAccess.test.tsx`, `__tests__/unit/components/DevJwtPrompt.test.tsx`, `__tests__/unit/components/ConnectWalletButton.test.tsx`, `__tests__/unit/hoc/TeamProvider.test.tsx` (extend)

**Interfaces:**

- Consumes:
  - `getSessionEoaAccount`, imported lazily (Task 6);
  - `useTeam` and `useGlobalAccount`;
  - `askForAccess` and `DATA_ACCESS_UNAVAILABLE` (Task 1);
  - `TEAM_DATA_ACCESS_ENABLED`;
  - `useMixPanel`.
- Produces:
  - `setMemberDevJwtSigner(signer: string | null)`. While set, `saveDevJwt`, `getDevJwt`, `getAllDevJwts` and `removeDevJwt` use `devJwt_${clientId}_${signer}_list_v1` and return only tokens whose `signer_address` claim is that signer (case-insensitive).
  - From `@/actions/dimoAuth`: `requestDexChallenge(input): Promise<DexResult<{ state; challenge }>>` and `submitDexChallenge(input): Promise<DexResult<{ access_token; … }>>`, where `DexResult<T> = { ok: true; data: T } | { ok: false; status: number }`.
  - `useMemberDevJwt(): ({ clientId, domain }) => Promise<string>`. It retries only when `submit_challenge` answers 4xx (dex hasn't indexed a fresh signer yet), up to `MEMBER_JWT_ATTEMPTS = 3`, `MEMBER_JWT_RETRY_MS = 5000` apart. A missing session, a failed challenge request, or a submit answer other than 4xx throws `MemberDevJwtError` at once. A Turnkey signing error is rethrown unchanged, and `ConnectWalletButton` shows a generic message for it. The domain isn't checked here: it is passed to dex, which checks it against the license's redirect URIs.
  - `useLicenseDataAccess(license?, enabled?)`, returning `LicenseDataAccess`:
    - `{ kind: 'owner' }`
    - `{ kind: 'member' }`
    - `{ kind: 'member-no-access'; ownerEmail }`
    - `{ kind: 'member-unavailable' }` (flag off)
  - `<ConnectWalletButton clientId domain onSuccess label? />` (tracks `Wallet Connected`) and `<DevJwtPrompt license access onSuccess message />`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/devJwt.test.ts`:

```ts
import {
  clearAllDevJwts,
  getAllDevJwts,
  getDevJwt,
  saveDevJwt,
  setMemberDevJwtSigner,
} from '@/utils/devJwt';

// jsdom: btoa, not Buffer.
const b64 = (o: object) =>
  btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (claims: object) =>
  `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.sig`;
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';

describe('developer JWT storage', () => {
  beforeEach(() => {
    clearAllDevJwts();
    setMemberDevJwtSigner(null);
  });

  it('keeps owner JWTs in the per-license list, as before', () => {
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    expect(localStorage.getItem(`devJwt_${CLIENT}_list_v1`)).not.toBeNull();
    expect(getDevJwt(CLIENT)).not.toBeNull();
  });

  it("stores a member's JWTs under their wallet and returns only those their wallet signed", () => {
    setMemberDevJwtSigner(WALLET);
    const mine = jwt({ ethereum_address: CLIENT, signer_address: WALLET.toLowerCase() });
    saveDevJwt(CLIENT, mine);
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT, signer_address: '0x0000000000000000000000000000000000000001' }));
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    expect(localStorage.getItem(`devJwt_${CLIENT}_${WALLET.toLowerCase()}_list_v1`)).not.toBeNull();
    expect(getAllDevJwts(CLIENT).map((t) => t.token)).toEqual([mine]);
  });

  it("never shows an owner's API-key JWT to a member, or a member's to the owner view", () => {
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    setMemberDevJwtSigner(WALLET);
    expect(getDevJwt(CLIENT)).toBeNull();
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT, signer_address: WALLET }));
    setMemberDevJwtSigner(null);
    expect(getAllDevJwts(CLIENT)).toHaveLength(1);
  });
});
```

`__tests__/unit/actions/dimoAuth.test.ts`:

```ts
/**
 * @jest-environment node
 */
const mockPost = jest.fn();
// dimoAuth calls axios.create() while it loads, before mockPost is initialised,
// so the client reads it lazily.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const client = { post: (...args: unknown[]) => mockPost(...args) };
  return { __esModule: true, ...actual, default: { ...actual.default, create: () => client } };
});
import { AxiosError, type AxiosResponse } from 'axios';
import { getDimoToken, submitDexChallenge } from '@/actions/dimoAuth';

const INPUT = { state: 'st', signedChallenge: '0xsecret', clientId: '0xaaa', domain: 'https://x' };

describe('dimoAuth', () => {
  it('never logs the signed challenge', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockPost.mockResolvedValue({ data: { access_token: 'jwt' } });
    await getDimoToken(INPUT);
    expect(JSON.stringify(info.mock.calls)).not.toContain('0xsecret');
    info.mockRestore();
  });

  it('reports the HTTP status of a refused submit instead of throwing', async () => {
    mockPost.mockRejectedValue(
      new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: {},
      } as AxiosResponse),
    );
    await expect(submitDexChallenge(INPUT)).resolves.toEqual({ ok: false, status: 400 });
    mockPost.mockRejectedValue(new Error('socket hang up'));
    await expect(submitDexChallenge(INPUT)).resolves.toEqual({ ok: false, status: 0 });
  });
});
```

`__tests__/unit/hooks/useMemberDevJwt.test.tsx`:

```tsx
import React from 'react';
import { renderHook } from '@testing-library/react';

jest.mock('@/actions/dimoAuth', () => ({
  requestDexChallenge: jest.fn(),
  submitDexChallenge: jest.fn(),
}));
const signMessage = jest.fn(async () => '0xsigned');
jest.mock('@/services/turnkeyAccount', () => ({
  getSessionEoaAccount: jest.fn(async () => ({ signMessage })),
}));
jest.mock('@/utils/devJwt', () => ({ saveDevJwt: jest.fn() }));
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';
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
const ARGS = { clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f', domain: 'https://harness.dev/callback' };
const challenge = { ok: true, data: { challenge: 'sign me', state: 'st' } };
const run = () => renderHook(() => useMemberDevJwt(), { wrapper }).result.current(ARGS);
// The hook sets no React state, so the calls need no act().

describe('useMemberDevJwt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (requestDexChallenge as jest.Mock).mockReset().mockResolvedValue(challenge);
    (submitDexChallenge as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it("asks dex for the license's challenge and signs it with the EOA", async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValue({ ok: true, data: { access_token: 'dev.jwt' } });
    await expect(run()).resolves.toBe('dev.jwt');
    expect(requestDexChallenge).toHaveBeenCalledWith({
      address: ARGS.clientId,
      clientId: ARGS.clientId,
      domain: ARGS.domain,
    });
    expect(getSessionEoaAccount).toHaveBeenCalledWith(SESSION);
    expect(signMessage).toHaveBeenCalledWith({ message: 'sign me' });
    expect(saveDevJwt).toHaveBeenCalledWith(ARGS.clientId, 'dev.jwt');
  });

  it('retries only a 4xx from submit_challenge (signer not indexed yet)', async () => {
    (submitDexChallenge as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, data: { access_token: 'dev.jwt' } });
    const token = run();
    await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS);
    await expect(token).resolves.toBe('dev.jwt');
    expect(submitDexChallenge).toHaveBeenCalledTimes(2);
  });

  it('gives up after three 4xx answers with the propagation message', async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
    const settled = expect(run()).rejects.toEqual(
      new MemberDevJwtError('Access is still propagating — try again in a minute'),
    );
    await jest.advanceTimersByTimeAsync(MEMBER_JWT_RETRY_MS * 2);
    await settled;
    expect(submitDexChallenge).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 5xx, a failed challenge or a signing error', async () => {
    (submitDexChallenge as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(run()).rejects.toBeInstanceOf(MemberDevJwtError);
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);

    (requestDexChallenge as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(run()).rejects.toBeInstanceOf(MemberDevJwtError);
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);

    signMessage.mockRejectedValueOnce(new Error('Turnkey said no'));
    await expect(run()).rejects.toThrow('Turnkey said no');
    expect(submitDexChallenge).toHaveBeenCalledTimes(1);
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
const EOA_UPPER = '0x9F1E2D3C4B5A69788796A5B4C3D2E1F0A9B8C7D6';
const license = (signers: string[]) =>
  new LocalDeveloperLicense({
    alias: 'Harness Fleet',
    clientId: '0xaaa',
    redirectURIs: { nodes: [{ uri: 'x' }] },
    signers: { nodes: signers.map((address) => ({ address })) },
  } as never);
const member = () =>
  (useTeam as jest.Mock).mockReturnValue({ isMember: true, activeTeam: { ownerEmail: 'ops@acme.dev' } });

describe('useLicenseDataAccess', () => {
  beforeEach(() =>
    (useGlobalAccount as jest.Mock).mockReturnValue({ currentUser: { walletAddress: EOA } }),
  );

  it('treats everyone outside a member team as the owner', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    expect(renderHook(() => useLicenseDataAccess(license([]), true)).result.current).toEqual({
      kind: 'owner',
    });
  });

  it('gives a member access when their wallet is a signer, any case', () => {
    member();
    expect(renderHook(() => useLicenseDataAccess(license([EOA_UPPER]), true)).result.current).toEqual({
      kind: 'member',
    });
  });

  it('tells a member without a key whom to ask', () => {
    member();
    expect(renderHook(() => useLicenseDataAccess(license([]), true)).result.current).toEqual({
      kind: 'member-no-access',
      ownerEmail: 'ops@acme.dev',
    });
  });

  it('is unavailable to members while the flag is off (C5)', () => {
    member();
    expect(renderHook(() => useLicenseDataAccess(license([EOA]), false)).result.current).toEqual({
      kind: 'member-unavailable',
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
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
import { DevJwtPrompt } from '@/components/DataAccess';
import { LocalDeveloperLicense } from '@/types/webhook';

const license = new LocalDeveloperLicense({
  alias: 'Harness Fleet',
  clientId: '0xaaa',
  redirectURIs: { nodes: [{ uri: 'https://x' }] },
});
const show = (access: Parameters<typeof DevJwtPrompt>[0]['access']) =>
  render(<DevJwtPrompt license={license} access={access} onSuccess={jest.fn()} message="m" />);

describe('DevJwtPrompt', () => {
  it('offers owners the API-key flow', () => {
    show({ kind: 'owner' });
    expect(screen.getByRole('button', { name: 'Generate developer JWT' })).toBeInTheDocument();
  });

  it('offers members with access their wallet', () => {
    show({ kind: 'member' });
    expect(screen.getByRole('button', { name: 'Connect with your wallet' })).toBeInTheDocument();
  });

  it('tells members without access whom to ask (C8)', () => {
    show({ kind: 'member-no-access', ownerEmail: 'ops@acme.dev' });
    expect(screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says data access is not available yet while the flag is off (C8)', () => {
    show({ kind: 'member-unavailable' });
    expect(screen.getByText("Data access for team members isn't available yet.")).toBeInTheDocument();
  });
});
```

`__tests__/unit/components/ConnectWalletButton.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetJwt = jest.fn();
jest.mock('@/hooks/useMemberDevJwt', () => ({
  ...jest.requireActual('@/hooks/useMemberDevJwt'),
  useMemberDevJwt: () => mockGetJwt,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { MemberDevJwtError } from '@/hooks/useMemberDevJwt';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';

describe('ConnectWalletButton', () => {
  it('connects, tracks Wallet Connected and reports success', async () => {
    mockGetJwt.mockResolvedValue('dev.jwt');
    const onSuccess = jest.fn();
    render(<ConnectWalletButton clientId="0xaaa" domain="https://x" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect with your wallet' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockGetJwt).toHaveBeenCalledWith({ clientId: '0xaaa', domain: 'https://x' });
    expect(trackEvent).toHaveBeenCalledWith('Wallet Connected', { clientId: '0xaaa' });
  });

  it('shows why connecting failed', async () => {
    mockGetJwt.mockRejectedValue(
      new MemberDevJwtError('Access is still propagating — try again in a minute'),
    );
    const onSuccess = jest.fn();
    render(
      <ConnectWalletButton
        clientId="0xaaa"
        domain="https://x"
        onSuccess={onSuccess}
        label="Reconnect with your wallet"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect with your wallet' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Access is still propagating — try again in a minute',
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
```

Extend `__tests__/unit/hoc/TeamProvider.test.tsx`:
- Add this beside the other mocks:

```tsx
jest.mock('@/utils/devJwt', () => ({
  ...jest.requireActual('@/utils/devJwt'),
  setMemberDevJwtSigner: jest.fn(),
}));
import { setMemberDevJwtSigner } from '@/utils/devJwt';
```

- Append inside the `describe`:

```tsx
  it("reads developer JWTs from the member's wallet list while a member team is active", async () => {
    document.cookie = 'active_team=team-acme; Path=/';
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-acme'));
    expect(setMemberDevJwtSigner).toHaveBeenLastCalledWith(USER.walletAddress);
  });

  it("keeps the per-license list for the user's own team", async () => {
    renderProvider();
    await waitFor(() => expect(probe().active).toBe('team-harness'));
    expect(setMemberDevJwtSigner).toHaveBeenLastCalledWith(null);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/devJwt.test.ts __tests__/unit/actions/dimoAuth.test.ts __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/components/ConnectWalletButton.test.tsx __tests__/unit/hoc/TeamProvider.test.tsx`
Expected: FAIL. The functions and modules are missing, `getDimoToken` logs the signature, and `TeamProvider` never sets the member signer.

- [ ] **Step 3: Implement storage and dex actions**

`src/utils/devJwt.ts`, full replacement:

```ts
import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { jwtDecode } from 'jwt-decode';

// Members keep developer JWTs per wallet, and use only those their own wallet
// signed (signer_address). Owners keep the per-license list. TeamProvider sets
// the signer while a member team is active.
let memberSigner: string | null = null;
export const setMemberDevJwtSigner = (signer: string | null) => {
  memberSigner = signer ? signer.toLowerCase() : null;
};

const getKey = (clientId: string) =>
  memberSigner ? `devJwt_${clientId}_${memberSigner}_list_v1` : `devJwt_${clientId}_list_v1`;

export interface StoredJwt {
  token: string;
  createdAt: number;
}

export const saveDevJwt = (clientId: string, token: string) => {
  const key = getKey(clientId);
  const existingTokens = getFromLocalStorage<StoredJwt[]>(key) || [];
  const newToken: StoredJwt = { token, createdAt: Date.now() };
  return saveToLocalStorage(key, [...existingTokens, newToken]);
};

const getValidTokens = (clientId: string): StoredJwt[] => {
  const tokens = getFromLocalStorage<StoredJwt[]>(getKey(clientId)) || [];
  const now = Date.now();
  return tokens
    .filter((storedJwt) => {
      try {
        const decoded = jwtDecode<{ exp?: number; signer_address?: string }>(storedJwt.token);
        const exp = decoded.exp ? decoded.exp * 1000 : null;
        if (exp && now > exp) return false;
        return memberSigner ? decoded.signer_address?.toLowerCase() === memberSigner : true;
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

export const getDevJwt = (clientId: string) => {
  if (typeof window === 'undefined') {
    return null;
  }
  const validTokens = getValidTokens(clientId);
  return validTokens.length ? validTokens[0].token : null;
};

export const getAllDevJwts = (clientId: string) => {
  return getValidTokens(clientId);
};

export const removeDevJwt = (clientId: string, tokenToRemove: string) => {
  const key = getKey(clientId);
  const tokens = getFromLocalStorage<StoredJwt[]>(key);
  if (!tokens) return;

  const remainingTokens = tokens.filter(({ token }) => token !== tokenToRemove);

  if (remainingTokens.length === 0) {
    removeFromLocalStorage(key);
  } else {
    saveToLocalStorage(key, remainingTokens);
  }
};

// Sign-out (contracts C4): every developer JWT this browser holds, owner keys
// and member keys alike.
export const clearAllDevJwts = () => {
  if (typeof window === 'undefined') return;
  Object.keys(localStorage)
    .filter((key) => key.startsWith('devJwt_'))
    .forEach((key) => localStorage.removeItem(key));
};
```

`src/hoc/TeamProvider.tsx`: import `setMemberDevJwtSigner` from `@/utils/devJwt`, then after the `activeTeam` memo add:

```tsx
  // Before children render: they read stored developer JWTs during this render
  // and in effects that run before the provider's own effects.
  useMemo(
    () =>
      setMemberDevJwtSigner(
        activeTeam?.role === 'MEMBER' ? (currentUser?.walletAddress ?? null) : null,
      ),
    [activeTeam?.role, currentUser?.walletAddress],
  );
```

`src/actions/dimoAuth.ts`:
- Delete `console.info({ state, signedChallenge, clientId, domain });` from `getDimoToken`. Member developer JWTs now go through it, and the signature must never reach logs.
- Add `import { AxiosError } from 'axios';` (keep the default import), and append:

```ts
export type DexResult<T> = { ok: true; data: T } | { ok: false; status: number };

const dexFailure = (error: unknown) => ({
  ok: false as const,
  status: error instanceof AxiosError ? (error.response?.status ?? 0) : 0,
});

// Status-aware versions for the member flow: the client retries only a
// submit_challenge 4xx (dex has not indexed a just-granted signer yet), and a
// thrown error from a server action loses its status in production.
export const requestDexChallenge = async (input: {
  address: `0x${string}`;
  clientId: string;
  domain: string;
}): Promise<DexResult<IAuthChallenge>> => {
  try {
    return { ok: true, data: await getDimoChallenge(input) };
  } catch (error) {
    return dexFailure(error);
  }
};

export const submitDexChallenge = async (input: {
  state: string;
  signedChallenge: string;
  clientId: string;
  domain: string;
}): Promise<DexResult<IAuthResponse>> => {
  try {
    return { ok: true, data: await getDimoToken(input) };
  } catch (error) {
    return dexFailure(error);
  }
};
```

- [ ] **Step 4: Implement the hooks and components**

`src/hooks/useMemberDevJwt.ts`:

```ts
'use client';
import { useCallback } from 'react';
import { requestDexChallenge, submitDexChallenge } from '@/actions/dimoAuth';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
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
// account's ERC-1271 check. Only a submit_challenge 4xx is retried: right after
// a grant dex may not have indexed the signer yet (the RentalOS flow allows the
// same). Session and challenge errors fail at once as MemberDevJwtError; a
// signing error is rethrown unchanged. dex checks the domain.
export const useMemberDevJwt = () => {
  const { validateCurrentSession } = useGlobalAccount();
  return useCallback(
    async ({ clientId, domain }: { clientId: string; domain: string }) => {
      const session = await validateCurrentSession();
      if (!session) throw new MemberDevJwtError('Your session has expired. Sign in again.');
      // Lazy: @/services/turnkeyAccount pulls the Turnkey config, which needs env.
      const { getSessionEoaAccount } = await import('@/services/turnkeyAccount');
      const account = await getSessionEoaAccount(session);
      for (let attempt = 1; attempt <= MEMBER_JWT_ATTEMPTS; attempt++) {
        const challenge = await requestDexChallenge({
          address: clientId as `0x${string}`,
          clientId,
          domain,
        });
        if (!challenge.ok) {
          throw new MemberDevJwtError(
            `Couldn't start connecting to this license (${challenge.status || 'no answer'}). Try again.`,
          );
        }
        const signedChallenge = await account.signMessage({ message: challenge.data.challenge });
        const token = await submitDexChallenge({
          state: challenge.data.state,
          signedChallenge,
          clientId,
          domain,
        });
        if (token.ok && token.data.access_token) {
          saveDevJwt(clientId, token.data.access_token);
          return token.data.access_token;
        }
        const status = token.ok ? 0 : token.status;
        if (status < 400 || status >= 500) {
          throw new MemberDevJwtError(
            `Couldn't connect your wallet (${status || 'no answer'}). Try again.`,
          );
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
  | { kind: 'member-no-access'; ownerEmail: string }
  | { kind: 'member-unavailable' };

// How the current user reads a license's data. Outside a member team the
// license list is the user's own, so they are the owner (API-key flow).
export const useLicenseDataAccess = (
  license?: LocalDeveloperLicense,
  enabled: boolean = TEAM_DATA_ACCESS_ENABLED,
): LicenseDataAccess => {
  const { isMember, activeTeam } = useTeam();
  const { currentUser } = useGlobalAccount();
  if (!isMember) return { kind: 'owner' };
  if (!enabled) return { kind: 'member-unavailable' };
  if (!license?.hasSigner(currentUser?.walletAddress)) {
    return { kind: 'member-no-access', ownerEmail: activeTeam?.ownerEmail ?? 'the team owner' };
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
import { useMixPanel } from '@/hooks/useMixPanel';

export const ConnectWalletButton: FC<{
  clientId: string;
  domain: string;
  onSuccess: () => void;
  label?: string;
}> = ({ clientId, domain, onSuccess, label = 'Connect with your wallet' }) => {
  const getMemberDevJwt = useMemberDevJwt();
  const { trackEvent } = useMixPanel();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      await getMemberDevJwt({ clientId, domain });
      trackEvent('Wallet Connected', { clientId });
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
      {label}
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
import { askForAccess, DATA_ACCESS_UNAVAILABLE } from '@/config/teamCopy';
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
  if (access.kind === 'member-unavailable') {
    return <p className="text-body-sm text-muted">{DATA_ACCESS_UNAVAILABLE}</p>;
  }
  if (access.kind === 'member-no-access') {
    return (
      <p className="text-body-sm text-muted">{askForAccess(access.ownerEmail, license.label)}</p>
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

`src/app/vehicles/components/VehiclesView.tsx`:
- Replace the `GenerateDevJWTSection` import with `import { DevJwtPrompt } from '@/components/DataAccess';` and `import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';`.
- In `Content`, after `useGetDevJwts`, add `const dataAccess = useLicenseDataAccess(selected);`.
- Replace the `GenerateDevJWTSection` block with:

```tsx
          {(!isAuthenticatedAsDev || dataAccess.kind.startsWith('member-')) && (
            <DevJwtPrompt
              license={selected}
              access={dataAccess}
              onSuccess={refetchJwts}
              message="Generate a developer JWT to see when each vehicle was last seen."
            />
          )}
```

- [ ] **Step 5: Run the tests, including the Vehicles suites, which must still load**

Run: `npx jest __tests__/unit/utils/devJwt.test.ts __tests__/unit/actions/dimoAuth.test.ts __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/components/ConnectWalletButton.test.tsx __tests__/unit/hoc/TeamProvider.test.tsx __tests__/unit/pages/vehicles`
Expected: PASS. `VehiclesView.test.tsx` and `VehiclePage.test.tsx` load without Turnkey env, because nothing on their import path imports `@/services/turnkeyAccount` statically.

- [ ] **Step 6: Commit**

```bash
git add src/utils/devJwt.ts src/hoc/TeamProvider.tsx src/actions/dimoAuth.ts src/hooks/useMemberDevJwt.ts src/hooks/useLicenseDataAccess.ts src/components/DataAccess src/app/vehicles/components/VehiclesView.tsx __tests__/unit/utils/devJwt.test.ts __tests__/unit/actions/dimoAuth.test.ts __tests__/unit/hooks/useMemberDevJwt.test.tsx __tests__/unit/hooks/useLicenseDataAccess.test.tsx __tests__/unit/components/DevJwtPrompt.test.tsx __tests__/unit/components/ConnectWalletButton.test.tsx __tests__/unit/hoc/TeamProvider.test.tsx
git commit -m "feat(teams): members connect with their own wallet; developer JWTs stored per wallet"
```

---

### Task 11: Vehicles member states, removal detection from the proxy, unknown-error state

**Files:**

- Modify: `src/services/subjects/client.ts` (known codes, an `UNKNOWN` fallback, `memberOfTeam` on `DataApiError`)
- Create: `src/app/vehicles/[tokenId]/components/accessFromError.ts`
- Modify: `src/app/vehicles/[tokenId]/components/SourceRail.tsx` (`Access` adds `no-access`, `removed`, `reconnect`, `unavailable`, `error`)
- Modify: `src/app/vehicles/[tokenId]/components/AccessNotice.tsx`, `src/app/vehicles/[tokenId]/components/VehiclePage.tsx`
- Modify: `src/app/vehicles/components/VehiclesView.tsx` (a member opening Vehicles while the flag is off)
- Test: `__tests__/unit/services/subjects/client.test.ts` (extend), `__tests__/unit/pages/vehicles/accessFromError.test.ts`, `__tests__/unit/pages/vehicles/AccessNotice.test.tsx`, `__tests__/unit/pages/vehicles/VehiclePageMember.test.tsx`, `__tests__/unit/pages/vehicles/VehiclesView.test.tsx` (extend)

**Interfaces:**

- Consumes:
  - `useLicenseDataAccess` and `ConnectWalletButton` (Task 10);
  - `useTeam().reportRemoved` (Task 4);
  - the C8 copy;
  - the proxy refusal body `{ error, code, memberOfTeam? }` (Task 12).
- Produces:
  - `DataApiCode` gains `NO_ACCESS`, `ACCESS_CHECK_FAILED`, `INVALID_CLIENT_ID` and `UNKNOWN`; any code the client doesn't know becomes `UNKNOWN`.
  - `DataApiError#memberOfTeam?: boolean`.
  - `accessFromError(error, { member, walletIsSigner }): Access`:

    | Code | Access |
    |---|---|
    | `NOT_SHARED` | `not-shared` |
    | `DEV_JWT_*` | `jwt-expired` |
    | `NO_ACCESS` with `memberOfTeam: false` | `removed` (and `reportRemoved()`) |
    | `NO_ACCESS`, member whose wallet is still a signer on Identity | `reconnect` |
    | `NO_ACCESS`, other member | `no-access` |
    | `NO_ACCESS`, owner (a disabled API key) | `jwt-expired` |
    | `UPSTREAM`, `GRAPHQL` | `ok` (the panels show them per field) |
    | anything else, `INVALID_CLIENT_ID` and `ACCESS_CHECK_FAILED` included | `error` |

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/unit/services/subjects/client.test.ts` (it already runs in the node environment, mocks `getDevJwt` and has the `answer` helper):

```ts
describe('postSubjectQuery error codes', () => {
  const query = () =>
    postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req });

  it('carries the proxy refusal and memberOfTeam', async () => {
    answer(403, {
      error: 'You no longer have access to this license.',
      code: 'NO_ACCESS',
      memberOfTeam: false,
    });
    await expect(query()).rejects.toMatchObject({
      code: 'NO_ACCESS',
      memberOfTeam: false,
      status: 403,
    });
  });

  it('turns an unknown code into UNKNOWN, keeping the message', async () => {
    answer(400, { error: 'Bad client id', code: 'SOMETHING_NEW' });
    const error = await query().catch((e: DataApiError) => e);
    expect(error).toMatchObject({ code: 'UNKNOWN', message: 'Bad client id' });
  });
});
```

`__tests__/unit/pages/vehicles/accessFromError.test.ts`:

```ts
import { accessFromError } from '@/app/vehicles/[tokenId]/components/accessFromError';
import { DataApiError } from '@/services/subjects/client';

const error = (code: string, memberOfTeam?: boolean) =>
  new DataApiError(403, code as never, 'x', [], memberOfTeam);
const member = { member: true, walletIsSigner: false };

describe('accessFromError', () => {
  it('keeps the page open without an error, or for per-field failures', () => {
    expect(accessFromError(null, member)).toBe('ok');
    expect(accessFromError(error('UPSTREAM'), member)).toBe('ok');
    expect(accessFromError(error('GRAPHQL'), member)).toBe('ok');
  });

  it('maps the known refusals', () => {
    expect(accessFromError(error('NOT_SHARED'), member)).toBe('not-shared');
    expect(accessFromError(error('DEV_JWT_INVALID'), member)).toBe('jwt-expired');
    expect(accessFromError(error('NO_ACCESS', false), member)).toBe('removed');
    expect(accessFromError(error('NO_ACCESS', true), member)).toBe('no-access');
    expect(accessFromError(error('NO_ACCESS', true), { member: true, walletIsSigner: true })).toBe('reconnect');
    expect(accessFromError(error('NO_ACCESS'), { member: false, walletIsSigner: false })).toBe('jwt-expired');
  });

  it('shows an error state, not the data tabs, for anything else', () => {
    expect(accessFromError(error('INVALID_CLIENT_ID'), member)).toBe('error');
    expect(accessFromError(error('ACCESS_CHECK_FAILED'), member)).toBe('error');
    expect(accessFromError(error('UNKNOWN'), member)).toBe('error');
  });
});
```

`__tests__/unit/pages/vehicles/AccessNotice.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
import { AccessNotice } from '@/app/vehicles/[tokenId]/components/AccessNotice';

const base = {
  licenseLabel: 'Harness Fleet',
  clientId: '0xaaa',
  redirectUri: 'https://x',
  onGenerated: jest.fn(),
  onViewSharing: jest.fn(),
  onRetry: jest.fn(),
};

describe('AccessNotice', () => {
  it('asks the team owner for access', () => {
    render(<AccessNotice {...base} access="no-access" ownerEmail="ops@acme.dev" member />);
    expect(screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.')).toBeInTheDocument();
  });

  it('says a removed member no longer has access (C8)', () => {
    render(<AccessNotice {...base} access="removed" member ownerEmail="ops@acme.dev" />);
    expect(screen.getByText('You no longer have access to this license.')).toBeInTheDocument();
  });

  it('offers to reconnect when the chain still lists the wallet', () => {
    render(<AccessNotice {...base} access="reconnect" member ownerEmail="ops@acme.dev" />);
    expect(screen.getByRole('button', { name: 'Reconnect with your wallet' })).toBeInTheDocument();
  });

  it('says data access is not available yet (C8)', () => {
    render(<AccessNotice {...base} access="unavailable" member ownerEmail="ops@acme.dev" />);
    expect(screen.getByText("Data access for team members isn't available yet.")).toBeInTheDocument();
  });

  it('shows an error with a retry for an unknown answer', () => {
    render(<AccessNotice {...base} access="error" />);
    expect(screen.getByText("We couldn't check your access to Harness Fleet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(base.onRetry).toHaveBeenCalled();
  });

  it('offers a member their wallet instead of an API key, and keeps the owner flow', () => {
    const { unmount } = render(<AccessNotice {...base} access="no-jwt" member ownerEmail="ops@acme.dev" />);
    expect(screen.getByRole('button', { name: 'Connect with your wallet' })).toBeInTheDocument();
    unmount();
    render(<AccessNotice {...base} access="no-jwt" />);
    expect(screen.getByRole('button', { name: 'Generate developer JWT' })).toBeInTheDocument();
  });
});
```

`__tests__/unit/pages/vehicles/VehiclePageMember.test.tsx`. It copies the setup of `VehiclePage.test.tsx` and adds the team mocks:

```tsx
import React from 'react';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const render = (ui: React.ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/vehicles/190231',
  useSearchParams: () => new URLSearchParams('license=0xaaa'),
}));
jest.mock('@apollo/client', () => ({ ...jest.requireActual('@apollo/client'), useQuery: jest.fn() }));
jest.mock('@/components/Webhooks/hooks/useValidDeveloperLicenses', () => ({
  useValidDeveloperLicenses: jest.fn(),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({ useGetDevJwts: jest.fn() }));
jest.mock('@/hooks/useGlobalAccount', () => ({ useGlobalAccount: jest.fn() }));
jest.mock('@/hooks/subjects/useSubjectFreshness', () => ({ useSubjectFreshness: jest.fn() }));
jest.mock('@/hooks/subjects/useSubjectQuery', () => ({
  ...jest.requireActual('@/hooks/subjects/useSubjectQuery'),
  useSubjectQuery: jest.fn(() => ({ data: undefined, isLoading: false, error: null })),
}));
jest.mock('@/hooks/useLicenseDataAccess', () => ({ useLicenseDataAccess: jest.fn() }));
const reportRemoved = jest.fn();
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ reportRemoved, activeTeam: { ownerEmail: 'ops@acme.dev' } }),
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
import { useQuery } from '@apollo/client';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { DataApiError } from '@/services/subjects/client';
import { LocalDeveloperLicense } from '@/types/webhook';
import { VehiclePage } from '@/app/vehicles/[tokenId]/components/VehiclePage';

const WALLET = '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const license = new LocalDeveloperLicense({
  alias: 'Harness Fleet',
  clientId: '0xaaa',
  redirectURIs: { nodes: [{ uri: 'https://x' }] },
  signers: { nodes: [{ address: WALLET }] },
} as never);
const vehicle = {
  tokenId: 190231,
  tokenDID: 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231',
  owner: WALLET,
  mintedAt: '2026-04-11T09:00:00Z',
  imageURI: '',
  definition: { id: 'toyota_rav4_2024', make: 'Toyota', model: 'RAV4', year: 2024 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacds: { nodes: [{ grantee: '0xaaa', permissions: '0x3fc', createdAt: '2026-08-02T00:00:00Z', expiresAt: '2027-08-02T00:00:00Z', source: 'ipfs://x' }] },
  privileges: { nodes: [] },
};
const refusal = (memberOfTeam: boolean) =>
  new DataApiError(403, 'NO_ACCESS', 'x', [], memberOfTeam);

beforeEach(() => {
  (useQuery as jest.Mock).mockReturnValue({ data: { vehicle }, loading: false });
  (useGlobalAccount as jest.Mock).mockReturnValue({
    currentUser: { smartContractAddress: '0xkernel', walletAddress: WALLET },
  });
  (useValidDeveloperLicenses as jest.Mock).mockReturnValue({ developerLicenses: [license], loading: false });
  (useGetDevJwts as jest.Mock).mockReturnValue({ isAuthenticatedAsDev: true, refetch: jest.fn() });
  (useLicenseDataAccess as jest.Mock).mockReturnValue({ kind: 'member' });
});

describe('VehiclePage for a member', () => {
  it('reports a removal when the proxy says the user is no longer in the team', async () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({ byDid: {}, isLoading: false, error: refusal(false), refetch: jest.fn() });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByText('You no longer have access to this license.')).toBeInTheDocument();
    await waitFor(() => expect(reportRemoved).toHaveBeenCalled());
  });

  it('offers to reconnect when the proxy refuses but Identity still lists the wallet', () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({ byDid: {}, isLoading: false, error: refusal(true), refetch: jest.fn() });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByRole('button', { name: 'Reconnect with your wallet' })).toBeInTheDocument();
    expect(reportRemoved).not.toHaveBeenCalled();
  });

  it('shows the C8 unavailable copy while the flag is off', () => {
    (useLicenseDataAccess as jest.Mock).mockReturnValue({ kind: 'member-unavailable' });
    (useSubjectFreshness as jest.Mock).mockReturnValue({ byDid: {}, isLoading: false, error: null, refetch: jest.fn() });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByText("Data access for team members isn't available yet.")).toBeInTheDocument();
  });

  it('shows an error state for an unknown proxy answer', () => {
    (useSubjectFreshness as jest.Mock).mockReturnValue({
      byDid: {},
      isLoading: false,
      error: new DataApiError(400, 'INVALID_CLIENT_ID' as never, 'x'),
      refetch: jest.fn(),
    });
    render(<VehiclePage tokenId={190231} />);
    expect(screen.getByText("We couldn't check your access to Harness Fleet.")).toBeInTheDocument();
  });
});
```

Extend `__tests__/unit/pages/vehicles/VehiclesView.test.tsx`:
- Add this beside the other mocks. The flag is read at render time through the getter, and stays on for every other test, including Task 8's member empty state:

```tsx
// Mutable test state lives in a holder (Global Constraints, Commits).
const mockFlags = { dataAccess: true };
jest.mock('@/utils/featureFlags', () => ({
  TEMPLATE_EDITOR_ENABLED: false,
  get TEAM_DATA_ACCESS_ENABLED() {
    return mockFlags.dataAccess;
  },
}));
```

- Append inside the `describe`:

```tsx
  describe('while member data access is off', () => {
    beforeEach(() => {
      mockFlags.dataAccess = false;
    });
    afterEach(() => {
      mockFlags.dataAccess = true;
    });

    it('tells a member who opens Vehicles directly that it is not available yet (C5)', () => {
      (useTeam as jest.Mock).mockReturnValue({ isMember: true });
      (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
        developerLicenses: [lic('0xaaa', 'Fleet Pulse')],
        loading: false,
      });
      render(<VehiclesView />);
      expect(screen.getByText("Data access for team members isn't available yet.")).toBeInTheDocument();
      expect(screen.queryByTestId('table')).toBeNull();
    });

    it('leaves owners alone', () => {
      (useTeam as jest.Mock).mockReturnValue({ isMember: false });
      (useValidDeveloperLicenses as jest.Mock).mockReturnValue({
        developerLicenses: [lic('0xaaa', 'Fleet Pulse')],
        loading: false,
      });
      render(<VehiclesView />);
      expect(screen.getByTestId('table')).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/services/subjects/client.test.ts __tests__/unit/pages/vehicles`
Expected: FAIL. `accessFromError` is missing, there are no member states, and unknown codes read as `ok`.

- [ ] **Step 3: Implement**

`src/services/subjects/client.ts`:

```ts
export type DataApiCode =
  | 'DEV_JWT_MISSING'
  | 'DEV_JWT_INVALID'
  | 'NOT_SHARED'
  | 'NO_ACCESS'
  | 'ACCESS_CHECK_FAILED'
  | 'INVALID_CLIENT_ID'
  | 'UPSTREAM'
  | 'GRAPHQL'
  | 'UNKNOWN';

const KNOWN_CODES = new Set<string>([
  'DEV_JWT_MISSING',
  'DEV_JWT_INVALID',
  'NOT_SHARED',
  'NO_ACCESS',
  'ACCESS_CHECK_FAILED',
  'INVALID_CLIENT_ID',
  'UPSTREAM',
  'GRAPHQL',
]);

export class DataApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: DataApiCode,
    message: string,
    public readonly graphqlErrors: GqlError[] = [],
    // From the data proxy's NO_ACCESS: false means the user left the team.
    public readonly memberOfTeam?: boolean,
  ) {
    super(message);
    this.name = 'DataApiError';
  }
}
```

In `postSubjectQuery`:
- Add `memberOfTeam?: boolean;` to the parsed body type.
- Replace `if (body.code && body.error) throw new DataApiError(res.status, body.code, body.error);` with:

```ts
  if (body.code && body.error) {
    const code = KNOWN_CODES.has(body.code) ? (body.code as DataApiCode) : 'UNKNOWN';
    throw new DataApiError(res.status, code, body.error, [], body.memberOfTeam);
  }
```

- Change the body's `code?: DataApiCode` to `code?: string`.

`src/app/vehicles/[tokenId]/components/SourceRail.tsx`:

```ts
export type Access =
  | 'ok'
  | 'not-shared'
  | 'no-jwt'
  | 'jwt-expired'
  | 'no-access'
  | 'removed'
  | 'reconnect'
  | 'unavailable'
  | 'error'
  | 'loading';
```

Add to `ACCESS_LABEL`:

```ts
  'no-access': 'No data access',
  'removed': 'No data access',
  'reconnect': 'Reconnect your wallet',
  'unavailable': 'Not available yet',
  'error': "Couldn't check access",
```

`src/app/vehicles/[tokenId]/components/accessFromError.ts`:

```ts
import type { DataApiError } from '@/services/subjects/client';
import type { Access } from './SourceRail';

// How a data proxy failure changes the page. Per-field failures (UPSTREAM,
// GRAPHQL) keep the tabs open; anything unrecognised is an error state, never
// silently "ok".
export const accessFromError = (
  error: DataApiError | null | undefined,
  { member, walletIsSigner }: { member: boolean; walletIsSigner: boolean },
): Access => {
  if (!error) return 'ok';
  switch (error.code) {
    case 'UPSTREAM':
    case 'GRAPHQL':
      return 'ok';
    case 'NOT_SHARED':
      return 'not-shared';
    case 'DEV_JWT_INVALID':
    case 'DEV_JWT_MISSING':
      return 'jwt-expired';
    case 'NO_ACCESS':
      if (error.memberOfTeam === false) return 'removed';
      // An owner's disabled API key: generate a new developer JWT.
      if (!member) return 'jwt-expired';
      // The chain still lists the wallet, so the stored JWT is the problem.
      return walletIsSigner ? 'reconnect' : 'no-access';
    default:
      return 'error';
  }
};
```

`src/app/vehicles/[tokenId]/components/AccessNotice.tsx`, full replacement:

```tsx
'use client';
import { FC, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import { askForAccess, DATA_ACCESS_UNAVAILABLE, NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';
import type { Access } from './SourceRail';

interface Props {
  access: Exclude<Access, 'ok'>;
  licenseLabel: string;
  clientId?: string;
  redirectUri?: string;
  onGenerated: () => void;
  onViewSharing: () => void;
  onRetry?: () => void;
  // A member of someone else's team: their wallet, not an API key.
  member?: boolean;
  ownerEmail?: string;
}

const Card: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => (
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
  onRetry,
  member = false,
  ownerEmail = 'the team owner',
}) => {
  const wallet = (label?: string) =>
    clientId && redirectUri ? (
      <ConnectWalletButton
        clientId={clientId}
        domain={redirectUri}
        onSuccess={onGenerated}
        label={label}
      />
    ) : null;

  switch (access) {
    case 'loading':
      return null;
    case 'unavailable':
      return <Card title={DATA_ACCESS_UNAVAILABLE} />;
    case 'no-access':
      return (
        <Card title={`You don't have data access to ${licenseLabel}`}>
          <p className="max-w-xl text-body-sm text-muted">{askForAccess(ownerEmail, licenseLabel)}</p>
        </Card>
      );
    case 'removed':
      return <Card title={NO_LONGER_HAS_ACCESS} />;
    case 'reconnect':
      return (
        <Card title={`Reconnect to ${licenseLabel}`}>
          <p className="max-w-xl text-body-sm text-muted">
            The developer JWT in this browser was not signed by your current wallet.
          </p>
          {wallet('Reconnect with your wallet')}
        </Card>
      );
    case 'error':
      return (
        <Card title={`We couldn't check your access to ${licenseLabel}.`}>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Card>
      );
    case 'not-shared':
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
          Your wallet signs a developer JWT for {licenseLabel}; the token stays in this browser.
        </p>
        {wallet()}
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
            {licenseLabel} has no developer JWT in this browser yet. Generating one uses the
            license&apos;s API key, and the token stays in this browser.
          </>
        )}
      </p>
      {clientId && redirectUri && (
        <GenerateDevJWT clientId={clientId} domain={redirectUri} onSuccess={onGenerated} />
      )}
    </Card>
  );
};
```

`src/app/vehicles/[tokenId]/components/VehiclePage.tsx`:
- Add these imports (`useEffect` is already imported from `react`):

```ts
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { useTeam } from '@/hooks/useTeam';
import { accessFromError } from './accessFromError';
```
- After `const clientId = license?.clientId ?? '';`, add:

```ts
  const dataAccess = useLicenseDataAccess(license);
  const { activeTeam, reportRemoved } = useTeam();
```

- Replace `granted` with:

```ts
  const granted: Access =
    licensesLoading || loading
      ? 'loading'
      : !license
        ? 'not-shared'
        : dataAccess.kind === 'member-unavailable'
          ? 'unavailable'
          : dataAccess.kind === 'member-no-access'
            ? 'no-access'
            : !isAuthenticatedAsDev
              ? 'no-jwt'
              : 'ok';
```

- Replace the `exchangeCode` and `access` computation (keep it above the early returns, since it adds a hook) with:

```ts
  // The rail's freshness request is the first exchange for the vehicle.
  const access: Access =
    granted !== 'ok'
      ? granted
      : accessFromError(freshness.error, {
          member: dataAccess.kind !== 'owner',
          walletIsSigner: !!license?.hasSigner(currentUser?.walletAddress),
        });

  // The proxy says the user is no longer in the team that owns this license.
  useEffect(() => {
    if (access === 'removed') reportRemoved();
  }, [access, reportRemoved]);
```

- Pass these extra props to `<AccessNotice …>`:

```tsx
                    member={dataAccess.kind !== 'owner'}
                    ownerEmail={activeTeam?.ownerEmail}
                    onRetry={() => void freshness.refetch()}
```

`src/app/vehicles/components/VehiclesView.tsx`: in `VehiclesView` (the exported component), before `return`, add:

```tsx
  const { isMember } = useTeam();
  if (isMember && !TEAM_DATA_ACCESS_ENABLED) {
    return (
      <Section>
        <p className="text-body text-fg">{DATA_ACCESS_UNAVAILABLE}</p>
      </Section>
    );
  }
```

Import `TEAM_DATA_ACCESS_ENABLED` from `@/utils/featureFlags` and `DATA_ACCESS_UNAVAILABLE` from `@/config/teamCopy`. `useTeam` is already imported since Task 8.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/services/subjects __tests__/unit/pages/vehicles __tests__/unit/hooks/subjects && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS, including the existing `VehiclePage` suite. Without a `TeamProvider`, `useTeam()` returns no-op functions and `useLicenseDataAccess` returns `owner`. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/services/subjects/client.ts src/app/vehicles __tests__/unit/services/subjects/client.test.ts __tests__/unit/pages/vehicles
git commit -m "feat(teams): Vehicles member states, removal from proxy refusals, error state for unknown answers"
```

---

### Task 12: Data proxy: owner fast path, license access, C9 privileges, audit after exchange

**Files:**

- Modify: `src/middleware.ts` (`/api/data/*` with a valid session skips `/api/me`)
- Create: `src/utils/boundedCache.ts`, `src/services/licenseAccess.ts` (server only)
- Modify: `src/services/subjectJwt.ts` (C9 privileges; token exchange's signer 403 becomes `NO_ACCESS`; the token cache becomes bounded)
- Modify: `src/app/api/data/proxy.ts`
- Test: `__tests__/unit/utils/boundedCache.test.ts`, `__tests__/unit/services/licenseAccess.test.ts`, `__tests__/unit/services/subjectJwt.test.ts` (update and extend), `__tests__/unit/app/api/dataProxy.test.ts` (extend), `__tests__/unit/middleware/dataPath.test.ts`

**Interfaces:**

- Consumes:
  - `GET /api/my/license-access?clientId=` (C7), whose `MEMBER` requires an enabled key on that license under the caller's current signer;
  - Identity `developerLicense(by: { clientId }) { owner }`;
  - `LicenseAccess` (Task 1);
  - `NO_LONGER_HAS_ACCESS` and `TEAM_DATA_ACCESS_ENABLED`.
- Produces:
  - `BoundedCache<T>(max)`: `get(key, now)`, `set(key, value, expiresAt)`, `clear()`, `size`. It evicts the oldest entry at `max` and drops expired entries on read.
  - `authorizeLicenseAccess({ devJwt, sessionToken }, deps?): Promise<AccessDecision>`, where `AccessDecision` is one of:
    - `{ allowed: true; access: 'OWNER' | 'MEMBER'; clientId; caller: { email: string; teamId: string | null } | { wallet: string } }`. `caller` is what the audit line names: console-api's session email and the license's team, or on the owner fast path the session wallet (spec, Data proxy).
    - `{ allowed: false; status: 400 | 401 | 403 | 503; code: 'NO_ACCESS' | 'ACCESS_CHECK_FAILED' | 'DEV_JWT_INVALID' | 'INVALID_CLIENT_ID'; message; memberOfTeam?: boolean }`
  - `getLicenseAccess` and `getLicenseOwner`, both cached 60 s in a `BoundedCache` of `ACCESS_CACHE_MAX = 1000` entries. Errors are never cached.
  - `getSubjectJwt`'s token cache is a `BoundedCache` of `SUBJECT_JWT_CACHE_MAX = 1000` entries, each kept until 30 s before its token expires.
  - `clearLicenseAccessCache()`.
  - `SubjectJwtCode` gains `NO_ACCESS`.
  - `PROXY_PRIVILEGE_IDS = [1, 3, 4, 7, 8]` (C9).
- **Order inside the proxy:**
  1. Bearer check.
  2. Body checks.
  3. Asset check.
  4. Access decision. A refusal answers `{ error, code, memberOfTeam }` and logs `outcome: 'refused'`.
  5. Token exchange, then upstream.
  6. One audit line after the exchange with `outcome` (`ok`, `upstream_error`, `not_shared`, `signer_revoked`, `exchange_error` or `unreachable`) and `status`.
- **Owner fast path:** when Identity says the session wallet (`ethereum_address` of the session token) owns the developer JWT's license, the decision is `OWNER` without calling console-api. Its audit line names the session wallet in place of the email and team; every other line names the email and team, not the wallet.
- **Test coverage:** the screenshot harness mocks `/api/data/*` in the browser (`scripts/visual/shoot.mjs`, the `context.route(/\/api\/data\/…/)` call), so this proxy is covered by Jest only.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/utils/boundedCache.test.ts`:

```ts
import { BoundedCache } from '@/utils/boundedCache';

describe('BoundedCache', () => {
  it('returns entries until they expire, and drops them after', () => {
    const cache = new BoundedCache<string>(10);
    cache.set('a', 'x', 1000);
    expect(cache.get('a', 999)).toBe('x');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the oldest entry at the cap, and a rewrite counts as new', () => {
    const cache = new BoundedCache<number>(2);
    cache.set('a', 1, 100);
    cache.set('b', 2, 100);
    cache.set('a', 3, 100);
    cache.set('c', 4, 100);
    expect(cache.get('b', 0)).toBeUndefined();
    expect(cache.get('a', 0)).toBe(3);
    expect(cache.get('c', 0)).toBe(4);
  });

  it('keeps a stored null apart from a miss', () => {
    const cache = new BoundedCache<string | null>(2);
    cache.set('a', null, 100);
    expect(cache.get('a', 0)).toBeNull();
    expect(cache.get('b', 0)).toBeUndefined();
  });
});
```

`__tests__/unit/services/licenseAccess.test.ts`:

```ts
/**
 * @jest-environment node
 */
import {
  ACCESS_CACHE_MAX,
  authorizeLicenseAccess,
  clearLicenseAccessCache,
  getLicenseAccess,
} from '@/services/licenseAccess';
import type { LicenseAccess } from '@/types/team';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims: Record<string, unknown>) => [b64({ alg: 'none' }), b64(claims), 'sig'].join('.');
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const KERNEL = '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d';
const EOA = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SESSION = jwt({ ethereum_address: KERNEL });
const access = (over: Partial<LicenseAccess>): LicenseAccess => ({
  access: 'NONE',
  memberOfTeam: false,
  teamId: null,
  signerAddress: null,
  userEmail: 'sam@harness.dev',
  ...over,
});

describe('getLicenseAccess', () => {
  beforeEach(() => clearLicenseAccessCache());

  it('caches 60 s per session and client ID, any case, and never caches errors', async () => {
    let now = 1_000_000;
    const request = jest.fn(async () => access({}));
    const deps = { request, now: () => now };
    await getLicenseAccess('session-a', CLIENT, deps);
    await getLicenseAccess('session-a', CLIENT.toUpperCase().replace('0X', '0x'), deps);
    expect(request).toHaveBeenCalledTimes(1);
    now += 60_001;
    await getLicenseAccess('session-a', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(2);
    const failing = { request: jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(access({})), now: () => now };
    await expect(getLicenseAccess('session-c', CLIENT, failing)).rejects.toThrow('down');
    await getLicenseAccess('session-c', CLIENT, failing);
    expect(failing.request).toHaveBeenCalledTimes(2);
  });

  it(`holds at most ${ACCESS_CACHE_MAX} entries, evicting the oldest`, async () => {
    const request = jest.fn(async () => access({}));
    const deps = { request, now: () => 0 };
    for (let i = 0; i <= ACCESS_CACHE_MAX; i++) await getLicenseAccess(`s${i}`, CLIENT, deps);
    request.mockClear();
    await getLicenseAccess(`s${ACCESS_CACHE_MAX}`, CLIENT, deps);
    expect(request).not.toHaveBeenCalled();
    await getLicenseAccess('s0', CLIENT, deps);
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('authorizeLicenseAccess', () => {
  const lookupAccess = jest.fn();
  const lookupOwner = jest.fn();
  const decide = (claims: Record<string, unknown>, enabled = true) =>
    authorizeLicenseAccess(
      { devJwt: jwt(claims), sessionToken: SESSION },
      { lookupAccess, lookupOwner, dataAccessEnabled: enabled },
    );
  beforeEach(() => {
    lookupAccess.mockReset();
    lookupOwner.mockReset().mockResolvedValue('0x0000000000000000000000000000000000000002');
  });

  it("serves the license owner from Identity without asking console-api", async () => {
    lookupOwner.mockResolvedValue(KERNEL.toUpperCase().replace('0X', '0x'));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: true,
      access: 'OWNER',
      clientId: CLIENT,
      caller: { wallet: KERNEL },
    });
    expect(lookupAccess).not.toHaveBeenCalled();
  });

  it('falls back to console-api when Identity fails', async () => {
    lookupOwner.mockRejectedValue(new Error('identity down'));
    lookupAccess.mockResolvedValue(access({ access: 'OWNER', teamId: 't1', userEmail: 'jane@harness.dev' }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: true,
      access: 'OWNER',
      clientId: CLIENT,
      caller: { email: 'jane@harness.dev', teamId: 't1' },
    });
  });

  it('allows a member whose JWT was signed by their registered wallet, any case', async () => {
    lookupAccess.mockResolvedValue(access({ access: 'MEMBER', memberOfTeam: true, teamId: 't2', signerAddress: EOA }));
    await expect(
      decide({ ethereum_address: CLIENT, signer_address: EOA.toLowerCase() }),
    ).resolves.toEqual({
      allowed: true,
      access: 'MEMBER',
      clientId: CLIENT,
      caller: { email: 'sam@harness.dev', teamId: 't2' },
    });
  });

  it('refuses a member JWT without signer_address, from another wallet, or with the flag off', async () => {
    lookupAccess.mockResolvedValue(access({ access: 'MEMBER', memberOfTeam: true, teamId: 't2', signerAddress: EOA }));
    for (const [claims, enabled] of [
      [{ ethereum_address: CLIENT }, true],
      [{ ethereum_address: CLIENT, signer_address: '0x0000000000000000000000000000000000000001' }, true],
      [{ ethereum_address: CLIENT, signer_address: EOA }, false],
    ] as const) {
      await expect(decide(claims, enabled)).resolves.toMatchObject({
        allowed: false,
        status: 403,
        code: 'NO_ACCESS',
      });
    }
  });

  it('tells a member without a key apart from someone no longer in the team', async () => {
    lookupAccess.mockResolvedValueOnce(access({ memberOfTeam: true }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      code: 'NO_ACCESS',
      memberOfTeam: true,
    });
    lookupAccess.mockResolvedValueOnce(access({ memberOfTeam: false }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toEqual({
      allowed: false,
      status: 403,
      code: 'NO_ACCESS',
      message: 'You no longer have access to this license.',
      memberOfTeam: false,
    });
  });

  it("passes console-api's INVALID_CLIENT_ID through and fails closed otherwise", async () => {
    lookupAccess.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'INVALID_CLIENT_ID' }));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 400,
      code: 'INVALID_CLIENT_ID',
    });
    lookupAccess.mockRejectedValueOnce(new Error('timeout'));
    await expect(decide({ ethereum_address: CLIENT })).resolves.toMatchObject({
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
    });
  });

  it('answers 401 for an unreadable developer JWT or a missing session', async () => {
    await expect(
      authorizeLicenseAccess({ devJwt: 'garbage', sessionToken: SESSION }, { lookupAccess, lookupOwner }),
    ).resolves.toMatchObject({ status: 401, code: 'DEV_JWT_INVALID' });
    await expect(
      authorizeLicenseAccess({ devJwt: jwt({ ethereum_address: CLIENT }), sessionToken: null }, { lookupAccess, lookupOwner }),
    ).resolves.toMatchObject({ status: 401, code: 'NO_ACCESS' });
  });
});
```

`__tests__/unit/services/subjectJwt.test.ts`:
- In the first test, change the expected `permissions` to the C9 subset of what the license holds (the fixture holds 1, 2, 3, 4 and 7):

```ts
      permissions: [
        'privilege:GetNonLocationHistory',
        'privilege:GetCurrentLocation',
        'privilege:GetLocationHistory',
        'privilege:GetRawData',
      ],
```

- Add `SUBJECT_JWT_CACHE_MAX` to the `@/services/subjectJwt` import.
- Append:

```ts
  it('requests only the C9 privileges, never ExecuteCommands, even when the license holds all', async () => {
    fetchMock
      .mockImplementationOnce(() => json(200, { data: { vehicle: { sacd: { permissions: '0x3fffc' } } } }))
      .mockImplementationOnce(() => json(200, { token: 'vehicle-jwt' }));
    await getSubjectJwt(DEV, VEHICLE);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).permissions).toEqual([
      'privilege:GetNonLocationHistory',
      'privilege:GetCurrentLocation',
      'privilege:GetLocationHistory',
      'privilege:GetRawData',
      'privilege:GetApproximateLocation',
    ]);
  });

  it(`keeps at most ${SUBJECT_JWT_CACHE_MAX} tokens, dropping the oldest`, async () => {
    fetchMock.mockImplementation(() => json(200, { token: 'account-jwt' }));
    const account = (i: number) => `did:ethr:80002:0x${i.toString(16).padStart(40, '0')}`;
    for (let i = 0; i <= SUBJECT_JWT_CACHE_MAX; i++) await getSubjectJwt(DEV, account(i));
    fetchMock.mockClear();
    await getSubjectJwt(DEV, account(SUBJECT_JWT_CACHE_MAX));
    expect(fetchMock).not.toHaveBeenCalled();
    await getSubjectJwt(DEV, account(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps token exchange refusing a revoked signer to NO_ACCESS', async () => {
    fetchMock
      .mockImplementationOnce(() => json(200, { data: { vehicle: { sacd: { permissions: PERMS_HEX } } } }))
      .mockImplementationOnce(() =>
        json(403, { code: 403, message: 'signer no longer authorized for this license' }),
      );
    await expect(getSubjectJwt(DEV, VEHICLE)).rejects.toMatchObject({
      status: 403,
      code: 'NO_ACCESS',
      message: 'You no longer have access to this license.',
    });
  });
```

Extend `__tests__/unit/app/api/dataProxy.test.ts`:
- Before the route imports, add:

```ts
jest.mock('@/services/licenseAccess', () => ({ authorizeLicenseAccess: jest.fn() }));
import { authorizeLicenseAccess } from '@/services/licenseAccess';
```

- In `beforeEach`, add:

```ts
  (authorizeLicenseAccess as jest.Mock).mockReset().mockResolvedValue({
    allowed: true,
    access: 'MEMBER',
    clientId: '0xclient',
    caller: { email: 'jane@harness.dev', teamId: 'team-acme' },
  });
```

- Append inside the `describe`:

```ts
  const auditLines = (spy: jest.SpyInstance) =>
    spy.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('"event":"data_proxy"')).map((m) => JSON.parse(m));

  it('refuses with the decision, includes memberOfTeam, never exchanges, and logs it', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    (authorizeLicenseAccess as jest.Mock).mockResolvedValue({
      allowed: false,
      status: 403,
      code: 'NO_ACCESS',
      message: 'You no longer have access to this license.',
      memberOfTeam: false,
    });
    const res = await telemetry(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'You no longer have access to this license.',
      code: 'NO_ACCESS',
      memberOfTeam: false,
    });
    expect(getSubjectJwt).not.toHaveBeenCalled();
    expect(auditLines(info)).toEqual([
      expect.objectContaining({ outcome: 'refused', code: 'NO_ACCESS', asset: VEHICLE }),
    ]);
    info.mockRestore();
  });

  it('writes the audit line after the exchange, with the outcome', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(new Response('{"data":{}}', { status: 200 }));
    const request = req({ asset: VEHICLE, query: 'query { x }' });
    request.cookies.set('session-token', 'session.jwt');
    await telemetry(request);
    expect(authorizeLicenseAccess).toHaveBeenCalledWith({ devJwt: 'dev.jwt', sessionToken: 'session.jwt' });
    expect(auditLines(info)).toEqual([
      {
        event: 'data_proxy',
        api: 'telemetry',
        email: 'jane@harness.dev',
        teamId: 'team-acme',
        clientId: '0xclient',
        asset: VEHICLE,
        access: 'MEMBER',
        outcome: 'ok',
        status: 200,
      },
    ]);
    info.mockRestore();
  });

  it('names the session wallet, not an email or team, on the owner fast path', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    (authorizeLicenseAccess as jest.Mock).mockResolvedValue({
      allowed: true,
      access: 'OWNER',
      clientId: '0xclient',
      caller: { wallet: '0xkernel' },
    });
    fetchMock.mockResolvedValueOnce(new Response('{"data":{}}', { status: 200 }));
    await telemetry(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(auditLines(info)).toEqual([
      {
        event: 'data_proxy',
        api: 'telemetry',
        wallet: '0xkernel',
        clientId: '0xclient',
        asset: VEHICLE,
        access: 'OWNER',
        outcome: 'ok',
        status: 200,
      },
    ]);
    info.mockRestore();
  });

  it('logs a revoked signer from token exchange and answers NO_ACCESS', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    (getSubjectJwt as jest.Mock).mockRejectedValue(
      new SubjectJwtError(403, 'NO_ACCESS', 'You no longer have access to this license.'),
    );
    const res = await telemetry(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('NO_ACCESS');
    expect(auditLines(info)[0]).toMatchObject({ outcome: 'signer_revoked', status: 403 });
    info.mockRestore();
  });
```

`__tests__/unit/middleware/dataPath.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/services/dimoDevAPI', () => ({
  cookieName: 'session-token',
  getCookie: jest.fn(async () => 'session.jwt'),
}));
jest.mock('@/utils/middlewareUtils', () => ({
  ...jest.requireActual('@/utils/middlewareUtils'),
  decodeJwtToken: jest.fn(async () => ({ ethereum_address: '0xkernel' })),
}));
jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { getUserByToken } from '@/services/user';
import { middleware } from '@/middleware';

describe('middleware and the data proxy', () => {
  it("lets /api/data/* through on a valid session without calling console-api's /api/me", async () => {
    const res = await middleware(
      new NextRequest('http://console.test/api/data/telemetry', { method: 'POST' }),
      {} as never,
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
    expect(getUserByToken).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/utils/boundedCache.test.ts __tests__/unit/services/licenseAccess.test.ts __tests__/unit/services/subjectJwt.test.ts __tests__/unit/app/api/dataProxy.test.ts __tests__/unit/middleware/dataPath.test.ts`
Expected: FAIL:
- `boundedCache` and `licenseAccess` are missing;
- the exchange still requests `ExecuteCommands`, calls a revoked signer `NOT_SHARED` and caches without a bound;
- the proxy neither checks nor logs;
- the middleware calls `/api/me`.

- [ ] **Step 3: Implement**

`src/middleware.ts`: directly after `const token = await getToken();`, add:

```ts
  // The data proxy authorizes every request itself (owners through Identity),
  // so it must not depend on console-api's /api/me answering. The session JWT
  // was verified by getToken above.
  if (token && request.nextUrl.pathname.startsWith(`${API_PATH}/data/`)) {
    return NextResponse.next();
  }
```

`API_PATH` is the existing configuration constant (`'/api'` in `src/config/default.ts`), so the prefix is `/api/data/`. This goes after Task 3's `inviteRedirect` call, which only handles `/sign-in`.

`src/services/licenseAccess.ts`:

```ts
// Server only: may the signed-in user use this developer JWT's license?
// Owners are recognised from Identity alone; everyone else asks console-api
// (C7), and a member must present a JWT their registered wallet signed (C1).
import { createHash } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import configuration from '@/config';
import { NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { BoundedCache } from '@/utils/boundedCache';
import type { LicenseAccess } from '@/types/team';

export type AccessDecision =
  | {
      allowed: true;
      access: 'OWNER' | 'MEMBER';
      clientId: string;
      // Who the audit line names (spec, Data proxy): console-api's session email
      // and the license's team, or on the owner fast path the session wallet.
      caller: { email: string; teamId: string | null } | { wallet: string };
    }
  | {
      allowed: false;
      status: 400 | 401 | 403 | 503;
      code: 'NO_ACCESS' | 'ACCESS_CHECK_FAILED' | 'DEV_JWT_INVALID' | 'INVALID_CLIENT_ID';
      message: string;
      memberOfTeam?: boolean;
    };

const TTL_MS = 60_000;
export const ACCESS_CACHE_MAX = 1000;

// Entries live 60 s; a failed lookup is never stored.
const accessCache = new BoundedCache<LicenseAccess>(ACCESS_CACHE_MAX);
const ownerCache = new BoundedCache<string | null>(ACCESS_CACHE_MAX);
export const clearLicenseAccessCache = () => {
  accessCache.clear();
  ownerCache.clear();
};

class AccessLookupError extends Error {
  constructor(public readonly code: string | null) {
    super(code ?? 'license-access failed');
  }
}

const requestLicenseAccess = async (
  sessionToken: string,
  clientId: string,
): Promise<LicenseAccess> => {
  try {
    const { data } = await axios.get<LicenseAccess>('/api/my/license-access', {
      baseURL: configuration.backendUrl,
      timeout: 5000,
      params: { clientId },
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data;
  } catch (error) {
    const code =
      error instanceof AxiosError
        ? ((error.response?.data as { code?: string } | undefined)?.code ?? null)
        : null;
    throw new AccessLookupError(code);
  }
};

const requestLicenseOwner = async (clientId: string): Promise<string | null> => {
  const res = await fetch(configuration.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query LicenseOwner($clientId: Address!) { developerLicense(by: { clientId: $clientId }) { owner } }',
      variables: { clientId },
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Identity API answered ${res.status}`);
  const body = (await res.json()) as {
    data?: { developerLicense?: { owner: string } | null } | null;
    errors?: unknown[];
  };
  if (!body.data && body.errors?.length) throw new Error('Identity API error');
  return body.data?.developerLicense?.owner ?? null;
};

const sessionKey = (sessionToken: string, clientId: string) =>
  `${createHash('sha256').update(sessionToken).digest('hex')}:${clientId.toLowerCase()}`;

export const getLicenseAccess = async (
  sessionToken: string,
  clientId: string,
  deps = { request: requestLicenseAccess, now: Date.now },
): Promise<LicenseAccess> => {
  const key = sessionKey(sessionToken, clientId);
  const hit = accessCache.get(key, deps.now());
  if (hit) return hit;
  const value = await deps.request(sessionToken, clientId);
  accessCache.set(key, value, deps.now() + TTL_MS);
  return value;
};

export const getLicenseOwner = async (
  clientId: string,
  deps = { request: requestLicenseOwner, now: Date.now },
): Promise<string | null> => {
  const key = clientId.toLowerCase();
  const hit = ownerCache.get(key, deps.now());
  if (hit !== undefined) return hit;
  const value = await deps.request(clientId);
  ownerCache.set(key, value, deps.now() + TTL_MS);
  return value;
};

const decode = <T>(token: string): T | null => {
  try {
    return jwtDecode<T>(token);
  } catch {
    return null;
  }
};

export const authorizeLicenseAccess = async (
  { devJwt, sessionToken }: { devJwt: string; sessionToken: string | null },
  deps: {
    lookupAccess?: (sessionToken: string, clientId: string) => Promise<LicenseAccess>;
    lookupOwner?: (clientId: string) => Promise<string | null>;
    dataAccessEnabled?: boolean;
  } = {},
): Promise<AccessDecision> => {
  const lookupAccess = deps.lookupAccess ?? ((s: string, c: string) => getLicenseAccess(s, c));
  const lookupOwner = deps.lookupOwner ?? ((c: string) => getLicenseOwner(c));
  const dataAccessEnabled = deps.dataAccessEnabled ?? TEAM_DATA_ACCESS_ENABLED;

  const claims = decode<{ ethereum_address?: string; signer_address?: string }>(devJwt);
  if (!claims?.ethereum_address) {
    return { allowed: false, status: 401, code: 'DEV_JWT_INVALID', message: 'The developer JWT could not be read' };
  }
  if (!sessionToken) {
    return { allowed: false, status: 401, code: 'NO_ACCESS', message: 'Sign in again to read this license.' };
  }
  const clientId = claims.ethereum_address;
  const wallet = decode<{ ethereum_address?: string }>(sessionToken)?.ethereum_address ?? null;

  // Owner fast path: console-api is not needed to know a wallet owns a license.
  if (wallet) {
    try {
      const owner = await lookupOwner(clientId);
      if (owner && owner.toLowerCase() === wallet.toLowerCase()) {
        return { allowed: true, access: 'OWNER', clientId, caller: { wallet } };
      }
    } catch {
      // Identity unavailable: console-api decides.
    }
  }

  let access: LicenseAccess;
  try {
    access = await lookupAccess(sessionToken, clientId);
  } catch (error) {
    if ((error as { code?: string }).code === 'INVALID_CLIENT_ID') {
      return {
        allowed: false,
        status: 400,
        code: 'INVALID_CLIENT_ID',
        message: 'The developer JWT names a license console-api does not know',
      };
    }
    return {
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
      message: 'Could not verify your access to this license. Try again.',
    };
  }

  if (access.access === 'OWNER') {
    return { allowed: true, access: 'OWNER', clientId, caller: { email: access.userEmail, teamId: access.teamId } };
  }
  const signer = claims.signer_address?.toLowerCase();
  if (
    access.access === 'MEMBER' &&
    dataAccessEnabled &&
    signer &&
    access.signerAddress &&
    signer === access.signerAddress.toLowerCase()
  ) {
    return { allowed: true, access: 'MEMBER', clientId, caller: { email: access.userEmail, teamId: access.teamId } };
  }
  return {
    allowed: false,
    status: 403,
    code: 'NO_ACCESS',
    message: access.memberOfTeam
      ? "You don't have data access to this license."
      : NO_LONGER_HAS_ACCESS,
    memberOfTeam: access.memberOfTeam,
  };
};
```

`src/utils/boundedCache.ts`:

```ts
// A Map with a size cap (the oldest entry goes first) and a per-entry expiry,
// so a server cache stays bounded however many sessions, licenses or assets
// pass through it (like the JWKS key set, #308).
export class BoundedCache<T> {
  private entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(private readonly max: number) {}

  get(key: string, now: number): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, expiresAt: number) {
    this.entries.delete(key);
    if (this.entries.size >= this.max) {
      this.entries.delete(this.entries.keys().next().value as string);
    }
    this.entries.set(key, { value, expiresAt });
  }

  clear() {
    this.entries.clear();
  }

  get size() {
    return this.entries.size;
  }
}
```

`src/services/subjectJwt.ts`:
- Add `import { NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';` and `import { BoundedCache } from '@/utils/boundedCache';`.
- Bound the token cache. Replace `type Cached = { token: string; expiresAt: number };` and `const cache = new Map<string, Cached>();` with:

```ts
export const SUBJECT_JWT_CACHE_MAX = 1000;
// A token per (developer JWT, asset), kept until it expires; bounded so a long
// running server doesn't grow with every asset ever read.
const cache = new BoundedCache<string>(SUBJECT_JWT_CACHE_MAX);
```

- In `getSubjectJwt`, replace the two hit lines (`const hit = cache.get(key);` and the `if (hit && hit.expiresAt > …)` after it) with:

```ts
  // An entry within EXPIRY_SKEW_MS of expiring counts as expired.
  const hit = cache.get(key, Date.now() + EXPIRY_SKEW_MS);
  if (hit) return hit;
```

- In `exchangeFor`, replace `cache.set(key, { token, expiresAt: expiryOf(token) });` with `cache.set(key, token, expiryOf(token));`. `clearSubjectJwtCache` keeps calling `cache.clear()`.
- Extend `export type SubjectJwtCode = 'DEV_JWT_INVALID' | 'NOT_SHARED' | 'NO_ACCESS' | 'UPSTREAM';`.
- Add above `vehiclePermissions`:

```ts
// Contracts C9: only the privileges Vehicles reads — non-location history,
// current and approximate location, location history (trips) and raw events.
// Never ExecuteCommands, VIN credentials or live data.
export const PROXY_PRIVILEGE_IDS = [1, 3, 4, 7, 8];
```

- In `vehiclePermissions`, filter the decoded IDs:

```ts
  const names = hex
    ? decodeSacdPermissions(hex)
        .filter((id) => PROXY_PRIVILEGE_IDS.includes(id))
        .map((id) => PERMISSION_NAMES[id])
        .filter((n): n is string => !!n)
    : [];
```

- In `exchangeFor`, replace the `res.status === 403` branch with:

```ts
  if (res.status === 403) {
    const reason = await res.text();
    // Token exchange refuses a disabled signer with this exact message (C2).
    if (reason.includes('signer no longer authorized for this license')) {
      throw new SubjectJwtError(403, 'NO_ACCESS', NO_LONGER_HAS_ACCESS);
    }
    throw new SubjectJwtError(403, 'NOT_SHARED', 'This asset is not shared with the license');
  }
```

`src/app/api/data/proxy.ts`:
- Add the imports:

```ts
import { authorizeLicenseAccess, type AccessDecision } from '@/services/licenseAccess';
import { cookieName } from '@/services/dimoDevAPI';
```

- Add above `createDataProxy`:

```ts
type Outcome =
  | 'ok'
  | 'upstream_error'
  | 'not_shared'
  | 'signer_revoked'
  | 'exchange_error'
  | 'unreachable'
  | 'refused';

// One structured line per proxied request (spec: Audit), written once the
// outcome is known.
const audit = (entry: Record<string, unknown> & { outcome: Outcome }) =>
  console.info(JSON.stringify({ event: 'data_proxy', ...entry }));

// The email and team, or on the owner fast path the session wallet.
const who = (api: DataApi, asset: string, decision: Extract<AccessDecision, { allowed: true }>) => ({
  api,
  ...decision.caller,
  clientId: decision.clientId,
  asset,
  access: decision.access,
});

const EXCHANGE_OUTCOME: Record<string, Outcome> = {
  NO_ACCESS: 'signer_revoked',
  NOT_SHARED: 'not_shared',
};
```

- Replace the body of `createDataProxy` from the `assetAllowed` check through the end with:

```ts
  if (!assetAllowed(api, body.asset))
    return bad(`asset is not a DID this ${api} proxy serves`);

  const sessionToken = req.cookies.get(cookieName)?.value ?? null;
  const decision = await authorizeLicenseAccess({ devJwt, sessionToken });
  if (!decision.allowed) {
    audit({ api, asset: body.asset, outcome: 'refused', code: decision.code, status: decision.status });
    return NextResponse.json(
      { error: decision.message, code: decision.code, memberOfTeam: decision.memberOfTeam },
      { status: decision.status },
    );
  }

  try {
    const token = await getSubjectJwt(devJwt, body.asset);
    const upstream = await fetch(UPSTREAM[api](), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: body.query, variables: body.variables }),
      cache: 'no-store',
    });
    const text = await upstream.text();
    audit({ ...who(api, body.asset, decision), outcome: upstream.ok ? 'ok' : 'upstream_error', status: upstream.status });
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof SubjectJwtError) {
      audit({ ...who(api, body.asset, decision), outcome: EXCHANGE_OUTCOME[err.code] ?? 'exchange_error', status: err.status });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    audit({ ...who(api, body.asset, decision), outcome: 'unreachable', status: 502 });
    return NextResponse.json(
      { error: `The ${api} API could not be reached`, code: 'UPSTREAM' },
      { status: 502 },
    );
  }
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/utils/boundedCache.test.ts __tests__/unit/services/licenseAccess.test.ts __tests__/unit/services/subjectJwt.test.ts __tests__/unit/app/api/dataProxy.test.ts __tests__/unit/middleware && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/utils/boundedCache.ts src/services/licenseAccess.ts src/services/subjectJwt.ts src/app/api/data/proxy.ts __tests__/unit/utils/boundedCache.test.ts __tests__/unit/services/licenseAccess.test.ts __tests__/unit/services/subjectJwt.test.ts __tests__/unit/app/api/dataProxy.test.ts __tests__/unit/middleware/dataPath.test.ts
git commit -m "feat(teams): data proxy with an owner fast path, member key check, C9 privileges and post-exchange audit"
```

---

### Task 13: Settings → Team: members, invites, leaving; retire the collaborator UI

**Files:**

- Create: `src/hooks/useTeamMembers.ts`, `src/hooks/useTeamLicenses.ts`
- Create: `src/components/RowActionsMenu/RowActionsMenu.tsx`, `src/components/RowActionsMenu/index.ts` (shared with the API keys table in Task 16)
- Create in `src/app/settings/components/Team/`: `memberStatus.ts`, `memberKeys.ts`, `inviteSendError.ts`, `MembersTable.tsx`, `InviteMemberModal.tsx`, `LeaveTeam.tsx`, `TeamSection.tsx`, `index.ts`
- Modify: `src/app/settings/components/View/View.tsx`
- Modify: `src/types/team.ts` (delete the legacy enums and interfaces except `ITeam`), `src/types/user.ts`, `src/types/next-auth.d.ts`, `src/hooks/index.ts`, `src/config/default.ts`, `src/config/index.ts` (drop `ROLES`)
- Delete:
  - `src/app/settings/components/TeamManagement/`, `src/app/settings/components/TeamForm/`, `src/app/settings/components/TeamFormModal/`;
  - `src/hooks/useTeamCollaborators.ts`, `src/actions/team.ts`, `src/services/team.ts`;
  - `__tests__/unit/pages/app/settings/TeamManagement.test.tsx` and its snapshot.
- Test (all in `__tests__/unit/pages/app/settings/` unless noted):
  - `__tests__/unit/hooks/useTeamMembers.test.tsx`
  - `memberKeys.test.ts`, `MembersTable.test.tsx`, `InviteMemberModal.test.tsx`, `LeaveTeam.test.tsx`, `TeamSection.test.tsx`

**Interfaces:**

- Consumes:
  - From `@/actions/teams` (Task 2): `listTeamMembers`, `inviteTeamMember`, `resendTeamInvite`, `cancelTeamInvite` and `leaveTeam`.
  - From Task 4: `useTeam()`, `hardNavigate`, and the cookie helpers.
  - `DEVELOPER_LICENSES_FOR_WEBHOOKS` (Task 8), `unwrap`/`TeamApiError` (Task 1), and `leaveConfirm` (C8).
- Produces:
  - **`useTeamMembers()`:** `{ members, isLoading, isError, error, refetch, upsertMember }`.
    - React Query key `['team-members', activeTeamId]`.
    - Failures throw `TeamApiError`, so `TeamProvider` sees `NOT_A_MEMBER`.
    - `mergeMember(list, member)` is exported.
  - **`useTeamLicenses()`:** `{ licenses: TeamLicense[], loading, error, refetch }`, every license of the team owner (not only ones with a redirect URI), sharing Apollo's cache with `useValidDeveloperLicenses`. `TeamLicense = { tokenId, clientId, label, redirectUri: string | null, signers: string[] }`; the signers are lowercase. `licenses` is `[]` while loading and on error, so nothing may read "not on-chain" from it until it loaded cleanly.
  - **`memberLicenseKeys(member, licenses): MemberLicenseKey[]`:**
    - `MemberLicenseKey = { tokenId, licenseLabel, signer, onChain, registered, licenseKnown }`, where `licenseKnown` says the license is in the loaded list (only then does `onChain: false` mean anything);
    - it combines every `memberKeys` entry (`registered: true`, any wallet the member ever used) with the member's current wallet wherever the chain lists it;
    - addresses compare case-insensitively.
  - `memberAddresses(member): string[]` returns lowercase addresses.
  - **`grantCandidates(member, licenses): { license, onChain }[]`:** licenses with a redirect URI where the member's current wallet has no recorded key. Empty unless the member is an accepted `MEMBER` with a linked wallet. `onChain: true` marks a key already enabled whose registry write failed, so it only needs recording.
  - `memberStatus(member, now?)` returns `{ tone, label }`: `Active`, `Invited`, `Invite expired`, `Removed` (`REVOKED`) or `Left`.
  - `inviteSendError(failure, email)`: C7/C8 invite errors; console-api's message for `RATE_LIMITED`, `NOT_A_MEMBER` and anything unknown.
  - **`MembersTable`:** `{ members, licenses, licensesReady?, isOwner, showDataAccess, handlers? }`. Until `licensesReady` the Data access cell shows `—`.
    - `handlers: Partial<Record<'grant' | 'revoke' | 'remove' | 'resend' | 'cancel', (m) => void>>`. A menu item appears only when its handler exists; Tasks 14 and 15 add `grant`, `revoke` and `remove`.
    - Menu labels follow the spec: **Grant**, **Revoke** (**Retry** for a removed member's leftover keys), **Remove**, **Resend** and **Cancel invite**.
    - The Data access cell reads `Still a signer on {licenses}` for a removed or departed member whose keys are still on-chain, and `Needs to sign in once` for a member without a verified wallet.
  - `RowActionsMenu`: `{ label, items: { label, onSelect, destructive? }[] }`.
  - **`TeamSection`**, wrapped in `withLoadingStatus`, renders one of:
    - loading;
    - error (Retry);
    - the owner's empty state;
    - the table.

    Owners get Invite; members get Leave team. If the team's licenses can't load, an alert with Try again says data access can't be changed right now; Tasks 14 and 15 offer Grant, Revoke and Remove only once they have loaded cleanly.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hooks/useTeamMembers.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ activeTeam: { id: 'team-harness' }, isLoading: false }),
}));
import { listTeamMembers } from '@/actions/teams';
import { mergeMember, useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamApiError } from '@/utils/teamApiError';
import type { TeamMember } from '@/types/team';

const member = (id: string, email: string): TeamMember => ({
  id,
  userId: null,
  name: null,
  email,
  role: 'MEMBER',
  status: 'PENDING',
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-10-01T00:00:00Z',
  inviteExpiresAt: '2026-10-08T00:00:00Z',
});
const makeWrapper = () => {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useTeamMembers', () => {
  it('loads the members and upserts one in place', async () => {
    (listTeamMembers as jest.Mock).mockResolvedValue({
      ok: true,
      data: { members: [member('m-1', 'a@harness.dev')] },
    });
    const { result } = renderHook(() => useTeamMembers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.members).toHaveLength(1));
    result.current.upsertMember(member('m-2', 'b@harness.dev'));
    await waitFor(() => expect(result.current.members.map((m) => m.id)).toEqual(['m-1', 'm-2']));
  });

  it('fails with a TeamApiError so TeamProvider can see NOT_A_MEMBER', async () => {
    (listTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'Not a member',
    });
    const { result } = renderHook(() => useTeamMembers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(TeamApiError);
    expect((result.current.error as TeamApiError).code).toBe('NOT_A_MEMBER');
  });

  it('mergeMember replaces by id and appends new members', () => {
    const list = [member('m-1', 'a@harness.dev')];
    expect(mergeMember(list, { ...list[0], status: 'ACCEPTED' })[0].status).toBe('ACCEPTED');
    expect(mergeMember(list, member('m-2', 'b@harness.dev'))).toHaveLength(2);
  });
});
```

`__tests__/unit/pages/app/settings/memberKeys.test.ts`:

```ts
import {
  grantCandidates,
  memberAddresses,
  memberLicenseKeys,
} from '@/app/settings/components/Team/memberKeys';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const LICENSES: TeamLicense[] = [
  { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [CURRENT.toLowerCase()] },
  { tokenId: 43, clientId: '0xbbb', label: 'Harness Labs', redirectUri: 'https://y', signers: [OLD.toLowerCase()] },
  { tokenId: 44, clientId: '0xccc', label: 'Harness Old', redirectUri: null, signers: [] },
];
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [
    { licenseTokenId: 42, signerAddress: CURRENT },
    { licenseTokenId: 43, signerAddress: OLD },
    { licenseTokenId: 44, signerAddress: OLD },
  ],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};

describe('memberLicenseKeys', () => {
  it('covers keys under an old wallet and says which are still on-chain', () => {
    expect(memberLicenseKeys(SAM, LICENSES)).toEqual([
      { tokenId: 42, licenseLabel: 'Harness Fleet', signer: CURRENT, onChain: true, registered: true, licenseKnown: true },
      { tokenId: 43, licenseLabel: 'Harness Labs', signer: OLD, onChain: true, registered: true, licenseKnown: true },
      { tokenId: 44, licenseLabel: 'Harness Old', signer: OLD, onChain: false, registered: true, licenseKnown: true },
    ]);
  });

  it('adds the current wallet where the chain lists it without a registry row, any case', () => {
    const unregistered = { ...SAM, signerAddress: CURRENT.toLowerCase() as `0x${string}`, memberKeys: [] };
    expect(memberLicenseKeys(unregistered, LICENSES)).toEqual([
      {
        tokenId: 42,
        licenseLabel: 'Harness Fleet',
        signer: CURRENT.toLowerCase(),
        onChain: true,
        registered: false,
        licenseKnown: true,
      },
    ]);
  });

  it('marks a key whose license is not in the loaded list, so nothing reads it as off-chain', () => {
    const moved = { ...SAM, memberKeys: [{ licenseTokenId: 99, signerAddress: OLD }] };
    expect(memberLicenseKeys(moved, LICENSES)).toContainEqual(
      expect.objectContaining({ tokenId: 99, licenseLabel: 'License #99', licenseKnown: false }),
    );
    // Licenses still loading (or failed): every registry key is unknown.
    expect(memberLicenseKeys(SAM, []).every((k) => !k.licenseKnown)).toBe(true);
  });

  it('lists every address the member used, lowercase and unique', () => {
    expect(memberAddresses(SAM)).toEqual([CURRENT.toLowerCase(), OLD.toLowerCase()]);
  });
});

describe('grantCandidates', () => {
  it('offers licenses with a redirect URI where the current wallet has no recorded key', () => {
    // 42: recorded under CURRENT. 43: recorded only under OLD. 44: no redirect URI.
    expect(grantCandidates(SAM, LICENSES)).toEqual([{ license: LICENSES[1], onChain: false }]);
  });

  it('offers an on-chain key whose registry write failed, marked onChain', () => {
    const unrecorded = { ...SAM, memberKeys: [] };
    expect(grantCandidates(unrecorded, LICENSES)).toEqual([
      { license: LICENSES[0], onChain: true },
      { license: LICENSES[1], onChain: false },
    ]);
  });

  it('offers nothing to a member without a linked wallet, an invite or a former member', () => {
    expect(grantCandidates({ ...SAM, signerAddress: null }, LICENSES)).toEqual([]);
    expect(grantCandidates({ ...SAM, status: 'PENDING', userId: null }, LICENSES)).toEqual([]);
    expect(grantCandidates({ ...SAM, status: 'LEFT' }, LICENSES)).toEqual([]);
  });
});
```

`__tests__/unit/pages/app/settings/MembersTable.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MembersTable } from '@/app/settings/components/Team/MembersTable';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SAM_WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD_WALLET = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const base = {
  userId: null,
  name: null,
  role: 'MEMBER' as const,
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const MEMBERS: TeamMember[] = [
  { ...base, id: 'm-owner', userId: 'u-jane', name: 'Jane Harness', email: 'jane@harness.dev', role: 'OWNER', status: 'ACCEPTED' },
  {
    ...base,
    id: 'm-sam',
    userId: 'u-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    status: 'ACCEPTED',
    signerAddress: SAM_WALLET,
    memberKeys: [{ licenseTokenId: 42, signerAddress: SAM_WALLET }],
  },
  { ...base, id: 'm-ana', email: 'ana@harness.dev', status: 'PENDING', inviteExpiresAt: '2099-01-01T00:00:00Z' },
  {
    ...base,
    id: 'm-leo',
    userId: 'u-leo',
    name: 'Leo Park',
    email: 'leo@harness.dev',
    status: 'LEFT',
    memberKeys: [{ licenseTokenId: 42, signerAddress: OLD_WALLET }],
  },
];
const LICENSES: TeamLicense[] = [
  { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [SAM_WALLET.toLowerCase()] },
  { tokenId: 43, clientId: '0xbbb', label: 'Harness Labs', redirectUri: 'https://y', signers: [] },
];
const handlers = {
  grant: jest.fn(),
  revoke: jest.fn(),
  remove: jest.fn(),
  resend: jest.fn(),
  cancel: jest.fn(),
};
const show = (props: Partial<React.ComponentProps<typeof MembersTable>> = {}) =>
  render(
    <MembersTable
      members={MEMBERS}
      licenses={LICENSES}
      isOwner
      showDataAccess
      handlers={handlers}
      {...props}
    />,
  );
const menu = (email: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${email}` }));
  return within(screen.getByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent);
};

describe('MembersTable', () => {
  it('shows each status with a status chip, LEFT like REVOKED', () => {
    show();
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });

  it('shows data access per member, and an unfinished revoke for a key left in the registry', () => {
    show();
    expect(screen.getByText('Harness Fleet')).toBeInTheDocument();
    expect(screen.getByText('Revoke unfinished')).toBeInTheDocument();
  });

  it('hides the Data access column and Grant while the flag is off (C5)', () => {
    show({ showDataAccess: false });
    expect(screen.queryByRole('columnheader', { name: 'Data access' })).toBeNull();
    expect(menu('sam@harness.dev')).toEqual(['Revoke', 'Remove']);
  });

  it('collapses row actions into one ⋯ menu and hides low-priority columns on phones', () => {
    show();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toHaveClass('hidden', 'md:table-cell');
    expect(screen.getByRole('columnheader', { name: 'Data access' })).toHaveClass('hidden', 'md:table-cell');
    expect(screen.queryByRole('button', { name: 'Actions for jane@harness.dev' })).toBeNull();
    expect(menu('sam@harness.dev')).toEqual(['Grant', 'Revoke', 'Remove']);
  });

  it('offers resend and cancel for an invite, and revoking for a member who left', () => {
    show();
    expect(menu('ana@harness.dev')).toEqual(['Resend', 'Cancel invite']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Resend' }));
    expect(handlers.resend).toHaveBeenCalledWith(MEMBERS[2]);
    expect(menu('leo@harness.dev')).toEqual(['Revoke']);
  });

  it("shows a removed member who is still a signer, with Retry, and a member who hasn't linked a wallet", () => {
    show({
      members: [
        { ...MEMBERS[3], id: 'm-rex', email: 'rex@harness.dev', status: 'REVOKED', memberKeys: [{ licenseTokenId: 42, signerAddress: SAM_WALLET }] },
        { ...MEMBERS[1], id: 'm-new', email: 'new@harness.dev', signerAddress: null, memberKeys: [] },
      ],
    });
    expect(screen.getByText('Still a signer on Harness Fleet')).toBeInTheDocument();
    expect(screen.getByText('Needs to sign in once')).toBeInTheDocument();
    expect(menu('rex@harness.dev')).toEqual(['Retry']);
  });

  it('gives members no actions', () => {
    show({ isOwner: false, showDataAccess: false, handlers: undefined });
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
  });
});
```

`__tests__/unit/pages/app/settings/InviteMemberModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/teams', () => ({ inviteTeamMember: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
import { inviteTeamMember } from '@/actions/teams';
import { toast } from 'sonner';
import { InviteMemberModal } from '@/app/settings/components/Team/InviteMemberModal';

const onInvited = jest.fn();
const onClose = jest.fn();
const invite = async (email = 'sam@harness.dev') => {
  render(<InviteMemberModal isOpen onClose={onClose} teamId="team-harness" onInvited={onInvited} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
};
const refuse = (status: number, code: string, message: string) =>
  (inviteTeamMember as jest.Mock).mockResolvedValue({ ok: false, status, code, message });

describe('InviteMemberModal', () => {
  it('sends the invite, adds the row, tracks it and confirms', async () => {
    const member = { id: 'm-sam', email: 'sam@harness.dev' };
    (inviteTeamMember as jest.Mock).mockResolvedValue({ ok: true, data: { member } });
    await invite();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invite sent to sam@harness.dev'));
    expect(inviteTeamMember).toHaveBeenCalledWith('sam@harness.dev');
    expect(onInvited).toHaveBeenCalledWith(member);
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Sent', { teamId: 'team-harness' });
    expect(onClose).toHaveBeenCalled();
  });

  it('explains an email that could not be sent', async () => {
    refuse(502, 'EMAIL_FAILED', 'Email failed');
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't email sam@harness.dev. Try again.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows console-api's message for rate limits and an unfinished team", async () => {
    refuse(429, 'RATE_LIMITED', 'This team has sent 10 invitations in the last hour. Try again later.');
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This team has sent 10 invitations in the last hour. Try again later.',
    );
  });

  it('shows Finish setting up your team first for NOT_A_MEMBER', async () => {
    refuse(403, 'NOT_A_MEMBER', 'Finish setting up your team first');
    await invite();
    expect(await screen.findByRole('alert')).toHaveTextContent('Finish setting up your team first');
  });
});
```

`__tests__/unit/pages/app/settings/LeaveTeam.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/actions/teams', () => ({ leaveTeam: jest.fn() }));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const reportRemoved = jest.fn();
const flashAfterReload = jest.fn();
const ACME = {
  id: 'team-acme',
  name: 'Acme Mobility',
  role: 'MEMBER',
  ownerEmail: 'ops@acme.dev',
  isPersonal: false,
};
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({
    activeTeam: ACME,
    teams: [{ id: 'team-harness', isPersonal: true }, ACME],
    reportRemoved,
    flashAfterReload,
  }),
}));
import { leaveTeam } from '@/actions/teams';
import { hardNavigate } from '@/utils/hardNavigate';
import { LeaveTeam } from '@/app/settings/components/Team/LeaveTeam';

const confirmLeaving = () => {
  render(<LeaveTeam />);
  fireEvent.click(screen.getByRole('button', { name: 'Leave team' }));
  expect(
    screen.getByText('Leave Acme Mobility? ops@acme.dev will be asked to revoke your data access.'),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
};

describe('LeaveTeam', () => {
  beforeEach(() => {
    document.cookie = 'active_team=team-acme; Path=/';
  });

  it('leaves, tracks it and reloads into the personal team', async () => {
    (leaveTeam as jest.Mock).mockResolvedValue({ ok: true, data: null });
    confirmLeaving();
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(document.cookie).toContain('active_team=team-harness');
    expect(trackEvent).toHaveBeenCalledWith('Team Left', { teamId: 'team-acme' });
    expect(flashAfterReload).toHaveBeenCalledWith({ tone: 'success', message: 'You left Acme Mobility.' });
  });

  it('treats NOT_A_MEMBER as already removed', async () => {
    (leaveTeam as jest.Mock).mockResolvedValue({ ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'x' });
    confirmLeaving();
    await waitFor(() => expect(reportRemoved).toHaveBeenCalled());
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
```

`__tests__/unit/pages/app/settings/TeamSection.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeamLicenses', () => ({ useTeamLicenses: jest.fn() }));
jest.mock('@/actions/teams', () => ({
  resendTeamInvite: jest.fn(),
  cancelTeamInvite: jest.fn(),
  inviteTeamMember: jest.fn(),
  leaveTeam: jest.fn(),
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Mutable test state lives in a holder (Global Constraints, Commits).
const mockFlags = { dataAccess: true };
jest.mock('@/utils/featureFlags', () => ({
  TEMPLATE_EDITOR_ENABLED: false,
  get TEAM_DATA_ACCESS_ENABLED() {
    return mockFlags.dataAccess;
  },
}));
import { useTeam } from '@/hooks/useTeam';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { resendTeamInvite } from '@/actions/teams';
import { toast } from 'sonner';
import { TeamSection } from '@/app/settings/components/Team';
import type { TeamMember } from '@/types/team';

const OWNER_ROW: TeamMember = {
  id: 'm-owner',
  userId: 'u-jane',
  name: 'Jane Harness',
  email: 'jane@harness.dev',
  role: 'OWNER',
  status: 'ACCEPTED',
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const ANA: TeamMember = {
  ...OWNER_ROW,
  id: 'm-ana',
  userId: null,
  name: null,
  email: 'ana@harness.dev',
  role: 'MEMBER',
  status: 'PENDING',
  inviteExpiresAt: '2099-01-01T00:00:00Z',
};
const HARNESS = { id: 'team-harness', name: 'Harness Motors', role: 'OWNER', isPersonal: true, ownerEmail: 'jane@harness.dev' };
const ACME = { id: 'team-acme', name: 'Acme Mobility', role: 'MEMBER', isPersonal: false, ownerEmail: 'ops@acme.dev' };
const members = (over: Partial<ReturnType<typeof useTeamMembers>>) =>
  (useTeamMembers as jest.Mock).mockReturnValue({
    members: [OWNER_ROW, ANA],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    upsertMember: jest.fn(),
    ...over,
  });
const asOwner = () =>
  (useTeam as jest.Mock).mockReturnValue({
    activeTeam: HARNESS,
    teams: [HARNESS],
    isOwner: true,
    isMember: false,
    isLoading: false,
    reportRemoved: jest.fn(),
    flashAfterReload: jest.fn(),
  });

describe('TeamSection', () => {
  beforeEach(() => {
    asOwner();
    members({});
    (useTeamLicenses as jest.Mock).mockReturnValue({ licenses: [], loading: false, refetch: jest.fn() });
  });

  it('shows a loader while the members load', () => {
    members({ members: [], isLoading: true });
    const { container } = render(<TeamSection />);
    expect(container.querySelector('.loader')).not.toBeNull();
  });

  it('shows an error with a retry', () => {
    const refetch = jest.fn();
    members({ members: [], isError: true, refetch });
    render(<TeamSection />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your team.");
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it("says when the team's licenses can't load, and loads them again", () => {
    const refetchLicenses = jest.fn();
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [],
      loading: false,
      error: new Error('Identity down'),
      refetch: refetchLicenses,
    });
    render(<TeamSection />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load this team's licenses, so data access can't be changed right now.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load licenses again' }));
    expect(refetchLicenses).toHaveBeenCalled();
  });

  it('invites the first teammate from the empty state', () => {
    members({ members: [OWNER_ROW] });
    render(<TeamSection />);
    expect(screen.getByText(/Invite teammates to share this team/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument();
  });

  it('resends an invite and tracks it', async () => {
    (resendTeamInvite as jest.Mock).mockResolvedValue({ ok: true, data: { member: ANA } });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for ana@harness.dev' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Resend' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invite resent to ana@harness.dev'));
    expect(resendTeamInvite).toHaveBeenCalledWith('m-ana');
    expect(trackEvent).toHaveBeenCalledWith('Team Invite Resent', { teamId: 'team-harness' });
  });

  it('shows members the team without invite or row actions, and lets them leave', () => {
    (useTeam as jest.Mock).mockReturnValue({
      activeTeam: ACME,
      teams: [HARNESS, ACME],
      isOwner: false,
      isMember: true,
      isLoading: false,
      reportRemoved: jest.fn(),
      flashAfterReload: jest.fn(),
    });
    render(<TeamSection />);
    expect(screen.getByRole('heading', { name: 'Acme Mobility' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave team' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/app/settings`
Expected: FAIL. The new modules are missing; the old `TeamManagement` suite still runs.

- [ ] **Step 3: Implement the hooks and helpers**

`src/hooks/useTeamMembers.ts`:

```ts
'use client';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTeamMembers } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';
import { unwrap } from '@/utils/teamApiError';
import type { TeamMember } from '@/types/team';

export const teamMembersKey = (teamId: string | null) => ['team-members', teamId] as const;

export const mergeMember = (list: TeamMember[], member: TeamMember): TeamMember[] =>
  list.some((m) => m.id === member.id)
    ? list.map((m) => (m.id === member.id ? member : m))
    : [...list, member];

// The active team's members (C7 order). A failure throws TeamApiError, so a
// NOT_A_MEMBER here reaches TeamProvider's removal check.
export const useTeamMembers = () => {
  const { activeTeam, isLoading: teamLoading } = useTeam();
  const queryClient = useQueryClient();
  const key = teamMembersKey(activeTeam?.id ?? null);
  const query = useQuery({
    queryKey: key,
    enabled: !teamLoading && !!activeTeam,
    retry: false,
    queryFn: async () => unwrap(await listTeamMembers()).members,
  });
  const upsertMember = useCallback(
    (member: TeamMember) =>
      queryClient.setQueryData<TeamMember[]>(key, (prev = []) => mergeMember(prev, member)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, activeTeam?.id],
  );
  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
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
import { DEVELOPER_LICENSES_FOR_WEBHOOKS } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useTeam } from '@/hooks/useTeam';
import type { DeveloperLicenseForWebhook } from '@/types/webhook';

export interface TeamLicense {
  tokenId: number;
  clientId: string;
  label: string;
  redirectUri: string | null;
  // Lowercase: Identity checksums, Turnkey and console-api may not.
  signers: string[];
}

const toTeamLicense = (node: DeveloperLicenseForWebhook): TeamLicense => ({
  tokenId: node.tokenId,
  clientId: node.clientId,
  label: node.alias || node.clientId,
  redirectUri: node.redirectURIs.nodes[0]?.uri ?? null,
  signers: node.signers.nodes.map((s) => String(s.address).toLowerCase()),
});

// Every license of the active team's owner, including ones without a redirect
// URI (a member may still hold a key there). Same query as
// useValidDeveloperLicenses, so one refetch updates both.
export const useTeamLicenses = () => {
  const { ownerAddress } = useTeam();
  const { data, loading, error, refetch } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: ownerAddress ?? '' },
    skip: !ownerAddress,
  });
  const licenses = useMemo(
    () => (error ? [] : (data?.developerLicenses.nodes ?? []).map(toTeamLicense)),
    [data, error],
  );
  return { licenses, loading: loading || !ownerAddress, error, refetch };
};
```

`src/app/settings/components/Team/memberKeys.ts`:

```ts
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

export interface MemberLicenseKey {
  tokenId: number;
  licenseLabel: string;
  signer: `0x${string}`;
  // The license lists the signer on-chain right now.
  onChain: boolean;
  // console-api holds an enabled MEMBER registry row for it (memberKeys).
  registered: boolean;
  // The license is in the loaded list. Only then does onChain: false mean the
  // chain no longer lists the key; never stamp or revoke an unknown one.
  licenseKnown: boolean;
}

// Every key a member holds or held on this team's licenses: their registry
// MEMBER keys under any wallet they ever used (C7 memberKeys), plus their
// current wallet wherever the chain lists it.
export const memberLicenseKeys = (
  member: TeamMember,
  licenses: TeamLicense[],
): MemberLicenseKey[] => {
  const byToken = new Map(licenses.map((l) => [l.tokenId, l]));
  const keys = new Map<string, MemberLicenseKey>();
  const add = (tokenId: number, signer: `0x${string}`, registered: boolean) => {
    const id = `${tokenId}:${signer.toLowerCase()}`;
    const existing = keys.get(id);
    if (existing) {
      existing.registered = existing.registered || registered;
      return;
    }
    const license = byToken.get(tokenId);
    keys.set(id, {
      tokenId,
      licenseLabel: license?.label ?? `License #${tokenId}`,
      signer,
      onChain: !!license?.signers.includes(signer.toLowerCase()),
      registered,
      licenseKnown: !!license,
    });
  };
  member.memberKeys.forEach((k) => add(k.licenseTokenId, k.signerAddress, true));
  const current = member.signerAddress;
  if (current) {
    licenses
      .filter((l) => l.signers.includes(current.toLowerCase()))
      .forEach((l) => add(l.tokenId, current, false));
  }
  return [...keys.values()];
};

export const memberAddresses = (member: TeamMember): string[] => [
  ...new Set(
    [member.signerAddress, ...member.memberKeys.map((k) => k.signerAddress)]
      .filter((a): a is `0x${string}` => !!a)
      .map((a) => a.toLowerCase()),
  ),
];

// Keys Revoke or Remove can act on: on-chain, or recorded on a license that
// loaded (a stamp alone finishes an earlier revoke).
export const actionableKeys = (keys: MemberLicenseKey[]) =>
  keys.filter((k) => k.licenseKnown && (k.onChain || k.registered));

export interface GrantCandidate {
  license: TeamLicense;
  // Already enabled on-chain; only the registry write is missing.
  onChain: boolean;
}

// Licenses a member can be given data access to: ones with a redirect URI (dex
// needs a domain for their developer JWT) where their current wallet has no
// recorded key. A key enabled on-chain whose registry write failed is still a
// candidate, so granting again records it without a second transaction.
export const grantCandidates = (
  member: TeamMember,
  licenses: TeamLicense[],
): GrantCandidate[] => {
  const signer = member.signerAddress?.toLowerCase();
  if (member.status !== 'ACCEPTED' || member.role !== 'MEMBER' || !signer || !member.userId)
    return [];
  const recorded = new Set(
    member.memberKeys
      .filter((k) => k.signerAddress.toLowerCase() === signer)
      .map((k) => k.licenseTokenId),
  );
  return licenses
    .filter((l) => l.redirectUri && !recorded.has(l.tokenId))
    .map((license) => ({ license, onChain: license.signers.includes(signer) }));
};
```

`src/app/settings/components/Team/memberStatus.ts`:

```ts
import type { StatusTone } from '@/components/StatusChip';
import type { TeamMember } from '@/types/team';

// LEFT reads like REVOKED: both are former members.
export const memberStatus = (
  member: TeamMember,
  now: number = Date.now(),
): { tone: StatusTone; label: string } => {
  switch (member.status) {
    case 'PENDING':
      return member.inviteExpiresAt && Date.parse(member.inviteExpiresAt) < now
        ? { tone: 'error', label: 'Invite expired' }
        : { tone: 'pending', label: 'Invited' };
    case 'ACCEPTED':
      return { tone: 'on', label: 'Active' };
    case 'REVOKED':
      return { tone: 'off', label: 'Removed' };
    case 'LEFT':
      return { tone: 'off', label: 'Left' };
  }
};
```

`src/app/settings/components/Team/inviteSendError.ts`:

```ts
type Failure = { status: number; code: string | null; message: string };

// Invite and resend failures (C7). Rate limits and NOT_A_MEMBER ("Finish
// setting up your team first") carry console-api's own message.
export const inviteSendError = (failure: Failure, email: string): string => {
  switch (failure.code) {
    case 'EMAIL_FAILED':
      return `We couldn't email ${email}. Try again.`;
    case 'RATE_LIMITED':
      return failure.message || 'Too many invites right now. Try again in a while.';
    case 'ALREADY_MEMBER':
      return `${email} is already in this team.`;
    case 'ALREADY_INVITED':
      return `${email} already has a pending invite. Resend it from the list.`;
    case 'INVALID_EMAIL':
      return 'Enter a valid email address.';
    default:
      return failure.message || "We couldn't send the invite. Try again.";
  }
};
```

- [ ] **Step 4: Implement the components**

`src/components/RowActionsMenu/RowActionsMenu.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import classNames from 'classnames';

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

// VehicleDetailsTable's ⋯ pattern: one 32px button per row, so the action cell
// fits a 390px phone however many actions a row has (DESIGN.md, Table).
export const RowActionsMenu: FC<{ label: string; items: RowAction[] }> = ({ label, items }) => {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-body leading-none text-muted transition-colors hover:bg-control hover:text-ink"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-control border border-outline bg-overlay p-1 shadow-float"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={classNames(
                  'w-full rounded-chip px-3 py-2 text-left text-body-sm transition-colors',
                  item.destructive
                    ? 'text-negative hover:bg-negative-soft'
                    : 'text-fg hover:bg-control',
                )}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

`src/components/RowActionsMenu/index.ts`:

```ts
export * from './RowActionsMenu';
```

`src/app/settings/components/Team/MembersTable.tsx`:

```tsx
'use client';
import type { FC } from 'react';
import { Table } from '@/components/Table';
import type { IColumn } from '@/components/Table/Column';
import { StatusChip } from '@/components/StatusChip';
import { formatList } from '@/config/teamCopy';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { actionableKeys, grantCandidates, memberLicenseKeys } from './memberKeys';
import { memberStatus } from './memberStatus';
import { RowActionsMenu, type RowAction } from '@/components/RowActionsMenu';

export type MemberAction = 'grant' | 'revoke' | 'remove' | 'resend' | 'cancel';
export type MemberActionHandlers = Partial<Record<MemberAction, (member: TeamMember) => void>>;

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  // The licenses loaded cleanly; until then no cell says what is on-chain.
  licensesReady?: boolean;
  isOwner: boolean;
  // Owner and flag on (C5).
  showDataAccess: boolean;
  handlers?: MemberActionHandlers;
}

export const displayName = (member: TeamMember) => member.name ?? member.email;

const NameCell = (member: TeamMember) => (
  <div className="flex flex-col">
    <span className="text-body-sm text-ink">{displayName(member)}</span>
    {member.name && <span className="break-all text-label text-muted">{member.email}</span>}
  </div>
);

const chip = 'rounded-chip bg-highest px-2 py-0.5 text-label text-muted';

const DataAccessCell = (member: TeamMember, licenses: TeamLicense[], ready: boolean) => {
  if (member.role === 'OWNER') return <span className="text-body-sm text-muted">Owner</span>;
  if (!ready) return <span className="text-body-sm text-muted">—</span>;
  const keys = memberLicenseKeys(member, licenses).filter((k) => k.licenseKnown);
  const live = keys.filter((k) => k.onChain);
  // Spec: "Removed — still a signer on {licenses}" / "Left — still a signer".
  if (live.length && member.status !== 'ACCEPTED')
    return (
      <StatusChip tone="error">
        {`Still a signer on ${formatList([...new Set(live.map((k) => k.licenseLabel))])}`}
      </StatusChip>
    );
  if (live.length)
    return (
      <div className="flex flex-wrap gap-1">
        {live.map((k) => (
          <span key={`${k.tokenId}:${k.signer}`} className={chip}>
            {k.licenseLabel}
          </span>
        ))}
        {/* On-chain without a registry row: console-api answers NONE until it is recorded. */}
        {live.some((k) => !k.registered) && <StatusChip tone="pending">Not recorded</StatusChip>}
      </div>
    );
  if (keys.some((k) => k.registered))
    return <StatusChip tone="pending">Revoke unfinished</StatusChip>;
  // Grant needs a verified wallet, which the member links by signing in once.
  if (member.status === 'ACCEPTED' && !member.signerAddress)
    return <span className="text-body-sm text-muted">Needs to sign in once</span>;
  return <span className="text-body-sm text-muted">None</span>;
};

const actionsFor = (
  member: TeamMember,
  licenses: TeamLicense[],
  handlers: MemberActionHandlers,
  showDataAccess: boolean,
): RowAction[] => {
  if (member.role === 'OWNER') return [];
  const items: RowAction[] = [];
  const add = (action: MemberAction, label: string, destructive = false) => {
    const handler = handlers[action];
    if (handler) items.push({ label, destructive, onSelect: () => handler(member) });
  };
  // Labels as in the spec: Grant, Revoke, Remove, Resend, Cancel invite.
  if (member.status === 'PENDING') {
    add('resend', 'Resend');
    add('cancel', 'Cancel invite', true);
    return items;
  }
  if (showDataAccess && grantCandidates(member, licenses).length) add('grant', 'Grant');
  // Revoking stays available with the flag off: keys granted earlier still work.
  // A removed member's leftover keys read "Retry" (spec: "Removed — … Retry").
  if (actionableKeys(memberLicenseKeys(member, licenses)).length)
    add('revoke', member.status === 'REVOKED' ? 'Retry' : 'Revoke', true);
  if (member.status === 'ACCEPTED') add('remove', 'Remove', true);
  return items;
};

export const MembersTable: FC<Props> = ({
  members,
  licenses,
  licensesReady = true,
  isOwner,
  showDataAccess,
  handlers,
}) => {
  const columns: IColumn[] = [
    { name: 'email', label: 'Member', render: NameCell },
    {
      name: 'role',
      label: 'Role',
      className: 'hidden md:table-cell',
      render: (m: TeamMember) => (
        <span className="text-body-sm text-fg">{m.role === 'OWNER' ? 'Owner' : 'Member'}</span>
      ),
    },
    {
      name: 'status',
      label: 'Status',
      render: (m: TeamMember) => {
        const { tone, label } = memberStatus(m);
        return <StatusChip tone={tone}>{label}</StatusChip>;
      },
    },
    ...(showDataAccess
      ? [
          {
            name: 'memberKeys',
            label: 'Data access',
            className: 'hidden md:table-cell',
            render: (m: TeamMember) => DataAccessCell(m, licenses, licensesReady),
          },
        ]
      : []),
  ];
  const actions =
    isOwner && handlers
      ? [
          (m: TeamMember) => (
            <RowActionsMenu
              key={`actions-${m.id}`}
              label={`Actions for ${m.email}`}
              items={actionsFor(m, licenses, handlers, showDataAccess)}
            />
          ),
        ]
      : undefined;
  return <Table columns={columns} data={members} actions={actions} />;
};
```

`src/app/settings/components/Team/InviteMemberModal.tsx`:

```tsx
'use client';
import { type FC, type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { inviteTeamMember } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import type { TeamMember } from '@/types/team';
import { inviteSendError } from './inviteSendError';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onInvited: (member: TeamMember) => void;
}

export const InviteMemberModal: FC<Props> = ({ isOpen, onClose, teamId, onInvited }) => {
  const { trackEvent } = useMixPanel();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setEmail('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const result = await inviteTeamMember(address);
      if (!result.ok) {
        setError(inviteSendError(result, address));
        return;
      }
      onInvited(result.data.member);
      trackEvent('Team Invite Sent', { teamId });
      toast.success(`Invite sent to ${address}`);
      setEmail('');
      onClose();
    } catch {
      setError("We couldn't send the invite. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={(open) => !open && close()} showClose={!busy}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Title component="h2" className="text-panel-title text-ink">
          Invite a team member
        </Title>
        <p className="text-body-sm text-muted">
          They&apos;ll see this team&apos;s licenses in the console. You choose separately who
          gets data access.
        </p>
        <label htmlFor="invite-email" className="text-label text-muted">
          Email
        </label>
        <TextField
          id="invite-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={!email.trim()}>
          Send invite
        </Button>
      </form>
    </Modal>
  );
};
```

`src/app/settings/components/Team/LeaveTeam.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { leaveTeam } from '@/actions/teams';
import { leaveConfirm } from '@/config/teamCopy';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useTeam } from '@/hooks/useTeam';
import { hardNavigate } from '@/utils/hardNavigate';
import { clearActiveTeamCookie, setActiveTeamCookie } from '@/utils/teamCookies';

// Members only. Leaving keeps any data access until the owner revokes it
// (spec: the C8 confirm says so).
export const LeaveTeam: FC = () => {
  const { activeTeam, teams, reportRemoved, flashAfterReload } = useTeam();
  const { trackEvent } = useMixPanel();
  const [open, setOpen] = useState(false);
  if (!activeTeam || activeTeam.role !== 'MEMBER') return null;

  const leave = async () => {
    const result = await leaveTeam().catch(() => null);
    if (!result) {
      toast.error("We couldn't reach the console. Try again.");
      return;
    }
    if (!result.ok) {
      if (result.code === 'NOT_A_MEMBER') {
        setOpen(false);
        reportRemoved();
        return;
      }
      toast.error(result.message);
      return;
    }
    trackEvent('Team Left', { teamId: activeTeam.id });
    flashAfterReload({ tone: 'success', message: `You left ${activeTeam.name}.` });
    const personal = teams.find((t) => t.isPersonal);
    if (personal) setActiveTeamCookie(personal.id);
    else clearActiveTeamCookie();
    hardNavigate('/app');
  };

  return (
    <div className="flex">
      <Button variant="destructive-ghost" onClick={() => setOpen(true)}>
        Leave team
      </Button>
      <DeleteConfirmationModal
        isOpen={open}
        title={leaveConfirm(activeTeam.name, activeTeam.ownerEmail)}
        onConfirm={leave}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
};
```

`src/app/settings/components/Team/TeamSection.tsx`:

```tsx
'use client';
import { type FC, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { withLoadingStatus } from '@/hoc/withLoadingStatus';
import { cancelTeamInvite, resendTeamInvite } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useTeam } from '@/hooks/useTeam';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { InviteMemberModal } from './InviteMemberModal';
import { inviteSendError } from './inviteSendError';
import { LeaveTeam } from './LeaveTeam';
import { MembersTable, type MemberActionHandlers } from './MembersTable';

const TeamSectionComponent: FC = () => {
  const { activeTeam, isOwner, isLoading: teamLoading } = useTeam();
  const { members, isLoading, isError, refetch, upsertMember } = useTeamMembers();
  const {
    licenses,
    loading: licensesLoading,
    error: licensesError,
    refetch: refetchLicenses,
  } = useTeamLicenses();
  const { trackEvent } = useMixPanel();
  const [inviteOpen, setInviteOpen] = useState(false);
  const showDataAccess = isOwner && TEAM_DATA_ACCESS_ENABLED;
  // Grant, Revoke and Remove read on-chain state from the licenses: only once
  // they loaded cleanly (an empty list while loading would read as off-chain).
  const licensesReady = !licensesLoading && !licensesError;

  const handlers: MemberActionHandlers = {
    resend: async (member) => {
      const result = await resendTeamInvite(member.id).catch(() => null);
      if (result?.ok) {
        upsertMember(result.data.member);
        trackEvent('Team Invite Resent', { teamId: activeTeam?.id });
        toast.success(`Invite resent to ${member.email}`);
      } else {
        toast.error(
          result ? inviteSendError(result, member.email) : "We couldn't resend the invite. Try again.",
        );
      }
    },
    cancel: async (member) => {
      const result = await cancelTeamInvite(member.id).catch(() => null);
      if (result?.ok) {
        toast.success(`Invite to ${member.email} cancelled`);
        void refetch();
      } else {
        toast.error(result?.message ?? "We couldn't cancel the invite. Try again.");
      }
    },
  };

  let body: ReactNode;
  if (teamLoading || isLoading) {
    body = <Loader isLoading />;
  } else if (isError) {
    body = (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-body-sm text-negative">
          Couldn&apos;t load your team.
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (isOwner && members.every((m) => m.role === 'OWNER')) {
    body = (
      <p className="text-body-sm text-muted">
        Invite teammates to share this team&apos;s licenses with them. You choose who gets data
        access.
      </p>
    );
  } else {
    body = (
      <MembersTable
        members={members}
        licenses={licenses}
        licensesReady={licensesReady}
        isOwner={isOwner}
        showDataAccess={showDataAccess}
        handlers={isOwner ? handlers : undefined}
      />
    );
  }

  return (
    <Section>
      <SectionHeader title={isOwner ? 'Team' : (activeTeam?.name ?? 'Team')}>
        {isOwner && <Button onClick={() => setInviteOpen(true)}>Invite member</Button>}
      </SectionHeader>
      {body}
      {isOwner && licensesError && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-body-sm text-negative">
            Couldn&apos;t load this team&apos;s licenses, so data access can&apos;t be changed
            right now.
          </p>
          <Button variant="secondary" onClick={() => void refetchLicenses()}>
            Load licenses again
          </Button>
        </div>
      )}
      <LeaveTeam />
      {isOwner && activeTeam && (
        <InviteMemberModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          teamId={activeTeam.id}
          onInvited={upsertMember}
        />
      )}
    </Section>
  );
};

export const TeamSection = withLoadingStatus(TeamSectionComponent);
```

`src/app/settings/components/Team/index.ts`:

```ts
export * from './TeamSection';
```

`src/app/settings/components/View/View.tsx`, full replacement:

```tsx
'use client';

import { FC } from 'react';
import { UserDetails } from '@/app/settings/components/UserDetails';
import { TeamSection } from '@/app/settings/components/Team';
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

- [ ] **Step 5: Retire the collaborator UI and types**

```bash
git rm -r src/app/settings/components/TeamManagement src/app/settings/components/TeamForm src/app/settings/components/TeamFormModal
git rm src/hooks/useTeamCollaborators.ts src/actions/team.ts src/services/team.ts
git rm __tests__/unit/pages/app/settings/TeamManagement.test.tsx __tests__/unit/pages/app/settings/__snapshots__/TeamManagement.test.tsx.snap
```

Then:
- `src/hooks/index.ts`: delete `export * from './useTeamCollaborators';`.
- `src/types/team.ts`: delete `TeamRoles`, `TeamRolesLabels`, `InvitationStatuses`, `InvitationStatusLabels`, `ITeamCollaborator` and `IInvitation`. Keep `ITeam` (the `/api/me` user payload) and its `import { IUser }` only if `ITeam` still uses it (it doesn't; delete the import).
- `src/types/user.ts`: change the import to `import { ITeam, type TeamRole } from './team';` and `role?: TeamRoles;` to `role?: TeamRole;`.
- `src/types/next-auth.d.ts`: `import { TeamRole } from './team';` and `role: TeamRole;`.
- `src/config/default.ts`: delete `export const ROLES = ['Collaborator'];`. `src/config/index.ts`: delete `ROLES: string[];`.

Check that nothing still uses them:

```bash
grep -rnE "TeamRoles|ITeamCollaborator|IInvitation|InvitationStatus|useTeamCollaborators|config\.ROLES|services/team'|actions/team'" src __tests__ || echo clean
```

Expected: `clean`.

- [ ] **Step 6: Run the tests and the typecheck**

Run: `npx jest __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/app/settings && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTeamMembers.ts src/hooks/useTeamLicenses.ts src/hooks/index.ts src/components/RowActionsMenu src/app/settings src/types/team.ts src/types/user.ts src/types/next-auth.d.ts src/config/default.ts src/config/index.ts __tests__/unit/hooks/useTeamMembers.test.tsx __tests__/unit/pages/app/settings
git commit -m "feat(teams): Settings Team section with invites, leaving and member states; retire the collaborator UI"
```

---

### Task 14: Grant data access (on-chain first, then the registry)

**Files:**

- Create: `src/hooks/useSetLicenseSigners.ts`, `src/utils/userOperation.ts`, `src/utils/registryWrite.ts`, `src/utils/txErrorStatus.ts`
- Create: `src/app/settings/components/Team/GrantAccessModal.tsx`, `src/app/settings/components/Team/PendingGrantBanner.tsx`
- Modify: `src/app/settings/components/Team/TeamSection.tsx`
- Test:
  - `__tests__/unit/hooks/useSetLicenseSigners.test.tsx`, `__tests__/unit/utils/registryWrite.test.ts`
  - `__tests__/unit/pages/app/settings/GrantAccessModal.test.tsx`, `__tests__/unit/pages/app/settings/PendingGrantBanner.test.tsx`
  - `__tests__/unit/pages/app/settings/TeamSection.test.tsx` (extend)

**Interfaces:**

- Consumes:
  - `useContractGA().processTransactions`, the DevLicense ABI and `configuration.DLC_ADDRESS`;
  - `upsertLicenseSigner` (Task 2);
  - `grantCandidates`, `memberLicenseKeys` and `displayName` (Task 13);
  - `grantWarning` and `formatList` (C8);
  - `LoadingStatusContext`.
- Produces:
  - **`assertUserOperation(result)`** and `UserOperationFailedError` (`@/utils/userOperation`). `processTransactions` resolves with `success: false` without throwing when a user operation reverts without a reason; this throws on `!result?.success`. Grant, Revoke and Remove use it through `useSetLicenseSigners`, and the API-key hooks in Task 16.
  - **`useSetLicenseSigners()`** returns `(fn: 'enableSigner' | 'disableSigner', changes: SignerChange[]) => Promise<void>`. All pairs go in one user operation, and an empty list does nothing. It rejects on a reverted operation. `SignerChange = { tokenId: number; signer: `0x${string}` }`.
  - **`registryWrite(write)`:** a registry call that never throws. A rejected server action (network, deploy) becomes `{ ok: false, status: 0, code: null, message }` and is reported to Sentry. A rejection or a 5xx is retried once (spec, Error handling: "The console retries once"); a 4xx isn't.
  - **`txErrorStatus(error)`:** `Signers.tsx`'s mapping. Code 4001 gives `{ status: 'error', label: 'The transaction was denied' }`; a `UserOperationFailedError` gives `The transaction failed on-chain, so nothing changed`; anything else gives `Something went wrong`.
  - **`GrantAccessModal`:** `{ member, licenses, onClose, onGranted }`.
    - It lists only `grantCandidates` and shows the C8 warning for the chosen licenses.
    - It can't be closed while busy.
    - It enables the not-yet-on-chain ones in one transaction, then `PUT`s each key (`kind: 'MEMBER'`, the member as the only holder).
    - A registry write that rejects or answers 5xx (after `registryWrite`'s retry) keeps the grant and offers Try again (registry only). A 4xx (`SIGNER_MISMATCH`, `KIND_CONFLICT`, `INVALID_HOLDERS`, …) shows console-api's message per license and offers only Done: retrying can't succeed.
    - It tracks `Data Access Granted`.
    - TeamSection offers Grant, and the banner, only once the team's licenses loaded cleanly.
  - **`PendingGrantBanner`:** `{ members, licenses, licensesLoading, onGrant }`. Nothing while licenses load. One row, `{name} joined. Grant data access?` (spec), per accepted member whose verified wallet is missing from at least one license it can be granted (a `grantCandidates` entry).

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hooks/useSetLicenseSigners.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { decodeFunctionData } from 'viem';

const mockProcess = jest.fn(async () => ({ success: true }));
jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
}));
import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import { UserOperationFailedError } from '@/utils/userOperation';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';

describe('useSetLicenseSigners', () => {
  it('sends every pair in one user operation', async () => {
    const set = renderHook(() => useSetLicenseSigners()).result.current;
    await set('disableSigner', [
      { tokenId: 42, signer: SIGNER },
      { tokenId: 43, signer: SIGNER },
    ]);
    expect(mockProcess).toHaveBeenCalledTimes(1);
    const calls = (mockProcess.mock.calls[0] as unknown as [{ to: string; data: `0x${string}` }[]])[0];
    expect(calls.map((c) => c.to)).toEqual([configuration.DLC_ADDRESS, configuration.DLC_ADDRESS]);
    expect(
      calls.map((c) => decodeFunctionData({ abi: DimoLicenseABI, data: c.data })),
    ).toEqual([
      { functionName: 'disableSigner', args: [42n, SIGNER] },
      { functionName: 'disableSigner', args: [43n, SIGNER] },
    ]);
  });

  it('does nothing for no changes', async () => {
    await renderHook(() => useSetLicenseSigners()).result.current('enableSigner', []);
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('rejects when the user operation lands but reverts (success: false, no throw)', async () => {
    mockProcess.mockResolvedValueOnce({ success: false });
    await expect(
      renderHook(() => useSetLicenseSigners()).result.current('enableSigner', [{ tokenId: 42, signer: SIGNER }]),
    ).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
```

`__tests__/unit/utils/registryWrite.test.ts`:

```ts
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { assertUserOperation, UserOperationFailedError } from '@/utils/userOperation';

describe('registryWrite', () => {
  it('passes results through', async () => {
    const write = jest.fn(async () => ({ ok: true as const, data: 1 }));
    await expect(registryWrite(write)).resolves.toEqual({ ok: true, data: 1 });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('turns a rejected server action into a failure after one retry', async () => {
    const write = jest.fn(async () => {
      throw new Error('Failed to fetch');
    });
    await expect(registryWrite(write)).resolves.toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'Failed to fetch',
    });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('retries a 5xx once and returns the retry', async () => {
    const write = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502, code: 'IDENTITY_UNAVAILABLE', message: 'x' })
      .mockResolvedValueOnce({ ok: true, data: 1 });
    await expect(registryWrite(write)).resolves.toEqual({ ok: true, data: 1 });
  });

  it('never retries a 4xx', async () => {
    const write = jest.fn(async () => ({
      ok: false as const,
      status: 400,
      code: 'INVALID_HOLDERS',
      message: 'x',
    }));
    await registryWrite(write);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe('txErrorStatus', () => {
  it('names a denied and a reverted transaction', () => {
    expect(txErrorStatus({ code: 4001 })).toEqual({ status: 'error', label: 'The transaction was denied' });
    expect(txErrorStatus(new UserOperationFailedError())).toEqual({
      status: 'error',
      label: 'The transaction failed on-chain, so nothing changed',
    });
    expect(txErrorStatus(new Error('boom'))).toEqual({ status: 'error', label: 'Something went wrong' });
  });
});

describe('assertUserOperation', () => {
  it('throws unless the user operation succeeded', () => {
    expect(() => assertUserOperation({ success: true })).not.toThrow();
    expect(() => assertUserOperation({ success: false, reason: 'AA23 reverted' })).toThrow(
      'The transaction reverted: AA23 reverted',
    );
    expect(() => assertUserOperation(undefined)).toThrow(UserOperationFailedError);
  });
});
```

`__tests__/unit/pages/app/settings/GrantAccessModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({ useSetLicenseSigners: () => mockSetSigners }));
jest.mock('@/actions/teams', () => ({ upsertLicenseSigner: jest.fn() }));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { upsertLicenseSigner } from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { GrantAccessModal } from '@/app/settings/components/Team/GrantAccessModal';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: SIGNER,
  memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [SIGNER.toLowerCase()] },
  { tokenId: 43, clientId: '0xbbb', label: 'Harness Labs', redirectUri: 'https://y', signers: [] },
  { tokenId: 44, clientId: '0xccc', label: 'Harness Pilot', redirectUri: 'https://z', signers: [SIGNER.toLowerCase()] },
  { tokenId: 45, clientId: '0xddd', label: 'No Redirect', redirectUri: null, signers: [] },
];
const setLoadingStatus = jest.fn();
const clearLoadingStatus = jest.fn();
const onClose = jest.fn();
const onGranted = jest.fn();
const open = () =>
  render(
    <LoadingStatusContext.Provider value={{ setLoadingStatus, clearLoadingStatus }}>
      <GrantAccessModal member={SAM} licenses={LICENSES} onClose={onClose} onGranted={onGranted} />
    </LoadingStatusContext.Provider>,
  );
const choose = (label: string) => fireEvent.click(screen.getByRole('checkbox', { name: label }));
const grant = () => fireEvent.click(screen.getByRole('button', { name: 'Grant data access' }));
const recorded = { ok: true, data: { signer: {} } };

describe('GrantAccessModal', () => {
  beforeEach(() => {
    mockSetSigners.mockReset().mockResolvedValue(undefined);
    (upsertLicenseSigner as jest.Mock).mockReset().mockResolvedValue(recorded);
  });

  it('offers only licenses with a redirect URI where the wallet has no recorded key', () => {
    open();
    expect(screen.getAllByRole('checkbox').map((c) => c.id)).toEqual(['grant-43', 'grant-44']);
  });

  it('shows the C8 warning for the chosen licenses', () => {
    open();
    choose('Harness Labs');
    expect(
      screen.getByText(
        "Data access lets Sam Rivera use every permission vehicles have granted Harness Labs, including commands, through the DIMO APIs — not only what the console shows. Their queries spend Harness Labs's DCX credits.",
      ),
    ).toBeInTheDocument();
  });

  it('enables on-chain in one transaction, then records each key, then tracks it', async () => {
    open();
    choose('Harness Labs');
    choose('Harness Pilot');
    grant();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // 44 is already on-chain (its registry write failed earlier): record only.
    expect(mockSetSigners).toHaveBeenCalledWith('enableSigner', [{ tokenId: 43, signer: SIGNER }]);
    expect(upsertLicenseSigner).toHaveBeenCalledWith(43, SIGNER, { kind: 'MEMBER', holders: [{ userId: 'u-sam' }] });
    expect(upsertLicenseSigner).toHaveBeenCalledWith(44, SIGNER, { kind: 'MEMBER', holders: [{ userId: 'u-sam' }] });
    expect(mockSetSigners.mock.invocationCallOrder[0]).toBeLessThan(
      (upsertLicenseSigner as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(trackEvent).toHaveBeenCalledWith('Data Access Granted', { memberId: 'm-sam', tokenIds: [43, 44] });
    expect(toast.success).toHaveBeenCalledWith('Sam Rivera now has data access to Harness Labs and Harness Pilot.');
    expect(onGranted).toHaveBeenCalled();
  });

  it('reports a denied transaction and records nothing', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    open();
    choose('Harness Labs');
    grant();
    await waitFor(() =>
      expect(setLoadingStatus).toHaveBeenLastCalledWith({ status: 'error', label: 'The transaction was denied' }),
    );
    expect(upsertLicenseSigner).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the grant when recording rejects twice, and retries only the registry', async () => {
    (upsertLicenseSigner as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'));
    open();
    choose('Harness Labs');
    grant();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Data access is on, but we couldn't record it for Harness Labs, so Sam Rivera can't use it yet.",
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockSetSigners).toHaveBeenCalledTimes(1);
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(3);
  });

  it("shows console-api's refusal and offers no retry for a 4xx", async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      code: 'SIGNER_MISMATCH',
      message: "This address isn't the member's verified wallet.",
    });
    open();
    choose('Harness Labs');
    grant();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Harness Labs: This address isn't the member's verified wallet.",
    );
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(upsertLicenseSigner).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('cannot be closed while the transaction is pending', async () => {
    mockSetSigners.mockReturnValue(new Promise(() => {}));
    open();
    expect(screen.getByText('Close')).toBeInTheDocument();
    choose('Harness Labs');
    grant();
    await waitFor(() => expect(screen.queryByText('Close')).toBeNull());
  });
});
```

`__tests__/unit/pages/app/settings/PendingGrantBanner.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PendingGrantBanner } from '@/app/settings/components/Team/PendingGrantBanner';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: SIGNER,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSE: TeamLicense = { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [] };
const LABS: TeamLicense = { tokenId: 43, clientId: '0xbbb', label: 'Harness Labs', redirectUri: 'https://y', signers: [] };
const onGrant = jest.fn();
const show = (members: TeamMember[], licenses = [LICENSE], licensesLoading = false) =>
  render(<PendingGrantBanner members={members} licenses={licenses} licensesLoading={licensesLoading} onGrant={onGrant} />);

describe('PendingGrantBanner', () => {
  it('asks the owner to grant a member whose wallet is missing from a license', () => {
    show([SAM]);
    expect(screen.getByRole('status')).toHaveTextContent('Sam Rivera joined. Grant data access?');
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(onGrant).toHaveBeenCalledWith(SAM);
  });

  it('still asks when the member has some licenses but not all', () => {
    show([{ ...SAM, memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }] }], [LICENSE, LABS]);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('waits for the licenses to load', () => {
    show([SAM], [], true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays hidden for a member with every license, without a wallet, or with nothing grantable', () => {
    show([{ ...SAM, memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }] }]);
    expect(screen.queryByRole('status')).toBeNull();
    show([{ ...SAM, signerAddress: null }]);
    expect(screen.queryByRole('status')).toBeNull();
    show([SAM], [{ ...LICENSE, redirectUri: null }]);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
```

Extend `__tests__/unit/pages/app/settings/TeamSection.test.tsx`:
- Add this mock beside the others. `GrantAccessModal` pulls `useContractGA`, which loads the Turnkey config at import time:

```tsx
jest.mock('@/hooks/useSetLicenseSigners', () => ({ useSetLicenseSigners: () => jest.fn() }));
```

- Append inside the `describe`:

```tsx
  const SAM: TeamMember = {
    ...OWNER_ROW,
    id: 'm-sam',
    userId: 'u-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    role: 'MEMBER',
    signerAddress: '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6',
  };
  const FLEET = { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [] };

  it('opens Grant from the banner for a member who linked a wallet', () => {
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({ licenses: [FLEET], loading: false, refetch: jest.fn() });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(screen.getByRole('heading', { name: 'Grant Sam Rivera data access' })).toBeInTheDocument();
  });

  it('hides the banner while member data access is off (C5)', () => {
    mockFlags.dataAccess = false;
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({ licenses: [FLEET], loading: false, refetch: jest.fn() });
    render(<TeamSection />);
    expect(screen.queryByRole('status')).toBeNull();
    mockFlags.dataAccess = true;
  });

  it('offers no Grant while the licenses fail to load', () => {
    members({ members: [OWNER_ROW, SAM] });
    (useTeamLicenses as jest.Mock).mockReturnValue({
      licenses: [],
      loading: false,
      error: new Error('Identity down'),
      refetch: jest.fn(),
    });
    render(<TeamSection />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Grant' })).toBeNull();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hooks/useSetLicenseSigners.test.tsx __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/app/settings`
Expected: FAIL. The modules are missing, and there is no Grant.

- [ ] **Step 3: Implement**

`src/hooks/useSetLicenseSigners.ts`:

```ts
'use client';
import { useCallback } from 'react';
import { encodeFunctionData } from 'viem';
import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import { useContractGA } from '@/hooks/useContractGA';
import { assertUserOperation } from '@/utils/userOperation';

export interface SignerChange {
  tokenId: number;
  signer: `0x${string}`;
}

// Every (license, signer) pair in one user operation: a grant or revoke across
// licenses is one signature and lands together or not at all.
export const useSetLicenseSigners = () => {
  const { processTransactions } = useContractGA();
  return useCallback(
    async (fn: 'enableSigner' | 'disableSigner', changes: SignerChange[]) => {
      if (!changes.length) return;
      const result = await processTransactions(
        changes.map(({ tokenId, signer }) => ({
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({ abi: DimoLicenseABI, functionName: fn, args: [tokenId, signer] }),
        })),
      );
      // A reverted operation resolves with success: false; never treat it as done.
      assertUserOperation(result);
    },
    [processTransactions],
  );
};
```

`src/utils/userOperation.ts`:

```ts
import type { IKernelOperationStatus } from '@/types/wallet';

export class UserOperationFailedError extends Error {
  constructor(reason?: string) {
    super(reason ? `The transaction reverted: ${reason}` : 'The transaction reverted');
    this.name = 'UserOperationFailedError';
  }
}

// useContractGA().processTransactions throws when the receipt carries a reason,
// but resolves with success: false when a user operation reverts without one.
// Every signer change checks the result through this.
export const assertUserOperation = (result: IKernelOperationStatus | undefined) => {
  if (!result?.success) throw new UserOperationFailedError(result?.reason);
};
```

`src/utils/registryWrite.ts`:

```ts
import * as Sentry from '@sentry/nextjs';
import type { ApiResult } from '@/types/team';

const settle = async <T>(write: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> => {
  try {
    return await write();
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      status: 0,
      code: null,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

// Registry writes follow on-chain changes. A rejected server action (network,
// a deploy in progress) must not look like a failed transaction: callers never
// undo the chain or hide an API key because of it, and offer to retry. A
// rejection or 5xx is retried once first (spec, Error handling).
export const registryWrite = async <T>(
  write: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> => {
  const first = await settle(write);
  return !first.ok && (first.status === 0 || first.status >= 500) ? settle(write) : first;
};
```

`src/utils/txErrorStatus.ts`:

```ts
import { get } from 'lodash';
import type { LoadingProps } from '@/components/LoadingModal';
import { UserOperationFailedError } from '@/utils/userOperation';

// Signers.tsx's mapping: 4001 is the user rejecting the user operation.
export const txErrorStatus = (error: unknown): LoadingProps => {
  if (get(error, 'code', null) === 4001)
    return { status: 'error', label: 'The transaction was denied' };
  if (error instanceof UserOperationFailedError)
    return { status: 'error', label: 'The transaction failed on-chain, so nothing changed' };
  return { status: 'error', label: 'Something went wrong' };
};
```

`src/app/settings/components/Team/GrantAccessModal.tsx`:

```tsx
'use client';
import { type FC, useContext, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { upsertLicenseSigner } from '@/actions/teams';
import { formatList, grantWarning } from '@/config/teamCopy';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners, type SignerChange } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { grantCandidates } from './memberKeys';
import { displayName } from './MembersTable';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  onClose: () => void;
  onGranted: () => void;
}

export const GrantAccessModal: FC<Props> = ({ member, licenses, onClose, onGranted }) => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  // Snapshot: a refetch after the grant must not reshuffle the list mid-flow.
  const [candidates] = useState(() => grantCandidates(member, licenses));
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  // retryable: rejected or 5xx after registryWrite's retry. refused: a 4xx,
  // shown with console-api's message and never retried.
  const [unrecorded, setUnrecorded] = useState<{
    retryable: SignerChange[];
    refused: { tokenId: number; message: string }[];
  } | null>(null);
  const name = displayName(member);
  const labels = useMemo(
    () => new Map(candidates.map(({ license }) => [license.tokenId, license.label])),
    [candidates],
  );
  const labelsOf = (tokenIds: number[]) => formatList(tokenIds.map((id) => labels.get(id) ?? `License #${id}`));

  const toggle = (tokenId: number, checked: boolean) =>
    setSelected((prev) =>
      checked ? [...prev, tokenId].sort((a, b) => a - b) : prev.filter((id) => id !== tokenId),
    );

  // Registry rows after the chain: the PUT clears disabledAt (C7).
  const record = async (changes: SignerChange[]) => {
    const retryable: SignerChange[] = [];
    const refused: { tokenId: number; message: string }[] = [];
    for (const change of changes) {
      const result = await registryWrite(() =>
        upsertLicenseSigner(change.tokenId, change.signer, {
          kind: 'MEMBER',
          holders: [{ userId: member.userId! }],
        }),
      );
      if (result.ok) continue;
      if (result.status >= 400 && result.status < 500)
        refused.push({ tokenId: change.tokenId, message: result.message });
      else retryable.push(change);
    }
    return { retryable, refused };
  };

  const settle = (
    outcome: { retryable: SignerChange[]; refused: { tokenId: number; message: string }[] },
    all: SignerChange[],
  ) => {
    if (outcome.retryable.length || outcome.refused.length) {
      setUnrecorded(outcome);
      return;
    }
    toast.success(`${name} now has data access to ${labelsOf(all.map((c) => c.tokenId))}.`);
    onClose();
  };

  const grant = async () => {
    const signer = member.signerAddress!;
    const changes = selected.map((tokenId) => ({ tokenId, signer }));
    const toEnable = changes.filter(
      (c) => !candidates.find((k) => k.license.tokenId === c.tokenId)?.onChain,
    );
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: `Granting ${name} data access` });
    try {
      await setLicenseSigners('enableSigner', toEnable);
    } catch (error) {
      Sentry.captureException(error);
      setBusy(false);
      setLoadingStatus(txErrorStatus(error));
      return;
    }
    trackEvent('Data Access Granted', { memberId: member.id, tokenIds: selected });
    const outcome = await record(changes);
    clearLoadingStatus();
    setBusy(false);
    onGranted();
    settle(outcome, changes);
  };

  const retry = async () => {
    if (!unrecorded) return;
    setBusy(true);
    const outcome = await record(unrecorded.retryable);
    setBusy(false);
    onGranted();
    settle(
      { retryable: outcome.retryable, refused: [...unrecorded.refused, ...outcome.refused] },
      unrecorded.retryable,
    );
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {`Grant ${name} data access`}
        </Title>
        <p className="text-body-sm text-muted">Choose the licenses {name} can read in Vehicles.</p>
        <ul className="flex flex-col gap-2">
          {candidates.map(({ license }) => (
            <li key={license.tokenId} className="flex items-center gap-2">
              <CheckboxField
                id={`grant-${license.tokenId}`}
                checked={selected.includes(license.tokenId)}
                disabled={busy || !!unrecorded}
                onChange={(e) => toggle(license.tokenId, e.target.checked)}
              />
              <label htmlFor={`grant-${license.tokenId}`} className="text-body-sm text-fg">
                {license.label}
              </label>
            </li>
          ))}
        </ul>
        {selected.length > 0 && (
          <p className="rounded-control bg-control p-3 text-body-sm text-fg">
            {grantWarning(name, labelsOf(selected))}
          </p>
        )}
        {unrecorded ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            {unrecorded.retryable.length > 0 && (
              <p className="text-body-sm text-negative">
                {`Data access is on, but we couldn't record it for ${labelsOf(unrecorded.retryable.map((c) => c.tokenId))}, so ${name} can't use it yet.`}
              </p>
            )}
            {unrecorded.refused.map(({ tokenId, message }) => (
              <p key={tokenId} className="text-body-sm text-negative">
                {`${labelsOf([tokenId])}: ${message}`}
              </p>
            ))}
            {unrecorded.refused.length > 0 && (
              <p className="text-body-sm text-muted">
                Those keys are enabled on-chain but not recorded. Check the member&apos;s row in
                the Team list before granting again.
              </p>
            )}
            {unrecorded.retryable.length > 0 ? (
              <Button variant="secondary" loading={busy} onClick={retry}>
                Try again
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        ) : (
          <Button loading={busy} disabled={!selected.length} onClick={grant}>
            Grant data access
          </Button>
        )}
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
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { grantCandidates } from './memberKeys';
import { displayName } from './MembersTable';

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  licensesLoading: boolean;
  onGrant: (member: TeamMember) => void;
}

// Accepted members whose verified wallet is missing from a license they can be
// granted. Waits for the licenses: before they load every member looks keyless.
export const PendingGrantBanner: FC<Props> = ({ members, licenses, licensesLoading, onGrant }) => {
  if (licensesLoading) return null;
  const waiting = members.filter((m) => grantCandidates(m, licenses).length > 0);
  if (!waiting.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {waiting.map((member) => (
        <div
          key={member.id}
          role="status"
          className="flex flex-col gap-2 rounded-control bg-control p-3 md:flex-row md:items-center md:justify-between"
        >
          <p className="text-body-sm text-fg">{`${displayName(member)} joined. Grant data access?`}</p>
          <Button variant="secondary" onClick={() => onGrant(member)}>
            Grant
          </Button>
        </div>
      ))}
    </div>
  );
};
```

`src/app/settings/components/Team/TeamSection.tsx`:
- Add imports for `GrantAccessModal`, `PendingGrantBanner` and `type TeamMember` from `@/types/team`.
- Add `const [grantFor, setGrantFor] = useState<TeamMember | null>(null);` and:

```tsx
  // After any signer change: the table reads both.
  const afterSignerChange = () => {
    void refetch();
    void refetchLicenses();
  };
```

- Add `...(showDataAccess && licensesReady ? { grant: setGrantFor } : {}),` as the last entry of `handlers`.
- Directly after `</SectionHeader>`, add:

```tsx
      {showDataAccess && !isLoading && !isError && (
        <PendingGrantBanner
          members={members}
          licenses={licenses}
          licensesLoading={!licensesReady}
          onGrant={setGrantFor}
        />
      )}
```

- Before `</Section>`, add:

```tsx
      {grantFor && (
        <GrantAccessModal
          member={grantFor}
          licenses={licenses}
          onClose={() => setGrantFor(null)}
          onGranted={afterSignerChange}
        />
      )}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/hooks/useSetLicenseSigners.test.tsx __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/app/settings && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSetLicenseSigners.ts src/utils/registryWrite.ts src/utils/txErrorStatus.ts src/app/settings/components/Team __tests__/unit/hooks/useSetLicenseSigners.test.tsx __tests__/unit/utils/registryWrite.test.ts __tests__/unit/pages/app/settings
git commit -m "feat(teams): grant members data access on-chain, then record the keys"
```

---

### Task 15: Revoke, remove and finish revoking, with the webhook review

**Files:**

- Create: `src/hooks/useMemberWebhooks.ts`
- Create in `src/app/settings/components/Team/`: `revokeMemberKeys.ts`, `WebhookReview.tsx`, `RevokeAccessModal.tsx`, `RemoveMemberModal.tsx`
- Modify: `src/types/webhook.ts` (`Webhook` gains `createdBySigner?` and `updatedBySigner?`, C3), `src/app/settings/components/Team/TeamSection.tsx`
- Test:
  - `__tests__/unit/pages/app/settings/revokeMemberKeys.test.ts`, `WebhookReview.test.tsx`, `RevokeAccessModal.test.tsx`, `RemoveMemberModal.test.tsx`
  - `TeamSection.test.tsx` (extend)

**Interfaces:**

- Consumes:
  - `memberLicenseKeys`, `memberAddresses` and `displayName` (Task 13);
  - `useSetLicenseSigners`, `registryWrite` and `txErrorStatus` (Task 14);
  - `markLicenseSignerDisabled` and `removeTeamMember` (Task 2);
  - `useDimoAuth().getGlobalAccountDeveloperJwt` (`src/hooks/useDimoAuth.ts:132-171`), `getDevJwt` and `fetchWebhooks`.
- Produces:
  - **`revokeMemberKeys(keys, { disable, stamp }): Promise<{ txError, unstamped }>`:**
    - it disables every on-chain key in one transaction (a reverted operation is a `txError`, via `useSetLicenseSigners`);
    - it stamps every registered key on a license in the loaded list, registry-only ones included; a key whose license isn't in the list (`licenseKnown: false`) is never stamped or disabled;
    - after a failed transaction it stamps only keys already off-chain;
    - a stamp answering `NOT_FOUND` counts as done.
  - **`useMemberWebhooks({ clientId, redirectUri, addresses, pastedJwt? })`**, a React Query.
    - Token order: the developer JWT in this browser, then `getGlobalAccountDeveloperJwt`, then the pasted one. Without any, it throws `NeedsDevJwtError`.
    - It returns the webhooks whose `createdBySigner` **or** `updatedBySigner` matches any address (case-insensitive).
    - `touchedBy(webhook, addresses)` is exported.
  - `WebhookReview`: `{ member, licenses }`, one block per license the member holds or held a key on.
  - Both modals start from `actionableKeys(memberLicenseKeys(member, licenses))`, and TeamSection offers Revoke and Remove only once the licenses loaded cleanly (Task 13's `licensesReady`).
  - `RevokeAccessModal`: `{ member, licenses, onClose, onDone }`. The licenses to revoke are a checklist, all chosen by default (spec: "for the chosen licenses"). It tracks `Data Access Revoked`; a failed stamp offers Retry (stamps only).
  - **`RemoveMemberModal`:** `{ member, licenses, teamName, onClose, onDone }`.
    - It revokes every key first, then deletes the membership unless the member is already `REVOKED` or `LEFT`.
    - If the transaction fails, the membership is still removed (spec, Revoke/Remove), the loading status shows the failure, and the row stays as `Still a signer on {licenses}` with **Retry**.
    - It tracks `Team Member Removed`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/pages/app/settings/revokeMemberKeys.test.ts`:

```ts
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { revokeMemberKeys } from '@/app/settings/components/Team/revokeMemberKeys';
import type { MemberLicenseKey } from '@/app/settings/components/Team/memberKeys';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const key = (
  tokenId: number,
  signer: `0x${string}`,
  onChain: boolean,
  registered = true,
  licenseKnown = true,
): MemberLicenseKey => ({
  tokenId,
  licenseLabel: `License ${tokenId}`,
  signer,
  onChain,
  registered,
  licenseKnown,
});
const KEYS = [key(42, CURRENT, true), key(43, OLD, true), key(44, OLD, false), key(45, CURRENT, true, false)];
const ok = { ok: true as const, data: {} };

describe('revokeMemberKeys', () => {
  it('disables every on-chain key in one transaction and stamps every registered key', async () => {
    const disable = jest.fn(async () => {});
    const stamp = jest.fn(async () => ok);
    await expect(revokeMemberKeys(KEYS, { disable, stamp })).resolves.toEqual({ txError: null, unstamped: [] });
    expect(disable).toHaveBeenCalledTimes(1);
    expect(disable).toHaveBeenCalledWith([
      { tokenId: 42, signer: CURRENT },
      { tokenId: 43, signer: OLD },
      { tokenId: 45, signer: CURRENT },
    ]);
    expect(stamp.mock.calls).toEqual([
      [42, CURRENT],
      [43, OLD],
      [44, OLD],
    ]);
  });

  it('after a failed transaction stamps only keys already off-chain', async () => {
    const denied = { code: 4001 };
    const stamp = jest.fn(async () => ok);
    const outcome = await revokeMemberKeys(KEYS, { disable: jest.fn().mockRejectedValue(denied), stamp });
    expect(outcome.txError).toBe(denied);
    expect(stamp.mock.calls).toEqual([[44, OLD]]);
  });

  it('never stamps a key whose license is not in the loaded list', async () => {
    const disable = jest.fn();
    const stamp = jest.fn(async () => ok);
    await expect(
      revokeMemberKeys([key(99, OLD, false, true, false)], { disable, stamp }),
    ).resolves.toEqual({ txError: null, unstamped: [] });
    expect(disable).not.toHaveBeenCalled();
    expect(stamp).not.toHaveBeenCalled();
  });

  it('only stamps when nothing is on-chain (finishing an earlier revoke)', async () => {
    const disable = jest.fn();
    const stamp = jest.fn(async () => ok);
    await revokeMemberKeys([key(44, OLD, false)], { disable, stamp });
    expect(disable).not.toHaveBeenCalled();
    expect(stamp).toHaveBeenCalledWith(44, OLD);
  });

  it('reports stamps that fail or reject after the retry, and treats NOT_FOUND as done', async () => {
    const stamp = jest.fn(async (tokenId: number) => {
      if (tokenId === 42) return { ok: false as const, status: 404, code: 'NOT_FOUND', message: 'x' };
      if (tokenId === 43) throw new Error('Failed to fetch');
      return { ok: false as const, status: 502, code: 'IDENTITY_UNAVAILABLE', message: 'x' };
    });
    const outcome = await revokeMemberKeys(KEYS, { disable: jest.fn(async () => {}), stamp });
    expect(outcome.unstamped.map((k) => k.tokenId)).toEqual([43, 44]);
    expect(stamp.mock.calls.map(([tokenId]) => tokenId)).toEqual([42, 43, 43, 44, 44]);
  });
});
```

`__tests__/unit/pages/app/settings/WebhookReview.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/services/webhook', () => ({ fetchWebhooks: jest.fn() }));
const getGlobalAccountDeveloperJwt = jest.fn();
jest.mock('@/hooks/useDimoAuth', () => ({ useDimoAuth: () => ({ getGlobalAccountDeveloperJwt }) }));
jest.mock('@/utils/devJwt', () => ({ getDevJwt: jest.fn() }));
import { fetchWebhooks } from '@/services/webhook';
import { getDevJwt } from '@/utils/devJwt';
import { WebhookReview } from '@/app/settings/components/Team/WebhookReview';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [{ licenseTokenId: 42, signerAddress: OLD }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  { tokenId: 42, clientId: CLIENT, label: 'Harness Fleet', redirectUri: 'https://harness.dev/callback', signers: [CURRENT.toLowerCase()] },
];
const webhook = (id: string, extra: object) => ({
  id,
  displayName: `Hook ${id}`,
  targetURL: `https://hooks.harness.dev/${id}`,
  ...extra,
});
// jsdom: btoa, not Buffer.
const b64 = (o: object) =>
  btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwtFor = (clientId: string) => `${b64({ alg: 'none' })}.${b64({ ethereum_address: clientId })}.sig`;
const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <WebhookReview member={SAM} licenses={LICENSES} />
    </QueryClientProvider>,
  );

describe('WebhookReview', () => {
  beforeEach(() => {
    (fetchWebhooks as jest.Mock).mockResolvedValue([
      webhook('a', { createdBySigner: OLD }),
      webhook('b', { updatedBySigner: CURRENT.toLowerCase() }),
      webhook('c', { createdBySigner: '0x0000000000000000000000000000000000000001' }),
    ]);
  });

  it('lists webhooks created or last changed by any wallet the member used', async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    show();
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
    expect(screen.getByText('Created by them')).toBeInTheDocument();
    expect(screen.getByText('Hook b')).toBeInTheDocument();
    expect(screen.getByText('Last changed by them')).toBeInTheDocument();
    expect(screen.queryByText('Hook c')).toBeNull();
    expect(fetchWebhooks).toHaveBeenCalledWith({ token: 'owner.jwt' });
    expect(getGlobalAccountDeveloperJwt).not.toHaveBeenCalled();
  });

  it("gets a developer JWT from the owner's wallet when this browser has none", async () => {
    (getDevJwt as jest.Mock).mockReturnValueOnce(null).mockReturnValue('fresh.jwt');
    getGlobalAccountDeveloperJwt.mockResolvedValue(true);
    show();
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
    expect(getGlobalAccountDeveloperJwt).toHaveBeenCalledWith({
      clientId: CLIENT,
      domain: 'https://harness.dev/callback',
    });
    expect(fetchWebhooks).toHaveBeenCalledWith({ token: 'fresh.jwt' });
  });

  it('falls back to a pasted developer JWT, for this license only', async () => {
    (getDevJwt as jest.Mock).mockReturnValue(null);
    getGlobalAccountDeveloperJwt.mockResolvedValue(false);
    show();
    const field = await screen.findByLabelText('Paste a developer JWT for Harness Fleet');
    fireEvent.change(field, { target: { value: jwtFor('0x0000000000000000000000000000000000000002') } });
    fireEvent.click(screen.getByRole('button', { name: 'Check webhooks' }));
    expect(screen.getByRole('alert')).toHaveTextContent('That developer JWT is for another license.');
    fireEvent.change(field, { target: { value: jwtFor(CLIENT.toUpperCase().replace('0X', '0x')) } });
    fireEvent.click(screen.getByRole('button', { name: 'Check webhooks' }));
    expect(await screen.findByText('Hook a')).toBeInTheDocument();
  });

  it('says when nothing needs review', async () => {
    (getDevJwt as jest.Mock).mockReturnValue('owner.jwt');
    (fetchWebhooks as jest.Mock).mockResolvedValue([]);
    show();
    await waitFor(() =>
      expect(screen.getByText('No webhooks on Harness Fleet were created or changed by Sam Rivera.')).toBeInTheDocument(),
    );
  });
});
```

`__tests__/unit/pages/app/settings/RemoveMemberModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({ useSetLicenseSigners: () => mockSetSigners }));
jest.mock('@/actions/teams', () => ({ markLicenseSignerDisabled: jest.fn(), removeTeamMember: jest.fn() }));
jest.mock('@/app/settings/components/Team/WebhookReview', () => ({
  WebhookReview: () => <div>webhook review</div>,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { markLicenseSignerDisabled, removeTeamMember } from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { RemoveMemberModal } from '@/app/settings/components/Team/RemoveMemberModal';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [
    { licenseTokenId: 42, signerAddress: CURRENT },
    { licenseTokenId: 43, signerAddress: OLD },
  ],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES: TeamLicense[] = [
  { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [CURRENT.toLowerCase()] },
  { tokenId: 43, clientId: '0xbbb', label: 'Harness Labs', redirectUri: 'https://y', signers: [] },
];
const setLoadingStatus = jest.fn();
const onClose = jest.fn();
const onDone = jest.fn();
const remove = () => {
  render(
    <LoadingStatusContext.Provider value={{ setLoadingStatus, clearLoadingStatus: jest.fn() }}>
      <RemoveMemberModal member={SAM} licenses={LICENSES} teamName="Harness Motors" onClose={onClose} onDone={onDone} />
    </LoadingStatusContext.Provider>,
  );
  expect(screen.getByText('webhook review')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove from team' }));
};

describe('RemoveMemberModal', () => {
  beforeEach(() => {
    mockSetSigners.mockReset().mockResolvedValue(undefined);
    (markLicenseSignerDisabled as jest.Mock).mockReset().mockResolvedValue({ ok: true, data: {} });
    (removeTeamMember as jest.Mock).mockReset().mockResolvedValue({ ok: true, data: null });
  });

  it('revokes on-chain, stamps every key including the old wallet, removes and tracks', async () => {
    remove();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sam Rivera was removed from Harness Motors.'));
    expect(mockSetSigners).toHaveBeenCalledWith('disableSigner', [{ tokenId: 42, signer: CURRENT }]);
    expect(markLicenseSignerDisabled).toHaveBeenCalledWith(42, CURRENT);
    expect(markLicenseSignerDisabled).toHaveBeenCalledWith(43, OLD);
    expect(removeTeamMember).toHaveBeenCalledWith('m-sam');
    expect(trackEvent).toHaveBeenCalledWith('Data Access Revoked', { memberId: 'm-sam', tokenIds: [42, 43] });
    expect(trackEvent).toHaveBeenCalledWith('Team Member Removed', { memberId: 'm-sam' });
    expect(onClose).toHaveBeenCalled();
  });

  it('still removes the membership when the transaction is denied, leaving the key to Retry', async () => {
    mockSetSigners.mockRejectedValue({ code: 4001 });
    remove();
    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('m-sam'));
    expect(setLoadingStatus).toHaveBeenLastCalledWith({ status: 'error', label: 'The transaction was denied' });
    expect(markLicenseSignerDisabled).toHaveBeenCalledTimes(1);
    expect(markLicenseSignerDisabled).toHaveBeenCalledWith(43, OLD);
    expect(toast.error).toHaveBeenCalledWith(
      'Sam Rivera was removed, but is still a signer on Harness Fleet. Use Retry on their row.',
    );
    expect(trackEvent).not.toHaveBeenCalledWith('Data Access Revoked', expect.anything());
  });

  it('still removes when a stamp fails twice, and says how to finish', async () => {
    (markLicenseSignerDisabled as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'));
    remove();
    await waitFor(() => expect(removeTeamMember).toHaveBeenCalledWith('m-sam'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't record the revoked access for Harness Fleet. Use Retry on their row to finish.",
      ),
    );
  });
});
```

`__tests__/unit/pages/app/settings/RevokeAccessModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSetSigners = jest.fn();
jest.mock('@/hooks/useSetLicenseSigners', () => ({ useSetLicenseSigners: () => mockSetSigners }));
jest.mock('@/actions/teams', () => ({ markLicenseSignerDisabled: jest.fn() }));
jest.mock('@/app/settings/components/Team/WebhookReview', () => ({
  WebhookReview: () => <div>webhook review</div>,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { markLicenseSignerDisabled } from '@/actions/teams';
import { toast } from 'sonner';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { RevokeAccessModal } from '@/app/settings/components/Team/RevokeAccessModal';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const LEO: TeamMember = {
  id: 'm-leo',
  userId: 'u-leo',
  name: 'Leo Park',
  email: 'leo@harness.dev',
  role: 'MEMBER',
  status: 'LEFT',
  signerAddress: CURRENT,
  memberKeys: [{ licenseTokenId: 42, signerAddress: CURRENT }],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSES = [
  { tokenId: 42, clientId: '0xaaa', label: 'Harness Fleet', redirectUri: 'https://x', signers: [CURRENT.toLowerCase()] },
];

describe('RevokeAccessModal', () => {
  it('revokes the chosen licenses, and retries only the registry stamp when it failed', async () => {
    mockSetSigners.mockResolvedValue(undefined);
    const unavailable = { ok: false, status: 502, code: 'IDENTITY_UNAVAILABLE', message: 'x' };
    (markLicenseSignerDisabled as jest.Mock)
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce({ ok: true, data: {} });
    const onClose = jest.fn();
    render(
      <LoadingStatusContext.Provider value={{ setLoadingStatus: jest.fn(), clearLoadingStatus: jest.fn() }}>
        <RevokeAccessModal member={LEO} licenses={LICENSES} onClose={onClose} onDone={jest.fn()} />
      </LoadingStatusContext.Provider>,
    );
    expect(screen.getByRole('checkbox', { name: 'Harness Fleet' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke data access' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Data access is off, but we couldn't record that for Harness Fleet.",
    );
    expect(trackEvent).toHaveBeenCalledWith('Data Access Revoked', { memberId: 'm-leo', tokenIds: [42] });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Leo Park's data access is revoked."));
    expect(mockSetSigners).toHaveBeenCalledTimes(1);
    expect(markLicenseSignerDisabled).toHaveBeenCalledTimes(3);
    expect(onClose).toHaveBeenCalled();
  });
});
```

Extend `__tests__/unit/pages/app/settings/TeamSection.test.tsx`:
- Add this mock beside the others. `WebhookReview` uses `useDimoAuth`, which loads Turnkey:

```tsx
jest.mock('@/hooks/useDimoAuth', () => ({ useDimoAuth: () => ({ getGlobalAccountDeveloperJwt: jest.fn() }) }));
```

- Append inside the `describe`:

```tsx
  it('offers no Revoke or Remove until the licenses load', () => {
    members({ members: [OWNER_ROW, { ...SAM, memberKeys: [{ licenseTokenId: 42, signerAddress: SAM.signerAddress! }] }] });
    (useTeamLicenses as jest.Mock).mockReturnValue({ licenses: [], loading: true, refetch: jest.fn() });
    render(<TeamSection />);
    expect(screen.queryByRole('button', { name: 'Actions for sam@harness.dev' })).toBeNull();
  });

  it('opens Remove for an accepted member', () => {
    members({ members: [OWNER_ROW, { ...SAM, memberKeys: [] }] });
    (useTeamLicenses as jest.Mock).mockReturnValue({ licenses: [], loading: false, refetch: jest.fn() });
    render(<TeamSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for sam@harness.dev' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove' }));
    expect(screen.getByRole('heading', { name: 'Remove Sam Rivera from Harness Motors?' })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/pages/app/settings`
Expected: FAIL. The modules are missing, and there is no Remove or Revoke handler.

- [ ] **Step 3: Implement**

`src/types/webhook.ts`: add to `interface Webhook`, after `failure_count`:

```ts
  // Contracts C3: the signer that created the webhook, or last changed its
  // target, vehicles or condition. Checksummed; absent for older webhooks.
  createdBySigner?: string;
  updatedBySigner?: string;
```

`src/app/settings/components/Team/revokeMemberKeys.ts`:

```ts
import type { SignerChange } from '@/hooks/useSetLicenseSigners';
import type { ApiResult } from '@/types/team';
import { registryWrite } from '@/utils/registryWrite';
import type { MemberLicenseKey } from './memberKeys';

export interface RevokeDeps {
  disable: (changes: SignerChange[]) => Promise<void>;
  stamp: (tokenId: number, signer: `0x${string}`) => Promise<ApiResult<unknown>>;
}

export interface RevokeOutcome {
  txError: unknown | null;
  unstamped: MemberLicenseKey[];
}

// 1. Disable every key the chain still lists, in one user operation.
// 2. Stamp every registered key disabled, including ones already off-chain (an
//    old wallet, or an earlier revoke whose stamp failed).
// After a failed transaction only keys already off-chain are stamped, so the
// registry never calls a key disabled while the chain still honours it. "Off-
// chain" is only known for a license in the loaded list: other keys are left
// alone (the caller only offers Revoke once the licenses loaded cleanly).
export const revokeMemberKeys = async (
  allKeys: MemberLicenseKey[],
  deps: RevokeDeps,
): Promise<RevokeOutcome> => {
  const keys = allKeys.filter((k) => k.licenseKnown);
  const onChain = keys.filter((k) => k.onChain);
  let txError: unknown = null;
  if (onChain.length) {
    try {
      await deps.disable(onChain.map(({ tokenId, signer }) => ({ tokenId, signer })));
    } catch (error) {
      txError = error;
    }
  }
  const unstamped: MemberLicenseKey[] = [];
  for (const key of keys.filter((k) => k.registered && (!txError || !k.onChain))) {
    const result = await registryWrite(() => deps.stamp(key.tokenId, key.signer));
    if (!result.ok && result.code !== 'NOT_FOUND') unstamped.push(key);
  }
  return { txError, unstamped };
};
```

`src/hooks/useMemberWebhooks.ts`:

```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { useDimoAuth } from '@/hooks/useDimoAuth';
import { fetchWebhooks } from '@/services/webhook';
import type { Webhook } from '@/types/webhook';
import { getDevJwt } from '@/utils/devJwt';

export class NeedsDevJwtError extends Error {
  constructor() {
    super('A developer JWT is needed to read this license’s webhooks');
    this.name = 'NeedsDevJwtError';
  }
}

export const touchedBy = (webhook: Webhook, addresses: string[]) => {
  const wanted = new Set(addresses.map((a) => a.toLowerCase()));
  return {
    created: !!webhook.createdBySigner && wanted.has(webhook.createdBySigner.toLowerCase()),
    updated: !!webhook.updatedBySigner && wanted.has(webhook.updatedBySigner.toLowerCase()),
  };
};

// Webhooks on one license that a member created or last changed (C3), read
// with the owner's developer JWT: the one in this browser, else a new one from
// the owner's wallet, else one the owner pastes.
export const useMemberWebhooks = ({
  clientId,
  redirectUri,
  addresses,
  pastedJwt,
}: {
  clientId: string;
  redirectUri: string | null;
  addresses: string[];
  pastedJwt?: string;
}) => {
  const { getGlobalAccountDeveloperJwt } = useDimoAuth();
  return useQuery({
    queryKey: ['member-webhooks', clientId, redirectUri, addresses.join(','), pastedJwt ?? ''],
    retry: false,
    queryFn: async () => {
      let token = pastedJwt || getDevJwt(clientId);
      if (!token && redirectUri) {
        const generated = await getGlobalAccountDeveloperJwt({
          clientId: clientId as `0x${string}`,
          domain: redirectUri,
        }).catch(() => false);
        if (generated) token = getDevJwt(clientId);
      }
      if (!token) throw new NeedsDevJwtError();
      const webhooks = await fetchWebhooks({ token });
      return webhooks
        .map((webhook) => ({ webhook, ...touchedBy(webhook, addresses) }))
        .filter(({ created, updated }) => created || updated);
    },
  });
};
```

`src/app/settings/components/Team/WebhookReview.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { NeedsDevJwtError, useMemberWebhooks } from '@/hooks/useMemberWebhooks';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { memberAddresses, memberLicenseKeys } from './memberKeys';
import { displayName } from './MembersTable';

const LicenseWebhooks: FC<{ license: TeamLicense; addresses: string[]; name: string }> = ({
  license,
  addresses,
  name,
}) => {
  const [pasted, setPasted] = useState('');
  const [pastedJwt, setPastedJwt] = useState<string>();
  const [pasteError, setPasteError] = useState<string | null>(null);
  const query = useMemberWebhooks({
    clientId: license.clientId,
    redirectUri: license.redirectUri,
    addresses,
    pastedJwt,
  });

  const check = () => {
    let clientId: string | undefined;
    try {
      clientId = jwtDecode<{ ethereum_address?: string }>(pasted.trim()).ethereum_address;
    } catch {
      clientId = undefined;
    }
    if (clientId?.toLowerCase() !== license.clientId.toLowerCase()) {
      setPasteError('That developer JWT is for another license.');
      return;
    }
    setPasteError(null);
    setPastedJwt(pasted.trim());
  };

  if (query.isLoading) return <p className="text-body-sm text-muted">Checking {license.label}…</p>;
  if (query.error) {
    const id = `review-jwt-${license.tokenId}`;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-muted">
          {query.error instanceof NeedsDevJwtError
            ? `We need a developer JWT for ${license.label} to check its webhooks.`
            : `Couldn't load the webhooks for ${license.label}.`}
        </p>
        <label htmlFor={id} className="text-label text-muted">
          {`Paste a developer JWT for ${license.label}`}
        </label>
        <TextField id={id} value={pasted} onChange={(e) => setPasted(e.target.value)} />
        {pasteError && (
          <p role="alert" className="text-body-sm text-negative">
            {pasteError}
          </p>
        )}
        <Button variant="secondary" onClick={check} disabled={!pasted.trim()}>
          Check webhooks
        </Button>
      </div>
    );
  }
  if (!query.data?.length) {
    return (
      <p className="text-body-sm text-muted">
        {`No webhooks on ${license.label} were created or changed by ${name}.`}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {query.data.map(({ webhook, created, updated }) => (
        <li key={webhook.id} className="flex flex-col gap-0.5 rounded-control bg-control p-3">
          <span className="text-body-sm text-ink">
            {webhook.displayName || webhook.description || webhook.id}
          </span>
          <span className="break-all font-mono text-code text-muted">{webhook.targetURL}</span>
          <span className="text-label text-muted">
            {created && updated
              ? 'Created and last changed by them'
              : created
                ? 'Created by them'
                : 'Last changed by them'}
          </span>
        </li>
      ))}
    </ul>
  );
};

// Webhooks keep running after a member goes: list the ones they created or
// last changed, on every license they hold or held a key on (C3).
export const WebhookReview: FC<{ member: TeamMember; licenses: TeamLicense[] }> = ({
  member,
  licenses,
}) => {
  const tokenIds = new Set(memberLicenseKeys(member, licenses).map((k) => k.tokenId));
  const reviewed = licenses.filter((l) => tokenIds.has(l.tokenId));
  if (!reviewed.length) return null;
  const name = displayName(member);
  const addresses = memberAddresses(member);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body text-ink">Webhooks to review</h3>
      <p className="text-body-sm text-muted">
        Webhooks keep sending vehicle data after {name} goes. Check the ones they created or
        changed.
      </p>
      {reviewed.map((license) => (
        <LicenseWebhooks key={license.tokenId} license={license} addresses={addresses} name={name} />
      ))}
    </div>
  );
};
```

`src/app/settings/components/Team/RevokeAccessModal.tsx`:

```tsx
'use client';
import { type FC, useContext, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { markLicenseSignerDisabled } from '@/actions/teams';
import { formatList } from '@/config/teamCopy';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { actionableKeys, memberLicenseKeys, type MemberLicenseKey } from './memberKeys';
import { displayName } from './MembersTable';
import { revokeMemberKeys } from './revokeMemberKeys';
import { WebhookReview } from './WebhookReview';

export const labelsOfKeys = (keys: MemberLicenseKey[]) =>
  formatList([...new Set(keys.map((k) => k.licenseLabel))]);
export const tokenIdsOfKeys = (keys: MemberLicenseKey[]) =>
  [...new Set(keys.map((k) => k.tokenId))].sort((a, b) => a - b);

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  onClose: () => void;
  onDone: () => void;
}

export const RevokeAccessModal: FC<Props> = ({ member, licenses, onClose, onDone }) => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  const [keys] = useState(() => actionableKeys(memberLicenseKeys(member, licenses)));
  // One entry per license; every license is chosen to start with.
  const choices = useMemo(
    () => [...new Map(keys.map((k) => [k.tokenId, k.licenseLabel])).entries()],
    [keys],
  );
  const [chosen, setChosen] = useState<number[]>(() => choices.map(([tokenId]) => tokenId));
  const [busy, setBusy] = useState(false);
  const [unstamped, setUnstamped] = useState<MemberLicenseKey[] | null>(null);
  const name = displayName(member);
  const target = keys.filter((k) => chosen.includes(k.tokenId));

  const run = async (target: MemberLicenseKey[]) => {
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: `Revoking ${name}'s data access` });
    const outcome = await revokeMemberKeys(target, {
      disable: (changes) => setLicenseSigners('disableSigner', changes),
      stamp: markLicenseSignerDisabled,
    });
    setBusy(false);
    onDone();
    if (outcome.txError) {
      Sentry.captureException(outcome.txError);
      setLoadingStatus(txErrorStatus(outcome.txError));
      return;
    }
    clearLoadingStatus();
    if (target.some((k) => k.onChain)) {
      trackEvent('Data Access Revoked', { memberId: member.id, tokenIds: tokenIdsOfKeys(target) });
    }
    if (outcome.unstamped.length) {
      // Off-chain now: a retry only stamps.
      setUnstamped(outcome.unstamped.map((k) => ({ ...k, onChain: false })));
      return;
    }
    toast.success(`${name}'s data access is revoked.`);
    onClose();
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {`Revoke ${name}'s data access?`}
        </Title>
        <p className="text-body-sm text-muted">
          Their wallet is removed from the chosen licenses on-chain. Tokens they already hold stop
          working within about 10 minutes.
        </p>
        <ul className="flex flex-col gap-2">
          {choices.map(([tokenId, label]) => (
            <li key={tokenId} className="flex items-center gap-2">
              <CheckboxField
                id={`revoke-${tokenId}`}
                checked={chosen.includes(tokenId)}
                disabled={busy || !!unstamped}
                onChange={(e) =>
                  setChosen((prev) =>
                    e.target.checked ? [...prev, tokenId] : prev.filter((id) => id !== tokenId),
                  )
                }
              />
              <label htmlFor={`revoke-${tokenId}`} className="text-body-sm text-fg">
                {label}
              </label>
            </li>
          ))}
        </ul>
        <WebhookReview member={member} licenses={licenses} />
        {unstamped ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-sm text-negative">
              {`Data access is off, but we couldn't record that for ${labelsOfKeys(unstamped)}.`}
            </p>
            <Button variant="secondary" loading={busy} onClick={() => run(unstamped)}>
              Retry
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            loading={busy}
            disabled={!target.length}
            onClick={() => run(target)}
          >
            Revoke data access
          </Button>
        )}
      </div>
    </Modal>
  );
};
```

`src/app/settings/components/Team/RemoveMemberModal.tsx`:

```tsx
'use client';
import { type FC, useContext, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { markLicenseSignerDisabled, removeTeamMember } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { actionableKeys, memberLicenseKeys, type MemberLicenseKey } from './memberKeys';
import { displayName } from './MembersTable';
import { labelsOfKeys, tokenIdsOfKeys } from './RevokeAccessModal';
import { revokeMemberKeys } from './revokeMemberKeys';
import { WebhookReview } from './WebhookReview';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  teamName: string;
  onClose: () => void;
  onDone: () => void;
}

// Revoke first, then end the membership. A failed transaction still removes
// the member (the proxy refuses them within a minute either way); their row
// stays in the Team list as "Still a signer on …" with Retry (C7 lists REVOKED
// members who still hold a key).
export const RemoveMemberModal: FC<Props> = ({ member, licenses, teamName, onClose, onDone }) => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  const [keys] = useState(() => actionableKeys(memberLicenseKeys(member, licenses)));
  const [busy, setBusy] = useState(false);
  const name = displayName(member);

  const remove = async () => {
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: `Removing ${name}` });
    let unstamped: MemberLicenseKey[] = [];
    let txError: unknown = null;
    if (keys.length) {
      const outcome = await revokeMemberKeys(keys, {
        disable: (changes) => setLicenseSigners('disableSigner', changes),
        stamp: markLicenseSignerDisabled,
      });
      txError = outcome.txError;
      unstamped = outcome.unstamped;
      if (txError) Sentry.captureException(txError);
      else trackEvent('Data Access Revoked', { memberId: member.id, tokenIds: tokenIdsOfKeys(keys) });
    }
    if (member.status !== 'REVOKED' && member.status !== 'LEFT') {
      const result = await removeTeamMember(member.id).catch(() => null);
      if (!result?.ok) {
        setBusy(false);
        setLoadingStatus({
          status: 'error',
          label: result?.message ?? "We couldn't remove them. Try again.",
        });
        onDone();
        return;
      }
    }
    setBusy(false);
    trackEvent('Team Member Removed', { memberId: member.id });
    if (txError) {
      setLoadingStatus(txErrorStatus(txError));
      toast.error(
        `${name} was removed, but is still a signer on ${labelsOfKeys(keys.filter((k) => k.onChain))}. Use Retry on their row.`,
      );
    } else {
      clearLoadingStatus();
      toast.success(`${name} was removed from ${teamName}.`);
    }
    if (unstamped.length) {
      toast.error(
        `We couldn't record the revoked access for ${labelsOfKeys(unstamped)}. Use Retry on their row to finish.`,
      );
    }
    onDone();
    onClose();
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {`Remove ${name} from ${teamName}?`}
        </Title>
        <p className="text-body-sm text-muted">
          {keys.length
            ? `They lose access to this team in the console, and their wallet is removed from ${labelsOfKeys(keys)} on-chain.`
            : 'They lose access to this team in the console.'}
        </p>
        <WebhookReview member={member} licenses={licenses} />
        <div className="flex flex-col gap-2">
          <Button variant="destructive" loading={busy} onClick={remove}>
            Remove from team
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

`src/app/settings/components/Team/TeamSection.tsx`:
- Import `RevokeAccessModal` and `RemoveMemberModal`.
- Add `const [revokeFor, setRevokeFor] = useState<TeamMember | null>(null);` and `const [removeFor, setRemoveFor] = useState<TeamMember | null>(null);`.
- Add `...(licensesReady ? { revoke: setRevokeFor, remove: setRemoveFor } : {}),` to `handlers`: with no loaded licenses every key would read as off-chain and be stamped without a transaction.
- Before `</Section>`, add:

```tsx
      {revokeFor && (
        <RevokeAccessModal
          member={revokeFor}
          licenses={licenses}
          onClose={() => setRevokeFor(null)}
          onDone={afterSignerChange}
        />
      )}
      {removeFor && activeTeam && (
        <RemoveMemberModal
          member={removeFor}
          licenses={licenses}
          teamName={activeTeam.name}
          onClose={() => setRemoveFor(null)}
          onDone={afterSignerChange}
        />
      )}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/unit/pages/app/settings __tests__/unit/hooks && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 5: Commit**

```bash
git add src/types/webhook.ts src/hooks/useMemberWebhooks.ts src/app/settings/components/Team __tests__/unit/pages/app/settings
git commit -m "feat(teams): revoke and remove members across every key they held, with a webhook review"
```

---

### Task 16: License → API keys: "Belongs to", Assign, and registry writes that never hide a key

**Files:**

- Create: `src/hooks/useLicenseSignerRegistry.ts`
- Create: `src/app/license/[tokenId]/details/components/Signers/KeyHoldersModal.tsx`, `src/app/license/[tokenId]/details/components/Signers/BelongsTo.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx`, `src/hooks/useTransactions.ts` (`useEnableSigner` and `useDisableSigner` reject a reverted user operation)
- Test:
  - `__tests__/unit/hooks/useLicenseSignerRegistry.test.tsx`, `__tests__/unit/hooks/useTransactionsSigners.test.tsx`
  - `__tests__/unit/pages/license/[tokenId]/details/KeyHoldersModal.test.tsx`
  - `__tests__/unit/pages/license/[tokenId]/details/Signers.test.tsx`

**Interfaces:**

- Consumes:
  - `listLicenseSigners`, `upsertLicenseSigner` and `markLicenseSignerDisabled` (Task 2);
  - `registryWrite` and `assertUserOperation` (Task 14);
  - `useTeamMembers` (Task 13) and `RowActionsMenu` (Task 13);
  - `unwrap` (Task 1) and `useTeam` (Task 4);
  - the spec's _License → API keys_ section.
- Produces:
  - **`useLicenseSignerRegistry(tokenId)`:** `{ byAddress: Map<lowercase address, LicenseSignerRecord>, isError, refetch }`, holding enabled rows only. React Query key `['license-signers', activeTeamId, tokenId]`. Failures throw `TeamApiError`.
  - **`KeyHoldersModal`:** `{ signer?, initial?, submitLabel, onSubmit, onClose }`, titled "Who is this key for?".
    - It offers accepted team members (by `userId`), free-text names (comma-separated) and a note.
    - It requires at least one holder and a note of 200 characters or fewer (console-api's `INVALID_HOLDERS` rules).
    - `onSubmit(value): Promise<string | null>` returns an error to show, or null.
    - `KeyHolders = { holders: HolderInput[]; note: string | null }`.
  - **`BelongsTo`:** `{ record?, memberWallet?, offChain?, unavailable?, onAssign? }`. It shows:
    - for member keys, the name and email;
    - for a team member's verified wallet with no row (a grant whose record failed), the member and a `Not recorded` chip, without Assign; for the owner's own console wallet, the owner and a `Console wallet` chip;
    - for other keys, the holders and the note;
    - `Unassigned · Assign` when there is no row;
    - a `Disabled outside the console` chip for a registry row the chain no longer lists.
  - **`Signers` behavior:**
    - **Generate key** asks for holders first, enables the key, shows it at once, then writes an `API_KEY` row. If that write fails after its retry, a toast offers **Assign** with the holders filled in.
    - **RentalOS** writes an `API_KEY` row noted `RentalOS` (holder `RentalOS`) after the tenant is registered. It is never part of the rollback, and the `localStorage` tag is gone.
    - **Delete** stamps the row disabled.
    - Row actions sit in a `⋯` menu (Assign, Delete API key). A member's key, or a member's verified wallet, has none: Settings → Team manages it. The owner's console wallet has only Delete. console-api refuses an `API_KEY` or `EXTERNAL` row at any user's verified wallet (C7 `409 SIGNER_IN_USE`).
    - Assign shows `This address is a team member's wallet. Record it with Grant in Settings → Team.` for `SIGNER_IN_USE`, console-api's message for any other 4xx, and `We couldn't save this. Try again.` for a rejection or 5xx.
    - `useEnableSigner` and `useDisableSigner` (Generate key, RentalOS and its rollback, Delete, the console key) reject a reverted user operation through `assertUserOperation`.
    - Members see the table read-only.
    - Assigning tracks `API Key Assigned`.

- [ ] **Step 1: Write the failing tests**

`__tests__/unit/hooks/useLicenseSignerRegistry.test.tsx`:

```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listLicenseSigners: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ activeTeam: { id: 'team-harness' }, isLoading: false }),
}));
import { listLicenseSigners } from '@/actions/teams';
import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
import { TeamApiError } from '@/utils/teamApiError';

const record = (signerAddress: string, disabledAt: string | null = null) => ({
  signerAddress,
  kind: 'API_KEY',
  note: null,
  holders: [{ userId: null, name: 'Ops on-call', email: null }],
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-harness',
  disabledAt,
  disabledBy: null,
});
const makeWrapper = () => {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useLicenseSignerRegistry', () => {
  it('maps enabled rows by lowercase address', async () => {
    (listLicenseSigners as jest.Mock).mockResolvedValue({
      ok: true,
      data: {
        signers: [
          record('0x5b2E4F6A8C0D2e4f6A8C0D2e4f6a8c0D2e4F6a8c'),
          record('0x3a5C7e9b2d4F6a8c1c3E5A7B9d0F2a4c6E8B0D1f', '2026-09-20T00:00:00Z'),
        ],
      },
    });
    const { result } = renderHook(() => useLicenseSignerRegistry(42), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.byAddress.size).toBe(1));
    expect(result.current.byAddress.has('0x5b2e4f6a8c0d2e4f6a8c0d2e4f6a8c0d2e4f6a8c')).toBe(true);
    expect(listLicenseSigners).toHaveBeenCalledWith(42);
  });

  it('fails with a TeamApiError', async () => {
    (listLicenseSigners as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      code: 'IDENTITY_UNAVAILABLE',
      message: 'x',
    });
    const { result } = renderHook(() => useLicenseSignerRegistry(42), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(TeamApiError);
  });
});
```

`__tests__/unit/hooks/useTransactionsSigners.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';

const mockProcess = jest.fn();
// The @/hooks barrel pulls Turnkey; these two hooks only need these.
jest.mock('@/hooks', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
  useGlobalAccount: () => ({ validateCurrentSession: async () => ({ walletAddress: '0x1' }) }),
}));
jest.mock('@/hooks/useSACD', () => ({ useSACD: jest.fn() }));
jest.mock('@/services/pricing', () => ({ getCurrentDimoPrice: jest.fn() }));
import { useDisableSigner, useEnableSigner } from '@/hooks/useTransactions';
import { UserOperationFailedError } from '@/utils/userOperation';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const enable = () => renderHook(() => useEnableSigner(42)).result.current(SIGNER);
const disable = () => renderHook(() => useDisableSigner(42)).result.current(SIGNER);

describe('useEnableSigner and useDisableSigner', () => {
  it('resolve when the user operation succeeds', async () => {
    mockProcess.mockResolvedValue({ success: true });
    await expect(enable()).resolves.toBeUndefined();
    await expect(disable()).resolves.toBeUndefined();
  });

  it('reject when it lands but reverts (success: false, no throw)', async () => {
    mockProcess.mockResolvedValue({ success: false });
    await expect(enable()).rejects.toBeInstanceOf(UserOperationFailedError);
    await expect(disable()).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
```

`__tests__/unit/pages/license/[tokenId]/details/KeyHoldersModal.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({
    members: [
      { id: 'm-sam', userId: 'u-sam', name: 'Sam Rivera', email: 'sam@harness.dev', status: 'ACCEPTED' },
      { id: 'm-ana', userId: null, name: null, email: 'ana@harness.dev', status: 'PENDING' },
    ],
  }),
}));
import { KeyHoldersModal } from '@/app/license/[tokenId]/details/components/Signers/KeyHoldersModal';

const onSubmit = jest.fn();
const open = (props: Partial<React.ComponentProps<typeof KeyHoldersModal>> = {}) =>
  render(<KeyHoldersModal submitLabel="Save" onSubmit={onSubmit} onClose={jest.fn()} {...props} />);
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('KeyHoldersModal', () => {
  beforeEach(() => onSubmit.mockReset().mockResolvedValue(null));

  it('offers accepted members only', () => {
    open();
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeInTheDocument();
    expect(screen.queryByText('ana@harness.dev')).toBeNull();
  });

  it('requires at least one holder', () => {
    open();
    save();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one person, or type a name.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits members, typed names and the note', async () => {
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sam Rivera' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), {
      target: { value: 'Ops on-call,  Night shift ,' },
    });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Pager duty' } });
    save();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        holders: [{ userId: 'u-sam' }, { name: 'Ops on-call' }, { name: 'Night shift' }],
        note: 'Pager duty',
      }),
    );
  });

  it('fills in earlier holders and shows the error the caller returns', async () => {
    onSubmit.mockResolvedValue('Holders must be members of this team.');
    open({ initial: { holders: [{ userId: 'u-sam' }, { name: 'Ops on-call' }], note: 'Pager duty' } });
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeChecked();
    expect(screen.getByLabelText('Other people (comma-separated)')).toHaveValue('Ops on-call');
    expect(screen.getByLabelText('Note')).toHaveValue('Pager duty');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Holders must be members of this team.');
  });
});
```

`__tests__/unit/pages/license/[tokenId]/details/Signers.test.tsx`:

```tsx
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const enableSigner = jest.fn(async () => {});
const disableSigner = jest.fn(async () => {});
const trackEvent = jest.fn();
// The @/hooks barrel pulls Turnkey and ZeroDev; Signers only needs these.
jest.mock('@/hooks', () => ({
  useDimoAuth: () => ({ hasGlobalAccountPrivateKey: async () => ({ hasPrivateKey: false }) }),
  useDisableSigner: () => disableSigner,
  useEnableSigner: () => enableSigner,
  useEventEmitter: () => ({ publishEvent: jest.fn() }),
  useGlobalAccount: () => ({
    currentUser: {
      smartContractAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
      walletAddress: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    },
  }),
  useMixPanel: () => ({ trackEvent }),
  useSetRedirectUri: () => jest.fn(),
}));
jest.mock('@/hoc', () => ({
  withLoadingStatus: jest.requireActual('@/hoc/withLoadingStatus').withLoadingStatus,
}));
jest.mock('@/hooks/useIsLicenseOwner', () => ({ useIsLicenseOwner: jest.fn() }));
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
const SAM_ROW = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null as string | null,
};
const mockTeam = { members: [SAM_ROW] };
jest.mock('@/hooks/useTeamMembers', () => ({ useTeamMembers: () => mockTeam }));
const registry = { byAddress: new Map(), isError: false, refetch: jest.fn() };
jest.mock('@/hooks/useLicenseSignerRegistry', () => ({ useLicenseSignerRegistry: () => registry }));
jest.mock('@/actions/teams', () => ({ upsertLicenseSigner: jest.fn(), markLicenseSignerDisabled: jest.fn() }));
jest.mock('@/actions/user', () => ({ getUser: jest.fn() }));
jest.mock('@/services/dimoDev', () => ({ getDeveloperJwt: jest.fn() }));
jest.mock('@/utils/wallet', () => ({
  generateWallet: () => ({ address: '0xa11cE0000000000000000000000000000000Beef', privateKey: '0xabc123' }),
}));
jest.mock('@/app/license/[tokenId]/details/components/Signers/components/APIKeyModal', () => ({
  APIKeyModal: ({ isOpen, apiKey }: { isOpen: boolean; apiKey: string }) =>
    isOpen ? <p>{`API key ${apiKey}`}</p> : null,
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { getUser } from '@/actions/user';
import { getDeveloperJwt } from '@/services/dimoDev';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers/Signers';

const NEW_KEY = '0xa11cE0000000000000000000000000000000Beef';
const SIGNER = '0x5b2E4F6A8C0D2e4f6A8C0D2e4f6a8c0D2e4F6a8c';
const SAM_WALLET = '0x1c3E5A7b9D0F2a4c6E8b0D1F3a5c7e9B2D4f6a8C';
const UNASSIGNED = '0x2D4f6a8C1c3E5a7b9D0F2A4c6E8B0D1F3A5c7e9b';
const OLD = '0x3a5C7e9b2d4F6a8c1c3E5A7B9d0F2a4c6E8B0D1f';
const row = (signerAddress: string, kind: string, holders: object[], note: string | null = null) => ({
  signerAddress,
  kind,
  note,
  holders,
  createdAt: '2026-09-01T00:00:00Z',
  createdBy: 'user-harness',
  disabledAt: null,
  disabledBy: null,
});
const show = (signers: string[] = []) =>
  render(
    <Signers
      license={
        {
          owner: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
          clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
          tokenId: 42,
          signers: { nodes: signers.map((address) => ({ address, enabledAt: '2026-09-01T00:00:00Z' })) },
          redirectURIs: { nodes: [{ uri: 'https://rentals.dimo.co/' }] },
        } as never
      }
      refetch={jest.fn(async () => {})}
    />,
  );

describe('Signers', () => {
  beforeEach(() => {
    registry.byAddress = new Map();
    mockTeam.members = [SAM_ROW];
    (useIsLicenseOwner as jest.Mock).mockReturnValue(true);
    (upsertLicenseSigner as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('asks who a new key is for, shows it once enabled, and offers Assign with the holders filled in', async () => {
    (upsertLicenseSigner as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Generate key' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sam Rivera' }));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Prod backend' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate API key' }));
    expect(await screen.findByText('API key abc123')).toBeInTheDocument();
    expect(enableSigner).toHaveBeenCalledWith(NEW_KEY);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("The key works, but we couldn't record who it's for.", {
        action: expect.objectContaining({ label: 'Assign' }),
      }),
    );
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, NEW_KEY, {
      kind: 'API_KEY',
      holders: [{ userId: 'u-sam' }],
      note: 'Prod backend',
    });
    const [, options] = (toast.error as jest.Mock).mock.calls[0];
    act(() => options.action.onClick());
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeChecked();
    expect(screen.getByLabelText('Note')).toHaveValue('Prod backend');
  });

  it('records a RentalOS key, and a registry failure never rolls the tenant back', async () => {
    jest.useFakeTimers();
    (upsertLicenseSigner as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    (getDeveloperJwt as jest.Mock).mockResolvedValue({ headers: { Authorization: 'Bearer dev.jwt' } });
    (getUser as jest.Mock).mockResolvedValue({ name: 'Jane Developer', email: 'jane@harness.dev' });
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => 'ok' })) as never;
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Register RentalOS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    await waitFor(() =>
      expect(upsertLicenseSigner).toHaveBeenCalledWith(42, NEW_KEY, {
        kind: 'API_KEY',
        holders: [{ name: 'RentalOS' }],
        note: 'RentalOS',
      }),
    );
    expect(disableSigner).not.toHaveBeenCalled();
    expect(screen.getByText('API key abc123')).toBeInTheDocument();
  });

  it("shows who each key belongs to, and leaves a member's key to Settings → Team", async () => {
    registry.byAddress = new Map([
      [SIGNER.toLowerCase(), row(SIGNER, 'API_KEY', [{ userId: null, name: 'Ops on-call', email: null }], 'Pager duty')],
      [SAM_WALLET.toLowerCase(), row(SAM_WALLET, 'MEMBER', [{ userId: 'u-sam', name: 'Sam Rivera', email: 'sam@harness.dev' }])],
      [OLD.toLowerCase(), row(OLD, 'EXTERNAL', [{ userId: null, name: 'Old backend', email: null }])],
    ]);
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({ ok: true, data: { signer: {} } });
    show([SIGNER, SAM_WALLET, UNASSIGNED]);
    expect(screen.getByText('Pager duty')).toBeInTheDocument();
    expect(screen.getByText('sam@harness.dev')).toBeInTheDocument();
    expect(screen.getByText('Disabled outside the console')).toBeInTheDocument();
    expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `Actions for ${SAM_WALLET}` })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${SIGNER}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Assign' }));
    expect(screen.getByLabelText('Other people (comma-separated)')).toHaveValue('Ops on-call');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(trackEvent).toHaveBeenCalledWith('API Key Assigned', { tokenId: 42, signerAddress: SIGNER, holders: 1 }),
    );
    expect(upsertLicenseSigner).toHaveBeenCalledWith(42, SIGNER, {
      kind: 'API_KEY',
      holders: [{ name: 'Ops on-call' }],
      note: 'Pager duty',
    });
  });

  it('assigns an unregistered key as EXTERNAL', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({ ok: true, data: { signer: {} } });
    show([UNASSIGNED]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), { target: { value: 'Data team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(upsertLicenseSigner).toHaveBeenCalledWith(42, UNASSIGNED, {
        kind: 'EXTERNAL',
        holders: [{ name: 'Data team' }],
        note: null,
      }),
    );
  });

  it("never offers Assign or actions on a team member's wallet", () => {
    mockTeam.members = [{ ...SAM_ROW, signerAddress: SAM_WALLET }];
    show([SAM_WALLET]);
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
    expect(screen.queryByRole('button', { name: `Actions for ${SAM_WALLET}` })).toBeNull();
  });

  it("offers only Delete on the owner's own console wallet", () => {
    const JANE_WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
    mockTeam.members = [
      { ...SAM_ROW, id: 'm-jane', userId: 'u-jane', name: 'Jane Developer', email: 'jane@harness.dev', role: 'OWNER', signerAddress: JANE_WALLET },
    ];
    show([JANE_WALLET]);
    expect(screen.getByText('Console wallet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${JANE_WALLET}` }));
    expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Delete API key']);
  });

  it('explains SIGNER_IN_USE when Assign meets a member wallet the list did not know', async () => {
    (upsertLicenseSigner as jest.Mock).mockResolvedValue({
      ok: false,
      status: 409,
      code: 'SIGNER_IN_USE',
      message: 'x',
    });
    show([UNASSIGNED]);
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), { target: { value: 'Data team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This address is a team member's wallet. Record it with Grant in Settings → Team.",
    );
  });

  it('stamps the registry when an API key is deleted', async () => {
    (markLicenseSignerDisabled as jest.Mock).mockResolvedValue({ ok: true, data: {} });
    show([SIGNER]);
    fireEvent.click(screen.getByRole('button', { name: `Actions for ${SIGNER}` }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete API key' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(markLicenseSignerDisabled).toHaveBeenCalledWith(42, SIGNER));
    expect(disableSigner).toHaveBeenCalledWith(SIGNER);
  });

  it('is read-only for members', () => {
    (useIsLicenseOwner as jest.Mock).mockReturnValue(false);
    show([SIGNER]);
    expect(screen.queryByRole('button', { name: 'Generate key' })).toBeNull();
    expect(screen.queryByRole('button', { name: `Actions for ${SIGNER}` })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Assign' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/unit/hooks/useLicenseSignerRegistry.test.tsx __tests__/unit/hooks/useTransactionsSigners.test.tsx "__tests__/unit/pages/license/\[tokenId\]/details"`
Expected: FAIL. The modules are missing, `Signers` has no registry, and a reverted user operation resolves.

- [ ] **Step 3: Implement the hook and components**

`src/hooks/useLicenseSignerRegistry.ts`:

```ts
'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLicenseSigners } from '@/actions/teams';
import { useTeam } from '@/hooks/useTeam';
import type { LicenseSignerRecord } from '@/types/team';
import { unwrap } from '@/utils/teamApiError';

// Who each key on a license is for (spec: key registry). Enabled rows only,
// by lowercase address: Identity checksums, console-api may not.
export const useLicenseSignerRegistry = (tokenId: number) => {
  const { activeTeam, isLoading } = useTeam();
  const query = useQuery({
    queryKey: ['license-signers', activeTeam?.id ?? null, tokenId],
    enabled: !isLoading && !!activeTeam,
    retry: false,
    queryFn: async () => unwrap(await listLicenseSigners(tokenId)).signers,
  });
  const byAddress = useMemo(
    () =>
      new Map<string, LicenseSignerRecord>(
        (query.data ?? [])
          .filter((r) => !r.disabledAt)
          .map((r) => [r.signerAddress.toLowerCase(), r]),
      ),
    [query.data],
  );
  return { byAddress, isError: query.isError, error: query.error, refetch: query.refetch };
};
```

`src/app/license/[tokenId]/details/components/Signers/KeyHoldersModal.tsx`:

```tsx
'use client';
import { type FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { TextField } from '@/components/TextField';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { HolderInput } from '@/types/team';

export interface KeyHolders {
  holders: HolderInput[];
  note: string | null;
}

interface Props {
  signer?: `0x${string}`;
  initial?: KeyHolders;
  submitLabel: string;
  // Resolves to an error message to show, or null when done.
  onSubmit: (value: KeyHolders) => Promise<string | null>;
  onClose: () => void;
}

const NOTE_MAX = 200;

// "Who is this key for?" — team members, other people by name, and a note.
// console-api refuses an API_KEY or EXTERNAL row without a holder.
export const KeyHoldersModal: FC<Props> = ({ signer, initial, submitLabel, onSubmit, onClose }) => {
  const { members } = useTeamMembers();
  const people = members.filter((m) => m.status === 'ACCEPTED' && m.userId);
  const [userIds, setUserIds] = useState<string[]>(() =>
    (initial?.holders ?? []).flatMap((h) => ('userId' in h ? [h.userId] : [])),
  );
  const [others, setOthers] = useState(() =>
    (initial?.holders ?? []).flatMap((h) => ('name' in h ? [h.name] : [])).join(', '),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const holders: HolderInput[] = [
      ...userIds.map((userId) => ({ userId })),
      ...others
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
    ];
    if (!holders.length) {
      setError('Choose at least one person, or type a name.');
      return;
    }
    if (note.trim().length > NOTE_MAX) {
      setError(`Keep the note under ${NOTE_MAX} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await onSubmit({ holders, note: note.trim() || null });
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          Who is this key for?
        </Title>
        {signer && <span className="break-all font-mono text-code text-muted">{signer}</span>}
        {people.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label text-muted">Team members</legend>
            {people.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <CheckboxField
                  id={`holder-${m.id}`}
                  checked={userIds.includes(m.userId!)}
                  onChange={(e) =>
                    setUserIds((prev) =>
                      e.target.checked ? [...prev, m.userId!] : prev.filter((id) => id !== m.userId),
                    )
                  }
                />
                <label htmlFor={`holder-${m.id}`} className="text-body-sm text-fg">
                  {m.name ?? m.email}
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <label htmlFor="holder-others" className="text-label text-muted">
          Other people (comma-separated)
        </label>
        <TextField id="holder-others" value={others} onChange={(e) => setOthers(e.target.value)} />
        <label htmlFor="holder-note" className="text-label text-muted">
          Note
        </label>
        <TextField id="holder-note" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        <Button loading={busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  );
};
```

`src/app/license/[tokenId]/details/components/Signers/BelongsTo.tsx`:

```tsx
import type { FC } from 'react';
import { StatusChip } from '@/components/StatusChip';
import { formatList } from '@/config/teamCopy';
import type { LicenseSignerRecord } from '@/types/team';

interface Props {
  record?: LicenseSignerRecord;
  // A verified wallet of the team with no registry row: the owner's console
  // wallet, or a member's wallet whose grant wasn't recorded (Grant in Settings
  // → Team records it). Assign never may (C7).
  memberWallet?: { name: string; email: string; owner: boolean };
  // A registry row whose signer the chain no longer lists.
  offChain?: boolean;
  unavailable?: boolean;
  onAssign?: () => void;
}

export const BelongsTo: FC<Props> = ({
  record,
  memberWallet,
  offChain = false,
  unavailable = false,
  onAssign,
}) => {
  if (unavailable) return <span className="text-body-sm text-muted">—</span>;
  let body;
  if (!record && memberWallet) {
    body = (
      <div className="flex flex-col items-start gap-1">
        <span className="text-body-sm text-fg">{memberWallet.name}</span>
        <span className="break-all text-label text-muted">{memberWallet.email}</span>
        {memberWallet.owner ? (
          <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
            Console wallet
          </span>
        ) : (
          <StatusChip tone="pending">Not recorded</StatusChip>
        )}
      </div>
    );
  } else if (!record) {
    body = (
      <span className="text-body-sm text-muted">
        Unassigned
        {onAssign && (
          <>
            {' · '}
            <button type="button" className="text-ink underline" onClick={onAssign}>
              Assign
            </button>
          </>
        )}
      </span>
    );
  } else if (record.kind === 'MEMBER') {
    const holder = record.holders[0];
    body = (
      <div className="flex flex-col">
        <span className="text-body-sm text-fg">{holder?.name ?? holder?.email ?? 'Team member'}</span>
        {holder?.email && <span className="break-all text-label text-muted">{holder.email}</span>}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col">
        <span className="text-body-sm text-fg">
          {formatList(record.holders.map((h) => h.name ?? h.email ?? 'Unknown'))}
        </span>
        {record.note && <span className="text-label text-muted">{record.note}</span>}
      </div>
    );
  }
  if (!offChain) return body;
  return (
    <div className="flex flex-col items-start gap-1">
      {body}
      <StatusChip tone="off">Disabled outside the console</StatusChip>
    </div>
  );
};
```

- [ ] **Step 4: Wire the registry into `Signers.tsx`**

Imports:
- Remove `TrashIcon`.
- Add:

```tsx
import { toast } from 'sonner';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { registryWrite } from '@/utils/registryWrite';
import { BelongsTo } from './BelongsTo';
import { KeyHoldersModal, type KeyHolders } from './KeyHoldersModal';
import type { LicenseSignerRecord } from '@/types/team';
```

Drop the RentalOS `localStorage` tag (spec: the registry's `RentalOS` note replaces it):
- Delete `rentalOSSignerKey`, `getRentalOSSigner` and `saveRentalOSSigner`.
- Delete the `rentalOSSigner` state.
- Delete the two lines `saveRentalOSSigner(fragment.clientId, account.address);` and `setRentalOSSigner(account.address.toLowerCase());`.
- Remove `getFromLocalStorage, saveToLocalStorage` from the imports if nothing else uses them.

Below the other hooks in `SignersComponent`, add:

```tsx
  const registry = useLicenseSignerRegistry(fragment.tokenId);
  const { members } = useTeamMembers();
  // Verified wallets of the team (the owner's console wallet included): console
  // -api refuses them as API_KEY or EXTERNAL keys (C7 SIGNER_IN_USE), so they
  // are never offered for Assign.
  const memberWallets = new Map(
    members
      .filter((m) => m.signerAddress)
      .map((m) => [
        m.signerAddress!.toLowerCase(),
        { name: m.name ?? m.email, email: m.email, owner: m.role === 'OWNER' },
      ]),
  );
  const [holdersFor, setHoldersFor] = useState<
    | { mode: 'generate' }
    | { mode: 'assign'; signer: `0x${string}`; kind: 'API_KEY' | 'EXTERNAL'; initial?: KeyHolders }
    | null
  >(null);

  const toKeyHolders = (record: LicenseSignerRecord): KeyHolders => ({
    holders: record.holders.map((h) => (h.userId ? { userId: h.userId } : { name: h.name ?? '' })),
    note: record.note,
  });

  // An unregistered on-chain key is EXTERNAL: assigned after the fact (spec).
  const openAssign = (address: string) => {
    const record = registry.byAddress.get(address.toLowerCase());
    setHoldersFor({
      mode: 'assign',
      signer: address as `0x${string}`,
      kind: record?.kind === 'API_KEY' ? 'API_KEY' : 'EXTERNAL',
      initial: record ? toKeyHolders(record) : undefined,
    });
  };

  // Runs after the key is shown: a failed registry write never hides it.
  const recordKey = async (address: `0x${string}`, value: KeyHolders) => {
    const result = await registryWrite(() =>
      upsertLicenseSigner(fragment.tokenId, address, { kind: 'API_KEY', ...value }),
    );
    void registry.refetch();
    if (!result.ok) {
      toast.error("The key works, but we couldn't record who it's for.", {
        action: {
          label: 'Assign',
          onClick: () => setHoldersFor({ mode: 'assign', signer: address, kind: 'API_KEY', initial: value }),
        },
      });
    }
  };

  const submitHolders = async (value: KeyHolders): Promise<string | null> => {
    if (!holdersFor) return null;
    if (holdersFor.mode === 'generate') {
      setHoldersFor(null);
      void handleGenerateSigner(value);
      return null;
    }
    const { signer, kind } = holdersFor;
    const result = await registryWrite(() =>
      upsertLicenseSigner(fragment.tokenId, signer, { kind, ...value }),
    );
    if (!result.ok) {
      if (result.code === 'SIGNER_IN_USE')
        return "This address is a team member's wallet. Record it with Grant in Settings → Team.";
      return result.status === 0 || result.status >= 500
        ? "We couldn't save this. Try again."
        : result.message;
    }
    trackEvent('API Key Assigned', {
      tokenId: fragment.tokenId,
      signerAddress: signer,
      holders: value.holders.length,
    });
    toast.success('Saved who this key is for.');
    void registry.refetch();
    setHoldersFor(null);
    return null;
  };
```

`handleGenerateSigner` takes the holders. Change its signature to `async (holders: KeyHolders) => {`. After the existing `trackEvent('API Key Generated', …);`, add:

```tsx
      await recordKey(account.address, holders);
```

In `handleGenerateRentalOSTenant`, after `trackEvent('RentalOS Tenant Generated', …);`, add:

```tsx
      // registryWrite never throws, so this can't reach the rollback below.
      await recordKey(account.address, { holders: [{ name: 'RentalOS' }], note: 'RentalOS' });
```

In `handleDelete`, after `await handleDisableSigner(signer);`, add:

```tsx
      // Stamp the registry row; a key without one answers NOT_FOUND, which is fine.
      await registryWrite(() => markLicenseSignerDisabled(fragment.tokenId, signer));
      void registry.refetch();
```

Rows. Replace `displaySigners` with:

```tsx
  type SignerRow = SignerNode & { offChain?: boolean };
  const onChainRows: SignerRow[] = [
    ...fragment.signers.nodes.filter((s) => !pendingRemovals.has(s.address)),
    ...optimisticAdditions.filter(
      (s) => !fragment.signers.nodes.some((n) => n.address === s.address),
    ),
  ];
  const listed = new Set(onChainRows.map((s) => String(s.address).toLowerCase()));
  // Registry rows the chain no longer lists (spec: "Disabled outside the console").
  const offChainRows: SignerRow[] = [...registry.byAddress.values()]
    .filter((r) => !listed.has(r.signerAddress.toLowerCase()))
    .map((r) => ({ address: r.signerAddress, enabledAt: null, offChain: true }));
  const displaySigners = [...onChainRows, ...offChainRows];
```

Replace `renderDeleteSignerAction` with:

```tsx
  const renderRowActions = (item: SignerRow) => {
    if (!isLicenseOwner || item.offChain) return null;
    // A member's key, or a member's wallet not yet recorded, is granted and
    // revoked in Settings → Team, which keeps the registry in step with the chain.
    const address = String(item.address).toLowerCase();
    const wallet = memberWallets.get(address);
    if (registry.byAddress.get(address)?.kind === 'MEMBER' || (wallet && !wallet.owner)) return null;
    const remove = {
      label: 'Delete API key',
      destructive: true,
      onSelect: () => setSignerToDelete(item.address),
    };
    return (
      <RowActionsMenu
        key={`actions-${item.address}`}
        label={`Actions for ${item.address}`}
        // The owner's own console wallet can be deleted, never assigned.
        items={
          wallet ? [remove] : [{ label: 'Assign', onSelect: () => openAssign(item.address) }, remove]
        }
      />
    );
  };
```

Change `renderEnabledAt` to answer `—` for `enabledAt: null`:

```tsx
  const renderEnabledAt = (item: SignerRow) =>
    item.enabledAt ? new Date(item.enabledAt).toLocaleDateString() : '—';
```

The Generate key button opens the holders modal: `onClick={() => setHoldersFor({ mode: 'generate' })}`.

In the table:
- Replace the address cell's RentalOS check `item.address.toLowerCase() === rentalOSSigner` with `registry.byAddress.get(String(item.address).toLowerCase())?.note === 'RentalOS'`.
- Make the `columns` array:

```tsx
              columns={[
                {
                  name: 'address',
                  label: 'Signer address',
                  CustomHeader: <SignerAddressHeader key="header-addr" />,
                  render: (item: SignerRow) => (
                    <div className="flex items-center gap-2">
                      <span className="break-all font-mono text-code">{item.address}</span>
                      {registry.byAddress.get(String(item.address).toLowerCase())?.note ===
                        'RentalOS' && (
                        <span className="whitespace-nowrap rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
                          RentalOS
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  name: 'enabledAt',
                  label: 'Enabled on',
                  className: 'hidden md:table-cell',
                  render: renderEnabledAt,
                },
                {
                  name: 'belongsTo',
                  label: 'Belongs to',
                  className: 'hidden md:table-cell',
                  render: (item: SignerRow) => (
                    <BelongsTo
                      record={registry.byAddress.get(String(item.address).toLowerCase())}
                      memberWallet={memberWallets.get(String(item.address).toLowerCase())}
                      offChain={item.offChain}
                      unavailable={registry.isError}
                      onAssign={
                        isLicenseOwner && !memberWallets.has(String(item.address).toLowerCase())
                          ? () => openAssign(item.address)
                          : undefined
                      }
                    />
                  ),
                },
              ]}
              data={displaySigners}
              actions={[renderRowActions]}
```

Before `<DeleteConfirmationModal`, add:

```tsx
      {holdersFor && (
        <KeyHoldersModal
          signer={holdersFor.mode === 'assign' ? holdersFor.signer : undefined}
          initial={holdersFor.mode === 'assign' ? holdersFor.initial : undefined}
          submitLabel={holdersFor.mode === 'generate' ? 'Generate API key' : 'Save'}
          onSubmit={submitHolders}
          onClose={() => setHoldersFor(null)}
        />
      )}
```

The `Belongs to` column is hidden below `md`, like Enabled on. On a phone the row keeps the address and the `⋯` menu, whose Assign covers the cell's link (`DESIGN.md`, Table).

`src/hooks/useTransactions.ts`: add `import { assertUserOperation } from '@/utils/userOperation';`. In `useDisableSigner`, replace `await processTransactions(transaction);` with `assertUserOperation(await processTransactions(transaction));`. In `useEnableSigner`, replace `await processTransactions([transaction]);` with `assertUserOperation(await processTransactions([transaction]));`. A reverted user operation now fails Generate key, RentalOS (whose rollback runs), Delete and the console key instead of passing as done.

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npx jest __tests__/unit/hooks/useLicenseSignerRegistry.test.tsx __tests__/unit/hooks/useTransactionsSigners.test.tsx "__tests__/unit/pages/license/\[tokenId\]/details" && npx tsc --noEmit -p . 2>&1 | head -20`
Expected: PASS. `tsc` reports nothing new.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLicenseSignerRegistry.ts src/hooks/useTransactions.ts "src/app/license/[tokenId]/details/components/Signers" __tests__/unit/hooks/useLicenseSignerRegistry.test.tsx __tests__/unit/hooks/useTransactionsSigners.test.tsx "__tests__/unit/pages/license/[tokenId]/details"
git commit -m "feat(teams): record who each API key is for; registry writes never hide a key or roll back RentalOS"
```

---

### Task 17: Screenshot harness and docs

**Files:**

- Modify:
  - `scripts/visual/fixtures.mjs`
  - `scripts/visual/mock-server.mjs`
  - `scripts/visual/dataApi.mjs`
  - `scripts/visual/keys.mjs`
  - `scripts/visual/shoot.mjs`
  - `scripts/visual/routes.mjs`
  - `scripts/visual/harness.env`
  - `scripts/visual/README.md`
- Modify: `README.md` (the flag), `docs/DESIGN.md` (the shared row-actions menu)

**Interfaces:**

- Consumes: every UI from Tasks 4–16.
- Produces:
  - **Route options:**
    - `team` sets the `active_team` cookie, so the mock answers that scenario through `X-Team-Id`;
    - `inviteToken` sets an HttpOnly `invite_token`;
    - `memberSigner` makes Identity list the harness wallet on Harness Fleet;
    - `memberJwt` seeds a member developer JWT with `signer_address`;
    - `dataNoAccess` makes `/api/data/*` answer the proxy's `NO_ACCESS` with `memberOfTeam: true`.
  - **Scenarios by `X-Team-Id`:**
    - none: the owner alone in their team, which keeps the switcher hidden as on master;
    - `team-acme`: the owner is also a member of Acme Mobility, and Acme is active;
    - `team-empty`: the owner's team before anyone was invited;
    - `team-down`: `/api/my/teams` answers 500, the owner fallback of Review Focus 1.
  - **Coverage:** the harness browser mocks `/api/data/*` (`shoot.mjs`'s `context.route(/\/api\/data\/…/)`), so the console data proxy runs only in Jest (Task 12). The vehicle shots cover the page's member states, not the proxy.

- [ ] **Step 1: Shoot master as the baseline**

The harness uses fixed ports, so stop any running `visual:dev` first. Then:

```bash
cd ~/workspace/dimo-developer-console
git worktree add ../console-master origin/master
ln -s "$PWD/node_modules" ../console-master/node_modules
cd ../console-master && npm run visual:dev
```

Leave that running. In a second terminal:

```bash
cd ~/workspace/console-master && npm run visual:shoot -- --label=master
cp -r scripts/visual/out/master ~/workspace/dimo-developer-console/scripts/visual/out/master
```

Expected: one `✓ <route> <theme> <viewport>` line per shot; a failure prints `✗`. Then stop `visual:dev` and run `cd ~/workspace/dimo-developer-console && git worktree remove ../console-master`.

- [ ] **Step 2: Fixtures**

`scripts/visual/fixtures.mjs`. Correct `SIGNER` to its EIP-55 form (the current value's letter case isn't a valid checksum): `export const SIGNER = '0x5b2E4F6A8C0D2e4f6A8C0D2e4f6a8c0D2e4F6a8c';`. After it, add:

```js
// Teams (src/types/team.ts, contracts C7). Checksummed, as console-api and
// Identity return them; the console compares addresses case-insensitively.
export const WALLET_CHECKSUM = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
export const SAM_WALLET = '0x1c3E5A7b9D0F2a4c6E8b0D1F3a5c7e9B2D4f6a8C';
export const MAX_WALLET = '0x2D4f6a8C1c3E5a7b9D0F2A4c6E8B0D1F3A5c7e9b';
export const LEO_OLD_WALLET = '0x3a5C7e9b2d4F6a8c1c3E5A7B9d0F2a4c6E8B0D1f';
export const ACME_OWNER = '0x2B6E1c4f8a0d3E5b7c9a1D2E3f4A5b6c7D8e9f0a';
```

Replace the `COLLABORATORS` export (and its `// src/types/team.ts ITeamCollaborator` comment) with:

```js
const IN_A_WEEK = new Date(Date.now() + 7 * 86400_000).toISOString();
const team = (over) => ({
  companyName: null,
  role: 'OWNER',
  ownerUserId: 'user-harness',
  ownerEmail: USER_EMAIL,
  ownerAddress: KERNEL,
  isPersonal: true,
  ...over,
});
// src/types/team.ts TeamSummary
export const TEAM_HARNESS = team({
  id: 'team-harness',
  name: 'Harness Motors',
  companyName: 'Harness Motors',
});
export const TEAM_ACME = team({
  id: 'team-acme',
  name: 'Acme Mobility',
  companyName: 'Acme Mobility',
  role: 'MEMBER',
  ownerUserId: 'user-acme',
  ownerEmail: 'ops@acme.dev',
  ownerAddress: ACME_OWNER,
  isPersonal: false,
});
// The scenario follows X-Team-Id, i.e. the active_team cookie a route sets.
// team-down: console-api can't list teams (mock-server answers 500).
export const teamsFor = (teamId) => {
  if (teamId === 'team-acme') return [TEAM_HARNESS, TEAM_ACME];
  if (teamId === 'team-empty') return [{ ...TEAM_HARNESS, id: 'team-empty' }];
  return [TEAM_HARNESS];
};

// src/types/team.ts TeamMember
const member = (over) => ({
  userId: null,
  name: null,
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: null,
  memberKeys: [],
  invitedAt: NOW,
  inviteExpiresAt: null,
  ...over,
});
const OWNER_ROW = member({
  id: 'mem-jane',
  userId: 'user-harness',
  name: USER.name,
  email: USER_EMAIL,
  role: 'OWNER',
  signerAddress: WALLET_CHECKSUM,
});
const MEMBERS = [
  OWNER_ROW,
  // Data access to Harness Fleet.
  member({
    id: 'mem-sam',
    userId: 'user-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    signerAddress: SAM_WALLET,
    memberKeys: [{ licenseTokenId: LICENSE.tokenId, signerAddress: SAM_WALLET }],
  }),
  // Joined with a verified wallet and no key: the pending-grant banner.
  member({
    id: 'mem-max',
    userId: 'user-max',
    name: 'Max Chen',
    email: 'max@harness.dev',
    signerAddress: MAX_WALLET,
  }),
  member({ id: 'mem-ana', email: 'ana@harness.dev', status: 'PENDING', inviteExpiresAt: IN_A_WEEK }),
  // Left; a key under an old wallet is still in the registry (Revoke unfinished).
  member({
    id: 'mem-leo',
    userId: 'user-leo',
    name: 'Leo Park',
    email: 'leo@harness.dev',
    status: 'LEFT',
    memberKeys: [{ licenseTokenId: LICENSE.tokenId, signerAddress: LEO_OLD_WALLET }],
  }),
];
const ACME_MEMBERS = [
  member({ id: 'mem-olivia', userId: 'user-acme', name: 'Olivia Acme', email: 'ops@acme.dev', role: 'OWNER' }),
  member({
    id: 'mem-jane-acme',
    userId: 'user-harness',
    name: USER.name,
    email: USER_EMAIL,
    signerAddress: WALLET_CHECKSUM,
  }),
];
export const membersFor = (teamId) =>
  teamId === 'team-acme' ? ACME_MEMBERS : teamId === 'team-empty' ? [OWNER_ROW] : MEMBERS;

// src/types/team.ts LicenseSignerRecord
const signerRow = (signerAddress, kind, holders, note = null) => ({
  signerAddress,
  kind,
  note,
  holders,
  createdAt: NOW,
  createdBy: 'user-harness',
  disabledAt: null,
  disabledBy: null,
});
export const licenseSigners = (tokenId) =>
  tokenId === LICENSE.tokenId
    ? [
        signerRow(SIGNER, 'API_KEY', [{ userId: null, name: 'Ops on-call', email: null }], 'Pager duty'),
        signerRow(SAM_WALLET, 'MEMBER', [{ userId: 'user-sam', name: 'Sam Rivera', email: 'sam@harness.dev' }]),
        signerRow(LEO_OLD_WALLET, 'MEMBER', [{ userId: 'user-leo', name: 'Leo Park', email: 'leo@harness.dev' }]),
      ]
    : [];

// src/types/team.ts InvitePreview
export const INVITE_PREVIEW = {
  teamName: TEAM_ACME.name,
  ownerEmail: TEAM_ACME.ownerEmail,
  expiresAt: IN_A_WEEK,
};
```

In `WEBHOOKS[0]`, after `failure_count: 0,`, add `createdBySigner: SAM_WALLET,`. Sam created the speeding alert, so the remove shot has a webhook to review.

Identity. Give `license` the signers as a parameter, put Sam's wallet on Harness Fleet, and add the member variant:

```js
const license = (l, withUris, signers = [SIGNER]) => ({
```

```js
  signers: {
    __typename: 'SignerConnection',
    totalCount: signers.length,
    pageInfo: PAGE_INFO,
    nodes: signers.map((address) => ({
      __typename: 'Signer',
      address,
      enabledAt: '2026-03-02T15:04:05Z',
    })),
  },
```

```js
const LICENSES = [license(LICENSE, true, [SIGNER, SAM_WALLET]), license(LICENSE_2, false)];
// memberSigner: the harness wallet also signs for Harness Fleet (a member with data access).
const LICENSES_WITH_MEMBER = [
  license(LICENSE, true, [SIGNER, SAM_WALLET, WALLET_CHECKSUM]),
  license(LICENSE_2, false),
];
```

In `identityData`, take the option and use the matching list everywhere it read `LICENSES`:

```js
export const identityData = (
  vars,
  { noLicenses = false, notShared = false, memberSigner = false } = {},
) => {
  const all = memberSigner ? LICENSES_WITH_MEMBER : LICENSES;
  const licenses = noLicenses ? [] : all;
  const byVars = all.find(
```

Also make it `developerLicense: byVars ?? all[0],`.

- [ ] **Step 3: Mock server, data mock, keys, shooter and routes**

`scripts/visual/mock-server.mjs`:
- Pass the request to handlers, and let one answer another status:

```js
    for (const [method, re, handler] of routes) {
      const m = url.pathname.match(re);
      if (!m || req.method !== method) continue;
      const out = handler(m, url, req);
      return out?.mockStatus ? send(res, out.mockStatus, out.body) : send(res, 200, out);
    }
```

- Replace the `/api/my/team/collaborator` route with:

```js
  // Teams (contracts C7). The scenario follows X-Team-Id: see fixtures teamsFor.
  [
    'GET',
    /^\/api\/my\/teams$/,
    (m, url, req) =>
      req.headers['x-team-id'] === 'team-down'
        ? { mockStatus: 500, body: { message: 'harness: teams unavailable' } }
        : { teams: fx.teamsFor(req.headers['x-team-id']) },
  ],
  [
    'GET',
    /^\/api\/my\/team\/members$/,
    (m, url, req) => ({ members: fx.membersFor(req.headers['x-team-id']) }),
  ],
  [
    'GET',
    /^\/api\/my\/licenses\/(\d+)\/signers$/,
    (m) => ({ signers: fx.licenseSigners(Number(m[1])) }),
  ],
  ['POST', /^\/api\/invitations\/preview$/, () => fx.INVITE_PREVIEW],
  [
    'PUT',
    /^\/api\/me\/signer$/,
    () => ({ signerAddress: fx.WALLET_CHECKSUM, signerVerifiedAt: '2026-09-20T14:30:00Z' }),
  ],
```

`scripts/visual/dataApi.mjs`: add the option and answer it first:

```js
export async function dataApiHandler(
  route,
  { notShared = false, dataErrors = [], noAccess = false } = {},
) {
  if (noAccess) {
    // The console proxy refusing a member whose wallet Identity still lists.
    return route.fulfill({
      status: 403,
      json: {
        error: "You don't have data access to this license.",
        code: 'NO_ACCESS',
        memberOfTeam: true,
      },
    });
  }
```

`scripts/visual/keys.mjs`:
- Import `WALLET_CHECKSUM` beside `LICENSE`.
- In `generate()`, after `devJwt`, add the line below and return `memberDevJwt` with the rest:

```js
  // A member's developer JWT, signed by their wallet: it carries signer_address (C1).
  const memberDevJwt = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ aud: LICENSE.clientId, ethereum_address: LICENSE.clientId, signer_address: WALLET_CHECKSUM, exp })}.`;
```

- In `loadKeys`, regenerate cached keys that predate it: `if (keys.memberDevJwt && decodeJwt(keys.sessionJwt).exp * 1000 > Date.now() + 86400_000) return keys;`.

`scripts/visual/shoot.mjs`, in `prepare`:
- Pass `memberSigner: route.memberSigner` to `identityHandler`'s options and `noAccess: route.dataNoAccess` to `dataApiHandler`'s.
- Replace `await context.addCookies([...])` with:

```js
  const cookies = [
    {
      name: 'session-token',
      value: keys.sessionJwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ];
  // The active team travels to the mock as X-Team-Id (contracts C4).
  if (route.team)
    cookies.push({ name: 'active_team', value: route.team, domain: 'localhost', path: '/', sameSite: 'Lax' });
  if (route.inviteToken)
    cookies.push({
      name: 'invite_token',
      value: 'harness-invite-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    });
  await context.addCookies(cookies);
```

- Replace the second `addInitScript` call with:

```js
  await context.addInitScript(
    ({ session, embedded, devJwtKey, devJwts, signerKey, memberJwtKey, memberJwts }) => {
      sessionStorage.setItem('globalAccount', JSON.stringify(session));
      localStorage.setItem('GlobalAccountEmbeddedKey', JSON.stringify(embedded));
      localStorage.setItem(devJwtKey, JSON.stringify(devJwts));
      // Wallet registration (C6) runs once per session and needs a Turnkey
      // signature the mock can't make: mark it done.
      sessionStorage.setItem(signerKey, JSON.stringify('done'));
      if (memberJwts) localStorage.setItem(memberJwtKey, JSON.stringify(memberJwts));
    },
    {
      session: {
        email: fx.USER_EMAIL,
        subOrganizationId: fx.SUB_ORG.subOrganizationId,
        token: keys.credentialBundle,
        expiry: Math.floor(Date.now() / 1000) + 86400,
      },
      embedded: keys.embeddedPrivateKey,
      devJwtKey: `devJwt_${fx.LICENSE.clientId}_list_v1`,
      devJwts: [{ token: keys.devJwt, createdAt: Date.parse('2026-09-20T14:30:00Z') }],
      signerKey: `signerRegistered:${fx.WALLET}`,
      // Members keep developer JWTs per wallet (src/utils/devJwt.ts).
      memberJwtKey: `devJwt_${fx.LICENSE.clientId}_${fx.WALLET}_list_v1`,
      memberJwts: route.memberJwt
        ? [{ token: keys.memberDevJwt, createdAt: Date.parse('2026-09-20T14:30:00Z') }]
        : null,
    },
  );
```

`scripts/visual/routes.mjs`:
- Import `SIGNER` beside the other fixtures.
- Document the new options in the header comment, after `hover`:

```js
// team: active_team cookie (fixtures teamsFor: team-acme = member of Acme
// Mobility, team-empty = owner alone, team-down = /api/my/teams answers 500).
// inviteToken: a pending invite cookie.
// memberSigner: Identity lists the harness wallet on Harness Fleet. memberJwt:
// a member developer JWT in this browser. dataNoAccess: /api/data/* answers the
// proxy's NO_ACCESS for a member whose wallet is still listed. /api/data/* is
// mocked in the browser, so the data proxy itself is tested in Jest only.
```

- Append after `settings-support-modal`:

```js
  {
    name: 'settings-team-empty',
    path: '/settings',
    ready: 'Invite teammates to share',
    team: 'team-empty',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-member',
    path: '/settings',
    ready: 'Leave team',
    team: 'team-acme',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-invite-modal',
    path: '/settings',
    ready: 'Sam Rivera',
    click: 'text="Invite member"',
    after: 'Invite a team member',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    // The ⋯ menu must fit a 390px phone (DESIGN.md, Table).
    name: 'settings-member-menu',
    path: '/settings',
    ready: 'Sam Rivera',
    click: '[aria-label="Actions for ana@harness.dev"]',
    after: 'Cancel invite',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-grant-modal',
    path: '/settings',
    ready: 'Max Chen joined. Grant data access?',
    click: 'text="Grant"',
    after: 'Grant Max Chen data access',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-remove-modal',
    path: '/settings',
    ready: 'Sam Rivera',
    click: ['[aria-label="Actions for sam@harness.dev"]', 'text="Remove"'],
    after: 'Created by them',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'app-team-switcher',
    path: '/app',
    ready: 'Welcome',
    team: 'team-acme',
    click: '[aria-haspopup="listbox"]',
    after: 'Harness Motors',
    viewports: ['desktop'],
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    // Review Focus 1: console-api can't list teams; owners keep their licenses.
    name: 'licenses-teams-unavailable',
    path: '/licenses',
    ready: LICENSE.alias,
    team: 'team-down',
    after: "Couldn't load your teams",
  },
  {
    name: 'app-pending-invite',
    path: '/app',
    ready: 'Join Acme Mobility owned by ops@acme.dev?',
    inviteToken: true,
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    name: 'license-details-assign-key',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: [`[aria-label="Actions for ${SIGNER}"]`, 'text="Assign"'],
    after: 'Who is this key for?',
  },
  {
    name: 'vehicle-member',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Available signals',
    team: 'team-acme',
    memberSigner: true,
    memberJwt: true,
  },
  {
    name: 'vehicle-member-connect',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Connect your wallet to read this vehicle',
    team: 'team-acme',
    memberSigner: true,
  },
  {
    name: 'vehicle-member-no-access',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Ask ops@acme.dev for data access to Harness Fleet.',
    team: 'team-acme',
  },
  {
    name: 'vehicle-member-reconnect',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Reconnect to Harness Fleet',
    team: 'team-acme',
    memberSigner: true,
    memberJwt: true,
    dataNoAccess: true,
  },
  {
    name: 'vehicles-member-empty',
    path: '/vehicles',
    ready: 'This team has no developer licenses yet.',
    team: 'team-acme',
    noLicenses: true,
  },
```

`scripts/visual/harness.env`, after the template editor line:

```bash
# Member data access (C5). On here so Settings shows Grant and the Data access
# column and members get Vehicles; the flag-off states are covered by Jest.
NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED=true
```

- [ ] **Step 4: Docs**

`README.md`, in the `.env.local` example after `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED`:

```bash
# Team members' data access (read at build time; only "true" turns it on).
# While off, owners can't grant data access, the Team page hides the Data access
# column and members don't get Vehicles. Invites, teams, leaving and the API-key
# registry work either way. Turn it on per environment only after the platform
# signer check runs in enforce mode there (docs/superpowers/plans/2026-10-02-console-teams.md, Rollout 5).
NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED="false"
```

`scripts/visual/README.md`:
- Under _Routes_, add a bullet: `Teams: Settings → Team (owner table with every member state, empty, member view with Leave team, invite, row menu, grant, remove with the webhook review), the team switcher, the pending-invite dialog, Assign on an API key, and the member vehicle states (with access, connect, no access, reconnect, empty). Route option team picks the scenario through X-Team-Id; see the header of routes.mjs.`
- In the Vehicles bullet, after "`/api/data/*` is mocked by `dataApi.mjs`", add: `so the console data proxy (src/app/api/data) never runs here; its tests are in Jest`.

`docs/DESIGN.md`: after the sentence ending "`bg-overlay` menu (`rounded-control border border-outline p-1 shadow-float`).", add:

```markdown
`src/components/RowActionsMenu` is that popover as a component: one 32px `⋯`
button per row, with items in `role="menu"`. Use it for any table whose row has
more than one action (Settings → Team, License → API keys), so the action cell
fits a 390px phone.
```

- [ ] **Step 5: Shoot the branch and review every difference**

Restart the harness on the branch (`npm run visual:dev`; it reads the fixtures at startup). Then:

```bash
npm run visual:shoot -- --label=teams
cd scripts/visual/out && for f in teams/*.png; do b="master/${f#teams/}"; if [ ! -f "$b" ]; then echo "new: ${f#teams/}"; elif ! cmp -s "$f" "$b"; then echo "changed: ${f#teams/}"; fi; done | sort; cd -
```

Expected:
- every shot prints `✓`;
- `new:` lists the routes added in Step 3, in each theme and viewport;
- `changed:` lists only `settings*` (the Team section replaces Team management) and `license-details*` (Belongs to, the `⋯` menu, Sam's signer and Leo's off-chain row). A shot whose only difference is a relative time ("… ago") isn't a change.

Open every `new:` and `changed:` image with the Read tool and check it against `docs/DESIGN.md`:
- token classes only;
- one primary per surface;
- status via `StatusChip`;
- addresses in `font-mono text-code`;
- the `⋯` menu and the Team table fit the `--mobile` shots without horizontal scroll.

Any other `changed:` route is a regression: fix it before committing.

Then run: `npm run visual:check -- src/app/settings src/components/RowActionsMenu src/components/DataAccess src/components/PendingInvite src/components/TeamSwitcher src/app/vehicles "src/app/license/[tokenId]/details/components/Signers"`
Expected: every check prints `✓`.

- [ ] **Step 6: Commit**

```bash
git add scripts/visual README.md docs/DESIGN.md
git commit -m "test(visual): team scenarios, member vehicle states and Assign; document the data-access flag"
```

---

### Task 18: Verification and pull request

**Files:** none new.

- [ ] **Step 1: Full test suite against the baseline**

```bash
npx jest 2>&1 | tee /tmp/console-teams-final.log | grep -E '^(Test Suites|Tests):'
grep -E '^FAIL ' /tmp/console-teams-final.log | awk '{print $2}' | sort -u > /tmp/console-teams-final-failing.txt
comm -13 /tmp/console-teams-baseline-failing.txt /tmp/console-teams-final-failing.txt
```

Expected: `comm` prints nothing: every failing suite was already in Task 1's list. Suites this branch deleted appear only in the baseline, which is fine. If `comm` prints a path, run it alone with `npx jest <path>`, fix it, and commit the fix with its task's prefix.

- [ ] **Step 2: Typecheck, lint, format**

```bash
npx tsc --noEmit -p .
npx eslint . --quiet
npx prettier --check $(git diff --name-only --diff-filter=d origin/master...HEAD -- '*.ts' '*.tsx' '*.mjs' '*.js' '*.css' '*.md' '*.json' ':!docs/superpowers')
```

Expected:
- `tsc` prints nothing;
- ESLint prints nothing;
- Prettier prints `All matched files use Prettier code style!`. It skips `src/gql` through `.prettierignore`, and the pathspec leaves out the specs and plans: never run Prettier on them, since it rewrites the code in their fenced blocks.

If Prettier lists files, run the same command with `--write` in place of `--check`, review the diff, and commit it as `style: prettier`. `npm run lint:format` isn't used here: it rewrites the whole repository.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, with `/settings`, `/vehicles` and `/api/data/telemetry` in the route list. It needs `.env.local` (README, Local Setup).

- [ ] **Step 4: Security spot checks**

```bash
grep -rn "signedChallenge" src | grep -n "console\." || echo "no challenge logging"
grep -n "PROXY_PRIVILEGE_IDS" src/services/subjectJwt.ts
grep -rn "invite_token" src --include='*.ts' --include='*.tsx' | grep -v "INVITE_TOKEN_COOKIE ="
```

Expected:
- `no challenge logging`;
- `PROXY_PRIVILEGE_IDS = [1, 3, 4, 7, 8]` (no 2, `ExecuteCommands`);
- the cookie name appears only in `src/utils/teamCookies.ts`, through the constant.

- [ ] **Step 5: Push and open the PR**

Build the body from the real results, without attribution lines:

```bash
git push -u origin console-teams
JEST=$(npx jest 2>&1 | grep -E '^(Test Suites|Tests):')
cat > /tmp/console-teams-pr.md <<'EOF'
## Console teams (part 3 of 3)

Lets a license owner invite teammates into a console team, switch between teams, record who every license key is for, and — behind `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` — give a member data access through their own wallet. Plan: `docs/superpowers/plans/2026-10-02-console-teams-3-console.md`; contracts: `docs/superpowers/plans/2026-10-02-console-teams.md`.

### What changes
- Team switcher, team-scoped license lists, owner-only pages and actions for members.
- Invites with a "Join {team} owned by {owner}?" confirmation; HttpOnly invite cookie; sign-out clears team state and every developer JWT.
- Settings → Team: members, invites, grant (one batched `enableSigner`), revoke and remove across every key a member ever held, webhook review, leave.
- License → API keys: "Belongs to", Assign, registry writes that never hide a key or roll back RentalOS.
- Members connect with their own wallet; their developer JWTs carry `signer_address` and are stored per wallet.
- Data proxy: owner fast path via Identity, console-api license-access for members, C9 privileges only (never `ExecuteCommands`), one audit line per request after token exchange, bounded caches.

### Rollout
- Needs console-api part 2 deployed first.
- Ships with `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` off: invites, teams and the key registry go live; nobody can grant data access yet.
- The flag goes on per environment after part 1 enforces the signer check there and the team live pass succeeds (index, Rollout 5).

### Tests
@@JEST@@
- `tsc`, ESLint and Prettier (branch files) clean; `npm run build` passes.
- Screenshot harness: master baseline vs branch reviewed; new team, member-vehicle and Assign shots.
EOF
JEST="$JEST" perl -0pi -e 's/\@\@JEST\@\@/$ENV{JEST}/' /tmp/console-teams-pr.md
grep -c '@@' /tmp/console-teams-pr.md
gh pr create --base master --head console-teams --title "Console teams: members, invites, key registry and member data access" --body-file /tmp/console-teams-pr.md
```

Expected: `grep -c '@@'` prints `0`, and `gh` prints the PR URL.

---

### Task 19: Team live pass, then the flag on (index Rollout 5)

Run this per environment: dev (Vercel **Preview**, which uses dev Identity and token exchange and the staging console-api) first, then **Production**. Before starting in an environment:
- console-api part 2 is deployed there;
- this branch is merged and deployed there;
- part 1 runs `SIGNER_CHECK_MODE=enforce` there (index Rollout 2).

The flag is read at build time. Both environments run the steps in order, 1 to 10:
- **Preview:** set `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED=true` for Preview in Vercel and redeploy before Step 1; Step 4 only confirms it.
- **Production:** Steps 1–3 run with the flag off; Step 4 turns it on. If any of Steps 5–9 fails, set it back to `false`, redeploy, and stop.

Production also differs here:
- Identity is `https://identity-api.dimo.zone/query`;
- token exchange is `https://token-exchange-api.dimo.zone/v1/tokens/exchange`.

**Files:** none.

- [ ] **Step 1: Accounts.** You need two accounts you control in that environment:
  - owner **A**, who owns a license **L** with at least one redirect URI;
  - teammate **B**, with a different email address. B may or may not already have a console account.

  Write down L's token ID and client ID.

- [ ] **Step 2: Invite.** As A: Settings → Team → Invite member → B's email.
Expected:
- the toast `Invite sent to <B>`;
- a row with status `Invited`;
- the email arrives with `…/sign-in?invite=…`.

- [ ] **Step 3: Accept.** As B, in a private window: open the link and sign in, or sign up first.
Expected:
- the address bar loses `invite=`;
- after sign-in the dialog reads `Join <A's team> owned by <A's email>?`;
- Join team lands on Home in A's team, and the sidebar switcher lists both teams.

- [ ] **Step 4: The flag.**
- **Preview:** confirm a member sees Vehicles in the sidebar; the flag was set before Step 1.
- **Production:** in Vercel → Project → Settings → Environment Variables, set `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` = `true` for Production, and redeploy the latest production deployment.

Expected: as B, Vehicles is in the sidebar; as A, Settings → Team shows the Data access column.

- [ ] **Step 5: Grant.** As A, reload Settings.
Expected: B's row is `Active`, and the banner reads `<B> joined. Grant data access?`.

Then: Grant → tick L → read the warning (C8, with the DCX sentence) → Grant data access → approve.
Expected:
- the toast `<B> now has data access to <L>.`;
- B's Data access cell shows L;
- this lists B's wallet:

```bash
curl -s https://identity-api.dev.dimo.zone/query -H 'Content-Type: application/json' \
  -d '{"query":"{ developerLicense(by: { tokenId: <L token ID> }) { signers(first: 100) { nodes { address } } } }"}'
```

- [ ] **Step 6: Use.** As B: Vehicles → L → open a vehicle → Connect with your wallet.
Expected:
- the summary tab loads;
- DevTools shows `/api/data/telemetry` with 200;
- in Vercel's function logs, the request has a `{"event":"data_proxy",…,"access":"MEMBER","outcome":"ok"}` line with B's email.

Copy the vehicle's DID from the page header (Copy DID) for Step 8.

- [ ] **Step 7: A webhook to review.**
- As B, copy the developer JWT from DevTools → Application → Local Storage, key `devJwt_<L client ID>_<B wallet, lowercase>_list_v1`.
- On https://webhook.site, open a URL and set its response body to `team-live-pass` (Edit → Response body). vehicle-triggers-api verifies a target by expecting the verification token back.
- `EVENTS` is the environment's `NEXT_PUBLIC_EVENTS_API_URL` (Vercel → Environment Variables).

```bash
curl -s -X POST "$EVENTS/v1/webhooks" \
  -H "Authorization: Bearer <B's developer JWT>" -H 'Content-Type: application/json' \
  -d '{"service":"signals","metricName":"vss.speed","condition":"valueNumber > 200","coolDownPeriod":60,"description":"team live pass","displayName":"team live pass","targetURL":"<webhook.site URL>","verificationToken":"team-live-pass","status":"enabled"}'
```

Expected: a webhook object whose `createdBySigner` is B's wallet (checksummed). C3 sets it on create.

- [ ] **Step 8: Remove, and the one-minute cut-off.** As A: B's row → ⋯ → Remove.
Expected: the dialog lists `team live pass` under Webhooks to review, marked `Created by them`.

Confirm and approve the transaction, and note the time. From B's window, reload the vehicle.
Expected: within a minute, `You're no longer a member of <A's team>.`, and the console returns to B's own team.

With B's old developer JWT:

```bash
curl -s -X POST https://token-exchange-api.dev.dimo.zone/v1/tokens/exchange \
  -H "Authorization: Bearer <B's developer JWT>" -H 'Content-Type: application/json' \
  -d '{"asset":"<vehicle DID from Step 6>","permissions":["privilege:GetNonLocationHistory"]}'
```

Expected: HTTP 403 with `signer no longer authorized for this license`, within 60 seconds of the transaction confirming (C2). Then delete `team live pass` as A on the Webhooks page.

- [ ] **Step 9: Leave.** B was removed in Step 8, so invite B again (Step 2), accept (Step 3) and grant L (Step 5). Then as B: Settings → Leave team.
Expected:
- the confirmation reads `Leave <A's team>? <A's email> will be asked to revoke your data access.`;
- after confirming, the toast `You left <A's team>.`;
- A's table shows B as `Left`, with `Still a signer on <L>`. Revoke it: ⋯ → Revoke → approve.

The owner fallback when console-api can't list teams (Review Focus 1) is covered by Task 4's tests and the `licenses-teams-unavailable` shot. It isn't rehearsed against a live environment.

- [ ] **Step 10: Record the result.** Note the date and the environment in the rollout notes. In Preview, continue with Production. In Production, the flag stays on, and Task 20 can start.

---

### Task 20: DIMO's own rollout (index Rollout 6)

Run this after Task 19 has turned the flag on in production.

**Files:** none.

- [ ] **Step 1: Confirm license #286 on Identity**

```bash
curl -s https://identity-api.dimo.zone/query -H 'Content-Type: application/json' \
  -d '{"query":"{ developerLicense(by: { tokenId: 286 }) { owner clientId alias signers(first: 100) { nodes { address } } redirectURIs(first: 10) { nodes { uri } } } }"}' | jq
```

Expected:
- `owner` is `0xb3562cC733b04c27D267Ab7B053F34E7957E2587` (any case);
- `signers` include `0x955029AC2539f4D57A1D7E6Ef2b97617e95Eb1D4`, `0xC7c9853C2b217859E09B74DD21722D3917C14590` and `0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5`;
- `redirectURIs` has at least one entry. Grant needs one; if there is none, add it on the license page first.

- [ ] **Step 2: Find the console login that owns #286**

With read access to console-api's production database:

```sql
SELECT id, email, name, address, created_at
FROM users
WHERE lower(address) = lower('0xb3562cC733b04c27D267Ab7B053F34E7957E2587');
```

Expected: one row. Its `email` is the login to use. If there are no rows, the account was never a console login; stop and decide with the license holder how to bring it in. Teams need the owner to sign in.

- [ ] **Step 3: Sign in as that login and check the team**

Settings → Team.
Expected: the Team section loads, with Invite member.
- If inviting answers `Finish setting up your team first` (`NOT_A_MEMBER`), complete the company step (sign-up's company information) and retry.
- The sidebar shows no switcher unless that login is already in another team.

- [ ] **Step 4: Assign #286's three keys**

`/license/286/details` → API keys. For each of the three addresses from Step 1: ⋯ → Assign.
- Under _Other people_, enter the people or service that use the key. Ask in #engineering whoever deployed it.
- Add a note saying what it's for, for example `Mobile app backend`.
- Save.

Expected: each row's Belongs to shows the holders and the note, and Mixpanel records three `API Key Assigned` events. Check the result:

```sql
SELECT s.signer_address, s.kind, s.note, h.name, h.user_id
FROM license_signers s LEFT JOIN license_signer_holders h ON h.signer_id = s.id
WHERE s.license_token_id = 286 AND s.disabled_at IS NULL;
```

Expected: three `API_KEY` or `EXTERNAL` rows with their holders. Table names are from part 2's `init-db_12.sql`.

- [ ] **Step 5: Invite the mobile support team**

Settings → Team → Invite member, once per support teammate's email (from the support lead).
Expected: one `Invited` row each; the invite emails arrive.

- [ ] **Step 6: Each teammate accepts**

Each teammate opens the link, signs in (or signs up), and confirms `Join <team> owned by <owner email>?`.
Expected: their row turns `Active`, and after their first sign-in the banner `<name> joined. Grant data access?` appears.

- [ ] **Step 7: Grant #286**

For each teammate: Grant → tick #286 → read the warning → Grant data access → approve.

For #286, data access also means tesla-oracle's telemetry controls for every DIMO Tesla (spec, Risks 1), so grant only the people who troubleshoot.
Expected: `<name> now has data access to <#286's alias>.`, and the Data access cell shows #286.

- [ ] **Step 8: Support verifies**

Each teammate: Vehicles → #286 → a vehicle they are troubleshooting → Connect with your wallet.
Expected: the vehicle page loads, and Vercel logs show `"access":"MEMBER","outcome":"ok"` for their email.

Tell the support lead how removal works: Settings → Team → Remove, which cuts access within about a minute.
