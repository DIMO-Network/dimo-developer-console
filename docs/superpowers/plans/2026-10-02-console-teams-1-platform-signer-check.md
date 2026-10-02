# Console teams, part 1: platform signer check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disabling a developer-license signer cuts off every token that signer minted within 60 seconds, on token exchange and the webhooks API, so a removed console team member loses all access within about 10 minutes (the vehicle JWT lifetime).

**Architecture:**

- **dex** records the EOA that signed the web3 challenge and stamps it on developer JWTs as `signer_address`. The connector stores it in the identity's connector data, which already flows through the existing `connector_data` columns, so no storage migration is needed.
- **token-exchange-api** checks the claim on every exchange with `isSigner(signer)` on the license account. Answers are cached for 60 seconds. The same check is exposed over gRPC.
- **vehicle-triggers-api** calls that gRPC check on every authenticated request. It also records the creating signer on each new webhook and returns it as `createdBySigner`.

**Tech Stack:**

- Go: dex 1.23 toolchain, token-exchange-api 1.24, vehicle-triggers-api 1.25.
- go-ethereum `accounts/abi/bind` (v1 bindings) and abigen.
- gofiber v2, golang-jwt v5, gRPC/protobuf (protoc 31.1), sqlboiler plus goose.
- testify, go.uber.org/mock.

**Spec:** `docs/superpowers/specs/2026-10-01-console-teams-design.md` — sections _Revocation within 10 minutes_, _Testing_ (platform bullets and live pass) and _Rollout_ step 2.

**Contracts:** `docs/superpowers/plans/2026-10-02-console-teams.md` — C1, C2 and C3 are binding on this plan.

## Global Constraints

- **Claim name** `signer_address`. **Value:** the EIP-55 checksummed address (`common.Address.Hex()`) of the EOA that signed the web3 challenge.
- **dex emits the claim** only on tokens issued after a successful ERC-1271 verification in the web3 connector whose signature is a plain 65-byte ECDSA signature. EOA logins never get it, and neither do smart-account (kernel) logins. It goes on both the access token and the ID token, not gated by scope.
- **Consumers:**
  - compare it case-insensitively;
  - treat a missing claim as "minted before the claim existed" and allow it;
  - never trust it without the JWT signature check they already do.
- **Check:** `isSigner(address signer) returns (bool)` on the license account contract at the token's client ID (the `ethereum_address` claim, and the address in the decoded `sub`).
- **Cache:** 60 seconds per `(clientID, signer)`, positive and negative answers alike.
- **On `false`:** HTTP 403 with the exact message `signer no longer authorized for this license`.
- **On RPC error:** HTTP 503 with `could not verify signer`. Never fail open.
- **vehicle-triggers-api column:** `created_by_signer` (nullable text, lowercase hex).
- **vehicle-triggers-api JSON:** field `createdBySigner` (`string`, checksummed, omitted when null).
- **Deploy order:** dex → token-exchange-api → vehicle-triggers-api.
- **Commits:**
  - no `Co-Authored-By` trailer and no tool attribution in commit messages or PR bodies;
  - never commit the local `.gitignore` edits present in the `dex` and `token-exchange-api` checkouts — stage files by path.
- **Isolation:** each repo's work happens in a fresh git worktree off the remote default branch. The main checkouts hold unrelated work:
  - `dex` has a modified `.gitignore`;
  - `token-exchange-api` is behind `origin/main`;
  - `vehicle-triggers-api` is on an unpushed `road-speed-limit-trigger` branch.

## Review Focus

These are the conditions the spec implies but no happy-path test exercises. Each has a test in the task that owns the code.

1. **Smart-account logins also go through ERC-1271.** The console signs users in with ZeroDev kernel accounts, whose signatures aren't plain 65-byte ECDSA. That path must keep working and must not get a bogus `signer_address`. Test: `TestRecoverSigner` rejects non-65-byte signatures and bad recovery ids (Task 1).
2. **A lowercase or otherwise non-checksummed `signer_address`** must be treated as the same signer. Tests:
   - the "lowercase signer claim" case in `TestSignerValidator` (Task 5);
   - `TestTokenReadsSignerAddressClaim` (Task 8).
3. **A chain RPC outage fails closed, and the error isn't cached,** so the first request after recovery succeeds. Tests:
   - `TestCheckerDoesNotCacheErrors` (Task 4);
   - the "chain error fails closed" case (Task 5);
   - `TestSignerCheck` Unavailable (Task 6);
   - the vehicle-triggers 503 case (Task 8).
4. **Existing developers' tokens without the claim, and DIMO mobile app tokens, keep working** with no chain call. Tests:
   - the "token without signer_address" and "mobile app token" cases (Task 5);
   - the "token without signer_address" case (Task 8).
5. **Webhooks created before the column existed, or by tokens without the claim,** show no `createdBySigner` at all — not `0x000…`. Tests:
   - `TestCreateTrigger` "without a signer stores NULL" (Task 9);
   - the "omits createdBySigner" list case (Task 9).

---

## dex

### Task 1: web3 connector records the challenge signer

**Files:**

- Create: none
- Modify:
  - `connector/connector_dimo.go` (append a type)
  - `connector/web3/web3.go:4-17` (imports) and `connector/web3/web3.go:131-134` (the ERC-1271 success return), plus a new `recoverSigner` func after `signHash` (line 137)
- Test: `connector/web3/web3_test.go`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `connector.Web3SignerData struct { SignerAddress string \`json:"signer_address"\` }`— the JSON stored in`connector.Identity.ConnectorData` after an ERC-1271 login with a 65-byte signature. Task 2 reads it.
  - `func recoverSigner(hash []byte, signature []byte) (common.Address, bool)`, internal to `web3`.

- [ ] **Step 1: Create the worktree**

```bash
git -C ~/workspace/dex fetch origin
git -C ~/workspace/dex worktree add ~/workspace/dex-signer-address-claim -b feat/signer-address-claim origin/master
cd ~/workspace/dex-signer-address-claim
go mod download
```

Expected: `Preparing worktree (new branch 'feat/signer-address-claim')`.

- [ ] **Step 2: Write the failing tests**

In `connector/web3/web3_test.go`, add `"encoding/json"` to the import block (stdlib group). Add this helper after `signMessage`:

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

