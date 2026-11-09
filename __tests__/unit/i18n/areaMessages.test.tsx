import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, useFormatter, useTranslations } from 'next-intl';
import { MergeMessages } from '@/i18n/MergeMessages';
import { GUEST_AREAS } from '@/i18n/messages';

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

const ROOT = join(__dirname, '..', '..', '..');
const GUEST_ROUTES = ['sign-in', 'sign-up', 'email-recovery'];

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

// Guest pages get common and the guest areas only (see GuestRouteLayout).
describe('guest pages', () => {
  it.each(GUEST_ROUTES)('/%s reads only common and the guest areas', (route) => {
    const allowed = new Set<string>(['common', ...GUEST_AREAS]);
    const namespaces = sourceFiles(join(ROOT, 'src/app', route)).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/useTranslations\('([^']+)'\)/g)].map(
        ([, namespace]) => namespace.split('.')[0],
      ),
    );
    expect(namespaces.length).toBeGreaterThan(0);
    expect(namespaces.filter((namespace) => !allowed.has(namespace))).toEqual([]);
  });
});
