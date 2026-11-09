/**
 * @jest-environment node
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  parse,
  TYPE,
  type MessageFormatElement,
} from '@formatjs/icu-messageformat-parser';
import { LOCALES, type Locale } from '@/i18n/locale';
import {
  AREAS,
  deepMerge,
  GUEST_AREAS,
  loadMessages,
  pickMessages,
  ROOT_MESSAGES,
  SIGNED_IN_AREAS,
} from '@/i18n/messages';

const MESSAGES_DIR = join(process.cwd(), 'messages');

type Tree = { [key: string]: string | Tree };

const areaPath = (locale: Locale, area: string) =>
  join(MESSAGES_DIR, locale, `${area}.json`);

const readArea = (locale: Locale, area: string): Tree =>
  JSON.parse(readFileSync(areaPath(locale, area), 'utf8'));

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((flat, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...flat, [path]: value }
      : { ...flat, ...flatten(value, path) };
  }, {});

interface Shape {
  args: string[];
  pluralsWithoutOther: string[];
}

const walk = (elements: MessageFormatElement[], shape: Shape) => {
  for (const element of elements) {
    if (element.type !== TYPE.literal && 'value' in element) {
      shape.args.push(element.value);
    }
    if (element.type === TYPE.plural || element.type === TYPE.select) {
      if (element.type === TYPE.plural && !('other' in element.options)) {
        shape.pluralsWithoutOther.push(element.value);
      }
      Object.values(element.options).forEach((option) => walk(option.value, shape));
    }
    if (element.type === TYPE.tag) walk(element.children, shape);
  }
  return shape;
};

const shapeOf = (message: string): Shape => {
  const shape = walk(parse(message, { requiresOtherClause: false }), {
    args: [],
    pluralsWithoutOther: [],
  });
  return { ...shape, args: [...new Set(shape.args)].sort() };
};

describe('message files', () => {
  it('only uses known locales and areas', () => {
    for (const dir of readdirSync(MESSAGES_DIR)) {
      expect(LOCALES).toContain(dir);
      for (const file of readdirSync(join(MESSAGES_DIR, dir))) {
        expect(AREAS.map((area) => `${area}.json`)).toContain(file);
      }
    }
  });

  it('every message is a non-empty string', () => {
    const badLeaves = (value: unknown, path: string): string[] => {
      if (typeof value === 'string') return value.trim() ? [] : [path];
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return [path];
      }
      return Object.entries(value).flatMap(([key, child]) =>
        badLeaves(child, `${path}.${key}`),
      );
    };
    for (const locale of LOCALES) {
      for (const area of AREAS.filter((a) => existsSync(areaPath(locale, a)))) {
        expect(badLeaves(readArea(locale, area), `${locale}/${area}`)).toEqual([]);
      }
    }
  });

  it('every English message parses and every plural has an other branch', () => {
    for (const area of AREAS.filter((a) => existsSync(areaPath('en', a)))) {
      for (const [key, message] of Object.entries(flatten(readArea('en', area)))) {
        expect({ key: `${area}.${key}`, ...shapeOf(message) }).toMatchObject({
          pluralsWithoutOther: [],
        });
      }
    }
  });
});

describe('loadMessages', () => {
  it('returns every area, reading the English files', async () => {
    const messages = await loadMessages('en');
    expect(Object.keys(messages).sort()).toEqual([...AREAS].sort());
    expect(messages.common).toEqual(readArea('en', 'common'));
  });

  it('treats an area without a file as empty', async () => {
    const missing = AREAS.find((area) => !existsSync(areaPath('ja', area)));
    expect(missing).toBeDefined();
    const messages = await loadMessages('ja');
    expect(messages[missing!]).toEqual({});
  });
});

describe('deepMerge', () => {
  it('fills gaps in the override from the base, at any depth', () => {
    const base = { a: { b: 'en b', c: 'en c' }, d: 'en d' };
    const override = { a: { b: 'ja b' } };
    expect(deepMerge(base, override)).toEqual({ a: { b: 'ja b', c: 'en c' }, d: 'en d' });
  });

  it('leaves both inputs untouched', () => {
    const base = { a: { b: 'en' } };
    const override = { a: { c: 'ja' } };
    deepMerge(base, override);
    expect(base).toEqual({ a: { b: 'en' } });
    expect(override).toEqual({ a: { c: 'ja' } });
  });
});

describe('pickMessages', () => {
  const messages = {
    common: { a: 'a' },
    app: { error: { title: 't' }, list: 'l' },
    x: 'x',
  };

  it('keeps whole areas and subtrees of one, nothing else', () => {
    expect(pickMessages(messages, ['common', 'app.error'])).toEqual({
      common: { a: 'a' },
      app: { error: { title: 't' } },
    });
  });

  it('skips paths that are not there', () => {
    expect(pickMessages(messages, ['vehicles', 'app.missing'])).toEqual({});
  });
});

describe('message areas per part of the app', () => {
  it('hands every area to the signed-in pages, and only guest areas to the guest pages', () => {
    const root = ROOT_MESSAGES.filter((path) => !path.includes('.'));
    expect([...root, ...GUEST_AREAS, ...SIGNED_IN_AREAS].sort()).toEqual(
      [...AREAS].sort(),
    );
    expect(GUEST_AREAS.filter((area) => SIGNED_IN_AREAS.includes(area))).toEqual([]);
  });

  it('gives the error page, outside every route layout, the copy it shows', () => {
    expect(pickMessages(readArea('en', 'app'), ['error'])).toEqual({
      error: readArea('en', 'app').error,
    });
    expect(ROOT_MESSAGES).toContain('app.error');
  });
});

describe.each(LOCALES.filter((locale) => locale !== 'en'))(
  '%s parity with en',
  (locale) => {
    const areas = AREAS.filter((area) => existsSync(areaPath(locale, area)));

    if (areas.length === 0) {
      it.skip(`${locale} has no message files yet`, () => {});
      return;
    }

    it.each(areas)('%s has the same keys as en', (area) => {
      const en = existsSync(areaPath('en', area)) ? flatten(readArea('en', area)) : {};
      const translated = flatten(readArea(locale, area));
      expect(Object.keys(translated).sort()).toEqual(Object.keys(en).sort());
    });

    it.each(areas)('%s keeps the ICU arguments and plural branches', (area) => {
      const en = flatten(readArea('en', area));
      const translated = flatten(readArea(locale, area));
      for (const [key, message] of Object.entries(translated)) {
        if (!(key in en)) continue;
        const shape = shapeOf(message);
        expect({ key, args: shape.args }).toEqual({ key, args: shapeOf(en[key]).args });
        expect({ key, pluralsWithoutOther: shape.pluralsWithoutOther }).toEqual({
          key,
          pluralsWithoutOther: [],
        });
      }
    });
  },
);