Append this test at the end of the file:

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
		"smart-account signature longer than 65 bytes": {
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

In `connector/web3/web3.go`, add `"encoding/json"` as the first stdlib import:

```go
import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
```

Replace the success return at the end of `VerifyERC1271Signature` (lines 131-134):

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
// signatures (other lengths or recovery ids) report false, so their logins carry no signer.
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
Expected: `PASS` for every subtest, including `TestRecoverSigner/smart-account_signature_longer_than_65_bytes` and `TestEOALogin/erc1271_success_verify_contract_signature`.

- [ ] **Step 7: Commit**

```bash
git add connector/connector_dimo.go connector/web3/web3.go connector/web3/web3_test.go
git commit -m "feat(web3): record the challenge signer on ERC-1271 developer-license logins"
```

### Task 2: dex emits the `signer_address` claim

**Files:**

- Create: `server/signer_claim_dimo.go`, `server/signer_claim_dimo_test.go`
- Modify:
  - `server/oauth2.go:293` (claims struct) and `server/oauth2.go:399-406` (`tok` literal in `newIDToken`)
  - `server/handlers.go:964` (first line of `exchangeAuthCode`)
- Test: `server/signer_claim_dimo_test.go`

**Interfaces:**

- Consumes: `connector.Web3SignerData` (Task 1). `addressRegex` (`server/handlers_dimo.go`).
- Produces:
  - `signer_address` on the access token and ID token returned by the authorization-code grant, including `/auth/web3/submit_challenge`, whose `access_token` is the developer JWT.
  - Internal: `withSignerAddress(ctx, connectorData []byte) context.Context` and `signerAddressFromContext(ctx) string`.

- [ ] **Step 1: Write the failing test**

Create `server/signer_claim_dimo_test.go`:

```go
package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/dexidp/dex/storage"
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

func TestExchangeAuthCodeSignerAddressClaim(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	httpServer, s := newTestServer(ctx, t, nil)
	defer httpServer.Close()

	client := storage.Client{
		ID:           "0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37",
		Secret:       "secret",
		RedirectURIs: []string{"https://example.com/callback"},
	}
	require.NoError(t, s.storage.CreateClient(ctx, client))

	tests := []struct {
		name          string
		connectorData []byte
		want          string
	}{
		{
			name:          "web3 signer data adds the checksummed claim",
			connectorData: []byte(`{"signer_address":"0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5"}`),
			want:          "0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5",
		},
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
				RedirectURI:   "https://example.com/callback",
				ConnectorID:   "mock",
				Scopes:        []string{"openid", "email"},
				Claims:        storage.Claims{UserID: client.ID, Username: client.ID},
				Expiry:        time.Now().Add(time.Minute),
				ConnectorData: tc.connectorData,
			}
			require.NoError(t, s.storage.CreateAuthCode(ctx, authCode))

			resp, err := s.exchangeAuthCode(ctx, httptest.NewRecorder(), authCode, client)
			require.NoError(t, err)

			for name, token := range map[string]string{"access token": resp.AccessToken, "ID token": resp.IDToken} {
				claims := tokenClaims(t, token)
				require.Equal(t, client.ID, claims["ethereum_address"], name)
				if tc.want == "" {
					require.NotContains(t, claims, "signer_address", name)
				} else {
					require.Equal(t, tc.want, claims["signer_address"], name)
				}
			}
		})
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./server/ -run TestExchangeAuthCodeSignerAddressClaim -v`
Expected: `FAIL` in `web3_signer_data_adds_the_checksummed_claim`, because `signer_address` is missing (`Should be equal … expected "0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5" actual <nil>`). The other four subtests pass.

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

In `server/oauth2.go`, below `EthereumAddress` in `idTokenClaims` (line 293), add:

```go
	EthereumAddress string `json:"ethereum_address,omitempty"`
	// SignerAddress is the developer-license signer (API key) that signed the web3
	// challenge. Only ERC-1271 developer-license logins set it. DIMO addition.
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

In `server/handlers.go`, make this the first statement of `exchangeAuthCode` (line 964), before the `newAccessToken` call:

```go
func (s *Server) exchangeAuthCode(ctx context.Context, w http.ResponseWriter, authCode storage.AuthCode, client storage.Client) (*accessTokenResponse, error) {
	ctx = withSignerAddress(ctx, authCode.ConnectorData)
	accessToken, _, err := s.newAccessToken(ctx, client.ID, authCode.Claims, authCode.Scopes, authCode.Nonce, authCode.ConnectorID)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./server/ -run TestExchangeAuthCodeSignerAddressClaim -v`
Expected: `PASS`, all five subtests.

- [ ] **Step 5: Run the affected packages and lint**

```bash
go test ./server/ ./connector/...
make bin/golangci-lint
make lint
```

Expected: `ok` for every package, and no lint findings. If `make lint` reports gci or gofumpt formatting on the new files, run `make fix`, re-run `make lint`, and include the formatting in the commit.

- [ ] **Step 6: Commit**

```bash
git add server/signer_claim_dimo.go server/signer_claim_dimo_test.go server/oauth2.go server/handlers.go
git commit -m "feat(server): emit signer_address on developer JWTs minted through web3 ERC-1271 logins"
```

### Task 3: dex pull request

**Files:** none.

**Interfaces:** Produces PR `DIMO-Network/dex` → `master`. Merging publishes `dimozone/dex:latest` (`.github/workflows/dimo-docker.yaml`).

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/dex-signer-address-claim
git push -u origin feat/signer-address-claim
gh pr create --repo DIMO-Network/dex --base master --head feat/signer-address-claim \
  --title "feat: signer_address claim on developer JWTs" --body-file - <<'EOF'
## Why

Developer JWTs name the license (`ethereum_address` = client ID) but not the API key (license signer) that minted them. Disabling a signer stops new tokens, but existing ones keep working for their full 336 hours. token-exchange-api and vehicle-triggers-api will check `isSigner(signer_address)` on each request. This PR is the first half of that.

## What

- **web3 connector:** after a successful ERC-1271 verification with a plain 65-byte ECDSA signature, it recovers the signing EOA, the same recovery the license account does before `isSigner`. It stores the address in `Identity.ConnectorData` as `{"signer_address": "0x…"}`. Smart-account signatures (other lengths or recovery ids) store nothing, so those logins are unchanged.
- **`exchangeAuthCode`:** reads that connector data, and `newIDToken` emits `signer_address` (checksummed) on both the access token and the ID token. Connector data already lives in the existing `auth_request` and `auth_code` columns, so there is no storage migration. The claim is omitted when absent.

## Compatibility

The change is additive. EOA logins and every other connector are unchanged. Consumers treat a missing claim as "minted before the claim existed".

## Tests

- `TestRecoverSigner`.
- Updated ERC-1271 cases in `TestEOALogin` and `TestBlockchainBackend`.
- `TestExchangeAuthCodeSignerAddressClaim` covers the claim present, absent, another connector's data, a malformed address, and non-JSON data.
EOF
```

Expected: a PR URL. Wait for CI (`ci.yaml`, `checks.yaml`) to go green and get a review. Merge before Task 11.

---

## token-exchange-api

### Task 4: license account binding and cached signer checker

**Files:**

- Create:
  - `internal/contracts/devlicenseaccount/devlicenseaccount.json`
  - `internal/contracts/devlicenseaccount/devlicenseaccount.go` (generated)
  - `internal/services/licensesigner/checker.go`
  - `internal/services/licensesigner/checker_test.go`
- Modify: `Makefile:98-101` (`generate-contracts`)
- Test: `internal/services/licensesigner/checker_test.go`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `licensesigner.TTL = 60 * time.Second`
  - `licensesigner.NewChecker(caller bind.ContractCaller, ttl time.Duration) *licensesigner.Checker`
  - `(*Checker).IsSigner(ctx context.Context, license, signer common.Address) (bool, error)` — Tasks 5 and 6 consume this through their own `SignerChecker` interfaces.
  - `devlicenseaccount.NewDevLicenseAccountCaller(address common.Address, caller bind.ContractCaller) (*DevLicenseAccountCaller, error)`, with `IsSigner(opts *bind.CallOpts, signer common.Address) (bool, error)`.

- [ ] **Step 1: Create the worktree**

```bash
git -C ~/workspace/token-exchange-api fetch origin
git -C ~/workspace/token-exchange-api worktree add ~/workspace/token-exchange-api-signer-check -b feat/signer-check origin/main
cd ~/workspace/token-exchange-api-signer-check
go mod download
```

Expected: `Preparing worktree (new branch 'feat/signer-check')`.

- [ ] **Step 2: Add the license account ABI and generate its binding**

Create `internal/contracts/devlicenseaccount/devlicenseaccount.json`. It's the `isSigner(address)` view of `DimoDeveloperLicenseAccount.sol` in `DIMO-Network/developer-license`:

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

Append to the `generate-contracts` target in `Makefile` (after line 101; the recipe line starts with a tab):

```make
	go tool abigen --abi internal/contracts/devlicenseaccount/devlicenseaccount.json --pkg devlicenseaccount --type DevLicenseAccount --out internal/contracts/devlicenseaccount/devlicenseaccount.go
```

Run:

```bash
go tool abigen --abi internal/contracts/devlicenseaccount/devlicenseaccount.json --pkg devlicenseaccount --type DevLicenseAccount --out internal/contracts/devlicenseaccount/devlicenseaccount.go
grep -n "func NewDevLicenseAccountCaller\|func (_DevLicenseAccount \*DevLicenseAccountCaller) IsSigner" internal/contracts/devlicenseaccount/devlicenseaccount.go
```

Expected: both functions are found.

- [ ] **Step 3: Write the failing tests**

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

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/stretchr/testify/require"
)

// fakeCaller answers isSigner calls from a queue; the last answer repeats.
type fakeCaller struct {
	mu      sync.Mutex
	answers []fakeAnswer
	calls   []ethereum.CallMsg
}

type fakeAnswer struct {
	isSigner bool
	err      error
}

func (f *fakeCaller) CodeAt(context.Context, common.Address, *big.Int) ([]byte, error) {
	return []byte{0x60}, nil
}

func (f *fakeCaller) CallContract(_ context.Context, call ethereum.CallMsg, _ *big.Int) ([]byte, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	answer := f.answers[min(len(f.calls), len(f.answers)-1)]
	f.calls = append(f.calls, call)
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

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

func newTestChecker(caller *fakeCaller, now *time.Time) *Checker {
	checker := NewChecker(caller, TTL)
	checker.now = func() time.Time { return *now }
	return checker
}

func TestCheckerCallsIsSignerOnTheLicenseAccount(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}}}

	ok, err := newTestChecker(caller, &now).IsSigner(context.Background(), license, signer)

	require.NoError(t, err)
	require.True(t, ok)
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
		checker := newTestChecker(caller, &now)

		got, err := checker.IsSigner(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, isSigner, got)

		now = now.Add(TTL - time.Second)
		got, err = checker.IsSigner(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, isSigner, got, "an answer within the TTL comes from the cache")
		require.Equal(t, 1, caller.callCount())

		now = now.Add(time.Second)
		got, err = checker.IsSigner(context.Background(), license, signer)
		require.NoError(t, err)
		require.Equal(t, !isSigner, got, "at the TTL the chain is asked again")
		require.Equal(t, 2, caller.callCount())
	}
}

func TestCheckerDoesNotCacheErrors(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{err: errors.New("rpc down")}, {isSigner: true}}}
	checker := newTestChecker(caller, &now)

	_, err := checker.IsSigner(context.Background(), license, signer)
	require.ErrorContains(t, err, "rpc down")

	ok, err := checker.IsSigner(context.Background(), license, signer)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, 2, caller.callCount())
}

func TestCheckerKeysByLicenseAndSigner(t *testing.T) {
	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}, {isSigner: false}}}
	checker := newTestChecker(caller, &now)
	other := common.HexToAddress("0x955029AC2539f4D57A1D7E6Ef2b97617e95Eb1D4")

	ok, err := checker.IsSigner(context.Background(), license, signer)
	require.NoError(t, err)
	require.True(t, ok)

	ok, err = checker.IsSigner(context.Background(), license, other)
	require.NoError(t, err)
	require.False(t, ok)
	require.Equal(t, 2, caller.callCount())
}

