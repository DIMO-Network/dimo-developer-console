# Console teams, part 1: platform signer check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disabling a developer-license signer cuts off every token that signer minted within 60 seconds, on token exchange, the webhooks API, tesla-oracle and credit-tracker, so a removed console team member loses all access within about 10 minutes (the vehicle JWT lifetime).

**Architecture:**

- **dex** recovers the EOA that signed a web3 challenge and stamps it on developer JWTs as `signer_address`. It travels in the existing `connector_data` columns, so no storage migration is needed.
- **token-exchange-api** holds the one chain-facing checker: Identity says whether the address is a license, then `isSigner(signer)` on its account, cached for 60 s with singleflight and 3 s timeouts.
  - Its exchange endpoint checks every token by `ethereum_address`, whatever the audience.
  - It serves the same check over gRPC `SignerCheck`.
  - A shared package `pkg/signercheck` holds the mode setting, the `signer_check_total` metric, a Fiber middleware and a gRPC client with a 5 s deadline.
- **vehicle-triggers-api, tesla-oracle and credit-tracker** use that package against `SignerCheck`. vehicle-triggers-api also records which signer created or last changed each webhook.

**Tech Stack:**

- Go: dex 1.23 toolchain, token-exchange-api 1.24, vehicle-triggers-api 1.25, tesla-oracle 1.25, credit-tracker 1.24.
- go-ethereum `accounts/abi/bind` (v1 bindings) and abigen.
- gofiber v2, golang-jwt v5, gRPC/protobuf (protoc 31.1), `golang.org/x/sync/singleflight`.
- prometheus client_golang, sqlboiler plus goose.
- testify, go.uber.org/mock, testcontainers.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md` — sections _Revocation within 10 minutes_, _Testing_ (platform bullets and live pass) and _Rollout_.

**Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md` — Rollout step 2 and contracts C1, C2, C3 and C10 are binding on this plan.

## Global Constraints

- **Claim** `signer_address`: the EIP-55 checksummed address (`common.Address.Hex()`) of the EOA that signed the web3 challenge.
  - dex emits it on tokens issued after a successful ERC-1271 verification in the web3 connector whose signature is a plain 65-byte ECDSA signature, whatever the client ID.
  - EOA logins never get it. ZeroDev Kernel v3.1 logins don't, because their signatures are longer than 65 bytes.
  - Only the authorization-code flow sets it, on both the `access_token` and the ID token, not gated by scope.
- **Platform consumers:**
  - compare the claim case-insensitively;
  - treat a missing claim as "minted before the claim existed" and allow it (unless `SIGNER_CLAIM_REQUIRED_AFTER` applies);
  - never trust it without their existing JWT signature check.
- **When to check:** whenever a token carries `signer_address` and its `ethereum_address` is a developer license (Identity `developerLicense(by: { clientId })` exists), **whatever the `aud`**, including `dimo-driver`. A token whose `ethereum_address` isn't a license isn't checked.
- **Call:** `isSigner(address signer) returns (bool)` on the license account at `ethereum_address`.
- **Cache:** 60 s per `(license, signer)`, positive and negative answers alike, bounded at 10,000 entries. Errors are never cached. Concurrent misses for one key share one call.
- **Timeouts:** 3 s for each chain and Identity call; 5 s for a gRPC `SignerCheck` call.
- **On `false`:** 403 `signer no longer authorized for this license`.
- **On an error or timeout:** 503 `could not verify signer`. Never fail open in `enforce` mode.
- **gRPC** `SignerCheck(SignerCheckRequest{license, signer}) → SignerCheckResponse{is_signer}`:
  - `InvalidArgument` for non-hex input;
  - `Unavailable` (`could not verify signer`) on chain or Identity errors;
  - `is_signer: true` when `license` isn't a developer license (nothing to check).
  - Callers map any gRPC error to the 503.
- **`SIGNER_CHECK_MODE`** (`enforce` | `log` | `off`; default `enforce`) in every service:
  - `log` checks, logs and counts but never refuses;
  - `off` doesn't check.
- **`SIGNER_CLAIM_REQUIRED_AFTER`** (optional Unix time, token-exchange-api only): a license token issued after it without the claim answers the 403.
- **Metric** `signer_check_total{service, result}`:
  - `result` is one of `allowed`, `denied`, `error`, `skipped`;
  - `service` is one of `token-exchange-api`, `vehicle-triggers-api`, `tesla-oracle`, `credit-tracker`.
  - **Alert:** `error` above 1% of non-skipped checks (`allowed` + `denied` + `error`) over 5 minutes.
- **vehicle-triggers-api columns:** `created_by_signer` and `updated_by_signer` (nullable text, lowercase hex).
- **vehicle-triggers-api JSON:** fields `createdBySigner` and `updatedBySigner` (checksummed, omitted when null) on every `WebhookView` from `GET /v1/webhooks`.
- **Deploy order (identical in every task):**
  1. Pin all four dex deployments to `v2.30.100`.
  2. Merge dex, tag `v2.30.101`, pin **dev** dex to it.
  3. Deploy token-exchange-api, then vehicle-triggers-api, tesla-oracle and credit-tracker, all `SIGNER_CHECK_MODE=log`.
  4. Run the dev live pass: log mode, then enforce in dev.
  5. Release production token-exchange-api, then the three callers, all `log`.
  6. Bump production dex to `v2.30.101`.
  7. Run a week in production `log` mode (Task 16).
  8. Announce the behavior change to developers, naming the enforce date (Task 17 Step 1; index Rollout 2.6).
  9. Switch production to `enforce` (Task 17 Step 2).
  10. Set `SIGNER_CLAIM_REQUIRED_AFTER` (token-exchange-api only) to 14 days after the production dex release (Task 17 Step 4).
- **Commits and PRs:**
  - no `Co-Authored-By` trailer and no tool attribution in commit messages or PR descriptions;
  - stage files by path. Never commit the local `.gitignore` edits in the `dex`, `token-exchange-api`, `tesla-oracle`, `credit-tracker` and `cluster-helm-charts` checkouts.
- **Isolation:** work in a fresh git worktree off each remote default branch. The main checkouts hold unrelated work:
  - `vehicle-triggers-api` is on an unpushed `road-speed-limit-trigger` branch;
  - `tesla-oracle` is 20 commits behind with local edits;
  - `cluster-helm-charts` is on a feature branch.
- **Successor services** `dauth` and `vt` aren't live. Every PR description says they need the same check if they ship.

## Review Focus

These conditions are implied by the spec but not exercised by a happy-path test. Each line names the test that pins it and the task that owns it.

1. **A token minted for the mobile client (`aud` `dimo-driver`) whose `ethereum_address` is a license** must be checked. Token exchange grants on `ethereum_address`, and the dev-license middleware skips mobile tokens. Tests:
   - `TestSignerCheckOnExchange` "mobile-audience token for a license is checked" and "mobile-audience token for a non-license passes" (Task 7);
   - the `B_MOBILE` cutoff in live pass Step 7 (Task 15).
2. **Other ERC-1271 wallets with 65-byte signatures carry a meaningless claim**, and smart-account logins must not get one. Tests:
   - `TestRecoverSigner` (Task 2);
   - `TestCheckerNotLicenseSkipsTheChain` (Task 6);
   - `TestSignerCheck` "non-license answers true" (Task 8).
3. **Chain, Identity or gRPC outages:**
   - enforce answers 503;
   - log never refuses but counts `error`;
   - errors aren't cached;
   - a hung RPC is cut at 3 s or 5 s.

   Tests:
   - `TestMiddleware` enforce, log and error cases (Task 5);
   - `TestGRPCCheckerTimesOut` (Task 5);
   - `TestCheckerTimesOut` and `TestCheckerDoesNotCacheErrors` (Task 6).

4. **Claimless tokens:**
   - existing developers' tokens pass;
   - after `SIGNER_CLAIM_REQUIRED_AFTER`, a claimless **license** token issued later is refused;
   - a claimless non-license token passes.

   Test: `TestMiddleware` cutoff cases (Task 5).

