import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useFormatter } from 'next-intl';
import { RootProviders } from '@/layouts/RootLayout';

jest.unmock('next-intl');
jest.mock('@/hooks/useMixPanel', () => ({
  useMixPanel: () => ({ initMixPanel: jest.fn() }),
}));
jest.mock('@/hoc/QueryProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const VIEWER_TIME_ZONE = 'Asia/Tokyo';

const Created = () => {
  const format = useFormatter();
  return (
    <p>
      {format.dateTime(new Date('2026-01-15T23:30:00Z'), {
        dateStyle: 'medium',
        timeStyle: 'short',
      })}
    </p>
  );
};

describe('RootProviders', () => {
  beforeEach(() => {
    const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockImplementation(function (this: Intl.DateTimeFormat) {
        return { ...resolvedOptions.call(this), timeZone: VIEWER_TIME_ZONE };
      });
  });

  afterEach(() => jest.restoreAllMocks());

  // The server's provider hands down its own zone (UTC on Vercel); client
  // formatters must show the viewer's local time, as toLocaleString() did.
  it("formats dates in the viewer's time zone, not the server's", () => {
    render(
      <NextIntlClientProvider locale="en" timeZone="UTC" messages={{}}>
        <RootProviders>
          <Created />
        </RootProviders>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Jan 16, 2026, 8:30 AM')).toBeInTheDocument();
  });
});