func TestCheckerBoundsTheCache(t *testing.T) {
	previous := maxEntries
	maxEntries = 2
	t.Cleanup(func() { maxEntries = previous })

	now := time.Unix(1_700_000_000, 0)
	caller := &fakeCaller{answers: []fakeAnswer{{isSigner: true}}}
	checker := newTestChecker(caller, &now)

	for i := range 3 {
		_, err := checker.IsSigner(context.Background(), license, common.BigToAddress(big.NewInt(int64(i+1))))
		require.NoError(t, err)
	}
	require.LessOrEqual(t, len(checker.cache), 2)
}
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `go test ./internal/services/licensesigner/ -v`
Expected: build failure: `undefined: NewChecker`, `undefined: TTL`, `undefined: Checker`, `undefined: maxEntries`.

- [ ] **Step 5: Implement the checker**

Create `internal/services/licensesigner/checker.go`:

```go
// Package licensesigner checks whether an address is still an enabled signer (API key) on
// a developer license.
package licensesigner

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/DIMO-Network/token-exchange-api/internal/contracts/devlicenseaccount"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

// TTL is how long an isSigner answer is reused. Removing a console team member must end
// their access within about ten minutes, the lifetime of a vehicle JWT; this keeps the
// check's share of that to one minute.
const TTL = 60 * time.Second

// maxEntries bounds the cache. When a write finds it full, expired answers are dropped, and
// if none are expired the cache starts over.
var maxEntries = 10_000

// Checker asks a developer license's account contract, whose address is the license's
// client ID, whether an address is one of its enabled signers.
type Checker struct {
	caller bind.ContractCaller
	ttl    time.Duration
	now    func() time.Time

	mu    sync.Mutex
	cache map[cacheKey]cacheEntry
}

type cacheKey struct {
	license common.Address
	signer  common.Address
}

type cacheEntry struct {
	isSigner bool
	expires  time.Time
}

// NewChecker returns a Checker that reuses each answer, positive or negative, for ttl.
func NewChecker(caller bind.ContractCaller, ttl time.Duration) *Checker {
	return &Checker{
		caller: caller,
		ttl:    ttl,
		now:    time.Now,
		cache:  make(map[cacheKey]cacheEntry),
	}
}

// IsSigner reports whether signer is an enabled signer on the license whose account is at
// license. Errors are not cached, so the next request asks the chain again.
func (c *Checker) IsSigner(ctx context.Context, license, signer common.Address) (bool, error) {
	key := cacheKey{license: license, signer: signer}
	now := c.now()

	c.mu.Lock()
	entry, ok := c.cache[key]
	c.mu.Unlock()
	if ok && now.Before(entry.expires) {
		return entry.isSigner, nil
	}

	account, err := devlicenseaccount.NewDevLicenseAccountCaller(license, c.caller)
	if err != nil {
		return false, fmt.Errorf("failed to bind license account %s: %w", license.Hex(), err)
	}
	isSigner, err := account.IsSigner(&bind.CallOpts{Context: ctx}, signer)
	if err != nil {
		return false, fmt.Errorf("failed to call isSigner on license account %s: %w", license.Hex(), err)
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.cache) >= maxEntries {
		for k, e := range c.cache {
			if !now.Before(e.expires) {
				delete(c.cache, k)
			}
		}
		if len(c.cache) >= maxEntries {
			c.cache = make(map[cacheKey]cacheEntry)
		}
	}
	c.cache[key] = cacheEntry{isSigner: isSigner, expires: now.Add(c.ttl)}
	return isSigner, nil
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `go test ./internal/services/licensesigner/ -v -race`
Expected: `PASS` for all five tests.

- [ ] **Step 7: Commit**

```bash
git add Makefile internal/contracts/devlicenseaccount internal/services/licensesigner
git commit -m "feat: cached isSigner check against developer license accounts"
```

### Task 5: refuse disabled signers on token exchange

**Files:**

- Create:
  - `internal/middleware/signer.go`
  - `internal/middleware/signer_test.go`
  - `internal/middleware/signer_mock_test.go` (generated)
  - `internal/middleware/valid_dev_license_mock_test.go` (generated)
- Modify:
  - `internal/app/app.go:78-93` (construct the checker and pass it in)
  - `internal/app/app.go:93-124` (`createHTTPServer` signature and handler chain)
- Test: `internal/middleware/signer_test.go`

**Interfaces:**

- Consumes: `licensesigner.NewChecker`, `licensesigner.TTL` (Task 4); `middleware.GetResponseSubject`, `middleware.NewDevLicenseValidator`, `middleware.IdentityService` (existing).
- Produces:
  - `middleware.SignerChecker interface { IsSigner(ctx context.Context, license, signer common.Address) (bool, error) }`
  - `middleware.NewSignerValidator(checker SignerChecker, logger zerolog.Logger) fiber.Handler`
  - `createHTTPServer(logger zerolog.Logger, settings *config.Settings, dexSvc *services.DexClient, accessService *access.Service, signerChecker middleware.SignerChecker) (*fiber.App, error)`

- [ ] **Step 1: Write the failing test**

Create `internal/middleware/signer_test.go`:

```go
package middleware_test

import (
	"encoding/base64"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/DIMO-Network/token-exchange-api/internal/middleware"
	"github.com/DIMO-Network/token-exchange-api/internal/middleware/dex"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/protobuf/proto"
)

//go:generate go tool mockgen -source ./signer.go -destination ./signer_mock_test.go -package middleware_test
//go:generate go tool mockgen -source ./valid_dev_license.go -destination ./valid_dev_license_mock_test.go -package middleware_test

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

func devLicenseClaims(t *testing.T, extra jwt.MapClaims) jwt.MapClaims {
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

func serveWithClaims(t *testing.T, ident middleware.IdentityService, checker middleware.SignerChecker, claims jwt.MapClaims) (int, string) {
	t.Helper()
	app := fiber.New()
	app.Get("/",
		func(c *fiber.Ctx) error {
			c.Locals("user", jwt.NewWithClaims(jwt.SigningMethodHS256, claims))
			return c.Next()
		},
		middleware.NewDevLicenseValidator(ident, zerolog.Nop()),
		middleware.NewSignerValidator(checker, zerolog.Nop()),
		func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	resp, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
	require.NoError(t, err)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	return resp.StatusCode, string(body)
}

func TestSignerValidator(t *testing.T) {
	devLicense := func(ident *MockIdentityService) {
		ident.EXPECT().IsDevLicense(gomock.Any(), license).Return(true, nil)
	}

	tests := []struct {
		name       string
		claims     jwt.MapClaims
		setup      func(ident *MockIdentityService, checker *MockSignerChecker)
		wantStatus int
		wantBody   string
	}{
		{
			name:       "token without signer_address passes without a chain call",
			claims:     devLicenseClaims(t, nil),
			setup:      func(ident *MockIdentityService, _ *MockSignerChecker) { devLicense(ident) },
			wantStatus: fiber.StatusOK,
		},
		{
			name:   "enabled signer passes",
			claims: devLicenseClaims(t, jwt.MapClaims{"signer_address": signer.Hex()}),
			setup: func(ident *MockIdentityService, checker *MockSignerChecker) {
				devLicense(ident)
				checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(true, nil)
			},
			wantStatus: fiber.StatusOK,
		},
		{
			name:   "lowercase signer claim is checked as the same address",
			claims: devLicenseClaims(t, jwt.MapClaims{"signer_address": strings.ToLower(signer.Hex())}),
			setup: func(ident *MockIdentityService, checker *MockSignerChecker) {
				devLicense(ident)
				checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(true, nil)
			},
			wantStatus: fiber.StatusOK,
		},
		{
			name:   "disabled signer is refused",
			claims: devLicenseClaims(t, jwt.MapClaims{"signer_address": signer.Hex()}),
			setup: func(ident *MockIdentityService, checker *MockSignerChecker) {
				devLicense(ident)
				checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(false, nil)
			},
			wantStatus: fiber.StatusForbidden,
			wantBody:   "signer no longer authorized for this license",
		},
		{
			name:   "chain error fails closed",
			claims: devLicenseClaims(t, jwt.MapClaims{"signer_address": signer.Hex()}),
			setup: func(ident *MockIdentityService, checker *MockSignerChecker) {
				devLicense(ident)
				checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(false, errors.New("rpc down"))
			},
			wantStatus: fiber.StatusServiceUnavailable,
			wantBody:   "could not verify signer",
		},
		{
			name:       "malformed signer claim is refused without a chain call",
			claims:     devLicenseClaims(t, jwt.MapClaims{"signer_address": "0x1234"}),
			setup:      func(ident *MockIdentityService, _ *MockSignerChecker) { devLicense(ident) },
			wantStatus: fiber.StatusForbidden,
			wantBody:   "signer no longer authorized for this license",
		},
		{
			name: "mobile app token is not checked",
			claims: jwt.MapClaims{
				"aud":              "dimo-driver",
				"ethereum_address": signer.Hex(),
				"signer_address":   signer.Hex(),
			},
			setup:      func(*MockIdentityService, *MockSignerChecker) {},
			wantStatus: fiber.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			ident := NewMockIdentityService(ctrl)
			checker := NewMockSignerChecker(ctrl)
			tc.setup(ident, checker)

			status, body := serveWithClaims(t, ident, checker, tc.claims)

			require.Equal(t, tc.wantStatus, status, body)
			if tc.wantBody != "" {
				require.Equal(t, tc.wantBody, body)
			}
		})
	}
}
```

- [ ] **Step 2: Add the interface stub and generate the mocks**

Create `internal/middleware/signer.go` containing the interface only, so mockgen has a source:

```go
package middleware

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
)