5. **Webhooks created or changed before the columns existed, or by claimless tokens,** show neither field, and a later claimless change doesn't erase a member's mark. Tests, all in Task 11:
   - `TestSetTriggerUpdatedBySigner` (a zero signer keeps the stored mark);
   - `TestWebhookController_UpdateWebhookRecordsTheSigner` "a claimless target change does not mark";
   - `TestUpdateTriggerKeepsSignerColumns` (a stale whole-row update doesn't write an old mark back);
   - `TestWebhookChangesRecordTheSigner` "a claimless change records nothing";
   - the "omits them when unknown" list case.

---

## dex

### Task 1: pin every dex deployment to a version tag (before any dex merge)

**Files:**

- Modify (repo `cluster-helm-charts`):
  - `charts/dimo-dex/values.yaml:13-16`
  - `charts/dimo-dex/values-prod.yaml:10-13`
  - `charts/dimo-dex/values-roles-rights.yaml:12-15`
  - `charts/dimo-dex/values-roles-rights-prod.yaml:13-16`

**Interfaces:**

- Produces: all four dex deployments run `dimozone/dex:v2.30.100` with `pullPolicy: IfNotPresent`. Merging dex `master` no longer reaches any environment until a values file names the new tag. Tasks 4, 16 and the Rollback section rely on this.

Why: all four run `dimozone/dex:latest` with `pullPolicy: Always`. dex's `.github/workflows/dimo-docker.yaml` publishes `latest` on every `master` push, so any pod restart, in any environment, would pick up an unreleased merge.

The DIMO fork's newest tag is `v2.30.2`. That tag and `v2.30.0` and `v2.30.1` are upstream dexidp's tag names, inherited when the fork was made; DIMO has never cut its own release. Upstream also has `v2.30.3` and `v2.31.0` up to `v2.45.x`, and the local checkout has an `upstream` remote that fetches them. To keep DIMO's builds from sharing a name with an upstream release, use `v2.30.100` now and `v2.30.101` after the merge. They pass the Docker workflow's `vX.Y.Z` tag filter, and upstream will never publish them on its old 2.30 line. Before creating either, check that no local or remote tag has that name, and always push a tag by its full ref to `origin`.

- [ ] **Step 1: Tag the current dex `master` and wait for its image**

```bash
cd ~/workspace/dex
git fetch origin
git ls-remote --tags origin 'refs/tags/v2.30*' | awk '{print $2}' | sort -V | tail -2
git rev-parse -q --verify refs/tags/v2.30.100 && echo "v2.30.100 already exists locally: stop"
git ls-remote --tags origin refs/tags/v2.30.100; git ls-remote --tags upstream refs/tags/v2.30.100
git tag -a v2.30.100 origin/master -m "dex master before signer_address; pin point for console teams"
git push origin refs/tags/v2.30.100
```

Expected: the first `ls-remote` output ends with `refs/tags/v2.30.2^{}`, the collision checks print nothing, and the push prints `* [new tag] v2.30.100 -> v2.30.100`. Then wait for the Docker workflow on the tag:

```bash
gh run list --repo DIMO-Network/dex --workflow dimo-docker.yaml --limit 3
curl -s https://hub.docker.com/v2/repositories/dimozone/dex/tags/v2.30.100 | grep -o '"name":"v2.30.100"'
```

Expected: the run for `v2.30.100` is `completed success`, and the curl prints `"name":"v2.30.100"`.

- [ ] **Step 2: Pin the four values files**

```bash
git -C ~/workspace/cluster-helm-charts fetch origin
git -C ~/workspace/cluster-helm-charts worktree add ~/workspace/cluster-helm-charts-dex-pin -b chore/pin-dex-v2.30.100 origin/main
cd ~/workspace/cluster-helm-charts-dex-pin
```

In each of the four files, pin the `dex.image` block. Each file has exactly one `pullPolicy:` line and one `tag:` line (today `pullPolicy: Always` and `tag: "latest"`), so replace the whole lines, whatever their quoting:

```bash
sed -E -i '' -e 's/^( +pullPolicy:).*/\1 IfNotPresent/' -e 's/^( +tag:).*/\1 v2.30.100/' \
  charts/dimo-dex/values.yaml charts/dimo-dex/values-prod.yaml charts/dimo-dex/values-roles-rights.yaml charts/dimo-dex/values-roles-rights-prod.yaml
```

Each file's block then reads, comments aside:

```yaml
dex:
  image:
    repository: dimozone/dex
    pullPolicy: IfNotPresent
    tag: v2.30.100
```

Run:

```bash
grep -nE "^ +(pullPolicy|tag):" charts/dimo-dex/values.yaml charts/dimo-dex/values-prod.yaml charts/dimo-dex/values-roles-rights.yaml charts/dimo-dex/values-roles-rights-prod.yaml
helm lint charts/dimo-dex -f charts/dimo-dex/values-prod.yaml
```

Expected: eight lines, `pullPolicy: IfNotPresent` and `tag: v2.30.100` four times each, and `1 chart(s) linted, 0 chart(s) failed`.

- [ ] **Step 3: Commit, open the PR, merge, and confirm the rollout**

```bash
git add charts/dimo-dex/values.yaml charts/dimo-dex/values-prod.yaml charts/dimo-dex/values-roles-rights.yaml charts/dimo-dex/values-roles-rights-prod.yaml
git commit -m "chore(dimo-dex): pin every dex deployment to v2.30.100"
git push -u origin chore/pin-dex-v2.30.100
gh pr create --repo DIMO-Network/cluster-helm-charts --base main --head chore/pin-dex-v2.30.100 \
  --title "chore(dimo-dex): pin dex to v2.30.100 instead of latest" --body-file - <<'EOF'
## Why

All four dex deployments (dev, prod, roles-rights dev, roles-rights prod) run `dimozone/dex:latest` with `pullPolicy: Always`. Every push to dex `master` republishes `latest`, so the next pod restart in any environment picks up unreleased code. The console-teams work is about to merge a dex change (`signer_address` claim), and it must reach dev first and production only after a live pass.

## What

- `v2.30.100` is tagged at the current dex `master`, the code `latest` already runs everywhere.
- Pins all four values files to `tag: v2.30.100` with `pullPolicy: IfNotPresent`.

## Rollout

ArgoCD restarts dex pods onto an identical build. Afterwards, each environment moves to a newer dex only through a values change.
EOF
```

After review, merge. Once ArgoCD has synced, confirm in ArgoCD (or with `kubectl get pods -o jsonpath='{..image}'` in each namespace) that all four dex Deployments run `dimozone/dex:v2.30.100`.

### Task 2: web3 connector records the challenge signer

**Files:**

- Modify:
  - `connector/connector_dimo.go` (append a type)
  - `connector/web3/web3.go:4-17` (imports), `:131-134` (ERC-1271 success return), and a new func after `signHash` (`:137`)
- Test: `connector/web3/web3_test.go`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `connector.Web3SignerData struct { SignerAddress string \`json:"signer_address"\` }`, the JSON stored in `connector.Identity.ConnectorData` after an ERC-1271 login with a 65-byte signature;
  - `func recoverSigner(hash []byte, signature []byte) (common.Address, bool)`, internal to `web3`.

- [ ] **Step 1: Create the worktree**

```bash
git -C ~/workspace/dex worktree add ~/workspace/dex-signer-address-claim -b feat/signer-address-claim origin/master
cd ~/workspace/dex-signer-address-claim
go mod download
```

Expected: `Preparing worktree (new branch 'feat/signer-address-claim')`.

- [ ] **Step 2: Write the failing tests**

In `connector/web3/web3_test.go`, add `"encoding/json"` to the stdlib imports. Add this helper after `signMessage`:

```go
func signerData(t *testing.T, signer common.Address) []byte {
	t.Helper()
	data, err := json.Marshal(connector.Web3SignerData{SignerAddress: signer.Hex()})
	assert.NoError(t, err)
	return data
}
```

In `TestEOALogin`, replace the `identity` of the `"erc1271_success_verify_contract_signature"` case with:

```go
				identity: connector.Identity{
					UserID:        ctrAddr.Hex(),
					Username:      ctrAddr.Hex(),
					ConnectorData: signerData(t, crypto.PubkeyToAddress(ctrPk.PublicKey)),
				},
```

In `TestBlockchainBackend`, replace the `identity` of the `"success_valid_signer"` case with:

```go
				identity: connector.Identity{
					UserID:        ctrAddr.Hex(),
					Username:      ctrAddr.Hex(),
					ConnectorData: signerData(t, crypto.PubkeyToAddress(pk.PublicKey)),
				},
```

Append to the end of the file:

```go
func TestRecoverSigner(t *testing.T) {
	pk, addr, err := generateWallet()
	assert.NoError(t, err)

	sig, hash, err := signMessage("Mock Signable Message", pk)
	assert.NoError(t, err)

	withV := func(v byte) []byte {
		s := append([]byte(nil), sig...)
		s[64] = v
		return s
	}

	tests := map[string]struct {
		signature []byte
		want      common.Address
		ok        bool
	}{
		"recovery id 0 or 1":   {signature: sig, want: *addr, ok: true},
		"recovery id 27 or 28": {signature: withV(sig[64] + 27), want: *addr, ok: true},
		"64-byte signature":    {signature: sig[:64]},
		"Kernel smart-account signature longer than 65 bytes": {
			signature: append([]byte{0x01}, sig...),
		},
		"recovery id out of range": {signature: withV(31)},
		"all-zero signature":       {signature: make([]byte, 65)},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			before := append([]byte(nil), tc.signature...)

			got, ok := recoverSigner(hash, tc.signature)

			assert.Equal(t, tc.ok, ok)
			assert.Equal(t, tc.want, got)
			assert.Equal(t, before, tc.signature, "the caller's signature is not modified")
		})
	}
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `go test ./connector/web3/ -run 'TestEOALogin|TestBlockchainBackend|TestRecoverSigner' -v`
Expected: build failure: `undefined: connector.Web3SignerData` and `undefined: recoverSigner`.

- [ ] **Step 4: Add the connector data type**

Append to `connector/connector_dimo.go`:

```go
// Web3SignerData is the ConnectorData the web3 connector attaches to an identity it
// verified through ERC-1271 with a plain 65-byte ECDSA signature: the EOA that signed the
// challenge. For a developer license, whose license account accepts a signature only when
// isSigner(recovered) is true, this is the license signer (API key) that minted the token.
// The server emits it as the signer_address claim.
type Web3SignerData struct {
	SignerAddress string `json:"signer_address"`
}
```

- [ ] **Step 5: Record the signer in the connector**

In `connector/web3/web3.go`, add `"encoding/json"` as the first stdlib import. Replace the success return at the end of `VerifyERC1271Signature` (lines 131-134):

```go
	return connector.Identity{
		UserID:   contractAddress.Hex(),
		Username: contractAddress.Hex(),
	}, nil
```

with:

```go
	identity = connector.Identity{
		UserID:   contractAddress.Hex(),
		Username: contractAddress.Hex(),
	}
	if signer, ok := recoverSigner(hash, signature); ok {
		data, err := json.Marshal(connector.Web3SignerData{SignerAddress: signer.Hex()})
		if err != nil {
			return identity, fmt.Errorf("failed to encode signer data: %w", err)
		}
		identity.ConnectorData = data
	}
	return identity, nil
```

Add after `signHash`:

```go
// recoverSigner returns the EOA behind a plain 65-byte ECDSA signature over hash, the same
// recovery a developer license account performs before it calls isSigner. Smart-account
// signatures (other lengths or recovery ids) report false, so those logins carry no signer.
func recoverSigner(hash []byte, signature []byte) (common.Address, bool) {
	if len(signature) != 65 {
		return common.Address{}, false
	}
	sig := make([]byte, 65)
	copy(sig, signature)
	if sig[64] >= 27 {
		sig[64] -= 27
	}
	if sig[64] > 1 {
		return common.Address{}, false
	}
	pub, err := crypto.SigToPub(hash, sig)
	if err != nil {
		return common.Address{}, false
	}
	return crypto.PubkeyToAddress(*pub), true
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `go test ./connector/web3/ -run 'TestEOALogin|TestBlockchainBackend|TestRecoverSigner' -v`
Expected: `PASS` for every subtest. `TestEOALogin/success_verify_signature` is unchanged, because EOA logins carry no `ConnectorData`.

- [ ] **Step 7: Commit**

```bash
git add connector/connector_dimo.go connector/web3/web3.go connector/web3/web3_test.go
git commit -m "feat(web3): record the challenge signer on ERC-1271 developer-license logins"
```

### Task 3: dex emits the `signer_address` claim through the real submit_challenge chain

**Files:**

- Create: `server/signer_claim_dimo.go`, `server/signer_claim_dimo_test.go`
- Modify:
  - `server/oauth2.go:293` (claims struct) and `:399-406` (`tok` literal in `newIDToken`)
  - `server/handlers.go:964` (first line of `exchangeAuthCode`)
- Test: `server/signer_claim_dimo_test.go`

**Interfaces:**

- Consumes: `connector.Web3SignerData` (Task 2); `addressRegex` (`server/handlers_dimo.go`); `ConnectorsConfig` and `ConnectorConfig` (`server/server.go:627-655`).
- Produces:
  - `signer_address` on the access token and ID token returned by the authorization-code grant, including `/auth/web3/submit_challenge`, whose `access_token` is the developer JWT;
  - internal: `withSignerAddress(ctx, connectorData []byte) context.Context` and `signerAddressFromContext(ctx) string`.

**Scope note:** implicit and hybrid responses (`server/handlers.go:744-757`, `responseTypeToken` and `responseTypeIDToken`) mint tokens from the auth request without going through `exchangeAuthCode`, so they never carry the claim. Production enables only the code flow: no `responseTypes` is configured in `cluster-helm-charts/charts/dimo-dex/values-prod.yaml`, so `server/server.go:229-230` defaults to `[code]`. Enabling either flow later would need the same plumbing. The comment on `withSignerAddress` records this.

- [ ] **Step 1: Write the failing tests**

Create `server/signer_claim_dimo_test.go`:

```go
package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/dexidp/dex/connector"
	"github.com/dexidp/dex/storage"
)

const (
	testLicense       = "0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37"
	testSignerLower   = "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"
	testSignerChecked = "0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5"
	testDomain        = "https://example.com/callback"
)

func tokenClaims(t *testing.T, token string) map[string]any {
	t.Helper()
	parts := strings.Split(token, ".")
	require.Len(t, parts, 3)
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	require.NoError(t, err)
	var claims map[string]any
	require.NoError(t, json.Unmarshal(payload, &claims))
	return claims
}

func requireSignerClaim(t *testing.T, accessToken, idToken, want string) {
	t.Helper()
	for name, token := range map[string]string{"access token": accessToken, "ID token": idToken} {
		claims := tokenClaims(t, token)
		require.Equal(t, testLicense, claims["ethereum_address"], name)
		if want == "" {
			require.NotContains(t, claims, "signer_address", name)
		} else {
			require.Equal(t, want, claims["signer_address"], name)
		}
	}
}

func TestExchangeAuthCodeSignerAddressClaim(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	httpServer, s := newTestServer(ctx, t, nil)
	defer httpServer.Close()

	client := storage.Client{ID: testLicense, Secret: "secret", RedirectURIs: []string{testDomain}}
	require.NoError(t, s.storage.CreateClient(ctx, client))

	tests := []struct {
		name          string
		connectorData []byte
		want          string
	}{
		{name: "web3 signer data adds the checksummed claim", connectorData: []byte(`{"signer_address":"` + testSignerLower + `"}`), want: testSignerChecked},
		{name: "no connector data omits the claim"},
		{name: "another connector's data omits the claim", connectorData: []byte(`{"RefreshToken":"abc"}`)},
		{name: "a malformed address omits the claim", connectorData: []byte(`{"signer_address":"0x1234"}`)},
		{name: "non-JSON connector data omits the claim", connectorData: []byte("opaque")},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			authCode := storage.AuthCode{
				ID:            storage.NewID(),
				ClientID:      client.ID,
				RedirectURI:   testDomain,
				ConnectorID:   "mock",
				Scopes:        []string{"openid", "email"},
				Claims:        storage.Claims{UserID: client.ID, Username: client.ID},
				Expiry:        time.Now().Add(time.Minute),
				ConnectorData: tc.connectorData,
			}
			require.NoError(t, s.storage.CreateAuthCode(ctx, authCode))

			resp, err := s.exchangeAuthCode(ctx, httptest.NewRecorder(), authCode, client)
			require.NoError(t, err)

			requireSignerClaim(t, resp.AccessToken, resp.IDToken, tc.want)
		})
	}
}

// web3StubConfig opens a Web3 connector that accepts any signature and reports Signer as
// the challenge signer, so the generate_challenge → submit_challenge → token chain runs
// end to end without a blockchain.
type web3StubConfig struct {
	Signer string `json:"signer"`
}

func (c *web3StubConfig) Open(string, *slog.Logger) (connector.Connector, error) {
	return web3Stub{signer: c.Signer}, nil
}

type web3Stub struct{ signer string }

func (web3Stub) InfuraID() string { return "" }

func (w web3Stub) Verify(address, _, _ string) (connector.Identity, error) {
	identity := connector.Identity{UserID: address, Username: address}
	if w.signer != "" {
		data, err := json.Marshal(connector.Web3SignerData{SignerAddress: w.signer})
		if err != nil {
			return identity, err
		}
		identity.ConnectorData = data
	}
	return identity, nil
}

func postForm(t *testing.T, endpoint string, form url.Values) []byte {
	t.Helper()
	resp, err := http.PostForm(endpoint, form)
	require.NoError(t, err)
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode, string(body))
	return body
}

func TestSubmitChallengeSignerAddressClaim(t *testing.T) {
	ConnectorsConfig["web3Stub"] = func() ConnectorConfig { return new(web3StubConfig) }
	t.Cleanup(func() { delete(ConnectorsConfig, "web3Stub") })

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	httpServer, s := newTestServer(ctx, t, nil)
	defer httpServer.Close()

	// Developer-license clients have no secret.
	require.NoError(t, s.storage.CreateClient(ctx, storage.Client{ID: testLicense, RedirectURIs: []string{testDomain}}))

	tests := []struct {
		name        string
		connectorID string
		signer      string
		want        string
	}{
		{name: "an ERC-1271 developer-license login carries the signer", connectorID: "web3-signer", signer: testSignerLower, want: testSignerChecked},
		{name: "a login without a recovered signer carries no claim", connectorID: "web3-plain"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			config, err := json.Marshal(web3StubConfig{Signer: tc.signer})
			require.NoError(t, err)
			require.NoError(t, s.storage.CreateConnector(ctx, storage.Connector{
				ID: tc.connectorID, Type: "web3Stub", Name: tc.connectorID, ResourceVersion: "1", Config: config,
			}))

			var gen struct {
				State     string `json:"state"`
				Challenge string `json:"challenge"`
			}
			require.NoError(t, json.Unmarshal(postForm(t, httpServer.URL+"/auth/"+tc.connectorID+"/generate_challenge", url.Values{
				"client_id":     {testLicense},
				"domain":        {testDomain},
				"scope":         {"openid email"},
				"response_type": {"code"},
				"address":       {testLicense},
			}), &gen))
			require.NotEmpty(t, gen.State)

			var tokens struct {
				AccessToken string `json:"access_token"`
				IDToken     string `json:"id_token"`
			}
			require.NoError(t, json.Unmarshal(postForm(t, httpServer.URL+"/auth/"+tc.connectorID+"/submit_challenge", url.Values{
				"client_id":  {testLicense},
				"domain":     {testDomain},
				"state":      {gen.State},
				"grant_type": {"authorization_code"},
				"signature":  {"0x00"},
			}), &tokens))

			requireSignerClaim(t, tokens.AccessToken, tokens.IDToken, tc.want)
		})
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `go test ./server/ -run 'TestExchangeAuthCodeSignerAddressClaim|TestSubmitChallengeSignerAddressClaim' -v`
Expected:

- `FAIL` in `web3_signer_data_adds_the_checksummed_claim` and in `an_ERC-1271_developer-license_login_carries_the_signer`, each with `expected "0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5" actual <nil>`;
- the claim-less subtests pass.

This confirms the whole chain runs: generate_challenge → finalizeLogin → auth code → token.

- [ ] **Step 3: Carry the signer from the auth code to the tokens**

Create `server/signer_claim_dimo.go`:

```go
package server

import (
	"context"
	"encoding/json"

	"github.com/ethereum/go-ethereum/common"

	"github.com/dexidp/dex/connector"
)

// signerAddressKey carries the developer-license signer from an auth code to the tokens
// minted for it.
type signerAddressKey struct{}

// withSignerAddress returns ctx carrying, checksummed, the signer the web3 connector stored
// in the auth code's connector data (see connector.Web3SignerData). Connector data from any
// other connector, or without a well-formed address, leaves ctx unchanged.
//
// Only exchangeAuthCode calls this, so only the authorization-code flow carries the claim.
// Implicit and hybrid responses (handleApproval's responseTypeToken and responseTypeIDToken
// cases) mint tokens without it; production enables only the code flow (server.go defaults
// SupportedResponseTypes to [code]). Enabling either flow needs the same call there.
func withSignerAddress(ctx context.Context, connectorData []byte) context.Context {
	if len(connectorData) == 0 {
		return ctx
	}
	var data connector.Web3SignerData
	if err := json.Unmarshal(connectorData, &data); err != nil || !addressRegex.MatchString(data.SignerAddress) {
		return ctx
	}
	return context.WithValue(ctx, signerAddressKey{}, common.HexToAddress(data.SignerAddress).Hex())
}

// signerAddressFromContext returns the signer set by withSignerAddress, or "".
func signerAddressFromContext(ctx context.Context) string {
	signer, _ := ctx.Value(signerAddressKey{}).(string)
	return signer
}
```

In `server/oauth2.go`, below `EthereumAddress` in `idTokenClaims` (line 293):

```go
	EthereumAddress string `json:"ethereum_address,omitempty"`
	// SignerAddress is the developer-license signer (API key) that signed the web3
	// challenge, set on ERC-1271 developer-license logins. DIMO addition.
	SignerAddress string `json:"signer_address,omitempty"`
```

In `newIDToken`, add the field to the `tok` literal (lines 399-406):

```go
	tok := idTokenClaims{
		Issuer:        s.issuerURL.String(),
		Subject:       subjectString,
		Nonce:         nonce,
		Expiry:        expiry.Unix(),
		IssuedAt:      issuedAt.Unix(),
		ProviderID:    connID,
		SignerAddress: signerAddressFromContext(ctx),
	}
```

In `server/handlers.go`, make this the first statement of `exchangeAuthCode` (line 964):

```go
func (s *Server) exchangeAuthCode(ctx context.Context, w http.ResponseWriter, authCode storage.AuthCode, client storage.Client) (*accessTokenResponse, error) {
	ctx = withSignerAddress(ctx, authCode.ConnectorData)
	accessToken, _, err := s.newAccessToken(ctx, client.ID, authCode.Claims, authCode.Scopes, authCode.Nonce, authCode.ConnectorID)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `go test ./server/ -run 'TestExchangeAuthCodeSignerAddressClaim|TestSubmitChallengeSignerAddressClaim' -v`
Expected: `PASS`, all seven subtests.

- [ ] **Step 5: Run the affected packages and lint**

```bash
go test ./server/ ./connector/...
make bin/golangci-lint
make lint
```

Expected: `ok` for every package and no lint findings. If gci or gofumpt flag the new files, run `make fix`, re-run `make lint`, and include the formatting in the commit.

- [ ] **Step 6: Commit**

```bash
git add server/signer_claim_dimo.go server/signer_claim_dimo_test.go server/oauth2.go server/handlers.go
git commit -m "feat(server): emit signer_address on developer JWTs minted through web3 ERC-1271 logins"
```

### Task 4: dex pull request, release tag and dev pin

**Files:** `cluster-helm-charts` `charts/dimo-dex/values.yaml:16` (dev only).

**Interfaces:**

- Consumes: Task 1 merged.
- Produces:
  - `dimozone/dex:v2.30.101` with the claim;
  - **dev** dex (`values.yaml`) pinned to it.

Production (`values-prod.yaml`) is bumped only in Task 16. The roles-rights deployments stay on `v2.30.100`: they mint vehicle JWTs through gRPC and never run the web3 code flow.

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/dex-signer-address-claim
git push -u origin feat/signer-address-claim
gh pr create --repo DIMO-Network/dex --base master --head feat/signer-address-claim \
  --title "feat: signer_address claim on developer JWTs" --body-file - <<'EOF'
## Why

Developer JWTs name the license (`ethereum_address` = client ID) but not the API key (license signer) that minted them. Disabling a signer stops new tokens, but existing ones keep working for their full 336 hours. token-exchange-api, vehicle-triggers-api, tesla-oracle and credit-tracker will check `isSigner(signer_address)` on each request; this is the first half.

## What

- **web3 connector:** after a successful ERC-1271 verification with a plain 65-byte ECDSA signature, it recovers the signing EOA (the same recovery the license account does before `isSigner`). It stores the address in `Identity.ConnectorData` as `{"signer_address": "0x…"}`.
  - ZeroDev Kernel v3.1 logins (the console's) have longer signatures and get nothing.
  - EOA logins are unchanged.
  - The claim is emitted whatever the client ID. Other 65-byte ERC-1271 wallets get a claim that means nothing; consumers only check it when `ethereum_address` is a developer license.
- **`exchangeAuthCode`:** reads that connector data, and `newIDToken` emits `signer_address` (checksummed) on both the access token and the ID token.
  - Connector data already lives in the existing `auth_request` and `auth_code` columns, so there is no storage migration.
  - Only the authorization-code flow sets it. Implicit and hybrid responses don't, and production enables only `code`.

## Release

Don't let `latest` reach production. Every deployment is pinned to `v2.30.100` (cluster-helm-charts PR). After merge, tag `v2.30.101` and pin **dev** only; production follows after the console-teams live pass.

## Successor services

`dauth` isn't live. If it replaces dex, it must emit the same claim.

## Tests

- `TestRecoverSigner`.
- Updated ERC-1271 cases in `TestEOALogin` and `TestBlockchainBackend`.
- `TestExchangeAuthCodeSignerAddressClaim`: present, absent, another connector's data, malformed, non-JSON.
- `TestSubmitChallengeSignerAddressClaim`: end to end through `generate_challenge` → `finalizeLogin` → code → token, with a stub Web3 connector, with and without a signer.
EOF
```

Expected: a PR URL. Merge after review and green CI. Merging only republishes `latest`, which nothing runs any more.

- [ ] **Step 2: Tag the merge and pin dev**

```bash
cd ~/workspace/dex && git fetch origin
git log --oneline -1 origin/master
git rev-parse -q --verify refs/tags/v2.30.101 && echo "v2.30.101 already exists locally: stop"
git ls-remote --tags origin refs/tags/v2.30.101; git ls-remote --tags upstream refs/tags/v2.30.101
git tag -a v2.30.101 origin/master -m "signer_address claim on developer JWTs"
git push origin refs/tags/v2.30.101
curl -s https://hub.docker.com/v2/repositories/dimozone/dex/tags/v2.30.101 | grep -o '"name":"v2.30.101"'
```

Expected: `origin/master` is the merge commit, the collision checks print nothing, and the curl prints `"name":"v2.30.101"` once the Docker workflow finishes.

```bash
git -C ~/workspace/cluster-helm-charts fetch origin
git -C ~/workspace/cluster-helm-charts worktree add ~/workspace/cluster-helm-charts-dex-dev -b chore/dex-dev-v2.30.101 origin/main
cd ~/workspace/cluster-helm-charts-dex-dev
sed -E -i '' 's/^( +tag:).*/\1 v2.30.101/' charts/dimo-dex/values.yaml
grep -nE "^ +(tag|pullPolicy):" charts/dimo-dex/values.yaml
git diff --stat
git add charts/dimo-dex/values.yaml
git commit -m "chore(dimo-dex): dev dex to v2.30.101 (signer_address claim)"
git push -u origin chore/dex-dev-v2.30.101
gh pr create --repo DIMO-Network/cluster-helm-charts --base main --head chore/dex-dev-v2.30.101 \
  --title "chore(dimo-dex): dev dex to v2.30.101" \
  --body "Dev only. v2.30.101 adds the signer_address claim to developer JWTs (DIMO-Network/dex). Production stays on v2.30.100 until the console-teams platform live pass in dev succeeds. Roles-rights deployments stay on v2.30.100."
```

Expected: the `grep` shows `pullPolicy: IfNotPresent` and `tag: v2.30.101`, and `git diff --stat` shows `charts/dimo-dex/values.yaml | 2 +-` only. Merge, then confirm in ArgoCD that dev dex runs `dimozone/dex:v2.30.101`.

---

## token-exchange-api

### Task 5: shared `pkg/signercheck` package (modes, metric, middleware, gRPC client)

The proto change is in Task 8. This task adds the package's types, middleware and metric, plus a gRPC client written against the `SignerCheck` RPC that Task 8 generates. Do Steps 1-6 here, generate the RPC in Task 8 Steps 1-2, then come back for Step 7.

**Files:**

- Create: `pkg/signercheck/signercheck.go`, `pkg/signercheck/signercheck_test.go`, `pkg/signercheck/grpc.go`, `pkg/signercheck/grpc_test.go`

**Interfaces:**

- Consumes: `txgrpc.TokenExchangeServiceClient`, `txgrpc.SignerCheckRequest` and `txgrpc.SignerCheckResponse` (`github.com/DIMO-Network/token-exchange-api/pkg/grpc`, Task 8).
- Produces (imported by Tasks 6-8, 10, 13 and 14):

```go
type Mode string // ModeEnforce "enforce", ModeLog "log", ModeOff "off"
func ParseMode(s string) (Mode, error) // "" → ModeEnforce

type Result int // Allowed, Denied, NotLicense
type Checker interface {
	Check(ctx context.Context, license, signer common.Address) (Result, error)
}

const MessageDenied = "signer no longer authorized for this license"
const MessageUnavailable = "could not verify signer"

type TokenInfo struct {
	License  common.Address // ethereum_address; zero when missing
	Signer   string         // signer_address as sent; "" when missing
	IssuedAt time.Time      // iat; zero when missing
}

type Config struct {
	Service            string
	Mode               Mode
	Checker            Checker
	Token              func(c *fiber.Ctx) (TokenInfo, error)
	ClaimRequiredAfter time.Time                                           // optional
	IsLicense          func(ctx context.Context, addr common.Address) (bool, error) // required with ClaimRequiredAfter
	Logger             zerolog.Logger
}
func Middleware(cfg Config) fiber.Handler
func MapClaimsToken(localsKey string) func(c *fiber.Ctx) (TokenInfo, error)

const GRPCTimeout = 5 * time.Second
func NewGRPCChecker(client txgrpc.TokenExchangeServiceClient) *GRPCChecker // implements Checker
```

Metric: `signer_check_total{service, result}`, `result` ∈ `allowed|denied|error|skipped`, registered once per process through `promauto`.

- [ ] **Step 1: Create the worktree**

```bash
git -C ~/workspace/token-exchange-api fetch origin
git -C ~/workspace/token-exchange-api worktree add ~/workspace/token-exchange-api-signer-check -b feat/signer-check origin/main
cd ~/workspace/token-exchange-api-signer-check
go mod download
```

Expected: `Preparing worktree (new branch 'feat/signer-check')`.

- [ ] **Step 2: Write the failing middleware tests**

Create `pkg/signercheck/signercheck_test.go`:

```go
package signercheck

import (
	"context"
	"errors"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

var (
	testLicense = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	testSigner  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
	cutoff      = time.Unix(1_800_000_000, 0)
)

type fakeChecker struct {
	result Result
	err    error
	calls  int
}

func (f *fakeChecker) Check(context.Context, common.Address, common.Address) (Result, error) {
	f.calls++
	return f.result, f.err
}

func TestParseMode(t *testing.T) {
	for in, want := range map[string]Mode{"": ModeEnforce, "enforce": ModeEnforce, "log": ModeLog, "off": ModeOff} {
		got, err := ParseMode(in)
		require.NoError(t, err)
		require.Equal(t, want, got)
	}
	_, err := ParseMode("Enforce")
	require.ErrorContains(t, err, "SIGNER_CHECK_MODE")
}

func TestMiddleware(t *testing.T) {
	withSigner := TokenInfo{License: testLicense, Signer: testSigner.Hex(), IssuedAt: cutoff.Add(time.Hour)}
	claimless := TokenInfo{License: testLicense, IssuedAt: cutoff.Add(time.Hour)}
	licenseLookup := func(ok bool, err error) func(context.Context, common.Address) (bool, error) {
		return func(context.Context, common.Address) (bool, error) { return ok, err }
	}

	tests := []struct {
		name       string
		mode       Mode
		token      TokenInfo
		checker    *fakeChecker
		cutoff     time.Time
		isLicense  func(context.Context, common.Address) (bool, error)
		wantStatus int
		wantBody   string
		wantResult string
		wantCalls  int
	}{
		{name: "enforce allows an enabled signer", mode: ModeEnforce, token: withSigner, checker: &fakeChecker{result: Allowed}, wantStatus: 200, wantResult: "allowed", wantCalls: 1},
		{name: "enforce refuses a disabled signer", mode: ModeEnforce, token: withSigner, checker: &fakeChecker{result: Denied}, wantStatus: 403, wantBody: MessageDenied, wantResult: "denied", wantCalls: 1},
		{name: "enforce answers 503 when the check fails", mode: ModeEnforce, token: withSigner, checker: &fakeChecker{err: errors.New("rpc down")}, wantStatus: 503, wantBody: MessageUnavailable, wantResult: "error", wantCalls: 1},
		{name: "log lets a disabled signer through and counts it", mode: ModeLog, token: withSigner, checker: &fakeChecker{result: Denied}, wantStatus: 200, wantResult: "denied", wantCalls: 1},
		{name: "log lets a failed check through and counts it", mode: ModeLog, token: withSigner, checker: &fakeChecker{err: errors.New("rpc down")}, wantStatus: 200, wantResult: "error", wantCalls: 1},
		{name: "off skips the check", mode: ModeOff, token: withSigner, checker: &fakeChecker{result: Denied}, wantStatus: 200, wantResult: "skipped"},
		{name: "a token without signer_address is skipped", mode: ModeEnforce, token: TokenInfo{License: testLicense}, checker: &fakeChecker{result: Denied}, wantStatus: 200, wantResult: "skipped"},
		{name: "a token without ethereum_address is skipped", mode: ModeEnforce, token: TokenInfo{Signer: testSigner.Hex()}, checker: &fakeChecker{result: Denied}, wantStatus: 200, wantResult: "skipped"},
		{name: "a non-license is skipped", mode: ModeEnforce, token: withSigner, checker: &fakeChecker{result: NotLicense}, wantStatus: 200, wantResult: "skipped", wantCalls: 1},
		{name: "a malformed claim is refused without a check", mode: ModeEnforce, token: TokenInfo{License: testLicense, Signer: "0x1234"}, checker: &fakeChecker{result: Allowed}, wantStatus: 403, wantBody: MessageDenied, wantResult: "denied"},
		{name: "cutoff refuses a claimless license token issued after it", mode: ModeEnforce, token: claimless, checker: &fakeChecker{}, cutoff: cutoff, isLicense: licenseLookup(true, nil), wantStatus: 403, wantBody: MessageDenied, wantResult: "denied"},
		{name: "cutoff lets a claimless token issued before it through", mode: ModeEnforce, token: TokenInfo{License: testLicense, IssuedAt: cutoff.Add(-time.Hour)}, checker: &fakeChecker{}, cutoff: cutoff, isLicense: licenseLookup(true, nil), wantStatus: 200, wantResult: "skipped"},
		{name: "cutoff lets a claimless non-license through", mode: ModeEnforce, token: claimless, checker: &fakeChecker{}, cutoff: cutoff, isLicense: licenseLookup(false, nil), wantStatus: 200, wantResult: "skipped"},
		{name: "cutoff answers 503 when the license lookup fails", mode: ModeEnforce, token: claimless, checker: &fakeChecker{}, cutoff: cutoff, isLicense: licenseLookup(false, errors.New("identity down")), wantStatus: 503, wantBody: MessageUnavailable, wantResult: "error"},
		{name: "cutoff in log mode lets it through and counts it", mode: ModeLog, token: claimless, checker: &fakeChecker{}, cutoff: cutoff, isLicense: licenseLookup(true, nil), wantStatus: 200, wantResult: "denied"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			service := "test-" + tc.name
			app := fiber.New()
			app.Get("/", Middleware(Config{
				Service:            service,
				Mode:               tc.mode,
				Checker:            tc.checker,
				Token:              func(*fiber.Ctx) (TokenInfo, error) { return tc.token, nil },
				ClaimRequiredAfter: tc.cutoff,
				IsLicense:          tc.isLicense,
				Logger:             zerolog.Nop(),
			}), func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

			resp, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
			require.NoError(t, err)
			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			require.Equal(t, tc.wantStatus, resp.StatusCode, string(body))
			if tc.wantBody != "" {
				require.Equal(t, tc.wantBody, string(body))
			}
			require.Equal(t, tc.wantCalls, tc.checker.calls)
			require.Equal(t, 1.0, testutil.ToFloat64(checks.WithLabelValues(service, tc.wantResult)))
		})
	}
}

func TestMapClaimsToken(t *testing.T) {
	read := func(claims jwt.MapClaims) TokenInfo {
		app := fiber.New()
		var got TokenInfo
		app.Get("/", func(c *fiber.Ctx) error {
			if claims != nil {
				c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, claims))
			}
			var err error
			got, err = MapClaimsToken("user")(c)
			require.NoError(t, err)
			return c.SendStatus(fiber.StatusOK)
		})
		_, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
		require.NoError(t, err)
		return got
	}

	got := read(jwt.MapClaims{
		"ethereum_address": "0x299671d2b32ed62cc61ce65d8f2b9e4f78486b37",
		"signer_address":   "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5",
		"iat":              float64(cutoff.Unix()),
	})
	require.Equal(t, TokenInfo{License: testLicense, Signer: "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5", IssuedAt: cutoff}, got)

	require.Equal(t, TokenInfo{}, read(nil), "no token")
	require.Equal(t, TokenInfo{License: testLicense}, read(jwt.MapClaims{"ethereum_address": testLicense.Hex()}), "no signer claim")
	require.Equal(t, "invalid", read(jwt.MapClaims{"ethereum_address": testLicense.Hex(), "signer_address": 42}).Signer, "a non-string claim is malformed")
	require.Equal(t, common.Address{}, read(jwt.MapClaims{"ethereum_address": "not-an-address"}).License)
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `go test ./pkg/signercheck/ -v`
Expected: build failure: `undefined: Mode`, `undefined: Middleware`, `undefined: checks`, `undefined: MapClaimsToken`.

- [ ] **Step 4: Implement the package**

Create `pkg/signercheck/signercheck.go`:

```go
// Package signercheck refuses developer JWTs whose license signer (API key) has been
// disabled since the token was minted. It holds what every DIMO service shares: the
// SIGNER_CHECK_MODE setting, the signer_check_total metric, a Fiber middleware, and a
// client for token-exchange-api's SignerCheck gRPC.
package signercheck

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/rs/zerolog"
)

// Mode is the SIGNER_CHECK_MODE setting.
type Mode string

const (
	// ModeEnforce refuses disabled signers. It is the default.
	ModeEnforce Mode = "enforce"
	// ModeLog runs the check, logs and counts what it would refuse, and refuses nothing.
	ModeLog Mode = "log"
	// ModeOff skips the check.
	ModeOff Mode = "off"
)

// ParseMode reads SIGNER_CHECK_MODE. Empty means enforce.
func ParseMode(s string) (Mode, error) {
	switch Mode(s) {
	case "", ModeEnforce:
		return ModeEnforce, nil
	case ModeLog, ModeOff:
		return Mode(s), nil
	default:
		return "", fmt.Errorf("SIGNER_CHECK_MODE must be enforce, log or off, got %q", s)
	}
}

// Result is the outcome of checking a signer against a license.
type Result int

const (
	// Allowed means signer is an enabled signer on the license.
	Allowed Result = iota
	// Denied means it isn't.
	Denied
	// NotLicense means the address isn't a developer license, so there is nothing to check.
	NotLicense
)

// Checker checks whether signer may still act for license.
type Checker interface {
	Check(ctx context.Context, license, signer common.Address) (Result, error)
}

const (
	// MessageDenied is the 403 body for a disabled signer.
	MessageDenied = "signer no longer authorized for this license"
	// MessageUnavailable is the 503 body when the check can't complete.
	MessageUnavailable = "could not verify signer"
)

const (
	resultAllowed = "allowed"
	resultDenied  = "denied"
	resultError   = "error"
	resultSkipped = "skipped"
)

var checks = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "signer_check_total",
	Help: "Developer JWT signer checks by service and result (allowed, denied, error, skipped).",
}, []string{"service", "result"})

// TokenInfo is what the middleware reads from the request's already-verified JWT.
type TokenInfo struct {
	// License is the ethereum_address claim; the zero address when it is missing.
	License common.Address
	// Signer is the signer_address claim as sent; empty when it is missing.
	Signer string
	// IssuedAt is the iat claim; the zero time when it is missing.
	IssuedAt time.Time
}

// Config configures Middleware.
type Config struct {
	// Service is the metric's service label, e.g. "vehicle-triggers-api".
	Service string
	Mode    Mode
	Checker Checker
	// Token reads the request's verified JWT. Mount the middleware after the JWT middleware.
	Token func(c *fiber.Ctx) (TokenInfo, error)
	// ClaimRequiredAfter, when set, refuses license tokens issued after it that lack
	// signer_address (SIGNER_CLAIM_REQUIRED_AFTER). Only token-exchange-api sets it.
	ClaimRequiredAfter time.Time
	// IsLicense reports whether an address is a developer license. Required with
	// ClaimRequiredAfter.
	IsLicense func(ctx context.Context, addr common.Address) (bool, error)
	Logger    zerolog.Logger
}

// Middleware checks the request's developer JWT whenever it carries signer_address, and
// acts on the answer according to cfg.Mode.
func Middleware(cfg Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if cfg.Mode == ModeOff {
			checks.WithLabelValues(cfg.Service, resultSkipped).Inc()
			return c.Next()
		}
		tok, err := cfg.Token(c)
		if err != nil {
			return err
		}
		if tok.License == (common.Address{}) {
			checks.WithLabelValues(cfg.Service, resultSkipped).Inc()
			return c.Next()
		}
		ctx := c.UserContext()

		if tok.Signer == "" {
			if cfg.ClaimRequiredAfter.IsZero() || !tok.IssuedAt.After(cfg.ClaimRequiredAfter) {
				checks.WithLabelValues(cfg.Service, resultSkipped).Inc()
				return c.Next()
			}
			isLicense, err := cfg.IsLicense(ctx, tok.License)
			if err != nil {
				return cfg.refuse(c, resultError, tok, err)
			}
			if !isLicense {
				checks.WithLabelValues(cfg.Service, resultSkipped).Inc()
				return c.Next()
			}
			return cfg.refuse(c, resultDenied, tok, errors.New("license token issued after SIGNER_CLAIM_REQUIRED_AFTER without signer_address"))
		}

		if !common.IsHexAddress(tok.Signer) {
			return cfg.refuse(c, resultDenied, tok, errors.New("malformed signer_address"))
		}
		result, err := cfg.Checker.Check(ctx, tok.License, common.HexToAddress(tok.Signer))
		switch {
		case err != nil:
			return cfg.refuse(c, resultError, tok, err)
		case result == Denied:
			return cfg.refuse(c, resultDenied, tok, errors.New("signer is not enabled on the license"))
		case result == NotLicense:
			checks.WithLabelValues(cfg.Service, resultSkipped).Inc()
		default:
			checks.WithLabelValues(cfg.Service, resultAllowed).Inc()
		}
		return c.Next()
	}
}

// refuse counts and logs a denial or error, then refuses in enforce mode and lets the
// request through in log mode.
func (cfg Config) refuse(c *fiber.Ctx, result string, tok TokenInfo, reason error) error {
	checks.WithLabelValues(cfg.Service, result).Inc()
	cfg.Logger.Warn().Err(reason).
		Str("service", cfg.Service).
		Str("mode", string(cfg.Mode)).
		Str("result", result).
		Str("license", tok.License.Hex()).
		Str("signer", tok.Signer).
		Msg("Signer check refused a developer JWT.")
	if cfg.Mode != ModeEnforce {
		return c.Next()
	}
	if result == resultError {
		return fiber.NewError(fiber.StatusServiceUnavailable, MessageUnavailable)
	}
	return fiber.NewError(fiber.StatusForbidden, MessageDenied)
}

// MapClaimsToken reads TokenInfo from the *jwt.Token that gofiber/contrib/jwt stores in
// c.Locals(localsKey) with its default jwt.MapClaims. A missing token or claim yields the
// zero values, which Middleware skips. A signer_address that isn't a string reads as
// "invalid", which Middleware refuses as malformed.
func MapClaimsToken(localsKey string) func(c *fiber.Ctx) (TokenInfo, error) {
	return func(c *fiber.Ctx) (TokenInfo, error) {
		token, ok := c.Locals(localsKey).(*jwt.Token)
		if !ok {
			return TokenInfo{}, nil
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return TokenInfo{}, nil
		}
		var info TokenInfo
		if addr, ok := claims["ethereum_address"].(string); ok && common.IsHexAddress(addr) {
			info.License = common.HexToAddress(addr)
		}
		if raw, present := claims["signer_address"]; present {
			signer, ok := raw.(string)
			if !ok || signer == "" {
				signer = "invalid"
			}
			info.Signer = signer
		}
		if iat, err := claims.GetIssuedAt(); err == nil && iat != nil {
			info.IssuedAt = iat.Time
		}
		return info, nil
	}
}
```

- [ ] **Step 5: Run the middleware tests to verify they pass**

Run: `go test ./pkg/signercheck/ -run 'TestParseMode|TestMiddleware|TestMapClaimsToken' -v`
Expected: `PASS`, including all 15 `TestMiddleware` subtests.

- [ ] **Step 6: Commit the middleware**

```bash
git add pkg/signercheck/signercheck.go pkg/signercheck/signercheck_test.go
git commit -m "feat(signercheck): shared signer-check mode, metric and middleware"
```

- [ ] **Step 7: After Task 8 Steps 1-2 have generated `SignerCheck`, add the gRPC client test**

Create `pkg/signercheck/grpc_test.go`:

```go
package signercheck

import (
	"context"
	"errors"
	"net"
	"testing"
	"time"

	txgrpc "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
)

type signerCheckServer struct {
	txgrpc.UnimplementedTokenExchangeServiceServer
	got   *txgrpc.SignerCheckRequest
	resp  *txgrpc.SignerCheckResponse
	err   error
	delay time.Duration
}

func (s *signerCheckServer) SignerCheck(ctx context.Context, req *txgrpc.SignerCheckRequest) (*txgrpc.SignerCheckResponse, error) {
	s.got = req
	select {
	case <-time.After(s.delay):
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	return s.resp, s.err
}

func newBufconnChecker(t *testing.T, srv txgrpc.TokenExchangeServiceServer) *GRPCChecker {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	server := grpc.NewServer()
	txgrpc.RegisterTokenExchangeServiceServer(server, srv)
	go func() { _ = server.Serve(lis) }()
	t.Cleanup(server.Stop)

	conn, err := grpc.NewClient("passthrough:///bufconn",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	return NewGRPCChecker(txgrpc.NewTokenExchangeServiceClient(conn))
}

func TestGRPCChecker(t *testing.T) {
	for isSigner, want := range map[bool]Result{true: Allowed, false: Denied} {
		srv := &signerCheckServer{resp: &txgrpc.SignerCheckResponse{IsSigner: isSigner}}

		got, err := newBufconnChecker(t, srv).Check(context.Background(), testLicense, testSigner)

		require.NoError(t, err)
		require.Equal(t, want, got)
		require.Equal(t, testLicense.Hex(), srv.got.GetLicense())
		require.Equal(t, testSigner.Hex(), srv.got.GetSigner())
	}

	_, err := newBufconnChecker(t, &signerCheckServer{err: status.Error(codes.Unavailable, MessageUnavailable)}).
		Check(context.Background(), testLicense, testSigner)
	require.ErrorContains(t, err, MessageUnavailable)
}

func TestGRPCCheckerTimesOut(t *testing.T) {
	checker := newBufconnChecker(t, &signerCheckServer{delay: time.Minute, resp: &txgrpc.SignerCheckResponse{IsSigner: true}})
	checker.timeout = 50 * time.Millisecond

	start := time.Now()
	_, err := checker.Check(context.Background(), testLicense, testSigner)

	require.Error(t, err)
	require.Equal(t, codes.DeadlineExceeded, status.Code(errors.Unwrap(err)))
	require.Less(t, time.Since(start), 2*time.Second)
}
```

Run: `go test ./pkg/signercheck/ -run TestGRPCChecker -v`
Expected: build failure, `undefined: NewGRPCChecker`.

- [ ] **Step 8: Implement the gRPC client**

Create `pkg/signercheck/grpc.go`:

```go
package signercheck

import (
	"context"
	"fmt"
	"time"

	txgrpc "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/ethereum/go-ethereum/common"
)

// GRPCTimeout bounds one SignerCheck call.
const GRPCTimeout = 5 * time.Second

// GRPCChecker checks signers through token-exchange-api's SignerCheck gRPC, which shares
// token-exchange-api's 60-second cache. Every gRPC error, the deadline included, is an
// error, so Middleware answers 503 in enforce mode.
type GRPCChecker struct {
	client  txgrpc.TokenExchangeServiceClient
	timeout time.Duration
}

// NewGRPCChecker returns a Checker backed by SignerCheck with a 5-second deadline.
func NewGRPCChecker(client txgrpc.TokenExchangeServiceClient) *GRPCChecker {
	return &GRPCChecker{client: client, timeout: GRPCTimeout}
}

// Check implements Checker. token-exchange-api answers true for an address that isn't a
// developer license, so callers see Allowed there.
func (g *GRPCChecker) Check(ctx context.Context, license, signer common.Address) (Result, error) {
	ctx, cancel := context.WithTimeout(ctx, g.timeout)
	defer cancel()
	resp, err := g.client.SignerCheck(ctx, &txgrpc.SignerCheckRequest{License: license.Hex(), Signer: signer.Hex()})
	if err != nil {
		return Denied, fmt.Errorf("signer check for license %s: %w", license.Hex(), err)
	}
	if resp.GetIsSigner() {
		return Allowed, nil
	}
	return Denied, nil
}
```

Run: `go test ./pkg/signercheck/ -v -race`
Expected: `PASS` for every test, including `TestGRPCCheckerTimesOut` in well under 2 s.

- [ ] **Step 9: Commit the client**

```bash
git add pkg/signercheck/grpc.go pkg/signercheck/grpc_test.go
git commit -m "feat(signercheck): SignerCheck gRPC client with a 5-second deadline"
```

### Task 6: license-aware cached checker (Identity, then `isSigner`)

**Files:**

- Create:
  - `internal/contracts/devlicenseaccount/devlicenseaccount.json`
  - `internal/contracts/devlicenseaccount/devlicenseaccount.go` (generated)
  - `internal/services/licensesigner/checker.go`, `internal/services/licensesigner/checker_test.go`
- Modify: `Makefile:98-101` (`generate-contracts`), `go.mod` (`golang.org/x/sync` becomes direct)

**Interfaces:**

- Consumes: `signercheck.Result`, `Allowed`, `Denied`, `NotLicense` (Task 5); `(*services.IdentityController).IsDevLicense(ctx, common.Address) (bool, error)` (`internal/services/identity_service.go:45`).
- Produces:
  - `licensesigner.TTL = 60 * time.Second`, `licensesigner.Timeout = 3 * time.Second`;
  - `licensesigner.LicenseLookup interface { IsDevLicense(ctx context.Context, addr common.Address) (bool, error) }`;
  - `licensesigner.NewChecker(caller bind.ContractCaller, licenses LicenseLookup) *Checker`;
  - `(*Checker).Check(ctx, license, signer common.Address) (signercheck.Result, error)`, which implements `signercheck.Checker`;
  - `(*Checker).IsLicense(ctx, addr common.Address) (bool, error)`, for `Config.IsLicense`;
  - `devlicenseaccount.NewDevLicenseAccountCaller(address, caller)` with `IsSigner(opts, signer) (bool, error)`.

- [ ] **Step 1: Add the license account ABI and generate its binding**

Create `internal/contracts/devlicenseaccount/devlicenseaccount.json`. It's the `isSigner(address)` view of `DimoDeveloperLicenseAccount.sol` (`DIMO-Network/developer-license`); every license account is a clone of one beacon-proxy template that has had it since 2024.

```json
[
  {
    "inputs": [{ "internalType": "address", "name": "signer", "type": "address" }],
    "name": "isSigner",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
]
```

Append to `generate-contracts` in `Makefile` (after line 101; the recipe line starts with a tab):

```make
	go tool abigen --abi internal/contracts/devlicenseaccount/devlicenseaccount.json --pkg devlicenseaccount --type DevLicenseAccount --out internal/contracts/devlicenseaccount/devlicenseaccount.go
```

Run:

```bash
go tool abigen --abi internal/contracts/devlicenseaccount/devlicenseaccount.json --pkg devlicenseaccount --type DevLicenseAccount --out internal/contracts/devlicenseaccount/devlicenseaccount.go
grep -n "func NewDevLicenseAccountCaller\|func (_DevLicenseAccount \*DevLicenseAccountCaller) IsSigner" internal/contracts/devlicenseaccount/devlicenseaccount.go
```

Expected: both functions are found.

- [ ] **Step 2: Write the failing tests**

Create `internal/services/licensesigner/checker_test.go`:

```go
package licensesigner

import (
	"context"
	"errors"
	"math/big"
	"sync"
	"testing"
	"time"

	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

// fakeCaller answers isSigner calls from a queue (the last answer repeats). With block set,
// each call waits for release to close or its context to end.
type fakeCaller struct {
	mu      sync.Mutex
	answers []fakeAnswer
	calls   []ethereum.CallMsg
	block   bool
	release chan struct{}
}

type fakeAnswer struct {
	isSigner bool
	err      error
}

func (f *fakeCaller) CodeAt(context.Context, common.Address, *big.Int) ([]byte, error) {
	return []byte{0x60}, nil
}

func (f *fakeCaller) CallContract(ctx context.Context, call ethereum.CallMsg, _ *big.Int) ([]byte, error) {
	f.mu.Lock()
	answer := f.answers[min(len(f.calls), len(f.answers)-1)]
	f.calls = append(f.calls, call)
	f.mu.Unlock()
	if f.block {
		select {
		case <-f.release:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	if answer.err != nil {
		return nil, answer.err
	}
	out := make([]byte, 32)
	if answer.isSigner {
		out[31] = 1
	}
	return out, nil
}

func (f *fakeCaller) callCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.calls)
}

// fakeLicenses answers IsDevLicense with isLicense or err and counts lookups.
type fakeLicenses struct {
	mu        sync.Mutex
	isLicense bool
	err       error
	lookups   int
}

func (f *fakeLicenses) IsDevLicense(context.Context, common.Address) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.lookups++
	return f.isLicense, f.err
}

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

func newTestChecker(caller *fakeCaller, licenses *fakeLicenses, now *time.Time) *Checker {
	checker := NewChecker(caller, licenses)
	checker.now = func() time.Time { return *now }
	return checker
}

func TestCheckerCallsIsSignerOnTheLicenseAccount(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}}}

	got, err := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now).Check(context.Background(), license, signer)

	require.NoError(t, err)
	require.Equal(t, signercheck.Allowed, got)
	require.Len(t, caller.calls, 1)
	call := caller.calls[0]
	require.Equal(t, license, *call.To)
	require.Equal(t, crypto.Keccak256([]byte("isSigner(address)"))[:4], call.Data[:4])
	require.Equal(t, signer, common.BytesToAddress(call.Data[4:36]))
}

func TestCheckerCachesBothAnswersForTTL(t *testing.T) {
	for _, isSigner := range []bool{true, false} {
		now := time.Unix(1_700_000_000, 0)
		caller := &fakeCaller{answers: []fakeAnswer{{isSigner: isSigner}, {isSigner: !isSigner}}}
		checker := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now)
		want := map[bool]signercheck.Result{true: signercheck.Allowed, false: signercheck.Denied}

		got, err := checker.Check(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, want[isSigner], got)

		now = now.Add(TTL - time.Second)
		got, err = checker.Check(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, want[isSigner], got, "an answer within the TTL comes from the cache")
		require.Equal(t, 1, caller.callCount())

		now = now.Add(time.Second)
		got, err = checker.Check(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, want[!isSigner], got, "at the TTL the chain is asked again")
		require.Equal(t, 2, caller.callCount())
	}
}

func TestCheckerNotLicenseSkipsTheChain(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: false}}}
	licenses := &fakeLicenses{isLicense: false}
	checker := newTestChecker(caller, licenses, &now)

	for range 2 {
		got, err := checker.Check(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, signercheck.NotLicense, got)
	}
	require.Equal(t, 0, caller.callCount())
	require.Equal(t, 1, licenses.lookups, "the not-a-license answer is cached too")
}

func TestCheckerDoesNotCacheErrors(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{err: errors.New("rpc down")}, {isSigner: true}}}
	checker := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now)

	_, err := checker.Check(context.Background(), license, signer)
	require.ErrorContains(t, err, "rpc down")

	got, err := checker.Check(context.Background(), license, signer)
	require.NoError(t, err)
	require.Equal(t, signercheck.Allowed, got)
	require.Equal(t, 2, caller.callCount())

	licenses := &fakeLicenses{err: errors.New("identity down")}
	_, err = newTestChecker(caller, licenses, &now).Check(context.Background(), license, signer)
	require.ErrorContains(t, err, "identity down")
}

func TestCheckerKeysByLicenseAndSigner(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}, {isSigner: false}}}
	checker := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now)
	other := common.HexToAddress("0x955029AC2539f4D57A1D7E6Ef2b97617e95Eb1D4")

	got, err := checker.Check(context.Background(), license, signer)
	require.NoError(t, err)
	require.Equal(t, signercheck.Allowed, got)

	got, err = checker.Check(context.Background(), license, other)
	require.NoError(t, err)
	require.Equal(t, signercheck.Denied, got)
	require.Equal(t, 2, caller.callCount())
}

func TestCheckerBoundsTheCache(t *testing.T) {
	previous := maxEntries
	maxEntries = 2
	t.Cleanup(func() { maxEntries = previous })

	now := time.Unix(1_700_000_000, 0)
	checker := newTestChecker(&fakeCaller{answers: []fakeAnswer{{isSigner: true}}}, &fakeLicenses{isLicense: true}, &now)

	for i := range 3 {
		_, err := checker.Check(context.Background(), license, common.BigToAddress(big.NewInt(int64(i+1))))
		require.NoError(t, err)
	}
	require.LessOrEqual(t, len(checker.results), 2)
}

func TestCheckerTimesOut(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}}, block: true, release: make(chan struct{})}
	checker := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now)
	checker.timeout = 50 * time.Millisecond

	start := time.Now()
	_, err := checker.Check(context.Background(), license, signer)

	require.ErrorIs(t, err, context.DeadlineExceeded)
	require.Less(t, time.Since(start), 2*time.Second)
}

func TestCheckerSharesConcurrentMisses(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}}, block: true, release: make(chan struct{})}
	checker := newTestChecker(caller, &fakeLicenses{isLicense: true}, &now)

	var wg sync.WaitGroup
	results := make([]signercheck.Result, 10)
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			got, err := checker.Check(context.Background(), license, signer)
			if err != nil {
				t.Error(err) // not require: FailNow must not run off the test goroutine
			}
			results[i] = got
		}()
	}
	require.Eventually(t, func() bool { return caller.callCount() == 1 }, time.Second, 5*time.Millisecond)
	time.Sleep(50 * time.Millisecond) // let the other goroutines join the in-flight call
	close(caller.release)
	wg.Wait()

	require.Equal(t, 1, caller.callCount())
	for _, got := range results {
		require.Equal(t, signercheck.Allowed, got)
	}
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `go test ./internal/services/licensesigner/ -v`
Expected: build failure: `undefined: NewChecker`, `undefined: TTL`, `undefined: maxEntries`.

- [ ] **Step 4: Implement the checker**

Create `internal/services/licensesigner/checker.go`:

```go
// Package licensesigner checks whether an address is still an enabled signer (API key) on a
// developer license. It is the only place that asks the chain; other services reach it
// through the SignerCheck gRPC.
package licensesigner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/DIMO-Network/token-exchange-api/internal/contracts/devlicenseaccount"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"golang.org/x/sync/singleflight"
)

// TTL is how long an answer is reused. Removing a console team member must end their access
// within about ten minutes, the lifetime of a vehicle JWT; this keeps the check's share of
// that to one minute.
const TTL = 60 * time.Second

// Timeout bounds each Identity lookup and each chain call.
const Timeout = 3 * time.Second

// maxEntries bounds each cache. When a write finds one full, expired answers are dropped,
// and if none are expired that cache starts over.
var maxEntries = 10_000

// LicenseLookup reports whether an address is a developer license's client ID.
type LicenseLookup interface {
	IsDevLicense(ctx context.Context, addr common.Address) (bool, error)
}

// Checker answers whether a signer may still act for a license. It reuses every answer,
// positive or negative, for TTL, never caches errors, and lets concurrent misses for the
// same key share one call.
type Checker struct {
	caller   bind.ContractCaller
	licenses LicenseLookup
	ttl      time.Duration
	timeout  time.Duration
	now      func() time.Time

	group singleflight.Group

	mu        sync.Mutex
	results   map[signerKey]resultEntry
	isLicense map[common.Address]licenseEntry
}

type signerKey struct {
	license common.Address
	signer  common.Address
}

type resultEntry struct {
	result  signercheck.Result
	expires time.Time
}

type licenseEntry struct {
	isLicense bool
	expires   time.Time
}

// NewChecker returns a Checker that calls isSigner on license accounts through caller and
// asks licenses whether an address is a license.
func NewChecker(caller bind.ContractCaller, licenses LicenseLookup) *Checker {
	return &Checker{
		caller:    caller,
		licenses:  licenses,
		ttl:       TTL,
		timeout:   Timeout,
		now:       time.Now,
		results:   make(map[signerKey]resultEntry),
		isLicense: make(map[common.Address]licenseEntry),
	}
}

// Check implements signercheck.Checker: NotLicense when license isn't a developer license,
// otherwise Allowed or Denied from isSigner on the license account.
func (c *Checker) Check(ctx context.Context, license, signer common.Address) (signercheck.Result, error) {
	key := signerKey{license: license, signer: signer}
	if result, ok := c.cachedResult(key); ok {
		return result, nil
	}
	v, err, _ := c.group.Do("signer:"+license.Hex()+":"+signer.Hex(), func() (any, error) {
		if result, ok := c.cachedResult(key); ok {
			return result, nil
		}
		isLicense, err := c.IsLicense(ctx, license)
		if err != nil {
			return nil, err
		}
		result := signercheck.NotLicense
		if isLicense {
			isSigner, err := c.isSigner(ctx, license, signer)
			if err != nil {
				return nil, err
			}
			result = signercheck.Denied
			if isSigner {
				result = signercheck.Allowed
			}
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		if len(c.results) >= maxEntries {
			c.results = prune(c.results, c.now(), func(e resultEntry) time.Time { return e.expires })
		}
		c.results[key] = resultEntry{result: result, expires: c.now().Add(c.ttl)}
		return result, nil
	})
	if err != nil {
		return signercheck.Denied, err
	}
	return v.(signercheck.Result), nil
}

// IsLicense reports whether addr is a developer license, cached like Check.
func (c *Checker) IsLicense(ctx context.Context, addr common.Address) (bool, error) {
	c.mu.Lock()
	entry, ok := c.isLicense[addr]
	c.mu.Unlock()
	if ok && c.now().Before(entry.expires) {
		return entry.isLicense, nil
	}
	v, err, _ := c.group.Do("license:"+addr.Hex(), func() (any, error) {
		callCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), c.timeout)
		defer cancel()
		isLicense, err := c.licenses.IsDevLicense(callCtx, addr)
		if err != nil {
			return nil, fmt.Errorf("failed to look up license %s: %w", addr.Hex(), err)
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		if len(c.isLicense) >= maxEntries {
			c.isLicense = prune(c.isLicense, c.now(), func(e licenseEntry) time.Time { return e.expires })
		}
		c.isLicense[addr] = licenseEntry{isLicense: isLicense, expires: c.now().Add(c.ttl)}
		return isLicense, nil
	})
	if err != nil {
		return false, err
	}
	return v.(bool), nil
}

func (c *Checker) cachedResult(key signerKey) (signercheck.Result, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	entry, ok := c.results[key]
	if !ok || !c.now().Before(entry.expires) {
		return 0, false
	}
	return entry.result, true
}

// isSigner calls isSigner on the license account, detached from the request's cancellation
// (a shared call must not fail because its first caller went away) but bounded by c.timeout.
func (c *Checker) isSigner(ctx context.Context, license, signer common.Address) (bool, error) {
	callCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), c.timeout)
	defer cancel()
	account, err := devlicenseaccount.NewDevLicenseAccountCaller(license, c.caller)
	if err != nil {
		return false, fmt.Errorf("failed to bind license account %s: %w", license.Hex(), err)
	}
	isSigner, err := account.IsSigner(&bind.CallOpts{Context: callCtx}, signer)
	if err != nil {
		return false, fmt.Errorf("failed to call isSigner on license account %s: %w", license.Hex(), err)
	}
	return isSigner, nil
}

// prune drops expired entries; if none were expired it starts over, so a cache never grows
// past maxEntries.
func prune[K comparable, V any](m map[K]V, now time.Time, expires func(V) time.Time) map[K]V {
	for k, v := range m {
		if !now.Before(expires(v)) {
			delete(m, k)
		}
	}
	if len(m) >= maxEntries {
		return make(map[K]V)
	}
	return m
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `go mod tidy && go test ./internal/services/licensesigner/ -v -race`
Expected: `PASS` for all eight tests. `TestCheckerTimesOut` finishes in well under 2 s, and `go.mod` lists `golang.org/x/sync` as a direct requirement.

- [ ] **Step 6: Commit**

```bash
git add Makefile go.mod go.sum internal/contracts/devlicenseaccount internal/services/licensesigner
git commit -m "feat: license-aware cached isSigner checker with singleflight and 3-second timeouts"
```

### Task 7: check every exchange by `ethereum_address`, whatever the audience

Today a token whose `aud` contains `dimo-driver` skips `NewDevLicenseValidator` (`internal/middleware/valid_dev_license.go:49-52`). But `ExchangeToken` grants on the `ethereum_address` claim (`internal/controllers/httpcontroller/token_exchange.go:106-111` via `internal/api/handlers.go:19-38`). So a license signer who logged in through the mobile client gets a license-scoped token that the dev-license middleware never sees. The check therefore keys on `ethereum_address` and asks Identity whether it's a license; the subject and audience don't matter.

**Files:**

- Create:
  - `internal/middleware/signer_test.go`
  - `internal/middleware/signercheck_mock_test.go`, `internal/middleware/valid_dev_license_mock_test.go` (generated)
  - `charts/token-exchange-api/templates/prometheusrule-signer-check.yaml`
- Modify:
  - `internal/config/settings.go` (two settings)
  - `internal/app/app.go:40-93` (build the checker and middleware) and `:93-124` (`createHTTPServer`)
  - `charts/token-exchange-api/values.yaml` and `values-prod.yaml` (`env`)
  - `README.md` (operations section)
- Test: `internal/middleware/signer_test.go`

**Interfaces:**

- Consumes: Tasks 5 and 6.
- Produces:
  - `config.Settings.SignerCheckMode string` (`yaml:"SIGNER_CHECK_MODE"`) and `config.Settings.SignerClaimRequiredAfter int64` (`yaml:"SIGNER_CLAIM_REQUIRED_AFTER"`);
  - `(*config.Settings).SignerClaimCutoff() time.Time`;
  - `createHTTPServer(logger zerolog.Logger, settings *config.Settings, dexSvc *services.DexClient, accessService *access.Service, idSvc *services.IdentityController, signerMiddleware fiber.Handler) (*fiber.App, error)`;
  - in `CreateServers`, the `*licensesigner.Checker` named `signerChecker` (Task 8 passes it to gRPC).

- [ ] **Step 1: Write the failing test**

Create `internal/middleware/signer_test.go`:

```go
package middleware_test

import (
	"encoding/base64"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/DIMO-Network/token-exchange-api/internal/middleware"
	"github.com/DIMO-Network/token-exchange-api/internal/middleware/dex"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/protobuf/proto"
)

//go:generate go tool mockgen -source ../../pkg/signercheck/signercheck.go -destination ./signercheck_mock_test.go -package middleware_test
//go:generate go tool mockgen -source ./valid_dev_license.go -destination ./valid_dev_license_mock_test.go -package middleware_test

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
	user    = common.HexToAddress("0x20Ca3bE69a8B95D3093383375F0473A8c6341727")
)

func licenseClaims(t *testing.T, extra jwt.MapClaims) jwt.MapClaims {
	t.Helper()
	sub, err := proto.Marshal(&dex.User{ConnId: "web3", UserId: license.Hex()})
	require.NoError(t, err)
	claims := jwt.MapClaims{
		"aud":              license.Hex(),
		"sub":              base64.RawURLEncoding.EncodeToString(sub),
		"ethereum_address": license.Hex(),
	}
	for k, v := range extra {
		claims[k] = v
	}
	return claims
}

// serveExchangeChain mounts the same chain createHTTPServer builds after jwtAuth:
// NewDevLicenseValidator, then the signer check keyed on ethereum_address.
func serveExchangeChain(t *testing.T, ident middleware.IdentityService, checker signercheck.Checker, claims jwt.MapClaims) (int, string) {
	t.Helper()
	app := fiber.New()
	app.Get("/",
		func(c *fiber.Ctx) error {
			c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, claims))
			return c.Next()
		},
		middleware.NewDevLicenseValidator(ident, zerolog.Nop()),
		signercheck.Middleware(signercheck.Config{
			Service: "token-exchange-api-test",
			Mode:    signercheck.ModeEnforce,
			Checker: checker,
			Token:   signercheck.MapClaimsToken("user"),
			Logger:  zerolog.Nop(),
		}),
		func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	resp, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
	require.NoError(t, err)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return resp.StatusCode, string(body)
}

func TestSignerCheckOnExchange(t *testing.T) {
	tests := []struct {
		name       string
		claims     jwt.MapClaims
		setup      func(ident *MockIdentityService, checker *MockChecker)
		wantStatus int
		wantBody   string
	}{
		{
			name:   "license token with an enabled signer passes",
			claims: licenseClaims(t, jwt.MapClaims{"signer_address": signer.Hex()}),
			setup: func(ident *MockIdentityService, checker *MockChecker) {
				ident.EXPECT().IsDevLicense(gomock.Any(), license).Return(true, nil)
				checker.EXPECT().Check(gomock.Any(), license, signer).Return(signercheck.Allowed, nil)
			},
			wantStatus: fiber.StatusOK,
		},
		{
			name:   "license token with a disabled signer is refused",
			claims: licenseClaims(t, jwt.MapClaims{"signer_address": signer.Hex()}),
			setup: func(ident *MockIdentityService, checker *MockChecker) {
				ident.EXPECT().IsDevLicense(gomock.Any(), license).Return(true, nil)
				checker.EXPECT().Check(gomock.Any(), license, signer).Return(signercheck.Denied, nil)
			},
			wantStatus: fiber.StatusForbidden,
			wantBody:   signercheck.MessageDenied,
		},
		{
			name: "mobile-audience token for a license is checked",
			claims: jwt.MapClaims{
				"aud":              "dimo-driver",
				"ethereum_address": license.Hex(),
				"signer_address":   signer.Hex(),
			},
			setup: func(_ *MockIdentityService, checker *MockChecker) {
				checker.EXPECT().Check(gomock.Any(), license, signer).Return(signercheck.Denied, nil)
			},
			wantStatus: fiber.StatusForbidden,
			wantBody:   signercheck.MessageDenied,
		},
		{
			name: "mobile-audience token for a non-license passes",
			claims: jwt.MapClaims{
				"aud":              "dimo-driver",
				"ethereum_address": user.Hex(),
				"signer_address":   signer.Hex(),
			},
			setup: func(_ *MockIdentityService, checker *MockChecker) {
				checker.EXPECT().Check(gomock.Any(), user, signer).Return(signercheck.NotLicense, nil)
			},
			wantStatus: fiber.StatusOK,
		},
		{
			name:   "license token without signer_address passes without a check",
			claims: licenseClaims(t, nil),
			setup: func(ident *MockIdentityService, _ *MockChecker) {
				ident.EXPECT().IsDevLicense(gomock.Any(), license).Return(true, nil)
			},
			wantStatus: fiber.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			ident := NewMockIdentityService(ctrl)
			checker := NewMockChecker(ctrl)
			tc.setup(ident, checker)

			status, body := serveExchangeChain(t, ident, checker, tc.claims)

			require.Equal(t, tc.wantStatus, status, body)
			if tc.wantBody != "" {
				require.Equal(t, tc.wantBody, body)
			}
		})
	}
}
```

Run:

```bash
go generate ./internal/middleware/
go test ./internal/middleware/ -run TestSignerCheckOnExchange -v
```

Expected: the mocks generate (`MockIdentityService`, `MockChecker`) and all five subtests pass. That's because the middleware already exists from Task 5, and this test pins the composition.

To confirm the test guards the bypass, temporarily swap `signercheck.MapClaimsToken("user")` for a `Token` func that returns `TokenInfo{}` whenever `aud` contains `dimo-driver`, which is the old subject-based behavior. "mobile-audience token for a license is checked" then fails (`expected: 403 actual: 200`). Revert the swap.

- [ ] **Step 2: Add the settings**

In `internal/config/settings.go`, add `"time"` to the imports, and add to `Settings`:

```go
	// SignerCheckMode is enforce (default), log or off.
	SignerCheckMode string `yaml:"SIGNER_CHECK_MODE"`
	// SignerClaimRequiredAfter, a Unix time, refuses license tokens issued after it without
	// signer_address. Zero (the default) disables that rule.
	SignerClaimRequiredAfter int64 `yaml:"SIGNER_CLAIM_REQUIRED_AFTER"`
```

Append to the file:

```go
// SignerClaimCutoff is SIGNER_CLAIM_REQUIRED_AFTER as a time; the zero time when unset.
func (s *Settings) SignerClaimCutoff() time.Time {
	if s.SignerClaimRequiredAfter <= 0 {
		return time.Time{}
	}
	return time.Unix(s.SignerClaimRequiredAfter, 0)
}
```

- [ ] **Step 3: Wire the checker and middleware**

In `internal/app/app.go`, add these imports:

```go
	"github.com/DIMO-Network/token-exchange-api/internal/services/licensesigner"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
```

In `CreateServers`, after `accessService` is created (line 78-81), replace the `createHTTPServer` call (line 83) with:

```go
	idSvc := services.NewIdentityController(&logger, settings)
	signerChecker := licensesigner.NewChecker(ethClient, idSvc)
	signerMode, err := signercheck.ParseMode(settings.SignerCheckMode)
	if err != nil {
		return nil, nil, err
	}
	signerMiddleware := signercheck.Middleware(signercheck.Config{
		Service:            "token-exchange-api",
		Mode:               signerMode,
		Checker:            signerChecker,
		Token:              signercheck.MapClaimsToken("user"),
		ClaimRequiredAfter: settings.SignerClaimCutoff(),
		IsLicense:          signerChecker.IsLicense,
		Logger:             logger,
	})

	app, err := createHTTPServer(logger, settings, dexSvc, accessService, idSvc, signerMiddleware)
```

Change `createHTTPServer`: replace its signature (line 93), delete its own `idSvc := services.NewIdentityController(&logger, settings)` line, and extend the handler chain (line 124):

```go
func createHTTPServer(logger zerolog.Logger, settings *config.Settings, dexSvc *services.DexClient, accessService *access.Service, idSvc *services.IdentityController, signerMiddleware fiber.Handler) (*fiber.App, error) {
```

```go
	handlers := []fiber.Handler{jwtAuth, devLicenseMiddleware, signerMiddleware}
```

Run: `go build ./... && go test ./...`
Expected: build succeeds and every package reports `ok`. The `createGRPCServer` call still passes `accessService` alone until Task 8.

- [ ] **Step 4: Start every environment in log mode, add the alert, document operations**

In `charts/token-exchange-api/values.yaml` and `charts/token-exchange-api/values-prod.yaml`, add this key to the existing `env:` map (shown with its parent):

```yaml
env:
  SIGNER_CHECK_MODE: log
```

Create `charts/token-exchange-api/templates/prometheusrule-signer-check.yaml`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: {{ include "token-exchange-api.fullname" . }}-signer-check
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "token-exchange-api.labels" . | nindent 4 }}
spec:
  groups:
    - name: signer-check
      rules:
        - alert: SignerCheckErrors
          expr: |
            sum by (service) (rate(signer_check_total{namespace="{{ .Release.Namespace }}",result="error"}[5m]))
              /
            sum by (service) (rate(signer_check_total{namespace="{{ .Release.Namespace }}",result!="skipped"}[5m]))
              > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: 'Signer checks are failing in {{ "{{" }} $labels.service {{ "}}" }}'
            description: >-
              More than 1% of non-skipped developer-JWT signer checks (allowed + denied + error)
              in {{ "{{" }} $labels.service {{ "}}" }} errored over 5 minutes. In enforce mode those requests get 503. Check
              token-exchange-api's RPC and Identity reachability; to stop refusing, set
              SIGNER_CHECK_MODE=log on the affected service.
