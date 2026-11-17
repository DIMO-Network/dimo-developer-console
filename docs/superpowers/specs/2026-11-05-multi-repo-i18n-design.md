# Multi-repo i18n: Chinese, Japanese and Spanish everywhere

Date: 2026-11-05
Owner: James Li
Status: approved 2026-11-06

## Intent

Chinese OEMs are integrating with DIMO. Their engineers use the developer console, their decision-makers read dimo.org, and their drivers see Login with DIMO and the fleet apps. Each of those surfaces should read naturally in Simplified and Traditional Chinese.

While doing that, close the gaps between apps. Today dimo-login has Japanese and Spanish, and fleet-lite and parentos have Spanish. When this is done, every app in scope ships the same five languages.

The work is run as a graph: nodes are units of work one agent can finish and verify alone, and edges exist only where a node reads another node's output. Everything without a real edge runs in parallel through Claude Code's Workflow orchestration.

## Goals

- Every app in scope supports `en`, `es`, `ja`, `zh-Hans` and `zh-Hant`.
- Product terms read the same across apps, driven by one shared glossary.
- `zh-Hant` reads as Taiwan Traditional Chinese, not converted Simplified text.
- Each repo's existing tests and build prove its translations are complete (no missing keys, placeholders or tags).
- One PR per repo, each reviewable on its own.
- dimo.org's translated pages get indexed by Google in their own language, with Search Console reporting no hreflang, canonical or duplicate-page issues.

## Non-goals

- Translating the DIMO developer docs (`dimo-org/docs`, about 44k words) or the blog. Deferred.
- Translating dimo-org's `privacy.md` and `terms.md`. They stay English.
- Localizing server-side text: error messages from DIMO APIs, the sign-in code email, fleet-lite and parentos invitation emails (rendered by the tenancy API), Go API errors.
- Switching any repo's i18n library to match another.
- Right-to-left support or any locale beyond the five.

## Anti-goals

These would make the work a failure even if it technically ships.

- Rewriting shipped Spanish or Japanese copy. Existing `es` and `ja` strings are the source of truth for their terms. The glossary adopts them.
- Building copy from fragments ("Share" + count + "vehicles"). Word order differs; every message is a whole sentence with params.
- Translating protocol strings: event types, payload keys, error reasons posted to apps, on-chain aliases, log lines, Sentry messages.
- Translating brand, product, app, vehicle make/model names, or competitor names (DIMO, Login with DIMO, Smartcar, etc.).
- Offering a language in the console configurator or SDK before production dimo-login can render it.
- Changing URLs that already exist in the console (no locale prefix there).

## Scope

| App                  | Repo / path                                              | Library                    | Has today                 | Adds                                     |
| -------------------- | -------------------------------------------------------- | -------------------------- | ------------------------- | ---------------------------------------- |
| Login screens        | `dimo-login`                                             | i18next (keep)             | en, es, ja                | zh-Hans, zh-Hant                         |
| Login SDK            | `login-with-dimo/sdk`                                    | none needed                | passes `language` through | zh codes in `DimoLanguage` type and docs |
| Developer console    | `dimo-developer-console`                                 | next-intl (new)            | en                        | es, ja, zh-Hans, zh-Hant                 |
| Console configurator | `dimo-developer-console` `.../configurator/.../types.ts` | n/a                        | en, ja, es options        | zh-Hans, zh-Hant options                 |
| Marketing site       | `dimo-org/src/pages` plus navbar and footer              | Docusaurus i18n (built in) | en                        | es, ja, zh-Hans, zh-Hant                 |
| Fleet Lite web       | `dimo-monorepo/apps/fleet-lite/web`                      | lit-localize (keep)        | en, es                    | ja, zh-Hans, zh-Hant                     |
| ParentOS web         | `dimo-monorepo/apps/parentos/web`                        | lit-localize (keep)        | en, es                    | ja, zh-Hans, zh-Hant                     |

All repos were fast-forwarded to their default branch on 2026-11-05. Work starts from fresh feature branches off those heads.