// SignerChecker reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license.
type SignerChecker interface {
	IsSigner(ctx context.Context, license, signer common.Address) (bool, error)
}
```

Run: `go generate ./internal/middleware/`
Expected: `internal/middleware/signer_mock_test.go` and `internal/middleware/valid_dev_license_mock_test.go` are created.

- [ ] **Step 3: Run the test to verify it fails**

Run: `go test ./internal/middleware/ -run TestSignerValidator -v`
Expected: build failure: `undefined: middleware.NewSignerValidator`.

- [ ] **Step 4: Implement the middleware**

Replace `internal/middleware/signer.go` with:

```go
package middleware

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/zerolog"
)

const (
	// signerAddressClaim is the developer-JWT claim dex sets to the license signer (API key)
	// that signed the login challenge.
	signerAddressClaim = "signer_address"

	errSignerNotAuthorized = "signer no longer authorized for this license"
	errSignerUnverifiable  = "could not verify signer"
)

// SignerChecker reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license.
type SignerChecker interface {
	IsSigner(ctx context.Context, license, signer common.Address) (bool, error)
}

// NewSignerValidator refuses developer-license tokens whose signer has been disabled on the
// license since the token was minted. It must run after NewDevLicenseValidator. Tokens
// without the claim (minted before dex set it) and DIMO mobile app tokens pass unchecked.
func NewSignerValidator(checker SignerChecker, logger zerolog.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token, ok := c.Locals("user").(*jwt.Token)
		if !ok {
			return fiber.NewError(fiber.StatusBadRequest, "failed to pull token from request context")
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return fiber.NewError(fiber.StatusBadRequest, "failed to read token claims")
		}
		rawSigner, present := claims[signerAddressClaim]
		if !present {
			return c.Next()
		}

		subject, err := GetResponseSubject(c)
		if err != nil {
			return err
		}
		if !common.IsHexAddress(subject) {
			// DIMO mobile app tokens have no license to check against.
			return c.Next()
		}

		signerHex, ok := rawSigner.(string)
		if !ok || !common.IsHexAddress(signerHex) {
			return fiber.NewError(fiber.StatusForbidden, errSignerNotAuthorized)
		}

		license := common.HexToAddress(subject)
		signer := common.HexToAddress(signerHex)
		isSigner, err := checker.IsSigner(c.Context(), license, signer)
		if err != nil {
			logger.Err(err).Str("license", license.Hex()).Str("signer", signer.Hex()).Msg("Failed to check license signer.")
			return fiber.NewError(fiber.StatusServiceUnavailable, errSignerUnverifiable)
		}
		if !isSigner {
			return fiber.NewError(fiber.StatusForbidden, errSignerNotAuthorized)
		}
		return c.Next()
	}
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `go test ./internal/middleware/ -run TestSignerValidator -v`
Expected: `PASS`, all seven subtests.

- [ ] **Step 6: Wire it into the HTTP server**

In `internal/app/app.go`:

- add the import `"github.com/DIMO-Network/token-exchange-api/internal/services/licensesigner"`;
- after `accessService` is created (line 78-81), add the checker;
- pass the checker to `createHTTPServer` (line 83).

```go
	signerChecker := licensesigner.NewChecker(ethClient, licensesigner.TTL)

	app, err := createHTTPServer(logger, settings, dexSvc, accessService, signerChecker)
```

Change the `createHTTPServer` signature (line 93) and handler chain (lines 100 and 124):

```go
func createHTTPServer(logger zerolog.Logger, settings *config.Settings, dexSvc *services.DexClient, accessService *access.Service, signerChecker middleware.SignerChecker) (*fiber.App, error) {
```

```go
	devLicenseMiddleware := middleware.NewDevLicenseValidator(idSvc, logger)
	signerMiddleware := middleware.NewSignerValidator(signerChecker, logger)
```

```go
	handlers := []fiber.Handler{jwtAuth, devLicenseMiddleware, signerMiddleware}
```

Run: `go build ./... && go test ./...`
Expected: build succeeds and every package reports `ok`.

- [ ] **Step 7: Commit**

```bash
git add internal/middleware/signer.go internal/middleware/signer_test.go internal/middleware/signer_mock_test.go internal/middleware/valid_dev_license_mock_test.go internal/app/app.go
git commit -m "feat: refuse developer JWTs whose signer was disabled on the license"
```

### Task 6: `SignerCheck` gRPC for other services

**Files:**

- Modify:
  - `pkg/grpc/token-exchange-api.proto`
  - `pkg/grpc/token-exchange-api.pb.go`, `pkg/grpc/token-exchange-api_grpc.pb.go` (generated)
  - `internal/controllers/rpc/rpc.go`
  - `internal/app/app.go:88`
- Create: `internal/controllers/rpc/rpc_test.go`, `internal/controllers/rpc/rpc_mock_test.go` (generated)
- Test: `internal/controllers/rpc/rpc_test.go`

**Interfaces:**

- Consumes: `(*licensesigner.Checker).IsSigner` (Task 4), the same instance as Task 5, so both paths share one cache.
- Produces:
  - `rpc TokenExchangeService.SignerCheck(SignerCheckRequest{ license string = 1; signer string = 2 }) returns (SignerCheckResponse{ is_signer bool = 1 })`
  - Errors: `codes.InvalidArgument` for non-hex input, `codes.Unavailable` with message `could not verify signer` on chain errors.
  - Go: `grpc.SignerCheckRequest{License, Signer string}`, `grpc.SignerCheckResponse{IsSigner bool}`, `rpc.NewTokenExchangeServer(accessService *access.Service, signerChecker rpc.SignerChecker) *TokenExchangeServer`. vehicle-triggers-api (Task 8) consumes this.

- [ ] **Step 1: Add the RPC to the proto**

In `pkg/grpc/token-exchange-api.proto`, replace the service block and append the messages:

```proto
service TokenExchangeService {
  rpc AccessCheck(AccessCheckRequest) returns (AccessCheckResponse);
  // SignerCheck reports whether signer is still an enabled signer on the developer license
  // whose license account (client ID) is license. Answers are cached for 60 seconds.
  rpc SignerCheck(SignerCheckRequest) returns (SignerCheckResponse);
}
```

```proto
message SignerCheckRequest {
  // The developer license client ID: its license account address.
  string license = 1;
  // The signer_address claim from the developer JWT.
  string signer = 2;
}

message SignerCheckResponse {
  bool is_signer = 1;
}
```

- [ ] **Step 2: Regenerate the gRPC code with the CI toolchain versions**