```

Append to `README.md`:

```markdown
## Signer check

Developer JWTs carry `signer_address`, the license signer (API key) that minted them. On every
exchange, token-exchange-api checks that this signer is still enabled on the license in
`ethereum_address`, whatever the token's audience. Addresses that aren't licenses are skipped.
Answers are cached for 60 s; Identity and chain calls time out after 3 s.
`SignerCheck` (gRPC) serves the same answers to vehicle-triggers-api, tesla-oracle and
credit-tracker.

| Setting                       | Values                            | Effect                                                                                                                                                    |
| ----------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SIGNER_CHECK_MODE`           | `enforce` (default), `log`, `off` | `enforce` answers 403 `signer no longer authorized for this license` or 503 `could not verify signer`; `log` only logs and counts; `off` skips the check. |
| `SIGNER_CLAIM_REQUIRED_AFTER` | Unix time, unset by default       | License tokens issued after it without `signer_address` get the 403.                                                                                      |

- **Metric:** `signer_check_total{service,result}`, with `result` one of `allowed`, `denied`, `error`, `skipped`.
- **Alert:** `SignerCheckErrors` fires when `error` exceeds 1% of non-skipped checks (`allowed` + `denied` + `error`) for 5 minutes.
- **Rollback order:**
  - turn the console's `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` off;
  - set `SIGNER_CHECK_MODE=off` (or roll back) on vehicle-triggers-api, tesla-oracle and credit-tracker, then token-exchange-api;
  - roll back dex last.
```

