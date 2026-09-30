# Vehicles in the console: data health, sharing and raw data (dimo-admin port)

## Context

dimo-admin (Go + Vue, internal) has a Vehicles section. Its detail page shows data health, which apps a vehicle is shared with, and a data explorer covering telemetry queries, trip segments and Fetch API cloud events. The console's `/explorer` is much thinner: pick a license, pick a vehicle, and see available signals with their latest values as JSON.

Goal: bring the useful parts of dimo-admin's Vehicles section into the console for developers, and replace `/explorer`. It should be better than admin in these ways:

- Devices get their own place under the vehicle. In admin they are only a radio button inside the query form.
- Trip analysis is separate from the data views.
- The page follows the user's order: what data exists → how fresh the latest payload is → the raw cloud events.
- **It scales.** The owner's shared documents sit beside the devices, and the same page pattern serves other asset types later.

**Decisions made with the user:**

- **Audience:** developers, one license at a time. Each developer reads only what is shared with their own licenses, using the developer JWT the console already stores. No new secrets. dimo-admin stays for staff.
- **Placement:** a top-level **Vehicles** entry replaces "Data explorer": `/vehicles` (list) and `/vehicles/[tokenId]` (detail). `/explorer` URLs redirect.
- **Layout:** **B, source rail**, chosen from the rendered options at https://claude.ai/artifact/VWUXubrShESKQ4ZD1No39G. The rail lists subjects; the tabs on the right are scoped to the selected subject.
- **Sections:** Overview (vehicle details) with a data summary, devices broken out, Raw data (cloud events), Trips, Sharing, and the owner's Documents.
- **Left out:** anything that needs admin-only backends: owner email/profile, SIM status, manual VIN VC, VIN VC regen, earnings.
- Ignore template / device-definition work.

**Why a subject model.** The Fetch API keys everything by DID: vehicles and devices (`did:erc721:…`) and owner accounts (`did:ethr:<wallet>`, where documents are `dimo.document.driver.*` cloud events). Its `availableCloudEventTypes(did)` gives type, count, first and last seen for any DID, and `latestIndex(did)` gives freshness. Token exchange has a generic `{asset: <DID>, permissions: ["privilege:…"]}` form. So every rail item is a **subject**: a DID plus the capabilities its kind adds (telemetry for vehicles and devices, documents for accounts). A new asset type later is a new subject-graph builder, not a new page.

**Constraints:** the Fleet design system is locked (`docs/DESIGN.md`, `tailwind.config.ts`, token contrast tests); App Router only; crypto runs client-side only. PR #302 has merged to master (2026-09-29 18:47), so work starts on a fresh branch from `origin/master`.

## Design

### Subjects

```ts
type SubjectKind = 'vehicle' | 'aftermarket-device' | 'synthetic-device' | 'account';
type Subject = {
  did: string; // Fetch API subject
  kind: SubjectKind;
  label: string;
  sublabel: string; // "AutoPi" / "Aftermarket device"
  tokenId?: number; // vehicle: telemetry queries need it
  telemetrySource?: string; // device: did:ethr:<chain>:<connection> for SignalFilter
  capabilities: Set<'summary' | 'signals' | 'raw' | 'trips' | 'documents'>;
  parent?: string; // device → vehicle DID, for nesting in the rail
};
```

`buildVehicleGraph(vehicle)` returns: the vehicle (summary, signals, raw, trips), each aftermarket / synthetic device (summary, signals, raw), and the owner account (documents, raw). Telemetry `segments` / `dailyActivity` have no source filter, so Trips is vehicle-only. Signals and events do filter by source, so devices get Signals.

### Pages

**`/vehicles`** (sidebar: Workspace → Vehicles, after Licenses)

- License picker: reuse `DevLicenseSelector` and `useValidDeveloperLicenses`, auto-select with one license, synced to `?license=`.
- Search by token ID or owner `0x…`.
- Columns: **Token ID**, **Vehicle** (MMY plus the "Simulated" chip), **Sources** (neutral chips: manufacturer / connection name), **Last seen** (freshness dot and relative time, loaded lazily per row), **⋯** with Renounce access.
- Row click → `/vehicles/[tokenId]?license=<clientId>`.

**`/vehicles/[tokenId]`**. URL state: `?license=&subject=<did>|sharing&tab=`.

