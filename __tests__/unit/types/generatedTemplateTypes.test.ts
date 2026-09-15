import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// The template contract has three generated mirrors (this one, the worker's TS,
// dd-api's Go). Generation without a guard is the same defect as hand-writing
// them, one step removed: the copies still drift, and nothing says so. This
// runs the real check `npm run build` runs, so the two cannot disagree.
const ROOT = path.resolve(__dirname, '../../..');
const GENERATED = path.join(ROOT, 'src/types/generated/template.ts');
const SCHEMA = path.join(ROOT, 'src/types/generated/template.schema.json');

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

  // The drift guard compares the generated types against the VENDORED schema,
  // never against the worker, so a vendored copy left behind by a contract
  // change is invisible to it and CI stays green on a body the worker 422s.
  // The one term Console cannot send by hand is the one pinned here: the
  // manufacturer token id is not on the create form and must not be, so if
  // this stops being required the stamping in the PUT route is dead weight and
  // every create is a guaranteed 422 again.
  it('vendors a contract that requires the manufacturer token id', () => {
    const schema = JSON.parse(readFileSync(SCHEMA, 'utf8'));
    const manufacturer = schema.properties.manufacturer;
    expect(manufacturer.required).toContain('tokenId');
    expect(manufacturer.properties.tokenId).toMatchObject({
      type: 'integer',
      minimum: 1,
    });
  });

  // Without this, the first test passes for a guard that can never fail --
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
