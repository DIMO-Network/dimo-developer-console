# DIMO Developer Console — visual design system

The console shares its visual language with DIMO Fleet and the DIMO Driver app:
Euclid Circular A, cool blue-black surfaces, solid ink actions, the sky→mint
DIMO gradient for brand moments, and generous radii, in dark and light. Tokens
live in `src/app/globals.css` and are exposed as Tailwind classes by
`tailwind.config.ts`; this doc is how to use them. Every class recipe below is
read from the source as it stands on this branch; where a screen has not been
through the visual pass yet, the recipe is marked **target** and says which
pass applies it (see "Adoption status").

The reference screen is `/licenses` (`LicenseList`, `LicenseCard`,
`CreateAppModal`): tonal cards, ink titles, muted meta, one ink primary, no
teal. Home (`/app`, the shortcut grid) is the second reference and the
simplest one.

![Reference screen, dark](design/reference-dark.png)
![Reference screen, light](design/reference-light.png)

## Principles

1. **Ink acts, teal means live.** Primary actions are solid ink
   (`Button` `variant="primary"` = `bg-btn-primary text-btn-primary-fg`, the
   inverse of the surface). The accent (`bg-accent`) is a _status_ colour only:
   live/online dots, the "on" status chip, `Toggle` and checkbox "on". It is
   never an action, a link, a hover or a selection. If everything is teal,
   nothing is live.
2. **The gradient is a brand moment.** `bg-brand-gradient` is for the main
   submit on sign-in, sign-up and email recovery (`variant="brand"`) and for
   progress fills (`bg-progress-fill`, which deepens in light mode so it stays
   visible). Not for everyday buttons.
3. **Selection is inverse ink.** A toggled control (chip, pill, day cell,
   region/make tile) uses `bg-selected-bg text-selected-fg`. A selected card
   or row gets a neutral fill and an ink edge
   (`bg-control text-ink shadow-selected`), not a tint. Hover never takes the
   selection away.
4. **Sentence case, one typeface.** Labels are `text-label` (12px/500),
   sentence case, no letter-spacing. No uppercase or tracked mono "terminal"
   labels. Identifiers (VIN, token id, plate, counts) stay in Euclid; tabular
   figures are on globally (`font-feature-settings: 'tnum'`), so digits still
   align without `font-mono`.
5. **Surfaces separate by tone, not lines.** Prefer a tonal step
   (`bg-card` → `bg-control` → `bg-highest`) or whitespace over a 1px border.
   `border-outline` is the hairline for table row dividers, cards that need
   an edge and the few places a line carries meaning; lines drawn on the
   canvas use `border-canvas-divider`; form controls use
   `border-control-border` (never the hairline).
6. **Radius follows hierarchy.** `rounded-chip` (6px) for badges and menu
   items · `rounded-control` (10px) for inputs, buttons-in-rows and dropdown
   menus (`SelectField` `.custom-menu`, `DatePicker`) · `rounded-card` (16px)
   for cards and toasts · `rounded-panel` (20px) for modals, the guest card
   and the app shell · `rounded-full` for pills and primary buttons.
7. **Contrast is measured, in both themes.** Text ≥ 4.5:1 on the surface it
   sits on; control edges, the focus ring, status dots and progress fills
   ≥ 3:1. `tokens.test.ts` checks every pair below — add a pair before adding
   a colour.
8. **Status color marks, it doesn't write.** `positive` / `warning` /
   `negative` color the 6px dot or the icon; the words beside them are
   `text-fg` or `text-muted`. See "Status color" below.
9. **Don't hide a control until hover.** Touch screens have no hover: a
   control is visible at rest (if it must recede on desktop, gate the hiding
   with `[@media(hover:hover)]:`).

## Tokens

All values are RGB channels in `globals.css` so Tailwind opacity modifiers
work (`bg-card/60`); every token is defined for both themes
(`tokens.test.ts` fails otherwise).

