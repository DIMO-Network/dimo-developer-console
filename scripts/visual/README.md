# Visual harness

Renders every console route against a local mock backend, for before/after
screenshots of styling work. Dev-only; nothing here ships.

    npm run visual:dev                      # mock :3001 + console :3000 (leave running)
    npm run visual:shoot -- --label=after   # all routes, dark+light, desktop+mobile
    npm run visual:shoot -- --label=wip --only='^license' --themes=light
    npm run visual:check -- src/app/license # legacy colors/casing in those paths
    npm run visual:shoot -- --label=dbg --only='^settings$' --debug  # browser errors

Output: scripts/visual/out/<label>/<route>--<theme>--<viewport>.png. A failed
shot is saved as \*.FAILED.png and the run exits 1. Every browser page error is
written to out/<label>/errors.json, for diffing against the baseline.

## Theme

The console uses next-themes with its default storage key, `theme`, and
defaults to dark. `shoot.mjs` seeds `localStorage.theme` (`dark` or `light`)
before the page loads, so both themes are explicit. The attribute next-themes
writes on `<html>` (`class` on master, `data-theme` after the Fleet port) does
not matter to the harness.

## Routes

Routes and the states they open (clicks, fills, the text each waits for) are
in `routes.mjs`; fixture data is in `fixtures.mjs` (restart `visual:dev` after
editing it, since the mock server reads it at startup). Groups:

- Home `/app` (shortcut grid), account info modal, mobile menu.
- `/licenses` (license cards), empty state, create modal, Sonner toast (copy
  sharing link).
- License details `/license/[tokenId]/details`: Overview (default), and one state
  per client-side tab (`-config`, `-vehicles`, `-brand`, `-brand-form`), rename
  modal, vehicle simulator.
- Configurator: list (+ Sonner toast), new (split panel with the live preview
  column), permission selection and hover, edit.
- Licensed vehicles `/license/vehicles/[clientId]` and its Renounce modal (opened
  from the row's actions menu; confirming is not clicked).
- Vehicles `/vehicles` and the vehicle page (summary, device, raw, raw on a
  device, signals, trips, trips without the location privilege, documents,
  sharing, not-shared); `/api/data/*` is mocked by `dataApi.mjs`. Device
  queries arrive as the vehicle DID with `filter.producer`, and the fixtures
  answer per producer; a route's `dataErrors` makes the named operations
  answer 200 with `data: null` and a privilege error.
- Connections, webhooks, templates (the harness sets
  `NEXT_PUBLIC_TEMPLATE_EDITOR_ENABLED=true`; production has it off),
  settings, support, and the guest pages (sign-in, sign-up flows, email
  recovery). `not-found` is Next's built-in 404.

There is no add-credits state: master has that button commented out.

## Known dev-overlay issues

A shot fails (without a retry) on a hydration mismatch or when Next's dev
overlay shows an error dialog or issue count. Routes whose issue reproduces on
untouched master carry `knownConsoleWarning` (the reason) in `routes.mjs`; theirs
is logged instead. On master: `/app` and `/settings` (Suspense hydrates after the
user query resolves) and the webhook create/edit forms (a React "value without
onChange" warning, not hydration).

`HARNESS_DCX=0 npm run visual:dev` makes the DCX balance zero. Unhandled backend
calls are logged by the mock as `[mock] unhandled ...`.

## Token check

`npm run visual:check -- <paths>` reports legacy palette classes, hex literals,
`hsl(var(--x))` usages, the forced `dark` class, uppercase/tracking, legacy
button variants and removed fonts. On master before the Fleet port it reports
many hits; that is the baseline (`out/before/check-tokens.txt`). Shadcn alias
names kept by the port (background, foreground, card, popover, sidebar, border,
input, ring, destructive, muted-foreground) are allowed.
