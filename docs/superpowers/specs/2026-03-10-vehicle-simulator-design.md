# Vehicle Simulator — Design Spec

**Date:** 2026-03-10
**Status:** Approved

---

## Overview

Add a "Vehicle Simulator" section to the Developer Console home page that lets developers mint test vehicles directly from the UI. Vehicles are minted on Polygon Amoy (testnet) using the existing frontend minting infrastructure (Turnkey + ZeroDev + `processTransactions`). The minted vehicle is granted to the developer's own app via SACD so it is immediately queryable.

---

## Layout & Location

- **Page:** Home (`/src/app/app/list/components/View/View.tsx`)
- **Position:** New `<VehicleSimulator>` component rendered below `<LicenseList>`
- **Props:** Receives `clientId` (the developer's license client address) from the existing GraphQL query already running on the page
- **UI primitives:** Uses existing `Section` + `SectionHeader` components for visual consistency

---

## UI: Inline Form

Three chained dropdowns rendered inline inside the section:

1. **Make** — 5 hardcoded options
2. **Model** — 2 options per make, resets when make changes
3. **Year** — 2022 through 2026 (always the same set)

"Create a simulated vehicle" button below the dropdowns:

- Disabled until all three fields are selected
- Shows loading state while transaction is in-flight
- Uses the existing `Button` component with its `loading` prop

---

## Hardcoded Vehicle Data

```ts
// deviceDefinitionId format: "{make}-{model}-{year}" (lowercase, hyphen-separated)
// Matches SDK example format, e.g. "mercedes-benz-s-class-2023"

const MAKES = [
  { label: 'Toyota', nodeId: 131, models: ['camry', 'rav4'], labels: ['Camry', 'RAV4'] },
  {
    label: 'Ford',
    nodeId: 41,
    models: ['f-150', 'mustang'],
    labels: ['F-150', 'Mustang'],
  },
  {
    label: 'Tesla',
    nodeId: 130,
    models: ['model-3', 'model-y'],
    labels: ['Model 3', 'Model Y'],
  },
  { label: 'BMW', nodeId: 13, models: ['3-series', 'x5'], labels: ['3 Series', 'X5'] },
  { label: 'Honda', nodeId: 48, models: ['civic', 'cr-v'], labels: ['Civic', 'CR-V'] },
];

// Example deviceDefinitionId: "toyota-camry-2022"
```

Years: `[2022, 2023, 2024, 2025, 2026]`

---

## Contract Call

**Contract:** DIMO Registry
**Address (Amoy):** `0x5eAA326fB2fc97fAcCe6A79A304876daD0F2e96c`
**Address (Polygon):** `0xFA8beC73cebB9D88FF88a2f75E7D7312f2Fd39EC`

**Function:** `mintVehicleWithDeviceDefinition`

```solidity
function mintVehicleWithDeviceDefinition(
  uint256 manufacturerNode,
  address owner,
  string deviceDefinitionId,
  AttributeInfoPair[] attrInfo,
  SacdInput sacdInput
) external nonpayable
```

**Arguments at call time:**

| Argument                | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| `manufacturerNode`      | `BigInt(selectedMake.nodeId)`                        |
| `owner`                 | Connected wallet address                             |
| `deviceDefinitionId`    | `"{make}-{model}-{year}"` e.g. `"toyota-camry-2022"` |
| `attrInfo`              | `[]` (empty for simulator)                           |
| `sacdInput.grantee`     | `clientId` (developer's license client address)      |
| `sacdInput.permissions` | All permissions bitmask                              |
| `sacdInput.expiration`  | `BigInt(0)` (no expiration)                          |
| `sacdInput.source`      | `""`                                                 |

---

## Token ID Extraction

After `processTransactions` resolves, extract the minted vehicle's `tokenId` from the transaction logs — same pattern as `useMintLicense` which reads `logs[].topics`.

---

## Minted Vehicles Display

After a successful mint, the vehicle appears in a list below the form within the same section. Each entry shows:

- **Token ID**
- **Make / Model / Year** (from the form state at mint time)

State is held in React component state (`useState`). Session-only — resets on page reload. No backend persistence needed.

---

## New Files

| File                                                        | Purpose                                                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/contracts/DimoRegistryABI.ts`                          | ABI fragment for `mintVehicleWithDeviceDefinition`                         |
| `src/hooks/useMintVehicle.ts`                               | Minting hook using `processTransactions`, mirrors `useMintLicense` pattern |
| `src/app/app/list/components/VehicleSimulator/index.tsx`    | Main simulator component (form + vehicle list)                             |
| `src/app/app/list/components/VehicleSimulator/constants.ts` | Hardcoded makes/models/years + manufacturer node IDs                       |

**Modified Files:**

| File                                        | Change                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `src/app/app/list/components/View/View.tsx` | Add `<VehicleSimulator clientId={...} />` below `<LicenseList>` |
| `src/config/default.ts`                     | Add `DIMO_REGISTRY_ADDRESS` for Amoy                            |

---

## Error Handling

- Transaction failure → `setNotification` with error message via existing `NotificationContext`
- No license found → hide the section entirely (guard on `clientId` presence)
- Loading state → button disabled + spinner, dropdowns disabled during tx

---

## Out of Scope

- Backend persistence of simulated vehicles
- Fetching live device definitions from a DIMO API
- Multi-license selector (uses first license's clientId)
- Revoking / burning simulated vehicles
