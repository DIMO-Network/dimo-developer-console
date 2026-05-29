# Multi-Brand Support per Developer License

**Date:** 2026-05-22
**Status:** Approved
**Scope:** Full-stack — `dimo-developer-console` (frontend) + `dimo-developer-console-api` (backend)

## Overview

A developer license currently supports exactly one brand (name, logo, icon, primary color) surfaced to end users via the Login with DIMO SDK. This feature extends that to a collection of named brands per license, allowing a developer to serve different brand identities to different products (e.g. "Fleet App" vs "Consumer App") under the same license by passing a `brandName` parameter to the SDK. Omitting the parameter falls back to the designated default brand.

---

## Data Model

The singleton `workspace_brands` table is replaced with a `brands` collection:

```
brands
  id            UUID, PK
  workspace_id  FK → workspaces
  name          string, NOT NULL, unique per workspace  ← SDK lookup key
  logo_cid      string, nullable
  icon_cid      string, nullable
  primary_color string, nullable
  is_default    boolean, NOT NULL, default false
  created_at    timestamp
  updated_at    timestamp
```

**Constraints:**

- Unique index on `(workspace_id, lower(name))` — name comparison is case-insensitive; stored as-entered but matched case-insensitively at lookup and uniqueness check
- Partial unique index on `(workspace_id, is_default) WHERE is_default = true` — exactly one default per workspace

**Migration:** existing `workspace_brands` rows are inserted into `brands` with `is_default = true`. Workspaces with no existing brand remain brand-free.

---

## API Contract

### New collection endpoints (authenticated, workspace-scoped)

```
GET    /api/my/workspace/:workspaceId/brands                  → BrandView[]
POST   /api/my/workspace/:workspaceId/brands                  → BrandView (201)
PUT    /api/my/workspace/:workspaceId/brands/:brandId         → BrandView
DELETE /api/my/workspace/:workspaceId/brands/:brandId         → 204
POST   /api/my/workspace/:workspaceId/brands/:brandId/default → BrandView
```

### Asset upload (unchanged — reuses existing endpoint)

```
POST /api/my/workspace/:workspaceId/brand/upload → { cid, gatewayUrl }
```

Upload is brand-agnostic: it PINs a file to IPFS and returns a CID. The caller passes the CID to the brand's PUT. This avoids touching Cloudflare upload rules, which were recently fixed only for the `/brand/upload` path.

### Backward-compat shims (no change to existing callers)

```
GET  /api/my/workspace/:workspaceId/brand        → default brand (404 if none)
PUT  /api/my/workspace/:workspaceId/brand        → updates default brand
POST /api/my/workspace/:workspaceId/brand/upload → unchanged
```

### Public SDK lookup (no auth)

```
GET /public/brand?clientId=X           → default brand
GET /public/brand?clientId=X&name=Y    → brand where name matches Y (case-insensitive)
```

### BrandView shape (extended)

```ts
interface BrandView {
  id: string; // new
  name: string | null;
  logoCid: string | null;
  iconCid: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string | null;
  isDefault: boolean; // new
  updatedAt: string | null;
}
```

### Delete rules

- Non-default brand: always deletable
- Default brand with other brands present: `409 Conflict` — must designate another default first
- Last/only brand: deletable (workspace returns to no-brand state)

### Name conflict

POST/PUT returns `409 Conflict` when `name` already exists in the workspace.

---

## Frontend UI

### Brand collapsible section (license details page)

The current single-brand form is replaced with a brand list manager.

**List view (default state)**

- Each brand shown as a row: display name | Default badge | Edit button | Delete button
- Delete is disabled on the default brand when other brands exist (tooltip: "Set another brand as default before deleting this one")
- "Add Brand" button at the bottom of the list

**Edit / create state**

- Clicking Edit or Add Brand expands an inline form with the same fields as today: name, logo, icon, primaryColor
- Name field shows a non-blocking warning when edited on an existing brand: "Renaming breaks existing Login with DIMO calls using this name"
- "Set as Default" button visible on non-default brands in edit mode
- Save / Cancel buttons

**SDK hint panel (read-only, below the list)**

```
Pass the brand name to Login with DIMO:
  dimo.login({ clientId: '0x...', brandName: 'Fleet App' })
Omit brandName to use your default brand.
```

### Service / action changes

| Old                                     | New                                          |
| --------------------------------------- | -------------------------------------------- |
| `fetchMyBrand(workspaceId)`             | `fetchMyBrands(workspaceId)` → `BrandView[]` |
| `saveMyBrand(workspaceId, patch)`       | `updateMyBrand(workspaceId, brandId, patch)` |
| —                                       | `createMyBrand(workspaceId, patch)`          |
| —                                       | `deleteMyBrand(workspaceId, brandId)`        |
| —                                       | `setDefaultMyBrand(workspaceId, brandId)`    |
| `uploadMyBrandAsset(workspaceId, file)` | unchanged                                    |

---

## Error Handling & Edge Cases

| Scenario                                 | Backend                  | Frontend                                                                                            |
| ---------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| Delete default brand (others exist)      | 409 Conflict             | Delete button disabled with tooltip; if 409 hit anyway, toast: "Set another brand as default first" |
| Duplicate brand name                     | 409 Conflict on POST/PUT | Inline error on name field: "A brand with this name already exists"                                 |
| Rename existing brand                    | —                        | Non-blocking warning on name field when dirtied                                                     |
| All brands deleted                       | —                        | Empty state: "No brand set" + Add Brand prompt                                                      |
| Workspace has existing brand (migration) | Migrated as default      | Appears in list with Default badge — no action required from developer                              |
| Initial load                             | —                        | Spinner / skeleton (same as current "Loading brand…")                                               |
| Save in progress                         | —                        | Save button shows loading state; rest of list stays interactive                                     |
