# Console teams: invite teammates, give each one their own data access, record who holds every key

## Context

A license owner can't let anyone else use the console for their license without handing over an API key. The DIMO Mobile support team is the first case. They need the Vehicles section (which replaced the data explorer in #304) to troubleshoot app users' vehicles. The feature must be generally available to every developer, not a DIMO-only staff mode.

Today:

- **Vehicles needs an API key.** It lists licenses owned by the signed-in user's own wallet (`currentUser.smartContractAddress`). Its developer JWT comes from pasting one of that license's API keys, a signer private key, into the browser.
- **The team model in console and console-api doesn't work:**
  - The session always sets `role: OWNER` (`GlobalAccountProvider.tsx`).
  - At sign-in a collaborator is sent to `/app` without authenticating (`sign-in/components/View/View.tsx`).
  - Invites are refused for any email that already has an account.
  - A user can belong to only one team.
  - Removing a collaborator does nothing: the row is soft-deleted, but `findOne({ user_id })` doesn't skip deleted rows.
  - The last-owner check counts owners across all teams.
  - The invite link is `base64(row id)` and isn't tied to the invited email.
- **Nobody records who holds a key.** The API keys table on a license shows signer addresses from Identity and nothing else. The RentalOS key is tagged in one browser's `localStorage`.
- **Already fixed separately:** the unscoped `/api/user*` and `/api/team*` routes and the `/api/me/complete` takeover were fixed in dimo-developer-console-api#80, which must merge first.

## Decisions made with the user

- **Approach A now, C later.**
  - **A:** each member's own console wallet becomes a signer on the licenses they're given. Nobody shares a key and no backend holds one.
  - **C, a later protocol change:** signers carry a permission mask that token exchange enforces, and the developer JWT names the signer. Holding a backend key (B) was rejected because console-api would hold every opted-in license's key.
- **Fix the team collaborator model** rather than add a per-license email grant beside it.
- **Multiple teams with a switcher.** Everyone keeps their personal team and can join others.
- **Key registry.** The console records who every license key is for. A member's own wallet key belongs to that member alone. A generated key can belong to several people plus a note. The console stores addresses, never private keys.
- **Defaults from the design review** (the user can change these):
  - Members with data access get Webhooks as well as Vehicles.
  - Members can see the member list, read-only.
  - The revocation lag in _Risks_ is accepted for v1.

## Facts this rests on