CI runs `make generate` and fails on any diff. The committed headers say `protoc-gen-go v1.36.11`, `protoc-gen-go-grpc v1.5.1` and `protoc v6.31.1`, so use protoc 31.1. On an Apple Silicon Mac, `make tools-protoc` downloads the x86_64 build; use the native one instead:

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
grep -n "SignerCheck" pkg/grpc/token-exchange-api_grpc.pb.go | head -3
```

Expected:

- `libprotoc 31.1`;
- both headers still show `protoc v6.31.1` and the same plugin versions;
- `SignerCheck` appears in the generated client and server interfaces.

`bin/` is git-ignored.

- [ ] **Step 3: Write the failing test**

Create `internal/controllers/rpc/rpc_test.go`:

```go
package rpc_test

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/DIMO-Network/token-exchange-api/internal/controllers/rpc"
	"github.com/DIMO-Network/token-exchange-api/pkg/grpc"
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

	for _, isSigner := range []bool{true, false} {
		t.Run(fmt.Sprintf("returns is_signer=%t", isSigner), func(t *testing.T) {
			checker := NewMockSignerChecker(gomock.NewController(t))
			checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(isSigner, nil)

			resp, err := rpc.NewTokenExchangeServer(nil, checker).SignerCheck(context.Background(), &grpc.SignerCheckRequest{
				License: license.Hex(),
				Signer:  signer.Hex(),
			})

			require.NoError(t, err)
			require.Equal(t, isSigner, resp.GetIsSigner())
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

	t.Run("chain errors are Unavailable", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))
		checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(false, errors.New("rpc down"))

		_, err := rpc.NewTokenExchangeServer(nil, checker).SignerCheck(context.Background(), &grpc.SignerCheckRequest{
			License: license.Hex(),
			Signer:  signer.Hex(),
		})

		require.Equal(t, codes.Unavailable, status.Code(err))
		require.Equal(t, "could not verify signer", status.Convert(err).Message())
	})
}
```

- [ ] **Step 4: Add the interface and constructor parameter, then generate the mock**

In `internal/controllers/rpc/rpc.go`, add `SignerChecker`, the struct field and the constructor parameter:

```go
// SignerChecker reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license.
type SignerChecker interface {
	IsSigner(ctx context.Context, license, signer common.Address) (bool, error)
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

Run: `go generate ./internal/controllers/rpc/ && go test ./internal/controllers/rpc/ -run TestSignerCheck -v`
Expected: the package compiles but the tests fail. `SignerCheck` still resolves to the embedded `UnimplementedTokenExchangeServiceServer`, so every subtest gets `codes.Unimplemented`: `require.NoError` fails with `rpc error: code = Unimplemented desc = method SignerCheck not implemented`, and the status checks report `expected: 0x3 actual: 0xc` / `expected: 0xe actual: 0xc`.

- [ ] **Step 5: Implement `SignerCheck`**

In `internal/controllers/rpc/rpc.go`, add `"google.golang.org/grpc/codes"` and `"google.golang.org/grpc/status"` to the imports, then add:

```go
// SignerCheck reports whether a developer JWT's signer_address is still an enabled signer
// on its license. It shares the HTTP path's 60-second cache.
func (s *TokenExchangeServer) SignerCheck(ctx context.Context, req *grpc.SignerCheckRequest) (*grpc.SignerCheckResponse, error) {
	if !common.IsHexAddress(req.GetLicense()) || !common.IsHexAddress(req.GetSigner()) {
		return nil, status.Error(codes.InvalidArgument, "license and signer must be hex addresses")
	}
	isSigner, err := s.signerChecker.IsSigner(ctx, common.HexToAddress(req.GetLicense()), common.HexToAddress(req.GetSigner()))
	if err != nil {
		return nil, status.Error(codes.Unavailable, "could not verify signer")
	}
	return &grpc.SignerCheckResponse{IsSigner: isSigner}, nil
}
```

- [ ] **Step 6: Run the tests, the full suite, the generators and lint**

```bash
go test ./internal/controllers/rpc/ -run TestSignerCheck -v
go test ./...
make tools-golangci-lint
make lint
make generate
git status --porcelain
```

Expected:

- `TestSignerCheck` passes;
- all packages report `ok`;
- no lint findings;
- after `make generate`, `git status --porcelain` lists only the files this task and Tasks 4-5 changed or added, with no further diff in already-staged generated files.

If `make generate` rewrites `docs/` (swagger) or any `*_mock_test.go`, inspect the diff. Commit it only if it comes from this branch's changes.

- [ ] **Step 7: Commit**

```bash
git add pkg/grpc internal/controllers/rpc internal/app/app.go
git commit -m "feat(grpc): SignerCheck so other services share the signer check and its cache"
```

### Task 7: token-exchange-api pull request

**Files:** none.

**Interfaces:** Produces PR `DIMO-Network/token-exchange-api` → `main`. Merging builds the dev image and bumps `charts/token-exchange-api/values.yaml` (`buildpushdev.yml`). Task 8's `go get` needs this merged.

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/token-exchange-api-signer-check
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/token-exchange-api --base main --head feat/signer-check \
  --title "feat: refuse developer JWTs whose signer was disabled" --body-file - <<'EOF'
## Why

Disabling a license signer (API key) stops dex from minting new developer JWTs with it, but tokens it already minted keep exchanging for vehicle JWTs for their full 336 hours. The console's team feature needs a removed member cut off within about 10 minutes, which is the vehicle JWT lifetime. dex now stamps the signer on developer JWTs as `signer_address` (DIMO-Network/dex PR).

## What

- **`/v1/tokens/exchange`:** when the token has `signer_address`, it calls `isSigner(signer)` on the license account at the client ID. Disabled returns `403 signer no longer authorized for this license`. An RPC failure returns `503 could not verify signer`, never failing open. Answers, positive and negative, are cached for 60 s per (license, signer). Errors aren't cached.
- **Unchanged:** tokens without the claim (minted before the dex change) and DIMO mobile tokens.
- **New gRPC `SignerCheck(license, signer) → is_signer`:** shares the same cache. vehicle-triggers-api uses it next.
- **New abigen binding** `internal/contracts/devlicenseaccount` (`isSigner(address)`).

## Effect on existing developers

Disabling an API key now ends its tokens within about a minute instead of two weeks.

## Tests

- `licensesigner`: call shape, both answers cached for the TTL, errors not cached, keyed by license and signer, cache bounded.
- `TestSignerValidator`: no claim, enabled, lowercase claim, disabled, chain error, malformed claim, mobile token.
- `TestSignerCheck`.
- `make generate` is clean.
EOF
```

Expected: a PR URL. Merge after review and green CI, and only after the dex PR (Task 3) has merged.

---

## vehicle-triggers-api

### Task 8: signer check on every authenticated request

**Files:**

- Modify:
  - `go.mod`, `go.sum`
  - `internal/auth/auth.go:29-33` (`CustomDexClaims`)
  - `internal/clients/tokenexchange/token-exchange.go` (add `IsSigner`)
  - `internal/app/app.go:124-125` (handler chain)
- Create:
  - `internal/auth/signer.go`
  - `internal/auth/signer_test.go`
  - `internal/auth/signer_mock_test.go` (generated)
  - `internal/clients/tokenexchange/token-exchange_test.go`
- Test: `internal/auth/signer_test.go`, `internal/clients/tokenexchange/token-exchange_test.go`

**Interfaces:**

- Consumes: `pb.SignerCheckRequest`, `pb.SignerCheckResponse` and `TokenExchangeServiceClient.SignerCheck` from `github.com/DIMO-Network/token-exchange-api/pkg/grpc` (Task 6, merged).
- Produces:
  - `auth.CustomDexClaims.SignerAddress common.Address` (`json:"signer_address"`; zero when absent);
  - `auth.SignerChecker interface { IsSigner(ctx context.Context, license, signer common.Address) (bool, error) }`;
  - `auth.NewSignerValidator(checker SignerChecker) fiber.Handler`;
  - `(*tokenexchange.Client).IsSigner(ctx context.Context, license, signer common.Address) (bool, error)`.

- [ ] **Step 1: Create the worktree and take the merged token-exchange-api**

```bash
git -C ~/workspace/vehicle-triggers-api fetch origin
git -C ~/workspace/vehicle-triggers-api worktree add ~/workspace/vehicle-triggers-api-signer-check -b feat/signer-check origin/main
cd ~/workspace/vehicle-triggers-api-signer-check
go get github.com/DIMO-Network/token-exchange-api@main
go mod tidy
grep -n "token-exchange-api" go.mod
go doc github.com/DIMO-Network/token-exchange-api/pkg/grpc SignerCheckRequest
```

Expected:

- `go.mod` shows a newer `github.com/DIMO-Network/token-exchange-api` pseudo-version;
- `go doc` prints the `SignerCheckRequest` struct with `License` and `Signer`.

If `go doc` reports no such symbol, Task 7's PR isn't merged yet. Stop and wait.

- [ ] **Step 2: Write the failing tests**

Create `internal/clients/tokenexchange/token-exchange_test.go`:

```go
package tokenexchange

import (
	"context"
	"net"
	"testing"

	pb "github.com/DIMO-Network/token-exchange-api/pkg/grpc"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
)

type signerCheckServer struct {
	pb.UnimplementedTokenExchangeServiceServer
	got  *pb.SignerCheckRequest
	resp *pb.SignerCheckResponse
	err  error
}

func (s *signerCheckServer) SignerCheck(_ context.Context, req *pb.SignerCheckRequest) (*pb.SignerCheckResponse, error) {
	s.got = req
	return s.resp, s.err
}

func newBufconnClient(t *testing.T, srv pb.TokenExchangeServiceServer) *Client {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	server := grpc.NewServer()
	pb.RegisterTokenExchangeServiceServer(server, srv)
	go func() { _ = server.Serve(lis) }()
	t.Cleanup(server.Stop)

	conn, err := grpc.NewClient("passthrough:///bufconn",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })
	return &Client{client: pb.NewTokenExchangeServiceClient(conn)}
}

func TestClientIsSigner(t *testing.T) {
	license := common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer := common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")

	t.Run("sends checksummed addresses and returns the answer", func(t *testing.T) {
		srv := &signerCheckServer{resp: &pb.SignerCheckResponse{IsSigner: true}}

		ok, err := newBufconnClient(t, srv).IsSigner(context.Background(), license, signer)

		require.NoError(t, err)
		require.True(t, ok)
		require.Equal(t, license.Hex(), srv.got.GetLicense())
		require.Equal(t, signer.Hex(), srv.got.GetSigner())
	})

	t.Run("a gRPC error is returned", func(t *testing.T) {
		srv := &signerCheckServer{err: status.Error(codes.Unavailable, "could not verify signer")}

		_, err := newBufconnClient(t, srv).IsSigner(context.Background(), license, signer)

		require.ErrorContains(t, err, "could not verify signer")
	})
}
```

Create `internal/auth/signer_test.go`:

```go
package auth

import (
	"encoding/json"
	"errors"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/DIMO-Network/server-garage/pkg/fibercommon"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

//go:generate go tool mockgen -source=signer.go -destination=signer_mock_test.go -package=auth

var (
	license = common.HexToAddress("0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37")
	signer  = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
)

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

func serveSignerValidator(t *testing.T, checker SignerChecker, claims CustomDexClaims) (int, fibercommon.CodedResponse) {
	t.Helper()
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error { return fibercommon.ErrorHandler(c, err) },
	})
	app.Get("/",
		func(c *fiber.Ctx) error {
			c.Locals(UserJwtKey, &jwt.Token{Claims: &Token{CustomDexClaims: claims}})
			return c.Next()
		},
		NewSignerValidator(checker),
		func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) },
	)
	resp, err := app.Test(httptest.NewRequest("GET", "/", nil), -1)
	require.NoError(t, err)
	var body fibercommon.CodedResponse
	raw, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	if resp.StatusCode != fiber.StatusOK {
		require.NoError(t, json.Unmarshal(raw, &body))
	}
	return resp.StatusCode, body
}

