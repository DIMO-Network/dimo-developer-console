# Developer Console Visual Refresh

**Date:** 2026-09-25
**Status:** Draft, awaiting review
**Scope:** Frontend only, `dimo-developer-console`. Branch `console-visual-refresh`, cut from `template-editor`.

## Overview

console.dimo.org gets the visual refresh fleets.dimo.co got in fleet-lite-app PR #174 (v0.34.0), so the two products read as one DIMO system: Euclid Circular A, cool blue-black surfaces, the sky→mint DIMO gradient, and generous radii, in **dark and light** themes.

The recipe is the one that worked for fleet: baseline screenshots, tokens first, shared components, one reference screen, a written `docs/DESIGN.md`, then parallel per-screen passes against it, verified in a screenshot harness.

Source of truth for every value in this spec: fleet-lite-app `docs/DESIGN.md` and `web/src/global-styles.ts`. When this spec is silent, do what fleet does.

**Non-goals:**

- No copy changes, no behavior, data-flow, API or routing changes.
- No shared token package between fleet and the console (follow-up; see Open questions). Values are kept byte-identical to fleet's so extracting them later is mechanical.
- No new features beyond the theme toggle.

## Current state (audited 2026-09-25 on `template-editor`)

- Next.js 15 App Router, Tailwind 3.4. Styling is 83 plain `.css` files (~1,900 lines) using `@apply`, plus utility classes in TSX.
- No token layer. `src/app/globals.css` is 38 lines, mostly create-next-app leftovers; `body` is `bg-black`.
- `tailwind.config.ts` defines a warm near-black `surface` (`#141012` default, `#201C1E` raised, `#0A0508` sunken), `cta`, `feedback`, `text`, `border`, and three gray ramps (`grey`, `dark-grey`, `dark`), plus a teal `primary` ramp (`#22aaa5` at 500) and `red`.
- 144 hex literals across 50 files in `src/`; 36 icon components with hardcoded `fill="#…"` (mostly `#BBBDBC` / `#BABABA`).
- Primary buttons are white slabs (`Button.css`: `bg-white text-black`), the same tell fleet had.
- Fonts: Universal Sans Display (425/525/900) and GT Super via `next/font/local` in `src/utils/font.ts`. Euclid appears only in `global-error.tsx`.
- Uppercase / tracked labels in 12 files; monospace in 14 files (template editor, explorer, webhooks CEL preview, license card, asset DIDs).
- Dark-only. The shell (`src/layouts/AuthorizedLayout`) is a sunken page with a rounded sidebar card and a free-floating content column.

## 1. Tokens and theming

### Token roles

All colors become CSS custom properties in `src/app/globals.css`, declared as space-separated RGB channels (`--canvas: 14 15 17;`) so Tailwind opacity modifiers work. Values are fleet's:

| Role                               | Variable / Tailwind name            | Dark                  | Light                   |
| ---------------------------------- | ----------------------------------- | --------------------- | ----------------------- |
| App canvas (behind sheet, sidebar) | `canvas`                            | `#0E0F11`             | `#E7E9E9`               |
| Page sheet                         | `sheet`                             | `#16181B`             | `#FFFFFF`               |
| Card                               | `card`                              | `#1C1F22`             | `#F6F7F7`               |
| Control fill, hover                | `control`                           | `#272A2E`             | `#E9EBEB`               |
| Bright surface (active segment)    | `bright`                            | `#3A3E42`             | `#FFFFFF`               |
| Highest surface (chips)            | `highest`                           | `#303438`             | `#DFE2E2`               |
| Floating panel, modal, menu        | `overlay`                           | `#1C1F22`             | `#FFFFFF`               |
| Hairline                           | `outline`                           | `#2A2E32`             | `#E1E4E4`               |
| Title ink                          | `ink`                               | `#F6F7F7`             | `#131417`               |
| Body text                          | `body`                              | `#EDEEEE`             | `#131417`               |
| Secondary text                     | `muted`                             | `#A0A3A2`             | `#5E6163`               |
| Accent fill                        | `accent`                            | `#46F1E4`             | `#22C7BA`               |
| Accent as text or icon             | `accent-ink`                        | `#46F1E4`             | `#0B7A72`               |
| Text on accent                     | `on-accent`                         | `#06201E`             | `#06201E`               |
| Selected tint                      | `accent-soft`, `accent-soft-strong` | mint 12% / 28%        | 14% / 30%               |
| Positive                           | `positive`                          | `#36DF71`             | `#1B8842`               |
| Warning                            | `warning`                           | `#FFAC60`             | `#B75B0A`               |
| Negative / error                   | `negative`                          | `#FF6060`             | `#C70000`               |
| Error container                    | `negative-soft`                     | `#402321`             | `#FFF0F0`               |
| Favorite                           | `favorite`                          | `#FFCD29`             | `#C99A00`               |
| Nav hover / active                 | `nav-hover`, `nav-active`           | `#16181B`, `#24272B`  | white 55%, `#FFFFFF`    |
| Scrim                              | `scrim`                             | `rgba(8, 9, 10, .62)` | `rgba(19, 20, 23, .32)` |

