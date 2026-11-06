# DIMO i18n conventions

## Purpose

These are the shared localization rules for every DIMO app: dimo-login, the developer console, dimo-org, fleet-lite, parentos and the login-with-dimo SDK. Each repo's own i18n doc links here for locale codes, tag matching, language labels, fonts and writing rules, and to the master glossary and translation memory that live next to this file. When a repo doc and this file disagree, this file wins.

## Locale codes

Use these codes everywhere: `en`, `es`, `ja`, `zh-Hans`, `zh-Hant`.

Never use `zh-CN`/`zh-TW` as an app code. The only exception is `og:locale`.

## Matching

Every app normalizes incoming tags the same way (case-insensitive, `_` treated as `-`):

| Input                                             | Resolves to                                            |
| ------------------------------------------------- | ------------------------------------------------------ |
| `zh`, `zh-CN`, `zh-SG`, `zh-Hans`, `zh-Hans-*`    | `zh-Hans`                                              |
| `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, `zh-Hant-*` | `zh-Hant`                                              |
| `ja`, `ja-*`, `jp`                                | `ja`                                                   |
| `es`, `es-*`                                      | `es`                                                   |
| `en`, `en-*`                                      | `en`                                                   |
| anything else                                     | not supported, fall through to the next detection step |

## Native labels

Language switchers show each language in its own script:

| Code      | Label      |
| --------- | ---------- |
| `en`      | `English`  |
| `es`      | `Español`  |
| `ja`      | `日本語`   |
| `zh-Hans` | `简体中文` |
| `zh-Hant` | `繁體中文` |

## Fonts

Where an app's brand font lacks CJK glyphs, add `:lang()` stacks that name the Linux and ChromeOS families too:

- zh-Hans: `"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif`
- zh-Hant: `"PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", "Noto Sans TC", sans-serif`

No downloaded CJK webfont.

dimo-login's existing Japanese stack in `src/index.css` is the pattern.

## Writing rules

For every translation:

- Whole sentences with params.
- Placeholders, tags and ICU/i18next syntax stay byte-identical.
- Brand, product, app, vehicle and competitor names stay English.
- Use glossary terms and report new ones.
- zh-Hant follows Taiwan usage, with `，。「」`.
- zh-Hans follows mainland usage, with `，。“”`.
- Chinese and Japanese plurals use `other` only.

Shipped `es`/`ja` copy is not rewritten. It seeds the glossary and memory, and wins on conflict.

## What never gets translated

- Protocol strings
- GraphQL operations
- Analytics event names
- Sentry messages
- Values sent to APIs
- Generated code samples

Also: `privacy.md` and `terms.md` on dimo.org stay English. dimo-org docs and blog stay English and are never indexed under a locale prefix.

## Where things live

All under `docs/i18n/` in dimo-developer-console:

| Path                  | What it holds                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `glossary.md`         | Master glossary, one table: `English \| es \| ja \| zh-Hans \| zh-Hant \| notes`                                                      |
| `translation-memory/` | `pool.json` (shared strings with meaning notes and every app/key that uses them), `<locale>.json` (approved translations by entry id) |
| `tools/`              | `strings.mjs`, `sheet.mjs`, `check-memory.mjs` and their tests                                                                        |
| `review/`             | Review sheets, `<app>.<locales joined by +>.csv`, columns `key,en,<locales…>`                                                         |
| `notes/`              | Per-app context notes, `<app>.json` as `{ key: "UI role, where it renders, space limit" }`                                            |

## Per-repo pointers

- **dimo-login**: i18next, `src/i18n` (locales in `src/i18n/locales/`, guide in `docs/i18n.md`).
- **dimo-developer-console**: next-intl, `messages/<locale>/<area>.json`.
- **dimo-org**: Docusaurus i18n, `i18n/<locale>/`.
- **fleet-lite and parentos** (dimo-monorepo): lit-localize, `apps/<app>/web/xliff/`.
- **login-with-dimo**: SDK `DimoLanguage` type in `sdk/src/types/common.types.ts`.