| Role                                               | Tailwind class                                                | Dark                              | Light                             |
| -------------------------------------------------- | ------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| App canvas (behind sheet, sidebar)                 | `bg-canvas`                                                   | `#0E0F11`                         | `#E7E9E9`                         |
| App shell / page background                        | `bg-sheet`                                                    | `#16181B`                         | `#FFFFFF`                         |
| Card                                               | `bg-card`                                                     | `#1C1F22`                         | `#F6F7F7`                         |
| Control fill, input, hover step, selected card     | `bg-control`                                                  | `#272A2E`                         | `#E9EBEB`                         |
| Elevated hover step (skeletons, hover-on-hover)    | `bg-highest`                                                  | `#303438`                         | `#DFE2E2`                         |
| Brightest surface (active segmented tab)           | `bg-bright`                                                   | `#3A3E42`                         | `#FFFFFF`                         |
| Overlay (modal panel, dropdown menu, toast)        | `bg-overlay`                                                  | `#1C1F22`                         | `#FFFFFF`                         |
| Hairline (dividers, table rows, card edges)        | `border-outline`                                              | `#373B40`                         | `#D2D6D7`                         |
| Line drawn on the canvas (sidebar lockup divider)  | `border-canvas-divider`                                       | `#45494E`                         | `#A0A3A2`                         |
| Stronger hairline (dashed dropzone while dragging) | `border-outline-strong`                                       | `#5C6063`                         | `#A0A3A2`                         |
| Form control edge / hover                          | `border-control-border` / `-hover`                            | `#747A7F` / `#A0A3A2`             | `#7C8082` / `#5E6163`             |
| Keyboard focus ring                                | `border-focus-ring` / `ring-focus-ring`                       | `#46F1E4`                         | `#0B7A72`                         |
| App shell border                                   | `border-sheet-border`                                         | `rgba(255,255,255,.06)`           | `rgba(19,20,23,.06)`              |
| Title / high-emphasis text, links                  | `text-ink`                                                    | `#F6F7F7`                         | `#131417`                         |
| Body text                                          | `text-fg`                                                     | `#EDEEEE`                         | `#131417`                         |
| Secondary / meta text                              | `text-muted`                                                  | `#A0A3A2`                         | `#5E6163`                         |
| **Primary action** (bg / text / hover)             | `bg-btn-primary` `text-btn-primary-fg` `bg-btn-primary-hover` | `#F6F7F7` / `#111214` / `#FFFFFF` | `#131417` / `#FFFFFF` / `#2E3236` |
| **Toggled / selected control**                     | `bg-selected-bg` / `text-selected-fg`                         | `#EDEEEE` / `#16181B`             | `#16181B` / `#EDEEEE`             |
| Selected card / row ink edge                       | `shadow-selected`                                             | `inset 3px 0 0` ink               | same                              |
| Live status (dots, toggle, checkbox)               | `bg-accent`                                                   | `#46F1E4`                         | `#0B8F85`                         |
| Accent as text/icon (reserved; currently unused)   | `text-accent-ink`                                             | `#46F1E4`                         | `#07635C`                         |
| Text on the brand gradient / toggle knob           | `text-on-accent` / `bg-on-accent`                             | `#06201E`                         | `#06201E`                         |
| Accent tint (input focus halo)                     | `ring-accent-soft`                                            | mint 12%                          | mint 14%                          |
| Accent tint, strong (live-dot glow)                | `accent-soft-strong`                                          | mint 28%                          | mint 30%                          |
| Sky (gradient's first stop; decorative only)       | `text-sky` / `bg-sky`                                         | `#8CD0FF`                         | `#2B82D5`                         |
| Positive / success                                 | `text-positive` / `bg-positive`                               | `#36DF71`                         | `#11672F`                         |
| Warning                                            | `text-warning` / `bg-warning`                                 | `#FFAC60`                         | `#8F4500`                         |
| Negative / error                                   | `text-negative` / `bg-negative`                               | `#FF6060`                         | `#C70000`                         |
| Negative, soft background                          | `bg-negative-soft`                                            | `#402321`                         | `#FFF0F0`                         |
| Favorite                                           | `text-favorite` / `bg-favorite`                               | `#FFCD29`                         | `#C99A00`                         |
| Nav hover                                          | `bg-nav-hover`                                                | `#1C1F22`                         | `rgba(255,255,255,.55)`           |
| Nav active                                         | `bg-nav-active`                                               | `#24272B`                         | `#FFFFFF`                         |
| Scrim (modal backdrop)                             | `bg-scrim`                                                    | `rgba(8,9,10,.62)`                | `rgba(19,20,23,.32)`              |
| Brand gradient (brand moments only)                | `bg-brand-gradient`                                           | sky `#8CD0FF` → mint `#46F1E4`    | same                              |
| Progress fill                                      | `bg-progress-fill`                                            | brand gradient                    | `#1E6FBF` → `#0A7069`             |

There is no tinted "selected" token any more: selection is inverse ink
(`selected-bg` / `selected-fg`, the inverse surface and its text) or, for a
card or row, `bg-control shadow-selected`. The light `positive` / `warning`
values are Fleet's corrected ones: ≥ 4.5:1 as text on `sheet` and `card` and
on their own 14% tint.

## Type scale

| Class              | Spec                         | Used for                                                                                                                                                     |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text-title`       | 600 20/28, `-0.01em`         | Page header title (`Header .page-title`); `<Title>`'s default className                                                                                      |
| `text-panel-title` | 600 17/24                    | Modal / panel headers, e.g. `<Title className="text-panel-title">` in `CreateAppModal`, and the vehicle simulator header (`.vehicle-sim-header-text .title`) |
| `text-card-title`  | 600 15/22                    | Card and section titles: license card name, "Your developer licenses", shortcut card titles, the empty-state heading                                         |
| `text-metric`      | 600 40/44, `-0.03em`         | Big numbers: the license card's vehicles-connected count                                                                                                     |
| `text-body`        | 400 15/22                    | Default paragraph copy: the Home page intro line                                                                                                             |
| `text-body-sm`     | 400 14/20                    | Dense UI text: button labels, table cells, form inputs, card copy                                                                                            |
| `text-label`       | 500 12/16                    | Table headers, chips/badges, meta captions, step labels                                                                                                      |
| `text-code`        | 400 13/20 (with `font-mono`) | Monospace only — keys, ids, JWTs, code                                                                                                                       |

`<Title>`'s own class (`.title` in `Title.css`) carries no size —
`font-semibold text-ink` only. Size always comes from the type-scale class
you pass in `className` (default `text-title`); see the `<Title>` pattern
below.

## Patterns

Every recipe below is copied from the restyled source, not paraphrased —
file paths are noted so a pass can diff its own work against them.

**`<Title>` component** (`src/components/Title/Title.tsx`,
`Title.css`): `.title` = `font-semibold text-ink` and nothing else — it
carries no size. Size always comes from `className` (default `text-title`
if none is passed): pass a type-scale class such as `text-panel-title` or
`text-card-title` to size it for the context. Never pass a raw size utility
(`text-2xl`, `text-3xl`, `text-4xl`) — those aren't tokens and won't track
the type scale.

**Page header** (`src/components/Header/Header.css`): `.header` = `flex
h-[72px] w-full min-w-0 items-center justify-between gap-2`; no border, sits
on the transparent `.app-content` sheet. Title: `.page-title` = `min-w-0
truncate text-title text-ink` (truncates so it never pushes widgets off at
390px), sentence case (see the note on `getPageTitle` under "Adoption
status"). The mobile menu button lives in `.menu-header-button`
(`md:hidden`). Right side: `.user-information` = `flex flex-shrink-0 flex-row
items-center gap-2 md:gap-3` (credits, help, account). `Header.css` also carries a header-scoped
override, `.header .credits, .header .credits .credits-info { max-md:min-w-0
}`, so `CreditsWidget`'s own min-widths don't blow out the header on a phone.

**App shell** (`src/layouts/AuthorizedLayout/AuthorizedLayout.css`): `.main` =
`flex min-h-screen flex-row items-stretch bg-canvas`. The page is an inset
sheet: `.app-content` = `flex h-screen min-w-0 flex-1 flex-col
overflow-hidden bg-sheet md:my-2 md:mr-2 md:h-[calc(100vh-16px)]
md:rounded-panel md:border md:border-sheet-border`. The header row
`.header-container` = `flex h-[72px] flex-shrink-0 flex-row items-center
gap-2 px-4 md:px-6`; the scroll area `.page-content` = `w-full flex-1
overflow-auto px-4 pb-6 md:px-6` (content scrolls inside the sheet, not the
window). Page content sits directly on the sheet at full width; a page adds
its own max width only when it needs one.

**Sidebar** (`AuthorizedLayout.css`, `src/components/Menu/Menu.css`,
`Menu.tsx`): a collapsible, sectioned nav. `.sidebar-container` is hidden
below `md`, and at `md` is `sticky top-0 h-screen flex-shrink-0` with
`transition: width 200ms ease`; `.expanded` = `md:w-[244px]`, `.collapsed` =
`md:w-16` (64px). The state is `isSidebarCollapsed` in `LayoutContext`,
persisted in `localStorage['sidebar-collapsed']` (`withLayout.tsx`).
Inside, `.main-menu` = `relative flex h-full w-full flex-col gap-2 bg-canvas
px-3 py-5` (`px-2` when `.collapsed`). Order, top to bottom: logo row,
`<nav className="flex flex-1 flex-col gap-4 overflow-y-auto">` holding the
sections, then `.bottom-section` = `mt-2 border-t border-canvas-divider pt-3`
(Settings, theme toggle, Logout).

- **Sections** (`getNavSections()` in `src/config/navigation.ts`: Workspace,
  Resources). Each is a `<div>` with a section label
  `<p className="mb-1 px-3 text-label text-muted">` (hidden when collapsed)
  over a `ul` = `flex flex-col gap-0.5`. Section labels are sentence case,
  not uppercase caps.
- **Collapsed**: labels disappear, items go icon-only (`justify-center gap-0
px-0`, the label stays as `sr-only` text and the `li` `title`), and the
  logo row shows the red "D" mark instead of the lockup.
- **Collapse button** `.collapse-btn` = `absolute -right-3.5 top-[72px] z-10
h-7 w-7 items-center justify-center rounded-full border border-outline
bg-control text-muted shadow-sm transition-colors hover:text-ink`, rendered
  `hidden md:flex` with `aria-label` "Collapse sidebar" / "Expand sidebar".
  It is always visible (touch has no hover) and straddles the canvas and the
  sheet, so it floats on the control tone with the one sanctioned 1px
  hairline.
- **Mobile**: below `md` the sidebar is replaced by `FullScreenMenu`
  (`FullScreenMenu.css` = `fixed inset-y-0 left-0 z-50 flex w-screen bg-canvas
text-fg transition-transform md:hidden`) that renders the same `Menu`; a
  close `X` (`text-muted`) sits at the top right. Selecting an item closes it.

**Logo**: expanded, `BrandLockup` (`src/components/BrandLockup`) shows the
wordmark `public/images/dimo-wordmark.svg` (white fill, `next/image` 80×18,
`alt="DIMO"`) beside the product name. Collapsed, the sidebar shows the red
circle "D" mark, `public/images/dimo-mark.png`, at `h-7 w-7 rounded-lg`. The
wordmark is drawn for dark backgrounds; in light mode it gets `filter:
brightness(0) opacity(.88)` so it reads as ink. Don't use the old mint mark or
a gradient wordmark.

**Brand lockup** (`BrandLockup.css`): `.brand-lockup` = `flex h-8 items-center
gap-1.5 px-2.5`; `.product` = `whitespace-nowrap border-l
border-canvas-divider pl-1.5 text-[14px] font-medium leading-none text-fg`
(`-0.01em`; on the guest panel, which is the sheet, the divider is
`border-outline`). "Developer Console" is a product name and is never
re-cased. The spacing is tight on purpose: the 80px wordmark plus the name
must end inside the 244px sidebar.

**Nav item** (`src/components/Menu/MenuItem/MenuItem.tsx`; its `.css` is an
empty stub, the styling is Tailwind classes there): `li` = `flex h-10
flex-row items-center gap-2.5 rounded-control px-3 text-body-sm font-medium
transition-colors text-muted hover:bg-nav-hover hover:text-fg`; highlighted
(`pathname.startsWith(link)`) → `bg-nav-active text-ink hover:bg-nav-active
hover:text-ink`, icon `text-ink` too: the raised pill carries the selection,
not a colour. Disabled → `pointer-events-none opacity-40`. The label is a
`Link` (or a `button` for Logout) with `min-w-0 truncate`.

**Theme toggle** (`src/components/ThemeToggle/ThemeToggle.tsx`): one
mechanism, next-themes `setTheme`. `variant="menu"` is a nav-item-shaped
button in the sidebar's bottom section (icon `size-5` + label; collapsed →
icon-only with `title`/`aria-label`); `variant="icon"` is a `size-10 rounded-full
text-muted hover:bg-control hover:text-ink` button for guest pages. The label
names the mode you would switch _to_ ("Light mode" in dark, "Dark mode" in
light). Until mounted it renders a same-sized placeholder so hydration
matches.

**Guest pages** (sign-in, sign-up, email recovery; `GuestLayout`): the
layout supplies the panel (`.guest-panel`, `bg-sheet rounded-panel`, the
Developer Console `BrandLockup`) and the icon theme toggle, so the page
content adds no card, background or logo of its own: each form is a bare
`flex flex-col max-w-sm gap-4` column (`sign-in__form`, `sign-up__form`,
`email-recovery__form`). Heading `text-title text-ink` centred; one-line
explanations `text-body-sm text-muted`; terms captions `text-label text-muted`;
dividers `bg-outline`. The primary submit of each step is the one place
`Button variant="brand"` is used; secondary choices (passkey, resend) stay
`secondary`/`ghost`. OTP boxes are the shared `TextField` at `h-14 w-12`, digit
in `text-metric text-ink`. The Google / GitHub buttons keep their brand logos
(`GoogleIcon` is the one multi-colour icon). There is no extra logo inside a
guest page.

**Error pages** (`error.tsx`, `global-error.tsx`): a centred column on the
page background: `500` in `text-label text-muted`, "Something went wrong" in
`text-title text-ink`, one `text-body text-muted` sentence, then a primary
`button primary` link "Go back home" (`/`) beside a `secondary` "Retry".
`global-error.tsx` renders its own `<html>` outside every provider: it
imports `globals.css`, starts on `data-theme="dark"`, and a mount effect
applies `localStorage['theme']` (see Theming); it uses a plain `<a>` because
the router may not be mounted. `src/app/_not-found.tsx` is dead code (Next
only uses a file named `not-found.tsx`) and is not restyled.

**Page intro**: the line directly under the page header, no rule under it,
no heading element, no weight. A one-sentence description is
`<p className="text-body-sm text-muted">`; the Home greeting
(`View.css` `.welcome-message .title`) is `text-body font-normal text-muted` (`font-normal` beats the global `.title` weight) next to the
waving-hand image. A full sentence is an intro, never a heading.

**Page section title** (`<PageSubtitle>`, `src/components/PageSubtitle`):
`.subtitle-content` = `border-b border-outline` around a `text-title
text-ink` `h2` (`pb-2`). Only for a short label that names a block of the
page (the configurator pages, where it is the page's only visible heading, so
it is ink, not muted). If it reads as a sentence, use the page intro.

**Section title**: `text-card-title text-ink`, e.g. `LicenseList.css
.description .title` ("Your developer licenses"), which shares a row
(`mb-3 flex w-full flex-row items-center justify-between gap-2`) with the
page's one primary action. An optional line under it is
`text-body-sm text-muted`.

**Breadcrumbs** (hand-built, not a component; in `license/[tokenId]/details`
`View.tsx`, `license/vehicles/[clientId]` `View.tsx`, the configurator
list/new/edit views, the connections details and create pages and the webhooks
create and edit pages): a `<nav>` above
the page content, `mb-2 flex items-center gap-1.5 text-label text-muted`.
Each ancestor is a `Link` with `transition-colors hover:text-ink`; the separator is a bare
`<span>/</span>` inheriting `text-muted`; the current page is the last item,
`text-ink`, not a link. Sentence case labels ("License details", "Vehicles").
If a page needs back-navigation without a trail, use `BackButton` (a real
button with `aria-label="Back"`); the licensed-vehicles layout's bare chevron
is a `text-muted hover:text-ink` `<button aria-label="Back">`.

**Card** (`src/components/Card/Card.css`): base `.card` = `rounded-card
bg-card p-4`. `.card-border` adds `border border-outline`; `.secondary`
switches the fill to `bg-sheet` (a card that must sit on canvas rather than
the sheet). A clickable card adds `transition-colors hover:bg-control`
(`LicenseCard.css`, the Home `.shortcut-card`): the hover is one tonal step up,
never a border. Anything already on the `control` tone inside it steps up too:
a `variant="secondary"` `<Button>` inside the license card goes to
`bg-highest` on card hover (`.license-card:hover .button.secondary {
bg-highest }`) so it keeps its edge instead of melting into the card, and the
`#tokenId` chip rests on `bg-highest` for the same reason.

**License card** (`src/components/LicenseCard/LicenseCard.tsx`, `.css`; the
reference card): `.license-card` = `flex flex-row items-start
justify-between rounded-card bg-card !p-0 transition-colors hover:bg-control`
(the `!p-0` beats `.card`'s padding; the inner `.content` = `flex min-w-0
flex-1 flex-col gap-5 p-6`). The whole card is clickable
(`cursor-pointer`, routes to the license details); every inner link and
button calls `stopPropagation` so it keeps its own target. Top to bottom:

1. Header row (`flex w-full flex-row items-start justify-between gap-3`):
   name `.title` = `text-card-title text-ink` (`min-w-0 break-words`) and the
   token chip `.license-card-token-id` = `shrink-0 rounded-chip bg-highest
px-2 py-0.5 text-label text-muted` (`#42`, in Euclid).
2. Metric block: `text-label text-muted` caption ("Vehicles connected") over
   the number, `.anchor.license-card-metric` = `w-fit py-0 text-metric
text-ink`. It is a link, and stays ink. The "No vehicles connected" note is
   `text-label text-muted` with a `WarningAmberIcon` `h-4 w-4 text-warning`
   (status colour on the icon, words muted).
3. Meta link, `.license-card-link` = `flex w-fit flex-row items-center gap-2
py-0 text-body-sm text-muted transition-colors hover:text-ink`: "N
   configurations →", "Vehicle sharing link" (copies, then a Sonner toast), or
   "Not configured — set up vehicle sharing →". Reads as meta until hovered,
   never teal.
4. Footer: a full-width `<Button variant="secondary">` "License details"
   inside an `Anchor` (`!py-0`). The one primary on the page is the header's
   "Create a license".

**Shortcut card** (Home, `src/app/app/list/components/View/View.tsx`,
`View.css`; the shortcut grid): the grid `.shortcuts-grid` = `grid grid-cols-1
gap-3 sm:grid-cols-2`. Each `.shortcut-card` is a `Link` = `flex cursor-pointer
flex-row items-start gap-4 rounded-card bg-card p-5 transition-colors
hover:bg-control`: no border, hover one tonal step up. Icon tile
`.shortcut-card__icon` = `flex size-10 flex-shrink-0 items-center
justify-center rounded-control bg-control text-ink transition-colors`
(neutral, never teal), stepping to `bg-highest` when the card is hovered so it
stays visible; title `.shortcut-card__title` = `text-card-title text-ink`;
description `.shortcut-card__desc` = `text-body-sm text-muted`. Labels are
sentence case ("Vehicles"). The grid holds Licenses, Connections,
Webhooks and Vehicles; targets are `/licenses`, `/connections`,
`/webhooks`, `/vehicles`. New shortcuts follow the same card; keep the grid to
what a developer opens daily.

**Metric**: `text-metric text-ink` for the big number (`CreditsWidget`'s
large variant, `LicenseCard`'s `.anchor.license-card-metric` = `w-fit py-0
text-metric text-ink` — it's a link, but stays ink, not mint), with a
`text-label text-muted` caption underneath.

**Status dot**: `inline-block size-1.5 flex-shrink-0 rounded-full` (6px),
colored by state. (Toasts use a status icon instead — see "Toast".)

**Status chip** (`src/components/StatusChip/StatusChip.tsx`; used by the webhooks table and
details card and the template search list) — the one status
idiom for a record's state in a list or table: the status dot inside a
neutral chip, `inline-flex w-fit items-center gap-1.5 whitespace-nowrap
rounded-chip bg-control px-2 py-0.5 text-label text-fg`. Use `<StatusChip
tone=…>`; don't hand-roll it. Tones:

| `tone`    | Dot                                                    | Means                      | Used for                                                |
| --------- | ------------------------------------------------------ | -------------------------- | ------------------------------------------------------- |
| `live`    | `bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]` | running right now          | webhook Enabled (`Webhooks/components/StatusBadge.tsx`) |
| `on`      | `bg-accent` (no glow)                                  | done / in place ("Active") | template exists                                         |
| `pending` | `bg-warning`                                           | waiting on someone         | (unused)                                                |
| `off`     | `bg-muted`                                             | off, or nothing there yet  | webhook Disabled, "No template yet"                     |
| `error`   | `bg-negative`                                          | broken                     | webhook Failed, "Id cannot be a template", Errors count |

The label is always `text-fg`, and a chip always has a label: map the value
to its label and fall back to the capitalized raw value, never an empty chip
(the rule used by the webhooks and template lists). A
row with no state gets no chip (the workspace owner has no invitation). Never
use `bg-selected-bg` (that is selection, not status) or a status-tinted chip.
A count with a state (webhooks "Errors" > 0) is `<StatusChip tone="error">`
with the number as the label; zero is plain text.

**Status color** (enforced by `tokens.test.ts`): status colors are for dots
and icons. Light-mode `positive` (`#11672F`) and `warning` (`#8F4500`) are
Fleet's corrected values — AA as text on `sheet`, `card` and their own 14%
tint — but the console's rule stays: on any card, control or tinted surface
the meaning goes on a dot or icon
(`WarningAmberIcon` / `CheckIcon` / `CheckCircleIcon` in the status color,
≥ 3:1 non-text contrast on `card`, `control` and `overlay`) and the words are
`text-fg` (or `text-muted` for secondary detail). The icon is decorative —
the words carry the meaning — so it is `aria-hidden` with no role
(`WarningAmberIcon` sets `aria-hidden="true"` itself); tests assert the words
or a `data-testid` on the icon's wrapper, never a made-up role. A status tint
(`bg-warning/10 border-warning/40`) takes `text-fg` title + `text-muted` body,
never the status color at reduced opacity. Examples: `EntitlementBanner`,
the brand-rename warning in `BrandForm`, the vehicle page's `AccessNotice`
(missing JWT, not shared), completed steps in
`FormStepTracker`, the vehicle simulator's "Removed on-chain" badge. The one
exception is error text (`text-negative`: form errors, `TextError`,
`role="alert"` lines), which the test holds at AA on `sheet`, `card`,
`control`, `overlay` and `negative-soft`.

**Chip / badge** (neutral metadata, not status — for status use the status
chip above): `rounded-chip ... text-label text-muted`, tone set by what
it sits on — on a card, step up to `bg-highest` (`LicenseCard.css`
`.license-card-token-id` = `shrink-0 rounded-chip bg-highest px-2 py-0.5
text-label text-muted`); on a control-toned surface, `bg-control`
(`VehicleSimulator.css` `.vehicle-sim-testnet-badge` = `self-start
rounded-chip bg-control px-2 py-1 text-label text-muted`). Never uppercase or
tracked.

**Table** (`src/components/Table/Table.css`, `Column.css`, `Cell.css`):
outer wrapper = `rounded-card bg-card p-4` around `<table className="table">`.
Put `<Table>` straight into its section card (license details' Developer JWTs
and Signers, settings' Team management) — never inside a `Card.secondary`
or another card, which stacks three tonal levels. On a phone, hide a
low-priority column rather than scrolling the row's action off-screen
(webhooks hide Display name, Service and Cooldown below `md` and repeat them in the expanded row).
A column's optional `className` (`IColumn`) lands on its header `<th>` and
every body `<td>`: `className: 'hidden md:table-cell'` drops a column on
phones (the webhooks table). `.table-cell` breaks anywhere
(`break-all`, for long ids and URIs); a column of words wraps them at word
boundaries with a `break-normal` span in its `render` and adds a `pr-4`
gutter via `className` (`ConfigurationList`).
Header row `.table-header` = `border-b border-outline`; header cell
`.custom-table-column` = `pb-3 text-label text-muted first-letter:uppercase`
(no background fill; sentence case: the first letter is capitalised, the rest
is left as written). `Column.tsx` composes `text-left` with the column's own
`className`, so a column sets its own alignment (`text-right`) without
fighting the base class. Body `.table-body` = `divide-y
divide-outline` (each `<tr>` also carries `border-t border-outline`). Cell
`.table-cell` = `h-[52px] max-w-[300px] break-all py-3 text-body-sm text-fg`.

**Pagination** (`src/components/Table/PaginatedTable.tsx`,
`PaginatedTableIdentityAPI.tsx`, `Table.css`): the meta-and-controls row = `flex
items-center justify-between text-sm text-muted`. Round page buttons:
`<Button variant="secondary" size="icon">` (see "Buttons" — the icon size).
Row icon actions use the same size with `variant="ghost"` (`BrandRow`,
`Signers`, `DeveloperJwts`, `RedirectUriList`).

**Buttons** (`src/components/Button/Button.css`, `Button.tsx`): base
`.button` = `inline-flex h-10 min-h-10 flex-row items-center justify-center
gap-2 rounded-full px-4 text-body-sm font-semibold transition-[filter,
background-color,color] duration-150 disabled:cursor-not-allowed
disabled:opacity-40`. A loading button's `BubbleLoader` dots are
`bg-current` (the button's own text colour). `size` (default `md`): `md` is
the 40px pill above, defined on `.button` itself so a plain
`className="button primary"` on a `<label>` or `<a>` gets it too; `icon` adds
`.button.icon` = `size-8 min-h-0 flex-shrink-0 px-0` — a 32×32 round
icon-only button that outranks the base by specificity (no `!important`).
Give an icon button a `title` or `aria-label`. `CopyButton` is not a
`Button`: its `size="icon"` is styled in its own `CopyButton.css`
(`.copy-button.icon` = `inline-flex size-8 items-center justify-center
rounded-full enabled:hover:bg-control`), so it never relies on another
component having loaded `Button.css`; its default (`inline`) is a bare icon.
There is no `.with-icon` modifier — `.button` already lays out icon + label
with `gap-2`. `variant` (default `primary`):

| Variant             | Classes                                                                     | Use for                                                                                       |
| ------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `primary`           | `bg-btn-primary text-btn-primary-fg enabled:hover:bg-btn-primary-hover`     | The main action on a surface: Create a license, modal confirms, Generate new JWT, Add credits |
| `brand`             | `bg-brand-gradient text-on-accent enabled:hover:brightness-105`             | Brand moments only: the main submit on sign-in, each sign-up step and email recovery          |
| `secondary`         | `border border-outline bg-control text-ink enabled:hover:bg-highest`        | Cancel/auxiliary actions, secondary CTAs (License details)                                    |
| `ghost`             | `bg-transparent text-muted enabled:hover:bg-control enabled:hover:text-ink` | Low-emphasis inline actions                                                                   |
| `destructive`       | `bg-negative-soft text-negative enabled:hover:brightness-110`               | Destructive confirm inside a modal                                                            |
| `destructive-ghost` | `bg-transparent text-negative enabled:hover:bg-negative-soft`               | Destructive inline/cancel-adjacent action                                                     |

A primary action that can't be a `<Button>` takes the recipe by class, with
an explicit `import '@/components/Button/Button.css'` in its own file (a
`<label className="button primary">` or `<a className="button primary">`).
Keep one `primary` per surface: never two ink pills in the same row or card.
`CreateAppButton` is the license-creation entry point: a `primary` `Button` with
a `PlusIcon`, disabled above five licenses (`LicenseList`). On the zero-license
state master shows it twice (page header and the empty-state card); that is
kept as is. The Create modal's footer is one primary (Create) over one
secondary (Cancel), stacked `gap-2`.

**Links** (`src/components/Anchor/Anchor.css`, inline "Learn more" links):
links are ink, not teal. A standalone link (`Anchor`) = `text-ink
underline-offset-2 hover:underline`; a link inside a sentence of muted text is
always underlined (`text-ink underline underline-offset-2`), because ink vs
muted alone is under 3:1. Meta links on a card (`LicenseCard`
`.license-card-link`) are `text-muted hover:text-ink`. `Anchor` = `cursor-pointer
py-1 text-ink underline-offset-2 hover:underline` (`py-0` when it wraps a
button or sits in a card).

**Selected / toggled state** — pick by what the element is:

- **Toggled control** (chips, pills, day cells, compact option tiles):
  `bg-selected-bg text-selected-fg` with `hover:bg-selected-bg` so hover never
  flickers back to the unselected fill; secondary text on it
  `text-selected-fg/75`. Used by the vehicle simulator's region tiles, make
  tiles and model/year pills (`VehicleSimulator.css` `.selected`) and the
  `DatePicker` selected day.
- **Selected card / row** (option cards, list rows): a neutral fill plus an
  ink edge, `bg-control text-ink shadow-selected` (`shadow-selected` =
  `inset 3px 0 0 rgb(var(--ink))`); secondary text stays `text-muted`. The
  selected card carries no hover class — it never changes under the pointer.
  An unselected card's hover is a lighter step, the midpoint between its
  resting fill and `control`, so hover never reads as selected: a row
  resting transparent on a card → `hover:bg-control/50`; an option card
  resting `bg-card` on the sheet → `hover:bg-control/70`; a row resting
  transparent on the sheet → `hover:bg-card`. Expose the state: `aria-current`
  on the selected item of a list you navigate (the vehicle page's source rail),
  `role="radio" aria-checked` inside a `role="radiogroup"` for a single
  choice (build-for cards, `PaymentMethod`, `MultiCardOption`),
  `aria-pressed` for a multi-select toggle (permission cards). Current on the
  configurator's permission cards (`ShareVehiclesWithDimoConfiguration`
  `PermissionCard`: `role="button" aria-pressed`, `rounded-control px-3 py-2`;
  these sit inside a `bg-card` section, so an unselected card rests on
  `bg-sheet` and hovers to `bg-control/70`; selected =
  `bg-control shadow-selected`). Current on the sign-up "What are you
  building?" cards (`BuildForForm`: `role="radiogroup"` labelled by the
  prompt, each `Card` `role="radio" aria-checked`; resting `text-ink
hover:bg-control/70`, selected `!bg-control text-ink shadow-selected`, the
  `!` because `.card` sets `bg-card`; the "Something else" card follows the
  same two states) and on the vehicle page's source rail items (`SourceRail`: a
  `button` with `aria-current` on the selected one; resting `hover:bg-control`,
  selected `bg-control shadow-selected`). Neither
  has keyboard handling beyond what the element already gives. (`MultiCardOption`
  and `PaymentMethodSelector` are orphaned and not restyled.)

Never a white slab and never a mint tint. This is distinct from the segmented
control below, which uses a raised neutral step.

**Webhooks** (`src/app/webhooks/**`, `src/components/Webhooks/**`): a tonal
`Section` card holds the "Webhooks" header, the one primary ("+ Create a
webhook") and the table. The table is a `min-w-full overflow-x-auto` wrapper (no
second card) around the plain `table.table`; row dividers are `border-t
border-t-outline`, the expanded row rests on `bg-sheet` (`ExpandedRow`), the
row chevron is `text-muted`. Display name, Service and Cooldown are
`hidden md:table-cell` (column `meta.className`), so Description, Vehicles,
Errors and Status fit a 390px phone. Status is `StatusBadge` = `StatusChip`
(Enabled `live`, Failed `error`, else `off`); an Errors count above zero is
`<StatusChip tone="error">`. The status `Toggle` is the one teal control
("on"). Read-only target URL is a plain `rounded-control bg-control` field: a
URL is not code. Modals use `text-panel-title` titles, the `destructive`
Delete/Remove confirm over a `secondary` Cancel, and a
`rounded-card bg-control` details card (`text-label text-muted` labels,
`text-body-sm text-fg` values). Only keys, ids, the verification token and
the generated CEL block are `font-mono text-code`.

**Template editor** (`src/app/templates/**`, `src/components/TemplateEditor/**`;
gated behind `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED`): the page intro is
`text-body-sm text-muted`. The search form is `Label` + `TextField` per field
and one primary; results are a `rounded-card bg-card` list with `divide-outline`
rows, the id in `font-mono text-code`, a `StatusChip` (`on` Template, `off` No
template yet, `error` Id cannot be a template) and a `secondary` Open / Create.
The grid is a `rounded-card bg-card p-4` table (`min-w-[640px]` inside an
`overflow-x-auto` wrapper, header `border-b border-outline`, sticky first
column on `bg-card`); a cell is a 32px control (`h-8 rounded-control border
border-control-border bg-control`, the input recipe at grid density), agreement
recedes (`text-muted`) and difference advances (`text-ink`), unset is
`text-muted/60`. Rail actions are `rounded-full border border-outline text-label
text-muted` pills. Banners (entitlement, normalisation notes) are `rounded-card
bg-card` with a `text-ink` title and `text-muted` body; a read-only entitlement
carries the `WarningAmberIcon` in `text-warning`. Errors and the version
conflict are `rounded-card bg-negative-soft` with `text-negative` lines.

**Step tracker** (`FormStepTracker`, webhook create): a `rounded-card bg-card
p-4` card holding an `ol` of rows, `flex items-center gap-2 text-body-sm`. A
20px marker: done = the green check icon (`CheckIcon`, status colour on an
icon), current = `bg-selected-bg text-selected-fg` numbered disc with
`font-semibold text-ink` title and `aria-current="step"`, upcoming =
`border border-control-border text-muted` numbered ring with a `text-muted`
title. No teal.

**CEL builder** (`fields/CELBuilder`): a `Section` card, "Build the
conditions", stacking one row per condition (`flex-col` on phones, `sm:flex-row`
from 640px) of the standard `SelectField` / `text-field` controls, a
`secondary` "Generate CEL" button, and the generated expression in a
`rounded-control bg-sheet px-3 py-2` well (`whitespace-pre-wrap break-all
font-mono text-code text-fg`) that sits one step below its card.

**Segmented control** (`src/components/SegmentedControl/SegmentedControl.css`):
track `.segmented-control` = `flex w-fit flex-row gap-0.5 rounded-full
bg-control p-[3px]`; each `.segment` = `flex cursor-pointer flex-col
rounded-full px-3.5 py-1.5 text-[13px] font-medium leading-[18px] text-muted
transition-colors hover:text-fg`; the active segment `.selected` = `bg-bright
text-ink shadow-sm`: a raised neutral step, not mint.

**Tabs** (license details: `role="tablist"` `nav.license-tabs` with
`role="tab"` buttons and `aria-selected`; `src/app/license/[tokenId]/details/
components/View/View.tsx`, `.css`): Fleet has no underlined tabs, so the row
is the segmented control above, written as its own classes in `View.css`
(the tab state, keys and `aria-selected` are master's): `.license-tabs` =
`flex w-fit max-w-full flex-row gap-0.5 overflow-x-auto rounded-full
bg-control p-[3px]`; `.license-tab` = `flex-shrink-0 rounded-full px-3.5
py-1.5 text-[13px] font-medium leading-[18px] text-muted transition-colors
hover:text-fg`; `.license-tab--active` = `bg-bright text-ink shadow-sm`. The
visible focus ring is the global `:focus-visible`. The panel below sits on the
sheet with no rule between the row and the content (`.license-tab-content` =
`flex flex-col gap-4 pt-4`).

**License details page** (`View.tsx`, `View.css`): no frame around the header.
Breadcrumbs, then the name `text-title text-ink` with the token chip
(`rounded-chip bg-control px-2 py-0.5 text-label text-muted`) and a ghost
round rename button (`size-8 rounded-full text-muted hover:bg-control
hover:text-ink`, only for the owner), the client id in a `CopyableRow` (wraps
on a phone), then the tabs. Every tab body is a stack of tonal section cards:
`flex flex-col gap-4 rounded-card bg-card p-4` with an `h2` `text-card-title
text-ink` and the section's actions on the right (`Section` /
`SectionHeader` and the API keys, Developer JWTs, Redirect URIs and Brand
cards use the same recipe). A `<Table>` inside one is wrapped in `-mx-4 -mb-4`
so its own `p-4` lines it up with the card's title instead of doubling the
inset. Stat cards on Overview / Vehicles are `rounded-card bg-card p-5` with a
`text-metric text-ink` number, a `text-label text-muted` caption and a
`text-label text-muted hover:text-ink` link. Quick actions are `rounded-control
bg-card px-4 py-2.5 text-body-sm text-ink hover:bg-control` buttons (their
emoji glyphs are master's copy and were kept). Small labels that sit beside a
record (the "RentalOS" and "Default" tags, the vehicle table's "Simulated") are
neutral chips `rounded-chip bg-highest px-2 py-0.5 text-label text-muted`, not
`StatusChip`: they name a thing, not a state. Keys, ids, JWTs and signer
addresses are `font-mono text-code`. A destructive row action in a menu
(`VehicleDetailsTable` `constants.tsx`, the row-actions popover) is
`rounded-chip px-3 py-2 text-body-sm text-negative hover:bg-negative-soft` in an
`bg-overlay` menu (`rounded-control border border-outline p-1 shadow-float`).

**Split panel with sticky preview** (configurator: `ConfigurationForm.tsx`
for new and edit): the form on the left, a live preview on the right. Layout
(this exists as written): `lg:grid lg:grid-cols-[1fr_360px] lg:gap-6
lg:items-start`; the preview is `sticky top-6 hidden lg:block`, i.e. it
appears only from `lg` up and stays pinned while the form scrolls. Below
`lg` it is absent and the form takes the full width. The preview panel
is `overflow-hidden rounded-card bg-card` with no border, a header `px-4 pt-3`
carrying a `text-label text-muted` sentence-case caption ("Generated output"),
and a `p-4` body; before the first save it is a `rounded-card bg-card p-6`
centred note ("Save to generate your link", `configurationId` in a
`rounded-chip bg-control font-mono text-code` chip). Form sections are
`rounded-card bg-card p-4` cards, each headed by an `h3` `text-card-title
text-ink` (no rule under it); labels are the shared `Label`, hints
`text-label font-normal text-muted`, errors `TextError`. Code and URLs follow
the monospace rule: the URL view is `rounded-control bg-control p-4 font-mono
text-code text-fg`; the code view keeps the `oneDark` Prism theme (its token
colours need a dark ground, so it stays dark in light mode). The copy button is
`Button` `variant="secondary"`. Below `lg` the two-column field rows stack.
The form's ToS / Privacy URL fields use the
standard `TextField`.

**Toggle** (`src/components/Toggle/Toggle.tsx` over the Radix `Switch` in
`src/components/ui/switch.tsx`): track = `h-6 w-11 rounded-full border-2
border-transparent transition-colors`, `data-[state=checked]:bg-accent`,
`data-[state=unchecked]:bg-control-border` (≥ 3:1 on sheet, card and
overlay). Thumb = `h-5 w-5 rounded-full shadow-sm`, checked →
`translate-x-5 bg-on-accent`, unchecked → `translate-x-0 bg-ink` (≥ 3:1 on
the control-border track in both themes; `tokens.test.ts`). Focus =
`focus-visible:ring-[3px] focus-visible:ring-accent-soft` on top of the global
outline. Teal here means "on", a live state like a status dot. The same goes
for `CheckboxField` (Radix `Checkbox`, `src/components/ui/checkbox.tsx`): 16px,
`rounded-[4px] border border-control-border`, checked →
`border-accent bg-accent text-on-accent`.

**Form controls**: master builds them on shadcn primitives
(`src/components/ui/input.tsx`, `textarea.tsx`, `checkbox.tsx`, `switch.tsx`,
`dialog.tsx`) and wraps them in the console's own components, which carry the
Fleet recipe; use the wrapper (`TextField`, `TextArea`, `SelectField`,
`Toggle`, `CheckboxField`, `Modal`), not the primitive, in pages. That covers
`TextField`, `TextArea`, `SelectField`, `SelectWithChevron`, `MoneyField`,
`TokenInput`'s `.dcx-container`, the `DatePicker` trigger and the vehicles
search (both reuse `.text-field`) and the template editor's `TemplateCell`:
`bg-control` fill, `border
border-control-border`, hover `border-control-border-hover`, focus
`border-focus-ring` with a `ring-[3px] ring-accent-soft` halo — one ring, on
the control, never on a wrapper too. `border-outline` is a hairline and fails
3:1 as a control edge; don't draw a control with it.

**Label** (`src/components/Label/Label.css`): `.label` = `flex flex-col gap-2
text-label text-muted`; a field is `<Label>` text, the control, then an error
(`TextError` = `text-label text-negative`) and help text (`text-body-sm
text-muted`).

**Text input + focus** (`src/components/TextField/TextField.tsx`, `.css`):
the wrapper `.text-field` owns the single edge and focus ring; the inner
shadcn `Input` is rendered bare (`min-h-0 rounded-none border-0
bg-transparent p-0 focus-visible:ring-0`) so there is exactly one ring.
`.text-field` = `flex min-h-10 flex-row items-center rounded-control border
border-control-border bg-control px-3 text-fg transition-[border-color,
box-shadow] focus-within:border-focus-ring focus-within:ring-[3px]
focus-within:ring-accent-soft`, plus `&:hover:not(:focus-within) {
border-control-border-hover }` (Tailwind orders `hover:` after
`focus-within:`, so a plain `hover:` would repaint the focused edge). Inner
`<input>` = `w-full bg-transparent text-body-sm font-normal text-fg outline-0
placeholder:text-muted`. Read-only (`.text-field:has(input[readonly])`): same
edge, no hover firming, input text `text-muted`, `cursor-default`. The ring lives on the container (`focus-within`) so
it fires when the real `<input>` inside it is focused. `TextArea`, `MoneyField`
(`.input-focused`) and `TokenInput` use the same recipe;
`SelectWithChevron` and `TemplateCell` are the real `<select>`/`<input>`, so
they use `hover:` + `focus:` directly.

**Select field** (`src/components/SelectField/SelectField.css`): a
click-to-open custom menu, not a text input. Container `.select-field` =
`relative flex min-h-10 flex-row items-center justify-between rounded-control
border border-control-border bg-control px-3 text-body-sm font-normal text-fg
outline-0 transition-colors hover:border-control-border-hover` (the real
`<select>` inside is `hidden`; the visible value is a `<p>`, styled `text-fg`
once a value is chosen). Its dropdown `.custom-menu` = `absolute left-0
top-full z-10 mt-1 hidden max-h-48 w-full flex-col gap-0.5 overflow-y-auto
rounded-control border border-outline bg-overlay p-1 text-fg shadow-float`
(the menu takes a hairline so it reads against a same-tone card in dark
mode), shown via a `.show` modifier (`flex`); each `.custom-item` =
`cursor-pointer rounded-chip px-2.5 py-2 hover:bg-control`, and the chosen
option `.selected-item` = `bg-selected-bg text-selected-fg
hover:bg-selected-bg` (a toggled control: inverse ink).

**Modal** (`src/components/Modal/Modal.tsx`, `Modal.css`; a wrapper over the
Radix `Dialog` in `src/components/ui/dialog.tsx`, which supplies focus trap,
Escape, scroll lock and `role="dialog"`): overlay `fixed inset-0 z-50
bg-scrim backdrop-blur-[6px]`. Panel (`DialogContent` + `.dialog-panel`) =
`fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)]
w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 gap-4
overflow-y-auto rounded-panel bg-overlay p-6 text-fg shadow-float
md:min-w-[480px]`. A panel that must be a near-fullscreen sheet on phones adds
`min-w-[95vw] min-h-[95vh]` under `md` in its own CSS (`CreateAppModal.css`:
`md:min-w-[480px] md:max-w-[480px]`). The Radix `DialogTitle` is rendered
`sr-only` ("Dialog"); the visible heading is your own
`<Title className="text-panel-title" component="h3">`, left-aligned with `pr-8`
so it clears the close button. Close button `.close-btn` = `cursor-pointer
rounded-full p-1 text-muted transition-colors hover:bg-control hover:text-ink`

- the icon-button ring (see "Focus ring" below), placed absolutely at the top
  right. Actions row `.dialog-action-content` = `mt-6 flex flex-col-reverse
gap-2 sm:flex-row sm:justify-end`; a modal whose form owns its buttons stacks
  them (primary over secondary) with `flex flex-col gap-2 pt-4`.

**Create license modal** (`CreateAppModal.tsx`, `CreateAppModal.css`, and the
form `src/app/app/create/components/Form/Form.tsx`; the reference modal):
`text-panel-title` "Create a new developer license", a `Label` "Developer
license name" wrapping a `TextField`, the error line, help text
`text-body-sm font-normal text-muted`, then `Button` primary "Create" over
`Button variant="secondary"` "Cancel". While submitting, the form swaps to a
centered `BubbleLoader` and a `text-center text-body font-medium text-ink`
status line.

**Toast** (Sonner: `src/components/ui/sonner.tsx`, mounted once in
`RootLayout` as `<Toaster position="bottom-right" />`; call it with
`toast.success(...)` / `toast.error(...)` from `sonner`, never a custom
notification component). The wrapper themes it from next-themes and sets
`toastOptions.classNames.toast` = `rounded-card border-outline bg-overlay
text-fg shadow-float`, `description` = `text-fg` (the content, not muted),
`actionButton` = `rounded-full bg-btn-primary text-btn-primary-fg
font-semibold`, `cancelButton` = `rounded-full border border-outline
bg-control text-ink font-semibold`. Status icons (lucide, `h-4 w-4`) are
`CircleCheck text-positive`, `Info text-muted`, `TriangleAlert text-warning`,
`OctagonX text-negative`, `LoaderCircle animate-spin text-muted`. Sonner
provides `aria-live` and the dismiss behaviour; write toast copy in
sentence case and lead with the outcome ("Sharing link copied").

**Focus ring**: `globals.css` gives every element one keyboard outline,
`:focus-visible { outline: 2px solid rgb(var(--focus-ring)); outline-offset:
2px }` (a `[role='dialog']:focus` panel is exempt — the ring belongs on the
controls inside it). Icon buttons that draw their own ring (`Modal.css`
`.close-btn`): `focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2
focus-visible:ring-offset-{surface}`, where `{surface}` is the token the
button sits on (`overlay` for modals). `focus-ring` holds ≥ 3:1 on
`sheet`, `card`, `overlay` and `canvas` (light mode deepens it to `#0B7A72`);
`accent-soft` does not, so it is only ever the halo, never the ring. Don't
strip the outline without adding a ring.

**Empty state** (`src/app/app/list/components/EmptyList/index.tsx`): `flex
w-full flex-1 flex-col items-center justify-center rounded-card bg-card p-10
text-center`; heading `text-card-title text-ink`; body `mb-5 mt-1
text-body-sm text-muted`; a single primary `<CreateAppButton>` beneath.

**Vehicle simulator** (`src/app/app/list/components/VehicleSimulator/
VehicleSimulator.css`; reachable from license details → Vehicles tab →
"Vehicle simulator", inside a `Modal`): header `.title` = `text-panel-title
text-ink`; step labels `.vehicle-sim-step-label` = `text-label text-muted`
("01 — Region"); region / make tiles and model / year pills are toggled
controls: resting `bg-control hover:bg-highest`, selected = `bg-selected-bg
text-selected-fg hover:bg-selected-bg` (no mint, no white slab), disabled
`opacity-40`; the fleet list cards are `rounded-control border
border-outline bg-card`, stale ones `border-warning/40 bg-warning/10` with
the status colour only on the `ExclamationTriangleIcon`, and the busy overlay
`bg-scrim backdrop-blur-[2px]`.

**Vehicles** (`src/app/vehicles/**`, `src/components/{FreshnessDot,JsonBlock,
CollapsibleSection}`):

- **Source rail** (`SourceRail.tsx`): `rounded-card bg-card p-2`, group labels
  `text-label text-muted`, items `rounded-control px-3 py-2.5
hover:bg-control`, selected `bg-control shadow-selected` with
  `aria-current="true"`, devices nested in `ml-4 border-l border-outline
pl-2`. On a phone it is a `SelectWithChevron`.
- **Freshness dot** (`FreshnessDot.tsx`): the StatusChip dot without the chip;
  live glows (`shadow-[0_0_8px_var(--accent-soft-strong)]`), stale `bg-warning`,
  older `bg-negative`, none `bg-muted`; thresholds 1 h / 24 h in
  `utils/freshness.ts`.
- **Collapsible section** (`CollapsibleSection.tsx`): section card whose header
  button toggles the body; the chevron rotates 90°; the count is a neutral
  chip; actions sit outside the button and wrap below it on a phone.
- **Raw event row** (`RawDataTab.tsx`): a `button` grid row, expanded =
  `bg-control`, the body is `JsonBlock` (`rounded-control bg-control font-mono
text-code`, Prism tokens mapped to `sky`/`accent-ink`/`warning`/`muted`).
  Phones show time and type only.
- **Document card** (`DocumentsTab.tsx`): section card, title + type in mono,
  field grid with hairline rows, `Open scan` as a secondary button anchor.
- **Chart tokens**: `chart-1…6` are the only series colors; one series per
  small-multiple chart; grid `outline`, axes `muted`, tooltip on `overlay`.

**Monospace rule**: `font-mono text-code`, only for API keys, client ids,
JWTs, keys, CEL expressions, payloads and code views —
`src/components/CopyableRow/CopyableRow.css` = `rounded-control bg-control
px-3 py-2 font-mono text-code text-fg`. Token ids, VINs and counts stay in
Euclid (see Principle 4); do not add `font-mono` to them.

## Theming

Theme handling is `next-themes`, mounted in `RootLayout`:
`<ThemeProvider attribute="data-theme" defaultTheme="dark"
enableSystem={false}>` on an `<html suppressHydrationWarning>`. next-themes
injects its own pre-paint script, so a saved light theme never flashes dark;
there is no custom init script or context. The choice is stored in
`localStorage['theme']` (`'dark'` or `'light'`; the default storage key, so
existing users keep their setting) and applied as the `data-theme` attribute
on `<html>`. Read or change it with `useTheme()` from `next-themes`
(`{ theme, setTheme }`); `ThemeToggle` (sidebar item and the guest icon
button) is the only UI that calls `setTheme`. `Toaster` reads `useTheme()` too.
The literal `dark` class is not used anywhere (Tailwind's `darkMode` is
unset): never write `dark:` utilities, use the tokens, which already differ
per theme. Anything that renders outside the provider (`global-error.tsx`)
reads `localStorage['theme']` in a mount effect and sets
`document.documentElement.dataset.theme` itself.

The tokens are declared under `:root, :root[data-theme='dark']` and
`:root[data-theme='light']` in `globals.css`. Every CSS variable must exist
under both — `__tests__/unit/utils/tokens.test.ts` fails otherwise. The same
suite checks WCAG AA for `fg`/`ink`/`muted`/`accent-ink` over their surfaces,
status text on `sheet` and `card` and on its own 14% tint, `negative` error
text on `card`/`control`/`overlay`, `fg`/`muted` on each `status/10` tint over
`card`, `btn-primary-fg` on `btn-primary` (and its hover), `selected-fg` on
`selected-bg`, `on-accent` on both brand-gradient stops; and 3:1 non-text
contrast for the status colors on `card`/`control`/`overlay`,
`control-border` on `sheet`/`card`/`control`/`overlay`, `focus-ring` on
`sheet`/`card`/`overlay`/`canvas`, `accent` dots on `sheet`/`card`/`overlay`,
and the toggle knob (`on-accent`) on `accent`.

The shadcn names in `tailwind.config.ts` (`background`, `foreground`, `card`,
`popover`, `border`, `input`, `ring`, `destructive`, `muted-foreground`,
`sidebar`) are aliases onto these tokens with the same meaning, so primitives
under `src/components/ui` inherit the theme. `accent` means the Fleet mint
(live status only) and `muted` means secondary text — not shadcn's
accent-surface and muted-surface.

The palette is locked: `tailwind.config.ts` puts the Fleet tokens, the aliases
above, `transparent`, `current` and `inherit` in `theme.colors` (not
`theme.extend.colors`), so Tailwind's default palette (`white`, `black`,
`gray-*`, `red-*`, `blue-*` …) and the legacy names (`primary`, `secondary`,
`surface`, `cta`, `feedback`, `text`, `grey`, `dark-grey`, `dark`, `red`,
`text-secondary`) no longer exist. Tailwind does not fail on an unknown class
in `className`, it just emits nothing, so such a class renders unstyled;
`npm run visual:check` flags them. An `@apply` of one fails the build.

## Adoption status

Master's structure is kept (collapsible sectioned sidebar, Home shortcut grid,
`/licenses`, license-details tabs, configurator split panel with sticky
preview, hand-built breadcrumbs); only the look changes, page by page.
The port is done. Done and reflected above as code: tokens, the shell and sidebar, header
widgets, `Button`, `Card`, `Modal` (Radix), Sonner, form controls, `Table`,
`Title`, `StatusChip`, `CopyButton`, and the reference screens (Home,
`/licenses`, the license card, the empty state, the Create license modal, the
vehicle simulator). License details (tabs, breadcrumbs, every tab body), the
licensed-vehicles page, the renounce modal and the configurator (list, new,
edit, preview panel, permission cards), connections (list, details, create and
the purchase modal) and webhooks (list, create, edit, modals, CSV upload,
asset DID input, the generate-JWT modal), the template editor (gated; search,
new, edit, trim grid, banners), settings (user details, team management, the
invite and support modals) and the account information, buy DCX and support
form modals are done, as are the guest pages (sign-in, sign-up, email
recovery), support, the Vehicles section and the error pages, which apply the
selected-card recipe. No recipe is marked **target** any more. The palette is
locked (no temporary aliases remain). Not restyled, by design: the orphaned
components listed under "Don'ts" (only a mechanical token swap where a removed
color name would otherwise stop compiling). Settings keeps master's table
(no Status column, a pending invite still reads "(Pending)" after the name); the recipe itself is what the
shared component implements. Reported, not fixed: `getPageTitle` in
`src/config/navigation.ts` still title-cases some titles ("License Details") and its `/license/details/...` regexes no longer match the
real `/license/[tokenId]/details` route; casing is applied where the title is
matched statically.

## Don'ts

- No hex colors in components — only in `src/app/globals.css`,
  `GoogleIcon.tsx` (the one multi-color brand logo `check-tokens.sh`
  excludes by name), and stored data values marked `// token-check:allow`.
  `GitHubIcon.tsx` is not exempt and doesn't need to be — it already paints
  with `fill="currentColor"`, no hex literals. Checked by `npm run
visual:check`.
- No `uppercase`, no positive tracking (`tracking-wide*`,
  `tracking-[0.1em+]`); negative tracking comes only from the type scale.
  `font-mono` only on keys/ids/code (`text-code`), never on labels, badges,
  dates, counts or token ids.
- `npm run visual:check` (`scripts/visual/check-tokens.sh`) also flags every
  default Tailwind color ramp (`gray`, `slate`, `zinc`, `neutral`, `stone`,
  `blue`, `indigo`, `green`, `amber`, and the rest), not just the ones named
  in the class map below — if a class isn't a token class, assume it will
  fail the check.
- No white/black slabs: no `text-white`, `bg-white`, `bg-black`,
  `bg-black/50` (see "Legacy → token class map" below for replacements).
- No `dark:` utilities and no `dark` class; tokens switch by `data-theme`.
- No custom toast or notification component: use Sonner's `toast`.
- No teal for actions, links, hovers or selection — `accent` is the
  live-status colour (dots, `Toggle`, checkboxes, the `on` chip).
- No `bg-brand-gradient` on everyday buttons — only `variant="brand"` on the
  sign-in / sign-up / email-recovery submit, and `bg-progress-fill` for
  progress.
- Selection is inverse ink (`bg-selected-bg text-selected-fg`) or, for a
  card/row, `bg-control text-ink shadow-selected` — never a white slab or a
  mint tint, and hover must not drop it.
- Don't draw form controls with `border-outline`; use
  `border-control-border`.
- Don't hide a control until hover (`opacity-0 group-hover:opacity-100`) —
  touch screens have no hover.
- Don't stack two `variant="primary"` buttons on one surface.
- Don't write status in color on a card or tint (`text-positive`,
  `text-warning`, `text-warning/70` …): dot or icon in the status color, words
  in `text-fg`/`text-muted`. Only `text-negative` error text is exempt.
