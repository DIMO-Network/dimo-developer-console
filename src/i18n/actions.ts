'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, matchLocale, type Locale } from './locale';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const setLocale = async (locale: Locale): Promise<void> => {
  // A Server Action is a public endpoint: only a supported code is stored.
  const supported = matchLocale(locale);
  if (!supported) return;
  (await cookies()).set(LOCALE_COOKIE, supported, {
    maxAge: ONE_YEAR_IN_SECONDS,
    path: '/',
    sameSite: 'lax',
  });
};
