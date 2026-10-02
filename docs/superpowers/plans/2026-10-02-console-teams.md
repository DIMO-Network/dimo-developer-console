# Console teams: plan index and cross-repo contracts

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md`

The spec spans five repositories. It's split into three plans, each producing working, testable software on its own. Execute each plan with superpowers:subagent-driven-development or superpowers:executing-plans. **This file is the contract between them.** A name, payload or message that appears here must be used exactly as written. If a plan needs to change one, change it here first, then in every plan that uses it.

| Part | Plan                                                  | Repositories                                        | Branch                                                                 | Ships                                                                        |
| ---- | ----------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | `2026-10-02-console-teams-1-platform-signer-check.md` | `dex`, `token-exchange-api`, `vehicle-triggers-api` | `feat/signer-address-claim` (dex), `feat/signer-check` (the other two) | Independently. Deploy dex first.                                             |
| 2    | `2026-10-02-console-teams-2-console-api.md`           | `dimo-developer-console-api`                        | `feat/teams` (from `master` after #80 merges)                          | Before part 3. Backward compatible with today's console.                     |
| 3    | `2026-10-02-console-teams-3-console.md`               | `dimo-developer-console`                            | `console-teams`                                                        | After part 2. Granting data access stays behind a flag until part 1 is live. |

**Order:** console-api #80 merges → part 2 → part 3 with the flag off → part 1 lands in an environment and its live pass succeeds → flag on in that environment. Part 1 can be built at any time.

All repositories are checked out under `~/workspace/<repo>`.

## Contracts

### C1. Developer JWT signer claim (part 1 produces; parts 1 and 3 consume)

- **Claim name:** `signer_address`.
- **Value:** the EIP-55 checksummed address (`common.Address.Hex()`) of the EOA that signed the web3 challenge.
- **When dex emits it:** only on tokens issued after a successful ERC-1271 verification in the web3 connector whose signature is a plain 65-byte ECDSA signature, which is the developer-license path. EOA logins never get it. Smart-account (kernel) logins don't either, because their signatures aren't 65 bytes.
- **Where it appears:** both the `access_token` (the developer JWT returned by `/auth/web3/submit_challenge`) and the ID token. It isn't gated by scope.
- **Consumers:**
  - compare it case-insensitively;
  - never trust it without the JWT signature check they already do.
- **A missing claim:**
  - **Platform consumers** (token-exchange-api, vehicle-triggers-api) treat it as "minted before the claim existed" and allow it.
  - **The console data proxy** (part 3) refuses a member's developer JWT without it. Member JWTs always carry it, because Turnkey EOA signatures are 65 bytes.

### C2. Signer authorization check (part 1)

- **Call:** `isSigner(address signer) returns (bool)` on the license account contract at the token's client ID, which is the `ethereum_address` claim and the address in the decoded `sub`.
- **Cache:** 60 seconds per `(clientID, signer)`, positive and negative answers alike.
- **On `false`:** HTTP 403 with the exact message `signer no longer authorized for this license`.
- **On an RPC error:** HTTP 503 with `could not verify signer`. Never fail open.
- **vehicle-triggers-api** doesn't call the chain. It calls token-exchange-api's new gRPC `SignerCheck(SignerCheckRequest{license, signer}) → SignerCheckResponse{is_signer}`, which shares token-exchange's 60-second cache.
  - The gRPC call returns `InvalidArgument` for non-hex input and `Unavailable` (`could not verify signer`) on chain errors.
  - vehicle-triggers-api maps any gRPC error to the 503.
  - Release order: token-exchange-api with `SignerCheck` reaches an environment before vehicle-triggers-api does.

### C3. Webhook creator field (part 1 produces; part 3 consumes)

- **vehicle-triggers-api:**
  - column `created_by_signer` (nullable text, lowercase hex);
  - JSON field `createdBySigner` (`string`, checksummed, omitted when null) on every `WebhookView` returned by `GET /v1/webhooks`, the only endpoint that returns webhook objects. `GET /v1/webhooks/:webhookId` returns the webhook's vehicles, not the webhook.
  - Consumers compare it to a member's `signerAddress` case-insensitively.

### C4. Request headers and cookies (part 2 consumes; part 3 produces)

- **Header `X-Team-Id`:** sent by the console on every console-api request made while a team is active. Absent means the caller's personal (`OWNER`) team.
- **Cookie `active_team`:** holds the active team's ID in the console. Path `/`, `SameSite=Lax`, 1 year, readable by server actions.
- **Cookie `invite_token`:** holds a pending invite token between `/sign-in?invite=<token>` and acceptance. Path `/`, `SameSite=Lax`, 1 day, deleted after acceptance.

### C5. Feature flag (part 3)

- **Name:** `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED`, true only when the value is the string `"true"`.
- **When off:** **Grant** is hidden and members can't use Vehicles. Invites, membership, the team switcher and the key registry stay on.

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
- `issuedAt` is no more than 10 minutes old and no more than 1 minute in the future.

### C7. console-api endpoints (part 2 produces; part 3 consumes)

All bodies are JSON. Errors are `{ "message": string, "code"?: string }`. `ts` types are the wire shapes. Dates are ISO strings and addresses are checksummed `0x…` strings.

```ts
type TeamRole = 'OWNER' | 'MEMBER';
type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

