# Multi-repo i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tasks marked **[Run N]** are nodes of a Claude Code Workflow; load the `workflow-authoring` skill before writing that run's script.

**Goal:** Ship `en`, `es`, `ja`, `zh-Hans` and `zh-Hant` in dimo-login, the login SDK types, the developer console, dimo.org's marketing pages, fleet-lite and parentos.

**Architecture:** Each repo keeps its own i18n library (i18next, next-intl, Docusaurus i18n, lit-localize). Language detection follows one matching table. Code changes land first, then English is extracted. A shared translation memory in this repo pins strings used across apps. Each app is then translated as its own workflow run and reviewed one app at a time.

**Tech Stack:**
- dimo-login: React, i18next, vitest
- Console: Next.js 16 App Router, next-intl 4, Jest 30
- dimo.org: Docusaurus 3, `node --test`
- fleet-lite and parentos: Lit, `@lit/localize` runtime mode, vitest, Go
- Translation tools: Node 24 `.mjs` scripts

**Spec:** `docs/superpowers/specs/2026-11-05-multi-repo-i18n-design.md`

## Global Constraints

- Locale codes everywhere: `en`, `es`, `ja`, `zh-Hans`, `zh-Hant`. Never `zh-CN`/`zh-TW` as an app code. The only exception is `og:locale`.
- Matching (case-insensitive, `_` → `-`): `zh`, `zh-CN`, `zh-SG`, `zh-Hans`, `zh-Hans-*` → `zh-Hans`; `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, `zh-Hant-*` → `zh-Hant`; `ja`, `ja-*`, `jp` → `ja`; `es`, `es-*` → `es`; `en`, `en-*` → `en`; anything else → unsupported, try the next detection step.
- Native labels: `English`, `Español`, `日本語`, `简体中文`, `繁體中文`.
- Fonts: zh-Hans `"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif`; zh-Hant `"PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`. No downloaded CJK webfont.
- Writing rules for every translation: whole sentences with params. Placeholders, tags and ICU/i18next syntax stay byte-identical. Brand, product, app, vehicle and competitor names stay English. Use glossary terms and report new ones. zh-Hant follows Taiwan usage, with `，。「」`. zh-Hans follows mainland usage, with `，。“”`. Chinese and Japanese plurals use `other` only.
- Never translate protocol strings, GraphQL operations, analytics event names, Sentry messages, values sent to APIs, or generated code samples.
- Shipped `es`/`ja` copy is not rewritten. It seeds the glossary and memory, and wins on conflict.
- `privacy.md` and `terms.md` on dimo.org stay English. dimo-org docs and blog stay English and are never indexed under a locale prefix.
- Release order:
  1. dimo-login zh in production
  2. Then the SDK release, the console configurator options, and the fleet-lite/parentos `language` param
  3. Everything else in any order
- Branch `feat/i18n-zh` in every repo. dimo-org branches from `origin/main`. Commits use `git -c user.email=james.li.upenn@gmail.com` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never force push, never amend pushed commits.
- Each workflow run stays under 10 agents.

## Review Focus

1. **Real-world Accept-Language headers.** `zh-CN,zh;q=0.9,en;q=0.8` and `en;q=0.5, ja;q=0.9` should pick zh-Hans and ja by q-value, not by header order. Test: Task 9.
2. **Stale or junk saved locale.** A `NEXT_LOCALE=fr` cookie, or a localStorage `fleet-lite:locale` of `xx`, should fall through to detection, not crash or stay stuck. Tests: Task 9, Task 6.
3. **Preference synced from another device.** fleet-lite's server-stored `locale: "zh-Hant"` must survive the API's `sanitize` and be accepted by `getLocale()`. Tests: Task 6, Task 7.
4. **Plural messages in zh/ja that have only `other`, and a param missing from a translation.** These should render, and the parity tests should reject a dropped `{count}`. Tests: Task 9 parity test, Task 4 locales test.
5. **English-only routes under a locale build.** `/zh-Hans/...` links to docs, blog, privacy or terms must not 404 and must not appear in hreflang or sitemaps. Test: Task 13 SEO check.

---

## Phase 0: Shared foundations

### Task 1 [Run 1]: Glossary and conventions

Run 1 is a Workflow with two agents, glossary and conventions, in parallel.

**Files:**
- Create: `docs/i18n/glossary.md`, `docs/i18n/README.md` (conventions)

**Interfaces:**
- Produces:
  - `docs/i18n/glossary.md`: one table, `English | es | ja | zh-Hans | zh-Hant | notes`, sorted by English.
  - `docs/i18n/README.md`: the matching table, native labels, font stacks, writing rules and per-repo pointers, copied from the Global Constraints above.

- [ ] **Step 1: Glossary node.** Reads, in priority order:
  1. dimo-login `docs/i18n.md` (Japanese glossary)
  2. dimo-login `src/i18n/locales/{es,ja}.ts`
  3. `dimo-monorepo/apps/{fleet-lite,parentos}/web/xliff/es.xlf`
  4. Spec "Glossary" item 3's console and marketing terms

  Writes `glossary.md` only. A term with conflicting shipped translations keeps dimo-login's and records the other in `notes`.
- [ ] **Step 2: Conventions node.** Writes `README.md` only.
- [ ] **Step 3: Verify.** Run `grep -c '^|' docs/i18n/glossary.md`. Expected: at least 60 rows. Every row has 6 cells.
- [ ] **Step 4: Commit both files.** Message: `docs(i18n): add shared glossary and conventions`.
- [ ] **Step 5: Gate.** James signs off on the glossary's zh columns before Run 2 and Phase 1 start.

### Task 2: Translation tools

**Files:**
- Create:
  - `docs/i18n/tools/strings.mjs`
  - `docs/i18n/tools/sheet.mjs`
  - `docs/i18n/tools/check-memory.mjs`
  - `docs/i18n/tools/strings.test.mjs`
- Fixtures: `docs/i18n/tools/fixtures/` (one tiny `en.ts`, `es.xlf`, `messages/en/a.json`, `code.json`)

**Interfaces:**
- Produces:
  - `readStrings(app: 'dimo-login'|'console'|'dimo-org'|'fleet-lite'|'parentos', locale: string, root = process.env.DIMO_ROOT ?? '..'): Promise<Map<string, string>>`. Key format per app:
    - dimo-login: the flat key, e.g. `app.language`
    - console: `<area>.<dotted.path>`
    - dimo-org: the `code.json` id, plus `navbar.*`/`footer.*` ids
    - lit apps: the xlf unit id
  - For lit apps, `en` reads `<source>` and other locales read `<target>`. A unit with no target is absent from the map.
  - `sheet.mjs --app <app> --locales zh-Hans,zh-Hant` writes `docs/i18n/review/<app>.<locales joined by +>.csv`, columns `key,en,<locales…>`, keys sorted.
  - `check-memory.mjs --app <app> --locale <code>` exits 1 and lists keys where an approved memory entry mapped to that key differs from the app's translation.

- [ ] **Step 1: Write failing tests** in `strings.test.mjs`:
  - `readStrings` on each fixture returns the expected `Map` entries.
  - dimo-login reads a `.ts` locale via Node 24 type stripping.
  - xlf `<x id="0"/>` placeholders are returned verbatim.
  - console keys are `area.nested.key`.
  - A missing xlf target is absent from the map.
- [ ] **Step 2: Run the tests and see them fail.** Run `node --test docs/i18n/tools`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement the three scripts.** Parse xlf with a regex over `<trans-unit id="…">`. No XML dependency.
- [ ] **Step 4: Run the tests and see them pass.** Run `node --test docs/i18n/tools`. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(i18n): add string reader, review sheet and memory check tools`.