Non-color tokens:

- `--brand-gradient`: `linear-gradient(105deg, #8CD0FF 0%, #46F1E4 100%)`, both themes. Exposed as Tailwind `bg-brand-gradient`. Used on primary buttons and the logo only.
- `--shadow-float` and `--shadow-sm`, copied verbatim from fleet for each theme, exposed as Tailwind `shadow-float` / `shadow-sm`.
- Radii (Tailwind `borderRadius`): `chip` 6px, `control` 10px, `card` 16px, `panel` 20px, `full`.

Any color a component needs that is not in this table is added here (and to `docs/DESIGN.md`) rather than written as hex.

### Tailwind mapping

`tailwind.config.ts` `theme.extend.colors` maps each name to `rgb(var(--name) / <alpha-value>)`. The old names are **deleted, not aliased**: `surface`, `cta`, `border`, `text`, `feedback`, `grey`, `dark-grey`, `dark`, `red`. The `primary` ramp is removed too; its uses move to `accent` / `accent-ink`. A leftover class then fails the build (`@apply` of an unknown class is a Tailwind error), which is how the sweep is checked for completeness.

Tailwind's built-in `white` / `black` stay available but are banned for surfaces and text in components. The sweep replaces the 62 files using `text-white` / `bg-white` / `bg-black` with role tokens.

### Theme mechanism

- The theme is an attribute on `<html>`: `data-theme="dark" | "light"`. Tokens are declared under `:root[data-theme="dark"]` and `:root[data-theme="light"]`; dark is also the `:root` default.
- An inline script in the root layout `<head>` runs before paint. It reads `localStorage['dimo-theme']`, falls back to `prefers-color-scheme`, and sets the attribute, so there is no flash of the wrong theme. `<html>` gets `suppressHydrationWarning`.
- `src/context/ThemeContext.tsx` provides `theme` and `setTheme(theme)`. `setTheme` writes the attribute and localStorage. No new dependency (not `next-themes`).
- The toggle is a "Light mode" / "Dark mode" item in the account menu (`AccountInfoButton`), and also on guest pages (sign-in, sign-up) as a small icon button in the corner.
- Third-party surfaces that can't read CSS variables (Turnkey/auth iframes, Stripe elements, date picker, any canvas) get their colors from one exported constant, `THEME_COLORS` in `src/utils/theme.ts`, keyed by theme. That file mirrors the token values; it is the only place hex is allowed outside `globals.css`.

## 2. Typography

