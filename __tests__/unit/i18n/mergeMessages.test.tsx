import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useFormatter, useTranslations } from 'next-intl';
import { MergeMessages } from '@/i18n/MergeMessages';

jest.unmock('next-intl');

const Probe = () => {
  const common = useTranslations('common');
  const vehicles = useTranslations('vehicles');
  const format = useFormatter();
  return (
    <p>
      {common('hello')} {vehicles('title')}{' '}
      {format.dateTime(new Date('2026-01-15T23:30:00Z'), { timeStyle: 'short' })}
    </p>
  );
};

describe('MergeMessages', () => {
  it("adds its areas to the ones above it and keeps the provider's time zone", () => {
    render(
      <NextIntlClientProvider
        locale="en"
        timeZone="Asia/Tokyo"
        messages={{ common: { hello: 'Hello' } }}
      >
        <MergeMessages messages={{ vehicles: { title: 'Vehicles' } }}>
          <Probe />
        </MergeMessages>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Hello Vehicles 8:30 AM')).toBeInTheDocument();
  });
});
