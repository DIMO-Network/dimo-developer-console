import { render, screen } from '@testing-library/react';
import {
  NextIntlClientProvider,
  useFormatter,
  useLocale,
  useNow,
  useTimeZone,
  useTranslations,
} from 'next-intl';
import {
  getFormatter,
  getLocale,
  getNow,
  getTimeZone,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

const RUNTIME_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// jest.setup.ts mocks next-intl so every test renders English without a
// provider. These pin the shape the rest of the suite relies on.
describe('next-intl test mock', () => {
  it('resolves client translations against messages/en', () => {
    const Label = () => {
      const t = useTranslations('common');
      return <p lang={useLocale()}>{t('languageSwitcher.label')}</p>;
    };
    render(
      <NextIntlClientProvider>
        <Label />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Language')).toHaveAttribute('lang', 'en');
  });

  it('resolves server translations against messages/en', async () => {
    const t = await getTranslations('common');
    expect(t('languageSwitcher.label')).toBe('Language');
    const named = await getTranslations({ locale: 'en', namespace: 'common' });
    expect(named('languageSwitcher.label')).toBe('Language');
    expect(await getLocale()).toBe('en');
  });

  it('formats numbers and dates in English', async () => {
    const date = new Date(2026, 0, 15);
    const Formatted = () => {
      const format = useFormatter();
      return (
        <p>{`${format.number(1234.5)} ${format.dateTime(date, { dateStyle: 'medium' })}`}</p>
      );
    };
    render(<Formatted />);
    expect(screen.getByText('1,234.5 Jan 15, 2026')).toBeInTheDocument();
    expect((await getFormatter()).number(0.25, { style: 'percent' })).toBe('25%');
  });

  it('formats relative time against useNow without a provider', async () => {
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Ago = () => {
      const now = useNow({ updateInterval: 60_000 });
      const format = useFormatter();
      return (
        <p data-zone={useTimeZone()}>
          {format.relativeTime(new Date(now.getTime() - 2 * 60 * 60 * 1000), now)}
        </p>
      );
    };
    render(<Ago />);
    expect(screen.getByText('2 hours ago')).toHaveAttribute(
      'data-zone',
      RUNTIME_TIME_ZONE,
    );
    expect((await getFormatter()).relativeTime(new Date(Date.now() - 5 * 60_000))).toBe(
      '5 minutes ago',
    );
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('keeps the rest of the server API', async () => {
    expect(setRequestLocale).toEqual(expect.any(Function));
    expect(getNow).toEqual(expect.any(Function));
    expect(getTimeZone).toEqual(expect.any(Function));
  });

  it('fails the test on a key missing from messages/en', async () => {
    const t = await getTranslations('common');
    expect(() => t('languageSwitcher.notAKey')).toThrow(/MISSING_MESSAGE/);
    const Missing = () => <p>{useTranslations('common')('notAKey')}</p>;
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Missing />)).toThrow(/MISSING_MESSAGE/);
    errors.mockRestore();
  });
});
