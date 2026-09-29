# Port the Fleet visual refresh onto current master

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the DIMO Fleet design language (built on branch `template-editor`, PR #301) on top of current `master`, keeping every master feature and layout, with the template editor merged but switched off.

**Why a port:** `template-editor` branched from master on 2026-05-23. Master then shipped its own teal shadcn redesign (#281, 2026-06-01) and ~40 feature commits. Merging the refresh directly conflicts in 127 files. This plan rebuilds the refresh on master's current structure instead.

**Branch:** `console-fleet-port`, from `origin/master` (fc4e1589), with the pre-refresh template editor merged (`1a0eca6c`). PR target: `master`.

**References (read-only git refs):**

- `REFRESH` = `8330a30a`, the finished Fleet refresh on the old base. Read files with `git show 8330a30a:<path>`. This is the styling reference for every file.
- `GATE` = `template-editor-gate` (5e1ff3f9), the template-editor gate commit written for the old base.
- `MASTER` = `origin/master` (fc4e1589).
- `BASE` = `da1df4fc`, the common ancestor.
- Fleet spec: `git -C ~/workspace/fleet-lite-app show origin/main:docs/DESIGN.md`. The console's design doc as built: `git show 8330a30a:docs/DESIGN.md`.

## Rulings (binding for every task)

1. **Theme mechanism: keep `next-themes`.** Switch it to `attribute="data-theme"`, keep `defaultTheme="dark"` and `enableSystem={false}`, and leave the storage key at its default so users keep their saved choice.
   - The Fleet tokens live under `:root` / `:root[data-theme="dark"]` and `:root[data-theme="light"]`, as in REFRESH `globals.css`.
   - Drop `darkMode: ['class']` and the two `dark:` utilities in `Menu.tsx`.
   - Do not port REFRESH's custom `ThemeContext` / `THEME_INIT_SCRIPT`, because next-themes already handles pre-paint.
   - `global-error.tsx` has no provider. On mount it reads `localStorage['theme']` and sets `document.documentElement.dataset.theme`, defaulting to dark.
2. **Tokens: Fleet names and values are canonical** (REFRESH `globals.css` + `tailwind.config.ts` + `tokens.test.ts`, final state).
   - Master's shadcn names are kept only as aliases whose meaning matches Fleet:
     - `background` → sheet, `foreground` → fg
     - `card` {DEFAULT card, foreground fg}, `popover` {overlay, fg}
     - `sidebar` → canvas, `border` → outline, `input` → control-border, `ring` → focus-ring
     - `destructive` {negative, foreground: fg}, `muted-foreground` → muted
   - `accent` means Fleet mint (live status only) and `muted` means Fleet secondary text.
   - Master's conflicting or legacy names are **temporary aliases** onto the nearest Fleet token so every commit builds: `primary` (+ its hex scale), `secondary`, `accent-foreground`, `bg-muted`, `surface`, `cta`, `feedback`, `text`, `grey`, `dark-grey`, `dark`, `red`. Pages migrate off them, and the final task deletes them and locks `theme.colors`.
   - All colors are RGB channels (`rgb(var(--x) / <alpha-value>)`) so opacity modifiers keep working. HSL triplets go away.
3. **Components: keep master's Radix/shadcn internals** and restyle them to Fleet recipes. That covers Modal (Dialog), TextField/TextArea (Input/Textarea), Toggle (Switch), CheckboxField (Checkbox) and Sonner.
   - `Button` takes REFRESH's API (`variant` = primary | secondary | ghost | destructive | destructive-ghost | brand; `size` = md | icon). All call sites migrate, including master-only ones.
   - The literal `dark` class stops being used anywhere: no Button "dark" variant, no forced-dark guest wrapper, no `.card .dark`.
4. **Master's functional layouts stay:**
   - collapsible sidebar (localStorage `sidebar-collapsed`) and Workspace/Resources nav sections
   - Home shortcut grid and the `/licenses` route
   - license-details tabs
   - configurator split panel with sticky live preview and the ToS / Privacy URL fields
   - hand-written breadcrumbs (restyled in place) and the renounce-vehicle modal
   - Only styling changes. Master bugs such as the stale `getPageTitle` regexes are reported, not fixed.
5. **No behavior changes** beyond the approved list: the template-editor gate (task 1), plus REFRESH's sanctioned changes where they apply to master's code:
   - BackButton becomes a real `<button aria-label="Back">`.
   - Global-error shows "500" / "Something went wrong" and links home to `/`.
   - ARIA state on selectable cards.
   - Icons use `currentColor`.
   - Casing-only text edits.
   - Master's toast system (Sonner) is kept and themed. REFRESH's Toast/NotificationPanel work does not port.
6. **Header theme pill** (`src/components/Header/ThemeToggle.tsx`) is replaced by the Fleet sidebar "Light mode / Dark mode" item, plus the icon toggle on guest pages. There is one toggle mechanism: next-themes `setTheme`.
7. **Logo:** Fleet wordmark SVG + `BrandLockup` ("Developer Console"). The collapsed sidebar shows the red D mark. Master's `dimo-dev.svg` / `dimo-dev-light.svg` usages go away.
8. **Orphaned components on master** (no importer outside tests: OnboardingBanner, CollapsibleSection, AppCard, MultiCardOption, PaymentMethodSelector, TotalVehicleCount, VehicleTokenIdsInput, SpendingLimitModal, ui/label, ui/table) are not restyled; they are listed in the PR.
9. **File sourcing rule:** for a file master has not changed since BASE (`git diff --quiet da1df4fc origin/master -- <path>`), the REFRESH version may be taken wholesale (`git checkout 8330a30a -- <path>`), then adapted to master APIs (Sonner `toast` instead of `useNotification`, next-themes, etc.). A file master changed is restyled in place: master's structure and logic, REFRESH's treatment.
10. **Checks every task:**
    - `npm run compile && npm run lint`, reverting unrelated `src/gql/graphql.ts` drift.
    - Jest shows no failing suite beyond the base baseline recorded in task 1.
    - `npm run visual:check -- <owned paths>` once task 2 exists.
    - Harness shots of the owned routes in both themes and both viewports.
    - `next build` runs only in tasks 1 and 12, with the harness stopped.
    - Commits have no attribution trailer, and the pre-commit hook always runs.

## Tasks

### Task 1: Base: template-editor gate on master's nav + baseline

- Add a Templates item to `getNavSections()` Workspace (after Webhooks, `CarRentalIcon`, `/templates`), `disabled: !TEMPLATE_EDITOR_ENABLED`.
- Port GATE's `src/utils/featureFlags.ts`, `src/app/templates/layout.tsx` + `TemplatesUnavailable.tsx`, the `/api/templates` 404 guards, the README variable, and the tests (`templatesGate`, `templatesApiGate`, flag-on mocks in the two route tests). Adapt the nav test to `getNavSections`.
- Confirm the disabled Templates item renders greyed and non-clickable with master's MenuItem.
- Record the Jest failing-suite baseline for this base (`scripts/visual/out/base/jest-fail.txt` once the harness exists; until then `docs`-free scratch).
- Run typecheck, lint and `npm run build`.

### Task 2: Harness on master + "before" shots

- Port `scripts/visual/` from REFRESH (keys, fixtures, identity, mock-server, routes, shoot, check-tokens, README, dev.sh, harness.env incl. `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED=true`), plus `package.json` scripts and the playwright devDependency.
- Adapt to master:
  - theme selection via localStorage `theme` (next-themes)
  - the `/licenses` route
  - license-details tab states (clicks)
  - configurator new/edit split panel
  - the renounce modal
  - any new endpoint master calls on load (read `src/services`, `src/actions`)
- Re-evaluate the `knownHydrationError` flags on master.
- Update `check-tokens.sh` for this plan: legacy names flagged, shadcn alias names from ruling 2 allowed.
- Shoot `--label=before` in dark and light (master has both).

### Task 3: Foundation: tokens, config, theme, fonts, icons, logo

- **Tokens and config:** REFRESH `globals.css` tokens (final Fleet values incl. btn-primary, selected-bg/-fg, control-border, focus-ring, canvas-divider, progress-fill). `tailwind.config.ts` per ruling 2 (Fleet names + matching shadcn aliases + temporary legacy aliases; type scale, radii, shadows, fonts).
- **Theme:** next-themes switched to `data-theme` (ruling 1). Sonner reads the theme via next-themes.
- **Tests:** `tokens.test.ts` ported (parity + contrast).
- **Font:** Euclid (`src/utils/font.ts` with `--font-dimo` on body; drop Universal Sans / GT Super).
- **Icons:** `currentColor` (REFRESH icons; GoogleIcon excepted), including master's changed Chip/Connections/DeveloperBoard icons.
- **Logo:** Fleet wordmark SVG + red D mark + favicon.

### Task 4: Shell

- **Sidebar:** Fleet look on master's structure: BrandLockup, collapsed mark, 40px items, `nav-active` pill with ink icon, and section labels as `text-label text-muted`.
- **Collapse button:** keep the collapse toggle, restyled, and visible without hover.
- **Theme toggle:** the Light mode / Dark mode item goes in the bottom section.
- **Frame:** inset sheet frame (canvas + rounded sheet) with the header and mobile full-screen menu restyled.
- **Header:** remove the header ThemeToggle pill.
- **Guest layout:** no forced dark, centered panel, and a top-right icon toggle.

### Task 5: Primitives A

- `Button` API + migrate every call site (incl. master-only: licenses, configurator, renounce, breadcrumbs actions); remove the `dark` / `with-icon` / legacy classes.
- `Card`: tonal card.
- `Modal`: Radix Dialog with Fleet scrim / panel / close; Escape and focus stay Radix's.
- `ui/dialog` animation classes: make them work (`tw-animate-css` or remove).
- `Sonner` theming: overlay surface, fg text, status icons in status colors, `role`s left to Sonner.
- `ui/button`: if no longer used, leave it unused (don't delete shadcn primitives).

### Task 6: Primitives B

- **Form controls:** TextField, TextArea, SelectField, SelectWithChevron, MoneyField, TokenInput, DatePicker, Checkbox, Toggle (Switch), SegmentedControl, Label, TextError.
- **Table** with per-column `className` (REFRESH API).
- **Text:** Title (size via className, default `text-title`), PageSubtitle, Anchor.
- **Copy and status:** CopyButton / CopyableRow (icon size self-contained), StatusChip (port from REFRESH).
- **Header widgets:** CreditsWidget (master's USD pill, Fleet look), DeveloperSupportButton, UserAvatar / AccountInfoButton.
- **Loaders:** BubbleLoader / Loader.

### Task 7: Reference screens: Home shortcuts + /licenses

- Fleet treatment of master's Home shortcut grid, the /licenses list, LicenseCard and Create license.
- Update `docs/DESIGN.md` from REFRESH's, adding master's patterns: sidebar sections and collapse, tabs, split panel with sticky preview, breadcrumbs, the shortcut grid, Sonner toasts.
- Reference screenshots.

### Task 8: Pass: license details (tabs), licensed vehicles (+ renounce modal), configurator (list, new, edit split panel)

### Task 9: Pass: connections + webhooks

- Remove all hex from `Webhooks.css` and make webhooks readable in light.

### Task 10: Pass: templates (REFRESH versions, gated) + settings + billing/account modals

### Task 11: Pass: sign-in, sign-up, email recovery, support, explorer, error pages (REFRESH global-error / error changes)

### Task 12: Lock and integrate

- Delete the temporary aliases and set `theme.colors` to the Fleet tokens + matching shadcn aliases + transparent/current/inherit.
- Run check-tokens and a repo-wide grep for leftover hex and legacy classes.
- Run the full checks, build, and `--label=final` shots.
- Compare against `before` in both themes.

### Task 13: Whole-branch review → fixes → PR to `master`

- PR description lists the approved behavior changes, master features preserved, orphans not restyled, and follow-ups.
- #289 and #301 are superseded; note it in the PR.
