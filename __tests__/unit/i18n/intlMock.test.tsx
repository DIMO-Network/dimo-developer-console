import { render, screen } from '@testing-library/react';
import {
  NextIntlClientProvider,
  useFormatter,
  useLocale,
  useTranslations,
} from 'next-intl';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';

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
});
