import { idPart, templateId } from '@/utils/definitionSlug';

// These are the cases where a naive "lowercase and hyphenate" diverges from
// DIMO's SlugString, taken from ids that are live in the production catalog.
// If one of these breaks, the create form starts minting ids definitions-worker
// refuses with `model "X" does not match the model in id "..."`.
describe('idPart', () => {
  it('lowercases and maps space _ / . and apostrophe to a hyphen', () => {
    expect(idPart('Grand Cherokee')).toBe('grand-cherokee');
    expect(idPart('Model_S')).toBe('model-s');
    expect(idPart('NY/NJ')).toBe('ny-nj');
    expect(idPart('4.7')).toBe('4-7');
    expect(idPart("O'Neil")).toBe('o-neil');
  });

  it('keeps the characters real catalog ids carry', () => {
    // dodge_town-&-country_2012 and ford_ka+_2019 are live.
    expect(idPart('Town & Country')).toBe('town-&-country');
    expect(idPart('Ka+')).toBe('ka+');
  });

  it('drops characters an id may not carry rather than mangling them', () => {
    expect(idPart('up!')).toBe('up');
    expect(idPart('Tribeca (NY/NJ)')).toBe('tribeca-ny-nj');
    expect(idPart('Megane Grand Scenic, Megane Scenic')).toBe(
      'megane-grand-scenic-megane-scenic',
    );
  });

  it('strips combining marks instead of leaving non-ASCII in the id', () => {
    expect(idPart('Citroën')).toBe('citroen');
    expect(idPart('Škoda')).toBe('skoda');
  });

  it('is idempotent, so a slug typed in place of a name gives the same id', () => {
    for (const s of ['Town & Country', 'up!', 'Tribeca (NY/NJ)', 'Citroën']) {
      expect(idPart(idPart(s))).toBe(idPart(s));
    }
  });
});

describe('templateId', () => {
  it('builds <make>_<model>_<year> from display names', () => {
    expect(templateId('INEOS', 'Grenadier', '2024')).toBe('ineos_grenadier_2024');
    expect(templateId('Mercedes-Benz', 'V-Class', '2023')).toBe(
      'mercedes-benz_v-class_2023',
    );
  });

  it('gives the same id whether the person types the name or the slug', () => {
    expect(templateId('toyota', 'camry', '2020')).toBe(
      templateId('Toyota', 'Camry', '2020'),
    );
  });

  it('trims the year rather than letting stray space into the id', () => {
    expect(templateId('Audi', 'RS 3', ' 2019 ')).toBe('audi_rs-3_2019');
  });
});
