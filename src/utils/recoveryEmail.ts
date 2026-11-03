/**
 * Reads the email out of a recovery link's query string.
 *
 * The link's URL is put into Turnkey's `magicLinkTemplate` next to `%s`, so the
 * link can't safely carry the address as `%2B`. A `+` in it reaches
 * `URLSearchParams`, which decodes it as a space. An email address can't contain
 * a space, so putting the `+` back is safe.
 */
export const emailFromRecoveryLink = (raw: string | null): string | null => {
  if (!raw) return null;
  return raw.replaceAll(' ', '+');
};
