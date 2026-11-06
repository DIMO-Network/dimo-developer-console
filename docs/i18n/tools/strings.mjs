import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const memoryDir = join(repoRoot, 'docs/i18n/translation-memory');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string'
      ? [[prefix + k, v]]
      : v && typeof v === 'object' && !Array.isArray(v)
        ? flatten(v, `${prefix}${k}.`)
        : [],
  );

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

async function readLogin(base, locale) {
  const mod = await import(
    pathToFileURL(join(base, 'dimo-login/src/i18n/locales', `${locale}.ts`))
  );
  return Object.entries(mod.default);
}

async function readConsole(base, locale) {
  const dir = join(base, 'dimo-developer-console/messages', locale);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const perFile = await Promise.all(
    files.map(async (f) => flatten(await readJson(join(dir, f)), `${f.slice(0, -5)}.`)),
  );
  return perFile.flat();
}

async function readOrg(base, locale) {
  const dir = join(base, 'dimo-org/i18n', locale);
  const sources = [
    ['', join(dir, 'code.json')],
    ['navbar.', join(dir, 'docusaurus-theme-classic/navbar.json')],
    ['footer.', join(dir, 'docusaurus-theme-classic/footer.json')],
  ];
  const perFile = await Promise.all(
    sources.map(async ([prefix, path]) =>
      Object.entries(await readJson(path)).map(([id, v]) => [prefix + id, v.message]),
    ),
  );
  return perFile.flat();
}

const UNIT = /<trans-unit id="([^"]+)">([\s\S]*?)<\/trans-unit>/g;

async function readXliff(base, app, locale) {
  const tag = locale === 'en' ? 'source' : 'target';
  const file = join(
    base,
    'dimo-monorepo/apps',
    app,
    'web/xliff',
    `${locale === 'en' ? 'es' : locale}.xlf`,
  );
  const xml = await readFile(file, 'utf8');
  const field = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  return [...xml.matchAll(UNIT)].flatMap(([, id, body]) => {
    const match = body.match(field);
    return match ? [[id, match[1]]] : [];
  });
}

const readers = {
  'dimo-login': readLogin,
  'console': readConsole,
  'dimo-org': readOrg,
  'fleet-lite': (base, locale) => readXliff(base, 'fleet-lite', locale),
  'parentos': (base, locale) => readXliff(base, 'parentos', locale),
};

export const apps = [...Object.keys(readers), 'memory'];

export async function readStrings(app, locale, root = process.env.DIMO_ROOT ?? '..') {
  const read = readers[app];
  if (!read) throw new Error(`Unknown app: ${app}`);
  return new Map(await read(resolve(repoRoot, root), locale));
}

export async function readMemory(locale, dir = memoryDir) {
  const { entries } = await readJson(join(dir, 'pool.json'));
  const translations = await readJson(join(dir, `${locale}.json`)).catch(() => ({}));
  return { entries, translations };
}

export function parseArgs(argv) {
  return Object.fromEntries(
    argv.flatMap((arg, i) => (arg.startsWith('--') ? [[arg.slice(2), argv[i + 1]]] : [])),
  );
}
