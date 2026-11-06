import { parseArgs, readMemory, readStrings } from './strings.mjs';

export async function findMismatches(app, locale, root, memoryDir) {
  const { entries, translations } = await readMemory(locale, memoryDir);
  const strings = await readStrings(app, locale, root);
  return entries.flatMap((entry) => {
    const memory = translations[entry.id];
    if (!memory?.approved) return [];
    return entry.uses
      .filter((use) => use.app === app && strings.get(use.key) !== memory.text)
      .map((use) => ({
        key: use.key,
        id: entry.id,
        expected: memory.text,
        actual: strings.get(use.key),
      }));
  });
}

async function main() {
  const { app, locale, root, memory } = parseArgs(process.argv.slice(2));
  if (!app || !locale)
    throw new Error('Usage: check-memory.mjs --app <app> --locale <code>');
  const mismatches = await findMismatches(app, locale, root, memory);
  for (const m of mismatches) {
    console.log(
      `${m.key}\t${m.id}\texpected: ${m.expected}\tactual: ${m.actual ?? '(missing)'}`,
    );
  }
  process.exit(mismatches.length ? 1 : 0);
}

if (import.meta.main) await main();