interface TeamSummary {
  id: string;
  name: string;
  companyName: string | null;
  role: TeamRole; // the caller's role in this team
  ownerUserId: string;
  ownerEmail: string;
  ownerAddress: `0x${string}`; // team owner's kernel account = owner of the team's licenses
  isPersonal: boolean; // true when the caller is this team's owner
}

interface TeamMember {
  id: string; // team_collaborators.id
  userId: string | null; // null while PENDING
  name: string | null;
  email: string;
  role: TeamRole;
  status: MembershipStatus;
  signerAddress: `0x${string}` | null; // users.signer_address once verified
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

| Method and path                                            | Caller                             | Request                                                               | Success                                                                                                                                 | Errors                                                                                                                                                   |
| ---------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/my/teams`                                        | any user                           | —                                                                     | `200 { teams: TeamSummary[] }`, personal team first                                                                                     | —                                                                                                                                                        |
| `GET /api/my/team/members`                                 | member or owner of the active team | —                                                                     | `200 { members: TeamMember[] }`: accepted and pending rows, plus revoked members who still hold an enabled `MEMBER` key in the registry | `403 NOT_A_MEMBER`                                                                                                                                       |
| `POST /api/my/team/invitations`                            | owner                              | `{ email: string }`                                                   | `201 { member: TeamMember }`. An email whose pending invite expired gets `201` with a fresh link and the same member ID.                | `400 INVALID_EMAIL`, `409 ALREADY_MEMBER`, `409 ALREADY_INVITED`, `403 OWNER_ONLY`, `502 EMAIL_FAILED` (the row is revoked so the invite can be retried) |
| `POST /api/my/team/invitations/:id/resend`                 | owner                              | —                                                                     | `200 { member: TeamMember }`                                                                                                            | `404 NOT_FOUND`, `403 OWNER_ONLY`, `502 EMAIL_FAILED` (the row keeps its new token)                                                                      |
| `DELETE /api/my/team/invitations/:id`                      | owner                              | —                                                                     | `204`                                                                                                                                   | `404 NOT_FOUND`, `403 OWNER_ONLY`                                                                                                                        |
| `POST /api/invitations/accept`                             | signed-in invitee                  | `{ token: string }`                                                   | `200 { team: TeamSummary }`                                                                                                             | `400 INVITE_INVALID`, `400 INVITE_EXPIRED`, `403 INVITE_EMAIL_MISMATCH`, `409 ALREADY_MEMBER`                                                            |
| `DELETE /api/my/team/members/:id`                          | owner                              | —                                                                     | `204`                                                                                                                                   | `404 NOT_FOUND`, `400 CANNOT_REMOVE_OWNER`, `403 OWNER_ONLY`                                                                                             |
| `PUT /api/me/signer`                                       | any user                           | `{ address, message, signature }` (C6)                                | `200 { signerAddress, signerVerifiedAt }`                                                                                               | `400 SIGNER_PROOF_INVALID`                                                                                                                               |
| `GET /api/my/licenses/:tokenId/signers`                    | member or owner of the active team | —                                                                     | `200 { signers: LicenseSignerRecord[] }`                                                                                                | `403 LICENSE_NOT_IN_TEAM`, `502 IDENTITY_UNAVAILABLE`                                                                                                    |
| `PUT /api/my/licenses/:tokenId/signers/:address`           | owner                              | `{ kind: SignerKind, note?: string \| null, holders: HolderInput[] }` | `200 { signer: LicenseSignerRecord }`. Clears `disabledAt`, so call it after `enableSigner`.                                            | `400 INVALID_HOLDERS`, `400 INVALID_ADDRESS`, `403 LICENSE_NOT_IN_TEAM`, `403 OWNER_ONLY`, `502 IDENTITY_UNAVAILABLE`                                    |
| `POST /api/my/licenses/:tokenId/signers/:address/disabled` | owner                              | —                                                                     | `200 { signer: LicenseSignerRecord }`                                                                                                   | `404 NOT_FOUND`, `400 INVALID_ADDRESS`, `403 LICENSE_NOT_IN_TEAM`, `403 OWNER_ONLY`                                                                      |
| `GET /api/my/license-access?clientId=0x…`                  | any user (ignores `X-Team-Id`)     | —                                                                     | `200 { access: 'OWNER' \| 'MEMBER' \| 'NONE', teamId: string \| null, signerAddress: \`0x${string}\` \| null, userEmail: string }`      | `400 INVALID_CLIENT_ID`, `502 IDENTITY_UNAVAILABLE`                                                                                                      |

**Every route** answers `401 UNAUTHORIZED` (`{ message: 'User not found', code: 'UNAUTHORIZED' }`) when the token maps to no console user.

**`GET /api/my/teams`** leaves out teams whose owner has no wallet address. Today that's only legacy data, because `TeamSummary.ownerAddress` is non-null.

**Routes that ignore `X-Team-Id`:** `GET /api/my/teams`, `GET /api/my/license-access` and `GET /api/me`.

- They never answer 403 for a stale header, so the console can always recover from a team the user has left.
- `GET /api/me` keeps returning the caller's own user, personal team and company, as today.

**Team context and authorization:**

- Every other `/api/my/*` route resolves the active team from `X-Team-Id` and answers `403 NOT_A_MEMBER` when the caller has no accepted, non-deleted membership in it.
- Every non-GET handler under `/api/my/apps*`, `/api/my/configurations*`, `/api/my/connections*`, `/api/my/redirect-uris*`, `/api/my/signers*`, `/api/my/simulated-vehicles*` and `/api/my/workspace*` answers `403 OWNER_ONLY` for members.
- `POST /api/my/support/email` stays open to members.

**Invite email link:** `${frontendUrl}sign-in?invite=${token}`, where `token` is 32 random bytes as base64url. Only `sha256(token)` (hex) is stored.

**Retired after part 3 ships** (part 2 keeps them working until then):

- `GET /api/my/team`
- `GET /api/my/team/collaborator`
- `DELETE /api/my/team/collaborator/:id`
- `POST /api/my/team/invitation`
- the `invitation_code` query on `GET /api/me`

### C8. Copy shared across parts

| Where                                   | Text                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grant dialog warning                    | `Data access lets {name} use every permission vehicles have granted {license}, including commands, through the DIMO APIs — not only what the console shows.` |
| Member without access, in Vehicles      | `Ask {ownerEmail} for data access to {license}.`                                                                                                             |
| Console proxy refusing a removed member | `You no longer have access to this license.`                                                                                                                 |
