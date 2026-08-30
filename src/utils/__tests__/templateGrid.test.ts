import camry from './fixtures/toyota_camry_2020.json';
import { vehicleVocab } from './fixtures/vehicleVocab';
import {
  buildGrid,
  setShared,
  clearShared,
  setTrimValue,
  clearTrimValue,
  liftToShared,
  pushDownToTrims,
  addTrim,
  removeTrim,
  hasEffectiveSelector,
  toPayload,
} from '../templateGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;
const row = (tpl: Template, name: string) =>
  buildGrid(tpl, vehicleVocab).rows.find((r) => r.def.name === name)!;

describe('buildGrid', () => {
  it('renders every vocabulary attribute, including ones the template does not set', () => {
    const grid = buildGrid(t, vehicleVocab);
    expect(grid.rows).toHaveLength(vehicleVocab.attributes.length);
    expect(grid.rows.map((r) => r.def.name)).toEqual(
      vehicleVocab.attributes.map((a) => a.name),
    );
    expect(row(t, 'emissions_standard').scope).toBe('absent');
  });

  it('names the two attributes the production record blended', () => {
    // toyota_camry_2020 in production says powertrain_type ICE with hybrid
    // tank and mpg figures. In the template those are the divergent rows, and
    // this test is the regression that says so.
    expect(row(t, 'powertrain_type').distinct).toBeGreaterThan(1);
    expect(row(t, 'fuel_tank_capacity_gal').distinct).toBeGreaterThan(1);
  });

  it('counts shared attributes as one value and offers no lift', () => {
    const doors = row(t, 'number_of_doors');
    expect(doors.scope).toBe('shared');
    expect(doors.shared).toBe(4);
    expect(doors.distinct).toBe(1);
    expect(doors.canLift).toBe(false);
  });

  it('offers a lift only when every trim agrees and none is absent', () => {
    let all = t;
    all.trims.forEach((_, i) => {
      all = setTrimValue(all, i, 'mpg_highway', 39);
    });
    expect(row(all, 'mpg_highway').canLift).toBe(true);

    const oneMissing = clearTrimValue(all, 3, 'mpg_highway');
    expect(row(oneMissing, 'mpg_highway').canLift).toBe(false);
    expect(row(oneMissing, 'mpg_highway').absentCount).toBe(1);
  });
});

describe('the template-or-trim invariant', () => {
  it('setting one trim value pushes a shared attribute down to every trim first', () => {
    const next = setTrimValue(t, 0, 'number_of_doors', 2);
    expect(next.attributes.number_of_doors).toBeUndefined();
    expect(next.trims[0].attributes.number_of_doors).toBe(2);
    next.trims
      .slice(1)
      .forEach((trim) => expect(trim.attributes.number_of_doors).toBe(4));
  });

  it('setting a shared value clears the attribute from every trim', () => {
    const next = setShared(t, 'powertrain_type', 'ICE');
    expect(next.attributes.powertrain_type).toBe('ICE');
    next.trims.forEach((trim) => expect(trim.attributes.powertrain_type).toBeUndefined());
  });

  it('lift and push down are inverses', () => {
    const pushed = pushDownToTrims(t, 'number_of_doors');
    expect(pushed.attributes.number_of_doors).toBeUndefined();
    const lifted = liftToShared(pushed, 'number_of_doors');
    expect(lifted.attributes.number_of_doors).toBe(4);
    lifted.trims.forEach((trim) =>
      expect(trim.attributes.number_of_doors).toBeUndefined(),
    );
  });

  it('never mutates the template it was given', () => {
    const before = JSON.stringify(t);
    setTrimValue(t, 0, 'mpg_city', 99);
    setShared(t, 'mpg_city', 99);
    clearShared(t, 'number_of_doors');
    removeTrim(t, 0);
    expect(JSON.stringify(t)).toBe(before);
  });
});

describe('absent is not empty', () => {
  it('clearing removes the key rather than storing an empty value', () => {
    const cleared = clearTrimValue(t, 0, 'mpg_city');
    expect('mpg_city' in cleared.trims[0].attributes).toBe(false);
    expect(JSON.stringify(cleared)).not.toContain('""');
  });

  it('toPayload drops server-owned fields and empty selector containers', () => {
    const withEmpties = degenerateSelectorOnFirstTrim(t);
    const payload = toPayload(withEmpties) as unknown as Record<string, unknown>;
    expect(payload.version).toBeUndefined();
    expect(payload.createdAt).toBeUndefined();
    expect(payload.updatedAt).toBeUndefined();
    expect(payload.author).toBeUndefined();
    const trims = payload.trims as { selectors?: unknown }[];
    expect(trims[0].selectors).toBeUndefined();
  });
});

describe('hasEffectiveSelector — gate 4', () => {
  it.each([
    [undefined, false],
    [{}, false],
    [{ manufacturerCode: [] }, false],
    [{ manufacturerCode: [''] }, false],
    [{ manufacturerCode: ['   '] }, false],
    [{ styleName: [''] }, false],
    [{ vinPattern: '' }, false],
    [{ vinPattern: '   ' }, false],
    [{ manufacturerCode: ['2532'] }, true],
    [{ styleName: ['Hybrid LE'] }, true],
    [{ vinPattern: '^4T1B11HK.*$' }, true],
  ])('%p -> %p', (selectors, expected) => {
    expect(hasEffectiveSelector(selectors as never)).toBe(expected);
  });
});

describe('trims', () => {
  it('addTrim appends an empty, selector-less, uniquely named trim', () => {
    const next = addTrim(t, 'XLE V6');
    expect(next.trims).toHaveLength(t.trims.length + 1);
    expect(next.trims.at(-1)).toEqual({ name: 'XLE V6', attributes: {} });
  });

  it('removeTrim keeps at least one trim', () => {
    const single = { ...t, trims: [t.trims[0]] };
    expect(removeTrim(single, 0).trims).toHaveLength(1);
  });
});

/** Puts a degenerate selector on trim 0 so toPayload has something to drop. */
function degenerateSelectorOnFirstTrim(template: Template): Template {
  const trims = template.trims.map((trim, i) =>
    i === 0 ? { ...trim, selectors: { manufacturerCode: [''] } } : trim,
  );
  return { ...template, trims };
}
