# Design: Make Card Brand Icons

**Date:** 2026-03-18
**Status:** Approved
**Scope:** `VehicleSimulator` component — make selection cards only

---

## Problem

The make selection cards in `VehicleSimulator` display monospace abbreviations (TOY, FORD, TSL, BMW, HON) above the make name. These abbreviations add visual weight without conveying meaning — the make name below them already does the job. Brand logos would be immediately recognisable and visually cleaner.

---

## Solution

Replace the abbreviation `<span>` in each make card with an inline SVG brand logo sourced from the `simple-icons` package. Logos render in monochrome via `currentColor` so the white→black colour inversion on the `.selected` state works for free.

---

## Architecture

### Dependency

Install `simple-icons` as a production dependency. It exports one object per brand with a `path` field (SVG path data for a 24×24 viewBox) and a `slug` field. No additional wrapper package is needed.

### Data layer — `constants.ts`

Add `siSlug: string` to the `VehicleMake` interface. Set the slug for each make:

| Make   | siSlug |
| ------ | ------ |
| Toyota | toyota |
| Ford   | ford   |
| Tesla  | tesla  |
| BMW    | bmw    |
| Honda  | honda  |

These slugs map directly to `simple-icons` named exports (e.g. `siToyota`).

### Component — `index.tsx`

- Remove the `MAKE_ABBRS` constant.
- Add a small co-located `MakeIcon` component:

  ```tsx
  import * as si from 'simple-icons';

  const MakeIcon: FC<{ slug: string }> = ({ slug }) => {
    const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}` as keyof typeof si;
    const icon = si[key] as { path: string } | undefined;
    if (!icon) return null;
    return (
      <svg className="vehicle-sim-make-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d={icon.path} fill="currentColor" />
      </svg>
    );
  };
  ```

- In the card JSX, replace `<span className="vehicle-sim-make-abbr">…</span>` with `<MakeIcon slug={make.siSlug} />`.

### Styles — `VehicleSimulator.css`

- Remove `.vehicle-sim-make-abbr` rule block.
- Add `.vehicle-sim-make-icon` with `width: 20px; height: 20px; display: block;`. Color is inherited via `currentColor`; the existing `.selected` rule already sets the card's text colour to black, so the icon inverts automatically.

---

## Files Changed

| File                                                                | Change                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `package.json`                                                      | Add `simple-icons` dependency                                  |
| `src/app/app/list/components/VehicleSimulator/constants.ts`         | Add `siSlug` to `VehicleMake` interface and each entry         |
| `src/app/app/list/components/VehicleSimulator/index.tsx`            | Remove `MAKE_ABBRS`, add `MakeIcon`, update card JSX           |
| `src/app/app/list/components/VehicleSimulator/VehicleSimulator.css` | Replace `.vehicle-sim-make-abbr` with `.vehicle-sim-make-icon` |

---

## What Does Not Change

- `VehicleSimulatorModal.tsx` — untouched
- Fleet card display — untouched
- Model and year pill selectors — untouched
- Mint logic, server actions, TanStack Query setup — untouched
- Existing tests — no behaviour change; snapshot update needed for the card markup

---

## Testing

- Run `npm test -- --testPathPattern=VehicleSimulator` — all tests should pass (snapshot will need updating with `npm run test:update-snap`).
- Run `npm run compile` — TypeScript should exit 0.
- Run `npm run lint` — ESLint should exit 0.
- Manual: verify each make card shows a logo, selected state inverts to black, disabled state dims correctly.