---

## Phase 1: Inline code (after the Task 1 gate, no agents)

### Task 3: dimo-login language detection, formats and switcher

**Files:**
- Modify:
  - `dimo-login/src/i18n/language.ts`
  - `dimo-login/src/i18n/format.ts:8`
  - `dimo-login/src/utils/countries.ts:12`
  - `dimo-login/src/components/Shell/LanguageSwitcher.tsx` (`NATIVE_NAMES`)
  - `dimo-login/src/index.css` (after the `html:lang(ja)` block, ~line 287)
  - `dimo-login/docs/i18n.md`
- Test: `dimo-login/src/i18n/__tests__/locales.test.ts`

**Interfaces:**
- Produces:
  - `SUPPORTED_LANGUAGES = ['en', 'ja', 'es', 'zh-Hans', 'zh-Hant'] as const`
  - `normalizeLanguage` implements the full matching table.
  - `TIME_ZONE_LANGUAGES: Record<string, Language> = { 'Asia/Tokyo': 'ja', 'Asia/Shanghai': 'zh-Hans', 'Asia/Taipei': 'zh-Hant', 'Asia/Hong_Kong': 'zh-Hant' }` replaces `JAPAN_TIME_ZONES`.

- [ ] **Step 1: Add failing tests** to `describe('language')`:
  ```ts
  it('reads Chinese tags by script and region', () => {
    for (const tag of ['zh', 'zh-CN', 'zh_sg', 'zh-Hans', 'zh-Hans-CN']) expect(normalizeLanguage(tag)).toBe('zh-Hans');
    for (const tag of ['zh-TW', 'zh-hk', 'ZH_MO', 'zh-Hant', 'zh-Hant-TW']) expect(normalizeLanguage(tag)).toBe('zh-Hant');
  });
  it('shows Chinese by browser, then by time zone', () => {
    setBrowser(['zh-TW', 'en-US'], 'America/Los_Angeles');
    expect(resolveLanguage({})).toBe('zh-Hant');
    setBrowser(['en-US'], 'Asia/Shanghai');
    expect(resolveLanguage({})).toBe('zh-Hans');
    setBrowser(['en-US'], 'Asia/Taipei');
    expect(resolveLanguage({})).toBe('zh-Hant');
    expect(resolveLanguage({ configured: 'zh-TW' })).toBe('zh-Hant');
  });
  ```
  Also test that `getCountryOptions('zh-Hant')` sorts with the `zh-Hant-TW` collator: `new Intl.Collator('zh-Hant-TW').compare` is the reference.