Run:

```bash
helm lint charts/token-exchange-api -f charts/token-exchange-api/values-prod.yaml
helm template t charts/token-exchange-api -f charts/token-exchange-api/values.yaml --namespace dev | grep -A3 "alert: SignerCheckErrors"
```

Expected: `0 chart(s) failed`, and the rendered rule shows `namespace="dev"` in the expression.

- [ ] **Step 5: Commit**

```bash
git add internal/config/settings.go internal/app/app.go internal/middleware/signer_test.go internal/middleware/signercheck_mock_test.go internal/middleware/valid_dev_license_mock_test.go charts/token-exchange-api README.md
git commit -m "feat: check the signer of every exchanged developer JWT, mobile audience included"
```

### Task 8: `SignerCheck` gRPC for the other services

**Files:**

- Modify:
  - `pkg/grpc/token-exchange-api.proto`
  - `pkg/grpc/token-exchange-api.pb.go`, `pkg/grpc/token-exchange-api_grpc.pb.go` (generated)
  - `internal/controllers/rpc/rpc.go`
  - `internal/app/app.go:88`
- Create: `internal/controllers/rpc/rpc_test.go`, `internal/controllers/rpc/rpc_mock_test.go` (generated)
- Test: `internal/controllers/rpc/rpc_test.go`

**Interfaces:**

- Consumes: `signerChecker` (`*licensesigner.Checker`, Task 7), the same instance the HTTP path uses, so they share one cache.
- Produces:
  - `rpc TokenExchangeService.SignerCheck(SignerCheckRequest{ license string = 1; signer string = 2 }) returns (SignerCheckResponse{ is_signer bool = 1 })`;
  - Go: `grpc.SignerCheckRequest{License, Signer string}`, `grpc.SignerCheckResponse{IsSigner bool}`;
  - `rpc.SignerChecker interface { Check(ctx, license, signer common.Address) (signercheck.Result, error) }`;
  - `rpc.NewTokenExchangeServer(accessService *access.Service, signerChecker rpc.SignerChecker) *TokenExchangeServer`.
- Semantics:
  - `Allowed` and `NotLicense` answer `is_signer: true`; `Denied` answers `false`;
  - non-hex input returns `InvalidArgument`;
  - checker errors return `Unavailable` with `could not verify signer`.

- [ ] **Step 1: Add the RPC to the proto**

In `pkg/grpc/token-exchange-api.proto`, replace the service block and append the messages:

```proto
service TokenExchangeService {
  rpc AccessCheck(AccessCheckRequest) returns (AccessCheckResponse);
  // SignerCheck reports whether signer may still act for license: true when signer is an
  // enabled signer on the developer license whose account (client ID) is license, and also
  // true when license isn't a developer license (nothing to check). Answers are cached for
  // 60 seconds. Unavailable means the chain or Identity couldn't be asked; callers must not
  // treat it as true.
  rpc SignerCheck(SignerCheckRequest) returns (SignerCheckResponse);
}
```

```proto
message SignerCheckRequest {
  // The developer JWT's ethereum_address: a license client ID, i.e. its license account.
  string license = 1;
  // The developer JWT's signer_address claim.
  string signer = 2;
}

message SignerCheckResponse {
  bool is_signer = 1;
}
```

- [ ] **Step 2: Regenerate with the CI toolchain versions**

CI runs `make generate` and fails on any diff. The committed headers say `protoc-gen-go v1.36.11`, `protoc-gen-go-grpc v1.5.1` and `protoc v6.31.1`, so use protoc 31.1. Homebrew's protoc is newer, and `make tools-protoc` downloads an x86_64 build on Apple Silicon. Run:

```bash
mkdir -p bin
GOBIN=$(pwd)/bin go install google.golang.org/protobuf/cmd/protoc-gen-go google.golang.org/grpc/cmd/protoc-gen-go-grpc
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) PROTOC_ZIP=protoc-31.1-osx-aarch_64.zip ;;
  Darwin-x86_64) PROTOC_ZIP=protoc-31.1-osx-x86_64.zip ;;
  Linux-x86_64) PROTOC_ZIP=protoc-31.1-linux-x86_64.zip ;;
esac
curl -sSL -o bin/protoc.zip "https://github.com/protocolbuffers/protobuf/releases/download/v31.1/${PROTOC_ZIP}"
unzip -o -q bin/protoc.zip -d bin/protoclib && mv -f bin/protoclib/bin/protoc bin/protoc && rm -rf bin/include && mv bin/protoclib/include bin/ && rm -rf bin/protoc.zip bin/protoclib
bin/protoc --version
make generate-grpc
head -5 pkg/grpc/token-exchange-api.pb.go pkg/grpc/token-exchange-api_grpc.pb.go
grep -c "SignerCheck" pkg/grpc/token-exchange-api_grpc.pb.go
```

Expected:

- `libprotoc 31.1`;
- both headers still show `protoc v6.31.1` with the same plugin versions;
- a non-zero `SignerCheck` count.

`bin/` is git-ignored. Now finish Task 5 Steps 7-9 (the gRPC client), then continue here.

- [ ] **Step 3: Write the failing test**

Create `internal/controllers/rpc/rpc_test.go`:

```go
package rpc_test

import (
	"context"
	"errors"
	"testing"

	"github.com/DIMO-Network/token-exchange-api/internal/controllers/rpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

//go:generate go tool mockgen -source ./rpc.go -destination ./rpc_mock_test.go -package rpc_test

func TestSignerCheck(t *testing.T) {
	license := common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer := common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
	request := &grpc.SignerCheckRequest{License: license.Hex(), Signer: signer.Hex()}

	for name, tc := range map[string]struct {
		result signercheck.Result
		want   bool
	}{
		"enabled signer answers true":  {result: signercheck.Allowed, want: true},
		"disabled signer answers false": {result: signercheck.Denied, want: false},
		"non-license answers true":     {result: signercheck.NotLicense, want: true},
	} {
		t.Run(name, func(t *testing.T) {
			checker := NewMockSignerChecker(gomock.NewController(t))
			checker.EXPECT().Check(gomock.Any(), license, signer).Return(tc.result, nil)

			resp, err := rpc.NewTokenExchangeServer(nil, checker).SignerCheck(context.Background(), request)

			require.NoError(t, err)
			require.Equal(t, tc.want, resp.GetIsSigner())
		})
	}

	t.Run("rejects addresses that are not hex", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))

		_, err := rpc.NewTokenExchangeServer(nil, checker).SignerCheck(context.Background(), &grpc.SignerCheckRequest{
			License: "not-an-address",
			Signer:  signer.Hex(),
		})

		require.Equal(t, codes.InvalidArgument, status.Code(err))
	})

	t.Run("checker errors are Unavailable", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))
		checker.EXPECT().Check(gomock.Any(), license, signer).Return(signercheck.Denied, errors.New("rpc down"))

		_, err := rpc.NewTokenExchangeServer(nil, checker).SignerCheck(context.Background(), request)

		require.Equal(t, codes.Unavailable, status.Code(err))
		require.Equal(t, signercheck.MessageUnavailable, status.Convert(err).Message())
	})
}
```

- [ ] **Step 4: Add the interface and constructor parameter, generate the mock, and watch the test fail**

In `internal/controllers/rpc/rpc.go`, add the import `"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"` and replace the struct and constructor:

```go
// SignerChecker answers whether a signer may still act for a license.
type SignerChecker interface {
	Check(ctx context.Context, license, signer common.Address) (signercheck.Result, error)
}

// TokenExchangeServer represents the gRPC server
type TokenExchangeServer struct {
	grpc.UnimplementedTokenExchangeServiceServer
	accessService *access.Service
	signerChecker SignerChecker
}

// NewTokenExchangeServer creates a new TokenExchangeServer.
func NewTokenExchangeServer(accessService *access.Service, signerChecker SignerChecker) *TokenExchangeServer {
	return &TokenExchangeServer{
		accessService: accessService,
		signerChecker: signerChecker,
	}
}
```

In `internal/app/app.go` line 88:

```go
	grpcServer := createGRPCServer(rpc.NewTokenExchangeServer(accessService, signerChecker))
```

Run:

```bash
go generate ./internal/controllers/rpc/
go test ./internal/controllers/rpc/ -run TestSignerCheck -v
```

Expected: the package compiles but the tests fail. `SignerCheck` still resolves to the embedded `UnimplementedTokenExchangeServiceServer`, so every subtest gets `rpc error: code = Unimplemented desc = method SignerCheck not implemented`, and the status assertions report `expected: 0x3 actual: 0xc` and `expected: 0xe actual: 0xc`.

- [ ] **Step 5: Implement `SignerCheck`**

In `internal/controllers/rpc/rpc.go`, add `"google.golang.org/grpc/codes"` and `"google.golang.org/grpc/status"` to the imports, then add:

```go
// SignerCheck reports whether a developer JWT's signer may still act for its license. It
// answers true for addresses that aren't developer licenses, and shares the HTTP path's
// 60-second cache.
func (s *TokenExchangeServer) SignerCheck(ctx context.Context, req *grpc.SignerCheckRequest) (*grpc.SignerCheckResponse, error) {
	if !common.IsHexAddress(req.GetLicense()) || !common.IsHexAddress(req.GetSigner()) {
		return nil, status.Error(codes.InvalidArgument, "license and signer must be hex addresses")
	}
	result, err := s.signerChecker.Check(ctx, common.HexToAddress(req.GetLicense()), common.HexToAddress(req.GetSigner()))
	if err != nil {
		return nil, status.Error(codes.Unavailable, signercheck.MessageUnavailable)
	}
	return &grpc.SignerCheckResponse{IsSigner: result != signercheck.Denied}, nil
}
```

- [ ] **Step 6: Run the tests, the full suite, lint and the generator check**

```bash
go test ./internal/controllers/rpc/ -run TestSignerCheck -v
go test ./... -race
make tools-golangci-lint
make lint
make generate
git status --porcelain
```

Expected:

- `TestSignerCheck` passes;
- every package reports `ok`;
- no lint findings;
- after `make generate`, `git status --porcelain` lists only files Tasks 5-8 created or changed. If `make generate` rewrites `docs/` (swagger) or a `*_mock_test.go`, inspect the diff and commit it only if it comes from this branch.

- [ ] **Step 7: Commit**

```bash
git add pkg/grpc internal/controllers/rpc internal/app/app.go
git commit -m "feat(grpc): SignerCheck so other services share the signer check and its cache"
```

### Task 9: token-exchange-api pull request

**Files:** none.

**Interfaces:** Produces PR `DIMO-Network/token-exchange-api` → `main`. Merging builds the dev image and bumps `charts/token-exchange-api/values.yaml` (`buildpushdev.yml`), so dev runs it in `log` mode. Tasks 10, 13 and 14 need this merged for `go get`.

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/token-exchange-api-signer-check
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/token-exchange-api --base main --head feat/signer-check \
  --title "feat: refuse developer JWTs whose signer was disabled" --body-file - <<'EOF'
## Why

Disabling a license signer (API key) stops dex from minting new developer JWTs with it, but tokens it already minted keep exchanging for vehicle JWTs for their full 336 hours. The console's team feature needs a removed member cut off within about 10 minutes, the vehicle JWT lifetime. dex now stamps the signer on developer JWTs as `signer_address` (DIMO-Network/dex).

## What

- **`/v1/tokens/exchange`:** checks every token with `signer_address` whose `ethereum_address` is a developer license (Identity), **whatever its audience**.
  - Before, tokens issued to the mobile client (`aud` `dimo-driver`) skipped the dev-license middleware, and the grant uses `ethereum_address`, so an audience-based check could be bypassed.
  - Disabled signer: `403 signer no longer authorized for this license`.
  - Identity or chain failure: `503 could not verify signer`.
  - Tokens without the claim pass unless `SIGNER_CLAIM_REQUIRED_AFTER` is set.
- **`licensesigner.Checker`:** Identity lookup, then `isSigner(signer)` on the license account (new abigen binding).
  - 60 s cache for positive and negative answers, bounded at 10,000 entries; errors not cached;
  - singleflight for concurrent misses;
  - 3 s timeout per call.
- **gRPC `SignerCheck(license, signer) → is_signer`:** shares that cache. It answers true for non-licenses, `InvalidArgument` for non-hex input, and `Unavailable` on errors.
- **`pkg/signercheck`:** shared by vehicle-triggers-api, tesla-oracle and credit-tracker. It holds `SIGNER_CHECK_MODE` (`enforce`|`log`|`off`), the `signer_check_total{service,result}` metric, the Fiber middleware, and a `SignerCheck` client with a 5 s deadline.
- **`SIGNER_CHECK_MODE: log`** in dev and prod values; production switches to `enforce` after a week.
- **Alert** `SignerCheckErrors` (error above 1% of non-skipped checks, allowed + denied + error, over 5 min) as a PrometheusRule.
- **README** documents settings, metric, alert and rollback.

## Effect on existing developers

In `enforce` mode, disabling an API key ends its tokens within about a minute instead of two weeks.

## Successor services

`dauth` and `vt` aren't live. If either ships, it needs the same check (use `pkg/signercheck`).

## Tests

- `pkg/signercheck`: every mode and result, cutoff rules, malformed claims, metric counts, gRPC client with timeout.
- `licensesigner`: call shape, TTL for both answers, not-a-license cached, errors not cached, keyed, bounded, 3 s timeout, singleflight.
- `TestSignerCheckOnExchange`: mobile-audience token for a license is checked; for a non-license it passes.
- `TestSignerCheck` (gRPC).
- `make generate` is clean.
EOF
```

Expected: a PR URL. Merge after review and green CI, after the dex PR (Task 4) has merged.

---

## vehicle-triggers-api

All line references are to `origin/main` (2ba6a87; production runs its `1.4.11` tag). The local checkout's `road-speed-limit-trigger` branch is based on the unmerged `nats-jetstream-migration` line; don't build on it.

### Task 10: signer check on every authenticated request

**Files:**

- Modify:
  - `go.mod`, `go.sum`
  - `internal/config/settings.go` (one setting)
  - `internal/auth/auth.go:28-33` (`CustomDexClaims`) plus a new func
  - `internal/clients/tokenexchange/token-exchange.go` (a new method)
  - `internal/app/app.go:122-125` (handler chain)
  - `charts/vehicle-triggers-api/values.yaml`, `values-prod.yaml` (`env`)
- Create: `internal/auth/signer_test.go`, `internal/clients/tokenexchange/token-exchange_test.go`
- Test: the two new files

**Interfaces:**

- Consumes: `signercheck.Middleware`, `Config`, `TokenInfo`, `ParseMode`, `NewGRPCChecker`, `GRPCChecker` and `MessageDenied` (Task 5, merged in Task 9).
- Produces:
  - `auth.CustomDexClaims.SignerAddress common.Address` (`json:"signer_address"`; zero when absent);
  - `auth.SignerTokenInfo(c *fiber.Ctx) (signercheck.TokenInfo, error)`;
  - `(*tokenexchange.Client).SignerChecker() *signercheck.GRPCChecker`;
  - `config.Settings.SignerCheckMode string` (`env:"SIGNER_CHECK_MODE" envDefault:"enforce"`).

- [ ] **Step 1: Create the worktree and take the merged token-exchange-api**

```bash
git -C ~/workspace/vehicle-triggers-api fetch origin
git -C ~/workspace/vehicle-triggers-api worktree add ~/workspace/vehicle-triggers-api-signer-check -b feat/signer-check origin/main
cd ~/workspace/vehicle-triggers-api-signer-check
go get github.com/DIMO-Network/token-exchange-api@main
go mod tidy
go doc github.com/DIMO-Network/token-exchange-api/pkg/signercheck Middleware
```

Expected: `go doc` prints `func Middleware(cfg Config) fiber.Handler`. If it reports no such package, Task 9's PR hasn't merged yet; stop and wait.

- [ ] **Step 2: Write the failing tests**

Create `internal/auth/signer_test.go`:

```go
package auth

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DIMO-Network/server-garage/pkg/fibercommon"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