```
Toyota RAV4 2023  #184223                          License [Fleet Pulse ▾]
┌ Data sources ─────┐  Vehicle · All sources combined     did:erc721:…:184223
│▌ Vehicle          │  [Summary] [Signals] [Raw data] [Trips]        Refresh
│  ● 2 min ago      │
│  ├ AutoPi         │  ┌ Latest payload ┬ First seen ┬ Data points ┬ Signals ┐
│  │ ● 2 min ago    │  │ ● 2 min ago    │ Mar 4 2024 │ 1.24M       │ 38      │
│  └ Smartcar       │  └────────────────┴────────────┴─────────────┴─────────┘
│    ● 3 h ago      │  ▾ Available signals (38)                  [filter]
│ Owner             │     Speed · speed         412,880   ● 2 min ago  AutoPi
│  Documents        │     …
│  ● 2 shared       │  ▸ Events (4)
│ ───────────────   │  ▸ Latest payload   dimo.status · 2 min ago  [Browse cloud events]
│  Sharing          │  ▸ Vehicle details
└───────────────────┘
```

**Header:** definition name, token chip, owner and minted date, a license picker limited to the user's licenses that appear among the vehicle's SACD grantees (auto-picks the first when `?license=` is missing).

**Rail** (`SourceRail`): groups **Data sources** (vehicle, then devices nested with a hairline), **Owner** (Documents), then **Sharing**. Each subject shows a freshness dot (<1h live, <24h stale, older inactive, none muted) and its latest-payload time. **All rail freshness comes from one aliased Fetch `latestIndex` query** across every subject DID: metadata only, one request. The account subject shows "N shared" or "Not shared" instead. On a phone the rail becomes a `SelectWithChevron` above the tabs.

**Tabs** come from the subject's capabilities: pill tabs using the license-details recipe; every tab body is a stack of collapsible tonal section cards.

**Summary** (vehicle and devices): KPI strip: **Latest payload** (Fetch, hero card), **First seen**, **Data points**, **Signals** (telemetry `dataSummary`, filtered by `telemetrySource` for a device). Panels: **Available signals** (open; humanized name over the raw name in mono, count, first and last seen with freshness, filter and sort; the vehicle view adds a **From** column by running `dataSummary` once per device source), **Events** (`eventDataSummary`), **Data types** (Fetch `availableCloudEventTypes`: type, count, first, last — the generic "what exists" for any DID), **Latest payload** (`latestCloudEvent` header plus collapsed JSON, and **Browse cloud events** which opens Raw data on the same subject), **Vehicle / Device details**.

**Signals** (vehicle and devices): searchable checkbox picker of _this subject's_ available signals; aggregation, interval, range presets 24h / 7d / 30d or custom UTC `datetime-local`; result toggles **Chart | JSON** (recharts, lazy, new `chart-*` tokens); **Copy query** copies the exact GraphQL and variables; **Download JSON**; **Latest values** runs `signalsLatest`.

**Raw data** (every subject, on its DID): mode **Events** · **Latest** · **Index only**; filters type, data version, limit (1–100), "More filters" (id, source, producer), range, "Include data URL". Rows: time, type, data version, producer resolved to a device name; expanding a row shows header and data in `JsonBlock` with copy, and **Download payload** when the data URL is included. **Load older** pages with `before` = last row's time. The vehicle view carries a hint that these are events for the vehicle DID from every device.

**Trips** (vehicle): mechanism select, collapsible advanced config (admin defaults), range capped at 31 days, a **Daily activity** bar row and a **Trips** table (started, ended, duration, distance, top speed, "In progress" chip), with Copy query and Download JSON.

**Documents** (account subject): one card per document type from `availableCloudEventTypes` (`dimo.document.driver.*`): title, type in mono, updated date, the extracted fields from `latestCloudEvent`, **Open scan** (the presigned `dataUrl`), **View raw event**. A closing card offers **Copy sharing link**: the Login with DIMO account-document-sharing URL for this license, so the developer can ask the owner for more. Raw data on this subject lists the document events, `dimo.raw.driver.*` included.

**Sharing** (rail item, public Identity data): SACD table with **App** (`developerLicense(by:{clientId})` alias or short address), **Permissions** decoded into named chips (admin showed raw hex), **Terms** (`assets.dimo.org/ipfs`), **Granted**, **Expires**; the current license's row is marked. A second table, **Owner account grants**, lists account-level SACDs. Legacy `privileges` appear when present.

**States:** vehicle not shared with any of the user's licenses (data tabs disabled with a notice; Sharing and details still show); no developer JWT (reuse `GenerateDevJWTSection`); documents not granted (Documents shows the explanation and the sharing link); token exchange refused ("This vehicle isn't shared with {license}"); expired developer JWT (prompt to regenerate); a field refused for lack of privilege (the GraphQL error inside that panel only, e.g. "Needs the location privilege").

### Data flow

