# Console teams: invite teammates, give each one their own data access, record who holds every key

**Exact contracts:** names, payloads, error codes, cookies, settings and copy are defined once in `docs/superpowers/plans/2026-10-02-console-teams.md` (the plan index, contracts C1–C10). This spec states behavior and decisions and refers to those contracts. Where the two seem to differ, the index wins and this spec is corrected.

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
  - The invite link is `base64(row id)`.
- **Nobody records who holds a key.** The API keys table on a license shows signer addresses from Identity and nothing else. The RentalOS key is tagged in one browser's `localStorage`.
- **Fixed separately in dimo-developer-console-api#80, which must merge first:**
  - the unscoped `/api/user*` and `/api/team*` routes;
  - the `/api/me/complete` account takeover;
  - configurations answering to anyone with their public ID (now to their license's on-chain owner only);
  - app and connection lists returning every company's rows, connection private keys included, to a user with no company yet;
  - collaborator invites taking their role from the request body, sent by anyone, accepted by anyone with the link;
  - unescaped inviter names in invite emails;
  - workspaces trusting a body-supplied `owner`.

## Decisions made with the user

- **Approach A, plus the signer half of C.**
  - **A:** each member's own console wallet becomes a signer on the licenses they're given. Nobody shares a key and no backend holds one. Holding a backend key (B) was rejected because console-api would hold every opted-in license's key.
  - **Signer check, required for launch:** dex puts the signer in the developer JWT, and every service that accepts a developer-license JWT checks the signer is still enabled. See _Revocation within 10 minutes_.
  - **Later:** permission masks on signers, so members can be read-only at the protocol level.
- **Revocation target: about 10 minutes**, the lifetime of a vehicle JWT. A two-week lag is not acceptable.
- **Fix the team collaborator model** rather than add a per-license email grant beside it.
- **Multiple teams with a switcher.** Everyone keeps their personal team and can join others.
- **Key registry.** The console records who every license key is for. A member's own wallet key belongs to that member alone. A generated key can belong to several people plus a note. The console stores addresses, never private keys.
- **Members get Vehicles only.** No Webhooks, because a webhook keeps sending data after its creator is removed.
- **Members can see the member list,** read-only (a default from the design review).
- **From the plan review (2026-10-02):**
  - **Owner** means the team's creator, nothing else.
  - Members can **leave** a team.
  - Secrets (connection private keys, API keys) are **owner-only**.
  - The console asks for **read privileges only**.
  - Platform enforcement has a **kill switch and a log-only mode**, and dex deployments are **pinned to tags** before any of this ships.

## Facts this rests on

- **The license account checks the signer on-chain.** dex verifies the developer JWT challenge through ERC-1271 on the license account (`dex/connector/web3/web3.go`). The account recovers the signer with `ECDSA.recover` and calls `isSigner(tokenId, recovered)` (`developer-license/src/licenseAccount/DimoDeveloperLicenseAccount.sol`).
  - So a signer must be an EOA. Every console user already has one: the Turnkey wallet `walletAddress` that signs for their kernel account (`services/zerodev.ts`, `createAccount` from `@turnkey/viem`).
  - Every license account is a clone of one beacon-proxy template, and the template has exposed `isSigner(address)` since 2024.
- **Signer rules:** only the license owner can call `enableSigner`/`disableSigner`. `isSigner` is true for `periodValidity` after enabling. The source default is 365 days, but production reads 3,650 days (checked on-chain 2026-10-01 on `0x9A9D…7C85`), so signers don't expire in practice.
- **Identity supports `developerLicenses(filterBy: { signer })`** and returns `signers { address enabledAt }` per license.
- **Transactions can be batched.** `useContractGA().processTransactions` takes an array of calls and sends them as one sponsored user operation.
- **The developer JWT names the license, not the signer.** dex issues it with `ethereum_address` set to the license's client ID. In production, `auth.dimo.zone` ID tokens last 336 hours (`cluster-helm-charts/charts/dimo-dex/values-prod.yaml`).
- **No service checks the signer today.** Services that accept a developer-license JWT and act on the license:
  - **token-exchange-api:** issues 10-minute vehicle JWTs through `auth-roles-rights.dimo.zone`. It skips the developer-license check entirely for tokens whose audience is the mobile app (`dimo-driver`), and grants on `ethereum_address`.
  - **vehicle-triggers-api:** webhooks.
  - **tesla-oracle:** its telemetry subscribe, unsubscribe and start routes accept license #286's token for any Tesla, with no vehicle check.
  - **credit-tracker:** DCX usage reads.
  - So today `disableSigner` stops new developer JWTs but not the use of existing ones, for up to 336 hours.
- **dex deployments run `dimozone/dex:latest` with `pullPolicy: Always`,** dev and prod, including the roles-rights instance that signs every vehicle token.
- **console-api knows each user by their kernel smart account address** (`users.address`, from the token's `ethereum_address`). Every console login's token has `aud: developer-platform`.
- **License #286's owner** `0xb3562cC733b04c27D267Ab7B053F34E7957E2587` is a ZeroDev Kernel v3.1 account (`accountId()` = `kernel.advanced.v0.3.1`), the kind every console login has.

## Roles

| Capability                                                                                          | Owner | Member       | Member with data access to a license |
| --------------------------------------------------------------------------------------------------- | ----- | ------------ | ------------------------------------ |
| See the team's licenses, settings, connections (without private keys), workspace and branding       | ✓     | ✓, read-only | ✓, read-only                         |
| Vehicles for that license                                                                           | ✓     | —            | ✓                                    |
| Webhooks, connections pages, configurator edits, vehicle simulator, renounce                        | ✓     | —            | —                                    |
| License actions that need the owner's wallet: create a license, API keys, redirect URIs, alias, DCX | ✓     | —            | —                                    |
| Write console-api data                                                                              | ✓     | —            | —                                    |
| Invite, remove, grant and revoke data access, assign keys                                           | ✓     | —            | —                                    |
| See the member list                                                                                 | ✓     | ✓            | ✓                                    |
| Leave the team                                                                                      | —     | ✓            | ✓                                    |

- **One owner per team.** The owner is the user who created the team (`teams.created_by`), and the team's licenses are the ones their kernel account owns. Only that wallet can sign license transactions, so a second owner couldn't act on them anyway. A membership row saying `OWNER` for anyone else is demoted and never trusted.
- **"Data access" to a license** means the member's EOA is a current signer on it on-chain, recorded as an enabled `MEMBER` key in the registry.

## Revocation within 10 minutes (part 1: dex, token-exchange-api, vehicle-triggers-api, tesla-oracle, credit-tracker)

**Requirement:**

- Once the owner removes a member or revokes their data access, and `disableSigner` confirms, no DIMO service accepts that member's tokens on that license within 60 seconds. Vehicle tokens they already hold expire within 10 minutes.
- This holds everywhere, not just in the console, whatever client the token was issued to.

**dex** (`auth.dimo.zone`): recovers the EOA from a 65-byte ERC-1271 challenge signature, the same recovery the license account performs. dex emits it as the `signer_address` claim (C1).

**Every service that acts on a license** checks per C2: token-exchange-api, vehicle-triggers-api, tesla-oracle, credit-tracker.

- **When:** whenever the token's `ethereum_address` is a developer license and the token carries `signer_address`, whatever its audience.
- **How:** token-exchange-api calls `isSigner` on the license account, with a 60-second cache. The other services ask token-exchange-api over gRPC.
- **Results:** a disabled signer gets 403, and a failure to check gets 503.

**Operations (C10):**

- A `SIGNER_CHECK_MODE` of `enforce`, `log` or `off`, plus timeouts, a metric and an alert, and an optional cutoff that refuses license tokens issued after a date without the claim.
- Rollout runs in `log` mode for a week in production before `enforce`.

**Existing developers:**

- Tokens without the claim, minted before the dex change, keep working until they expire.
- Disabling one of their API keys now ends its tokens within about a minute instead of two weeks.
- The change is announced (index Rollout step 8).

**Webhooks** (C3): vehicle-triggers-api records the signer that created a webhook and the signer that last changed its target, vehicles or condition.

**Console:**

- **Removal** disables every key the member was ever granted in the team (`TeamMember.memberKeys`), not just their current wallet. It then lists the webhooks any of those keys created or last changed, for the owner to delete.
- **Data proxy (`/api/data/*`):**
  - **The license owner** passes. An owner whose wallet owns the license per Identity doesn't depend on console-api.
  - **Anyone else** needs `license-access` to answer `MEMBER` (C7): an accepted member holding an enabled key on that license matching their current wallet. The developer JWT's `signer_address` must also equal that wallet.
  - The access answer is cached for 60 seconds, so inside the console a removal or a single-license revoke takes effect within a minute, even before `disableSigner` confirms.

## Data model (console-api)

Migration `src/scripts/db/init-db_12.sql`, with `init-db_12.down.sql`.

- Production applies these scripts by hand (there's no migration runner). A production schema dump is compared with the test schema before running it.
- New timestamp columns are `TIMESTAMPTZ`.

**`team_collaborators`**, existing table; it becomes the membership table:

- `role`: `OWNER` or `MEMBER`.
  - `OWNER` only for the team's creator; any other `OWNER` row is demoted.
  - Existing `COLLABORATOR` rows become `MEMBER`.
- `status`: `PENDING`, `ACCEPTED`, `REVOKED` (removed by the owner) or `LEFT` (left by the member).
  - Removal and leaving also set `deleted`/`deleted_at`.
  - Every membership lookup requires `status = 'ACCEPTED' AND deleted IS NOT TRUE`.
- New columns:
  - `invite_token_hash`: SHA-256 of a 32-byte random token. Only the hash is stored.
  - `invite_expires_at`: 7 days after sending.
  - `invited_by`: user ID.
- Uniqueness:
  - A pending invite is unique on `(team_id, lower(email))`.
  - An accepted membership is unique on `(team_id, user_id)`.
  - A user may hold memberships in any number of teams. Duplicate legacy rows are folded, keeping the creator's row first.

**`users`:**

- New `signer_address`: the user's Turnkey EOA, lowercase and unique.
- New `signer_verified_at`: set when the console proves control by signing the C6 message.
- A user holding an enabled `MEMBER` key can't switch to a different address until an owner revokes it (C6).

**`license_signers`**, new; one row per key the console knows about:

| Column                       | Notes                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                         | UUID                                                                                                                                                                                                                         |
| `team_id`                    | Team whose owner owns the license                                                                                                                                                                                            |
| `license_token_id`           | Numeric                                                                                                                                                                                                                      |
| `signer_address`             | Lowercase; unique with `license_token_id`                                                                                                                                                                                    |
| `kind`                       | `MEMBER` (a member's EOA, which must equal that member's verified `signer_address`), `API_KEY` (generated in the console), `EXTERNAL` (assigned after the fact). An `API_KEY` or `EXTERNAL` key can't become a `MEMBER` key. |
| `note`                       | Free text, e.g. "Prod backend", "RentalOS"                                                                                                                                                                                   |
| `created_by`, `created_at`   |                                                                                                                                                                                                                              |
| `disabled_by`, `disabled_at` | Set when the console disables the signer                                                                                                                                                                                     |

**`license_signer_holders`**, new; who a key belongs to:

- `signer_id`, plus either `user_id` (a team member) or `name` (free text, for people or services without an account).
- A `MEMBER` key has exactly one holder, the member. An `API_KEY` or `EXTERNAL` key has one or more.

**Source of truth:**

- The chain decides whether a key works.
- The registry records who a key is for.
- A registry row whose signer is gone on-chain shows as _Disabled outside the console_.
- An on-chain signer with no row shows as _Unassigned_.

## Authorization (console-api)

Exact endpoints, payloads and codes: index C4, C6 and C7.

- **Team context replaces `getCompanyAndTeam(user)` in every `/api/my/*` route.**
  - `resolveTeamContext(request)` reads the user from the token and the team from the `X-Team-Id` header, defaulting to the user's personal team.
  - It requires an accepted, non-deleted membership, and returns `{ user, team, company, role }` with `role` derived from `teams.created_by`.
  - The header stays optional, so the current console keeps working until it sends one.
- **`GET /api/me`** keeps returning the caller's personal team. A legacy collaborator with no personal team gets their oldest accepted membership instead, so they keep working through the deploy.
- **Owner-only writes** on apps, configurations, connections, redirect URIs, signers, simulated vehicles and workspace. Team management is owner-only. Support email stays open to members.
- **Secrets are owner-only:** members' reads null connection private keys and omit API keys.
- **Lists never fall back to every company:**
  - an empty company ID returns an empty page (already in #80);
  - the shared filter helper is fixed so it applies every key, not just the last one.
- **Token audience:** team, invite, signer, registry and license-access routes require `aud` to include `developer-platform`.
- **Team endpoints** (C7): list teams, list members (including each member's keys), invite (rate-limited, escaped email), resend, cancel, preview and accept an invite (bound to the invited email), remove a member, leave a team, register a signer (C6).
- **Key registry endpoints** (C7): list, upsert and stamp disabled.
  - **Ownership check:** each call asks Identity for the license and requires its owner to equal the active team owner's `users.address`, with known owners cached for 60 seconds.
  - **Errors:** an Identity failure, including an HTTP 200 carrying GraphQL errors, answers 502.
  - **Holder check:** a `user_id` holder must be an accepted member of the team.
- **`GET /api/my/license-access`** answers the console data proxy (C7 semantics).
- **Retired** (part 2's final task, after part 3 ships): the legacy team routes listed in C7, and `ROLES = ['Collaborator']` in console config.

## Console

**Session and team context**

- The session role comes from the active team's entry in `GET /api/my/teams`. The hard-coded `OWNER` in `GlobalAccountProvider.tsx` and the collaborator branch in sign-in are removed.
- A `TeamProvider` holds the active team, defaulting to the personal team. It's stored in the `active_team` cookie (C4), and `dimoDevAPIClient` sends `X-Team-Id`.
- **If the team list can't load,** owners fall back to their personal team and their own wallet with a toast, so their pages never hang.
- **The sidebar team switcher** shows only when the user belongs to more than one team. Switching resets team-scoped queries.
- **Removal detection:** `TeamProvider` re-checks the team list when the tab regains focus. It also exposes `reportRemoved()`, called on any `NOT_A_MEMBER` answer or a proxy refusal for a former member, which shows the C8 copy and returns to the personal team.
- **Sign-out** clears both team cookies and every stored developer JWT.

**Team owner address replaces the user's own address wherever licenses are listed:**

- `licenses/page.tsx`, `useValidDeveloperLicenses`, `useHasDeveloperLicenses`, `VehiclesView`, `VehiclePage`.
- `useIsLicenseOwner` becomes "the current user is the active team's owner and the license owner is that wallet".
- **Owner-only UI** is hidden or guarded for members, with server-side refusals behind it:
  - Webhooks and the connections pages;
  - configurator New and Save, and the overview quick actions;
  - the vehicle simulator, Renounce, and connection creation.
- **Wallet-specific actions** (buying DCX, minting simulated vehicles, renouncing, SACD) keep using the user's own wallet and are owner-only.

**A member's developer JWT, signed by their own wallet**

- `useMemberDevJwt()` returns a function `({ clientId, domain }) => Promise<string>`. It asks dex for a challenge with `address = clientId` and signs it with the user's Turnkey EOA (the `localAccount` from `createAccount`, not the kernel). It exchanges the signature for a token and stores it per user and wallet. Only dex `submit_challenge` 4xx answers are retried: three tries, five seconds apart.
- **For members,** the console uses only stored JWTs whose `signer_address` matches their wallet. If the proxy refuses but Identity lists their wallet as a signer, Vehicles offers **Reconnect with your wallet**.
- **Vehicles states:**
  - a member with data access sees **Connect with your wallet** where an owner sees _Generate developer JWT_;
  - a member without data access sees "Ask {ownerEmail} for data access to {license}";
  - a removed member sees "You no longer have access to this license" (C8);
  - the members' empty state never suggests creating a license.

**Registering a member's wallet:** after sign-in, once per browser session, the console signs the C6 message with the EOA and calls `PUT /api/me/signer`. `SIGNER_LOCKED` and `SIGNER_IN_USE` show the C8 copy.

**Invites (C4):**

- `/sign-in?invite=` stores the token in an HttpOnly cookie and strips it from the URL.
- After sign-in (and sign-up, including the company step), the console previews the invite and asks "Join {teamName} owned by {ownerEmail}?", then accepts and switches to the team.
- The cookie is cleared only on success or a terminal error.

**Settings → Team** (owner view; members see it read-only, with **Leave team**)

- **Members table:** name, email, role and status. A **Data access** column lists licenses, hidden while the flag is off. Actions: **Grant**, **Revoke**, **Remove**, **Resend**, **Cancel invite**. It has loading, error and empty states, and fits at 390 px.
- **Invite modal:** email only, with the rate-limit and email-failure messages.
- **Pending-grant banner:** "{name} joined. Grant data access?" appears once licenses have loaded, for accepted members whose verified wallet is missing from at least one license.
- **Grant:**
  - the checklist offers only licenses with a redirect URI, and shows the C8 warning (commands, DCX);
  - one batched `enableSigner` transaction, with the loading-status pattern and the "denied" (4001) case, and the modal can't be closed mid-transaction;
  - then a `MEMBER` registry row per license.
- **Revoke** sends one batched `disableSigner` for the chosen licenses, stamps the registry, and reviews webhooks that key created or last changed.
- **Remove** does the same for every key in `memberKeys`, then deletes the membership.
  - If the transaction fails, the membership is still removed and the row stays visible as "Removed — still a signer on {licenses}. Retry."
  - **Retry** also stamps keys that are already gone on-chain.
  - The proxy blocks the removed member within a minute regardless.
- **Grant requires a verified wallet.** Without one, the row says the member needs to sign in once.
- **Grant is behind `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED`** (C5). With the flag off, members don't see Vehicles.

**License → API keys**

- New **Belongs to** column:
  - member keys show the member's name and email;
  - generated and external keys show holders and the note;
  - keys with no row show **Unassigned · Assign**.
- **Generate API key** asks "Who is this key for?" (members or free-text names, plus a note). The new key is shown as soon as it's enabled; a failed registry write never hides it, and offers **Assign** instead.
- **RentalOS:**
  - the flow saves an `API_KEY` row noted "RentalOS" and drops the `localStorage` tag;
  - a registry failure there never triggers the flow's rollback of the signer;
  - existing per-browser RentalOS tags aren't migrated, so those keys show as Unassigned until assigned.
- Disabling a key stamps the registry row.
- Members see this table read-only.

**Data proxy**

- It requests only the privileges in C9, never commands.
- After token exchange, it logs one structured line per request with the outcome: session email, the license's team, license client ID, subject DID and API. On the owner fast path, which doesn't call console-api, it logs the session wallet in place of the email and team.
- Its caches are bounded.
- Owner-facing audit history is out of scope.

**Analytics:** Mixpanel events for invite, accept, switch team, grant, revoke, remove, leave, assign key and connect wallet, like the existing `API Key Generated` events.

## Flows

1. **Invite.** The owner enters an email, console-api creates a pending row, and the invitee gets the link.
2. **Accept.**
   - The invitee opens the link and signs in normally with OTP or passkey (sign-up first if they have no account).
   - The console previews the invite, asks to confirm, accepts, registers their wallet and switches to the team.
   - Possible errors: expired token, email mismatch, already a member, revoked invite.
3. **Grant.** The owner sees the banner, picks licenses and signs one transaction. Registry rows are written, and Identity reflects the new signer within seconds.
4. **Use.** The member opens Vehicles in the team, connects with their wallet and gets a developer JWT that carries `signer_address`. Vehicles works as it does for owners.
5. **Revoke, remove or leave.**
   - The console blocks the member within a minute.
   - Once `disableSigner` confirms, every service refuses their tokens within 60 seconds, and vehicle tokens they already hold expire within 10 minutes.
   - The owner reviews webhooks the member created or changed.
   - When a member leaves, their keys stay enabled until the owner revokes them, and the owner sees them as "Left — still a signer".

## Error handling

| Situation                                                 | Behavior                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `X-Team-Id` for a team the user isn't in                  | 403; the console resets to the personal team with the C8 copy                                                                      |
| A member calls an owner-only endpoint                     | 403; the UI hides those actions                                                                                                    |
| console-api can't list teams                              | Owners fall back to their own wallet and personal team, with a toast                                                               |
| Grant transaction denied or failed                        | Nothing is written to the registry; the existing loading-status error pattern shows                                                |
| Registry write fails after the transaction succeeds       | The console retries once. If that fails too, the key shows as Unassigned and a toast offers **Assign** with the holders filled in. |
| Identity unreachable, or answers with errors              | 502; the registry is read-only until Identity is back                                                                              |
| dex rejects a member's challenge (signer not yet indexed) | Retry three times, five seconds apart, then "Access is still propagating — try again in a minute"                                  |
| Signer check can't reach the chain or token-exchange      | 503 in `enforce` mode; allowed and counted in `log` mode                                                                           |

## Risks and accepted limits

1. **Data access is full signer power.**
   - It includes every privilege vehicles granted the license (commands among them), spends the license's DCX, and works outside the console. The grant dialog says so. Only the rest of C limits it.
   - For license #286 it also includes tesla-oracle's telemetry controls for every DIMO Tesla.
2. **Revocation depends on the platform change.**
   - Granting stays behind its flag until part 1 is in `enforce` mode in that environment, so the 336-hour lag never applies to members.
   - Once enforcing, the worst case is about 11 minutes after `disableSigner` confirms.
   - Webhooks are the exception: a webhook keeps running until the owner deletes it, which is why removal reviews them.
3. **Services built later** that accept developer-license JWTs (`dauth` and `vt` today, neither live) need the same check before they ship.
4. **One owner, no transfer.** If the owner leaves the company, the licenses stay with their wallet.
5. **Unverified emails.** Invite acceptance matches the invited email against the account email, and console-api still doesn't verify emails server-side. The token in the emailed link is what proves receipt.
6. **Connection keys may already have leaked.** Before #80, connection private keys were readable across companies. Rotating them is a separate decision (index Rollout step 1).

## Testing

- **console-api:**
  - a route-level test harness: route handlers run directly against a disposable Postgres built from `src/scripts/db` with `TZ=UTC`, a local JWKS minting tokens, and an Identity fake that passes every other URL through;
  - coverage: team context, owner-only writes on every write route, secrets stripping, invites (hash, expiry, email binding, limits, preview, existing accounts, resend, cancel, concurrency), leaving, signer proof and locking, registry rules, license-access, the audience check, and the #80 regressions.
- **Console:**
  - Jest and React Testing Library cover the provider and header, owner fallback, removal detection, `useMemberDevJwt`, per-wallet JWT storage, owner-address substitution in every license hook, owner-only gating, the members table states, grant, revoke, remove and leave (batched calls, partial failure, every key), registry robustness and invite confirmation;
  - screenshot harness: Team page (owner, member, empty, pending, removed or left but still a signer), team switcher, API keys with Belongs to, and member Vehicles states. Dark and light themes.
- **Platform** (Go, testify, each repo's mocks):
  - dex end to end through `submit_challenge`;
  - the signer check in every service (current, disabled, missing claim, mobile-audience license token, non-license, cache, timeout, log mode, off mode, cutoff);
  - webhook creator and modifier fields.
- **Live passes:**
  - **Platform** (part 1): in dev, then in production in `log` mode, then `enforce`.
  - **Team** (part 3), before turning the flag on in an environment:
    - invite a second account, grant one license and use Vehicles as the member;
    - revoke and confirm the console blocks within a minute and token exchange refuses within 60 seconds;
    - confirm the removal flow lists a webhook created or changed through the API.

## Rollout

See the index _Rollout_, which is authoritative: #80 → platform (pin dex, log mode, enforce) → console-api teams → console with the flag off → flag on per environment → DIMO's own rollout → retire legacy routes → announcement.

## Out of scope and follow-ups

- The rest of C: signer permission masks in the DevLicense contract, enforced by token exchange. This makes members truly read-only.
- Webhooks for members.
- An admin role, owner transfer, and an owner-visible audit history page.
- Email verification in console-api.
- `GET /api/auth/exist` returning role and wallet for any email.
- An audience check on every console-api route, beyond the team routes covered here.
- Encrypting connection private keys at rest in console-api.
