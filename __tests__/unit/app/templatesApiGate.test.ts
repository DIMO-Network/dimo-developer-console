/**
 * @jest-environment node
 *
 * While the template editor is switched off its API must not reach the
 * definitions backend, whether or not a caller finds the routes directly.
 */
import { NextRequest } from 'next/server';

jest.mock('@/utils/featureFlags', () => ({ TEMPLATE_EDITOR_ENABLED: false }));
jest.mock('@/services/definitions', () => ({
  fetchTemplate: jest.fn(),
  fetchVocabulary: jest.fn(),
  publishTemplate: jest.fn(),
}));
jest.mock('@/services/templateEntitlement', () => ({
  ...jest.requireActual('@/services/templateEntitlement'),
  resolveCaller: jest.fn(),
}));

import { GET as search } from '@/app/api/templates/route';
import { GET as read, PUT as publish } from '@/app/api/templates/[id]/route';
import { fetchTemplate, publishTemplate } from '@/services/definitions';
import { resolveCaller } from '@/services/templateEntitlement';

const params = { params: Promise.resolve({ id: 'toyota_camry_2020' }) };

describe('template API while the editor is disabled', () => {
  it('search answers 404 without calling the backend', async () => {
    const res = await search(
      new NextRequest('https://console.test/api/templates?make=Toyota'),
    );
    expect(res.status).toBe(404);
    expect(fetchTemplate).not.toHaveBeenCalled();
  });

  it('read answers 404 without resolving the caller', async () => {
    const res = await read(
      new NextRequest('https://console.test/api/templates/x'),
      params,
    );
    expect(res.status).toBe(404);
    expect(resolveCaller).not.toHaveBeenCalled();
    expect(fetchTemplate).not.toHaveBeenCalled();
  });

  it('publish answers 404 without writing', async () => {
    const res = await publish(
      new NextRequest('https://console.test/api/templates/x', {
        method: 'PUT',
        body: JSON.stringify({ id: 'toyota_camry_2020' }),
      }),
      params,
    );
    expect(res.status).toBe(404);
    expect(publishTemplate).not.toHaveBeenCalled();
  });
});
