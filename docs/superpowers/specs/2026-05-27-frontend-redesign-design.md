# Frontend Redesign — Design Spec

**Date:** 2026-05-27
**Scope:** Polish + layout tweaks — modernize visuals, improve layout, add dark/light mode

---

## Summary of Decisions

| Decision          | Choice                                                            |
| ----------------- | ----------------------------------------------------------------- |
| Visual direction  | DIMO Teal — deep teal-blacks in dark, teal-tinted whites in light |
| Sidebar           | Grouped sections (Workspace / Data), icon + text labels           |
| Sidebar collapse  | Toggle to icon-only via chevron, persisted to localStorage        |
| Component library | Bring in shadcn/ui (Radix primitives + Tailwind)                  |
| Theme toggle      | Sun/moon pill in the header, always visible                       |
| Credit balances   | Displayed in USD ($), not DCX units                               |
| Environments      | Removed — all apps are production, no environment labels          |

---

## Section 1 — Token & Theming System

### Dark mode mechanism

Class-based (`dark` on `<html>`), not `prefers-color-scheme`. Required for user-controlled toggling. Managed by `next-themes` (`ThemeProvider`), which handles SSR flicker prevention and persists the preference to `localStorage`.

### Tailwind config change

```ts
// tailwind.config.ts
darkMode: 'class';
```

All color values become CSS variable references so shadcn/ui and app components consume the same palette.

### Token set

Defined as CSS custom properties in `globals.css` under `:root` (light) and `.dark` (dark):

| Token                  | Light     | Dark      |
| ---------------------- | --------- | --------- |
| `--background`         | `#f0fafa` | `#060b0b` |
| `--card`               | `#ffffff` | `#0f1c1c` |
| `--sidebar`            | `#ffffff` | `#0a1212` |
| `--border`             | `#b2e8e4` | `#1a2e2e` |
| `--foreground`         | `#0c3535` | `#d0f0ee` |
| `--muted`              | `#7ab8b4` | `#3d6060` |
| `--muted-foreground`   | `#0e6b67` | `#6addd5` |
| `--primary`            | `#22aaa5` | `#22aaa5` |
| `--primary-foreground` | `#ffffff` | `#000000` |
| `--destructive`        | `#c01515` | `#fe6b6b` |

Existing Tailwind color aliases (`surface-sunken`, `surface-default`, `surface-raised`, `cta-default`, `feedback-success`, `feedback-error`) are remapped to reference these variables so existing classnames in the codebase keep working without a full rewrite.

---

## Section 2 — Layout Architecture

### Overall structure

Same sidebar + header + main content shell. No changes to the App Router page structure.

### Header (`src/components/Header`)

- Height: 44px
- Background: `var(--sidebar)` with a bottom border `var(--border)`
- Left: DIMO Dev logotype in `var(--primary)`
- Right (left to right): credits balance pill → theme toggle pill → user avatar
- **Credits pill:** Shows balance formatted as USD (e.g. `$12.40`). No DCX units anywhere in the UI. The conversion already exists in `CreditsWidget` via `DCX_IN_USD = 0.001` — the redesign updates the pill's visual container only, preserving the existing `getCurrentDcxBalance` + `formatToCurrency` logic. The add-credits (`+`) button remains inside the pill (owners only).
- **Theme toggle pill:** Sun (☀) / Moon (☾) segments. Active mode segment has `var(--primary)` background. One click switches theme via `next-themes` `setTheme`.
- **User avatar:** 26px circle, teal border, initials.

### Sidebar (`src/components/Menu`)

**Expanded state (168px):**

- Background: `var(--sidebar)`, right border `var(--border)`
- Nav items grouped under labeled sections:
  - **Workspace:** Home, Apps, Licenses
  - **Data:** Vehicles, Connections, Webhooks
- Section labels: 7px uppercase, `var(--muted)`, `letter-spacing: 0.12em`
- Nav items: 10px, 600 weight, `var(--muted)` default, `var(--muted-foreground)` + teal background on active
- Bottom group (separated by a border): Settings, Logout
- Collapse button: 20px circle, positioned on the right edge (right: -10px, vertically centered), shows `‹` chevron

