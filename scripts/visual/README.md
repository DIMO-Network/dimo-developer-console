# Visual harness

Renders every console route against a local mock backend, for before/after
screenshots of styling work. Dev-only; nothing here ships.

    npm run visual:dev                      # mock :3001 + console :3000 (leave running)
    npm run visual:shoot -- --label=after   # all routes, dark+light, desktop+mobile
    npm run visual:shoot -- --label=wip --only='^license' --themes=light
    npm run visual:check -- src/app/license # legacy colors/casing in those paths
    npm run visual:shoot -- --label=dbg --only='^settings$' --debug  # browser errors

Output: scripts/visual/out/<label>/<route>--<theme>--<viewport>.png. A failed
shot is saved as \*.FAILED.png and the run exits 1.

Routes and the states they open (clicks, fills, the text each waits for) are
in `routes.mjs`; fixture data is in `fixtures.mjs` (restart `visual:dev` after
editing it, since the mock server reads it at startup).

`HARNESS_DCX=0 npm run visual:dev` makes the DCX balance zero, which shows the
onboarding banner on /app. Unhandled backend calls are logged by the mock as
`[mock] unhandled …`.