type fakeChecker struct {
	result signercheck.Result
	calls  int
}

func (f *fakeChecker) Check(context.Context, common.Address, common.Address) (signercheck.Result, error) {
	f.calls++
	return f.result, nil
}

func TestTokenReadsSignerAddressClaim(t *testing.T) {
	var tok Token
	require.NoError(t, json.Unmarshal([]byte(`{
		"ethereum_address": "0x299671d2b32ed62cc61ce65d8f2b9e4f78486b37",
		"signer_address": "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"
	}`), &tok))
	require.Equal(t, license, tok.EthereumAddress)
	require.Equal(t, signer, tok.SignerAddress)

	var legacy Token
	require.NoError(t, json.Unmarshal([]byte(`{"ethereum_address": "0x299671d2b32ed62cc61ce65d8f2b9e4f78486b37"}`), &legacy))
	require.Equal(t, common.Address{}, legacy.SignerAddress)
}

func injectToken(claims CustomDexClaims, issuedAt time.Time) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tok := &Token{CustomDexClaims: claims}
		if !issuedAt.IsZero() {
			tok.IssuedAt = jwt.NewNumericDate(issuedAt)
		}
		c.Locals(UserJwtKey, &jwt.Token{Claims: tok})
		return c.Next()
	}
}

func TestSignerTokenInfo(t *testing.T) {
	issued := time.Unix(1_800_000_000, 0)
	app := fiber.New()
	var got signercheck.TokenInfo
	app.Get("/", injectToken(CustomDexClaims{EthereumAddress: license, SignerAddress: signer}, issued), func(c *fiber.Ctx) error {
		var err error
		got, err = SignerTokenInfo(c)
		require.NoError(t, err)
		return c.SendStatus(fiber.StatusOK)
	})
	_, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
	require.NoError(t, err)
	require.Equal(t, signercheck.TokenInfo{License: license, Signer: signer.Hex(), IssuedAt: issued}, got)
}

func TestSignerCheckOnWebhooksAPI(t *testing.T) {
	serve := func(mode signercheck.Mode, checker *fakeChecker, claims CustomDexClaims) (int, fibercommon.CodedResponse) {
		app := fiber.New(fiber.Config{ErrorHandler: func(c *fiber.Ctx, err error) error { return fibercommon.ErrorHandler(c, err) }})
		app.Get("/", injectToken(claims, time.Time{}), signercheck.Middleware(signercheck.Config{
			Service: "vehicle-triggers-api-test",
			Mode:    mode,
			Checker: checker,
			Token:   SignerTokenInfo,
			Logger:  zerolog.Nop(),
		}), func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
		resp, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
		require.NoError(t, err)
		raw, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		var body fibercommon.CodedResponse
		if resp.StatusCode != fiber.StatusOK {
			require.NoError(t, json.Unmarshal(raw, &body))
		}
		return resp.StatusCode, body
	}

	status, body := serve(signercheck.ModeEnforce, &fakeChecker{result: signercheck.Denied}, CustomDexClaims{EthereumAddress: license, SignerAddress: signer})
	require.Equal(t, fiber.StatusForbidden, status)
	require.Equal(t, signercheck.MessageDenied, body.Message)

	status, _ = serve(signercheck.ModeLog, &fakeChecker{result: signercheck.Denied}, CustomDexClaims{EthereumAddress: license, SignerAddress: signer})
	require.Equal(t, fiber.StatusOK, status, "log mode never refuses")

	noClaim := &fakeChecker{result: signercheck.Denied}
	status, _ = serve(signercheck.ModeEnforce, noClaim, CustomDexClaims{EthereumAddress: license})
	require.Equal(t, fiber.StatusOK, status)
	require.Zero(t, noClaim.calls, "a token without signer_address isn't checked")
}
```

Create `internal/clients/tokenexchange/token-exchange_test.go`:

```go
package tokenexchange

import (
	"context"
	"net"
	"testing"

	pb "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

type signerCheckServer struct {
	pb.UnimplementedTokenExchangeServiceServer
	isSigner bool
}

func (s *signerCheckServer) SignerCheck(context.Context, *pb.SignerCheckRequest) (*pb.SignerCheckResponse, error) {
	return &pb.SignerCheckResponse{IsSigner: s.isSigner}, nil
}

func TestClientSignerChecker(t *testing.T) {
	for isSigner, want := range map[bool]signercheck.Result{true: signercheck.Allowed, false: signercheck.Denied} {
		lis := bufconn.Listen(1 << 20)
		server := grpc.NewServer()
		pb.RegisterTokenExchangeServiceServer(server, &signerCheckServer{isSigner: isSigner})
		go func() { _ = server.Serve(lis) }()
		t.Cleanup(server.Stop)
		conn, err := grpc.NewClient("passthrough:///bufconn",
			grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
			grpc.WithTransportCredentials(insecure.NewCredentials()),
		)
		require.NoError(t, err)
		t.Cleanup(func() { _ = conn.Close() })

		client := &Client{client: pb.NewTokenExchangeServiceClient(conn)}
		got, err := client.SignerChecker().Check(context.Background(),
			common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37"),
			common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5"))

		require.NoError(t, err)
		require.Equal(t, want, got)
	}
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `go test ./internal/auth/ ./internal/clients/tokenexchange/ -v`
Expected: build failures:

- `tok.SignerAddress undefined (type Token has no field or method SignerAddress)`;
- `undefined: SignerTokenInfo`;
- `client.SignerChecker undefined`.

- [ ] **Step 4: Implement the claim, the token reader and the client accessor**

In `internal/auth/auth.go`, extend `CustomDexClaims` (lines 28-33):

```go
// CustomDexClaims is the custom claims for the token.
type CustomDexClaims struct {
	ProviderID      string         `json:"provider_id"`
	AtHash          string         `json:"at_hash"`
	EmailVerified   bool           `json:"email_verified"`
	EthereumAddress common.Address `json:"ethereum_address"`
	// SignerAddress is the license signer (API key) that minted the token; the zero address
	// for tokens minted before dex set signer_address.
	SignerAddress common.Address `json:"signer_address"`
}
```

Add `"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"` to the imports and append:

```go
// SignerTokenInfo reads what signercheck.Middleware needs from the verified developer JWT.
func SignerTokenInfo(c *fiber.Ctx) (signercheck.TokenInfo, error) {
	token, err := GetDexJWT(c)
	if err != nil {
		return signercheck.TokenInfo{}, richerrors.Error{
			Code:        http.StatusInternalServerError,
			Err:         err,
			ExternalMsg: "failed to retrieve dex jwt",
		}
	}
	info := signercheck.TokenInfo{License: token.EthereumAddress}
	if token.SignerAddress != (common.Address{}) {
		info.Signer = token.SignerAddress.Hex()
	}
	if token.IssuedAt != nil {
		info.IssuedAt = token.IssuedAt.Time
	}
	return info, nil
}
```

Append to `internal/clients/tokenexchange/token-exchange.go` (add the `signercheck` import):

```go
// SignerChecker checks developer-JWT signers through token-exchange-api's SignerCheck, with
// a 5-second deadline per call.
func (c *Client) SignerChecker() *signercheck.GRPCChecker {
	return signercheck.NewGRPCChecker(c.client)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `go test ./internal/auth/ ./internal/clients/tokenexchange/ -v`
Expected: `PASS` for `TestTokenReadsSignerAddressClaim`, `TestSignerTokenInfo`, `TestSignerCheckOnWebhooksAPI` and `TestClientSignerChecker`.

- [ ] **Step 6: Wire the middleware and the setting**

In `internal/config/settings.go`, add to `Settings` (after `TokenExchangeGRPCAddr`):

```go
	// SignerCheckMode is enforce (default), log or off.
	SignerCheckMode string `env:"SIGNER_CHECK_MODE" envDefault:"enforce"`
```

In `internal/app/app.go`, add the `signercheck` import and replace lines 123-125:

```go
	jwtMiddleware := auth.Middleware(settings)
	devLicenseMiddleware := auth.NewDevLicenseValidator(identityClient)
	signerMode, err := signercheck.ParseMode(settings.SignerCheckMode)
	if err != nil {
		return nil, err
	}
	signerMiddleware := signercheck.Middleware(signercheck.Config{
		Service: "vehicle-triggers-api",
		Mode:    signerMode,
		Checker: tokenExchangeClient.SignerChecker(),
		Token:   auth.SignerTokenInfo,
		Logger:  logger,
	})
	devJWTAuth := app.Use(jwtMiddleware, devLicenseMiddleware, signerMiddleware)
```

Add these keys to the existing `env:` maps (shown with their parent).

In `charts/vehicle-triggers-api/values.yaml` (dev):

```yaml
env:
  TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-dev:8086
  SIGNER_CHECK_MODE: log
```

In `charts/vehicle-triggers-api/values-prod.yaml`, which already has `TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-prod:8086`:

```yaml
env:
  SIGNER_CHECK_MODE: log
```

Dev's `values.yaml` on `origin/main` has no `TOKEN_EXCHANGE_GRPC_ADDR`, and `internal/config/settings.go:22` has no default. The running dev configmap `vehicle-triggers-api-dev-config` and secret lack it too (checked 2026-10-02), so dev's existing permission checks can't reach token-exchange-api either. `kubectl get svc -n dev` shows the target, `token-exchange-api-dev`, serving gRPC on `8086/TCP`, the `grpc` port in token-exchange-api's chart.

Run: `go build ./... && go test ./... 2>&1 | tail -30`
Expected: every package reports `ok`.

- The `tests/e2e` fake token-exchange server embeds `UnimplementedTokenExchangeServiceServer`, so it still compiles.
- Its tokens carry no `signer_address`, so it never sees `SignerCheck`.
- Docker-backed packages need Docker running.

- [ ] **Step 7: Commit**

```bash
git add go.mod go.sum internal/config/settings.go internal/auth internal/clients/tokenexchange internal/app/app.go charts/vehicle-triggers-api/values.yaml charts/vehicle-triggers-api/values-prod.yaml
git commit -m "feat(auth): check the signer of every developer JWT through token-exchange SignerCheck"
```

### Task 11: record who created and who last changed each webhook

C3: `created_by_signer` is set on create. `updated_by_signer` is set whenever a request changes the target URL, the condition, or the subscribed vehicles. The vehicle routes are:

- `POST /v1/webhooks/:webhookId/subscribe/:assetDID`
- `POST /v1/webhooks/:webhookId/subscribe/list`
- `POST /v1/webhooks/:webhookId/subscribe/all`
- `DELETE /v1/webhooks/:webhookId/unsubscribe/:assetDID`
- `DELETE /v1/webhooks/:webhookId/unsubscribe/list`
- `DELETE /v1/webhooks/:webhookId/unsubscribe/all`

These are `internal/app/app.go:130-141` on `origin/main`; target URL and condition change through `PUT /v1/webhooks/:webhookId` (`webhook_controller.go` `UpdateWebhook`).

Rules:

- **Mark before the change.** A failed change after a successful mark over-attributes, which is the safe side for the console's removal review. A failed mark refuses the request before anything changes.
- **A request without `signer_address` leaves the mark alone.** Otherwise a later claimless change would erase a member's mark.
- **One writer per column.** `updated_by_signer` is written only by a single-column `UPDATE … SET updated_by_signer = $1` (`SetTriggerUpdatedBySigner`), on `PUT` and on every vehicle route alike. `UpdateTrigger`'s whole-row update excludes both signer columns, so concurrent requests can't write a stale mark back.

**Files:**

- Create: `internal/db/migrations/00006_trigger_signer_columns.sql`
- Modify:
  - `internal/db/models/triggers.go` (generated)
  - `internal/services/triggersrepo/triggersrepo.go:3-22` (imports), `:61-71` (`CreateTriggerRequest`), `:115-128` (insert), `:295-302` (`updateTrigger` blacklist), plus two new functions
  - `internal/controllers/webhook/webhook_controller.go` (`Repository` interface, `RegisterWebhook`, `UpdateWebhook`, `ListWebhooks`)
  - `internal/controllers/webhook/vehicle_subscription_controller.go` (six handlers and a helper)
  - `internal/controllers/webhook/types.go:77-102` (`WebhookView`)
  - `internal/controllers/webhook/webhook_controller_mock_test.go` (generated)
  - `docs/` (swagger, generated)
- Test:
  - `internal/services/triggersrepo/triggersrepo_test.go`
  - `internal/controllers/webhook/webhook_controller_test.go`
  - `internal/controllers/webhook/vehicle_subscription_controller_test.go`

**Interfaces:**

- Consumes: `auth.CustomDexClaims.SignerAddress` (Task 10).
- Produces:
  - columns `triggers.created_by_signer TEXT NULL` and `triggers.updated_by_signer TEXT NULL` (lowercase hex);
  - `triggersrepo.CreateTriggerRequest.CreatedBySigner common.Address`;
  - `triggersrepo.SignerValue(signer common.Address) null.String` (NULL for the zero address);
  - `(*triggersrepo.Repository).SetTriggerUpdatedBySigner(ctx context.Context, triggerID string, signer common.Address) error`: a single-column `UPDATE triggers SET updated_by_signer = $1 WHERE id = $2`, and a no-op for the zero address. It's the only code that writes `updated_by_signer`. `UpdateTrigger`'s whole-row update excludes both signer columns, so a request holding a stale row can't write an old mark back over a concurrent one;
  - `webhook.WebhookView.CreatedBySigner` and `UpdatedBySigner` (`string`, `json:"createdBySigner,omitempty"` / `json:"updatedBySigner,omitempty"`, checksummed).

  Part 3's removal review consumes the two JSON fields.

- [ ] **Step 1: Add the migration and regenerate the models**

```bash
make add-migration name=trigger_signer_columns
ls internal/db/migrations/
```

Expected: a new `00006_trigger_signer_columns.sql`. If goose numbered it differently, rename it to that. The unmerged `nats-jetstream-migration` line also has a `00006_…`; whichever merges second renumbers.

Replace its contents with:

```sql
-- +goose Up
-- +goose StatementBegin

-- The developer-license signers (API keys) whose JWTs created the webhook and last changed
-- its target URL, condition or subscribed vehicles, as lowercase hex. NULL when unknown:
-- before dex put signer_address on developer JWTs, or never changed. The DIMO console's
-- team removal review compares both to the signers a member was granted.
ALTER TABLE triggers
  ADD COLUMN IF NOT EXISTS created_by_signer TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_signer TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE triggers
  DROP COLUMN IF EXISTS updated_by_signer,
  DROP COLUMN IF EXISTS created_by_signer;

-- +goose StatementEnd
```

Port 5432 must be free; stop any other local Postgres first. Then run:

```bash
make generate-sqlboiler
grep -n "CreatedBySigner\|UpdatedBySigner" internal/db/models/triggers.go | head -4
git status --porcelain internal/db/models
```

Expected:

- `CreatedBySigner null.String` and `UpdatedBySigner null.String` appear in `Trigger`;
- only `internal/db/models/triggers.go` changed.

- [ ] **Step 2: Write the failing repository tests**

In `internal/services/triggersrepo/triggersrepo_test.go`, add inside `TestCreateTrigger` after `t.Run("success", …)`:

```go
	t.Run("records the creating signer as lowercase hex", func(t *testing.T) {
		req := baseReq
		req.CreatedBySigner = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")

		trigger, err := repo.CreateTrigger(ctx, req)
		require.NoError(t, err)

		stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
		require.NoError(t, err)
		assert.Equal(t, null.StringFrom("0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"), stored.CreatedBySigner)
		assert.False(t, stored.UpdatedBySigner.Valid)
	})

	t.Run("without a signer stores NULL", func(t *testing.T) {
		trigger, err := repo.CreateTrigger(ctx, baseReq)
		require.NoError(t, err)

		stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
		require.NoError(t, err)
		assert.False(t, stored.CreatedBySigner.Valid)
	})
```

Append a new test:

```go
func TestSetTriggerUpdatedBySigner(t *testing.T) {
	t.Parallel()
	tc := tests.SetupTestContainer(t)
	repo := NewRepository(tc.DB)
	ctx := context.Background()

	trigger, err := repo.CreateTrigger(ctx, CreateTriggerRequest{
		Service:                 ServiceSignal,
		MetricName:              "vss.speed",
		Condition:               "valueNumber > 20",
		TargetURI:               "https://example.com/webhook",
		Status:                  StatusEnabled,
		CooldownPeriod:          10,
		DeveloperLicenseAddress: tests.RandomAddr(t),
	})
	require.NoError(t, err)

	signer := common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
	require.NoError(t, repo.SetTriggerUpdatedBySigner(ctx, trigger.ID, signer))
	stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
	require.NoError(t, err)
	assert.Equal(t, null.StringFrom("0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"), stored.UpdatedBySigner)

	require.NoError(t, repo.SetTriggerUpdatedBySigner(ctx, trigger.ID, common.Address{}))
	stored, err = models.FindTrigger(ctx, tc.DB, trigger.ID)
	require.NoError(t, err)
	assert.Equal(t, null.StringFrom("0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"), stored.UpdatedBySigner, "a claimless change keeps the mark")
}

func TestUpdateTriggerKeepsSignerColumns(t *testing.T) {
	t.Parallel()
	tc := tests.SetupTestContainer(t)
	repo := NewRepository(tc.DB)
	ctx := context.Background()

	trigger, err := repo.CreateTrigger(ctx, CreateTriggerRequest{
		Service:                 ServiceSignal,
		MetricName:              "vss.speed",
		Condition:               "valueNumber > 20",
		TargetURI:               "https://example.com/webhook",
		Status:                  StatusEnabled,
		CooldownPeriod:          10,
		DeveloperLicenseAddress: tests.RandomAddr(t),
		CreatedBySigner:         common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5"),
	})
	require.NoError(t, err)

	// A PUT loads the row; meanwhile a vehicle route marks the webhook; then the PUT saves
	// its stale copy.
	stale, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
	require.NoError(t, err)
	require.NoError(t, repo.SetTriggerUpdatedBySigner(ctx, trigger.ID, common.HexToAddress("0x955029AC2539f4D57A1D7E6Ef2b97617e95Eb1D4")))
	stale.Description = null.StringFrom("renamed")
	stale.CreatedBySigner = null.String{}
	require.NoError(t, repo.UpdateTrigger(ctx, stale))

	stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
	require.NoError(t, err)
	assert.Equal(t, "renamed", stored.Description.String)
	assert.Equal(t, null.StringFrom("0x955029ac2539f4d57a1d7e6ef2b97617e95eb1d4"), stored.UpdatedBySigner, "a whole-row update doesn't write back a stale updated_by_signer")
	assert.Equal(t, null.StringFrom("0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"), stored.CreatedBySigner, "nor touch created_by_signer")
}
```

Run: `go test ./internal/services/triggersrepo/ -run 'TestCreateTrigger|TestSetTriggerUpdatedBySigner|TestUpdateTriggerKeepsSignerColumns' -v`
Expected: build failure, `req.CreatedBySigner undefined` and `repo.SetTriggerUpdatedBySigner undefined`.

- [ ] **Step 3: Implement the repository side**

In `internal/services/triggersrepo/triggersrepo.go`, add `"strings"` to the stdlib imports. Add the field to `CreateTriggerRequest` (after line 70):

```go
	DeveloperLicenseAddress common.Address
	// CreatedBySigner is the license signer (API key) whose JWT created the trigger; the zero
	// address when the JWT carried no signer_address.
	CreatedBySigner common.Address
}
```

In `CreateTrigger`'s `models.Trigger` literal (after line 124):

```go
		DeveloperLicenseAddress: req.DeveloperLicenseAddress.Bytes(),
		CreatedBySigner:         SignerValue(req.CreatedBySigner),
```

Add after `CreateTrigger`:

```go
// SignerValue stores a license signer as lowercase hex, or NULL for the zero address (a JWT
// without signer_address).
func SignerValue(signer common.Address) null.String {
	if signer == (common.Address{}) {
		return null.String{}
	}
	return null.StringFrom(strings.ToLower(signer.Hex()))
}

// SetTriggerUpdatedBySigner records the license signer whose JWT is changing the trigger's
// target URL, condition or subscribed vehicles. The zero address (a claimless JWT) leaves
// the existing value, so a later claimless change can't erase who changed it before.
func (r *Repository) SetTriggerUpdatedBySigner(ctx context.Context, triggerID string, signer common.Address) error {
	if signer == (common.Address{}) {
		return nil
	}
	_, err := models.Triggers(models.TriggerWhere.ID.EQ(triggerID)).
		UpdateAll(ctx, r.db, models.M{models.TriggerColumns.UpdatedBySigner: SignerValue(signer)})
	if err != nil {
		return richerrors.Error{
			ExternalMsg: "Failed to update webhook",
			Err:         fmt.Errorf("failed to record updated_by_signer on trigger %s: %w", triggerID, err),
			Code:        http.StatusInternalServerError,
		}
	}
	return nil
}
```

In `updateTrigger` (lines 295-302), add both signer columns to the blacklist. `UpdateTrigger` then never writes them, and a stale whole-row update can't overwrite a concurrent mark:

```go
	ret, err := trigger.Update(ctx, tx, boil.Blacklist(models.TriggerColumns.ID,
		models.TriggerColumns.ID,
		models.TriggerColumns.DeveloperLicenseAddress,
		models.TriggerColumns.Service,
		models.TriggerColumns.CreatedAt,
		models.TriggerColumns.CreatedBySigner,
		models.TriggerColumns.UpdatedBySigner,
	))
```

Run: `go test ./internal/services/triggersrepo/ -run 'TestCreateTrigger|TestSetTriggerUpdatedBySigner|TestUpdateTriggerKeepsSignerColumns' -v`
Expected: `PASS`. These tests need Docker for testcontainers. To see `TestUpdateTriggerKeepsSignerColumns` guard the race, temporarily remove the two blacklist lines; it fails with `expected "0x955029…" actual ""`. Restore them.

- [ ] **Step 4: Write the failing controller tests**

In `internal/controllers/webhook/webhook_controller_test.go`, add after `tokenInjector`:

```go
func tokenInjectorWithSigner(address, signer common.Address) fiber.Handler {
	jwtToken := &jwt.Token{Claims: &auth.Token{CustomDexClaims: auth.CustomDexClaims{
		EthereumAddress: address,
		SignerAddress:   signer,
	}}}
	return func(c *fiber.Ctx) error {
		c.Locals(auth.UserJwtKey, jwtToken)
		return c.Next()
	}
}

var testSigner = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")

const testSignerLower = "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"
```

Add inside `TestWebhookController_RegisterWebhook`:

```go
	t.Run("records the signer that created the webhook", func(t *testing.T) {
		controller, mockRepo, _ := newWebhookControllerAndMocks(t)

		app := newApp()
		devLicense := common.HexToAddress("0x1234567890abcdef")
		app.Use(tokenInjectorWithSigner(devLicense, testSigner))
		app.Post("/webhooks", controller.RegisterWebhook)

		testServer := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = fmt.Fprint(w, "test-token")
		}))
		defer testServer.Close()

		var got triggersrepo.CreateTriggerRequest
		mockRepo.EXPECT().
			CreateTrigger(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, req triggersrepo.CreateTriggerRequest) (*models.Trigger, error) {
				got = req
				return &models.Trigger{ID: "test-trigger-id"}, nil
			})

		body, _ := json.Marshal(RegisterWebhookRequest{
			Service:           triggersrepo.ServiceSignal,
			MetricName:        "vss.speed",
			Condition:         "valueNumber > 55",
			CoolDownPeriod:    30,
			TargetURL:         testServer.URL,
			Status:            "enabled",
			VerificationToken: "test-token",
		})
		req := httptest.NewRequest(http.MethodPost, "/webhooks", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		require.NoError(t, err)
		defer resp.Body.Close() //nolint:errcheck // fine for tests

		require.Equal(t, fiber.StatusCreated, resp.StatusCode)
		assert.Equal(t, testSigner, got.CreatedBySigner)
	})