- [ ] **Step 2: Run the tests and see them fail.** Run `npx vitest run src/i18n/__tests__/locales.test.ts`. Expected: the new cases fail.
- [ ] **Step 3: Implement the detection changes.**
  - `INTL_LOCALES` and `COLLATION` gain `'zh-Hans': 'zh-Hans-CN'` and `'zh-Hant': 'zh-Hant-TW'`. Those are the pinyin and stroke defaults.
  - `NATIVE_NAMES` gains `'zh-Hans': '简体中文'` and `'zh-Hant': '繁體中文'`.
  - Add `html:lang(zh-Hans), [lang='zh-Hans']` and `html:lang(zh-Hant), [lang='zh-Hant']` font blocks, mirroring the ja block: `'Euclid Circular A'`, then the Global Constraints stack.
  - Extend `:lang(ja) :is(h1…)` `word-break` and the `.text-title` letter-spacing override to `:lang(zh)`.
  - Update the header comment in `language.ts` and the `docs/i18n.md` "available in" sentence.
  - In `docs/i18n.md`, link the master glossary (`dimo-developer-console/docs/i18n/glossary.md`) above the Japanese glossary section.
- [ ] **Step 4: Run the tests and see them pass.** Run `npm test && npm run build`. Expected: PASS. Until Task 15 registers the locale files, choosing zh falls back to English. Don't push the branch before then.
- [ ] **Step 5: Commit.** Message: `feat(i18n): detect Simplified and Traditional Chinese`.

### Task 4: Login SDK types and docs

**Files:**
- Modify:
  - `login-with-dimo/sdk/src/types/common.types.ts:17-23`
  - `login-with-dimo/sdk/README.md` (lines 44, 53-58, 246, 269, 371)

- [ ] **Step 1: Change the type.** Set `export type DimoLanguage = 'en' | 'es' | 'ja' | 'zh-Hans' | 'zh-Hant' | (string & {});`. The doc comment lists all five and says `zh-CN`/`zh-TW` and similar tags are matched.
- [ ] **Step 2: Update the README.** Every `'en' \| 'ja'` lists the five codes. Rewrite the detection paragraph at line 58: browser language first, then a Japan, China, Taiwan or Hong Kong time zone.
- [ ] **Step 3: Verify.** Run `cd sdk && npm test && npm run build`. Expected: exit 0.
- [ ] **Step 4: Commit.** Message: `feat(sdk): list Spanish and Chinese login languages`. Release only after dimo-login zh is in production.

### Task 5: Console configurator language options

**Files:**
- Modify:
  - `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts:16`
  - `.../ConfigurationForm/SignInWindowFields.tsx:18-19, 50-52`
- Test: `__tests__/unit/configurator/configuration.test.ts`

- [ ] **Step 1: Write the failing test.**
  ```ts
  it.each(['zh-Hans', 'zh-Hant'] as const)('keeps %s through saving, loading and the snippet', (language) => {
    const saved = buildConfiguration(share({ language }));
    expect(saved).toMatchObject({ language });
    expect(toFormValues(saved, meta).language).toBe(language);
    expect(buildSnippet(share({ language }), '0xclient')).toContain(`    language: '${language}',`);
  });
  ```
- [ ] **Step 2: Run the test and see it fail.** Run `npx jest __tests__/unit/configurator/configuration.test.ts`. Expected: a type or value failure.
- [ ] **Step 3: Implement.**
  - `LOGIN_LANGUAGES = ['', 'en', 'ja', 'es', 'zh-Hans', 'zh-Hant'] as const`.
  - Options `{ value: 'zh-Hans', label: '简体中文' }` and `{ value: 'zh-Hant', label: '繁體中文' }`.
  - Help text: "When matching, browsers set to Japanese, Spanish or Chinese get that language. Japan, China, Taiwan and Hong Kong time zones get theirs, and everyone else gets English. Users can always switch."
- [ ] **Step 4: Run the test and see it pass.** Run `npx jest __tests__/unit/configurator`. Expected: PASS. Update the configurator snapshot only if the help text is in one.
- [ ] **Step 5: Commit.** Message: `feat(configurator): offer Chinese sign-in languages`. Hold the merge until dimo-login zh is live.

### Task 6: Shared locale matching for the lit apps