func TestSignerValidator(t *testing.T) {
	t.Run("token without signer_address passes without a check", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))

		status, _ := serveSignerValidator(t, checker, CustomDexClaims{EthereumAddress: license})

		require.Equal(t, fiber.StatusOK, status)
	})

	t.Run("enabled signer passes", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))
		checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(true, nil)

		status, _ := serveSignerValidator(t, checker, CustomDexClaims{EthereumAddress: license, SignerAddress: signer})

		require.Equal(t, fiber.StatusOK, status)
	})

	t.Run("disabled signer is refused", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))
		checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(false, nil)

		status, body := serveSignerValidator(t, checker, CustomDexClaims{EthereumAddress: license, SignerAddress: signer})

		require.Equal(t, fiber.StatusForbidden, status)
		require.Equal(t, "signer no longer authorized for this license", body.Message)
	})

	t.Run("check failure fails closed", func(t *testing.T) {
		checker := NewMockSignerChecker(gomock.NewController(t))
		checker.EXPECT().IsSigner(gomock.Any(), license, signer).Return(false, errors.New("token exchange down"))

		status, body := serveSignerValidator(t, checker, CustomDexClaims{EthereumAddress: license, SignerAddress: signer})

		require.Equal(t, fiber.StatusServiceUnavailable, status)
		require.Equal(t, "could not verify signer", body.Message)
	})
}
```

- [ ] **Step 3: Add the interface stub, generate the mock, and run the tests to verify they fail**

Create `internal/auth/signer.go` with only the interface:

```go
package auth

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
)

// SignerChecker reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license.
type SignerChecker interface {
	IsSigner(ctx context.Context, license, signer common.Address) (bool, error)
}
```

Run:

```bash
go generate ./internal/auth/
go test ./internal/auth/ ./internal/clients/tokenexchange/ -v
```

Expected: build failures: `tok.SignerAddress undefined (type Token has no field or method SignerAddress)`, `undefined: NewSignerValidator`, and `….IsSigner undefined (type *Client has no field or method IsSigner)`.

- [ ] **Step 4: Implement the claim, the client call and the middleware**

In `internal/auth/auth.go`, extend `CustomDexClaims` (lines 29-33):

```go
// CustomDexClaims is the custom claims for the token.
type CustomDexClaims struct {
	ProviderID      string         `json:"provider_id"`
	AtHash          string         `json:"at_hash"`
	EmailVerified   bool           `json:"email_verified"`
	EthereumAddress common.Address `json:"ethereum_address"`
	// SignerAddress is the license signer (API key) that minted the token. It is the zero
	// address for tokens minted before dex set signer_address.
	SignerAddress common.Address `json:"signer_address"`
}
```

Append to `internal/clients/tokenexchange/token-exchange.go`:

```go
// IsSigner reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license. token-exchange-api caches the answer for
// 60 seconds.
func (c *Client) IsSigner(ctx context.Context, license, signer common.Address) (bool, error) {
	resp, err := c.client.SignerCheck(ctx, &pb.SignerCheckRequest{
		License: license.Hex(),
		Signer:  signer.Hex(),
	})
	if err != nil {
		return false, fmt.Errorf("failed to check signer: %w", err)
	}
	return resp.GetIsSigner(), nil
}
```

Replace `internal/auth/signer.go` with:

```go
package auth

import (
	"context"
	"fmt"
	"net/http"

	"github.com/DIMO-Network/server-garage/pkg/richerrors"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gofiber/fiber/v2"
)

// SignerChecker reports whether signer is still an enabled signer on the developer license
// whose license account (client ID) is license.
type SignerChecker interface {
	IsSigner(ctx context.Context, license, signer common.Address) (bool, error)
}

// NewSignerValidator refuses developer-license tokens whose signer has been disabled on the
// license since the token was minted. It must run after NewDevLicenseValidator. Tokens
// without signer_address (minted before dex set it) pass unchecked.
func NewSignerValidator(checker SignerChecker) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token, err := GetDexJWT(c)
		if err != nil {
			return richerrors.Error{
				Code:        http.StatusInternalServerError,
				Err:         err,
				ExternalMsg: "failed to retrieve dex jwt",
			}
		}
		if token.SignerAddress == (common.Address{}) {
			return c.Next()
		}

		isSigner, err := checker.IsSigner(c.Context(), token.EthereumAddress, token.SignerAddress)
		if err != nil {
			return richerrors.Error{
				Code:        http.StatusServiceUnavailable,
				Err:         err,
				ExternalMsg: "could not verify signer",
			}
		}
		if !isSigner {
			return richerrors.Error{
				Code:        http.StatusForbidden,
				Err:         fmt.Errorf("signer %s is not enabled on license %s", token.SignerAddress.Hex(), token.EthereumAddress.Hex()),
				ExternalMsg: "signer no longer authorized for this license",
			}
		}
		return c.Next()
	}
}
```

In `internal/app/app.go`, replace lines 124-125:

```go
	devLicenseMiddleware := auth.NewDevLicenseValidator(identityClient)
	signerMiddleware := auth.NewSignerValidator(tokenExchangeClient)
	devJWTAuth := app.Use(jwtMiddleware, devLicenseMiddleware, signerMiddleware)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `go test ./internal/auth/ ./internal/clients/tokenexchange/ -v`
Expected: `PASS` for `TestTokenReadsSignerAddressClaim`, all four `TestSignerValidator` subtests, and both `TestClientIsSigner` subtests.

Then run: `go build ./... && go test ./... 2>&1 | tail -30`
Expected: every package reports `ok`. `tests/e2e`'s fake token-exchange server embeds `UnimplementedTokenExchangeServiceServer`, so it still compiles. Its tokens carry no `signer_address`, so it never calls `SignerCheck`. Docker-backed packages need Docker running.

- [ ] **Step 6: Commit**

```bash
git add go.mod go.sum internal/auth internal/clients/tokenexchange internal/app/app.go
git commit -m "feat(auth): refuse developer JWTs whose signer was disabled on the license"
```

### Task 9: record who created each webhook

**Files:**

- Create: `internal/db/migrations/00006_trigger_created_by_signer.sql`
- Modify:
  - `internal/db/models/triggers.go` (generated)
  - `internal/services/triggersrepo/triggersrepo.go:3-22` (imports), `:61-71` (`CreateTriggerRequest`), `:115-128` (insert)
  - `internal/controllers/webhook/webhook_controller.go:100-110` (create) and `:150-165` (list)
  - `internal/controllers/webhook/types.go:77-102` (`WebhookView`)
  - `docs/` (swagger, generated)
- Test:
  - `internal/services/triggersrepo/triggersrepo_test.go` (`TestCreateTrigger`)
  - `internal/controllers/webhook/webhook_controller_test.go` (`TestWebhookController_RegisterWebhook`, `TestWebhookController_ListWebhooks`)

**Interfaces:**

- Consumes: `auth.CustomDexClaims.SignerAddress` (Task 8).
- Produces:
  - `triggers.created_by_signer TEXT NULL` (lowercase hex);
  - `triggersrepo.CreateTriggerRequest.CreatedBySigner common.Address` (zero means unknown);
  - `models.Trigger.CreatedBySigner null.String`;
  - `webhook.WebhookView.CreatedBySigner string` (`json:"createdBySigner,omitempty"`, checksummed) on `GET /v1/webhooks`. Part 3's removal flow consumes this.

- [ ] **Step 1: Add the migration and regenerate the models**

```bash
make add-migration name=trigger_created_by_signer
ls internal/db/migrations/
```

Expected: a new `00006_trigger_created_by_signer.sql`. If goose gave it another number, rename it to `00006_trigger_created_by_signer.sql`.

Replace its contents with:

```sql
-- +goose Up
-- +goose StatementBegin

-- The developer-license signer (API key) whose JWT created the webhook, as lowercase hex.
-- NULL for webhooks created before dex put signer_address on developer JWTs. The DIMO
-- console uses it to show a license owner the webhooks a removed team member created.
ALTER TABLE triggers
  ADD COLUMN IF NOT EXISTS created_by_signer TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE triggers
  DROP COLUMN IF EXISTS created_by_signer;

-- +goose StatementEnd
```

Port 5432 must be free; stop any other local Postgres or compose stack first. Then run:

```bash
make generate-sqlboiler
grep -n "CreatedBySigner" internal/db/models/triggers.go | head -3
git status --porcelain internal/db/models
```

Expected:

- `CreatedBySigner null.String \`boil:"created_by_signer" …\``appears in the`Trigger` struct;
- only `internal/db/models/triggers.go` changed.

- [ ] **Step 2: Write the failing tests**

In `internal/services/triggersrepo/triggersrepo_test.go`, add two subtests inside `TestCreateTrigger`, after `t.Run("success", …)`:

```go
	t.Run("records the creating signer as lowercase hex", func(t *testing.T) {
		req := baseReq
		req.CreatedBySigner = common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")

		trigger, err := repo.CreateTrigger(ctx, req)
		require.NoError(t, err)

		stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
		require.NoError(t, err)
		require.True(t, stored.CreatedBySigner.Valid)
		assert.Equal(t, "0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5", stored.CreatedBySigner.String)
	})

	t.Run("without a signer stores NULL", func(t *testing.T) {
		trigger, err := repo.CreateTrigger(ctx, baseReq)
		require.NoError(t, err)

		stored, err := models.FindTrigger(ctx, tc.DB, trigger.ID)
		require.NoError(t, err)
		assert.False(t, stored.CreatedBySigner.Valid)
	})
```

