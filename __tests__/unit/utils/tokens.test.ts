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
// Alpha-blend a translucent token over an opaque surface.
const over = (
  [r, g, b, a]: readonly number[],
  base: readonly number[],
): readonly number[] => [r, g, b].map((c, i) => a * c + (1 - a) * base[i]);
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
        // Toast message text and info icon sit on the overlay.
        ['fg', 'overlay'],
        ['muted', 'overlay'],
        ['accent-ink', 'sheet'],
        ['accent-ink', 'card'],
        ['negative', 'sheet'],
        ['negative', 'negative-soft'],
        ['positive', 'sheet'],
        ['positive', 'card'],
        ['warning', 'sheet'],
        ['warning', 'card'],
      ];
      for (const [fg, bg] of pairs) {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(t[fg], t[bg]) >= 4.5 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      }
    },
  );

  // Status colors carry meaning as dots and icons on cards and tinted surfaces;
  // the text next to them is fg/muted. Non-text contrast (WCAG 1.4.11) is 3:1.
  it.each(['dark', 'light'] as const)(
    '%s status dots and icons meet 3:1 on card surfaces',
    (theme) => {
      const t = themes[theme];
      for (const status of ['positive', 'warning', 'negative']) {
        for (const surface of ['card', 'control', 'overlay']) {
          expect({
            pair: `${status} on ${surface}`,
            ratio: contrast(t[status], t[surface]) >= 3,
          }).toEqual({ pair: `${status} on ${surface}`, ratio: true });
        }
      }
    },
  );

  // Error text stays negative (forms, alerts) and must read at AA wherever it sits.
  // Text on a status tint (status/10 over card) is fg or muted.
  it.each(['dark', 'light'] as const)(
    '%s error text and text on status tints meet WCAG AA',
    (theme) => {
      const t = themes[theme];
      const pairs: [string, readonly number[], string][] = [
        ['negative', t.card, 'negative on card'],
        ['negative', t.control, 'negative on control'],
        ['negative', t.overlay, 'negative on overlay'],
      ];
      for (const status of ['positive', 'warning', 'negative']) {
        const tint = over([...t[status], 0.1], t.card);
        pairs.push(['fg', tint, `fg on ${status}/10 over card`]);
        pairs.push(['muted', tint, `muted on ${status}/10 over card`]);
      }
      for (const [fg, bg, pair] of pairs) {
        expect({ pair, ratio: contrast(t[fg], bg) >= 4.5 }).toEqual({
          pair,
          ratio: true,
        });
      }
    },
  );

  // Ink acts: the primary button is solid ink with inverse text.
  // Selection is inverse ink: a toggled control is selected-fg on selected-bg.
  it.each(['dark', 'light'] as const)(
    '%s primary button and selected control text meet WCAG AA',
    (theme) => {
      const t = themes[theme];
      const pairs: [string, string][] = [
        ['btn-primary-fg', 'btn-primary'],
        ['btn-primary-fg', 'btn-primary-hover'],
        ['selected-fg', 'selected-bg'],
      ];
      for (const [fg, bg] of pairs) {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(t[fg], t[bg]) >= 4.5 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      }
    },
  );

  // Non-text contrast (WCAG 1.4.11): a control's edge, the keyboard focus ring,
  // live-status dots and the progress fill must read at 3:1 where they land.
  it.each(['dark', 'light'] as const)(
    '%s control edges, focus ring and live dots meet 3:1',
    (theme) => {
      const t = themes[theme];
      const pairs: [string, string][] = [
        ['control-border', 'sheet'],
        ['control-border', 'card'],
        ['control-border', 'control'],
        ['control-border', 'overlay'],
        ['control-border-hover', 'control'],
        ['focus-ring', 'sheet'],
        ['focus-ring', 'card'],
        ['focus-ring', 'overlay'],
        ['focus-ring', 'canvas'],
        ['accent', 'sheet'],
        ['accent', 'card'],
        ['accent', 'overlay'],
        // The toggle knob sits on the accent track when on, and the ink knob
        // on the control-border track when off.
        ['on-accent', 'accent'],
        ['ink', 'control-border'],
      ];
      for (const [fg, bg] of pairs) {
        expect({ pair: `${fg} on ${bg}`, ratio: contrast(t[fg], t[bg]) >= 3 }).toEqual({
          pair: `${fg} on ${bg}`,
          ratio: true,
        });
      }
    },
  );

  // Fleet's rule: a status colour used as text reads at AA on the surfaces it
  // lands on, including its own 14% badge tint over the sheet.
  it.each(['dark', 'light'] as const)(
    '%s status text meets WCAG AA on its own tint',
    (theme) => {
      const t = themes[theme];
      for (const status of ['positive', 'warning', 'negative']) {
        const tint = over([...t[status], 0.14], t.sheet);
        const pair = `${status} on ${status}/14 over sheet`;
        expect({ pair, ratio: contrast(t[status], tint) >= 4.5 }).toEqual({
          pair,
          ratio: true,
        });
      }
    },
  );

  // The brand variant (sign-in / sign-up submit) is on-accent over the
  // sky -> mint gradient; both stops must hold AA.
  it.each(['dark', 'light'] as const)(
    '%s brand button text meets WCAG AA on both gradient stops',
    (theme) => {
      const t = themes[theme];
      const stops: Record<string, readonly number[]> = {
        sky: [140, 208, 255],
        mint: [70, 241, 228],
      };
      const gradient =
        /--brand-gradient:\s*linear-gradient\(105deg, #8cd0ff 0%, #46f1e4 100%\)/;
      expect(theme === 'dark' ? dark : light).toMatch(gradient);
      for (const [name, stop] of Object.entries(stops)) {
        const pair = `on-accent on ${name}`;
        expect({ pair, ratio: contrast(t['on-accent'], stop) >= 4.5 }).toEqual({
          pair,
          ratio: true,
        });
      }
    },
  );
});
