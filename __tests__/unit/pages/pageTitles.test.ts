import configuration from '@/config';

jest.mock('@/app/license/[tokenId]/configurator/components/ListView', () => ({
  ListView: () => null,
}));
jest.mock('@/app/license/[tokenId]/configurator/new/components/View', () => ({
  View: () => null,
}));
jest.mock('@/app/license/[tokenId]/configurator/[id]/components/View', () => ({
  View: () => null,
}));
jest.mock('@/app/license/vehicles/[clientId]/components/View/View', () => ({
  View: () => null,
}));
jest.mock('@/components/OwnerOnly', () => ({ OwnerOnly: () => null }));

import { metadata as list } from '@/app/license/[tokenId]/configurator/page';
import { metadata as create } from '@/app/license/[tokenId]/configurator/new/page';
import { metadata as edit } from '@/app/license/[tokenId]/configurator/[id]/page';
import { metadata as vehicles } from '@/app/license/vehicles/[clientId]/page';

describe('page titles', () => {
  it.each([
    ['configurator list', list, 'SDK configurator'],
    ['new configuration', create, 'New configuration'],
    ['edit configuration', edit, 'Edit configuration'],
    ['licensed vehicles', vehicles, 'Licensed vehicles'],
  ])('%s', (_name, metadata, title) => {
    expect(metadata.title).toBe(`${title} | ${configuration.appName}`);
  });
});
