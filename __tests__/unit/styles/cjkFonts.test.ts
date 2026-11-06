/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

const fontSansFor = (lang: string) => {
  const block = css.match(new RegExp(`:root:lang\\(${lang}\\)\\s*{([^}]*)}`))?.[1] ?? '';
  return block
    .match(/--font-sans:([^;]*);/)?.[1]
    .replace(/\s+/g, ' ')
    .trim();
};

// Euclid first for Latin text, then the system CJK faces before any generic
// family: no CJK webfont is downloaded.
describe('Chinese font stacks', () => {
  it.each([
    [
      'zh-Hans',
      "var(--font-dimo), 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Noto Sans SC', sans-serif",
    ],
    [
      'zh-Hant',
      "var(--font-dimo), 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', 'Noto Sans TC', sans-serif",
    ],
  ])('%s', (lang, stack) => {
    expect(fontSansFor(lang)).toBe(stack);
  });

  it('keeps generic families out of --font-dimo so the CJK faces come first', () => {
    const font = readFileSync(join(process.cwd(), 'src/utils/font.ts'), 'utf8');
    expect(font).not.toMatch(/fallback:/);
  });
});
