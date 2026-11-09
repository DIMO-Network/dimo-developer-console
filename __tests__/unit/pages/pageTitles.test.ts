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
jest.mock('@/layouts/AuthorizedLayout', () => ({ AuthorizedLayout: () => null }));
jest.mock('@/app/templates/templatesPage/View', () => ({ TemplatesPage: () => null }));
jest.mock('@/app/templates/new/components/PresetView', () => ({
  PresetView: () => null,
}));
jest.mock('@/app/app/list/components/View', () => ({ View: () => null }));

import { generateMetadata as list } from '@/app/license/[tokenId]/configurator/page';
import { generateMetadata as create } from '@/app/license/[tokenId]/configurator/new/page';
import { generateMetadata as edit } from '@/app/license/[tokenId]/configurator/[id]/page';
import { generateMetadata as vehicles } from '@/app/license/vehicles/[clientId]/page';
import { generateMetadata as licenses } from '@/app/licenses/layout';
import { generateMetadata as templates } from '@/app/templates/page';
import { generateMetadata as newTemplate } from '@/app/templates/new/page';
import { generateMetadata as home } from '@/app/page';
import { generateMetadata as notFound } from '@/app/not-found';

describe('page titles', () => {
  it.each([
    ['configurator list', list, 'SDK configurator'],
    ['new configuration', create, 'New configuration'],
    ['edit configuration', edit, 'Edit configuration'],
    ['licensed vehicles', vehicles, 'Licensed vehicles'],
    ['licenses', licenses, 'Licenses'],
    ['templates', templates, 'Templates'],
    ['new template', newTemplate, 'New template'],
    ['home', home, 'Home'],
    ['not found', notFound, '404'],
  ])('%s', async (_name, metadata, title) => {
    const resolved = typeof metadata === 'function' ? await metadata() : metadata;
    expect(resolved.title).toBe(`${title} | ${configuration.appName}`);
  });
});