```

Add inside `TestWebhookController_ListWebhooks`:

```go
	t.Run("returns both signer fields checksummed and omits them when unknown", func(t *testing.T) {
		controller, mockRepo, _ := newWebhookControllerAndMocks(t)

		app := newApp()
		app.Use(tokenInjector(common.HexToAddress("0x1234567890abcdef")))
		app.Get("/webhooks", controller.ListWebhooks)

		mockRepo.EXPECT().
			GetTriggersByDeveloperLicense(gomock.Any(), gomock.Any()).
			Return([]*models.Trigger{
				{ID: "by-member", CreatedBySigner: null.StringFrom(testSignerLower), UpdatedBySigner: null.StringFrom(testSignerLower)},
				{ID: "legacy"},
			}, nil)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/webhooks", nil))
		require.NoError(t, err)
		defer resp.Body.Close() //nolint:errcheck // fine for tests
		require.Equal(t, fiber.StatusOK, resp.StatusCode)

		var raw []map[string]any
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&raw))
		require.Len(t, raw, 2)
		assert.Equal(t, testSigner.Hex(), raw[0]["createdBySigner"])
		assert.Equal(t, testSigner.Hex(), raw[0]["updatedBySigner"])
		assert.NotContains(t, raw[1], "createdBySigner")
		assert.NotContains(t, raw[1], "updatedBySigner")
	})
```

Append a new test for `UpdateWebhook`:

```go
func TestWebhookController_UpdateWebhookRecordsTheSigner(t *testing.T) {
	t.Parallel()
	webhookID := "550e8400-e29b-41d4-a716-446655440000"
	devLicense := common.HexToAddress("0x1234567890abcdef")

	tests := []struct {
		name    string
		signer  common.Address
		payload string
		marks   bool
	}{
		{name: "a target URL change marks the signer before saving", signer: testSigner, payload: `{"targetURL":"https://example.com/new"}`, marks: true},
		{name: "a condition change marks the signer before saving", signer: testSigner, payload: `{"condition":"valueNumber > 60"}`, marks: true},
		{name: "a description change does not mark", signer: testSigner, payload: `{"description":"renamed"}`},
		{name: "a claimless target change does not mark", payload: `{"targetURL":"https://example.com/new"}`},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			controller, mockRepo, mockCache := newWebhookControllerAndMocks(t)
			app := newApp()
			app.Use(tokenInjectorWithSigner(devLicense, tc.signer))
			app.Put("/webhooks/:webhookId", controller.UpdateWebhook)

			mockRepo.EXPECT().GetTriggerByIDAndDeveloperLicense(gomock.Any(), webhookID, devLicense).Return(&models.Trigger{
				ID:                      webhookID,
				DeveloperLicenseAddress: devLicense.Bytes(),
				Service:                 triggersrepo.ServiceSignal,
				MetricName:              "vss.speed",
			}, nil)
			update := mockRepo.EXPECT().UpdateTrigger(gomock.Any(), gomock.Any()).Return(nil)
			if tc.marks {
				gomock.InOrder(
					mockRepo.EXPECT().SetTriggerUpdatedBySigner(gomock.Any(), webhookID, testSigner).Return(nil),
					update,
				)
			}
			mockCache.EXPECT().ScheduleRefresh(gomock.Any())

			req := httptest.NewRequest(http.MethodPut, "/webhooks/"+webhookID, strings.NewReader(tc.payload))
			req.Header.Set("Content-Type", "application/json")
			resp, err := app.Test(req)
			require.NoError(t, err)
			defer resp.Body.Close() //nolint:errcheck // fine for tests

			require.Equal(t, fiber.StatusOK, resp.StatusCode)
		})
	}
}
```

Add `"strings"` to that file's imports. In `internal/controllers/webhook/vehicle_subscription_controller_test.go`, append:

```go
func TestWebhookChangesRecordTheSigner(t *testing.T) {
	t.Parallel()
	webhookID := "550e8400-e29b-41d4-a716-446655440000"
	devLicense := common.HexToAddress("0x1234567890abcdef")
	assetDid := cloudevent.ERC721DID{
		ChainID:         137,
		ContractAddress: common.HexToAddress("0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF"),
		TokenID:         big.NewInt(12345),
	}
	listBody, err := json.Marshal(VehicleListRequest{AssetDIDs: []cloudevent.ERC721DID{assetDid}})
	require.NoError(t, err)

	type route struct {
		method, path string
		body         []byte
		handler      func(c ControllerWithMocks) fiber.Handler
		mutation     func(c ControllerWithMocks) *gomock.Call
		before       func(c ControllerWithMocks)
	}
	permitted := func(c ControllerWithMocks) {
		c.mockTokenExchange.EXPECT().HasVehiclePermissions(gomock.Any(), assetDid, devLicense, gomock.Any()).Return(true, nil)
	}
	routes := map[string]route{
		"subscribe one": {
			method: http.MethodPost, path: "/webhooks/:webhookId/subscribe/:assetDID",
			handler:  func(c ControllerWithMocks) fiber.Handler { return c.controller.AssignVehicleToWebhook },
			before:   permitted,
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().CreateVehicleSubscription(gomock.Any(), assetDid, webhookID).Return(&models.VehicleSubscription{}, nil) },
		},
		"subscribe list": {
			method: http.MethodPost, path: "/webhooks/:webhookId/subscribe/list", body: listBody,
			handler:  func(c ControllerWithMocks) fiber.Handler { return c.controller.SubscribeVehiclesFromList },
			before:   permitted,
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().CreateVehicleSubscription(gomock.Any(), assetDid, webhookID).Return(&models.VehicleSubscription{}, nil) },
		},
		"subscribe all": {
			method: http.MethodPost, path: "/webhooks/:webhookId/subscribe/all",
			handler: func(c ControllerWithMocks) fiber.Handler { return c.controller.SubscribeAllVehiclesToWebhook },
			before: func(c ControllerWithMocks) {
				c.mockIdentityAPI.EXPECT().GetSharedVehicles(gomock.Any(), devLicense.Bytes()).Return([]cloudevent.ERC721DID{assetDid}, nil)
				permitted(c)
			},
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().CreateVehicleSubscription(gomock.Any(), assetDid, webhookID).Return(&models.VehicleSubscription{}, nil) },
		},
		"unsubscribe one": {
			method: http.MethodDelete, path: "/webhooks/:webhookId/unsubscribe/:assetDID",
			handler:  func(c ControllerWithMocks) fiber.Handler { return c.controller.RemoveVehicleFromWebhook },
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().DeleteVehicleSubscription(gomock.Any(), webhookID, assetDid).Return(int64(1), nil) },
		},
		"unsubscribe list": {
			method: http.MethodDelete, path: "/webhooks/:webhookId/unsubscribe/list", body: listBody,
			handler:  func(c ControllerWithMocks) fiber.Handler { return c.controller.UnsubscribeVehiclesFromList },
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().DeleteVehicleSubscription(gomock.Any(), webhookID, assetDid).Return(int64(1), nil) },
		},
		"unsubscribe all": {
			method: http.MethodDelete, path: "/webhooks/:webhookId/unsubscribe/all",
			handler:  func(c ControllerWithMocks) fiber.Handler { return c.controller.UnsubscribeAllVehiclesFromWebhook },
			mutation: func(c ControllerWithMocks) *gomock.Call { return c.mockRepo.EXPECT().DeleteAllVehicleSubscriptionsForTrigger(gomock.Any(), webhookID).Return(int64(1), nil) },
		},
	}

	for name, r := range routes {
		t.Run(name, func(t *testing.T) {
			c := NewVehicleSubscriptionControllerAndMocks(t)
			app := newApp()
			app.Use(tokenInjectorWithSigner(devLicense, testSigner))
			app.Add(r.method, r.path, r.handler(c))

			c.mockRepo.EXPECT().GetTriggerByIDAndDeveloperLicense(gomock.Any(), webhookID, devLicense).Return(&models.Trigger{
				ID: webhookID, DeveloperLicenseAddress: devLicense.Bytes(), Service: triggersrepo.ServiceSignal, MetricName: "vss.speed",
			}, nil)
			if r.before != nil {
				r.before(c)
			}
			gomock.InOrder(
				c.mockRepo.EXPECT().SetTriggerUpdatedBySigner(gomock.Any(), webhookID, testSigner).Return(nil),
				r.mutation(c),
			)
			c.mockCache.EXPECT().ScheduleRefresh(gomock.Any())

			path := strings.NewReplacer(":webhookId", webhookID, ":assetDID", url.PathEscape(assetDid.String())).Replace(r.path)
			req := httptest.NewRequest(r.method, path, bytes.NewReader(r.body))
			req.Header.Set("Content-Type", "application/json")
			resp, err := app.Test(req)
			require.NoError(t, err)
			require.Less(t, resp.StatusCode, 300)
		})
	}

	t.Run("a claimless change records nothing", func(t *testing.T) {
		c := NewVehicleSubscriptionControllerAndMocks(t)
		app := newApp()
		app.Use(tokenInjector(devLicense))
		app.Delete("/webhooks/:webhookId/unsubscribe/all", c.controller.UnsubscribeAllVehiclesFromWebhook)
		c.mockRepo.EXPECT().GetTriggerByIDAndDeveloperLicense(gomock.Any(), webhookID, devLicense).Return(&models.Trigger{
			ID: webhookID, DeveloperLicenseAddress: devLicense.Bytes(),
		}, nil)
		c.mockRepo.EXPECT().DeleteAllVehicleSubscriptionsForTrigger(gomock.Any(), webhookID).Return(int64(1), nil)
		c.mockCache.EXPECT().ScheduleRefresh(gomock.Any())

		resp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/webhooks/"+webhookID+"/unsubscribe/all", nil))
		require.NoError(t, err)
		require.Equal(t, fiber.StatusOK, resp.StatusCode)
	})
}
```

Add `"strings"` and `"github.com/gofiber/fiber/v2"` to that file's imports if missing.

Run:

```bash
go test ./internal/controllers/webhook/ -run 'TestWebhookController_RegisterWebhook|TestWebhookController_ListWebhooks|TestWebhookController_UpdateWebhookRecordsTheSigner|TestWebhookChangesRecordTheSigner' -v
```

Expected: build failure, `c.mockRepo.EXPECT().SetTriggerUpdatedBySigner undefined (type *MockRepositoryMockRecorder has no field or method SetTriggerUpdatedBySigner)`. The model fields (Step 1) and `CreateTriggerRequest.CreatedBySigner` (Step 3) already exist; the controller doesn't use them yet.

- [ ] **Step 5: Implement the controller side**

In `internal/controllers/webhook/webhook_controller.go`, add to the `Repository` interface:

```go
	// SetTriggerUpdatedBySigner records the signer changing a trigger's target URL, condition
	// or vehicles; the zero address is a no-op.
	SetTriggerUpdatedBySigner(ctx context.Context, triggerID string, signer common.Address) error
```

In `RegisterWebhook`'s `CreateTriggerRequest` literal:

```go
		DisplayName:             payload.DisplayName,
		CreatedBySigner:         token.SignerAddress,
	}
```

In `UpdateWebhook`, note when the target URL or condition changes, and mark the signer through the single-column `SetTriggerUpdatedBySigner` (by way of `markChanged`, below) before `UpdateTrigger` saves the row. Replace the two `if payload.TargetURL != nil {…}` and `if payload.Condition != nil {…}` blocks with:

```go
	changesDelivery := false
	if payload.TargetURL != nil {
		if err := validateTargetURL(*payload.TargetURL); err != nil {
			return err
		}
		event.TargetURI = *payload.TargetURL
		changesDelivery = true
	}
```

```go
	if payload.Condition != nil {
		if err := validateServiceAndMetricNameAndCondition(event.Service, event.MetricName, *payload.Condition); err != nil {
			return err
		}
		event.Condition = *payload.Condition
		changesDelivery = true
	}
```

Keep the `Status` block between them unchanged. Then, just before `w.repo.UpdateTrigger(c.Context(), event)`:

```go
	if changesDelivery {
		if err := markChanged(c, w.repo, event.ID); err != nil {
			return err
		}
	}
```

`UpdateTrigger` no longer writes either signer column (Step 3's blacklist), so this PUT can't overwrite a mark a vehicle route sets concurrently, and the vehicle routes can't overwrite this one.

In `ListWebhooks`, compute both fields next to `desc` and set them on the view:

```go
		createdBy, updatedBy := "", ""
		if t.CreatedBySigner.Valid {
			createdBy = common.HexToAddress(t.CreatedBySigner.String).Hex()
		}
		if t.UpdatedBySigner.Valid {
			updatedBy = common.HexToAddress(t.UpdatedBySigner.String).Hex()
		}
```

```go
			DisplayName:     t.DisplayName,
			CreatedBySigner: createdBy,
			UpdatedBySigner: updatedBy,
		})
```

In `internal/controllers/webhook/types.go`, add to `WebhookView` after `DisplayName`:

```go
	// CreatedBySigner is the license signer (API key) whose JWT created the webhook,
	// checksummed. Omitted for webhooks created before JWTs carried signer_address.
	CreatedBySigner string `json:"createdBySigner,omitempty"`
	// UpdatedBySigner is the license signer whose JWT last changed the webhook's target URL,
	// condition or subscribed vehicles. Omitted when unknown.
	UpdatedBySigner string `json:"updatedBySigner,omitempty"`
```

In `internal/controllers/webhook/vehicle_subscription_controller.go`, add after `getDevLicense`:

```go
func getSigner(c *fiber.Ctx) (common.Address, error) {
	token, err := auth.GetDexJWT(c)
	if err != nil {
		return common.Address{}, err
	}
	return token.SignerAddress, nil
}

// markChanged records the request's signer as the one changing the webhook's subscribed
// vehicles. It runs before the change: if the change then fails, the webhook is
// over-attributed, which only widens the console's removal review.
func markChanged(c *fiber.Ctx, repo Repository, webhookID string) error {
	signer, err := getSigner(c)
	if err != nil {
		return err
	}
	if signer == (common.Address{}) {
		return nil
	}
	return repo.SetTriggerUpdatedBySigner(c.Context(), webhookID, signer)
}
```

Call `markChanged` immediately before each mutation, returning its error:

- **`AssignVehicleToWebhook`:** after the `!hasPerm` check, before `v.repo.CreateVehicleSubscription`.
- **`subscribeMultipleVehiclesToWebhook`:** after the permission loop, before the creation loop. This covers `SubscribeVehiclesFromList` and `SubscribeAllVehiclesToWebhook`.
- **`UnsubscribeVehiclesFromList`:** after the body is parsed, before the deletion loop.
- **`RemoveVehicleFromWebhook`:** after `ownerCheck`, before `v.repo.DeleteVehicleSubscription`.
- **`UnsubscribeAllVehiclesFromWebhook`:** after `ownerCheck`, before `v.repo.DeleteAllVehicleSubscriptionsForTrigger`.

Each call is:

```go
	if err := markChanged(c, v.repo, webhookID); err != nil {
		return err
	}
```

Regenerate the mocks and run the tests:

```bash
go generate ./internal/controllers/webhook/
go test ./internal/controllers/webhook/ ./internal/services/triggersrepo/ -v 2>&1 | tail -40
```

Expected: `PASS`, including every subtest of `TestWebhookChangesRecordTheSigner`, `TestWebhookController_UpdateWebhookRecordsTheSigner` and `TestUpdateTriggerKeepsSignerColumns`. Existing tests still pass unchanged: their tokens carry no signer, so `SetTriggerUpdatedBySigner` is never called.

- [ ] **Step 6: Regenerate swagger, then run the suite, lint and the generator check**

```bash
make generate-swagger
grep -n "createdBySigner\|updatedBySigner" docs/swagger.yaml
go test ./...
make tools-golangci-lint
make lint
make generate
git status --porcelain
```

Expected:

- both fields appear under `webhook.WebhookView`;
- every package reports `ok`;
- no lint findings;
- `git status --porcelain` lists only Task 10's and this task's files.

- [ ] **Step 7: Commit**

```bash
git add internal/db/migrations/00006_trigger_signer_columns.sql internal/db/models/triggers.go internal/services/triggersrepo internal/controllers/webhook docs
git commit -m "feat: record the signers that create and change each webhook"
```

### Task 12: vehicle-triggers-api pull request

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/vehicle-triggers-api-signer-check
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/vehicle-triggers-api --base main --head feat/signer-check \
  --title "feat: refuse disabled signers and record who creates and changes webhooks" --body-file - <<'EOF'
## Why

The console's team feature gives each member their own license signer, and removing a member disables it. Their existing developer JWTs must stop working here within a minute. The owner also needs to see which webhooks the member created or redirected, because a webhook keeps sending data after its creator leaves.

## What

- **Authenticated routes:** after the dev-license check, tokens with `signer_address` (set by dex) are checked through token-exchange-api's `SignerCheck` gRPC (5 s deadline; token-exchange caches for 60 s). This uses token-exchange-api's shared `pkg/signercheck`.
  - Disabled signer: `403 signer no longer authorized for this license`.
  - gRPC failure: `503 could not verify signer`.
  - Tokens without the claim pass.
- **`SIGNER_CHECK_MODE`** (`enforce` default, `log`, `off`); the chart sets `log` in dev and prod for the rollout.
- **Dev `TOKEN_EXCHANGE_GRPC_ADDR`:** dev's `values.yaml` never set it (only `values-prod.yaml` did), so dev couldn't reach token-exchange-api at all. It now points at `token-exchange-api-dev:8086`.
- **Metric** `signer_check_total{service="vehicle-triggers-api",result}`.
- **Migration `00006`:** `triggers.created_by_signer` (set on create) and `triggers.updated_by_signer` (set when a request changes the target URL, the condition, or the subscribed vehicles, on all six subscribe and unsubscribe routes). Both are nullable lowercase hex.
  - The mark is written before the change, so a failed change over-attributes rather than hiding the actor.
  - Claimless requests leave the mark untouched.
  - The mark is only ever written by a single-column `UPDATE`; `UpdateTrigger`'s whole-row update now excludes both signer columns, so concurrent requests can't write a stale value back.
- **`GET /v1/webhooks`** returns `createdBySigner` and `updatedBySigner`, checksummed and omitted when unknown.
- **`token-exchange-api`** bumped to the commit with `SignerCheck` and `pkg/signercheck`.

## Release order

token-exchange-api with `SignerCheck` must be live in an environment before this.

## Migration note

The unmerged `nats-jetstream-migration` line also adds a `00006_…` migration. Whichever merges second renumbers.

## Successor services

`vt` isn't live. If it replaces this service, it needs the same check and the same two fields.

## Tests

- `TestSignerCheckOnWebhooksAPI` (enforce, log, no claim), `TestTokenReadsSignerAddressClaim`, `TestSignerTokenInfo`, `TestClientSignerChecker`.
- `TestCreateTrigger` (created_by stored lowercase; NULL without), `TestSetTriggerUpdatedBySigner` (claimless keeps the mark), `TestUpdateTriggerKeepsSignerColumns` (a stale whole-row update doesn't overwrite either column).
- `TestWebhookController_UpdateWebhookRecordsTheSigner`.
- `TestWebhookChangesRecordTheSigner`: all six vehicle routes mark before mutating; claimless records nothing.
- The list returns or omits both fields.
EOF
```

Expected: a PR URL. Merge after review and green CI, once Task 9's PR has merged and token-exchange-api's dev deploy has landed (the `Update Image Version to <sha>` commit on its `main`).

---

## tesla-oracle

### Task 13: signer check on `/v1/telemetry/*`, with PR

Production tesla-oracle trusts `auth.dimo.zone` tokens (`charts/tesla-oracle/values-prod.yaml:20`, `JWT_KEY_SET_URL`). It accepts any token whose `ethereum_address` is the DIMO license on:

- `POST /v1/telemetry/subscribe/:vehicleTokenId`
- `POST /v1/telemetry/unsubscribe/:vehicleTokenId`
- `POST /v1/telemetry/:vehicleTokenId/start`

These routes are at `internal/app/app.go:117-119`, with the license checks at `internal/service/tesla.go:52` and `:162`, comparing with `MOBILE_APP_DEV_LICENSE`. A removed member's still-valid developer JWT for that license could keep managing Tesla telemetry, so these routes get the check. Line references are to `origin/main` (a9446c4); the local checkout is 20 commits behind.

**Files:**

- Modify:
  - `go.mod`, `go.sum`
  - `internal/config/settings.go` (two settings)
  - `internal/app/app.go:26-33` (`App` signature) and `:116` (telemetry group)
  - `internal/bootstrap/server.go:46-63` (`Initialize`)
  - `charts/tesla-oracle/values.yaml`, `values-prod.yaml` (`env`)
- Create: `internal/app/signercheck.go`, `internal/app/signercheck_test.go`
- Test: `internal/app/signercheck_test.go`

**Interfaces:**

- Consumes: `signercheck.Middleware`, `Config`, `ParseMode`, `MapClaimsToken`, `NewGRPCChecker`, `Checker`, `MessageDenied` (Task 5); `txgrpc.NewTokenExchangeServiceClient` (Task 8).
- Produces:
  - `config.Settings.TokenExchangeGRPCAddr string` (`yaml:"TOKEN_EXCHANGE_GRPC_ADDR"`) and `config.Settings.SignerCheckMode string` (`yaml:"SIGNER_CHECK_MODE"`);
  - `app.SignerCheck(settings *config.Settings, checker signercheck.Checker, logger *zerolog.Logger) (fiber.Handler, error)`;
  - `app.App(…, commandRepo repository.CommandRepository, signerCheck fiber.Handler) *fiber.App`.

- [ ] **Step 1: Create the worktree and take the merged token-exchange-api**

```bash
git -C ~/workspace/tesla-oracle fetch origin
git -C ~/workspace/tesla-oracle worktree add ~/workspace/tesla-oracle-signer-check -b feat/signer-check origin/main
cd ~/workspace/tesla-oracle-signer-check
go get github.com/DIMO-Network/token-exchange-api@main
go mod tidy
go doc github.com/DIMO-Network/token-exchange-api/pkg/signercheck NewGRPCChecker
```

Expected: `go doc` prints `func NewGRPCChecker(client txgrpc.TokenExchangeServiceClient) *GRPCChecker`.

- [ ] **Step 2: Write the failing test**

Create `internal/app/signercheck_test.go`:

```go
package app

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/DIMO-Network/tesla-oracle/internal/config"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

var (
	mobileLicense = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	memberSigner  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

type fakeChecker struct {
	result signercheck.Result
	calls  int
}

func (f *fakeChecker) Check(context.Context, common.Address, common.Address) (signercheck.Result, error) {
	f.calls++
	return f.result, nil
}

func serveTelemetry(t *testing.T, mode string, checker *fakeChecker, claims jwt.MapClaims) (int, ErrorRes) {
	t.Helper()
	logger := zerolog.Nop()
	handler, err := SignerCheck(&config.Settings{SignerCheckMode: mode}, checker, &logger)
	require.NoError(t, err)

	app := fiber.New(fiber.Config{ErrorHandler: func(c *fiber.Ctx, err error) error { return ErrorHandler(c, err, &logger) }})
	app.Post("/v1/telemetry/subscribe/:vehicleTokenId",
		func(c *fiber.Ctx) error {
			c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, claims))
			return c.Next()
		},
		handler,
		func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	resp, err := app.Test(httptest.NewRequest("POST", "/v1/telemetry/subscribe/1", nil), -1)
	require.NoError(t, err)
	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	var body ErrorRes
	if resp.StatusCode != fiber.StatusOK {
		require.NoError(t, json.Unmarshal(raw, &body))
	}
	return resp.StatusCode, body
}

func TestSignerCheckOnTelemetryRoutes(t *testing.T) {
	memberToken := jwt.MapClaims{"ethereum_address": mobileLicense.Hex(), "signer_address": memberSigner.Hex()}

	status, body := serveTelemetry(t, "enforce", &fakeChecker{result: signercheck.Denied}, memberToken)
	require.Equal(t, fiber.StatusForbidden, status)
	require.Equal(t, signercheck.MessageDenied, body.Message)

	status, _ = serveTelemetry(t, "", &fakeChecker{result: signercheck.Allowed}, memberToken)
	require.Equal(t, fiber.StatusOK, status, "empty mode means enforce, and an enabled signer passes")

	status, _ = serveTelemetry(t, "log", &fakeChecker{result: signercheck.Denied}, memberToken)
	require.Equal(t, fiber.StatusOK, status, "log mode never refuses")

	ownerApp := &fakeChecker{result: signercheck.Denied}
	status, _ = serveTelemetry(t, "enforce", ownerApp, jwt.MapClaims{"ethereum_address": mobileLicense.Hex()})
	require.Equal(t, fiber.StatusOK, status, "the mobile backend's own claimless tokens pass")
	require.Zero(t, ownerApp.calls)

	logger := zerolog.Nop()
	_, err := SignerCheck(&config.Settings{SignerCheckMode: "strict"}, &fakeChecker{}, &logger)
	require.ErrorContains(t, err, "SIGNER_CHECK_MODE")
}
```

Run: `go test ./internal/app/ -run TestSignerCheckOnTelemetryRoutes -v`
Expected: build failure: `undefined: SignerCheck` and `unknown field SignerCheckMode in struct literal of type config.Settings`.

- [ ] **Step 3: Implement the settings and the middleware builder**

In `internal/config/settings.go`, add to `Settings` (after `MobileAppDevLicense`):

```go
	// TokenExchangeGRPCAddr is token-exchange-api's gRPC address, for SignerCheck.
	TokenExchangeGRPCAddr string `yaml:"TOKEN_EXCHANGE_GRPC_ADDR"`
	// SignerCheckMode is enforce (default), log or off.
	SignerCheckMode string `yaml:"SIGNER_CHECK_MODE"`
```

Create `internal/app/signercheck.go`:

```go
package app

import (
	"github.com/DIMO-Network/tesla-oracle/internal/config"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
)

// SignerCheck builds the middleware that refuses developer JWTs whose license signer has
// been disabled since they were minted (token-exchange-api's SignerCheck). It guards the
// /v1/telemetry routes, which accept the DIMO Mobile license's developer JWTs.
func SignerCheck(settings *config.Settings, checker signercheck.Checker, logger *zerolog.Logger) (fiber.Handler, error) {
	mode, err := signercheck.ParseMode(settings.SignerCheckMode)
	if err != nil {
		return nil, err
	}
	return signercheck.Middleware(signercheck.Config{
		Service: "tesla-oracle",
		Mode:    mode,
		Checker: checker,
		Token:   signercheck.MapClaimsToken("user"),
		Logger:  *logger,
	}), nil
}
```

Run: `go test ./internal/app/ -run TestSignerCheckOnTelemetryRoutes -v`
Expected: `PASS`.

- [ ] **Step 4: Mount it on the telemetry routes and build the client at startup**

In `internal/app/app.go`, add a final parameter to `App` (lines 26-33):

```go
func App(
	settings *config.Settings,
	logger *zerolog.Logger,
	teslaService *service.TeslaService,
	vehicleOnboardService service.VehicleOnboardService,
	riverClient *river.Client[pgx.Tx],
	commandRepo repository.CommandRepository,
	signerCheck fiber.Handler,
) *fiber.App {
```

and change the telemetry group (line 116):

```go
	telemetryGroup := app.Group("/v1/telemetry", jwtAuth, walletMdw, signerCheck)
```

In `internal/bootstrap/server.go`, add these imports:

```go
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	txgrpc "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"google.golang.org/grpc/credentials/insecure"
```

At the top of `Initialize` (line 46), build the checker the way `NewDevicesGRPCService` builds its client, and pass the handler to `app.App`:

```go
func (sm *ServerManager) Initialize() error {
	tokenExchangeConn, err := grpc.NewClient(sm.settings.TokenExchangeGRPCAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return fmt.Errorf("failed to create token-exchange gRPC client: %w", err)
	}
	signerCheck, err := app.SignerCheck(sm.settings, signercheck.NewGRPCChecker(txgrpc.NewTokenExchangeServiceClient(tokenExchangeConn)), sm.logger)
	if err != nil {
		return err
	}

	// Create monitoring server
	sm.monitoringApp = sm.createMonitoringServer()

	// Create web application
	sm.webApp = app.App(
		sm.settings,
		sm.logger,
		sm.services.TeslaService,
		sm.services.VehicleOnboardService,
		sm.services.RiverClient,
		sm.services.Repositories.Command,
		signerCheck,
	)
```

Add these keys to the existing `env:` maps (shown with their parent). In `charts/tesla-oracle/values.yaml` (dev):

```yaml
env:
  TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-dev:8086
  SIGNER_CHECK_MODE: log
```

In `charts/tesla-oracle/values-prod.yaml`:

```yaml
env:
  TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-prod:8086
  SIGNER_CHECK_MODE: log
```

Neither file sets `TOKEN_EXCHANGE_GRPC_ADDR` today; the running `tesla-oracle-dev-config` has only `TOKEN_EXCHANGE_JWK_KEY_SET_URL`. tesla-oracle runs in the `dev` and `prod` namespaces, where `kubectl get svc` shows `token-exchange-api-dev` and `token-exchange-api-prod` serving gRPC on `8086`. vehicle-triggers-api's `values-prod.yaml` already uses the same prod name.

Run:

```bash
grep -rn "app.App(" --include='*.go' .
go build ./... && make test
make tools-golangci-lint && make lint
```

Expected:

- `app.App(` appears only in `internal/bootstrap/server.go`;
- the build succeeds and `make test` passes;
- no lint findings.

- [ ] **Step 5: Commit, push and open the PR**

```bash
git add go.mod go.sum internal/config/settings.go internal/app/app.go internal/app/signercheck.go internal/app/signercheck_test.go internal/bootstrap/server.go charts/tesla-oracle/values.yaml charts/tesla-oracle/values-prod.yaml
git commit -m "feat: refuse disabled license signers on the telemetry routes"
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/tesla-oracle --base main --head feat/signer-check \
  --title "feat: refuse disabled license signers on /v1/telemetry" --body-file - <<'EOF'
## Why

`/v1/telemetry/subscribe`, `/unsubscribe` and `/:vehicleTokenId/start` accept any `auth.dimo.zone` token whose wallet is the DIMO Mobile license. The DIMO console now gives team members their own signer on a license and disables it when they're removed. dex stamps that signer on developer JWTs as `signer_address`, and this PR makes tesla-oracle refuse a removed member's still-valid token.

## What

- **The three telemetry routes** check tokens carrying `signer_address` through token-exchange-api's `SignerCheck` gRPC (5 s deadline; token-exchange caches for 60 s and skips addresses that aren't licenses).
  - Disabled signer: `403 signer no longer authorized for this license`.
  - gRPC failure: `503 could not verify signer`.
  - Tokens without the claim, including the mobile backend's own, pass.
- **New settings:** `TOKEN_EXCHANGE_GRPC_ADDR` and `SIGNER_CHECK_MODE` (`enforce` default, `log`, `off`). The chart sets `log` in dev and prod for the rollout; production switches to `enforce` after a week.
- **Metric** `signer_check_total{service="tesla-oracle",result}`, alerted on from token-exchange-api's PrometheusRule.

## Release order

token-exchange-api with `SignerCheck` must be live in an environment before this.

## Successor services

`dauth` and `vt` aren't live. If either takes over these routes, it needs the same check.

## Tests

`TestSignerCheckOnTelemetryRoutes`: enforce refuses, empty mode enforces and allows an enabled signer, log never refuses, claimless tokens skip the check, an invalid mode fails startup.
EOF
```

Expected: a PR URL. Merge after review and green CI, once token-exchange-api's dev deploy has landed.

---

## credit-tracker

### Task 14: signer check on the license routes, with PR

Production credit-tracker trusts `auth.dimo.zone` tokens (`charts/credit-tracker/values-prod.yaml:14`). Its license routes, `internal/app/app.go:62-63`, check only that `ethereum_address` equals `:licenseId` (`internal/controllers/httphandlers/httphandler.go:133`):

- `GET /v1/credits/:licenseId/usage`
- `GET /v1/credits/:licenseId/assets/:assetId/usage`

They are the service's only HTTP routes besides swagger, and both get the check. Line references are to `origin/main` (4cc9b9a).

**Files:**

- Modify:
  - `go.mod`, `go.sum`
  - `internal/config/settings.go` (two settings)
  - `internal/auth/auth.go` (claim and a new func)
  - `internal/app/app.go:30-38` (`CreateServers`), `:40-66` (`setupHttpServer`)
  - `tests/e2e/credit_tracker_test.go:33` (`setupTestServer`), `tests/e2e/auth_server_test.go` (a token helper)
  - `charts/credit-tracker/values.yaml`, `values-prod.yaml` (`env`)
- Create: `internal/auth/auth_test.go`, `tests/e2e/signer_check_test.go`
- Test: `internal/auth/auth_test.go`, `tests/e2e/signer_check_test.go`

**Interfaces:**

- Consumes: `signercheck.*` (Task 5); `txgrpc.NewTokenExchangeServiceClient`, `RegisterTokenExchangeServiceServer` and `UnimplementedTokenExchangeServiceServer` (Task 8).
- Produces:
  - `config.Settings.TokenExchangeGRPCAddr` (`env:"TOKEN_EXCHANGE_GRPC_ADDR"`) and `config.Settings.SignerCheckMode` (`env:"SIGNER_CHECK_MODE" envDefault:"enforce"`);
  - `auth.CustomDexClaims.SignerAddress string` (`json:"signer_address,omitempty"`);
  - `auth.SignerTokenInfo(c *fiber.Ctx) (signercheck.TokenInfo, error)`.

- [ ] **Step 1: Create the worktree and take the merged token-exchange-api**

```bash
git -C ~/workspace/credit-tracker fetch origin
git -C ~/workspace/credit-tracker worktree add ~/workspace/credit-tracker-signer-check -b feat/signer-check origin/main
cd ~/workspace/credit-tracker-signer-check
go get github.com/DIMO-Network/token-exchange-api@main
go mod tidy
git diff go.mod | grep -E "^\+|^-" | grep -v "^+++\|^---"
```

Expected: `token-exchange-api` added. `go-ethereum` moves from v1.16.0 to token-exchange-api's version; the full test run in Step 5 confirms nothing depended on the old one.

- [ ] **Step 2: Write the failing tests**

Create `internal/auth/auth_test.go`:

```go
package auth

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
)

func TestSignerTokenInfo(t *testing.T) {
	license := common.HexToAddress("0x1234567890123456789012345678901234567890")
	issued := time.Unix(1_800_000_000, 0)

	read := func(claims CustomDexClaims) signercheck.TokenInfo {
		app := fiber.New()
		var got signercheck.TokenInfo
		app.Get("/", func(c *fiber.Ctx) error {
			tok := &Token{CustomDexClaims: claims}
			tok.IssuedAt = jwt.NewNumericDate(issued)
			c.Locals(ContextKey, &jwt.Token{Claims: tok})
			var err error
			got, err = SignerTokenInfo(c)
			require.NoError(t, err)
			return c.SendStatus(fiber.StatusOK)
		})
		_, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
		require.NoError(t, err)
		return got
	}

	require.Equal(t,
		signercheck.TokenInfo{License: license, Signer: "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5", IssuedAt: issued},
		read(CustomDexClaims{EthereumAddress: "0x1234567890123456789012345678901234567890", SignerAddress: "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"}))
	require.Equal(t, signercheck.TokenInfo{License: license, IssuedAt: issued}, read(CustomDexClaims{EthereumAddress: license.Hex()}))
	require.Equal(t, common.Address{}, read(CustomDexClaims{EthereumAddress: "not-an-address"}).License)
}
```

Append to `tests/e2e/auth_server_test.go`:

```go
// CreateTokenWithSigner signs a developer-license token that carries signer_address.
func (m *mockAuthServer) CreateTokenWithSigner(t *testing.T, devAddress, signer common.Address) (string, error) {
	token := m.defaultClaims
	token.EthereumAddress = devAddress.String()
	token.Audience = []string{devAddress.String()}
	token.SignerAddress = signer.Hex()
	return m.Sign(token)
}
```

In `tests/e2e/credit_tracker_test.go`, make `setupTestServer` delegate to a variant that accepts settings overrides:

```go
func setupTestServer(t *testing.T) *TestServer {
	return setupTestServerWithSettings(t, nil)
}

func setupTestServerWithSettings(t *testing.T, override func(*config.Settings)) *TestServer {
	// Create test settings
	settings := &config.Settings{
		GRPCPort:              0, // Let the OS choose an available port
		TokenExchangeGRPCAddr: "localhost:1", // never dialed: these tokens carry no signer_address
	}
	if override != nil {
		override(settings)
	}
```

Keep the rest of the old `setupTestServer` body unchanged below that. Then create `tests/e2e/signer_check_test.go`:

```go
package e2e_test

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http/httptest"
	"testing"

	"github.com/DIMO-Network/credit-tracker/internal/config"
	txgrpc "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
)

type fakeTokenExchange struct {
	txgrpc.UnimplementedTokenExchangeServiceServer
	isSigner bool
}

func (f *fakeTokenExchange) SignerCheck(context.Context, *txgrpc.SignerCheckRequest) (*txgrpc.SignerCheckResponse, error) {
	return &txgrpc.SignerCheckResponse{IsSigner: f.isSigner}, nil
}

func startFakeTokenExchange(t *testing.T, isSigner bool) string {
	t.Helper()
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	server := grpc.NewServer()
	txgrpc.RegisterTokenExchangeServiceServer(server, &fakeTokenExchange{isSigner: isSigner})
	go func() { _ = server.Serve(lis) }()
	t.Cleanup(server.Stop)
	return lis.Addr().String()
}

func TestCreditTrackerSignerCheck(t *testing.T) {
	t.Parallel()
	license := common.HexToAddress("0x1234567890123456789012345678901234567890")
	signer := common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
	usagePath := "/v1/credits/" + license.String() + "/usage?fromDate=2025-01-01T00:00:00Z"
	assetPath := "/v1/credits/" + license.String() + "/assets/did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:1/usage?fromDate=2025-01-01T00:00:00Z"

	get := func(server *TestServer, path, token string) (int, string) {
		req := httptest.NewRequest("GET", path, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := server.app.Test(req, -1)
		require.NoError(t, err)
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		return resp.StatusCode, string(body)
	}

	t.Run("enforce refuses a disabled signer on both license routes", func(t *testing.T) {
		addr := startFakeTokenExchange(t, false)
		server := setupTestServerWithSettings(t, func(s *config.Settings) {
			s.TokenExchangeGRPCAddr = addr
			s.SignerCheckMode = "enforce"
		})
		token, err := server.authServer.CreateTokenWithSigner(t, license, signer)
		require.NoError(t, err)

		for _, path := range []string{usagePath, assetPath} {
			status, body := get(server, path, token)
			require.Equal(t, fiber.StatusForbidden, status, body)
			var resp struct{ Message string }
			require.NoError(t, json.Unmarshal([]byte(body), &resp))
			require.Equal(t, signercheck.MessageDenied, resp.Message)
		}
	})

	t.Run("enforce allows an enabled signer", func(t *testing.T) {
		addr := startFakeTokenExchange(t, true)
		server := setupTestServerWithSettings(t, func(s *config.Settings) { s.TokenExchangeGRPCAddr = addr })
		token, err := server.authServer.CreateTokenWithSigner(t, license, signer)
		require.NoError(t, err)

		status, body := get(server, usagePath, token)
		require.Equal(t, fiber.StatusOK, status, body)
	})

	t.Run("log mode never refuses", func(t *testing.T) {
		addr := startFakeTokenExchange(t, false)
		server := setupTestServerWithSettings(t, func(s *config.Settings) {
			s.TokenExchangeGRPCAddr = addr
			s.SignerCheckMode = "log"
		})
		token, err := server.authServer.CreateTokenWithSigner(t, license, signer)
		require.NoError(t, err)

		status, body := get(server, usagePath, token)
		require.Equal(t, fiber.StatusOK, status, body)
	})

	t.Run("token-exchange unreachable answers 503 in enforce mode", func(t *testing.T) {
		server := setupTestServerWithSettings(t, func(s *config.Settings) { s.TokenExchangeGRPCAddr = "127.0.0.1:1" })
		token, err := server.authServer.CreateTokenWithSigner(t, license, signer)
		require.NoError(t, err)

		status, body := get(server, usagePath, token)
		require.Equal(t, fiber.StatusServiceUnavailable, status, body)
	})
}
```

Run: `go test ./internal/auth/ ./tests/e2e/ -run 'TestSignerTokenInfo|TestCreditTrackerSignerCheck' -v`
Expected: build failures: `unknown field SignerAddress in struct literal of type CustomDexClaims`, `undefined: SignerTokenInfo`, and `unknown field TokenExchangeGRPCAddr in struct literal of type config.Settings`.

- [ ] **Step 3: Implement the settings, claim and token reader**

In `internal/config/settings.go`, add to `Settings`:

```go
	// TokenExchangeGRPCAddr is token-exchange-api's gRPC address, for SignerCheck.
	TokenExchangeGRPCAddr string `env:"TOKEN_EXCHANGE_GRPC_ADDR"`
	// SignerCheckMode is enforce (default), log or off.
	SignerCheckMode string `env:"SIGNER_CHECK_MODE" envDefault:"enforce"`
```

In `internal/auth/auth.go`, extend `CustomDexClaims`:

```go
	EthereumAddress string `json:"ethereum_address"`
	// SignerAddress is the license signer (API key) that minted the token; empty for tokens
	// minted before dex set signer_address.
	SignerAddress string `json:"signer_address,omitempty"`
}
```

Add the `common` and `signercheck` imports and append:

```go
// SignerTokenInfo reads what signercheck.Middleware needs from the verified developer JWT.
func SignerTokenInfo(c *fiber.Ctx) (signercheck.TokenInfo, error) {
	token, ok := GetDexJWT(c)
	if !ok {
		return signercheck.TokenInfo{}, fiber.NewError(fiber.StatusUnauthorized, "missing developer JWT")
	}
	info := signercheck.TokenInfo{Signer: token.SignerAddress}
	if common.IsHexAddress(token.EthereumAddress) {
		info.License = common.HexToAddress(token.EthereumAddress)
	}
	if token.IssuedAt != nil {
		info.IssuedAt = token.IssuedAt.Time
	}
	return info, nil
}
```

- [ ] **Step 4: Mount the check on both license routes**

In `internal/app/app.go`, add these imports:

```go
	"fmt"

	txgrpc "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/signercheck"
	"google.golang.org/grpc/credentials/insecure"
```

Replace `CreateServers` and the start of `setupHttpServer`:

```go
// CreateServers creates a new fiber app and grpc server with the given settings.
func CreateServers(ctx context.Context, settings *config.Settings) (*fiber.App, *grpc.Server, error) {
	ctrl, rpcCtrl, err := createControllers(ctx, settings)
	if err != nil {
		return nil, nil, err
	}
	signerCheck, err := newSignerCheck(ctx, settings)
	if err != nil {
		return nil, nil, err
	}
	app := setupHttpServer(ctx, settings, ctrl, signerCheck)
	rpc := setupRPCServer(settings, rpcCtrl)
	return app, rpc, nil
}

// newSignerCheck refuses developer JWTs whose license signer has been disabled since they
// were minted, through token-exchange-api's SignerCheck gRPC.
func newSignerCheck(ctx context.Context, settings *config.Settings) (fiber.Handler, error) {
	mode, err := signercheck.ParseMode(settings.SignerCheckMode)
	if err != nil {
		return nil, err
	}
	conn, err := grpc.NewClient(settings.TokenExchangeGRPCAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("failed to create token-exchange gRPC client: %w", err)
	}
	return signercheck.Middleware(signercheck.Config{
		Service: "credit-tracker",
		Mode:    mode,
		Checker: signercheck.NewGRPCChecker(txgrpc.NewTokenExchangeServiceClient(conn)),
		Token:   auth.SignerTokenInfo,
		Logger:  *zerolog.Ctx(ctx),
	}), nil
}

func setupHttpServer(ctx context.Context, settings *config.Settings, ctrl *httphandlers.HTTPController, signerCheck fiber.Handler) *fiber.App {
```

and change the two routes (lines 62-63):

```go
	app.Get("/v1/credits/:licenseId/usage", jwtAuth, signerCheck, ctrl.GetLicenseUsageReport)
	app.Get("/v1/credits/:licenseId/assets/:assetId/usage", jwtAuth, signerCheck, ctrl.GetLicenseAssetUsageReport)
```

Add these keys to the existing `env:` maps (shown with their parent). Neither file sets them today; the running `credit-tracker-dev-config` has no `TOKEN_EXCHANGE_*` keys. credit-tracker runs in the `dev` and `prod` namespaces next to `token-exchange-api-dev` and `token-exchange-api-prod` (gRPC `8086`).

In `charts/credit-tracker/values.yaml` (dev):

```yaml
env:
  TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-dev:8086
  SIGNER_CHECK_MODE: log
```

In `charts/credit-tracker/values-prod.yaml`:

```yaml
env:
  TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-prod:8086
  SIGNER_CHECK_MODE: log
```

- [ ] **Step 5: Run the tests, the suite and lint**

```bash
go test ./internal/auth/ ./tests/e2e/ -run 'TestSignerTokenInfo|TestCreditTrackerSignerCheck|TestCreditTrackerBasicAuth' -v
make test
make tools-golangci-lint && make lint
```

Expected:

- `PASS` for every subtest; the e2e tests need Docker;
- `TestCreditTrackerBasicAuth` still passes, because its claimless token is never checked;
- `make test` is all `ok`;
- no lint findings.

- [ ] **Step 6: Commit, push and open the PR**

```bash
git add go.mod go.sum internal/config/settings.go internal/auth internal/app/app.go tests/e2e charts/credit-tracker/values.yaml charts/credit-tracker/values-prod.yaml
git commit -m "feat: refuse disabled license signers on the usage routes"
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/credit-tracker --base main --head feat/signer-check \
  --title "feat: refuse disabled license signers on the usage routes" --body-file - <<'EOF'
## Why

`GET /v1/credits/:licenseId/usage` and `GET /v1/credits/:licenseId/assets/:assetId/usage` only check that the token's `ethereum_address` equals `:licenseId`. The DIMO console now gives team members their own signer on a license and disables it when they're removed. dex stamps that signer on developer JWTs as `signer_address`, and this PR makes credit-tracker refuse a removed member's still-valid token.

## What

- **Both license routes** check tokens carrying `signer_address` through token-exchange-api's `SignerCheck` gRPC (5 s deadline; token-exchange caches for 60 s).
  - Disabled signer: `403 signer no longer authorized for this license`.
  - gRPC failure: `503 could not verify signer`.
  - Tokens without the claim pass.
- **New settings:** `TOKEN_EXCHANGE_GRPC_ADDR` and `SIGNER_CHECK_MODE` (`enforce` default, `log`, `off`). The chart sets `log` in dev and prod for the rollout.
- **Metric** `signer_check_total{service="credit-tracker",result}`.
- **Dependencies:** adds the `token-exchange-api` module, which raises `go-ethereum` to its version.

## Release order

token-exchange-api with `SignerCheck` must be live in an environment before this.

## Successor services

`dauth` and `vt` aren't live. If either takes over these routes, it needs the same check.

## Tests

- `TestSignerTokenInfo`.
- e2e `TestCreditTrackerSignerCheck`: enforce refuses on both routes, enforce allows an enabled signer, log never refuses, unreachable token-exchange answers 503.
- `TestCreditTrackerBasicAuth` is unchanged.
EOF
```

Expected: a PR URL. Merge after review and green CI, once token-exchange-api's dev deploy has landed.

---

## Live pass and release

### Task 15: dev live pass — log mode, then enforce

**Files:** in each of `token-exchange-api`, `vehicle-triggers-api`, `tesla-oracle` and `credit-tracker`, `charts/<service>/values.yaml` (`SIGNER_CHECK_MODE: enforce`) after the log pass. Record the results as a comment on the token-exchange-api PR.

**Interfaces:**

- Consumes: Tasks 4, 9, 12, 13 and 14 merged and deployed to dev.
- Produces: evidence that the revocation requirement holds in dev, with dev in `enforce`. Part 3's flag may turn on in staging only after this passes.

**Dev endpoints:**

- `https://auth.dev.dimo.zone`
- `https://token-exchange-api.dev.dimo.zone`
- `https://vehicle-triggers-api.dev.dimo.zone`
- `https://tesla-oracle.dev.dimo.zone`
- `https://credit-tracker.dev.dimo.zone`
- `https://telemetry-api.dev.dimo.zone/query`
- `https://identity-api.dev.dimo.zone/query`
- Vehicle NFT (Amoy) `0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8`
- Console `https://console-staging.dimo.org`
- The mobile client `dimo-driver` is public and accepts redirect `https://auth.dev.dimo.zone/void/callback`.

- [ ] **Step 1: Confirm what dev runs**

- **dex:** ArgoCD shows `dimozone/dex:v2.30.101` on the dev deployment (Task 4), with roles-rights dev still on `v2.30.100`.
- **The four services:** each repo's `main` has a bot commit `Update Image Version to <sha of the feature merge>`. Each dev chart, and the configmap ArgoCD rendered from it, has `SIGNER_CHECK_MODE: log`. Every caller also has `TOKEN_EXCHANGE_GRPC_ADDR`; without it a caller's checks all fail.

```bash
for r in token-exchange-api vehicle-triggers-api tesla-oracle credit-tracker; do
  git -C ~/workspace/$r fetch -q origin
  echo "== $r"; git -C ~/workspace/$r log --oneline -2 origin/main
  git -C ~/workspace/$r show origin/main:charts/$r/values.yaml | grep -nE "SIGNER_CHECK_MODE|TOKEN_EXCHANGE_GRPC_ADDR"
  echo "running: $(kubectl -n dev get configmap $r-dev-config -o jsonpath='{.data.SIGNER_CHECK_MODE} {.data.TOKEN_EXCHANGE_GRPC_ADDR}')"
done
```

