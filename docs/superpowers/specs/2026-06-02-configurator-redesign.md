# Configurator Page Redesign

**Date:** 2026-06-02  
**Status:** Approved

## Goal

Redesign the Login With DIMO configurator (new + edit views) to be modern, easy to configure, theme-consistent in light and dark mode, and include a Terms of Service URL field for vehicle owner consent.

---

## Layout

**Split panel** — two columns on `lg+` screens, stacks on mobile.

```
[ Form sections — scrollable ]  |  [ Generated output — sticky ]
         ~60% width             |          ~360px fixed
```

The right panel sticks at `top: 24px` so it stays in view while the user scrolls the form.

---

## Form — Left Panel

Six section cards. Each card: `bg-card border border-border rounded-xl p-4 flex flex-col gap-3`.  
Section label: `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border`.

### Section 1 — Basics

Two-column row:

- **Configuration name** (required) — text input
- **Client ID** (read-only) — text input, dimmed

### Section 2 — Component

Pill tabs using the existing `SegmentedControl` with icons prepended to labels:

- `🔑 Login With DIMO`
- `🚗 Share Vehicles with DIMO`

No `ExecuteAdvancedTransaction` in the pill tabs — it is not surfaced in the UI (keep existing passthrough logic).

### Section 3 — Connection

- **Redirect URI** (required) — `SelectField` full width
- **Expiration Date** (required) + **UTM** — two-column row

### Section 4 — Component Settings _(conditional)_

Rendered by the existing `LoginWithDimoConfiguration` or `ShareVehiclesWithDimoConfiguration` sub-component. Card only appears when the relevant component is selected.

For **Share Vehicles**: contains Permission template/custom toggle, permission cards grid, Attestations toggle + inline tag cards, Brand selector (if >1 brand).  
For **Login With DIMO**: contains Vehicles, Vehicle Makes, Powertrain Type fields, Brand selector (if >1 brand).

### Section 5 — Terms of Service _(Share Vehicles only)_

- **ToS URL** — text input, placeholder `https://yourapp.com/terms`
- Helper text: "Displayed to vehicle owners before they grant permissions. Leave blank to skip."
- Stored as `tosUrl` in the saved configuration JSON alongside other params.

No file upload for now — URL only. Upload can be added once a backend storage endpoint exists.

### Save button

Full-width primary button at the bottom of the form column. Label: **Save** (new) / **Update** (edit).

---

## Preview — Right Panel (sticky)

Wraps the existing `OutputPrint` component in a `bg-card border border-border rounded-xl overflow-hidden` card.

Card structure:

- **Header**: "Generated Output" label + Code/URL segmented toggle (existing `SegmentedControl`)
- **Body**: `OutputPrint` syntax-highlighted code or URL pre block
- **Footer**: Copy button (full width, ghost style)
- **Help callout** below the card: brief explanation of `configurationId` usage, teal-tinted background

---

## Data / Types

Add `tosUrl?: string | null` to `SharedProps` in `types.ts`. This makes it available for both Login and Share Vehicles components (no-op for Login since Section 5 is Share Vehicles only).

Wire `tosUrl` into `buildJson` in both View files:

```ts
add('tosUrl', values.tosUrl);
```

---

## Theme Compliance

All colors use semantic Tailwind tokens only — no hardcoded hex or `gray-*` classes:

- Backgrounds: `bg-background`, `bg-card`, `bg-accent`
- Text: `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`
- Borders: `border-border`
- Accent/selection: `border-primary`, `bg-primary/10`, `ring-primary`

These map automatically to the `globals.css` HSL variables for both `:root` (light) and `.dark`.

---

## Files to Change

| File                                                                  | Change                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `types.ts`                                                            | Add `tosUrl?: string \| null` to `SharedProps`                      |
| `components/ConfigurationForm/ConfigurationForm.tsx`                  | Full layout redesign — split panel, section cards, wire OutputPrint |
| `[id]/components/ConfigurationForm/ConfigurationForm.tsx`             | Same redesign                                                       |
| `components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx` | Add ToS URL section (Section 5)                                     |
| `new/components/View/View.tsx`                                        | Add `tosUrl` to `buildJson`                                         |
| `[id]/components/View/View.tsx`                                       | Add `tosUrl` to `buildJson`                                         |
| `components/View/View.css`                                            | Update `.liwd-configurator-page` for new wrapper                    |
| `[id]/components/View/View.css`                                       | Same                                                                |

`OutputPrint` and `LoginWithDimoConfiguration` need no structural changes.

---

## Out of Scope

- File upload for ToS (requires backend storage endpoint)
- `ExecuteAdvancedTransactionWithDimo` UI changes
- Changes to the configuration list / delete flow
- Changes to OutputPrint snippet generation logic