```
Browser ── Identity (Apollo, public) ── vehicle, devices, owner, SACDs, license aliases
   │
   └─ POST /api/data/fetch      { subject: <did>, query, variables }     Authorization: Bearer <devJwt>
      POST /api/data/telemetry  { subject: <vehicle did>, query, variables }
        └─ server resolves the JWT for the subject (cache key clientId:asset, until exp − 30 s):
             vehicle / device → exchange { asset: vehicleDID, permissions: <the license's SACD permissions> }
             account          → exchange { asset: accountDID, permissions: ["privilege:GetRawData"] }
           → POST telemetryApiUrl | fetchApiUrl with that JWT → upstream JSON and status passed through
```

- Device DIDs use the parent vehicle's JWT; fetch-api accepts a device DID linked to the vehicle in the token.
- A device's `telemetrySource` is resolved from its `latestIndex` `header.source`, normalized to `did:ethr:<chainId>:<address>`, falling back to `syntheticDevice.connection.address`. If unresolved, its Summary shows Fetch data only and says the signal breakdown covers the whole vehicle.
- The proxy adds no privilege: every JWT is scoped to one asset and the permissions that license holds. `middleware.ts` already requires a session on `/api/*`. The server validates the DID shape and rejects anything else.
- Fixes carried over: the SDK env comes from config (the old route hardcoded Production, which broke dev and preview); chain id and NFT address come from config; the client always sends an explicit `subject`; signal names are checked against the subject's available signals before building a selection set.

### Files

**New**

- `src/services/subjects/graph.ts` (`buildVehicleGraph`, subject types), `queries.ts` (pure GraphQL builders: dataSummary, signals, signalsLatest, availableSignals, events, segments, dailyActivity, availableCloudEventTypes, latestCloudEvent, cloudEvents, latestIndex, indexes, the aliased multi-DID latestIndex; reuse the old route's `COMPLEX_VALUE_FIELDS` idea for location signals), `client.ts` (`postSubjectQuery`).
- `src/services/subjectJwt.ts`: server-only generic exchange and cache, typed errors → 401 / 403 / 502.
- `src/app/api/data/fetch/route.ts`, `src/app/api/data/telemetry/route.ts`.
- `src/hooks/subjects/`: `useSubjectQuery`, `useSubjectGraph`, `useSubjectFreshness`, `useDataSummary`, `useDocuments`.
- `src/utils/freshness.ts`, `src/utils/sacdPermissions.ts` (use the SDK's `decodePermissions` if the package root exports it), `src/utils/humanizeSignal.ts`, `src/utils/documentSharingUrl.ts`.
- `src/app/vehicles/{page,layout}.tsx`, `src/app/vehicles/[tokenId]/page.tsx`, and in `src/app/vehicles/[tokenId]/components/`: `VehicleHeader`, `SourceRail`, `SubjectTabs`, `SummaryTab`, `SignalsTab`, `RawDataTab`, `TripsTab`, `DocumentsTab`, `SharingPanel`.
- Shared: `JsonBlock` (extracted from the configurator's `OutputPrint`, react-syntax-highlighter), `TimeRangePicker`, `QueryResultPanel`, and `CollapsiblePanel` (restyle the orphaned `CollapsibleSection` rather than adding a new one).

**Modified**

- `src/config/{default,preview,production,index}.ts`: `telemetryApiUrl`, `fetchApiUrl`, `tokenExchangeApiUrl`, `dimoChainId`.
- `src/config/navigation.ts`: Vehicles in Workspace, Data explorer out of Resources, page titles, delete the dead `getMainMenu` / `mainMenu` explorer entry.
- `next.config.*`: redirects `/explorer` → `/vehicles`, `/explorer/:tokenId` → `/vehicles/:tokenId`.
- `VehicleDetailsTable.tsx` and `constants.tsx`: row click target, optional Sources and Last seen columns, search; reused by `/vehicles` rather than a second table.
- `src/app/app/list/components/View/View.tsx`: Home shortcut "Data explorer" → "Vehicles".
- `src/app/globals.css`, `__tests__/unit/utils/tokens.test.ts`: `chart-1…6` in both themes with contrast pairs on `card`.
- `package.json`: `recharts`.
- `docs/DESIGN.md`: rail, freshness dot, raw-event row, document card and chart token recipes; explorer references removed. `README.md`.
- Harness: `scripts/visual/routes.mjs`, `fixtures.mjs`, `identity.mjs`, `shoot.mjs`; a vehicle fixture with devices, owner and SACDs; mocks for `/api/data/*` keyed by operation name.

**Deleted**

- `src/app/explorer/**`, `src/hooks/useVehicleData.ts`, `src/app/api/vehicle-signals/route.ts`, the harness `explorer*` routes and `VEHICLE_SIGNALS` fixture.