Expected:
- each block shows the image-bump commit on top and `SIGNER_CHECK_MODE: log`;
- for vehicle-triggers-api, tesla-oracle and credit-tracker, `TOKEN_EXCHANGE_GRPC_ADDR: token-exchange-api-dev:8086` in the chart and `running: log token-exchange-api-dev:8086`;
- token-exchange-api shows `running: log ` (it doesn't call itself).

If a caller lacks the address, fix its chart before continuing; Steps 5 and 7 would otherwise show `error` instead of `denied`.

- [ ] **Step 2: Prepare a test license, three keys and a vehicle**

In `https://console-staging.dimo.org`, open (or create) a test license you own. Note its client ID and one redirect URI. Under API keys, generate three keys and copy each private key when shown: member A (log pass), member B (enforce pass) and owner. Pick a vehicle shared with the license; the staging console's Vehicle Simulator mints and shares one.

```bash
export CLIENT_ID=0x...        # license client ID (checksummed, as the console shows it)
export DOMAIN=https://...     # one of the license's redirect URIs
export MEMBER_A_PK=0x... MEMBER_B_PK=0x... OWNER_PK=0x...
export VEHICLE_TOKEN_ID=...
export AUTH=https://auth.dev.dimo.zone TX=https://token-exchange-api.dev.dimo.zone VT=https://vehicle-triggers-api.dev.dimo.zone
export TESLA=https://tesla-oracle.dev.dimo.zone CREDITS=https://credit-tracker.dev.dimo.zone
export TELEMETRY=https://telemetry-api.dev.dimo.zone/query VEHICLE_NFT=0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8
export MOBILE_DOMAIN=https://auth.dev.dimo.zone/void/callback
curl -s https://identity-api.dev.dimo.zone/query -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ vehicles(first: 100, filterBy: {privileged: \\\"$CLIENT_ID\\\"}) { nodes { tokenId } } }\"}"
```

Expected: the Identity response lists `VEHICLE_TOKEN_ID`.

- [ ] **Step 3: Define the helpers (zsh or bash)**

```bash
mint() { # $1 = signer private key, $2 = client_id, $3 = domain; prints the access token
  (cd ~/workspace/dimo-developer-console && PK="$1" CID="$2" DOM="$3" node --input-type=module -e '
import { privateKeyToAccount } from "viem/accounts";
const { AUTH, PK, CID, DOM, CLIENT_ID } = process.env;
const post = async (path, body) => {
  const res = await fetch(`${AUTH}${path}`, { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
};
const { state, challenge } = await post("/auth/web3/generate_challenge", {
  client_id: CID, domain: DOM, scope: "openid email", response_type: "code", address: CLIENT_ID });
const signature = await privateKeyToAccount(PK).signMessage({ message: challenge });
const { access_token } = await post("/auth/web3/submit_challenge", {
  client_id: CID, state, grant_type: "authorization_code", domain: DOM, signature });
process.stdout.write(access_token);
')
}
dev_jwt() { mint "$1" "$CLIENT_ID" "$DOMAIN"; }               # developer JWT (aud = license)
mobile_jwt() { mint "$1" dimo-driver "$MOBILE_DOMAIN"; }       # mobile-audience token for the license
claims() { node -e 'console.log(JSON.stringify(JSON.parse(Buffer.from(process.argv[1].split(".")[1], "base64url")), null, 2))' "$1"; }
claim() { node -e 'process.stdout.write(String(JSON.parse(Buffer.from(process.argv[1].split(".")[1], "base64url"))[process.argv[2]]))' "$1" "$2"; }
address_of() { (cd ~/workspace/dimo-developer-console && node --input-type=module -e 'import { privateKeyToAccount } from "viem/accounts"; process.stdout.write(privateKeyToAccount(process.argv[1]).address)' "$1"); }
status_of() { tail -1 <<<"$1"; }
exchange() { curl -s -w '\n%{http_code}' -X POST "$TX/v1/tokens/exchange" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
  -d "{\"nftContractAddress\":\"$VEHICLE_NFT\",\"tokenId\":$VEHICLE_TOKEN_ID,\"privileges\":[1]}"; }
webhooks() { curl -s -w '\n%{http_code}' "$VT/v1/webhooks" -H "Authorization: Bearer $1"; }
credits() { curl -s -w '\n%{http_code}' "$CREDITS/v1/credits/$CLIENT_ID/usage?fromDate=2025-01-01T00:00:00Z" -H "Authorization: Bearer $1"; }
tesla() { curl -s -w '\n%{http_code}' -X POST "$TESLA/v1/telemetry/subscribe/999999999" -H "Authorization: Bearer $1"; }
telemetry() { curl -s -w '\n%{http_code}' "$TELEMETRY" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ signalsLatest(tokenId: $VEHICLE_TOKEN_ID) { lastSeen } }\"}"; }
# Polls $1 (a command) every 5 s until it answers 403; fails after 90 s, and checks the 60 s bound.
until_refused() {
  local t0=$(date +%s) out=""
  for _ in $(seq 1 18); do
    out=$(eval "$1"); [ "$(status_of "$out")" = 403 ] && break; sleep 5
  done
  local elapsed=$(( $(date +%s) - t0 ))
  echo "$out"; echo "refused after ${elapsed}s"
  [ "$(status_of "$out")" = 403 ] && [ "$elapsed" -le 60 ] && echo "PASS: within 60 s" || echo "FAIL: not refused within 60 s"
}
```

The tesla-oracle call uses a token ID that doesn't exist. Before the signer check is in the way, it answers with tesla-oracle's own refusal (the test license isn't `MOBILE_APP_DEV_LICENSE`), so it changes no data.

- [ ] **Step 4: Log mode — baseline with member A**

```bash
export MEMBER_A=$(address_of "$MEMBER_A_PK") OWNER_JWT=$(dev_jwt "$OWNER_PK")
export A_JWT=$(dev_jwt "$MEMBER_A_PK") A_MOBILE=$(mobile_jwt "$MEMBER_A_PK")
claims "$A_JWT" | grep -E '"(aud|ethereum_address|signer_address)"'
claims "$A_MOBILE" | grep -E '"(aud|ethereum_address|signer_address)"'
echo "expected signer_address: $MEMBER_A"
status_of "$(exchange "$A_JWT")"; status_of "$(exchange "$A_MOBILE")"
status_of "$(webhooks "$A_JWT")"; status_of "$(credits "$A_JWT")"
export TESLA_BEFORE=$(tesla "$A_JWT"); echo "$TESLA_BEFORE"
```

Expected:

- **Developer JWT:** `aud` is `CLIENT_ID`.
- **Mobile token:** `aud` is `dimo-driver`.
- **Both tokens:** `ethereum_address` is `CLIENT_ID` and `signer_address` is exactly `MEMBER_A`.
- **Calls:** exchange `200` for both tokens, webhooks `200`, credits `200`. tesla-oracle answers its own non-signer refusal; note the status and message.

If `signer_address` is missing, dev dex isn't on `v2.30.101`; go back to Step 1.

- [ ] **Step 5: Log mode — disable member A and confirm nothing is refused but everything is counted**

In the staging console, delete member A's API key (this calls `disableSigner`). Wait for the success toast, then wait 70 seconds so the 60 s caches expire.

```bash
sleep 70
status_of "$(exchange "$A_JWT")"; status_of "$(exchange "$A_MOBILE")"
status_of "$(webhooks "$A_JWT")"; status_of "$(credits "$A_JWT")"
tesla "$A_JWT"
```

Expected:

- every status is unchanged from Step 4 (`200`);
- tesla-oracle answers exactly `$TESLA_BEFORE`.

Log mode never refuses. In Grafana (Explore, the dev Prometheus), run:

```promql
sum by (service, result) (increase(signer_check_total{namespace="dev"}[15m]))
```

Expected: `result="denied"` above zero for all four services: `token-exchange-api`, `vehicle-triggers-api`, `credit-tracker` and `tesla-oracle`. Each service's logs show `Signer check refused a developer JWT.` with `"mode":"log"`, `"result":"denied"` and `"signer":"<MEMBER_A>"`. If a service shows only `skipped`, its `SIGNER_CHECK_MODE` is `off` or the deploy didn't land; fix before continuing.

- [ ] **Step 6: Switch dev to enforce**

In each of the four repos, open a PR that changes only `charts/<service>/values.yaml` to `SIGNER_CHECK_MODE: enforce`:

```bash
for r in token-exchange-api vehicle-triggers-api tesla-oracle credit-tracker; do
  git -C ~/workspace/$r worktree add ~/workspace/$r-enforce-dev -b chore/signer-check-enforce-dev origin/main
  (cd ~/workspace/$r-enforce-dev &&
    sed -E -i '' 's/^( +SIGNER_CHECK_MODE:).*/\1 enforce/' charts/$r/values.yaml &&
    git diff --stat && git add charts/$r/values.yaml &&
    git commit -m "chore(chart): enforce the signer check in dev" &&
    git push -u origin chore/signer-check-enforce-dev &&
    gh pr create --repo DIMO-Network/$r --base main --head chore/signer-check-enforce-dev \
      --title "chore(chart): enforce the signer check in dev" \
      --body "Dev only. The console-teams platform live pass in log mode counted denials in every service and refused nothing; dev now enforces. Production stays in log mode.")
done
```

Expected: each `git diff --stat` shows `charts/<service>/values.yaml | 2 +-`. Merge all four, and confirm in ArgoCD that the dev pods restarted with `SIGNER_CHECK_MODE=enforce`.

- [ ] **Step 7: Enforce — member B is cut off within 60 seconds everywhere**

```bash
export MEMBER_B=$(address_of "$MEMBER_B_PK")
export B_JWT=$(dev_jwt "$MEMBER_B_PK") B_MOBILE=$(mobile_jwt "$MEMBER_B_PK")
status_of "$(exchange "$B_JWT")"; status_of "$(exchange "$B_MOBILE")"
export B_VEHICLE_JWT=$(exchange "$B_JWT" | head -1 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).token))')
echo "vehicle JWT lifetime: $(( $(claim "$B_VEHICLE_JWT" exp) - $(claim "$B_VEHICLE_JWT" iat) ))s"

node -e 'require("http").createServer((q,s)=>{q.resume();s.end("live-pass-token")}).listen(8787)' &
WEBHOOK_SERVER_PID=$!
# In a second terminal: cloudflared tunnel --url http://localhost:8787   (brew install cloudflared if missing)
export TUNNEL_URL=https://<printed>.trycloudflare.com
curl -s -w '\n%{http_code}\n' -X POST "$VT/v1/webhooks" -H "Authorization: Bearer $B_JWT" -H 'Content-Type: application/json' \
  -d "{\"service\":\"signals\",\"metricName\":\"vss.speed\",\"condition\":\"valueNumber > 500\",\"coolDownPeriod\":30,\"targetURL\":\"$TUNNEL_URL\",\"status\":\"enabled\",\"verificationToken\":\"live-pass-token\",\"displayName\":\"signer-live-pass\"}"
export WEBHOOK_ID=<id from the response>
curl -s -w '\n%{http_code}\n' -X PUT "$VT/v1/webhooks/$WEBHOOK_ID" -H "Authorization: Bearer $B_JWT" -H 'Content-Type: application/json' \
  -d '{"condition":"valueNumber > 600"}'
webhooks "$OWNER_JWT" | head -1 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).filter(w=>w.displayName==="signer-live-pass")))'
```

Expected:

- both exchanges answer `200`;
- `vehicle JWT lifetime: 600s`;
- the webhook POST answers `201` and the PUT `200`;
- the owner's list shows `signer-live-pass` with `createdBySigner` and `updatedBySigner` both equal to `MEMBER_B`.

In the staging console, delete member B's API key. When the success toast appears, immediately run:

```bash
until_refused 'exchange "$B_JWT"'
until_refused 'exchange "$B_MOBILE"'
webhooks "$B_JWT"; credits "$B_JWT"; tesla "$B_JWT"
```

Expected:

- **Developer JWT and mobile-audience token:** each `until_refused` prints a body containing `signer no longer authorized for this license`, `refused after Ns` with N ≤ 60, and `PASS: within 60 s`.
- **vehicle-triggers-api, credit-tracker and tesla-oracle:** each answers `403` with `"message":"signer no longer authorized for this license"`. Their caches started together with token-exchange's, so they're already past the 60 s.

- [ ] **Step 8: The vehicle JWT minted before the cutoff expires on schedule; the owner is unaffected**

```bash
status_of "$(telemetry "$B_VEHICLE_JWT")"
status_of "$(exchange "$OWNER_JWT")"
WAIT=$(( $(claim "$B_VEHICLE_JWT" exp) - $(date +%s) + 5 )); echo "waiting ${WAIT}s for the vehicle JWT to expire"; sleep "$WAIT"
status_of "$(telemetry "$B_VEHICLE_JWT")"
```

Expected:

- the first telemetry call answers `200`, because the vehicle JWT is still within its 10 minutes;
- the owner exchange answers `200`;
- after the wait, telemetry answers `401`.

That bounds a removed member's total remaining access to the 10-minute vehicle JWT.

- [ ] **Step 9: Clean up and record**

```bash
curl -s -X DELETE "$VT/v1/webhooks/$WEBHOOK_ID" -H "Authorization: Bearer $OWNER_JWT"
kill $WEBHOOK_SERVER_PID
```

Stop `cloudflared`, and optionally delete the owner key in the console.

Post these on the token-exchange-api PR:

- the Step 5 metric screenshot and one log line per service;
- the Step 7 `until_refused` outputs (bodies and seconds);
- the three 403 bodies;
- the Step 8 telemetry statuses before and after `exp`.

### Task 16: production release in log mode, then production dex

**Files:** `cluster-helm-charts` `charts/dimo-dex/values-prod.yaml:13`.

**Interfaces:**

- Consumes: Task 15 passed.
- Produces:
  - production runs all five changes in `log` mode, with `dimozone/dex:v2.30.101`;
  - `~/workspace/signer-check-prod-baseline.txt`, the rollback targets.

Order matters. token-exchange-api with `SignerCheck` must be in production before any caller. Each release must be live before the next tag.

- [ ] **Step 1: Record what production runs (the rollback targets)**

Before tagging anything, read each service's production tag from its chart, and the image its production pods actually run:

```bash
for r in token-exchange-api vehicle-triggers-api tesla-oracle credit-tracker; do
  git -C ~/workspace/$r fetch -q origin
  tag=$(git -C ~/workspace/$r show origin/main:charts/$r/values-prod.yaml | awk '/^image:/{f=1;next} f&&/^  tag:/{print $2; exit} /^[^ ]/{f=0}')
  image=$(kubectl -n prod get deploy $r-prod -o jsonpath='{.spec.template.spec.containers[0].image}')
  echo "$r values-prod.yaml image.tag=$tag running=$image"
done | tee ~/workspace/signer-check-prod-baseline.txt
git -C ~/workspace/cluster-helm-charts fetch -q origin
echo "dimo-dex values-prod.yaml $(git -C ~/workspace/cluster-helm-charts show origin/main:charts/dimo-dex/values-prod.yaml | grep -E '^ +tag:' | tr -s ' ')" | tee -a ~/workspace/signer-check-prod-baseline.txt
```

Expected: one line per service where the chart tag and the running image's tag agree, plus dex at `tag: v2.30.100`.
- **At the last check** (2026-10-02): token-exchange-api `0.4.0`, vehicle-triggers-api `1.4.11`, tesla-oracle `0.6.10`, credit-tracker `0.0.6`.
- **If a chart tag and a running image differ,** ArgoCD is out of sync; stop and resolve that first.

These are the rollback targets. Paste the file into a comment on the token-exchange-api PR.

- [ ] **Step 2: Release token-exchange-api**

```bash
cd ~/workspace/token-exchange-api && git fetch --tags origin
git tag --sort=-v:refname | head -3
git log --oneline v0.4.0..origin/main | grep -v "Update Image Version"
```

Expected:

- the latest tag is `v0.4.0`;
- the log lists the signer-check merge, the dev enforce chart change, and three earlier unreleased commits: `988eb3f Upgrade gRPC`, `8708f39 Update packages`, `f0eacbf Remove outdated Users setting`;
- CI and chart-only commits (`2920a1d`, `ec1276d`, `b51c905`, `38ed942`) may also appear.

Tag and publish release notes that call those three out:

```bash
git tag -a v0.5.0 origin/main -m "Signer check (SignerCheck gRPC, pkg/signercheck)"
git push origin v0.5.0
gh release create v0.5.0 --repo DIMO-Network/token-exchange-api --title v0.5.0 --notes-file - <<'EOF'
## Signer check

- `/v1/tokens/exchange` checks the `signer_address` of every token whose `ethereum_address` is a developer license, whatever its audience.
  - Disabled signer: 403 `signer no longer authorized for this license`.
  - Identity or chain failure: 503 `could not verify signer`.
  - Ships with `SIGNER_CHECK_MODE=log` in production: denials are logged and counted (`signer_check_total`), and nothing is refused until the switch to `enforce`.
- New gRPC `SignerCheck` and package `pkg/signercheck` for vehicle-triggers-api, tesla-oracle and credit-tracker.
- New PrometheusRule `SignerCheckErrors`.

## Also first released here (merged after v0.4.0)

- `988eb3f` Upgrade gRPC
- `8708f39` Update packages
- `f0eacbf` Remove outdated Users setting (the `USERS_API_GRPC_ADDRESS` env in the chart is now unused)

Watch error rates after the rollout for regressions from the dependency upgrades, separately from the signer check.
EOF
```

Wait for `buildpushtagged.yml` to commit `image.tag: 0.5.0` to `charts/token-exchange-api/values-prod.yaml` and for ArgoCD to sync production. Then confirm the production pods run `dimozone/token-exchange-api:0.5.0` with `SIGNER_CHECK_MODE=log`.

- [ ] **Step 3: Release the three callers, after Step 2 is live**

For each of `vehicle-triggers-api`, `tesla-oracle` and `credit-tracker`:

```bash
cd ~/workspace/<repo> && git fetch --tags origin && git tag --sort=-v:refname | head -1
```

Tag the next minor version above that output (for example `v1.4.11` → `v1.5.0`):

```bash
git tag -a <version> origin/main -m "Signer check (log mode first)" && git push origin <version>
```

Expected: each repo's `buildpushtagged.yml` commits the new `image.tag` to `values-prod.yaml`, and ArgoCD syncs. Then confirm every production service runs the check in log mode and can reach token-exchange-api:

```bash
kubectl -n prod get configmap token-exchange-api-prod-config -o jsonpath='{.data.SIGNER_CHECK_MODE}{"\n"}'
for r in vehicle-triggers-api tesla-oracle credit-tracker; do
  echo "$r: $(kubectl -n prod get configmap $r-prod-config -o jsonpath='{.data.SIGNER_CHECK_MODE} {.data.TOKEN_EXCHANGE_GRPC_ADDR}')"
done
```

Expected: `log`, then `log token-exchange-api-prod:8086` for each caller.

- [ ] **Step 4: Bump production dex**

```bash
git -C ~/workspace/cluster-helm-charts fetch origin
git -C ~/workspace/cluster-helm-charts worktree add ~/workspace/cluster-helm-charts-dex-prod -b chore/dex-prod-v2.30.101 origin/main
cd ~/workspace/cluster-helm-charts-dex-prod
sed -E -i '' 's/^( +tag:).*/\1 v2.30.101/' charts/dimo-dex/values-prod.yaml
grep -nE "^ +(tag|pullPolicy):" charts/dimo-dex/values-prod.yaml
git diff --stat
git add charts/dimo-dex/values-prod.yaml
git commit -m "chore(dimo-dex): production dex to v2.30.101 (signer_address claim)"
git push -u origin chore/dex-prod-v2.30.101
gh pr create --repo DIMO-Network/cluster-helm-charts --base main --head chore/dex-prod-v2.30.101 \
  --title "chore(dimo-dex): production dex to v2.30.101" \
  --body "Production only. v2.30.101 adds the signer_address claim to developer JWTs. The console-teams platform live pass in dev passed (log and enforce), and token-exchange-api, vehicle-triggers-api, tesla-oracle and credit-tracker are in production in log mode. Roles-rights stays on v2.30.100. Rollback: set this back to v2.30.100."
```

Expected:
- the `grep` shows `pullPolicy: IfNotPresent` and `tag: v2.30.101`;
- `git diff --stat` shows only `charts/dimo-dex/values-prod.yaml | 2 +-`.

Merge, confirm ArgoCD shows production dex on `v2.30.101`, and note the date. Task 17's `SIGNER_CLAIM_REQUIRED_AFTER` counts 14 days from it.

- [ ] **Step 5: Smoke-test production**

Repeat Task 15 Steps 2-4 against production with a test license on `https://console.dimo.org`, member key A only. Set:

```bash
export AUTH=https://auth.dimo.zone TX=https://token-exchange-api.dimo.zone VT=https://vehicle-triggers-api.dimo.zone
export TESLA=https://tesla-oracle.dimo.zone CREDITS=https://credit-tracker.dimo.zone
export TELEMETRY=https://telemetry-api.dimo.zone/query VEHICLE_NFT=0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF
export MOBILE_DOMAIN=https://auth.dimo.zone/void/callback
```

Use `https://identity-api.dimo.zone/query` for the Identity check.

Expected:

- the claim is present and checksummed;
- every call returns the Task 15 Step 4 baseline;
- `signer_check_total{namespace="prod",result="allowed"}` grows.

- [ ] **Step 6: Watch production in log mode for a week**

Check daily:

```promql
sum by (service, result) (increase(signer_check_total{namespace="prod"}[24h]))
```

For any `result="denied"`, open the service's logs. Each denial names `license` and `signer`. Confirm the signer was deliberately disabled, which means it's a real revocation the check will soon enforce. Raise anything else, such as a signer still in use by a developer's backend, before Task 17. `SignerCheckErrors` must not have fired.

### Task 17: announce, then enforce in production, then require the claim

**Interfaces:**

- Consumes: a clean week from Task 16 Step 6.
- Produces:
  - developers told about the change before anything is refused;
  - production in `enforce`;
  - `SIGNER_CLAIM_REQUIRED_AFTER` set.

Part 3's flag may turn on in production after this and part 3's team live pass.

- [ ] **Step 1: Announce the behavior change (owns index Rollout step 2.6)**

This step owns the index's Rollout step 2.6. It must happen before Step 2 switches production to `enforce`. Choose the enforce date first, and give developers notice of it.

Send the developer announcement, wherever DIMO publishes platform changes (developer docs changelog and newsletter):

> Starting {enforce date}, disabling an API key on your developer license cuts off the tokens it minted within about a minute, instead of when they expire. Token exchange, the webhooks API, tesla-oracle and credit-tracker will answer `403 signer no longer authorized for this license` for such tokens, or `503 could not verify signer` if the check can't complete. Keys you haven't disabled are unaffected.

Don't start Step 2 before that date.

- [ ] **Step 2: Switch production to enforce**

As in Task 15 Step 6, open one PR per repo changing only `charts/<service>/values-prod.yaml`, in this order: token-exchange-api, then vehicle-triggers-api, tesla-oracle and credit-tracker. Merge each after the previous one has synced.

```bash
r=<repo>
git -C ~/workspace/$r fetch origin
git -C ~/workspace/$r worktree add ~/workspace/$r-enforce-prod -b chore/signer-check-enforce-prod origin/main
cd ~/workspace/$r-enforce-prod
sed -E -i '' 's/^( +SIGNER_CHECK_MODE:).*/\1 enforce/' charts/$r/values-prod.yaml
grep -n "SIGNER_CHECK_MODE" charts/$r/values-prod.yaml && git diff --stat
git add charts/$r/values-prod.yaml
git commit -m "chore(chart): enforce the signer check in production"
git push -u origin chore/signer-check-enforce-prod
gh pr create --repo DIMO-Network/$r --base main --head chore/signer-check-enforce-prod \
  --title "chore(chart): enforce the signer check in production" \
  --body "Production. A week in log mode showed only deliberate revocations, and developers were notified (console-teams part 1, Task 17 Step 1)."
```

Expected: `SIGNER_CHECK_MODE: enforce`, and `git diff --stat` shows `charts/<repo>/values-prod.yaml | 2 +-` only.

- [ ] **Step 3: Repeat the enforce pass in production**

Repeat Task 15 Steps 7-9 against production with member key B on the production test license, using the Task 16 Step 5 variables.

Expected: the same results as in dev, with every `until_refused` showing `PASS: within 60 s`.

- [ ] **Step 4: Require the claim on new license tokens (token-exchange-api only)**

Fourteen days after the production dex release (Task 16 Step 4), every developer JWT minted before it has expired (336 hours). Compute the Unix time of that release date plus 14 days:

```bash
node -e 'console.log(Math.floor(new Date("<YYYY-MM-DD from Task 16 Step 4>T00:00:00Z").getTime()/1000) + 14*86400)'
```

`SIGNER_CLAIM_REQUIRED_AFTER` exists only in token-exchange-api; the other services don't read it. Open a token-exchange-api PR adding it to the `env:` map of `charts/token-exchange-api/values-prod.yaml`, and of `values.yaml` with dev's own date (Task 4). The key goes under the existing `env:` map:

```yaml
env:
  SIGNER_CLAIM_REQUIRED_AFTER: '<that number>'
```

Merge it after that date has passed. From then on, a license token issued after the cutoff without `signer_address` gets the 403. That catches any future dex path that forgets the claim.

## Rollback (C10)

Turn the console's `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` off before any of these. Then go as far down the list as the problem needs.

1. **Stop refusing, no redeploy of code:** set `SIGNER_CHECK_MODE` to `log` or `off` in the affected service's `values-prod.yaml` (PR, merge, ArgoCD sync), using the Task 17 Step 2 `sed -E` with `log` or `off`. Do it in this order:
   - vehicle-triggers-api, tesla-oracle, credit-tracker;
   - then token-exchange-api.
2. **Roll back the callers:** in each caller's `charts/<repo>/values-prod.yaml`, set `image.tag` to its line in `~/workspace/signer-check-prod-baseline.txt` (Task 16 Step 1).
3. **Roll back token-exchange-api:** set its `image.tag` to its baseline line.
4. **Roll back dex:** in `cluster-helm-charts`, run `sed -E -i '' 's/^( +tag:).*/\1 v2.30.100/' charts/dimo-dex/values-prod.yaml` (and `values.yaml` for dev), then open and merge the PR. Tokens minted by `v2.30.101` still carry the claim, and any service still checking honors it; they expire within 336 hours.
5. **Leave migrations in place.** `created_by_signer` and `updated_by_signer` are nullable, and older vehicle-triggers-api builds ignore them.

Never roll back dex while token-exchange-api runs with `SIGNER_CLAIM_REQUIRED_AFTER` set: developer tokens from the old dex lack the claim and would be refused. Unset it first.