## Decisions

Made by James:

- `zh-Hant` is written for Taiwan.
- James reviews `zh-Hans` and `zh-Hant`. Other team reviewers cover `es` and `ja`.
- The console uses next-intl. Other repos keep their current library.
- Privacy and terms on dimo-org stay English.
- dimo-org scope is the marketing pages under `src/pages`, not the docs.
- A shared translation memory across all apps, with translation still done per app.
- One workflow per run, split by group, rather than one large run.
- Translated legal and regulatory copy needs no sign-off beyond language review. This covers dimo-login's courtesy contract translation (`contract.*` keys, `TermsSheet.tsx`), the dimo-org compliance pages and the Smartcar comparison page.
- Translated dimo-org pages are indexed, and the work includes making them clean in Google Search Console.

Made by Claude (flagged for James to check):

- **Locale codes** are `zh-Hans` and `zh-Hant` everywhere (script subtags, not `zh-CN`/`zh-TW`), matching Docusaurus, lit-localize and BCP 47.
- **zh-Hant is translated from English**, not converted from zh-Hans. Conversion carries mainland vocabulary into Taiwan copy (登录 vs 登入, 软件 vs 軟體, 数据 vs 資料).
- **Console locale comes from a cookie, not the URL.** The console is behind sign-in and its URLs are shared in docs and support threads. next-intl's "without i18n routing" setup: cookie, then `Accept-Language`, then `en`.
- **Console messages are split by area** (one namespace file per route area) so extraction can run in parallel without agents editing the same JSON file.
- **The memory merges only same-meaning strings**, and takes strings used in 2+ apps or 3+ times in one app.
- **The memory is built after all extraction**, including the console's, so the two largest OEM-facing apps are in the pool.
- **Translation memory** lives at `dimo-developer-console/docs/i18n/translation-memory/`, next to the glossary.
- **Master glossary** lives at `dimo-developer-console/docs/i18n/glossary.md`. Each repo's i18n doc links to it.
- **dimo-login detects Chinese time zones** the same way it detects Japan: `Asia/Shanghai` → zh-Hans, `Asia/Taipei` and `Asia/Hong_Kong` → zh-Hant.
- **Chinese country lists sort by pinyin (zh-Hans) and stroke count (zh-Hant).**
- **Chinese review happens on a side-by-side sheet** (`key | en | zh-Hans | zh-Hant`) per app, plus the PR's preview deploy for in-context checks.

## Shared conventions

### Codes and matching

Every app normalizes incoming tags the same way (case-insensitive, `_` treated as `-`):

| Input                                             | Resolves to                                            |
| ------------------------------------------------- | ------------------------------------------------------ |
| `zh`, `zh-CN`, `zh-SG`, `zh-Hans`, `zh-Hans-*`    | `zh-Hans`                                              |
| `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, `zh-Hant-*` | `zh-Hant`                                              |
| `ja`, `ja-*`, `jp`                                | `ja`                                                   |
| `es`, `es-*`                                      | `es`                                                   |
| `en`, `en-*`                                      | `en`                                                   |
| anything else                                     | not supported, fall through to the next detection step |

Language switchers show each language in its own script: English, Español, 日本語, 简体中文, 繁體中文.

### Fonts

Where an app's brand font lacks CJK glyphs, add `:lang()` stacks that name the Linux and ChromeOS families too:

- zh-Hans: `"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif`
- zh-Hant: `"PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`

dimo-login's existing Japanese stack in `src/index.css` is the pattern.

### Writing rules (every translate node)

- Whole sentences with params. Plurals through each library's plural mechanism (Chinese and Japanese only need `other`).
- Placeholders, tags and ICU/i18next syntax stay byte-identical.
- Brand and product names stay English.
- Use glossary terms. If a term isn't in the glossary, add it to the node's "new terms" output instead of inventing silently.
- zh-Hant follows Taiwan usage and full-width punctuation (，。「」).
- zh-Hans follows mainland usage and full-width punctuation (，。“”).