In `internal/controllers/webhook/webhook_controller_test.go`, add this helper after `tokenInjector`:

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
```

Add a subtest inside `TestWebhookController_RegisterWebhook`:

```go
	t.Run("records the signer that created the webhook", func(t *testing.T) {
		controller, mockRepo, _ := newWebhookControllerAndMocks(t)

		app := newApp()
		devLicense := common.HexToAddress("0x1234567890abcdef")
		signer := common.HexToAddress("0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5")
		app.Use(tokenInjectorWithSigner(devLicense, signer))
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
			}).
			Times(1)

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
		assert.Equal(t, signer, got.CreatedBySigner)
		assert.Equal(t, devLicense, got.DeveloperLicenseAddress)
	})
```

Add a subtest inside `TestWebhookController_ListWebhooks`:

```go
	t.Run("returns createdBySigner checksummed and omits it when unknown", func(t *testing.T) {
		controller, mockRepo, _ := newWebhookControllerAndMocks(t)

		app := newApp()
		app.Use(tokenInjector(common.HexToAddress("0x1234567890abcdef")))
		app.Get("/webhooks", controller.ListWebhooks)

		mockRepo.EXPECT().
			GetTriggersByDeveloperLicense(gomock.Any(), gomock.Any()).
			Return([]*models.Trigger{
				{ID: "by-member", CreatedBySigner: null.StringFrom("0x71efd5d71a597eb6bec28dfdb05a49283a3e20c5")},
				{ID: "legacy"},
			}, nil).
			Times(1)

		resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/webhooks", nil))
		require.NoError(t, err)
		defer resp.Body.Close() //nolint:errcheck // fine for tests
		require.Equal(t, fiber.StatusOK, resp.StatusCode)

		var raw []map[string]any
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&raw))
		require.Len(t, raw, 2)
		assert.Equal(t, "0x71efD5d71a597eB6BEC28DFDB05a49283a3e20c5", raw[0]["createdBySigner"])
		assert.NotContains(t, raw[1], "createdBySigner")
	})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `go test ./internal/controllers/webhook/ ./internal/services/triggersrepo/ -run 'TestCreateTrigger|TestWebhookController_RegisterWebhook|TestWebhookController_ListWebhooks' -v`
Expected: build failure: `req.CreatedBySigner undefined (type CreateTriggerRequest has no field or method CreatedBySigner)` and `got.CreatedBySigner undefined`.

- [ ] **Step 4: Store and return the signer**

In `internal/services/triggersrepo/triggersrepo.go`, add `"strings"` to the stdlib imports. Add the field to `CreateTriggerRequest` (after line 70):

```go
	DeveloperLicenseAddress common.Address
	// CreatedBySigner is the license signer (API key) whose JWT created the trigger; the zero
	// address when the JWT carried no signer_address.
	CreatedBySigner common.Address
}
```

In `CreateTrigger`, add to the `models.Trigger` literal (after `DeveloperLicenseAddress`, line 124):

```go
		DeveloperLicenseAddress: req.DeveloperLicenseAddress.Bytes(),
		CreatedBySigner:         createdBySigner(req.CreatedBySigner),
```

Add below `CreateTrigger`:

```go
// createdBySigner stores the creating signer as lowercase hex, or NULL when the JWT carried none.
func createdBySigner(signer common.Address) null.String {
	if signer == (common.Address{}) {
		return null.String{}
	}
	return null.StringFrom(strings.ToLower(signer.Hex()))
}
```

In `internal/controllers/webhook/types.go`, add to `WebhookView` after `DisplayName` (line 101):

```go
	// DisplayName is the user-friendly unique name per developer license.
	DisplayName string `json:"displayName"`
	// CreatedBySigner is the license signer (API key) whose JWT created the webhook,
	// checksummed. Omitted for webhooks created before JWTs carried signer_address.
	CreatedBySigner string `json:"createdBySigner,omitempty"`
}
```

In `internal/controllers/webhook/webhook_controller.go`, in `RegisterWebhook`'s `CreateTriggerRequest` literal (line 109):

```go
		DisplayName:             payload.DisplayName,
		CreatedBySigner:         token.SignerAddress,
	}
```

In `ListWebhooks`, compute the creator inside the loop next to `desc`, and set it on the view (after `DisplayName: t.DisplayName,`, line 163):

```go
		createdBy := ""
		if t.CreatedBySigner.Valid {
			createdBy = common.HexToAddress(t.CreatedBySigner.String).Hex()
		}
```

```go
			DisplayName:     t.DisplayName,
			CreatedBySigner: createdBy,
		})
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `go test ./internal/controllers/webhook/ ./internal/services/triggersrepo/ -run 'TestCreateTrigger|TestWebhookController_RegisterWebhook|TestWebhookController_ListWebhooks' -v`
Expected: `PASS`, including the four new subtests. The repo tests need Docker running (testcontainers).

- [ ] **Step 6: Regenerate swagger, then run the suite, lint and the generator check**

```bash
make generate-swagger
grep -n "createdBySigner" docs/swagger.yaml
go test ./...
make tools-golangci-lint
make lint
make generate
git status --porcelain
```

Expected:

- `createdBySigner` appears under `webhook.WebhookView`;
- all packages report `ok`;
- no lint findings;
- after `make generate`, `git status --porcelain` lists only this task's and Task 8's files.

- [ ] **Step 7: Commit**

```bash
git add internal/db/migrations/00006_trigger_created_by_signer.sql internal/db/models/triggers.go internal/services/triggersrepo internal/controllers/webhook docs
git commit -m "feat: record and return the signer that created each webhook"
```

### Task 10: vehicle-triggers-api pull request

**Files:** none.

**Interfaces:** Produces PR `DIMO-Network/vehicle-triggers-api` → `main`.

- [ ] **Step 1: Push and open the PR**

```bash
cd ~/workspace/vehicle-triggers-api-signer-check
git push -u origin feat/signer-check
gh pr create --repo DIMO-Network/vehicle-triggers-api --base main --head feat/signer-check \
  --title "feat: refuse disabled signers and record webhook creators" --body-file - <<'EOF'
## Why

The console's team feature gives each member their own license signer. Removing a member disables that signer, which must cut off what their existing developer JWTs can do here within a minute. The owner also needs to see webhooks the member created, because a webhook keeps sending data after its creator leaves.

## What

- **Authenticated routes:** after the dev-license check, when the token has `signer_address` (set by dex), call token-exchange-api's new gRPC `SignerCheck`, which is cached for 60 s there.
  - Disabled returns `403 signer no longer authorized for this license`.
  - A gRPC failure returns `503 could not verify signer`.
  - Tokens without the claim pass.
- **New column `triggers.created_by_signer`** (nullable text, lowercase hex), migration `00006`. It's set on create from the token's `signer_address`.
- **`GET /v1/webhooks`** returns `createdBySigner` (checksummed), omitted when unknown.
- **`token-exchange-api` bumped** to the commit with `SignerCheck`.

## Migration note

The unmerged `nats-jetstream-migration` line also adds a `00006_…` migration (`00006_trigger_signing_secret.sql`). Whichever merges second must renumber.

## Tests

- `TestSignerValidator`: no claim, enabled, disabled, check failure.
- `TestTokenReadsSignerAddressClaim`: lowercase claim, and absent.
- `TestClientIsSigner` (bufconn).
- `TestCreateTrigger`: signer stored lowercase; NULL without.
- Register passes the signer; list returns it or omits it.
EOF
```

Expected: a PR URL. Merge after review and green CI, and only after Task 7's PR has merged and token-exchange-api dev has deployed (the bot commit `Update Image Version to <sha>` on `main`).

---

## Live pass

### Task 11: deploy to dev and verify revocation end to end

**Files:** none (manual verification). Record the results in the token-exchange-api PR as a comment.

**Interfaces:**

- Consumes: all three merged PRs.
- Produces: evidence that the spec's revocation requirement holds in dev. Part 3's flag `NEXT_PUBLIC_TEAM_DATA_ACCESS_ENABLED` may be turned on in staging only after this passes.

**Dev endpoints:**

- `https://auth.dev.dimo.zone`
- `https://token-exchange-api.dev.dimo.zone`
- `https://vehicle-triggers-api.dev.dimo.zone`
- `https://telemetry-api.dev.dimo.zone/query`
- `https://identity-api.dev.dimo.zone/query`
- Vehicle NFT (Amoy) `0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8`
- Console `https://console-staging.dimo.org`

- [ ] **Step 1: Confirm the deploys**

- **dex:** dev and prod both run `dimozone/dex:latest` with `pullPolicy: Always` (`cluster-helm-charts/charts/dimo-dex/values.yaml`, `values-prod.yaml`). Merging to `master` publishes `latest`, and a pod restart picks it up. Restart the dev dex deployment from ArgoCD (Restart on the dimo-dex Deployment in the dev app). The change is additive; prod dex picks it up on its next restart.
- **token-exchange-api and vehicle-triggers-api:** merging to `main` triggers `buildpushdev.yml`, which commits `Update Image Version to <sha>` to the chart's `values.yaml`, and ArgoCD syncs dev. Check that both bot commits exist:

```bash
git -C ~/workspace/token-exchange-api fetch origin && git -C ~/workspace/token-exchange-api log --oneline -3 origin/main
git -C ~/workspace/vehicle-triggers-api fetch origin && git -C ~/workspace/vehicle-triggers-api log --oneline -3 origin/main
```

Expected: the top commit of each is `Update Image Version to <sha of the feature merge>`.