**Files:**
- Create:
  - `dimo-monorepo/packages/web-core/src/utils/locale.ts`
  - Test: `dimo-monorepo/apps/fleet-lite/web/src/utils/locale.test.ts` (web-core has no test runner; fleet-lite's vitest already tests web-core utils)

**Interfaces:**
- Produces, from `@dimo/web-core/utils/locale`:
  - `APP_LOCALES = ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant'] as const`
  - `type AppLocale`
  - `LOCALE_LABELS: Record<AppLocale, string>` (the native labels)
  - `matchLocale(tag: string | null | undefined): AppLocale | undefined`
  - `detectLocale(languages: readonly string[]): AppLocale` (first match, else `'en'`)

- [ ] **Step 1: Write failing tests.** Cover every row of the matching table, plus:
  - `matchLocale('xx')`, `matchLocale(null)` and `matchLocale('')` return `undefined`.
  - `detectLocale(['fr-FR', 'zh-HK'])` returns `'zh-Hant'`.
  - `detectLocale([])` returns `'en'`.
- [ ] **Step 2: Run the tests and see them fail.** Run `cd apps/fleet-lite/web && npx vitest run src/utils/locale.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `locale.ts`.
- [ ] **Step 4: Run the tests and see them pass.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(web-core): shared locale matching for the lit apps`.

### Task 7: Lit apps locale wiring (fleet-lite and parentos)

**Files** (both apps):
- Modify:
  - `web/src/services/prefs-service.ts`
  - `web/src/elements/app-root.ts:107-116`
  - `web/src/views/account-settings.ts` (language row)
  - `web/lit-localize.json`
  - `web/src/index.css` or `global-styles.ts` (wherever the brand font is declared)
- fleet-lite only:
  - Modify: `api/internal/controllers/user_prefs.go:26`
  - Test: `api/internal/controllers/user_prefs_test.go` (create)
- Test: `apps/fleet-lite/web/src/services/prefs-service.test.ts` (create)

**Interfaces:**
- Consumes: Task 6's `AppLocale`, `matchLocale`, `detectLocale`, `LOCALE_LABELS`.
- Produces:
  - `export type Locale = AppLocale`
  - `PrefsService.getLocale(): Locale`, which is `matchLocale(saved) ?? detectLocale(navigator.languages)`
  - `PrefsService.setLocale(l: Locale): void`
  - `localeLabel(l)` returns `LOCALE_LABELS[l]`
  - `toggleLocale` is removed.
  - `applyLocale(l: Locale): Promise<void>` in `web/src/localization.ts`. It calls lit `setLocale(l)` and sets `document.documentElement.lang = l`.

- [ ] **Step 1: Write failing tests.**
  - Web: a saved `'zh-Hant'` is returned. A saved `'xx'` falls back to `navigator.languages` detection. `['ja-JP']` gives `'ja'`.
  - Go: `TestSanitizeLocale` keeps each of the five codes and drops `"fr"`.
- [ ] **Step 2: Run the tests and see them fail.** Run `cd apps/fleet-lite/web && npx vitest run src/services/prefs-service.test.ts`, then `cd apps/fleet-lite/api && go test ./internal/controllers -run TestSanitizeLocale`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `allowedPrefs["locale"]` lists the five codes.
  - `app-root` awaits `applyLocale(locale)` for every locale. The source locale still sets `lang`.
  - The account-settings language row opens a picker: a `<select>` or the app's existing sheet/menu component, listing `APP_LOCALES` with `LOCALE_LABELS`. Choosing one calls `setLocale`, then `applyLocale`, then reloads.
  - `lit-localize.json` `targetLocales: ["es", "ja", "zh-Hans", "zh-Hant"]`.
  - Add the CJK font stacks under `:lang(zh-Hans)` and `:lang(zh-Hant)` if the brand font is Latin-only.
- [ ] **Step 4: Run the tests and see them pass.** Re-run Step 2's commands, then `npm run lint:check && npx tsc --noEmit` in both web apps. Expected: PASS.
- [ ] **Step 5: Commit.** Message: `feat(fleet-lite,parentos): pick any of five languages and set the page lang`.

### Task 8: Static invite and login pages, login language, completeness check

**Files** (both apps):
- Modify:
  - `web/accept-invite.html` and `web/src/accept-invite.ts`: move visible copy into `msg()` and render it from the script
  - `web/login.html`: move the inline module's copy and visible text into a new `web/src/login-page.ts` that uses `msg()`
  - fleet-lite `web/src/utils/dimo-permissions.ts:135-143`: `buildLoginUrl` adds `language`
  - parentos `web/src/elements/login-element.ts:74`: inline URL adds `&language=…`
- Create: `scripts/check-xliff.mjs` at the monorepo root
- Test:
  - `scripts/check-xliff.test.mjs`
  - `apps/fleet-lite/web/src/utils/dimo-permissions.test.ts` (extend)
- Modify: `.github/workflows/checks.yml:135-141`, adding a step after the drift check

**Interfaces:**
- Consumes: Task 7's `PrefsService.getLocale()` and `applyLocale`.
- Produces:
  - `DimoGrantUrlOptions.language?: string`. `buildLoginUrl` sets `language` when given.
  - `node scripts/check-xliff.mjs <xliffDir>` exits 1 and prints `file:unit-id reason` for each unit that has a missing or empty `<target>`, or whose `<x id>` set differs from `<source>`'s.

- [ ] **Step 1: Write failing tests.**
  - `buildLoginUrl({…, language: 'zh-Hant'})` has `language=zh-Hant`. Without `language`, there's no param.
  - `check-xliff` against fixture files reports a missing target and a dropped `<x id="1"/>`, and passes on a clean file.
- [ ] **Step 2: Run the tests and see them fail.** Run `npx vitest run src/utils/dimo-permissions.test.ts` in fleet-lite/web, then `node --test scripts/check-xliff.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Both static pages call `applyLocale(PrefsService.getInstance().getLocale())` before first render.
  - Both login URLs pass `PrefsService.getInstance().getLocale()`.
  - CI step: `node scripts/check-xliff.mjs "$WS/xliff"`, run only for workspaces that have `xliff/`.
- [ ] **Step 4: Extract.** Run `npm run localize` in both web apps. Expected: `xliff/{ja,zh-Hans,zh-Hant}.xlf` are created with untranslated units, and `es.xlf` gains the static-page units. `check-xliff` now fails by design until Tasks 16–17 translate.
- [ ] **Step 5: Run the tests and see them pass.** Re-run Step 2's commands. Expected: PASS.
- [ ] **Step 6: Commit.** Message: `feat(fleet-lite,parentos): localize invite and login pages, pass language to DIMO login, check xliff completeness`. Hold the `language` param's release until dimo-login zh is live.

---

## Phase 2: Extraction (Run 2, 9 agents)

Run 2 is one Workflow. The console setup node runs first. Then common and the six area batches run in parallel, alongside dimo-org.

Every node brief follows the spec's node contract: reads, writes, rules, done, new terms. The orchestrator re-runs each node's `done` command itself.

### Task 9 [Run 2 · console setup]: next-intl foundation

**Files:**
- Create:
  - `src/i18n/locale.ts`
  - `src/i18n/request.ts`
  - `src/i18n/messages.ts`
  - `src/i18n/actions.ts`
  - `src/components/LanguageSwitcher/LanguageSwitcher.tsx`
  - `messages/en/common.json` (seed)
  - `__tests__/unit/i18n/locale.test.ts`
  - `__tests__/unit/i18n/messages.test.ts`
- Modify:
  - `src/app/layout.ts` → `src/app/layout.tsx` (server)
  - `src/layouts/RootLayout/RootLayout.tsx` (drop `<html>`/`<body>`; becomes `RootProviders`)
  - `next.config.mjs` (`createNextIntlPlugin('./src/i18n/request.ts')` wraps `nextConfig` inside `withSentryConfig`)
  - `jest.config.ts` (`next-intl` and `use-intl` in `ESM_PACKAGES`)
  - `jest.setup.ts`
  - `src/layouts/GuestLayout/GuestLayout.tsx` and `src/components/Menu/Menu.tsx` (mount the switcher beside `ThemeToggle`)
  - `src/app/globals.css` (CJK `:lang()` stacks after Euclid)

**Interfaces:**
- Produces:
  - `src/i18n/locale.ts`:
    - `LOCALES = ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant'] as const`, `type Locale`, `DEFAULT_LOCALE = 'en'`, `LOCALE_COOKIE = 'NEXT_LOCALE'`, `LOCALE_LABELS`
    - `matchLocale(tag?: string | null): Locale | undefined`
    - `localeFromAcceptLanguage(header?: string | null): Locale | undefined`, which parses q-values and picks the highest-q supported tag
    - `resolveLocale(cookie?: string | null, acceptLanguage?: string | null): Locale`
  - `src/i18n/messages.ts`:
    - `AREAS = ['common', 'app', 'connections', 'configurator', 'email-recovery', 'license', 'licenses', 'settings', 'sign-in', 'sign-up', 'support', 'templates', 'vehicles', 'webhooks'] as const`
    - `loadMessages(locale: Locale): Promise<Record<Area, object>>` reads `messages/<locale>/<area>.json`; a missing file is `{}`
  - `src/i18n/actions.ts`: `'use server'` `setLocale(locale: Locale): Promise<void>` sets the cookie with a 1-year max age, path `/`, `sameSite: 'lax'`
  - Namespaces: `useTranslations('<area>')` / `getTranslations('<area>')`. Keys inside an area are camelCase, nested by component.

- [ ] **Step 1: Write failing tests** for `locale.ts`:
  - The full matching table.
  - `localeFromAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')` is `'zh-Hans'`.
  - `localeFromAcceptLanguage('en;q=0.5, ja;q=0.9')` is `'ja'`.
  - `localeFromAcceptLanguage('fr, de')` is `undefined`.
  - `resolveLocale('fr', 'zh-TW')` is `'zh-Hant'`.
  - `resolveLocale(null, null)` is `'en'`.
  - `resolveLocale('ja', 'zh-CN')` is `'ja'`.
- [ ] **Step 2: Write the failing parity test** in `messages.test.ts`. For each non-en locale and each area that has a file, assert:
  - the same flattened key set as `en`
  - the same ICU argument names, from `intl-messageformat`'s parser (`@formatjs/icu-messageformat-parser` `parse`)
  - every plural has an `other` branch

  A locale with no files yet is skipped with `it.skip` and its name, so the suite stays green until translations land.
- [ ] **Step 3: Run the tests and see them fail.** Run `npx jest __tests__/unit/i18n`. Expected: FAIL.
- [ ] **Step 4: Implement** `npm i next-intl@^4` and the files above.
  - `layout.tsx` is a server component. It calls `getLocale()` and `getMessages()`, renders `<html lang={locale} suppressHydrationWarning><body className=…>`, and nests `<NextIntlClientProvider messages={messages}><RootProviders>{children}</RootProviders></NextIntlClientProvider>`. It keeps the `viewport` export.
  - `request.ts` uses `getRequestConfig`, with `resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value, (await headers()).get('accept-language'))`.
  - The switcher calls `setLocale`, then `router.refresh()`.
  - `jest.setup.ts` mocks `next-intl` and `next-intl/server`:
    - `useTranslations(ns)` and `getTranslations(ns)` return `createTranslator({ locale: 'en', messages: EN, namespace: ns })`, where `EN` is built synchronously from `messages/en/*.json`.
    - `useLocale` returns `'en'`.
    - `useFormatter` returns `createFormatter({ locale: 'en' })`.
    - `NextIntlClientProvider` renders its children.
- [ ] **Step 5: Verify.** Run `npm test && npm run lint && npm run lint:format && npx tsc --noEmit && npm run build`. Expected: all pass and no existing snapshot changes.
- [ ] **Step 6: Commit.** Message: `feat(i18n): add next-intl with cookie and Accept-Language locale`.

### Task 10 [Run 2 · console common]: `src/components` and shared copy

- **Reads:** Task 9 interfaces, the glossary, the spec's extraction exclusions.
- **Writes:**
  - `src/components/**`
  - `src/config/navigation.ts`
  - user-facing strings in `src/config`, `src/hooks`, `src/hoc` and `src/utils`
  - `messages/en/common.json`

  Nothing else. Non-component modules (config, utils) export message keys, and the rendering component calls `t(key)`.
- **Rules:**
  - Client components use `useTranslations('common')`.
  - Dates and numbers use `useFormatter()`.
  - Components that are also server-rendered use `getTranslations`.
- **Done:** `npm test && npx tsc --noEmit && npm run lint`. Run `grep -rnE '>[A-Z][a-z]+( [a-z]+)*<' src/components` and review the result. Expected: only brand names and code samples.
- **Commit:** `feat(i18n): extract shared console copy`.

### Task 11 [Run 2 · console areas ×6]: route folders

Six agents. Each owns only its route folders and its area files.

| Batch | Route folders | Message files |
|---|---|---|
| 1 | `src/app/license/**` except `[tokenId]/configurator` | `license.json` |
| 2 | `src/app/license/[tokenId]/configurator/**`, `src/app/licenses/**`, `src/app/support/**` | `configurator.json`, `licenses.json`, `support.json` |
| 3 | `src/app/vehicles/**` | `vehicles.json` |
| 4 | `src/app/settings/**`, `src/app/connections/**`, `src/app/webhooks/**` | `settings.json`, `connections.json`, `webhooks.json` |
| 5 | `src/app/sign-in/**`, `src/app/sign-up/**`, `src/app/email-recovery/**` | `sign-in.json`, `sign-up.json`, `email-recovery.json` |
| 6 | `src/app/app/**`, `src/app/templates/**`, root `page.tsx`/`error.tsx`/`not-found.tsx`/`global-error.tsx` | `app.json`, `templates.json` |

- **Rules:**
  - Each page's `metadata` becomes `generateMetadata` using `getTranslations(area)`.
  - Batch 2 keeps the configurator's generated SDK snippet in English. Only its labels translate.
  - A string an area needs from `common` is read with `useTranslations('common')`. Batches never edit `common.json`.
- **Done:** the same commands as Task 10, run after each batch, then the whole suite once all six finish.
- **Commit:** one per batch, e.g. `feat(i18n): extract license copy`.

### Task 12 [Run 2 · dimo-org copy]: Docusaurus i18n and copy wrapping

**Files** (in `dimo-org`, branch `feat/i18n-zh` from `origin/main`):
- Modify:
  - `docusaurus.config.ts`
  - every `src/pages/**/*.tsx`
  - `src/components/CustomNavbar/index.tsx`
  - `src/theme/Footer/index.tsx`
  - `src/components/ContentPageLayout/index.tsx`
- Create:
  - `i18n/en/` via `npm run write-translations -- --locale en`
  - `scripts/check-i18n.mjs`
  - `scripts/lib/i18n-check.mjs`
  - `scripts/lib/i18n-check.test.mjs`

**Interfaces:**
- Produces:
  - `locales: ['en', 'es', 'ja', 'zh-Hans', 'zh-Hant']`
  - `localeConfigs`: labels are the native labels, `htmlLang` equals the code.
  - In non-`en` builds (`process.env.DOCUSAURUS_CURRENT_LOCALE !== 'en'`):
    - the docs and blog plugins are disabled
    - the pages plugin `exclude` adds `privacy.md` and `terms.md`
  - `englishHref(path: string): string`, in `src/lib/locale-links.ts`, returns `path` in `en` and `pathname://${path}` elsewhere. Used for every link to docs, blog, privacy and terms.
  - `missingTranslations(en: Record<string, {message: string}>, other: Record<string, {message: string}>): string[]`
  - `node scripts/check-i18n.mjs` runs `missingTranslations` for `code.json` and the navbar/footer JSON in each locale, and exits 1 on any gap.
  - `check-all` becomes `npm run typecheck && npm run lint && npm run format:check && node scripts/check-i18n.mjs`.

- [ ] **Step 1: Write the failing test** for `missingTranslations`: a missing id and an empty message are both reported, and a complete file returns `[]`.
- [ ] **Step 2: Run it and see it fail.** Run `node --test scripts/lib/i18n-check.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Wrap all copy, including data arrays and JSON-LD `name`/`description`/FAQ text, with `translate({id, message})` / `<Translate id>`. Ids look like `<page>.<section>.<item>`.
  - Add the locale dropdown to `CustomNavbar`.
  - Set `algolia.contextualSearch: false`.
  - Add the CJK `:lang()` stacks in `src/css/custom.css`.
  - `prebuild` stays as is. It writes English-only root files.
- [ ] **Step 4: Run it and see it pass.** Run `node --test scripts/lib/i18n-check.test.mjs`. Expected: PASS. Then run `npm run check-all`. Expected: the i18n check fails for the four new locales until Task 19 translates them. Every other check passes.
- [ ] **Step 5: Commit.** Message: `feat(i18n): wrap marketing copy and enable five locales`.

### Task 13 [Run 2 · dimo-org, same agent as Task 12]: locale-aware head and SEO check

**Files:**
- Create:
  - `src/theme/SiteMetadata/index.tsx` (ejected from `@docusaurus/theme-classic`)
  - `src/lib/seo.ts`
  - `scripts/check-seo.mjs`
  - `scripts/lib/seo-check.mjs`
  - `scripts/lib/seo-check.test.mjs`
- Modify:
  - the 31 files with hand-written `canonical`, `og:url`, `og:locale` or `twitter:url` (remove those tags)
  - the 24 JSON-LD files (wrap with `localizeSchema`)
  - `static/robots.txt`
  - `package.json` (`"postbuild": "node scripts/check-seo.mjs build"`)

**Interfaces:**
- Produces:
  - `src/lib/seo.ts`:
    - `SITE = 'https://dimo.org'`
    - `OG_LOCALE: Record<string, string> = { en: 'en_US', es: 'es_ES', ja: 'ja_JP', 'zh-Hans': 'zh_CN', 'zh-Hant': 'zh_TW' }`
    - `isTranslatedPath(path: string): boolean` is false for `/docs*`, `/blog*`, `/privacy`, `/terms` and `/search`
    - `localeUrl(locale: string, path: string): string` is `${SITE}${locale === 'en' ? '' : '/' + locale}${path === '/' ? '' : path}`, with no trailing slash
    - `localizeSchema<T extends object>(schema: T, locale: string, path: string): T` sets `inLanguage` and the page `url`/`@id` to `localeUrl`. It leaves `@id` values of `Organization` and `Product` nodes unchanged.
  - `SiteMetadata` is the only emitter of these tags:
    - `canonical` = `localeUrl(currentLocale, path)`
    - `og:url` = the same URL
    - `og:locale` from `OG_LOCALE`, with `og:locale:alternate` for each other locale
    - when `isTranslatedPath`: `<link rel="alternate" hreflang>` for each of the five locales plus `x-default` → `localeUrl('en', path)`
    - otherwise: no alternates
  - `seo-check.mjs`: `checkPage(html: string, file: string, existing: Set<string>): string[]`. It reports:
    - a canonical, `og:url` or JSON-LD `url` whose locale prefix differs from the file's locale
    - an hreflang target not in `existing`
    - an hreflang target page that carries `noindex`
    - a missing `x-default`

    `check-seo.mjs build` walks `build/**/index.html` and exits 1 on any report.
  - `robots.txt` lists `https://dimo.org/sitemap.xml` and `https://dimo.org/{es,ja,zh-Hans,zh-Hant}/sitemap.xml`.

- [ ] **Step 1: Write failing tests** in `seo-check.test.mjs`. Use small HTML strings covering:
  - `/zh-Hans/pricing` with canonical `https://dimo.org/pricing`: reported
  - an hreflang to `/ja/docs/intro`: reported as missing
  - a correct page: `[]`

  Add `localeUrl` and `isTranslatedPath` tests: `localeUrl('zh-Hant', '/')` is `https://dimo.org/zh-Hant`, and `isTranslatedPath('/blog/x')` is false.
- [ ] **Step 2: Run them and see them fail.** Run `node --test scripts/lib/seo-check.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement** the head changes, `localizeSchema` adoption and `robots.txt`.
- [ ] **Step 4: Run them and see them pass.** Run `npm test`. Expected: PASS. A full `npm run build` with `postbuild` runs in Task 19, once the translations exist.
- [ ] **Step 5: Commit.** Message: `feat(seo): self canonicals, hreflang and per-locale OG and JSON-LD`.

---

## Phase 3: Translation memory (Run 3, 5 agents)

### Task 14 [Run 3]: Pool, memory translation, memory review

**Files:**
- Create:
  - `docs/i18n/translation-memory/pool.json`
  - `docs/i18n/translation-memory/{es,ja,zh-Hans,zh-Hant}.json`
  - `docs/i18n/review/memory.zh-Hans+zh-Hant.csv`
  - `docs/i18n/review/memory.es+ja.csv`

**Interfaces:**
- Produces:
  - `pool.json`: `{ "entries": [{ "id": "tm.0001", "en": "Cancel", "note": "secondary button that closes a dialog", "uses": [{ "app": "dimo-login", "key": "common.cancel" }] }] }`
  - `<locale>.json`: `{ "tm.0001": { "text": "取消", "source": "shipped" | "new", "approved": false } }`
  - `check-memory.mjs` (Task 2) reads only `approved: true` entries.

- [ ] **Step 1: Pool node.**
  - Reads every app's English through `readStrings`.
  - An entry is a string used in 2+ apps or 3+ times in one app.
  - Identical English merges only when the component context means the same thing. Otherwise the entries are split, each with its own note.
  - Shipped `es`/`ja` translations are prefilled with `source: "shipped"`.
  - **Done:** `node -e` asserts that ids are unique, every entry has a `note` and ≥1 use, and every use key exists in `readStrings(app, 'en')`.
- [ ] **Step 2: Translate nodes ×4, one per locale, in parallel.**
  - Reads `pool.json`, the glossary and the README writing rules.
  - Writes only `<locale>.json`, and never changes a `shipped` entry.
  - **Done:** every pool id is present, and the ICU, `{{param}}` and `<x id>` sets match the English.
- [ ] **Step 3: Generate review sheets.** Use `sheet.mjs --app memory` (add `memory` as an app id that reads the pool and the locale files). Commit. Message: `feat(i18n): seed shared translation memory`.
- [ ] **Step 4: Gate.**
  - James reviews the zh sheet and the team reviews es/ja.
  - Approved rows get `approved: true`, and edits are applied to the locale files.
  - Each app run's translate node for a locale starts once that locale's memory is approved.

---

## Phase 4: App runs (Runs 4–8, in parallel)

Every app run has the same node shape:

- **Disambiguate (1 agent).** Reads the app's English keys not in `pool.json` uses. Writes `docs/i18n/notes/<app>.json` as `{ key: "UI role, where it renders, space limit" }`. Space limits come from the component code.
- **Translate (1 agent per new locale).** Reads the glossary, the approved memory, the notes and the app's English. Writes only that locale's file. Every pool-mapped key gets the approved memory text verbatim.
- **Verify (orchestrator).** Runs the app's done command plus `node docs/i18n/tools/check-memory.mjs --app <app> --locale <code>` for each locale.

After each run, outside the workflow:
- **Consistency pass (1 agent).** Started when James begins that app's review. It reads earlier apps' approved translations and the glossary, then proposes edits as a diff and doesn't apply them.
- **Sheet.** Run `sheet.mjs --app <app> --locales zh-Hans,zh-Hant`, plus es/ja for the team.
- **Review.** Reviews use the sheet and the PR preview deploy. Memory edits are written back to `docs/i18n/translation-memory/` and to every app already using the entry.

Review order: dimo-login, parentos, fleet-lite, dimo-org, console.

### Task 15 [Run 4]: dimo-login zh-Hans, zh-Hant

- **Writes:** `src/i18n/locales/zh-Hans.ts` and `zh-Hant.ts`, typed `LocaleResources`, each with a header comment naming its term sources like `ja.ts`. Also register both in `src/i18n/index.tsx` resources and add `['zh-Hans', zhHans], ['zh-Hant', zhHant]` to `TRANSLATIONS` in `locales.test.ts`. Registration and the test edit are done by the orchestrator after the translate nodes, not by them.
- **Done:** `npm test && npm run lint && npm run build` (the build includes `tsc`).
- **Commit:** `feat(i18n): Simplified and Traditional Chinese login copy`.

### Task 16 [Run 5]: parentos ja, zh-Hans, zh-Hant, plus the es gaps

- **Writes:** `xliff/{ja,zh-Hans,zh-Hant}.xlf` targets. One extra node fills the 46+ missing `es.xlf` targets, with team review.
- **Done:** `node scripts/check-xliff.mjs apps/parentos/web/xliff && npm run localize:check && npx tsc --noEmit && npm run lint:check`, all in `apps/parentos/web`.
- **Commit:** `feat(parentos): Japanese and Chinese, complete Spanish`.

### Task 17 [Run 6]: fleet-lite ja, zh-Hans, zh-Hant

- **Writes:** `xliff/{ja,zh-Hans,zh-Hant}.xlf` targets, plus any `es.xlf` units added by Task 8's static pages.
- **Done:** run the same check as Task 16 with `apps/fleet-lite/web`, plus `npm test` and `cd ../api && go test ./...`.
- **Commit:** `feat(fleet-lite): Japanese and Chinese`.

### Task 18 [Run 8]: console es, ja, zh-Hans, zh-Hant

- **Writes:** `messages/<locale>/<area>.json` for every area in `AREAS`. Task 9's parity test un-skips each locale once its files exist.
- **Done:** `npm test && npm run lint && npm run lint:format && npx tsc --noEmit && npm run build`.
- **Commit:** `feat(i18n): console in Spanish, Japanese and Chinese`.

### Task 19 [Run 7]: dimo-org es, ja, zh-Hans, zh-Hant

- **Writes:**
  - `i18n/<locale>/code.json`
  - `i18n/<locale>/docusaurus-theme-classic/{navbar,footer}.json`
  - `i18n/<locale>/docusaurus-plugin-content-pages/{about,contact}.md`
  - Run `npm run write-translations -- --locale <code>` first, which the orchestrator does before the translate nodes.
- **Done:** `npm run check-all && npm test && npm run build`. `postbuild` runs `check-seo`. Record the total build time and compare it with the current Vercel build time.
- **Commit:** `feat(i18n): dimo.org marketing pages in Spanish, Japanese and Chinese`.

---

## Phase 5: Release

### Task 20: PRs and release order

- [ ] **Step 1: Open one PR per repo** from `feat/i18n-zh`:
  - dimo-login
  - login-with-dimo
  - dimo-developer-console (spec, plan, tools, memory, console)
  - dimo-org
  - dimo-monorepo

  Each body links the spec and lists its done commands with their results.
- [ ] **Step 2: Merge dimo-login first.** Confirm zh renders on production login with `?language=zh-Hant`.
- [ ] **Step 3: Release the dependents.** With James's go-ahead, release the SDK and merge the console configurator and the monorepo `language` param. Deploy fleet-lite's API before its web app, so synced `zh-*` prefs aren't dropped.
- [ ] **Step 4: Merge dimo-org** and hand James the Search Console steps:
  1. Submit the four locale sitemaps.
  2. Run URL Inspection on one page per locale to confirm the self canonical.
  3. Watch the Page indexing and hreflang reports for two weeks.
- [ ] **Step 5: Re-confirm the tenancy fallback.** `fleet-tenancy-api/internal/service/invitations.go` should still fall back to English for non-`es` locales at head. Note the result in the monorepo PR.
