import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale } from './locale';
import { deepMerge, loadMessages } from './messages';

export default getRequestConfig(async () => {
  const locale = resolveLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  );
  // English under the locale: an untranslated key shows English, not its path.
  const [english, messages] = await Promise.all([
    loadMessages(DEFAULT_LOCALE),
    loadMessages(locale),
  ]);
  return { locale, messages: deepMerge(english, messages) };
});