- [ ] **Step 2: Prepare a test license, two keys and a vehicle**

1. In `https://console-staging.dimo.org`, open (or create) a test license you own. Note its client ID and one redirect URI.
2. Under API keys, generate two keys. Copy each private key when it's shown: one is the "member" key, the other the "owner" key.
3. Pick a vehicle shared with the license. The staging console's Vehicle Simulator mints and shares one.

Then set the variables and confirm the vehicle:

```bash
export CLIENT_ID=0x...          # license client ID
export DOMAIN=https://...       # one of the license's redirect URIs
export MEMBER_PK=0x...          # member API key
export OWNER_PK=0x...           # owner API key
export VEHICLE_TOKEN_ID=...     # vehicle shared with the license
export AUTH=https://auth.dev.dimo.zone TX=https://token-exchange-api.dev.dimo.zone VT=https://vehicle-triggers-api.dev.dimo.zone
export TELEMETRY=https://telemetry-api.dev.dimo.zone/query VEHICLE_NFT=0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8
curl -s https://identity-api.dev.dimo.zone/query -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ vehicles(first: 100, filterBy: {privileged: \\\"$CLIENT_ID\\\"}) { nodes { tokenId } } }\"}"
```

Expected: the Identity response lists `VEHICLE_TOKEN_ID`.

- [ ] **Step 3: Define the helpers (zsh or bash)**

```bash
mint_dev_jwt() { # $1 = signer private key; prints the developer JWT
  (cd ~/workspace/dimo-developer-console && PK="$1" node --input-type=module -e '
import { privateKeyToAccount } from "viem/accounts";
const { AUTH, PK, CLIENT_ID, DOMAIN } = process.env;
const post = async (path, body) => {
  const res = await fetch(`${AUTH}${path}`, { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
};
const { state, challenge } = await post("/auth/web3/generate_challenge", {
  client_id: CLIENT_ID, domain: DOMAIN, scope: "openid email", response_type: "code", address: CLIENT_ID });
const signature = await privateKeyToAccount(PK).signMessage({ message: challenge });
const { access_token } = await post("/auth/web3/submit_challenge", {
  client_id: CLIENT_ID, state, grant_type: "authorization_code", domain: DOMAIN, signature });
process.stdout.write(access_token);
')
}
claims() { node -e 'console.log(JSON.stringify(JSON.parse(Buffer.from(process.argv[1].split(".")[1], "base64url")), null, 2))' "$1"; }
address_of() { (cd ~/workspace/dimo-developer-console && node --input-type=module -e 'import { privateKeyToAccount } from "viem/accounts"; process.stdout.write(privateKeyToAccount(process.argv[1]).address)' "$1"); }
exchange() { # $1 = developer JWT; prints the body, then the HTTP status on its own line
  curl -s -w '\n%{http_code}\n' -X POST "$TX/v1/tokens/exchange" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
    -d "{\"nftContractAddress\":\"$VEHICLE_NFT\",\"tokenId\":$VEHICLE_TOKEN_ID,\"privileges\":[1]}"
}
```

- [ ] **Step 4: Mint the tokens and check the claim**

```bash
export MEMBER_SIGNER=$(address_of "$MEMBER_PK")
export MEMBER_JWT=$(mint_dev_jwt "$MEMBER_PK")
export OWNER_JWT=$(mint_dev_jwt "$OWNER_PK")
claims "$MEMBER_JWT" | grep -E '"(ethereum_address|signer_address|exp)"'
echo "expected signer_address: $MEMBER_SIGNER"
```

Expected:

- `ethereum_address` equals `CLIENT_ID`;
- `signer_address` equals `MEMBER_SIGNER` exactly (checksummed);
- `exp` is 336 hours out.

If `signer_address` is missing, dev dex isn't running the merged image. Redo Step 1.

- [ ] **Step 5: Get a vehicle JWT and create a webhook with the member token**

```bash
exchange "$MEMBER_JWT"   # expect a {"token": "..."} body and 200
export VEHICLE_JWT=$(exchange "$MEMBER_JWT" | head -1 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).token))')
claims "$VEHICLE_JWT" | grep -E '"(iat|exp)"'   # exp - iat = 600

node -e 'require("http").createServer((q,s)=>{q.resume();s.end("live-pass-token")}).listen(8787)' &
WEBHOOK_SERVER_PID=$!
# In a second terminal: cloudflared tunnel --url http://localhost:8787   (brew install cloudflared if missing)
export TUNNEL_URL=https://<printed>.trycloudflare.com
curl -s -w '\n%{http_code}\n' -X POST "$VT/v1/webhooks" -H "Authorization: Bearer $MEMBER_JWT" -H 'Content-Type: application/json' \
  -d "{\"service\":\"signals\",\"metricName\":\"vss.speed\",\"condition\":\"valueNumber > 500\",\"coolDownPeriod\":30,\"targetURL\":\"$TUNNEL_URL\",\"status\":\"enabled\",\"verificationToken\":\"live-pass-token\",\"displayName\":\"signer-live-pass\"}"
curl -s "$VT/v1/webhooks" -H "Authorization: Bearer $OWNER_JWT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).filter(w=>w.displayName==="signer-live-pass")))'
```

Expected:

- the exchange returns 200 and `exp - iat = 600`;
- the webhook POST returns 201;
- the owner's list shows the `signer-live-pass` webhook with `createdBySigner` equal to `MEMBER_SIGNER`. Note its `id`.

- [ ] **Step 6: Disable the member key and time the cutoff**

In the staging console, delete the member API key from the license (this calls `disableSigner`). Wait for the success toast that confirms the transaction, then immediately run:

```bash
T0=$(date +%s)
until out=$(exchange "$MEMBER_JWT") && [ "$(echo "$out" | tail -1)" = 403 ]; do sleep 5; done
echo "$out"; echo "token exchange refused after $(( $(date +%s) - T0 )) s"
curl -s -w '\n%{http_code}\n' "$VT/v1/webhooks" -H "Authorization: Bearer $MEMBER_JWT"
```

Expected:

- the exchange body contains `signer no longer authorized for this license` with status 403, within **60 s** of `T0`;
- vehicle-triggers answers `{"message":"signer no longer authorized for this license","code":403}`.

- [ ] **Step 7: Check what's left of the member's access, and that the owner is unaffected**

```bash
curl -s "$TELEMETRY" -H "Authorization: Bearer $VEHICLE_JWT" -H 'Content-Type: application/json' \
  -d "{\"query\":\"{ signalsLatest(tokenId: $VEHICLE_TOKEN_ID) { lastSeen } }\"}"
exchange "$OWNER_JWT" | tail -1
```

Expected:

- **Telemetry:** answers with `data` (not 401). The vehicle JWT minted before the cutoff still works.
- **Owner exchange:** returns `200`.

Repeat the telemetry call after the vehicle JWT's `exp`. Expected: `401`. That bounds the member's total remaining access to the 10-minute vehicle JWT.

- [ ] **Step 8: Clean up and record**

```bash
WEBHOOK_ID=<id from Step 5>
curl -s -X DELETE "$VT/v1/webhooks/$WEBHOOK_ID" -H "Authorization: Bearer $OWNER_JWT"
kill $WEBHOOK_SERVER_PID
```

Stop `cloudflared`. Optionally delete the owner key in the console.

Post the measured cutoff time, the 403 bodies, and the telemetry before and after `exp` as a comment on the token-exchange-api PR.

### Task 12: release to production and repeat the pass

**Files:** none.

**Interfaces:**

- Consumes: Task 11 passed.
- Produces: production running all three changes. Part 3's flag may be turned on in production only after this passes.

- [ ] **Step 1: Tag token-exchange-api, then vehicle-triggers-api, in that order**

```bash
cd ~/workspace/token-exchange-api && git fetch --tags origin && git tag --sort=-v:refname | head -3
```

Choose the next minor version above the latest tag. For example, if the latest is `v0.4.0`, use `v0.5.0`.

```bash
git tag v0.5.0 origin/main && git push origin v0.5.0
```

Wait for `buildpushtagged.yml` to commit `image.tag` to `charts/token-exchange-api/values-prod.yaml` and for ArgoCD to sync prod.

```bash
cd ~/workspace/vehicle-triggers-api && git fetch --tags origin && git tag --sort=-v:refname | head -3
```

Again choose the next minor version above the latest. For example, if the latest is `v1.4.9`, use `v1.5.0`.

```bash
git tag v1.5.0 origin/main && git push origin v1.5.0
```

Expected: both bot commits update `values-prod.yaml`.

Order matters. vehicle-triggers-api must not reach prod before token-exchange-api has `SignerCheck`. Otherwise tokens that carry the claim get 503 from the webhooks API.

- [ ] **Step 2: Restart prod dex**

Restart the prod dimo-dex Deployment from ArgoCD so it pulls `dimozone/dex:latest`.

- [ ] **Step 3: Repeat Task 11 Steps 2-8 against production**

Use a test license on `https://console.dimo.org` and a vehicle shared with it. Set:

```bash
export AUTH=https://auth.dimo.zone TX=https://token-exchange-api.dimo.zone VT=https://vehicle-triggers-api.dimo.zone
export TELEMETRY=https://telemetry-api.dimo.zone/query VEHICLE_NFT=0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF
```

For Step 2's Identity check, use `https://identity-api.dimo.zone/query`.

Expected: the same results as in dev, with the cutoff within 60 s of the disable transaction.