- Don't use `bg-selected-bg` for status — it means "selected".
- Don't restyle orphaned components (no importer outside tests:
  `OnboardingBanner`, `CollapsibleSection`, `AppCard`, `MultiCardOption`,
  `PaymentMethodSelector`, `TotalVehicleCount`, `VehicleTokenIdsInput`,
  `SpendingLimitModal`, `ui/label`, `ui/table`, `RightPanel`); delete or
  revive them deliberately.
- Icons paint with `currentColor` (`fill="currentColor"`, or inherit from an
  SVG library that already does); color them with a text class. `GoogleIcon`
  is the one exception — it keeps its fixed brand colors.

## Checking your work

```
npm run visual:dev                                    # start/attach the harness
npm run visual:shoot -- --label=<name> --only=<regex>  # screenshot routes, dark+light, desktop+mobile
npm run visual:check -- <paths…>                       # fail on legacy colors/hex/uppercase/tracking/legacy variants
```

Routes live in `scripts/visual/routes.mjs`; `--only` is a regex on the route
name. The ones for the reference screens: `app`, `app-mobile-menu`,
`app-collapsed`, `licenses`, `licenses-empty` (`noLicenses: true`, the
zero-license empty state), `licenses-create-modal`, `licenses-toast`, the Vehicles routes (`vehicles`,
`vehicle-summary`, `vehicle-device`, `vehicle-raw`, `vehicle-signals`,
`vehicle-trips`, `vehicle-documents`, `vehicle-sharing`, `vehicle-not-shared`;
`/api/data/*` is mocked by `scripts/visual/dataApi.mjs`); a
state pass adds routes such as `license-vehicle-simulator-selected` (toggled
tiles) or the `*-hover` routes (a `hover` selector rests the pointer on a
card next to a selected one). A route whose entry sets `knownConsoleWarning`
carries a console error that reproduces on untouched master (unrelated to
styling): the harness logs it as `known warning` instead of failing the shot.
Today that is the Suspense hydration mismatch on `/app` and `/settings` (the
waving-hand image; the pattern matches `waving-hand`, so if you change that
markup, update `APP_HYDRATION` in `routes.mjs` and prove `app` still passes)
and a controlled-input warning on the webhook form. A hydration error on any
other route is real and fails the shot: that one is yours to fix. Only an
uncaught page exception is written to
`scripts/visual/out/<label>/errors.json`; read both the console output and
`errors.json`, not just exit codes.