- **The license account checks the signer on-chain.** dex verifies the developer JWT challenge through ERC-1271 on the license account (`dex/connector/web3/web3.go`). The account recovers the signer with `ECDSA.recover` and calls `isSigner(tokenId, recovered)` (`developer-license/src/licenseAccount/DimoDeveloperLicenseAccount.sol`). So a signer must be an EOA. Every console user already has one: the Turnkey wallet `walletAddress` that signs for their kernel account (`services/zerodev.ts`, `createAccount` from `@turnkey/viem`).
- **Signer rules:** only the license owner can call `enableSigner`/`disableSigner`. `isSigner` is true for `periodValidity` after enabling, 365 days by default (`DevLicenseCore.sol`). Enabling again resets the clock.
- **Identity supports `developerLicenses(filterBy: { signer })`** and returns `signers { address enabledAt }` per license.
- **Transactions can be batched.** `useContractGA().processTransactions` takes an array of calls and sends them as one sponsored user operation.
- **The developer JWT names the license, not the signer.** dex issues it with `ethereum_address` set to the license's client ID. In production, ID tokens last 336 hours (`cluster-helm-charts/charts/dimo-dex/values-prod.yaml`).
- **console-api knows each user by their kernel smart account address** (`users.address`, from the token's `ethereum_address`). It doesn't know their EOA.

## Roles

| Capability                                                                                          | Owner | Member       | Member with data access to a license |
| --------------------------------------------------------------------------------------------------- | ----- | ------------ | ------------------------------------ |
| See the team's licenses, settings, connections, workspace and branding                              | ✓     | ✓, read-only | ✓, read-only                         |
| Vehicles and Webhooks for that license                                                              | ✓     | —            | ✓                                    |
| License actions that need the owner's wallet: create a license, API keys, redirect URIs, alias, DCX | ✓     | —            | —                                    |
| Write console-api data: connections, configurations, workspace, branding, simulated vehicles        | ✓     | —            | —                                    |
| Invite, remove, grant and revoke data access, assign keys                                           | ✓     | —            | —                                    |
| See the member list                                                                                 | ✓     | ✓            | ✓                                    |

- **One owner per team.** The owner is the user who created the team, and the team's licenses are the ones their kernel account owns. Only that wallet can sign license transactions, so a second owner couldn't act on them anyway.
- **"Data access" is not a console-api flag.** It means the member's EOA is a current signer on the license on-chain.

## Data model (console-api)

Migration `src/scripts/db/init-db_12.sql`.

**`team_collaborators`**, existing table; it becomes the membership table:

- `role`: `OWNER` or `MEMBER`. Existing `COLLABORATOR` rows become `MEMBER`.
- `status`: `PENDING`, `ACCEPTED` or `REVOKED`. Removal sets `REVOKED` plus `deleted`/`deleted_at`. Every membership lookup requires `status = 'ACCEPTED' AND deleted IS NOT TRUE`.
- New columns:
  - `invite_token_hash`: SHA-256 of a 32-byte random token. Only the hash is stored.
  - `invite_expires_at`: 7 days after sending.
  - `invited_by`: user ID.
- Uniqueness:
  - A pending invite is unique on `(team_id, lower(email))`.
  - An accepted membership is unique on `(team_id, user_id)`.
  - A user may hold memberships in any number of teams.

**`users`:**

- New `signer_address`: the user's Turnkey EOA, lowercase.
- New `signer_verified_at`: set when the console proves control by signing a fixed message.

**`license_signers`**, new; one row per key the console knows about:

| Column                       | Notes                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                         | UUID                                                                                                  |
| `team_id`                    | Team whose owner owns the license                                                                     |
| `license_token_id`           | Numeric                                                                                               |
| `signer_address`             | Lowercase; unique with `license_token_id`                                                             |
| `kind`                       | `MEMBER` (a member's EOA), `API_KEY` (generated in the console), `EXTERNAL` (assigned after the fact) |
| `note`                       | Free text, e.g. "Prod backend", "RentalOS"                                                            |
| `created_by`, `created_at`   |                                                                                                       |
| `disabled_by`, `disabled_at` | Set when the console disables the signer                                                              |

**`license_signer_holders`**, new; who a key belongs to:

- `signer_id`, plus either `user_id` (a team member) or `name` (free text, for people or services without an account).
- A `MEMBER` key has exactly one holder, the member. An `API_KEY` or `EXTERNAL` key has one or more.

**Source of truth:**

- The chain decides whether a key works.
- The registry records who a key is for.
- A registry row whose signer is gone on-chain shows as _Disabled outside the console_.
- An on-chain signer with no row shows as _Unassigned_.

## Authorization (console-api)

**Team context replaces `getCompanyAndTeam(user)` in every `/api/my/*` route.**

- `resolveTeamContext(request)` reads the user from the token and the team from the `X-Team-Id` header. If the header is missing, it uses the user's own `OWNER` team.
- It requires an accepted, non-deleted membership in that team and returns `{ user, team, company, role }`. Otherwise it returns 403.
- The header stays optional, so the current console keeps working until it sends one.

**Owner-only writes.** Every non-GET handler under these paths requires `role === OWNER`:

- `/api/my/apps*`, `/api/my/configurations*`, `/api/my/connections*`, `/api/my/redirect-uris*`, `/api/my/signers*`, `/api/my/simulated-vehicles*`, `/api/my/workspace*`
- the team-management endpoints below

`POST /api/my/support/email` stays open to members.

**Team endpoints:**

| Endpoint                                   | Who                                | Does                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/my/teams`                        | any user                           | Accepted memberships for the switcher: team, company name, role, owner wallet address                                                                                                                                                                        |
| `GET /api/my/team/members`                 | member or owner of the active team | Members and pending invites: name, email, role, status, `signer_address`. Also returns revoked members who still hold an enabled `MEMBER` key in the registry, so a failed revoke stays visible.                                                             |
| `POST /api/my/team/invitations`            | owner                              | `{ email }`. Creates a pending row and emails the link `…/sign-in?invite=<token>`. Existing accounts may be invited.                                                                                                                                         |
| `POST /api/my/team/invitations/:id/resend` | owner                              | New token and expiry, email sent again                                                                                                                                                                                                                       |
| `DELETE /api/my/team/invitations/:id`      | owner                              | Cancels a pending invite                                                                                                                                                                                                                                     |
| `POST /api/invitations/accept`             | the signed-in invitee              | `{ token }`. Hash matches a pending, unexpired row, and the user's email matches the invited email (case-insensitive). Sets `ACCEPTED` and `user_id`. Returns the team.                                                                                      |
| `DELETE /api/my/team/members/:id`          | owner                              | Sets `REVOKED`. The owner can't remove themselves.                                                                                                                                                                                                           |
| `PUT /api/me/signer`                       | the user                           | `{ address, message, signature }`. Recovers the signer from the signature, requires it to equal `address` and the message to name the user's kernel address and a timestamp from the last 10 minutes, then stores `signer_address` and `signer_verified_at`. |

**Key registry endpoints:**

| Endpoint                                                   | Who             | Does                                                       |
| ---------------------------------------------------------- | --------------- | ---------------------------------------------------------- |
| `GET /api/my/licenses/:tokenId/signers`                    | member or owner | Registry rows and holders for that license                 |
| `PUT /api/my/licenses/:tokenId/signers/:address`           | owner           | Upsert `{ kind, note, holders: [{ userId } or { name }] }` |
| `POST /api/my/licenses/:tokenId/signers/:address/disabled` | owner           | Stamp `disabled_by` and `disabled_at`                      |

- **Ownership check:** each registry call asks Identity for `developerLicense(by: { tokenId }) { owner }` and requires it to equal the active team owner's `users.address`. The answer is cached in memory for 60 seconds.
- **Holder check:** a `user_id` holder must be an accepted member of the team.

**Retired:**

- The old `GET/POST /api/my/team*`, `GET /api/me?invitation_code=` acceptance and `acceptTeamInvitation`.
- `ROLES = ['Collaborator']` in console config.

## Console

**Session and team context**

- `/api/me` returns the user plus their memberships, and the session role comes from the active team's membership. The hard-coded `OWNER` in `GlobalAccountProvider.tsx` and the collaborator branch in sign-in are removed.
- A `TeamProvider` holds the active team, defaulting to the personal team. It's stored in an `active_team` cookie so server actions can read it, and `dimoDevAPIClient` sends `X-Team-Id`.
- The sidebar gets a team switcher, shown only when the user belongs to more than one team. Switching resets team-scoped queries.

**Team owner address replaces the user's own address wherever licenses are listed:**

- `licenses/page.tsx`, `useValidDeveloperLicenses`, `useHasDeveloperLicenses`, `VehiclesView`, `VehiclePage`, Home.
- `useIsLicenseOwner` becomes "the current user is the active team's owner and the license owner is that wallet".
- **Not changed:** wallet-specific actions keep using the user's own wallet. These are buying DCX, minting simulated vehicles, renouncing and SACD, and owners can only take them in their own team anyway.

**A member's developer JWT, signed by their own wallet**

- `useMemberDevJwt(clientId, domain)` asks dex for a challenge with `address = clientId`, signs it with the user's Turnkey EOA (the `localAccount` from `createAccount`, not the kernel), exchanges it for a token, and saves it with `saveDevJwt`.
- Vehicles and Webhooks use it when the user is a member with data access. Where an owner sees _Generate developer JWT_, a member sees **Connect with your wallet**.
- A member without data access sees: "Ask {owner} for data access to {license}."

**Registering a member's wallet:** the first time the user signs in (or accepts an invite), the console signs the fixed message with the EOA and calls `PUT /api/me/signer`. It repeats this if `signer_address` doesn't match the session's EOA.

**Settings → Team** (owner view; members see it read-only)

- **Members table:** name, email, role, status. A **Data access** column lists licenses with the signer's expiry date ("expires in 34 days"). Actions: **Grant**, **Renew**, **Revoke**, **Remove**, **Resend**, **Cancel invite**.
- **Invite modal:** email only.
- **Pending-grant banner:** "{name} joined. Grant data access?" appears for accepted members with no data access. It opens a license checklist. Confirming sends one batched `enableSigner` transaction, then upserts a `MEMBER` registry row per license.
- **Revoke** sends batched `disableSigner` for the chosen licenses and stamps the registry.
- **Remove** does the same for every license, then deletes the membership. If the transaction fails, the membership is still removed and the row stays visible as "Removed — still a signer on {licenses}. Retry." The console keeps blocking the removed member's Vehicles in the meantime.
- Grant and renew require the member to have a verified `signer_address`. Without one, the row says they need to sign in once.

**License → API keys**

- New **Belongs to** column:
  - member keys show the member's name and email;
  - generated and external keys show holders and the note;
  - keys with no row show **Unassigned · Assign**.
- **Generate API key** asks "Who is this key for?" (members or free-text names, plus a note) before sending the transaction, and saves an `API_KEY` row.
- The RentalOS flow saves an `API_KEY` row noted "RentalOS" and drops the `localStorage` tag.
- Disabling a key stamps the registry row.
- Members see this table read-only.

**Audit**

- The `/api/data/*` proxy logs one structured line per request: session email, active team, license client ID, subject DID and API.
- Owner-facing audit history is out of scope.

## Flows

1. **Invite.** The owner enters an email, console-api creates a pending row, and the invitee gets the link.
2. **Accept.**
   - The invitee opens the link and signs in normally with OTP or passkey (sign-up first if they have no account).
   - The console posts the token to `/api/invitations/accept`, registers their wallet, and switches to the team.
   - Possible errors: expired token, email mismatch, already a member, revoked invite.
3. **Grant.** The owner sees the banner, picks licenses and signs one transaction. Registry rows are written, and Identity reflects the new signer within seconds.
4. **Use.** The member opens Vehicles in the team, connects with their wallet and gets a developer JWT. Vehicles works as it does for owners.
5. **Renew.** Within 30 days of expiry the member row shows **Renew**, which re-enables the signer.
6. **Revoke or remove** as described above.

## Error handling

| Situation                                                 | Behavior                                                                                                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X-Team-Id` for a team the user isn't in                  | 403; the console resets to the personal team                                                                                                         |
| A member calls an owner-only endpoint                     | 403; the UI hides those actions                                                                                                                      |
| Grant transaction denied or failed                        | Nothing is written to the registry; the existing loading-status error pattern shows                                                                  |
| Registry write fails after the transaction succeeds       | The console retries the write once. If it fails again, the key shows as Unassigned and a toast offers **Assign** with the holders already filled in. |
| Identity unreachable during the ownership check           | 502; the registry is read-only until Identity is back                                                                                                |
| dex rejects a member's challenge (signer not yet indexed) | Retry three times, five seconds apart, as the RentalOS flow does, then "Access is still propagating — try again in a minute"                         |

## Risks and accepted limits

1. **Data access is full signer power.** It includes every privilege vehicles granted the license (Commands among them) and works outside the console. The grant dialog says so. Only C limits it.
2. **Revocation lag.** `disableSigner` stops new developer JWTs, but one minted before removal stays valid for up to 336 hours in production. During that time it can still be exchanged for vehicle tokens. The console blocks removed members at once; direct API use is cut off only when the token expires. Fixes are outside this repo: shorten developer JWT lifetime in dex, or C with token exchange checking `isSigner` per exchange.
3. **The owner must be a console account.** For the DIMO Mobile license (#286), the owner `0xb356cC733b04c27D267Ab7B053F34E7957E2587` has to be checked. If it's a Safe or a hardware wallet, DIMO calls `enableSigner` outside the console, and the key can then be assigned in the registry.
4. **One owner, no transfer.** If the owner leaves the company, the licenses stay with their wallet.
5. **Unverified emails.** Invite acceptance matches the invited email against the account email, and console-api still doesn't verify emails server-side (see #80). The token in the emailed link is what proves receipt.

## Testing

- **console-api.**
  - Add a route-level test harness. Route handlers run directly against a disposable Postgres built from `src/scripts/db`, with a local JWKS minting tokens, the same setup used to verify #80.
  - Cover:
    - team context resolution (header, default, non-member 403, revoked, deleted);
    - owner-only writes on every `/api/my/*` write route;
    - invites (token hash, expiry, email match, existing accounts, resend and cancel);
    - signer proof (wrong signer, stale timestamp, wrong kernel address);
    - registry (ownership check through a mocked Identity, holder validation, member read-only);
    - the #80 regressions.
- **Console.**
  - Jest and React Testing Library cover `TeamProvider` and the `X-Team-Id` header, `useMemberDevJwt` (mocked dex and Turnkey), team-owner address substitution in the license hooks, the members table states, the grant and remove flows (batched calls, partial failure), and the Belongs to column states.
  - Screenshot harness: Team page (owner, member, empty, pending, removed-but-still-signer), team switcher, API keys with Belongs to, and member Vehicles with and without access. Dark and light themes.
- **Live pass before release:**
  - Create a test team. Invite a second account, grant one license, and use Vehicles as the member.
  - Revoke, and confirm that the console blocks the member and that a new developer JWT is refused.
  - Confirm the old developer JWT still exchanges, to document the lag.

## Rollout

1. Merge console-api #80.
2. Ship console-api teams. Every change is backward compatible: the header is optional and the old acceptance path is removed only after step 3. Run migration `init-db_12.sql`.
3. Ship the console.
4. Remove the retired console-api routes.
5. For DIMO: confirm who owns license #286, invite the support team, grant data access, and assign the three existing keys in the registry.

## Out of scope and follow-ups

- C: signer permission masks in the DevLicense contract, the signer address in the developer JWT, and token exchange enforcing both. This makes members truly read-only and makes revocation immediate.
- A shorter developer JWT lifetime in dex.
- An admin role, owner transfer, and an owner-visible audit history page.
- Email verification in console-api.
- `GET /api/auth/exist` returning role and wallet for any email.
- An audience check on the token in console-api's middleware.
