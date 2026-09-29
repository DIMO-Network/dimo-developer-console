import { coerce } from '../templateCoerce';
import { vehicleVocab } from '../__fixtures__/vehicleVocab';

const def = (name: string) => vehicleVocab.attributes.find((a) => a.name === name)!;

describe('coerce', () => {
  it('parses a stringified number into a number and says it did', () => {
    expect(coerce(def('fuel_tank_capacity_gal'), '15.800000')).toEqual({
      kind: 'value',
      value: 15.8,
      note: {
        attribute: 'fuel_tank_capacity_gal',
        from: '15.800000',
        to: 15.8,
        reason: 'stored as the number 15.8, not the text "15.800000"',
      },
    });
  });

  it('does not report a note when nothing was changed', () => {
    expect(coerce(def('mpg_city'), '28')).toEqual({ kind: 'value', value: 28 });
  });

  it('treats an empty or whitespace input as a removal, never as an empty value', () => {
    for (const raw of ['', '   ']) {
      expect(coerce(def('mpg_city'), raw)).toEqual({
        kind: 'clear',
        note: {
          attribute: 'mpg_city',
          from: raw,
          to: null,
          reason: 'cleared — the attribute is removed, not stored empty',
        },
      });
    }
  });

  it('refuses a value outside the vocabulary bounds with the reason', () => {
    expect(coerce(def('mpg_city'), '400')).toEqual({
      kind: 'error',
      message: 'template: "mpg_city" above maximum 200',
    });
  });

  it('refuses a non-integer for an integer attribute', () => {
    expect(coerce(def('number_of_doors'), '4.5')).toEqual({
      kind: 'error',
      message: 'template: "number_of_doors" must be an integer',
    });
  });

  it('refuses a value outside an enum options list', () => {
    expect(coerce(def('powertrain_type'), 'Hybrid')).toEqual({
      kind: 'error',
      message:
        'template: "powertrain_type"="Hybrid" is not one of ["ICE","HEV","PHEV","BEV","FCEV"]',
    });
  });

  it('names the trim when one is given', () => {
    expect(coerce(def('mpg_city'), '400', 'trim LE')).toEqual({
      kind: 'error',
      message: 'trim LE: "mpg_city" above maximum 200',
    });
  });

  it('trims surrounding whitespace on a string attribute and says it did', () => {
    expect(coerce(def('manufacturer_code'), '  2532 ')).toEqual({
      kind: 'value',
      value: '2532',
      note: {
        attribute: 'manufacturer_code',
        from: '  2532 ',
        to: '2532',
        reason: 'surrounding whitespace removed',
      },
    });
  });
});
