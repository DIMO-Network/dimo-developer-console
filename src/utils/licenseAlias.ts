// The license contract keeps an alias as bytes32 and reverts past that with
// AliasExceedsMaxLength, so what counts is bytes, not letters.
const MAX_ALIAS_BYTES = 32;

// Message key in the common namespace; callers translate it.
export const LICENSE_ALIAS_TOO_LONG_KEY = 'licenseAlias.tooLong';

// English copy of the same message, for callers that have not moved to the key.
export const LICENSE_ALIAS_TOO_LONG =
  'Use at most 32 characters. Accented letters and emoji count as more than one.';

export const isLicenseAliasTooLong = (alias: string) =>
  new TextEncoder().encode(alias).length > MAX_ALIAS_BYTES;
