import { getPageTitle } from '@/config/navigation';

// Every authorized route gets a sentence-case header title; the header shows
// nothing when getPageTitle returns undefined.
describe('getPageTitle', () => {
  it.each([
    ['/', 'Home'],
    ['/app', 'Home'],
    ['/licenses', 'Licenses'],
    ['/license/42/details', 'License details'],
    ['/license/42/configurator', 'SDK configurator'],
    ['/license/42/configurator/new', 'SDK configurator'],
    ['/license/42/configurator/cfg-1', 'SDK configurator'],
    ['/license/vehicles/0xabc', 'Licensed vehicles'],
    ['/webhooks', 'Webhooks'],
    ['/webhooks/create/0xabc', 'Create a webhook'],
    ['/webhooks/edit/0xabc/wh-1', 'Edit webhook'],
    ['/templates', 'Vehicle templates'],
    ['/templates/new', 'New template'],
    ['/templates/toyota_camry_2020', 'Edit template'],
    ['/connections', 'Connections'],
    ['/connections/create/0xabc', 'Create a connection'],
    ['/connections/conn-1', 'Connection details'],
    ['/explorer', 'Data explorer'],
    ['/explorer/190231', 'Data explorer'],
    ['/settings', 'Settings'],
    ['/support', 'Support'],
  ])('%s → %s', (path, title) => {
    expect(getPageTitle(path)).toBe(title);
  });

  it('returns undefined for an unknown path', () => {
    expect(getPageTitle('/this-does-not-exist')).toBeUndefined();
  });
});