Look at the PNGs (dark and light, desktop and 390px mobile) against Fleet:
tonal cards without borders, ink titles, muted meta, one ink primary per
surface, no teal outside status, light mode readable, nothing overflowing at
390px.

To see a state that isn't already a route (e.g. a modal open, a menu
expanded, a form filled), add an entry to `ROUTES` in `routes.mjs`. Fields:
`name` (label for the PNG filename), `path`, `ready` (text to wait for
before shooting), `click` (selector, or array of selectors, to click after
load — e.g. to open a modal or menu), `fill` (`{selector: value}` map, filled
before any `click`), `after` (text to wait for once `click`/`fill` are done),
`viewports` (restrict to `['desktop']` or `['mobile']`), `guest` (skip the
authenticated-session cookies/storage for signed-out routes), `noLicenses`
(mock identity with zero developer licenses), `notShared` (identity's vehicle
has no SACD for a harness license and `/api/data/*` answers 403), and `knownHydrationError`
(only for a pre-existing race, with a one-line reason as the value — don't
add this to silence a hydration error your own change introduced).

## Legacy → token class map

These legacy names no longer exist in the palette (a class that uses one emits
nothing). Every restyle pass applies this map to the files it owns. Selected state is
inverse ink (see "Selected / toggled state"); the old mint `bg-selected` tint
is gone.

