import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'src/components/Icons');
const BRAND_LOGOS = /^GoogleIcon\.tsx$/;

describe('icons', () => {
  it('paint with currentColor unless they are brand logos', () => {
    const offenders = fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.tsx') && !BRAND_LOGOS.test(f))
      .filter((f) => {
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        return (
          /(fill|stroke)="#[0-9A-Fa-f]{3,8}"/.test(content) ||
          /(fill|stroke)="(white|black)"/.test(content) ||
          /stopColor="#[0-9A-Fa-f]{3,8}"/.test(content)
        );
      });
    expect(offenders).toEqual([]);
  });
});
