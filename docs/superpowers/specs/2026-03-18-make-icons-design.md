# Design: Make Card Brand Icons

**Date:** 2026-03-18
**Status:** Approved
**Scope:** `VehicleSimulator` component — make selection cards only

---

## Problem

The make selection cards in `VehicleSimulator` display monospace abbreviations (TOY, FORD, TSL, BMW, HON) above the make name. These abbreviations add visual weight without conveying meaning — the make name below them already does the job. Brand logos would be immediately recognisable and visually cleaner.

---

## Solution

Replace the abbreviation `<span>` in each make card with an inline SVG brand logo sourced from the `simple-icons` package. Logos render in monochrome via explicit CSS colour rules so the white→black inversion on `.selected` works correctly.

---

## Architecture

### Dependency

Install `simple-icons` as a production dependency. It exports one named object per brand with a `path` field (SVG path data for a 24×24 viewBox).

### Data layer — `constants.ts`

Add `siPath: string` to the `VehicleMake` interface. Populate it using **named imports** from `simple-icons` — one import per make — and store only `icon.path`. This approach is fully tree-shakeable (no namespace import) and eliminates any runtime lookup failure since the path is a required typed field.

```ts
import { siToyota, siFord, siTesla, siBmw, siHonda } from 'simple-icons';

export interface VehicleMake {
  label: string;
  slug: string;
  nodeId: number;
  siPath: string;
  models: { label: string; slug: string }[];
}
```

Each make entry sets `siPath` from the imported icon:

| Make   | Import   | siPath value  |
| ------ | -------- | ------------- |
| Toyota | siToyota | siToyota.path |
| Ford   | siFord   | siFord.path   |
| Tesla  | siTesla  | siTesla.path  |
| BMW    | siBmw    | siBmw.path    |
| Honda  | siHonda  | siHonda.path  |

Because `siPath` is a required field on the interface, TypeScript enforces it at compile time — no runtime `null` fallback is needed.

### Component — `index.tsx`

- Remove the `MAKE_ABBRS` constant.
- Add a small co-located `MakeIcon` component that accepts the pre-resolved SVG path:

  ```tsx
  const MakeIcon: FC<{ path: string }> = ({ path }) => (
    <svg className="vehicle-sim-make-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="currentColor" />
    </svg>
  );
  ```

- In the card JSX, replace `<span className="vehicle-sim-make-abbr">…</span>` with `<MakeIcon path={make.siPath} />`.

### Styles — `VehicleSimulator.css`

Remove the entire `.vehicle-sim-make-abbr` rule block, **including** the nested `.vehicle-sim-make-abbr` sub-rule inside `.selected` (which becomes dead CSS once the element is gone).

Add `.vehicle-sim-make-icon`:

```css
.vehicle-sim-make-icon {
  @apply w-5 h-5 block text-text-secondary;
}
```

Inside the existing `.selected` block, add a rule to invert the icon to black:

```css
&.selected {
  /* existing rules … */

  .vehicle-sim-make-icon {
    @apply text-black;
  }
}
```

Using explicit `text-text-secondary` / `text-black` rather than relying on `currentColor` inheritance from the button ensures the icon colour is unambiguous in both states.

---

## Files Changed

| File                                                                | Change                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                                                      | Add `simple-icons` dependency                                                                                            |
| `src/app/app/list/components/VehicleSimulator/constants.ts`         | Named imports of 5 icons; add `siPath: string` to `VehicleMake`; populate each entry                                     |
| `src/app/app/list/components/VehicleSimulator/index.tsx`            | Remove `MAKE_ABBRS`; add `MakeIcon`; update card JSX                                                                     |
| `src/app/app/list/components/VehicleSimulator/VehicleSimulator.css` | Remove `.vehicle-sim-make-abbr` (including dead sub-rule in `.selected`); add `.vehicle-sim-make-icon` with colour rules |

---

## What Does Not Change

- `VehicleSimulatorModal.tsx` — untouched
- Fleet card display — untouched
- Model and year pill selectors — untouched
- Mint logic, server actions, TanStack Query setup — untouched

---

## Testing

- Run `npm run test:update-snap` — snapshot for the make card markup will update; verify the diff shows the icon SVG replacing the abbr span.
- Run `npm test -- --testPathPattern=VehicleSimulator` — all tests should pass.
- Run `npm run compile` — TypeScript should exit 0.
- Run `npm run lint` — ESLint should exit 0.
- Manual: verify each make card shows a logo; selected state inverts to black; disabled state dims correctly.
