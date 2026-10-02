# Console teams: plan index and cross-repo contracts

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md`

The spec spans seven repositories. It's split into three plans, each producing working, testable software on its own. Execute each plan with superpowers:subagent-driven-development or superpowers:executing-plans. **This file is the contract between them.** A name, payload or message that appears here must be used exactly as written. If a plan needs to change one, change it here first, then in every plan that uses it.

| Part | Plan                                                  | Repositories                                                                          | Branch                                                              | Ships                                                                                             |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | `2026-10-02-console-teams-1-platform-signer-check.md` | `dex`, `token-exchange-api`, `vehicle-triggers-api`, `tesla-oracle`, `credit-tracker` | `feat/signer-address-claim` (dex), `feat/signer-check` (the others) | Independently, in the order in _Rollout_.                                                         |
| 2    | `2026-10-02-console-teams-2-console-api.md`           | `dimo-developer-console-api`                                                          | `feat/teams` (from `master` after #80 merges)                       | Before part 3. Backward compatible with today's console.                                          |
| 3    | `2026-10-02-console-teams-3-console.md`               | `dimo-developer-console`                                                              | `console-teams`                                                     | After part 2. Granting data access stays behind a flag until part 1 enforces in that environment. |

All repositories are checked out under `~/workspace/<repo>`.

## Rollout

1. **console-api #80 merges and deploys.** Afterwards, check console-api's request logs for `GET /api/my/connections` from accounts with no company, and decide whether connection keys need rotating (see #80's description).
2. **Part 1, platform:**
   1. Pin every dex deployment to version tags first: dev, prod, roles-rights dev and roles-rights prod. Before merging, tag the current dex `master` as `v2.30.100` (DIMO has never cut its own dex tag, and upstream already uses `v2.30.3` and later) and pin to it with `pullPolicy: IfNotPresent`. Today all four run `dimozone/dex:latest` with `pullPolicy: Always`, so a merge would reach production on the next pod restart.
   2. Merge dex, tag `v2.30.101`, and pin dev to it. The roles-rights deployments stay on `v2.30.100`: they don't run the web3 code flow.
   3. Deploy token-exchange-api, then vehicle-triggers-api, tesla-oracle and credit-tracker, all with `SIGNER_CHECK_MODE=log` (C10).
   4. Run part 1's dev live pass.
   5. Bump the production dex tag. Run production in `log` mode for a week, watching `signer_check_total{result="denied"}` for anything unexpected, then switch to `enforce`.
3. **Part 2, console-api teams.** Run migration `init-db_12.sql` (with its down script ready) before deploying.
4. **Part 3, the console**, with `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` off. Invites, teams and the key registry go live.
5. **Turn the flag on per environment** once part 1 is in `enforce` mode there and part 3's team live pass succeeds there.
6. **DIMO's own rollout (part 3, final task):**
   - find the console login whose `users.address` is `0xb3562cC733b04c27D267Ab7B053F34E7957E2587`, the owner of license #286 (a ZeroDev Kernel v3.1 account);
   - assign #286's three existing keys in the registry;
   - invite the support team and grant them data access.
7. **Retire the legacy team routes** (part 2, final task), once the console no longer calls them.
8. **Announce the behavior change to developers:**
   - disabling an API key now cuts off its tokens within about a minute;
   - token exchange, the webhooks API, tesla-oracle and credit-tracker can answer `403 signer no longer authorized for this license` or `503 could not verify signer`.

## Contracts

### C1. Developer JWT signer claim (part 1 produces; parts 1 and 3 consume)

- **Claim name:** `signer_address`.
- **Value:** the EIP-55 checksummed address (`common.Address.Hex()`) of the EOA that signed the web3 challenge.
- **When dex emits it:** on tokens issued after a successful ERC-1271 verification in the web3 connector whose signature is a plain 65-byte ECDSA signature, whatever the client ID.
  - That covers every developer-license login. Other 65-byte ERC-1271 wallets get a claim that means nothing, which is why C2 checks only licenses.
  - EOA logins never get it. ZeroDev Kernel v3.1 logins (the console's) don't either, because their signatures are longer than 65 bytes.
  - Only the authorization-code flow sets it. Production allows no other response type; enabling implicit or hybrid flows would need the same plumbing.
- **Where it appears:** both the `access_token` (the developer JWT returned by `/auth/web3/submit_challenge`) and the ID token. It isn't gated by scope.
- **Consumers:**
  - compare it case-insensitively;
  - never trust it without the JWT signature check they already do.
- **A missing claim:**
  - **Platform consumers** treat it as "minted before the claim existed" and allow it.
  - **The console data proxy** (part 3) refuses a member's developer JWT without it.

### C2. Signer authorization check (part 1)

- **When to check:** whenever a token carries `signer_address` and its `ethereum_address` claim is a developer license (Identity `developerLicense(by: { clientId })` exists). This applies **whatever the `aud`**, including tokens issued to the mobile app's `dimo-driver` client, because token exchange grants on `ethereum_address`.
  - A token whose `ethereum_address` isn't a license isn't checked.
- **Call:** `isSigner(address signer) returns (bool)` on the license account contract at `ethereum_address`. Every license account is a clone of one beacon-proxy template that has had `isSigner(address)` since 2024.
- **Cache:** 60 seconds per `(license, signer)`, positive and negative answers alike, bounded at 10,000 entries. Errors are never cached. Concurrent misses for the same key share one call.
- **Timeouts:** 3 seconds for the chain call, 5 seconds for a gRPC `SignerCheck` call.
- **On `false`:** HTTP 403 with the exact message `signer no longer authorized for this license`.
- **On an error or timeout:** HTTP 503 with `could not verify signer`. Never fail open in `enforce` mode.
- **Services:**
  - **token-exchange-api** calls the chain. It also serves gRPC `SignerCheck(SignerCheckRequest{license, signer}) → SignerCheckResponse{is_signer}` from the same cache. That call returns `InvalidArgument` for non-hex input and `Unavailable` (`could not verify signer`) on chain errors.
  - **vehicle-triggers-api** checks every authenticated request.
  - **tesla-oracle** checks its `/v1/telemetry/*` routes.
  - **credit-tracker** checks its license routes.
  - These three call token-exchange-api's `SignerCheck` and map any gRPC error to the 503.
  - `SignerCheck` answers `is_signer: true` when `license` isn't a developer license, because non-licenses aren't checked.
- **Release order:** token-exchange-api with `SignerCheck` reaches an environment before any service that calls it.

### C3. Webhook creator and modifier fields (part 1 produces; part 3 consumes)

- **vehicle-triggers-api columns** (nullable text, lowercase hex):
  - `created_by_signer`, set on create;
  - `updated_by_signer`, set whenever a request changes the target URL, the subscribed vehicles or the condition.
- **JSON fields** `createdBySigner` and `updatedBySigner` (`string`, checksummed, omitted when null), on every `WebhookView` returned by `GET /v1/webhooks`, the only endpoint that returns webhook objects. `GET /v1/webhooks/:webhookId` returns the webhook's vehicles, not the webhook.
- **Consumers:** compare both to every address a member was granted, case-insensitively. A webhook the member created **or** last changed goes into the removal review.

### C4. Request headers, cookies and tokens (part 2 consumes; part 3 produces)

- **Header `X-Team-Id`:** sent by the console on every console-api request made while a team is active. Absent means the caller's personal team.
- **Cookie `active_team`:** holds the active team's ID in the console. Path `/`, `SameSite=Lax`, `Secure` in production, 1 year, readable by server actions.
- **Cookie `invite_token`:** holds a pending invite token.
  - It's set only by `/sign-in?invite=<token>`, and the console then strips `invite` from the URL.
  - Path `/`, `SameSite=Lax`, `Secure` in production, `HttpOnly`, 1 day.
  - It's deleted after acceptance succeeds, or on a terminal error (`INVITE_INVALID`, `INVITE_EXPIRED`, `INVITE_EMAIL_MISMATCH`, `ALREADY_MEMBER`). A network failure keeps it.
- **Sign-out** deletes `active_team`, `invite_token` and every stored developer JWT.
- **Token audience:** console-api accepts team, invite, signer, registry and license-access requests only from tokens whose `aud` includes `developer-platform`, the client ID of every console login. Anything else gets `401 UNAUTHORIZED`.

### C5. Feature flag (part 3)

- **Name:** `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED`, true only when the value is the string `"true"`.
- **When off:**
  - **Grant** and the Team page's **Data access** column are hidden.
  - Members don't see Vehicles in the sidebar. Opening it directly shows the C8 "not available yet" copy.
  - Invites, membership, leaving, the team switcher and the key registry stay on.

### C6. Signer proof message (part 3 signs; part 2 verifies)

Exact text, with `\n` line breaks and no trailing newline:

```
DIMO Developer Console
Link signer ${eoa} to account ${kernelAddress}
Issued at ${issuedAt}
```

- `eoa`: the user's Turnkey wallet, checksummed.
- `kernelAddress`: their smart account, checksummed, equal to their console-api `users.address`.
- `issuedAt`: `new Date().toISOString()`.
- Signed with EIP-191 `personal_sign` by the EOA (viem `account.signMessage({ message })`).

console-api accepts it when:

- the signature recovers to `address`;
- `address` equals the `eoa` in the message;
- `kernelAddress` equals the caller's `users.address` (case-insensitive);
- `issuedAt` is no more than 10 minutes old and no more than 1 minute in the future;
- `address` isn't another user's `signer_address`, and isn't an `API_KEY` or `EXTERNAL` key in the registry (`409 SIGNER_IN_USE`);
- the caller holds no enabled `MEMBER` key under a **different** address (`409 SIGNER_LOCKED`). An owner must revoke those first.

`users.signer_address` is unique (lowercase).

### C7. console-api endpoints (part 2 produces; part 3 consumes)

All bodies are JSON. Errors are `{ "message": string, "code"?: string }`. `ts` types are the wire shapes. Dates are ISO strings with a time zone, and addresses are checksummed `0x…` strings. New timestamp columns are `TIMESTAMPTZ`.

```ts
type TeamRole = 'OWNER' | 'MEMBER';
type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'LEFT';

interface TeamSummary {
  id: string;
  name: string;
  companyName: string | null;
  role: TeamRole; // OWNER exactly when the caller created this team (teams.created_by)
  ownerUserId: string;
  ownerEmail: string;
  ownerAddress: `0x${string}`; // team owner's kernel account = owner of the team's licenses
  isPersonal: boolean; // true when the caller is this team's owner
}

interface MemberKey {
  licenseTokenId: number;
  signerAddress: `0x${string}`;
}

interface TeamMember {
  id: string; // team_collaborators.id
  userId: string | null; // null while PENDING
  name: string | null;
  email: string;
  role: TeamRole; // OWNER only for the team's creator
  status: MembershipStatus;
  signerAddress: `0x${string}` | null; // users.signer_address once verified
  memberKeys: MemberKey[]; // every enabled MEMBER registry key held by this user in this team, whatever their current signerAddress
  invitedAt: string;
  inviteExpiresAt: string | null; // PENDING only
}

type SignerKind = 'MEMBER' | 'API_KEY' | 'EXTERNAL';

interface LicenseSignerHolder {
  userId: string | null;
  name: string | null; // free-text name, or the member's name
  email: string | null; // member holders only
}

interface LicenseSignerRecord {
  signerAddress: `0x${string}`;
  kind: SignerKind;
  note: string | null;
  holders: LicenseSignerHolder[];
  createdAt: string;
  createdBy: string | null; // user ID
  disabledAt: string | null;
  disabledBy: string | null;
}

type HolderInput = { userId: string } | { name: string };
```

| Method and path                                            | Caller                             | Request                                                               | Success                                                                                                                                                      | Errors                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/my/teams`                                        | any user                           | —                                                                     | `200 { teams: TeamSummary[] }`, personal team first                                                                                                          | —                                                                                                                                                                                                                                                                                                             |
| `GET /api/my/team/members`                                 | member or owner of the active team | —                                                                     | `200 { members: TeamMember[] }`, ordered: owner, accepted members, pending invites, then `REVOKED` and `LEFT` members who still hold an enabled `MEMBER` key | `403 NOT_A_MEMBER`                                                                                                                                                                                                                                                                                            |
| `POST /api/my/team/invitations`                            | owner                              | `{ email: string }`                                                   | `201 { member: TeamMember }`. An email whose pending invite expired gets `201` with a fresh link and the same member ID.                                     | `400 INVALID_EMAIL`, `409 ALREADY_MEMBER`, `409 ALREADY_INVITED` (also for concurrent duplicates), `403 OWNER_ONLY`, `403 NOT_A_MEMBER` (`Finish setting up your team first`), `429 RATE_LIMITED`, `502 EMAIL_FAILED` (the row is revoked so the invite can be retried)                                       |
| `POST /api/my/team/invitations/:id/resend`                 | owner                              | —                                                                     | `200 { member: TeamMember }`                                                                                                                                 | `404 NOT_FOUND`, `403 OWNER_ONLY`, `429 RATE_LIMITED`, `502 EMAIL_FAILED` (the row keeps its new token)                                                                                                                                                                                                       |
| `DELETE /api/my/team/invitations/:id`                      | owner                              | —                                                                     | `204`                                                                                                                                                        | `404 NOT_FOUND`, `403 OWNER_ONLY`                                                                                                                                                                                                                                                                             |
| `POST /api/invitations/preview`                            | signed-in invitee                  | `{ token: string }`                                                   | `200 { teamName: string, ownerEmail: string, expiresAt: string }`, so the console can ask "Join {teamName} owned by {ownerEmail}?"                           | `400 INVITE_INVALID`, `400 INVITE_EXPIRED`, `403 INVITE_EMAIL_MISMATCH`, `409 ALREADY_MEMBER`                                                                                                                                                                                                                 |
| `POST /api/invitations/accept`                             | signed-in invitee                  | `{ token: string }`                                                   | `200 { team: TeamSummary }`. The membership is always `MEMBER`.                                                                                              | `400 INVITE_INVALID`, `400 INVITE_EXPIRED`, `403 INVITE_EMAIL_MISMATCH`, `409 ALREADY_MEMBER`                                                                                                                                                                                                                 |
| `DELETE /api/my/team/members/:id`                          | owner                              | —                                                                     | `204` (status `REVOKED`)                                                                                                                                     | `404 NOT_FOUND`, `400 CANNOT_REMOVE_OWNER`, `403 OWNER_ONLY`                                                                                                                                                                                                                                                  |
| `POST /api/my/team/leave`                                  | member of the active team          | —                                                                     | `204` (status `LEFT`)                                                                                                                                        | `400 CANNOT_LEAVE_OWN_TEAM`, `403 NOT_A_MEMBER`                                                                                                                                                                                                                                                               |
| `PUT /api/me/signer`                                       | any user                           | `{ address, message, signature }` (C6)                                | `200 { signerAddress, signerVerifiedAt }`                                                                                                                    | `400 SIGNER_PROOF_INVALID`, `409 SIGNER_IN_USE`, `409 SIGNER_LOCKED`                                                                                                                                                                                                                                          |
| `GET /api/my/licenses/:tokenId/signers`                    | member or owner of the active team | —                                                                     | `200 { signers: LicenseSignerRecord[] }`                                                                                                                     | `403 LICENSE_NOT_IN_TEAM`, `502 IDENTITY_UNAVAILABLE`                                                                                                                                                                                                                                                         |
| `PUT /api/my/licenses/:tokenId/signers/:address`           | owner                              | `{ kind: SignerKind, note?: string \| null, holders: HolderInput[] }` | `200 { signer: LicenseSignerRecord }`. Clears `disabledAt`, so call it after `enableSigner`.                                                                 | `400 INVALID_HOLDERS`, `400 INVALID_ADDRESS`, `400 SIGNER_MISMATCH` (a `MEMBER` key whose address isn't its one holder's verified `signerAddress`), `409 KIND_CONFLICT` (turning an `API_KEY` or `EXTERNAL` key into a `MEMBER` key), `403 LICENSE_NOT_IN_TEAM`, `403 OWNER_ONLY`, `502 IDENTITY_UNAVAILABLE` |
| `POST /api/my/licenses/:tokenId/signers/:address/disabled` | owner                              | —                                                                     | `200 { signer: LicenseSignerRecord }`                                                                                                                        | `404 NOT_FOUND`, `400 INVALID_ADDRESS`, `403 LICENSE_NOT_IN_TEAM`, `403 OWNER_ONLY`, `502 IDENTITY_UNAVAILABLE`                                                                                                                                                                                               |
| `GET /api/my/license-access?clientId=0x…`                  | any user (ignores `X-Team-Id`)     | —                                                                     | `200 { access: 'OWNER' \| 'MEMBER' \| 'NONE', memberOfTeam: boolean, teamId: string \| null, signerAddress: \`0x${string}\` \| null, userEmail: string }`    | `400 INVALID_CLIENT_ID`, `502 IDENTITY_UNAVAILABLE`                                                                                                                                                                                                                                                           |

**license-access semantics:**

- `OWNER`: the caller's wallet owns the license.
- `MEMBER`: the caller is an accepted member of the team whose owner owns the license, and holds an enabled (`disabledAt` null) `MEMBER` registry key on that license whose address equals their current `signerAddress`.
- `NONE` otherwise. `memberOfTeam` tells the console whether to show "ask for access" (member without a key) or "no longer have access".
  - For a caller who isn't a member of the license's team, `NONE` comes with `teamId: null` and `signerAddress: null`.
  - A member without a usable key gets `NONE` with `memberOfTeam: true`, their team's `teamId` and their `signerAddress`.

**Identity errors:** a GraphQL error answered with HTTP 200 counts as unavailable (`502 IDENTITY_UNAVAILABLE`) unless it says the license doesn't exist.

**Every route,** `GET /api/me` included, answers `401 UNAUTHORIZED` (`{ message: 'User not found', code: 'UNAUTHORIZED' }`) when the token maps to no console user, or fails C4's audience rule on the routes it covers. The one exception is `PUT /api/me/complete`, the sign-up path: it keeps its `404` for "no account yet".

**`GET /api/my/teams`** leaves out teams whose owner has no wallet address. Today that's only legacy data, because `TeamSummary.ownerAddress` is non-null.

**Routes that ignore `X-Team-Id`:** `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me`. They never answer 403 for a stale header, so the console can always recover from a team the user has left.

**`GET /api/me`:**

- returns the caller's own user, personal team and company, as today;
- a user with no personal team (a legacy collaborator who never created a company) gets their oldest accepted membership's team and company instead, so they keep working through the deploy.

**Team context and authorization:**

- **Owner** means the team's creator (`teams.created_by`) and nothing else. Membership rows with `role = OWNER` for anyone else are demoted by the migration and never trusted.
- **Every other `/api/my/*` route** resolves the active team from `X-Team-Id`. It answers `403 NOT_A_MEMBER` when the caller has no accepted, non-deleted membership in it.
- **Owner-only writes:** every non-GET handler under `/api/my/apps*`, `/api/my/configurations*`, `/api/my/connections*`, `/api/my/redirect-uris*`, `/api/my/signers*`, `/api/my/simulated-vehicles*` and `/api/my/workspace*` answers `403 OWNER_ONLY` for members.
- **Secrets are owner-only:**
  - members' reads of connections return `connection_license_private_key` and `device_issuance_key` as `null`;
  - members' reads of apps return signers without `api_key`.
- **Lists never fall back to "all companies":** an empty company ID returns an empty page. #80 already guards apps and connections; part 2 also fixes `transformObject` so it accumulates every filter key.
- **`POST /api/my/support/email`** stays open to members.

**Invites:**

- **Email link:** `${frontendUrl}sign-in?invite=${token}`, where `token` is 32 random bytes as base64url. Only `sha256(token)` (hex) is stored.
- **Escaping:** the inviter's name and the team name are HTML-escaped and capped at 60 characters in the email.
- **Limits:**
  - 10 invite or resend emails per team per hour;
  - 30 per inviting user per day;
  - 50 pending invites per team;
  - one resend per invite per 60 seconds.
  - Any of these answers `429 RATE_LIMITED`, with these messages:
    - `This team has sent 10 invitations in the last hour. Try again later.`
    - `You have sent 30 invitations today. Try again tomorrow.`
    - `This team has 50 pending invitations. Cancel some before inviting more.`
    - `This invitation was sent less than a minute ago.`
  - The console shows the message as given.

**Retired by part 2's final task, once part 3 has shipped:**

- `GET /api/my/team`
- `GET /api/my/team/collaborator`
- `DELETE /api/my/team/collaborator/:id`
- `POST /api/my/team/invitation`
- the `invitation_code` query on `GET /api/me`

### C8. Copy shared across parts

| Where                                                        | Text                                                                                                                                                                                                      |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grant dialog warning                                         | `Data access lets {name} use every permission vehicles have granted {license}, including commands, through the DIMO APIs — not only what the console shows. Their queries spend {license}'s DCX credits.` |
| Member without access, in Vehicles                           | `Ask {ownerEmail} for data access to {license}.`                                                                                                                                                          |
| Console proxy refusing a removed member                      | `You no longer have access to this license.`                                                                                                                                                              |
| Flag off, member opens Vehicles                              | `Data access for team members isn't available yet.`                                                                                                                                                       |
| Member left or was removed mid-session                       | `You're no longer a member of {team name}.`                                                                                                                                                               |
| Re-registering a wallet while holding keys (`SIGNER_LOCKED`) | `Your access is tied to another wallet. Ask {ownerEmail} to revoke it first.`                                                                                                                             |
| Member leaves                                                | Confirm: `Leave {team name}? {ownerEmail} will be asked to revoke your data access.`                                                                                                                      |

### C9. Data proxy privileges (part 3)

- The console data proxy requests, for every vehicle token, only the privileges Vehicles reads: `GetNonLocationHistory`, `GetCurrentLocation`, `GetLocationHistory`, `GetRawData`, `GetApproximateLocation`, and only those the license actually holds.
- It never requests `ExecuteCommands`.
- Part 3 confirms the exact list against what Vehicles calls. It may only shrink the list.

### C10. Platform operations (part 1)

- **Shared code:** services implement C2 and C10 with `token-exchange-api/pkg/signercheck` (middleware, gRPC client, mode, metric and cutoff).
- **Setting `SIGNER_CHECK_MODE`:** `enforce` | `log` | `off`. The default is `enforce`, and the rollout sets `log` first.
  - In `log` mode the check runs and is logged and counted, but never refuses.
  - In `off` mode it doesn't run.
- **Setting `SIGNER_CLAIM_REQUIRED_AFTER`** (optional Unix time, unset by default): when set, a license token issued after it (`iat`) without `signer_address` answers 403 `signer no longer authorized for this license`. This catches a future dex path that forgets the claim. Set it 14 days after the dex release.
- **Metric:** `signer_check_total{service, result}`, with `result` one of `allowed`, `denied`, `error`, `skipped`.
- **Alert:** when `error` exceeds 1% of checks over 5 minutes.
- **Rollback order:**
  - Turn the console flag off before any dex rollback.
  - Roll back the gRPC callers (vehicle-triggers-api, tesla-oracle, credit-tracker), then token-exchange-api, then dex.
  - Leave migrations in place; the new columns are nullable.
