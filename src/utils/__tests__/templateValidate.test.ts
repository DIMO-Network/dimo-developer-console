import camry from '../__fixtures__/toyota_camry_2020.json';
import { vehicleVocab } from '../__fixtures__/vehicleVocab';
import { validateDraft } from '../templateValidate';
import { addTrim, setTrimValue, renameTrim, setSelectors } from '../templateGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

describe('validateDraft', () => {
  it('passes the real Camry', () => {
    expect(validateDraft(t, vehicleVocab)).toEqual([]);
  });

  it('reports a selector-less trim on a multi-trim template, in the worker words', () => {
    const withNew = addTrim(t, 'XLE V6');
    expect(validateDraft(withNew, vehicleVocab)).toContain(
      'trim XLE V6: selectors are required — a template with more than one trim cannot have a ' +
        'selector-less trim, which would match every signal and make every decode ambiguous',
    );
  });

  it.each([[{}], [{ manufacturerCode: [''] }], [{ vinPattern: '   ' }]])(
    'treats the degenerate selector %p as no selector at all',
    (selectors) => {
      const withNew = setSelectors(
        addTrim(t, 'XLE V6'),
        t.trims.length,
        selectors as never,
      );
      expect(
        validateDraft(withNew, vehicleVocab).some((e) =>
          e.includes('selectors are required'),
        ),
      ).toBe(true);
    },
  );

  it('accepts a selector-less trim when it is the only trim', () => {
    const single = { ...t, trims: [{ name: 'LE', attributes: {} }] } as Template;
    expect(validateDraft(single, vehicleVocab)).toEqual([]);
  });

  it('reports an attribute on both the template and a trim', () => {
    const both = {
      ...t,
      attributes: { ...t.attributes, powertrain_type: 'ICE' },
    } as Template;
    expect(validateDraft(both, vehicleVocab)).toContain(
      '"powertrain_type" is on both the template and trim LE — pick one',
    );
  });

  it('reports duplicate trim names and duplicate manufacturer codes', () => {
    const dupName = renameTrim(t, 1, t.trims[0].name);
    expect(validateDraft(dupName, vehicleVocab)).toContain(
      `duplicate trim name "${t.trims[0].name}" — trim names must be unique`,
    );

    const code = t.trims[0].selectors!.manufacturerCode![0];
    const dupCode = setSelectors(t, 1, { manufacturerCode: [code] });
    expect(validateDraft(dupCode, vehicleVocab)).toContain(
      `manufacturerCode ${code} is claimed by both "${t.trims[0].name}" and "${t.trims[1].name}"`,
    );
  });

  it('reports an unnamed trim, an empty trims array, and an id/year disagreement', () => {
    expect(validateDraft(renameTrim(t, 0, ''), vehicleVocab)).toContain(
      'each trim needs a name',
    );
    expect(validateDraft({ ...t, trims: [] } as Template, vehicleVocab)).toContain(
      'trims must contain at least one trim',
    );
    expect(validateDraft({ ...t, year: 2021 } as Template, vehicleVocab)).toContain(
      'year 2021 does not match the year in id "toyota_camry_2020"',
    );
  });

  it('reports an out-of-vocabulary value with the trim named', () => {
    const bad = setTrimValue(t, 0, 'mpg_city', 400);
    expect(validateDraft(bad, vehicleVocab)).toContain(
      'trim LE: "mpg_city" above maximum 200',
    );
  });

  it('says nothing about hardwareTemplateId, which is not a vocabulary attribute', () => {
    const hw = { ...t, hardwareTemplateId: '130' } as Template;
    expect(
      validateDraft(hw, vehicleVocab).some((e) => e.includes('hardwareTemplateId')),
    ).toBe(false);
  });
});
