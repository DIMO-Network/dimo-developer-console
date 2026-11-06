import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs, readMemory, readPool, readStrings, repoRoot } from './strings.mjs';

const csvCell = (value = '') =>
  /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

async function readMemoryStrings(locale) {
  const { entries, translations } = await readMemory(locale);
  return new Map(
    entries.flatMap((e) => (translations[e.id] ? [[e.id, translations[e.id].text]] : [])),
  );
}

async function readColumn(app, locale, root) {
  if (app !== 'memory') return readStrings(app, locale, root);
  return readMemoryStrings(locale);
}

async function readEnglish(app, root) {
  if (app !== 'memory') return readStrings(app, 'en', root);
  const entries = await readPool();
  return new Map(entries.map((e) => [e.id, e.en]));
}

export async function buildSheet(app, locales, root) {
  const [en, ...columns] = await Promise.all([
    readEnglish(app, root),
    ...locales.map((l) => readColumn(app, l, root)),
  ]);
  const keys = [...new Set([en, ...columns].flatMap((m) => [...m.keys()]))].sort();
  const rows = keys.map((key) => [key, en.get(key), ...columns.map((c) => c.get(key))]);
  return (
    [['key', 'en', ...locales], ...rows].map((r) => r.map(csvCell).join(',')).join('\n') +
    '\n'
  );
}

async function main() {
  const { app, locales } = parseArgs(process.argv.slice(2));
  if (!app || !locales)
    throw new Error('Usage: sheet.mjs --app <app> --locales zh-Hans,zh-Hant');
  const list = locales.split(',');
  const dir = join(repoRoot, 'docs/i18n/review');
  await mkdir(dir, { recursive: true });
  const out = join(dir, `${app}.${list.join('+')}.csv`);
  await writeFile(out, await buildSheet(app, list));
  console.log(out);
}

if (import.meta.main) await main();
