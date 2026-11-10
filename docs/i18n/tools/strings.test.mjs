import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readStrings } from './strings.mjs';

const root = new URL('./fixtures/root', import.meta.url).pathname;
const read = async (app, locale) =>
  Object.fromEntries(await readStrings(app, locale, root));

test('dimo-login reads a .ts locale and keeps plural suffixes', async () => {
  assert.deepEqual(await read('dimo-login', 'en'), {
    'app.language': 'Language',
    'vehicles.count_one': '{{count}} vehicle',
    'vehicles.count_other': '{{count}} vehicles',
  });
});

test('console keys are area.nested.key', async () => {
  assert.deepEqual(await read('console', 'en'), {
    'a.title': 'Apps',
    'a.nested.deep.key': 'Deep value',
  });
  assert.deepEqual(await read('console', 'es'), { 'a.title': 'Aplicaciones' });
});

test('dimo-org merges code, navbar and footer ids', async () => {
  assert.deepEqual(await read('dimo-org', 'en'), {
    'homepage.title': 'Build with DIMO',
    'navbar.item.docs': 'Docs',
    'footer.link.terms': 'Terms',
  });
});

test('dimo-org skips theme files Docusaurus did not write', async () => {
  const base = await mkdtemp(join(tmpdir(), 'org-'));
  const dir = join(base, 'dimo-org/i18n/en');
  await mkdir(join(dir, 'docusaurus-theme-classic'), { recursive: true });
  await writeFile(
    join(dir, 'code.json'),
    JSON.stringify({ 'footer.body.learnMore': { message: 'Learn more' } }),
  );
  await writeFile(
    join(dir, 'docusaurus-theme-classic/navbar.json'),
    JSON.stringify({ 'item.docs': { message: 'Docs' } }),
  );
  assert.deepEqual(Object.fromEntries(await readStrings('dimo-org', 'en', base)), {
    'footer.body.learnMore': 'Learn more',
    'navbar.item.docs': 'Docs',
  });
});

test('lit apps read source for en and target for other locales', async () => {
  const en = await read('fleet-lite', 'en');
  assert.equal(en.s1, 'Save');
  assert.equal(en.s3, 'Untranslated');
  const es = await read('parentos', 'es');
  assert.equal(es.s1, 'Guardar');
});

test('xlf placeholders are returned verbatim', async () => {
  const es = await read('fleet-lite', 'es');
  assert.equal(
    es.h2,
    '<x id="0" equiv-text="&lt;b&gt;"/>Hola<x id="1" equiv-text="&lt;/b&gt;"/>',
  );
});

test('a missing xlf target is absent from the map', async () => {
  const es = await readStrings('fleet-lite', 'es', root);
  assert.equal(es.has('s3'), false);
});

const memory = new URL('./fixtures/memory', import.meta.url).pathname;

test('check-memory reports approved entries that differ from the app', async () => {
  const { findMismatches } = await import('./check-memory.mjs');
  assert.deepEqual(await findMismatches('dimo-login', 'es', root, memory), [
    { key: 'app.language', id: 'tm.0001', expected: 'Idioma', actual: 'Idiomas' },
  ]);
  assert.deepEqual(await findMismatches('console', 'es', root, memory), []);
});

test('sheet builds sorted, quoted CSV with one column per locale', async () => {
  const { buildSheet } = await import('./sheet.mjs');
  assert.equal(
    await buildSheet('console', ['es'], root),
    'key,en,es\na.nested.deep.key,Deep value,\na.title,Apps,Aplicaciones\n',
  );
});

test('check-memory rethrows malformed memory JSON', async () => {
  const { findMismatches } = await import('./check-memory.mjs');
  const bad = await mkdtemp(join(tmpdir(), 'memory-bad-'));
  await writeFile(join(bad, 'pool.json'), '{"entries":[]}');
  await writeFile(join(bad, 'es.json'), '{ nope');
  await assert.rejects(findMismatches('console', 'es', root, bad), SyntaxError);
});

test('check-memory fails when the locale memory file is missing', async () => {
  const { findMismatches } = await import('./check-memory.mjs');
  await assert.rejects(
    findMismatches('console', 'fr', root, memory),
    /Memory file not found/,
  );
});