### Glossary

`docs/i18n/glossary.md` in this repo. One table: `English | es | ja | zh-Hans | zh-Hant | notes`.

Seeded from:

1. dimo-login's Japanese glossary (`docs/i18n.md`).
2. Terms already shipped in dimo-login `es.ts`/`ja.ts` and the fleet-lite/parentos `es.xlf` files (these win on conflict).
3. Console and marketing vocabulary: developer license, client ID, API key, redirect URI, signer, webhook, connection, configuration, vehicle, permissions, telemetry, sign in, team, etc.

## Per-repo design

### dimo-login

Follow its own "Adding a language" guide in `docs/i18n.md`:

- Add `zh-Hans` and `zh-Hant` to `SUPPORTED_LANGUAGES` and `normalizeLanguage` in `src/i18n/language.ts`, per the matching table.
- Add the time zone rule next to the Japan one.
- Add `locales/zh-Hans.ts` and `locales/zh-Hant.ts`, typed as `LocaleResources`, and register them in `src/i18n/index.tsx`.
- Add both to `LanguageSwitcher`.
- Add font stacks in `src/index.css`.
- Add zh-Hans and zh-Hant to the per-language maps TypeScript will flag: `INTL_LOCALES` in `src/i18n/format.ts` and `COLLATION` in `src/utils/countries.ts`. Country lists sort by pinyin for zh-Hans and by stroke count for zh-Hant (the `Intl.Collator` defaults for each, and what readers in each market expect).
- Add both to the language list hard-coded in `src/i18n/__tests__/locales.test.ts`, or the parity test won't check them.
- Add zh-Hans and zh-Hant columns to the glossary section of `docs/i18n.md` (or link the master glossary) and update the "available in" sentence.

Done when `npm test` passes, including `src/i18n/__tests__/locales.test.ts` (key, param, tag and plural parity), and the build passes.

### login-with-dimo SDK

The SDK already forwards any `language` string, so this is types and docs:

- Extend `DimoLanguage` in `sdk/src/types/common.types.ts` to list `'es' | 'zh-Hans' | 'zh-Hant'` alongside `'en' | 'ja'`, and fix its doc comment (it still says only `en` and `ja`).
- Update `sdk/README.md`.

Done when the SDK builds and lints. Releases after dimo-login's zh support is live in production.

### Developer console

**Setup:**

- Install next-intl.
- Add `src/i18n/request.ts` resolving locale from the `NEXT_LOCALE` cookie, then `Accept-Language` via the matching table, then `en`.
- Split the root layout. `src/app/layout.ts` only re-exports `src/layouts/RootLayout/RootLayout.tsx`, which is `'use client'` and hard-codes `<html lang="en">`. Make the root layout a server component that calls `getLocale`/`getMessages`, sets `<html lang>`, and renders `NextIntlClientProvider` around the existing client providers.
- Add a language switcher that writes the cookie and refreshes, reachable from every signed-in page and from sign-in/sign-up.

**Messages:**

- One file per locale per area: `messages/<locale>/<area>.json`, merged in `request.ts`.
- Areas follow `src/app` route folders (`license`, `licenses`, `vehicles`, `settings`, `webhooks`, `connections`, `sign-in`, `sign-up`, `support`, `email-recovery`, `templates`, `app`), plus `common`.
- `common` owns `src/components` and the copy outside route folders: sidebar labels in `src/config/navigation.ts` and the labels and titles in `src/config`, `src/hooks`, `src/hoc` and `src/utils` (about 50).
- Each page's exported `metadata` title belongs to that page's route area (22 pages).
- Server components use `getTranslations`, client components use `useTranslations`.
- Dates and numbers go through next-intl's formatters.

**Extraction:** user-facing copy only. Exclude:

