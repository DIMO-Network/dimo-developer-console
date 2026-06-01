# License Details Page Redesign

**Date:** 2026-05-29  
**Scope:** `src/app/license/[tokenId]/details/`

## Problem

The current page has several UX problems:

- Instrument cluster with gauge rings is a forced metaphor — looks gimmicky in a developer console
- The cluster is hardcoded dark (`.dark` class) breaking light mode theming
- License identity (name, client ID) is buried in the center cluster column
- All 4 collapsible panels start closed — blank page on first load
- Vehicles and Usage sections lack a natural home together with their related actions

## Design

### Layout

A persistent header + 4-tab layout replacing the current cluster + panel stack.

```
┌─────────────────────────────────────────────────────┐
│  My Fleet App  #42                    [✎ Rename]    │
│  0x3f2a8b9c...d1e2f3c8d1  [⎘ Copy]                 │
├──────────┬──────────┬──────────┬───────────────────┤
│ Overview │  Config  │ Vehicles │  Brand            │
├──────────┴──────────┴──────────┴───────────────────┤
│  [tab content]                                      │
└─────────────────────────────────────────────────────┘
```

### Persistent Header

Always visible regardless of active tab. Contains:

- License alias (editable via existing `WorkspaceNameModal`)
- Token ID badge (`#42`)
- Full client ID with copy button
- Rename button (owner only)

### Overview Tab

- Two stat cards side-by-side: **Credits Used** and **Vehicles Connected**
  - Credits card links to DIMO credits docs
  - Vehicles card links to `/license/vehicles/[clientId]`
- Quick actions row (4 buttons):
  - **Generate API Key** → switches to Config tab (user generates from there)
  - **Generate JWT** → switches to Config tab (user generates from there)
  - **Setup Vehicle Sharing** → navigates to `/license/[tokenId]/configurator`
  - **Docs** → opens `https://docs.dimo.org` in new tab

### Config Tab

Three sections rendered flat (no collapsing — the tab provides the navigation layer):

1. **API Keys** — table of signers with address + enabled date + delete action. Header buttons: "Register RentalOS", "+ Generate Key". Existing `Signers` component logic unchanged.
2. **Developer JWTs** — table of JWTs with masked token + expiry + copy + delete. Header button: "+ Generate JWT". Existing `DeveloperJwts` component logic unchanged.
3. **Redirect URIs** — list of URIs with delete action + inline add input at the bottom. Existing `RedirectUris` component logic unchanged.

### Vehicles Tab

- Large centered count: **N Connected Vehicles** (link to vehicle list)
- Three action buttons in a row:
  - **Vehicle List** → `/license/vehicles/[clientId]`
  - **Simulator** → opens existing `VehicleSimulatorModal`
  - **Configure Sharing** → `/license/[tokenId]/configurator`

### Brand Tab

- List of brand rows (logo + name + default indicator + Edit/Delete per row)
- "+ Add Brand" button (owner only)
- Existing `Brand` component logic unchanged

## Component Changes

### `View.tsx` + `View.css` (full rewrite)

- Remove `dashboard-cluster`, `cluster-grid`, `cluster-cell`, gauge classes
- Add tab state (`useState<'overview' | 'config' | 'vehicles' | 'brand'>`)
- Render persistent header with license identity
- Render tab bar + conditional tab content
- The 6 data sections (Summary, Usage, Vehicles, Signers, RedirectUris, DeveloperJwts, Brand) are rearranged across tabs but their internal logic is untouched

### `Usage.tsx`

- Remove `cluster` prop and gauge-ring render path — only the stat card render path is used
- Renders a single stat card (credits count + link) for the Overview tab

### `Vehicles.tsx`

- Remove `cluster` prop and gauge-ring render path
- Renders the count stat + 3 action buttons for the Vehicles tab

### `Summary.tsx`

- Inline the alias + token ID + client ID rendering directly into `View.tsx`'s header section — the component becomes unused and can be deleted
- `WorkspaceNameModal` is instantiated directly in `View.tsx`

### `CollapsibleSection` usage

- API Keys, Developer JWTs, Redirect URIs, Brand: remove `CollapsibleSection` wrapper
- Replace with a simple two-part structure: a `<div>` header row (title on the left, action buttons on the right, no toggle) + a `<div>` content area below it, separated by a border. The tab itself provides the navigation layer so there is no need to collapse.
- `CollapsibleSection` component itself is not deleted — it is still used elsewhere in the app

## What Is Not Changing

- All existing data fetching (GraphQL queries, fragments) — unchanged
- Signer generation, deletion, RentalOS flow — unchanged
- JWT generation, deletion — unchanged
- Redirect URI add/remove — unchanged
- Brand create/edit/delete/set-default — unchanged
- `WorkspaceNameModal` for renaming — unchanged
- `CollapsibleSection` component itself — no changes needed

## Files To Create/Modify

| File                                       | Change                             |
| ------------------------------------------ | ---------------------------------- |
| `details/components/View/View.tsx`         | Full rewrite                       |
| `details/components/View/View.css`         | Full rewrite                       |
| `details/components/Usage/Usage.tsx`       | Remove `cluster` prop + gauge path |
| `details/components/Usage/Usage.css`       | Remove gauge classes               |
| `details/components/Vehicles/Vehicles.tsx` | Remove `cluster` prop + gauge path |
| `details/components/Vehicles/Vehicles.css` | Remove gauge classes               |
| `details/components/Summary/`              | Delete (inlined into View header)  |

## Out of Scope

- Routing changes (tabs are client-side state, not URL segments)
- Mobile-specific tab behavior (scrollable tab bar is sufficient)
- Animated tab transitions
