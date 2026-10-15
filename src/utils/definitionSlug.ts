/**
 * The id segments a template name produces.
 *
 * A template id is `<make>_<model>_<year>`, and definitions-worker does not
 * merely check that it looks right — it checks the id could have been BUILT
 * from the names in the body (`src/template.ts`, via `definitionModelSlug`,
 * itself a port of dd-api's Go `common.DeviceDefinitionSlug`). Get the
 * derivation wrong and the create is refused with
 * `model "X" does not match the model in id "..."`.
 *
 * So this is a deliberate third copy of one algorithm, vendored the same way
 * the template schema already is. It must track
 * `definitions-worker/src/validate.ts`. The test file pins the cases that
 * actually differ between a naive slug and this one — do not "clean" harder
 * than the Go original, or ids like `dodge_town-&-country_2012` and
 * `ford_ka+_2019` stop round-tripping.
 */

/**
 * Exact port of DIMO `shared/pkg/strings.SlugString`: lowercase, strip
 * combining marks (café → cafe), then map space _ / . ' to '-'. Every other
 * character — & + ( ) " , — survives this step.
 */
const slugString = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .normalize('NFC')
    .replace(/[ _/.']/g, '-');

/** Everything outside the id character class the worker's schema allows. */
const ID_DISALLOWED = /[^a-z0-9._&+-]/g;

/**
 * One id segment, repaired the way the only minter of ids repairs it.
 *
 * Mirrors the worker's `idPart`: slug the text, then drop every character an
 * id may not carry, because an id the worker refuses is one no decode can ever
 * use. So model `up!` becomes `up`, and `Tribeca (NY/NJ)` becomes
 * `tribeca-ny-nj`.
 *
 * Deriving the segment with this exact function is what makes the worker's
 * parity check pass by construction: it compares
 * `idPart(definitionModelSlug(model))` with `idPart(idModel)`, and both sides
 * reduce to `idPart(model)` when the id was built from the model this way.
 */
export const idPart = (part: string): string =>
  slugString(part).replace(ID_DISALLOWED, '');

/**
 * The template id for a manufacturer name, model name and year.
 *
 * `year` is passed through as typed rather than coerced: the form validates it
 * separately, and silently turning `20x4` into a number here would mint an id
 * that does not match what the person entered.
 */
export const templateId = (manufacturer: string, model: string, year: string): string =>
  `${idPart(manufacturer)}_${idPart(model)}_${year.trim()}`;