- GraphQL operation strings
- analytics event names
- Sentry messages
- values sent to APIs
- code samples the console generates for developers (the configurator's generated SDK snippet stays English code, but its surrounding labels translate)

**Tests:** there is no shared render helper (137 test files import `render` from Testing Library directly). Mock next-intl in `jest.setup.ts` so `useTranslations`/`getTranslations` resolve keys against the English message files. Existing assertions on English text keep passing without touching the 137 files. Snapshots may change only where markup changed. Add a parity test like dimo-login's: every locale has every key with the same params.

**Configurator:**

- Add `zh-Hans` and `zh-Hant` to `LOGIN_LANGUAGES` in `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts`.
- Add both to the options in `SignInWindowFields.tsx`.
- Extend `__tests__/unit/configurator/configuration.test.ts` the way #335 did for Spanish.
- Ship only after dimo-login zh is in production.

Done when `npm test`, `npm run lint`, `npm run lint:format`, `npx tsc --noEmit` and `npm run build` pass.

### dimo-org marketing site

**Config:**

- In `docusaurus.config.ts`: `i18n.locales: ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant']`.
- Set `localeConfigs` labels in each language's own script and `htmlLang`.

**Copy:**

- Wrap copy in `src/pages/**/*.tsx` with `<Translate id>` / `translate()`, including copy held in data arrays.
- Wrap the custom navbar (`src/components/CustomNavbar`) and swizzled footer (`src/theme/Footer`) copy.
- Add a locale dropdown to the custom navbar.
- Run `npm run write-translations -- --locale <code>` per locale, then translate `i18n/<code>/code.json` and the navbar/footer JSON.
- Markdown pages `about.md` and `contact.md` get localized copies under `i18n/<code>/docusaurus-plugin-content-pages/`. `privacy.md` and `terms.md` get none, so they fall back to English.

**Docs and blog** stay English. They must not be indexed as duplicates under locale prefixes, and no hreflang or sitemap entry may point at a docs or blog URL under a locale prefix. Builder picks the mechanism (excluding the docs/blog plugins from non-English builds and linking to the English docs, or `noindex` plus stripped alternates). Whichever is chosen must not break existing doc URLs, and `onBrokenLinks: 'throw'` must still pass.

**Search (indexed, Search Console clean):**

Docusaurus already emits `<link rel="canonical">` and hreflang alternates per locale, but 31 files in `src` (pages plus `ContentPageLayout`) override them through `<Head>` with hard-coded English URLs, `og:locale` `en_US` (3 files) and JSON-LD (24 files). Left as is, every translated page declares the English page canonical and Google drops it.

- **Canonical:** each translated page is canonical to itself (`https://dimo.org/<locale>/<path>`, no trailing slash, per `trailingSlash: false`). Build the URL from the current locale in one shared helper, not per page.
- **hreflang:** every translated page lists all five locales plus `x-default` → English, self-referencing and reciprocal. Values match `htmlLang`: `en`, `es`, `ja`, `zh-Hans`, `zh-Hant`. Pages with no translation (`privacy`, `terms`, docs, blog) list no alternates to locale URLs.
- **Open Graph:** `og:url` is the locale URL, `og:locale` is per locale (`en_US`, `es_ES`, `ja_JP`, `zh_CN`, `zh_TW`) with `og:locale:alternate` for the others. Titles and descriptions are translated.
- **Structured data:** JSON-LD `url`, `@id` and `inLanguage` are per locale. Translate `name`, `description` and FAQ text. Organization and product `@id` values stay shared across locales so Google sees one entity.
- **Sitemaps:** each locale build writes its own `sitemap.xml`. List all five in `static/robots.txt` (or add a sitemap index at `/sitemap.xml`) so Search Console discovers them. Sitemaps contain only indexable URLs.
- **`llms.txt` / `llms-full.txt`** stay English-only at the root.
- **Fonts:** CJK uses system font stacks, never a downloaded CJK webfont, so Largest Contentful Paint doesn't regress.
- **Check:** extend the completeness check to fail the build if a translated page's canonical, `og:url` or JSON-LD `url` points at a different locale, or if any hreflang target 404s or is `noindex`.

**After deploy (James, in Search Console):** submit the four new locale sitemaps, run URL Inspection on one page per locale to confirm Google picks the self canonical, and watch the Page indexing and hreflang reports for two weeks. Problems found there go back to the builder as fixes, not a new design.

**Build:**

- The `prebuild` scripts (`generate-llms-full`, `generate-mcp-index`) stay English-only and run once.
- Set `algolia.contextualSearch` (`docusaurus.config.ts`) to `false`. With it on, search filters by the current locale, and English-only docs would return nothing under the new locales.
- Branch from `origin/main`, not local `main`. Local `main` has 4 unrelated unpushed commits.
- Watch Vercel build time, since there are five locale builds now.

The Docusaurus build also falls back to English silently. Add a check that every key in `i18n/en/code.json` and the navbar/footer JSON has a translation in each locale's file, and run it in `npm run check-all`.

Done when `npm run check-all` (including that check) and `npm run build` pass for all locales.

### fleet-lite and parentos

Same change in both, with app-specific details:

**Locale wiring:**

- `lit-localize.json`: `targetLocales: ["es", "ja", "zh-Hans", "zh-Hant"]`.
- Run `lit-localize extract` to create the new `xliff/<code>.xlf` files, then translate them.
- `services/prefs-service.ts`: widen `Locale` to all five codes. Replace the two-way toggle with a picker, and replace `localeLabel` with a label map. Replace the `es`-only browser detection with the shared matching table.
- `elements/app-root.ts`: set any non-source locale, not only `'es'`. Also set `document.documentElement.lang` on every locale change. All six HTML entry files hard-code `lang="en"`, and the `:lang()` font stacks depend on it.

**Static pages:** `accept-invite.html` and `login.html` in both apps are static English HTML outside lit-localize (`accept-invite.ts` has no `msg()` calls). They are the first screen an invited driver sees, so they're in scope. Move their copy into `msg()` calls rendered by the page script, so `lit-localize extract` finds it.

**Login language:** `buildLoginUrl` (`fleet-lite/web/src/utils/dimo-permissions.ts`, and parentos's equivalent) passes the app's current locale as `language` to Login with DIMO. This creates a release-order edge: ship only after dimo-login's zh support is live.

**parentos Spanish gaps:** `parentos/web/xliff/es.xlf` has 46 of 381 units without a target. Fill them in this push (team review), so parentos actually ships all five languages.

**Completeness check:** `lit-localize build` falls back to English without failing. Add a check script per app that fails when any unit in any target `.xlf` lacks a target or drops a placeholder, and run it in the monorepo CI next to the existing sync check (`.github/workflows/checks.yml`).

**API validation:** fleet-lite `api/internal/controllers/user_prefs.go`: allow the new codes in the `locale` validator. parentos keeps locale in the browser only and its API has no locale validation, so nothing changes there.

**Invitation emails:** fleet-lite sends the inviter's locale to the tenancy API (`gateway/tenancy_api.go`). The tenancy API sends the Spanish template for `es` and English for anything else (`fleet-tenancy-api/internal/service/invitations.go`, checked at `182a68e`; re-confirm at current head). No mapping step needed. Localizing the emails is out of scope.

**Fonts:** if the brand font lacks CJK glyphs, add the font stacks.

Done when the completeness check, `lit-localize build`, `tsc` and lint pass in both apps, plus vitest and the Go tests in fleet-lite. parentos has no test script.

## The graph

### Nodes and edges

```
RUN 1 · shared
sync repos (done)
├── glossary
└── conventions (codes, matching, fonts)
        │
        ▼  James signs off

INLINE (no agents, done directly)
  dimo-login code changes · SDK types and docs · configurator options
  fleet-lite and parentos: add target locales, run lit-localize extract

RUN 2 · extract (reads conventions)
  dimo-org: config + wrap pages + locale-aware head (canonical, hreflang, OG, JSON-LD)
  console: setup (owns shared files)
           → common (owns src/components) ┐ parallel, disjoint
           → 6 batches of route areas     ┘ file ownership
             (each owns its route folders only)
        │
        ▼
RUN 3 · translation memory
  pool: every app's English strings → dedupe same-meaning strings
        → shared set, seeded with shipped es/ja translations
  translate shared set × 4 (es, ja, zh-Hans, zh-Hant)
        │
        ▼  review: zh by James · es/ja by team reviewers

RUNS 4-8 · one per app, all start together
  disambiguation: notes on that app's strings not in the memory
  translate × that app's new languages
    memory entries copied verbatim, only the rest is translated
  verify (that app's own test/build commands)
        │
        ▼
  consistency pass, one agent per app, started when its review starts
        │
        ▼
  review: zh by James, one app at a time · es/ja by team reviewers
        │
        ▼
  one PR per repo
```

### Translation memory

The memory makes the same English read the same way in every app. Translation still happens per app, so output stays small and reviewable one app at a time.

**Location:** `docs/i18n/translation-memory/` in this repo.

- `pool.json` has one entry per shared string: id, English text, a meaning note, and every app and key that uses it.
- `<locale>.json` maps entry id to the approved translation.

**Pool step (one agent):**

- Reads the English source of every app:
  - dimo-login `en.ts`
  - fleet-lite and parentos source messages
  - console `messages/en/*.json`
  - dimo-org's generated `i18n` JSON
- A string enters the memory if it's used in 2+ apps, or 3+ times within one app.
- **Same-meaning check:** identical English is merged into one entry only when it means the same thing in each place. The agent checks the component each string renders in. "Lock" as a fleet-lite action button and "Lock" as a dimo-login permission label become two entries, each with its own context note. Without this, the memory would force one translation onto two meanings.
- Shipped es and ja translations from dimo-login, fleet-lite and parentos pre-fill their entries and win over new translations.

**Memory translate (one agent per language):** fills that language's file using the glossary and the meaning notes. Shipped translations are kept as is.

**Memory review:**

- James reviews the zh entries, and the team reviewers review es and ja.
- An app's translate node for a language only needs that language's memory approved.
- In practice, app runs start once all four are approved, unless one review is lagging.

**Use in app runs:**

- Translate nodes copy approved memory entries verbatim for every key the pool mapped, and translate only the remaining strings.
- If review of an app changes a memory entry, the change is written back to the memory and every app already using that entry.

**Review order:** memory first, then dimo-login, parentos, fleet-lite, dimo-org, console. Smallest app first, and dimo-login gates the SDK and configurator release. Each consistency pass reads the earlier apps' approved translations, so this order is a real edge.

**Edges kept** (a node reads another's output):

- conventions → extraction
- every app's English source → memory pool → memory translate → memory review → app translate nodes
- glossary → memory translate, app translate nodes, consistency passes
- an app's English source → its disambiguation → its translate nodes
- console setup → common and area extracts
- translate → verify → consistency pass → review
- earlier apps' approved translations → later apps' consistency pass
- dimo-login → SDK and configurator (release order)

**Edges cut** (no read, no wait):

- app runs 4-8 don't wait on each other
- languages don't wait on each other, and zh-Hant doesn't wait on zh-Hans
- an app's translation in one language doesn't wait on another language's memory review
- console area extracts don't wait on each other, because file ownership is disjoint
- app runs don't wait on app reviews. Only the consistency pass does, and it runs outside the runs.

### Costs of running this as a graph, and what offsets them

| Cost                                                                                               | Offset in this design                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Parallel translators drift, and the same English gets different translations in different apps     | Shared translation memory, translated and reviewed once before any app run. Glossary up front. A consistency pass per app before review. |
| The memory forces one translation onto two different meanings of the same English                  | The pool merges only same-meaning strings and keeps a context note on each entry.                                                        |
| Every app run waits for the memory, which waits for console extraction                             | Extraction is one parallel run and memory review is short. Review, not generation, is the bottleneck either way.                         |
| An ambiguous string ("Lock", noun or verb) gets resolved differently by each language's translator | Disambiguation node per app, plus meaning notes in the memory. Every translator reads the same notes.                                    |
| Subagents see their brief, not the screen, so they miss UI role and space limits                   | Disambiguation notes record UI role and space limits from the component code.                                                            |
| zh review is one person (~3,000 strings per language)                                              | Memory entries are approved once for all apps. App reviews cover only app-specific strings, one app at a time.                           |
| Parallel console extraction collides on shared files                                               | Setup node owns root layout, provider and Jest helper. Common node owns `src/components`. Area nodes edit only their route folder.       |
| Orchestration overhead on tiny tasks                                                               | dimo-login code, SDK, configurator and lit-localize extraction are done inline.                                                          |
| More tokens, and failures read as confidently as successes                                         | The orchestrator re-runs each node's `done` command instead of trusting summaries.                                                       |

### Execution

- Each run is its own Claude Code Workflow. All of them stay under the default workflow size guideline (under 10 agents), so no `/config` change is needed. Runs are small enough to watch, resume, or stop without touching the others.

| Run | Group              | Nodes                                           | Agents | Starts after   |
| --- | ------------------ | ----------------------------------------------- | ------ | -------------- |
| 1   | Shared             | glossary, conventions                           | 2      | now            |
| 2   | Extract            | dimo-org; console setup, common, 6 area batches | 9      | run 1 sign-off |
| 3   | Translation memory | pool, translate ×4                              | 5      | run 2          |
| 4   | dimo-login         | disambiguate, translate ×2                      | 3      | memory review  |
| 5   | parentos           | disambiguate, translate ×3                      | 4      | memory review  |
| 6   | fleet-lite         | disambiguate, translate ×3                      | 4      | memory review  |
| 7   | dimo-org           | disambiguate, translate ×4                      | 5      | memory review  |
| 8   | console            | disambiguate, translate ×4                      | 5      | memory review  |

- Inline work (dimo-login code, SDK, configurator, lit-localize locales and extraction) happens after run 1's sign-off, before run 3, since the pool reads fleet-lite and parentos source strings.
- **The consistency pass is not inside the runs.** It's a single agent started right before James reviews an app, so it reads every translation approved up to that point. Putting it inside the runs would make later runs wait on earlier reviews.
- Branch per repo: `feat/i18n-zh` (or the repo's naming convention). DIMO-Network commits use `james.li.upenn@gmail.com`.

### Node contract

Every node's brief states:

- **reads:** exact input files (glossary, translation memory, source messages, an existing locale file as the shape reference)
- **writes:** exact output files, and nothing else
- **rules:** the writing rules above, plus any app-specific exclusions
- **done:** the command that proves it, which the orchestrator re-runs instead of trusting the agent's summary
- **new terms:** any term not in the glossary, returned for James to add

## Review and release

**Review:**

- **Memory first.** James reviews the memory's zh-Hans and zh-Hant entries, and the team reviewers review es and ja. Approved entries aren't re-reviewed inside apps.
- **Then apps, one at a time.** James reviews each app's remaining zh-Hans and zh-Hant strings in the review order, on the per-app side-by-side sheet and the PR preview.
- **Team reviewers** review new `es` and `ja` strings outside the memory: the console and dimo-org, plus `ja` for fleet-lite and parentos. Existing shipped `es`/`ja` copy isn't re-reviewed.
- **Changes flow back.** Glossary or memory changes from review go into the master files and any app already translated with the old wording.

**Release order:**

1. dimo-login (zh live in production)
2. SDK release and console configurator options
3. Everything else in any order. dimo-org is followed by the Search Console steps above.

## Left to the builder

- Exact console switcher placement and look, within "reachable from every page".
- How dimo-org keeps untranslated docs out of search indexes, within the constraints above.
- Whether dimo-org lists locale sitemaps in `robots.txt` or a sitemap index.
- Message key naming inside each app, following each repo's existing convention (dimo-login uses flat dot-namespaced snake_case).
- Whether to add a lint rule against hard-coded JSX strings in the console after extraction.
- How to batch the workflow into runs.