- **Typeface:** Euclid Circular A, Regular / Medium / Semibold / Bold, copied from fleet-lite-app `web/src/assets/fonts/*.woff2` into `src/assets/fonts/`. Loaded with `next/font/local` in `src/utils/font.ts` as `dimoFont` (same export name, so imports don't change). `font-feature-settings: 'tnum'` on `body`.
- Universal Sans Display and GT Super are removed (files and `localFont` entries). Any `gtSuper` usage is switched to `dimoFont`.
- **Type scale** as Tailwind `fontSize` entries:

| Tailwind           | Use                                 | Spec                      |
| ------------------ | ----------------------------------- | ------------------------- |
| `text-title`       | Page title                          | 600 20/28, -0.01em, `ink` |
| `text-card-title`  | Section / card title                | 600 15/22                 |
| `text-panel-title` | Modal / panel header                | 600 17/24                 |
| `text-metric`      | Big number (credits, vehicle count) | 600 40/44, -0.03em        |
| `text-body`        | Body                                | 400 15/22                 |
| `text-body-sm`     | Dense body, table cells             | 400 14/20                 |
| `text-label`       | Label, table header, meta           | 500 12/16, `muted`        |

- Base body text becomes `text-body-sm` in `body` colour; the current `font-light` base is dropped.
- **Sentence case everywhere.** Remove `uppercase` and `tracking-*` from all labels, buttons, nav, table headers.
- **Monospace** stays only where the content is code or a key a developer copies: API keys, client IDs, JWTs, CEL expressions, webhook payloads, template editor code views. It uses the system mono stack (`ui-monospace, SFMono-Regular, Menlo, monospace`) at 13/20. Token ids, VINs and counts use Euclid with tabular figures, not mono.

## 3. App shell

Changes to `src/layouts/AuthorizedLayout`, `src/components/Menu`, `src/components/Header`:

- **Frame:** `body` and `.main` are `bg-canvas`. The sidebar sits directly on the canvas (no card). The content column becomes an inset sheet: `bg-sheet`, 8px margin on top/right/bottom, `rounded-panel`, 1px `outline` border at 60%. The page scrolls inside the sheet.
- **Sidebar:** 244px. Top: DIMO gradient wordmark + "Developer Console" in `text-card-title` `ink` (dark); in light the wordmark renders as solid ink (fleet's rule: the gradient only survives on dark). Items: 40px tall, `rounded-control`, 14px/500 `muted` labels, icon 20px; hover `nav-hover`; active `nav-active` with `ink` label and icon in `accent-ink`. Credits widget and account button pinned to the bottom.
- **Header:** 72px, transparent, no bottom border, horizontal padding matches the sheet gutter (24px). Page title (`text-title`) left; page actions right.
- **Mobile:** `FullScreenMenu` uses `bg-canvas` with the same item styling; the menu button stays in the header.
- **Guest layout** (sign-in, sign-up, email recovery): full-bleed `canvas`, centred `sheet` card with `rounded-panel`, the wordmark above it, theme toggle top-right.
- **Assets:** `dimo-wordmark.png` and `dimo-mark.png` copied from fleet-lite-app `web/src/assets/`. The mark becomes `src/app/favicon.ico` / `icon.png` and the collapsed/mobile logo.

## 4. Shared components

Restyled before any page, in `src/components`. Each keeps its props and class API where pages depend on it; variants that only existed to be white are removed and their call sites moved.

| Component                                                                                             | Treatment                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                                                                              | `primary`: `bg-brand-gradient text-on-accent`, pill, 600 14/20, min-height 40, hover brightness 1.05. `secondary` (replaces `dark`, `primary-outline`, `white-outline`, `table-action-button`): `bg-control` + 1px `outline`, `ink` text. `ghost`: transparent, `muted` → `ink` on hover. `error` / `error-outline` / `error-simple` collapse to `destructive`: `bg-negative-soft text-negative`. Disabled: 40% opacity, no colour swap. Sentence case. |
| `Card`                                                                                                | `bg-card`, `rounded-card`, no border unless on an equal-tone surface; hover (when clickable) one step up to `control`. `primary`/`secondary` variants map to `card`/`sheet`.                                                                                                                                                                                                                                                                            |
| `Modal`, `LoadingModal`, `DeleteConfirmationModal`, all `*Modal`                                      | `scrim` + `backdrop-blur-[6px]`; panel `bg-overlay`, `rounded-panel`, `shadow-float`, 24px padding; `text-panel-title` title; footer right-aligned, primary + secondary. Destructive confirm keeps red only on the confirming button.                                                                                                                                                                                                                   |
| `TextField`, `TextArea`, `SelectField`, `SelectWithChevron`, `MoneyField`, `TokenInput`, `DatePicker` | 40px, `bg-control`, 1px `outline`, `rounded-control`, `body` text, `muted` placeholder; focus ring 3px `accent-soft` + `accent` border; error border `negative` with `TextError` in `negative`.                                                                                                                                                                                                                                                         |
| `Label`, `TextError`, `PageSubtitle`, `Title`                                                         | `text-label` / `text-title` per the scale, sentence case.                                                                                                                                                                                                                                                                                                                                                                                               |
| `Toggle`, `CheckboxField`, `MultiCardOption`                                                          | On/selected = `accent` fill with `on-accent` check; selected card = `accent-soft-strong` bg + `accent-ink` text, never a white slab.                                                                                                                                                                                                                                                                                                                    |
| `SegmentedControl`                                                                                    | Fleet's segmented pill: track `bg-control`, 3px padding, `rounded-full`; item 500 13/18, 6px 14px; active `bg-bright text-ink shadow-sm`. No underlines.                                                                                                                                                                                                                                                                                                |
| `Table`                                                                                               | Header row `text-label`, no fill; rows 52–56px, 1px `outline` dividers, hover `card`; numbers right-aligned.                                                                                                                                                                                                                                                                                                                                            |
| `Menu` (dropdown)                                                                                     | `bg-overlay`, `rounded-control`, `shadow-float`, 36px items, hover `control`.                                                                                                                                                                                                                                                                                                                                                                           |
| `Toast`, `NotificationPanel`, `OnboardingBanner`                                                      | `bg-overlay` + `shadow-float`; status by a 6px dot or icon in `positive`/`warning`/`negative`, not a coloured slab.                                                                                                                                                                                                                                                                                                                                     |
| `Loader`, `BubbleLoader`, `Loading`                                                                   | `accent`.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `CopyButton`, `CopyableRow`                                                                           | Value in mono (keys) or tabular Euclid (ids); copy icon `muted` → `accent-ink` on success.                                                                                                                                                                                                                                                                                                                                                              |
| `Anchor`                                                                                              | `accent-ink`, underline on hover only.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `CreditsWidget`, `TokenBalance`, `TotalVehicleCount`                                                  | Numbers in `text-metric` or `text-card-title` with tabular figures; label `text-label`.                                                                                                                                                                                                                                                                                                                                                                 |
| `UserAvatar`, `AccountInfoButton`                                                                     | Avatar `bg-control` with `ink` initials; menu hosts the theme toggle.                                                                                                                                                                                                                                                                                                                                                                                   |
| `Icons` (36 files)                                                                                    | Hardcoded fills become `currentColor`, so icons follow the text token. Brand logos (Google `#EA4335`, `#FBBC05` etc.) keep their fixed colours.                                                                                                                                                                                                                                                                                                         |
| `AppCard`, `LicenseCard`                                                                              | Tonal `card`, `rounded-card`, hover step; license id in tabular Euclid; status dot rule below.                                                                                                                                                                                                                                                                                                                                                          |

**Status dot:** active/online = `accent` with `0 0 8px accent-soft-strong` glow; pending/stale = `warning`; failed/off = `negative`.

## 5. Reference screen

The apps / licenses list (`/app`, `src/app/app/list`) is built fully first, including `AppCard`/`LicenseCard`, `CreditsWidget`, `OnboardingBanner`, `VehicleSimulator` and the create-app modal, in both themes. It sets the idioms (header, cards, metric, empty state, modal) every later pass copies.

After it lands, `docs/DESIGN.md` is written in the console repo: fleet's DESIGN.md adapted to Tailwind (principles, token table with Tailwind names, type scale, patterns, don'ts), with screenshots of the reference screen in both themes.

## 6. Per-screen passes

Run in parallel after the shell, shared components, reference screen and `DESIGN.md` are merged into the branch. Each pass owns a disjoint file set and must not edit `globals.css`, `tailwind.config.ts`, `src/components/*` shared primitives or `docs/DESIGN.md`. It reports any token or primitive change it needs instead.

| Pass                      | Routes                                                                                                              | Owns                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Licenses               | `/license/[tokenId]/details`, `/license/[tokenId]/configurator` (+ `/new`, `/[id]`), `/license/vehicles/[clientId]` | `src/app/license/**`, `RedirectUriForm`, `RedirectUriList`, `GenerateDevJWT*`, `AssetDIDsInput`, `VehicleTokenIdsInput`, `CSVUpload`                                                                                                                                       |
| B. Connections + webhooks | `/connections` (+ `[id]`, `create/[owner]`), `/webhooks` (+ `create`, `edit`)                                       | `src/app/connections/**`, `src/app/webhooks/**`, `src/components/Webhooks/**`                                                                                                                                                                                              |
| C. Templates              | `/templates` (+ `new`, `[id]`)                                                                                      | `src/app/templates/**`, `src/components/TemplateEditor/**`                                                                                                                                                                                                                 |
| D. Settings + billing     | `/settings`                                                                                                         | `src/app/settings/**`, `BuyCreditsModal`, `PaymentMethodSelector`, `SpendingLimitModal`, `AccountInformationModal`, `WorkspaceNameModal`, `CollapsibleSection`, `Section`, `RightPanel`                                                                                    |
| E. Guest + misc           | `/sign-in`, `/sign-up`, `/email-recovery`, `/support`, `/explorer` (+ `[tokenId]`), error / not-found pages         | `src/app/sign-in/**`, `src/app/sign-up/**`, `src/app/email-recovery/**`, `src/app/support/**`, `src/app/explorer/**`, `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/_not-found.tsx`, `SignInButton`, `DevSupportForm`, `DeveloperSupportButton`, `GuestLayout` |

Each pass: read `docs/DESIGN.md`, match the reference screen, change no copy or logic, remove every hex / old token / `uppercase` / `tracking-*` in its files, verify every owned route in the harness in both themes, and report what it could not resolve.

## 7. Verification

### Screenshot harness

`scripts/visual/` (dev-only, not shipped):

- **Mock console API** on `localhost:3001` (the dev `backendUrl`): a small Node server answering every endpoint the routes above call with realistic fixtures (a user with a workspace, 3 licenses with brands and redirect URIs, connections, webhooks, templates, credits). Server-side calls from `middleware.ts` (`getUserByToken`, `getUserSubOrganization`) hit it too, which Playwright interception alone can't cover.
- **Fake session:** a JWT in the `cookieName` cookie, signed or shaped so `decodeJwtToken` accepts it in dev.
- **Browser-side mocks:** Playwright request interception for Identity GraphQL, Turnkey and any other third party the pages call from the browser.
- **Runner:** a Playwright script that visits every route in section 6 plus `/app`, in both themes (setting `localStorage['dimo-theme']`), at 1440×900 and 390×844, writing PNGs to `scripts/visual/out/<label>/`.

The exact endpoint list and cookie mechanics are worked out in the implementation plan by reading `src/services` and `middleware.ts`.

### Baseline

Before any styling change, run the harness on the untouched branch and keep `out/before/` (dark only, because light does not exist yet). Every later step compares against it.

### Checks

For each pass and before the PR:

- Harness screenshots of every owned route, dark and light, desktop and mobile, reviewed.
- `grep` shows no hex literals outside `globals.css` and `src/utils/theme.ts` (brand-logo SVG fills excepted), no removed Tailwind names, no `uppercase` / `tracking-` in `src/`.
- `npm run compile`, `npm run lint`, `npm run lint:format`, `npm test` (snapshot changes reviewed and updated intentionally with `npm run test:update-snap`), `npm run build`.
- Contrast: body and secondary text meet WCAG AA (4.5:1) on `sheet` and `card` in both themes; `accent-ink` is used for accent text in light because mint on white fails.

## 8. Execution and ship

1. Branch `console-visual-refresh` off `template-editor`. Harness + baseline screenshots.
2. Foundation, one agent: tokens, Tailwind mapping, theme mechanism and toggle, fonts, shell, logo assets, icon `currentColor` sweep.
3. Shared components (section 4), one agent.
4. Reference screen (section 5), then `docs/DESIGN.md`.
5. Five parallel passes (section 6) on disjoint files. Each uses its own dev server port (3000 + n) so hot reloads don't collide; the mock API is shared and read-only.
6. Integration: add the tokens passes asked for, full harness run, all checks.
7. One PR into `template-editor`, or into `master` if `template-editor` has merged by then. Verified on the Vercel preview with a real login in both themes. Rollback is a Vercel instant rollback to the previous production deployment.

## Risks

- **Euclid web licence** is unconfirmed (same state as fleet). Swapping the face later is one file (`src/utils/font.ts`).
- **Branch base:** `template-editor` is 25 commits ahead of `master` and unmerged. Continued work on it will conflict with this branch in `src/components/TemplateEditor` and shared components; rebase this branch onto it before pass C.
- **Third-party UI** (Turnkey auth, Stripe, date picker) may only partially theme; `THEME_COLORS` covers what their APIs accept, and the rest is accepted as-is and noted in the PR.
- **Snapshot tests** will churn; each update is reviewed, not bulk-accepted.

## Open questions

- Should fleet and the console share one token package (e.g. an npm package or a generated CSS file) instead of two copies that can drift? Out of scope here; values are kept identical to make it easy later.
