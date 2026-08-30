import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// The template contract has three generated mirrors (this one, the worker's TS,
// dd-api's Go). Generation without a guard is the same defect as hand-writing
// them, one step removed: the copies still drift, and nothing says so. This
// runs the real check `npm run build` runs, so the two cannot disagree.
const ROOT = path.resolve(__dirname, '../../..');
const GENERATED = path.join(ROOT, 'src/types/generated/template.ts');

const check = () =>
  execFileSync('node', ['scripts/gen-template-types.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });

describe('generated template types', () => {
  it('are what the vendored schema produces right now', () => {
    expect(() => check()).not.toThrow();
  });

  // Without this, the test above passes for a guard that can never fail --
  // which is exactly the shape of defect this project keeps producing.
  it('fail the check when the committed output is stale', () => {
    const committed = readFileSync(GENERATED, 'utf8');
    try {
      writeFileSync(GENERATED, `${committed}\nexport type Drifted = true;\n`);
      expect(() => check()).toThrow();
    } finally {
      writeFileSync(GENERATED, committed);
    }
    expect(readFileSync(GENERATED, 'utf8')).toBe(committed);
  });
});
