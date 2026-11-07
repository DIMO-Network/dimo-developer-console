import configuration from '@/config';

jest.mock('@/components/OwnerOnly', () => ({ OwnerOnly: () => null }));
jest.mock('@/layouts/AuthorizedLayout', () => ({ AuthorizedLayout: () => null }));
jest.mock('@/app/settings/components/View', () => ({ View: () => null }));
jest.mock('@/app/connections/components/View', () => ({ View: () => null }));
jest.mock('@/app/connections/create/[owner]/components/View', () => ({
  View: () => null,
}));
jest.mock('@/app/webhooks/create/[clientId]/components/View', () => ({
  View: () => null,
}));
jest.mock('@/app/webhooks/edit/[clientId]/[webhookId]/components/View', () => ({
  View: () => null,
}));

import { generateMetadata as webhooks } from '@/app/webhooks/layout';
import { generateMetadata as createWebhook } from '@/app/webhooks/create/[clientId]/page';
import { generateMetadata as editWebhook } from '@/app/webhooks/edit/[clientId]/[webhookId]/page';
import { generateMetadata as settings } from '@/app/settings/page';
import { generateMetadata as connections } from '@/app/connections/page';
import { generateMetadata as createConnection } from '@/app/connections/create/[owner]/page';

describe('settings, connections and webhooks page titles', () => {
  it.each([
    ['webhooks', webhooks, 'Webhooks'],
    ['create webhook', createWebhook, 'Create a Webhook'],
    ['edit webhook', editWebhook, 'Edit webhook'],
    ['settings', settings, 'Settings'],
    ['connections', connections, 'Connections'],
    ['create connection', createConnection, 'Create a Connection'],
  ])('%s', async (_name, generate, title) => {
    expect((await generate()).title).toBe(`${title} | ${configuration.appName}`);
  });
});
