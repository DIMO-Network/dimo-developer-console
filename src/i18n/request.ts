import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type Locale } from './locale';
import { deepMerge, loadMessages } from './messages';

// English under the locale: an untranslated key shows English, not its path.
// English itself needs no merge.
const buildCatalog = async (locale: Locale) => {
  const english = await loadMessages(DEFAULT_LOCALE);
  if (locale === DEFAULT_LOCALE) return english;
  return deepMerge(english, await loadMessages(locale));
};

// The catalogs never change in a build, so production builds each locale's once
// per server instance. Development rebuilds per request so edits show up.
const catalogs = new Map<Locale, ReturnType<typeof buildCatalog>>();
const catalogFor = (locale: Locale) => {
  if (process.env.NODE_ENV !== 'production') return buildCatalog(locale);
  let catalog = catalogs.get(locale);
  if (!catalog) {
    catalog = buildCatalog(locale);
    // A failed load is not kept, so the next request tries again.
    catalog.catch(() => catalogs.delete(locale));
    catalogs.set(locale, catalog);
  }
  return catalog;
};

export default getRequestConfig(async () => {
  const locale = resolveLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  );
  return { locale, messages: await catalogFor(locale) };
});