**Collapsed state (50px):**

- Shows icons only, no labels, no section headers
- Active state: teal-tinted background on icon button
- Bottom: same Settings + Logout icons, separated by a 1px divider
- Collapse button: same circle with `›` chevron

**Collapse behavior:**

- State: `isSidebarCollapsed: boolean` in `LayoutContext`, initialized from `localStorage` key `sidebar-collapsed`
- Sidebar animates width with a CSS transition (`transition: width 200ms ease`)
- Label text fades out with `opacity: 0` + `overflow: hidden` when collapsing
- Mobile: existing full-screen menu behavior unchanged

### Page content area

- `padding: 16px` (up from current inconsistent `py-6 pr-6`)
- Max width: unrestricted (fills available space)
- Scrollable independently of sidebar

---

## Section 3 — Component Migration

### New packages

```
npm install next-themes
npx shadcn@latest init
```

shadcn init config: style `default`, base color `neutral`, CSS variables `yes`, Tailwind config path `tailwind.config.ts`.

### Replace with shadcn primitives

| Existing component            | shadcn replacement     | Notes                                                                                                                                                 |
| ----------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                      | `Button`               | Map existing variants (`dark`, `primary`, `primary-outline`, etc.) to CVA variant config                                                              |
| `Modal`                       | `Dialog`               | Drop-in; replace `isOpen`/`onClose` props with Radix controlled state                                                                                 |
| `TextField`                   | `Input`                | Wrap with `Label` from shadcn                                                                                                                         |
| `TextArea`                    | `Textarea`             |                                                                                                                                                       |
| `SelectField`                 | `Select`               |                                                                                                                                                       |
| `Toggle`                      | `Switch`               |                                                                                                                                                       |
| `CheckboxField`               | `Checkbox`             |                                                                                                                                                       |
| `Table`                       | `Table`                | Keep TanStack Table logic; replace markup with shadcn Table primitives                                                                                |
| `DatePicker`                  | `Popover` + `Calendar` |                                                                                                                                                       |
| `Toast` / `NotificationPanel` | `Sonner`               | Replace custom notification state with Sonner's `toast()` API; remove `withNotifications` HOC and replace with a single `<Toaster />` in `RootLayout` |

### Keep custom, update with tokens

| Component                     | Action                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `Menu` / `MenuItem` / sidebar | Rewrite with new collapse behavior; replace hardcoded colors with token classes        |
| `Header`                      | Rewrite with new layout (credits pill, theme pill, avatar)                             |
| `AppCard`                     | Remove `scope`/environment display; update colors to tokens                            |
| `LicenseCard`                 | Update colors to tokens                                                                |
| `CreditsWidget`               | Update visual container to teal pill shape; preserve existing DCX→USD conversion logic |
| `BubbleLoader`, `Loader`      | Update colors to tokens only                                                           |
| `Section`, `Card` wrappers    | Replace `bg-surface-*` with `bg-card`, `bg-background` etc.                            |
| `OnboardingBanner`            | Update colors to tokens                                                                |

### Removed

- `scope` field display and `ENVIRONMENTS_LABELS` mapping from `AppCard` — no environment distinction in the UI
- `IApp.scope` field usage in UI components (keep the type if the API still returns it, just stop rendering it)

---

## Implementation Order (Foundation-first)

1. **Token layer** — `globals.css` CSS variables, `tailwind.config.ts` `darkMode: 'class'`, remap old color aliases
2. **ThemeProvider** — install `next-themes`, wrap `RootLayout`, add theme toggle to `Header`
3. **Layout** — rewrite `Menu` with collapse, rewrite `Header`, add `isSidebarCollapsed` to `LayoutContext`
4. **shadcn init** — run init, establish base component config
5. **Primitive migration** — replace components one by one per the table above
6. **Token cleanup** — remove old `surface-*`, `cta-*` hardcoded color classes from the codebase
