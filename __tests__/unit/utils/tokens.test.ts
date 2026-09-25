import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

const block = (theme: string) => {
  // Prettier normalises selector quotes, so accept either.
  const match = new RegExp(`:root\\[data-theme=['"]${theme}['"]\\]`).exec(css);
  if (!match) throw new Error(`missing ${theme} token block`);
  const open = css.indexOf('{', match.index);
  return css.slice(open + 1, css.indexOf('}', open));
};
const channels = (body: string) =>
  Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map((m) => [
      m[1],
      [Number(m[2]), Number(m[3]), Number(m[4])] as const,
    ]),
  );
const allVars = (body: string) =>
  [...body.matchAll(/--([\w-]+):/g)].map((m) => m[1]).sort();

const dark = block('dark');
const light = block('light');
const themes = { dark: channels(dark), light: channels(light) };

const luminance = ([r, g, b]: readonly number[]) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a: readonly number[], b: readonly number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('design tokens', () => {
  it('defines the same variables in dark and light', () => {
    expect(allVars(light)).toEqual(allVars(dark));
  });

  it.each(['dark', 'light'] as const)(
    '%s text meets WCAG AA on its surfaces',
    (theme) => {
      const t = themes[theme];
      const pairs: [string, string][] = [
        ['fg', 'sheet'],
        ['fg', 'card'],
        ['ink', 'canvas'],
        ['muted', 'sheet'],
        ['muted', 'card'],
        ['accent-ink', 'sheet'],
        ['accent-ink', 'card'],
        ['on-accent', 'accent'],
        ['negative', 'sheet'],
        ['negative', 'negative-soft'],
        ['positive', 'sheet'],
        ['warning', 'sheet'],
      ];
      for (const [fg, bg] of pairs) {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(t[fg], t[bg]) >= 4.5 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      }
    },
  );
});
