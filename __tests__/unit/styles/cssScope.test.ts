/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { globSync } from 'glob';

/**
 * Component CSS must not style bare elements.
 *
 * `src/app/app/create/components/Form/Form.css` opened with `form { @apply
 * flex flex-col flex-1 gap-4 }`. It reads as "this component's form", but a
 * bare element selector is scoped to nothing: once that chunk was on the page
 * it styled every form in the console. The templates search row asks for a
 * wrapped ROW -- `flex flex-wrap items-end gap-3` -- and sets no
 * flex-direction of its own, so the global rule was the only declaration for
 * the property, applied without any specificity contest, and the row rendered
 * as a column that `items-end` pushed to the right edge. It survived review
 * because a soft navigation never loads that chunk: the page looked right
 * until someone hit it with a cold load, which is exactly how it was reported.
 *
 * A nested `form { ... }` inside a class block is fine -- that is scoped -- so
 * only top-level selectors are checked here.
 */

const STRIP_COMMENTS = /\/\*[\s\S]*?\*\//g;

/** Every selector at nesting depth 0, comments removed. */
const topLevelSelectors = (css: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let buffer = '';
  for (const ch of css.replace(STRIP_COMMENTS, '')) {
    if (ch === '{') {
      if (depth === 0) out.push(buffer.trim().replace(/\s+/g, ' '));
      depth += 1;
      buffer = '';
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      buffer = '';
    } else if (depth === 0) {
      buffer += ch;
    }
  }
  return out.filter((s) => s.length > 0);
};

// A selector is scoped when every comma-separated part is anchored on a class,
// an id, an attribute, :root or a variable/at-rule. `html` and `body` are the
// document itself and belong to globals.css, which is where the base layer is.
const ANCHORED = /(^|\s|>|\+|~)[.#[]/;
const isScoped = (selector: string): boolean =>
  selector
    .split(',')
    .map((part) => part.trim())
    .every(
      (part) =>
        part.startsWith('@') ||
        part.startsWith(':root') ||
        part.startsWith('*') ||
        /^html\b/.test(part) ||
        /^body\b/.test(part) ||
        ANCHORED.test(part),
    );

describe('component CSS is scoped', () => {
  const files = globSync('src/**/*.css', { cwd: process.cwd() }).filter(
    (f) => !f.endsWith('globals.css'),
  );

  it('finds the stylesheets to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s styles no bare element', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');
    const unscoped = topLevelSelectors(css).filter((s) => !isScoped(s));
    expect(unscoped).toEqual([]);
  });
});
