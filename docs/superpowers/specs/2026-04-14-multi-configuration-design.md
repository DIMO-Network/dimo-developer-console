# Multi-Configuration Support for Vehicle Sharing Configurator

**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** `dimo-developer-console` (frontend) + `dimo-developer-console-api` (backend)

---

## Problem

Each user can currently store only one configuration per license (`clientId`). The `GET /api/my/configurations?clientId=...` endpoint returns a single object, and the Vehicles section entry point either creates or edits that one record. Users need to manage multiple configurations per license (e.g. different permission sets, redirect URIs, or component types for different use cases).

---

## Solution

Support one-to-many configurations per `clientId`. A new list page becomes the root of the configurator feature, with create and edit as child routes.

---

## Backend Changes (`dimo-developer-console-api`)

### 1. `GET /api/my/configurations?clientId=...`

Change response from a single `IConfiguration` object to `IConfiguration[]`. Scoped to the authenticated user.

### 2. `DELETE /api/my/configurations/:id`

New endpoint. Deletes a configuration by id. Scoped to the authenticated user (users cannot delete other users' configs).

All other endpoints (`POST /api/my/configurations`, `GET /api/my/configurations/:id`, `PUT /api/my/configurations/:id`) are unchanged.

---

## Frontend Changes (`dimo-developer-console`)

### Actions (`src/actions/configurations.ts`)

- **Rename** `getConfigurationByClientId` → `getConfigurationsByClientId`  
  Return type changes from `{ id: string }` to `{ id: string; configuration_name: string }[]`

- **Add** `deleteConfiguration({ id: string })`  
  Calls `DELETE /api/my/configurations/:id`

All other actions are unchanged.

---

### Routing

| Route                                  | Purpose                       | Change                                            |
| -------------------------------------- | ----------------------------- | ------------------------------------------------- |
| `/license/[tokenId]/configurator`      | List all configurations       | Replaces current create form                      |
| `/license/[tokenId]/configurator/new`  | Create a new configuration    | New static route; existing create view moves here |
| `/license/[tokenId]/configurator/[id]` | Edit a specific configuration | No structural change                              |

Next.js App Router resolves the static `new` segment before the dynamic `[id]` segment — no routing conflict.

---

### File Changes

**Move/consolidate shared form components:**  
The two near-duplicate component trees (`configurator/components/` and `configurator/[id]/components/`) are consolidated into one shared set at `configurator/components/`. The `[id]` variant is canonical (it has the fuller `requireAttestation`/`cloudEvent` round-trip logic). The `new` page imports from this shared location.

**New files:**

- `src/app/license/[tokenId]/configurator/new/page.tsx`
- `src/app/license/[tokenId]/configurator/new/components/View/View.tsx`

**Modified files:**

- `src/app/license/[tokenId]/configurator/page.tsx` — becomes the list page
- `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx` — simplified entry point
- `src/actions/configurations.ts` — updated actions

---

### List Page (`/configurator`)

- **Header:** "Login With DIMO Configurator" title + "New Configuration" button (links to `/configurator/new`)
- **Table columns:** Name, Component type, Actions
- **Per-row actions:**
  - Edit → navigate to `/configurator/[id]`
  - Delete → inline confirmation dialog → calls `deleteConfiguration` → refreshes list
- **Empty state:** Prompt to create the first configuration
- **Data source:** `getConfigurationsByClientId` called with the license's `clientId` from `UserConfigurationFragment`

---

### Create Page (`/configurator/new`)

- Identical form to the current create page
- On successful save: redirect to `/license/[tokenId]/configurator` (the list) instead of `/configurator/[id]`

---

### Edit Page (`/configurator/[id]`)

- No changes to logic or structure
- On successful update: stay on the edit page (existing behavior)

---

### `Vehicles.tsx` Simplification

Remove the `getConfigurationByClientId` call and `configurationId` state entirely. The "Configure Vehicle Sharing" button always navigates to `/license/[tokenId]/configurator`.

**Before:**

```tsx
// fetches configurationId, conditionally routes to edit or create
router.push(
  configurationId
    ? `/license/${tokenId}/configurator/${configurationId}`
    : `/license/${tokenId}/configurator`,
);
```

**After:**

```tsx
router.push(`/license/${fragment.tokenId}/configurator`);
```

---

## Data Flow

```
Vehicles section
  → /configurator (list)
      → /configurator/new (create) → on save → /configurator (list)
      → /configurator/[id] (edit)  → on save → stay on edit page
      → delete action              → confirm → DELETE /api/my/configurations/:id → refresh list
```

---

## What Is Not Changing

- The `ConfigurationForm`, `ShareVehiclesWithDimoConfiguration`, `LoginWithDimoConfiguration`, `ExecuteAdvanceTransactionWithDimoConfiguration`, `OutputPrint`, and `types.ts` components — only consolidated, not rewritten
- The `saveConfiguration` and `updateConfiguration` actions
- The edit page behavior
- GraphQL fragments
