# Renounce Vehicle Permissions

**Date:** 2026-05-20  
**Scope:** Vehicle list at `/license/vehicles/[clientId]`  
**Status:** Approved

## Summary

Adds a per-vehicle "Renounce access" action to the vehicle list table. A developer can renounce their developer license's permissions to any vehicle in the list — simulated or production — by selecting it from a per-row kebab menu and confirming in a modal. The on-chain operation calls `setPermissions` on the SACD contract with `permissions=0` and `expiration=0`, zeroing out the grantee's access.

## Context

The vehicle table at `/license/vehicles/[clientId]` shows all vehicles where the developer license (`clientId`) is a privileged address (`filterBy: { privileged: $clientId }`). This includes testnet vehicles the developer minted themselves (where they are the grantor) and production vehicles shared by real users (where they are the grantee). The equivalent feature exists in dimo-driver (`RenouncePermissionsTray`) for vehicle owners; this is the developer-side counterpart.

## Architecture

### Files created

| File                                                                                           | Purpose                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/hooks/useRenounceVehiclePermissions.ts`                                                   | On-chain hook. Wraps `processTransactions` → SACD `setPermissions`. Returns `{ renounce, isLoading }`. |
| `src/app/license/vehicles/[clientId]/components/RenounceVehicleModal/RenounceVehicleModal.tsx` | Confirmation modal. Shows vehicle MMY + tokenId, consequence copy, Cancel / Renounce buttons.          |
| `src/app/license/vehicles/[clientId]/components/RenounceVehicleModal/index.ts`                 | Barrel export.                                                                                         |

### Files modified

| File                                          | Change                                                                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VehicleDetailsTable/constants.tsx`           | `buildColumns` receives a new `onRenounce: (tokenId: number) => void` param and adds a `display` column rendering the `⋯` kebab. `stopPropagation` prevents row navigation from firing. |
| `VehicleDetailsTable/VehicleDetailsTable.tsx` | Adds `renouncingVehicle` state (the full node being confirmed), mounts `RenounceVehicleModal`, handles post-confirm flow.                                                               |

## Data Flow

```
User clicks ⋯ on a row
  → "Renounce access" in dropdown
  → onRenounce(tokenId) callback
  → setRenouncingVehicle(node) in VehicleDetailsTable

RenounceVehicleModal renders
  → shows: vehicle MMY, token ID, consequence copy
  → user clicks "Renounce access"
  → useRenounceVehiclePermissions.renounce(tokenId) called

useRenounceVehiclePermissions
  → processTransactions([{
       to: DIMO_SACD_ADDRESS,
       data: setPermissions(VEHICLE_NFT_ADDRESS, tokenId, currentUser.smartContractAddress, 0n, 0n, '')
     }])

On success
  → Optimistic Apollo cache update: filter out tokenId from vehicles.nodes
  → refetch() fired in background
  → setNotification("Access renounced", "Success", "success")
  → modal closes, renouncingVehicle reset to null

On error
  → inline error in modal
  → setNotification("Failed to renounce access", "Error", "error")
  → Sentry.captureException(error)
  → modal stays open
```

## Component Design

### `useRenounceVehiclePermissions`

```ts
const { renounce, isLoading } = useRenounceVehiclePermissions();
await renounce(tokenId); // throws on failure
```

Calls `processTransactions` with a single SACD `setPermissions` call:

- `asset` = `configuration.VEHICLE_NFT_ADDRESS`
- `tokenId` = the vehicle's tokenId as `bigint`
- `grantee` = `currentUser.smartContractAddress`
- `permissions` = `0n`
- `expiration` = `0n`
- `source` = `''`

Mirrors `useBurnVehicle` in structure. Uses `useContractGA` and `useGlobalAccount`.

> **Implementation note:** For production vehicles (where the developer is the grantee, not the grantor), the SACD contract must support grantee self-revocation via `setPermissions`. Confirm against the contract before implementation. If unsupported, a dedicated `renounce` function or alternative mechanism will be needed.

### `RenounceVehicleModal`

Props:

```ts
interface Props {
  vehicle: {
    tokenId: number;
    definition?: { make?: string; model?: string; year?: number };
  } | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}
```

Uses the existing `Modal` component (`src/components/Modal`) with headlessui `Dialog` under the hood — same pattern as `DeleteConfirmationModal`. Renders when `vehicle !== null`. Shows:

- Warning icon
- `"Renounce vehicle access?"` heading
- Vehicle name (MMY or `"Token #<tokenId>"` if no definition) + token ID
- Consequence copy: `"You will lose all data access to this vehicle. The vehicle owner would need to re-grant access."`
- Cancel button + Renounce button (with `loading` spinner during `onConfirm`)
- Inline error message below vehicle detail on failure

### `buildColumns` changes

New `display` column appended to the right of the existing columns:

```ts
columnHelper.display({
  id: 'actions',
  header: '',
  cell: (info) => (
    <KebabMenu>
      <KebabMenu.Item
        label="Renounce access"
        destructive
        onClick={(e) => {
          e.stopPropagation();
          onRenounce(info.row.original.tokenId);
        }}
      />
    </KebabMenu>
  ),
})
```

No `KebabMenu` component exists in the codebase. Implement an inline `⋯` button with a Tailwind-positioned dropdown div directly in the cell renderer. `stopPropagation` on both the button click and dropdown item click is required since the table's `onRowClick` fires on any row click. Use local `useState` for open/closed state within the cell.

### `VehicleDetailsTable` state additions

```ts
const [renouncingVehicle, setRenouncingVehicle] = useState<VehicleNode | null>(null);
```

The full vehicle node is stored (not just tokenId) so the modal can show vehicle name without a second query.

## Error Handling

| Scenario                        | Behavior                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| Transaction rejected / reverted | Inline error in modal; modal stays open; error toast; Sentry capture |
| No active session / wallet      | Hook throws before submitting; same error path                       |
| Modal closed mid-flight         | Cancel is disabled during `isLoading`; no abort needed               |

## Post-Success UX

1. Optimistic cache removal — Apollo `updateQuery` filters the tokenId out of `vehicles.nodes` and decrements `totalCount`. The vehicle disappears from the list immediately.
2. Background `refetch()` — fires after the optimistic update so the cache converges once the identity-api indexer catches up.
3. Success toast via `NotificationContext`.

## Testing

- Unit: `useRenounceVehiclePermissions` — mock `processTransactions`, assert correct SACD call args (address, tokenId, grantee, 0n, 0n, '').
- Unit: `RenounceVehicleModal` — renders vehicle name; Renounce button triggers `onConfirm`; Cancel triggers `onClose`; error message shown on rejection.
- Integration: `VehicleDetailsTable` with mocked hook — `⋯` click opens modal; confirm removes row; error leaves row intact.
- No snapshot updates required unless existing snapshots cover the table.
