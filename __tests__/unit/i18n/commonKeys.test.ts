import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import common from '../../../messages/en/common.json';

const ROOT = join(__dirname, '..', '..', '..');
const OWNED = ['src/components', 'src/hoc', 'src/hooks', 'src/utils', 'src/config'];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === '__fixtures__' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

const has = (tree: unknown, key: string): boolean =>
  typeof key.split('.').reduce<unknown>((node, part) => {
    return node && typeof node === 'object'
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, tree) === 'string';

describe('common.json', () => {
  const found = OWNED.flatMap((dir) => sourceFiles(join(ROOT, dir))).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    if (!source.includes("useTranslations('common')")) return [];
    const keys = [...source.matchAll(/\bt(?:\.rich)?\(\s*'([A-Za-z0-9_.-]+)'/g)].map(
      (match) => match[1],
    );
    return keys.map((key) => [file.slice(ROOT.length), key] as const);
  });

  it('finds the literal keys the shared code asks for', () => {
    expect(found.length).toBeGreaterThan(200);
  });

  it.each(found)('%s asks for a message that exists: %s', (_file, key) => {
    expect(has(common, key)).toBe(true);
  });
});
