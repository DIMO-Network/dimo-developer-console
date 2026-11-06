import '@testing-library/jest-dom';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.XMLHttpRequest = undefined as any;

// Every test renders in English: translations resolve against messages/en, so
// assertions on English text keep working without a provider.
const mockEnglishMessages = (() => {
  const dir = join(__dirname, 'messages', 'en');
  return Object.fromEntries(
    readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => [
        file.replace(/\.json$/, ''),
        JSON.parse(readFileSync(join(dir, file), 'utf8')),
      ]),
  );
})();

const mockIntl = () => {
  const { createFormatter, createTranslator } = jest.requireActual('next-intl');
  const namespaceOf = (arg?: string | { namespace?: string }) =>
    typeof arg === 'object' ? arg.namespace : arg;
  return {
    translator: (arg?: string | { namespace?: string }) =>
      createTranslator({
        locale: 'en',
        messages: mockEnglishMessages,
        namespace: namespaceOf(arg),
      }),
    // The runtime's time zone, as next-intl's server config falls back to.
    formatter: () =>
      createFormatter({
        locale: 'en',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
  };
};

jest.mock('next-intl', () => {
  const { translator, formatter } = mockIntl();
  return {
    ...jest.requireActual('next-intl'),
    useTranslations: translator,
    useLocale: () => 'en',
    useFormatter: formatter,
    useMessages: () => mockEnglishMessages,
    NextIntlClientProvider: ({ children }: { children: unknown }) => children,
  };
});

jest.mock('next-intl/server', () => {
  const { translator, formatter } = mockIntl();
  return {
    getTranslations: async (arg?: string | { namespace?: string }) => translator(arg),
    getLocale: async () => 'en',
    getFormatter: async () => formatter(),
    getMessages: async () => mockEnglishMessages,
    getRequestConfig: (createConfig: unknown) => createConfig,
  };
});
