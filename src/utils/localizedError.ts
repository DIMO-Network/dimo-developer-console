import type { Translate } from '@/i18n/translate';

// An Error whose message stays English for logs and tests, and whose key names
// the common-namespace message to show the user instead.
export class LocalizedError extends Error {
  constructor(
    readonly key: string,
    message: string,
    readonly values?: Record<string, string | number>,
  ) {
    super(message);
    this.name = 'LocalizedError';
  }
}

// What to show for a caught error: its translation if it carries a key, else its own message.
export const errorText = (t: Translate, error: unknown, fallback: string): string => {
  if (error instanceof LocalizedError) return t(error.key, error.values);
  return (error instanceof Error && error.message) || fallback;
};
