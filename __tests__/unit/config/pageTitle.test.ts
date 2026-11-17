import { getPageTitle } from '@/config/navigation';

// Every authorized route gets a sentence-case header title; the header shows
// nothing when getPageTitle returns undefined.
describe('getPageTitle', () => {
  // Titles are message keys; the header translates them.
  it.each([
    ['/', 'navigation.pageTitles.home'],
    ['/app', 'navigation.pageTitles.home'],
    ['/licenses', 'navigation.pageTitles.licenses'],
    ['/license/42/details', 'navigation.pageTitles.licenseDetails'],
    ['/license/42/configurator', 'navigation.pageTitles.sdkConfigurator'],
    ['/license/42/configurator/new', 'navigation.pageTitles.sdkConfigurator'],
    ['/license/42/configurator/cfg-1', 'navigation.pageTitles.sdkConfigurator'],
    ['/license/vehicles/0xabc', 'navigation.pageTitles.licensedVehicles'],
    ['/webhooks', 'navigation.pageTitles.webhooks'],
    ['/webhooks/create/0xabc', 'navigation.pageTitles.createWebhook'],
    ['/webhooks/edit/0xabc/wh-1', 'navigation.pageTitles.editWebhook'],
    ['/templates', 'navigation.pageTitles.templates'],
    ['/templates/new', 'navigation.pageTitles.newTemplate'],
    ['/templates/toyota_camry_2020', 'navigation.pageTitles.editTemplate'],
    ['/connections', 'navigation.pageTitles.connections'],
    ['/connections/create/0xabc', 'navigation.pageTitles.createConnection'],
    ['/connections/conn-1', 'navigation.pageTitles.connectionDetails'],
    ['/vehicles', 'navigation.pageTitles.vehicles'],
    ['/vehicles/190231', 'navigation.pageTitles.vehicle'],
    ['/settings', 'navigation.pageTitles.settings'],
    ['/support', 'navigation.pageTitles.support'],
  ])('%s → %s', (path, title) => {
    expect(getPageTitle(path)).toBe(title);
  });

  it('returns undefined for an unknown path', () => {
    expect(getPageTitle('/this-does-not-exist')).toBeUndefined();
  });
});