| Legacy                                                                                                                                   | Replace with                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `text-white`                                                                                                                             | `text-ink` for titles, values and emphasis; `text-fg` for body text                       |
| `text-black` (on white buttons/selected)                                                                                                 | handled by `Button` `variant`, or `text-selected-fg` on a toggled control                 |
| `bg-white` as button / selected fill                                                                                                     | `Button` `variant="primary"`; selected = `bg-selected-bg text-selected-fg`                |
| `bg-black`                                                                                                                               | `bg-canvas`                                                                               |
| `bg-black/50`, `bg-black bg-opacity-50`, `bg-black/60`                                                                                   | `bg-scrim`                                                                                |
| `text-text-secondary`, `text-grey-200…500`, `text-gray-400/500`, `text-white/50`, `text-[#BABABA]`, `text-neutral-500`, `text-[#6B6E6E]` | `text-muted`                                                                              |
| `text-grey-50/100`, `text-gray-900`                                                                                                      | `text-fg`                                                                                 |
| `bg-surface-default` inside the page                                                                                                     | `bg-card` (a panel on the sheet)                                                          |
| `bg-surface-raised`, `bg-[#201C1E]`                                                                                                      | `bg-card`                                                                                 |
| `bg-surface-sunken`, `bg-[#0A0508]`, `bg-[#141012]`                                                                                      | `bg-sheet` when it is a well inside a card; `bg-canvas` when it is behind everything      |
| `bg-cta-default`, `bg-[#322D2F]`, `bg-dark-grey-950`, `bg-dark-grey-800`                                                                 | `bg-control`                                                                              |
| `border-[#322D2F]`, `border-cta-default`, `border-t-cta-default`, `border-grey-950`, `border-surface-raised`, `divide-dark-grey-950`     | `border-outline` / `border-t-outline` / `divide-outline`                                  |
| `hover:border-white`, `hover:bg-gray-50`                                                                                                 | `hover:bg-highest` (tonal step, not a bright border)                                      |
| `bg-red-900` as highlight / selected                                                                                                     | `bg-selected-bg text-selected-fg`, or `bg-control shadow-selected` for a card/row         |
| `hover:bg-red-900`                                                                                                                       | `hover:bg-control`                                                                        |
| `text-red-400/500`, `text-feedback-error`, `ring-red-500`                                                                                | `text-negative` / `ring-negative`                                                         |
| `bg-feedback-error`                                                                                                                      | `bg-negative-soft text-negative`                                                          |
| `bg-feedback-success`, `text-green-400`                                                                                                  | `bg-positive` / `text-positive`                                                           |
| `text-primary-200/300`, `bg-primary-300`, `bg-primary-200/20`                                                                            | `text-ink` (links, emphasis) / `bg-accent` (live dots) / `bg-highest` (skeletons)         |
| `text-amber-500`, `border-amber-800/60`, `bg-amber-950/20`                                                                               | `text-warning`, `border-warning/40`, `bg-warning/10`                                      |
| `bg-[#124BDB]`, `bg-[#243647]`                                                                                                           | `bg-control`                                                                              |
| `fill-white`, `stroke-white`, `fill-grey-200`, `fill-white/50`                                                                           | `fill-current` / `stroke-current` plus a text color class (`text-muted`, `text-ink`)      |
| `font-black`                                                                                                                             | `font-semibold`, or the type-scale class the element is (`text-title`, `text-card-title`) |
| `text-2xl`/`text-3xl` page or section headings                                                                                           | `text-title`                                                                              |
| `text-lg`/`text-base` + bold card titles                                                                                                 | `text-card-title`                                                                         |
| `text-xs` meta, captions, table headers                                                                                                  | `text-label`                                                                              |
| `uppercase`, `tracking-wide*`, `tracking-[0.1em+]`, `capitalize` on headers                                                              | remove                                                                                    |
| `font-mono` on labels, badges, dates, counts, token ids                                                                                  | remove (keep only on keys/code, as `font-mono text-code`)                                 |
| `rounded-lg`/`rounded-md` on controls                                                                                                    | `rounded-control`                                                                         |
| `rounded-xl`/`rounded-2xl` on cards and panels                                                                                           | `rounded-card`                                                                            |
| modal / floating panel radius                                                                                                            | `rounded-panel` for modals; `rounded-control` for dropdown menus                          |
| small badges `rounded`                                                                                                                   | `rounded-chip`                                                                            |
| `shadow`, `shadow-lg`, `shadow-xl`                                                                                                       | `shadow-float` for floating things; none for cards                                        |
| focus `ring-indigo-500`, focus borders `border-white`                                                                                    | inputs: the form-control focus recipe; icon buttons: `ring-focus-ring`                    |
| input / select border `border-outline`                                                                                                   | `border-control-border hover:border-control-border-hover`                                 |
