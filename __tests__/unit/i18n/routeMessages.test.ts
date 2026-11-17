/**
 * @jest-environment node
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, relative, resolve } from 'path';
import {
  GUEST_AREAS,
  ROOT_MESSAGES,
  SECTION_MESSAGES,
  SHELL_MESSAGES,
  type Section,
} from '@/i18n/messages';

// The browser has only the messages the route layouts send it, while
// jest.setup.ts gives every test all of them. A component that reads an area
// its layout doesn't send passes every other test and shows key paths in
// production, so this follows each layout's imports and checks that every
// namespace they read is sent.

const SRC = join(__dirname, '..', '..', '..', 'src');
const APP = join(SRC, 'app');

const IMPORT =
  /(?:import|export)\s+(type\s)?[^'";]*?from\s*['"]([^'"]+)['"]|import\s*\(?\s*['"]([^'"]+)['"]/g;
const CALL = /\b(?:useTranslations|getTranslations)\(/g;
const NAMESPACE =
  /\b(?:useTranslations|getTranslations)\(\s*(?:['"]([^'"]+)['"]|\{[^}]*?\bnamespace:\s*['"]([^'"]+)['"][^}]*\})/g;
const SOURCE = /\.tsx?$/;
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
const ROUTE_FILE = /^(page|layout|template|loading|error|not-found|default)\.tsx?$/;

type Module = { imports: string[]; namespaces: string[]; unread: boolean };
const modules = new Map<string, Module>();
const unresolved = new Set<string>();

const resolveImport = (from: string, specifier: string): string | undefined => {
  const base = specifier.startsWith('@/')
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? resolve(dirname(from), specifier)
      : undefined;
  if (!base) return undefined;
  const file = EXTENSIONS.map((extension) => base + extension).find(
    (path) => existsSync(path) && statSync(path).isFile(),
  );
  if (!file) unresolved.add(`${specifier} from ${relative(SRC, from)}`);
  return file && SOURCE.test(file) ? file : undefined;
};

const readModule = (file: string): Module => {
  const cached = modules.get(file);
  if (cached) return cached;
  const source = readFileSync(file, 'utf8');
  const imports = [...source.matchAll(IMPORT)]
    .filter(([, typeOnly]) => !typeOnly)
    .map(([, , from, imported]) => resolveImport(file, from ?? imported))
    .filter((path): path is string => !!path);
  const namespaces = [...source.matchAll(NAMESPACE)].map(
    ([, literal, option]) => literal ?? option,
  );
  const parsed = {
    imports,
    namespaces,
    unread: namespaces.length !== [...source.matchAll(CALL)].length,
  };
  modules.set(file, parsed);
  return parsed;
};

// Every file the entries reach, with the namespaces it reads.
const walk = (entries: string[]) => {
  const seen = new Set<string>();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...readModule(file).imports);
  }
  return [...seen].map((file) => ({ file: relative(SRC, file), ...readModule(file) }));
};

const routeFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return ROUTE_FILE.test(name) ? [path] : [];
  });

const routeOf = (file: string) => `/${relative(APP, dirname(file))}`;

type Tree = {
  name: string;
  route: string;
  entries: string[];
  sends: string[];
  section?: string;
};

// A layout sends its copy to everything under its folder; the home page wraps
// itself, so only to itself.
const layoutTrees: Tree[] = routeFiles(APP).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  const section = source.match(/authorizedRouteLayout\(\s*'([^']+)'\s*\)/)?.[1];
  const guest = source.includes('GuestRouteLayout');
  if (!section && !guest) return [];
  const sends = section
    ? [...SHELL_MESSAGES, ...(SECTION_MESSAGES[section as Section] ?? [])]
    : GUEST_AREAS;
  return [
    {
      name: relative(APP, file),
      route: routeOf(file),
      entries: basename(file).startsWith('page.') ? [file] : routeFiles(dirname(file)),
      sends: [...ROOT_MESSAGES, ...sends],
      section,
    },
  ];
});

// The root error boundary renders outside every route layout.
const rootTree: Tree = {
  name: 'layout.tsx and error.tsx (root only)',
  route: '/',
  entries: [join(APP, 'layout.tsx'), join(APP, 'error.tsx')],
  sends: ROOT_MESSAGES,
};

const isSent = (sends: string[], namespace: string) =>
  sends.some((path) => namespace === path || namespace.startsWith(`${path}.`));

const trees = [...layoutTrees, rootTree].map((tree) => ({
  ...tree,
  files: walk(tree.entries),
}));

describe('route layouts', () => {
  it('cover every page', () => {
    const covered = new Set(layoutTrees.flatMap((tree) => tree.entries));
    const pages = routeFiles(APP).filter((file) => basename(file).startsWith('page.'));
    expect(pages.filter((page) => !covered.has(page))).toEqual([]);
  });

  it('name the section they are in, and every section has one', () => {
    const sections = layoutTrees.filter((tree) => tree.section);
    expect(sections.filter(({ section, route }) => section !== route)).toEqual([]);
    expect(sections.map(({ section }) => section).sort()).toEqual(
      Object.keys(SECTION_MESSAGES).sort(),
    );
  });

  it('reach only imports this test can follow', () => {
    expect([...unresolved]).toEqual([]);
  });
});

describe.each(trees)('$name', ({ files, sends }) => {
  it('reads every namespace through a form this test knows', () => {
    expect(files.filter(({ unread }) => unread).map(({ file }) => file)).toEqual([]);
  });

  it('is sent every namespace its files read', () => {
    const read = files.flatMap(({ file, namespaces }) =>
      namespaces.map((namespace) => ({ namespace, file })),
    );
    expect(read.length).toBeGreaterThan(0);
    expect(read.filter(({ namespace }) => !isSent(sends, namespace))).toEqual([]);
  });
});
