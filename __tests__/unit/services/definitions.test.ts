/**
 * @jest-environment node
 *
 * services/definitions is server-only and throws when `window` exists, which is
 * the guarantee that DEFINITIONS_WRITE_TOKEN cannot reach a browser bundle. The
 * default jsdom environment therefore cannot load it at all -- see the
 * "refuses to load in a browser" case below, which asserts exactly that.
 */
import { fetchTemplate, fetchVocabulary, publishTemplate } from '@/services/definitions';
import type { TemplatePayload } from '@/types/template';

const payload = {
  id: 'toyota_camry_2020',
  deviceType: 'vehicle',
  manufacturer: { slug: 'toyota', name: 'Toyota' },
  model: 'Camry',
  year: 2020,
  attributes: {},
  trims: [{ name: 'LE', attributes: {} }],
} as unknown as TemplatePayload;

const mockFetch = (impl: jest.Mock) => {
  global.fetch = impl as unknown as typeof fetch;
  return impl;
};

describe('definitions service', () => {
  it('returns null for a template that does not exist yet', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    expect(await fetchTemplate('ineos_grenadier_2024')).toBeNull();
  });

  it('misses the edge cache on every read whose answer feeds a write', async () => {
    // config.definitionsWorkerUrl is definitions.dimo.org and the worker serves
    // /t/<id> `public, max-age=86400, stale-while-revalidate=604800`, so a
    // plain GET can be answered by Cloudflare with a day-old document. The
    // editor reads, mutates and PUTs back with the version it read, so a
    // cached read sends a stale If-Match and conflicts with itself. `cache:
    // 'no-store'` does not help: it bypasses Next's Data Cache only, never the
    // edge -- dd-api proved the same against this exact host and settled on a
    // unique query parameter the worker ignores and the edge cannot match.
    const f = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...payload, version: 1 }),
      }),
    );

    await fetchTemplate('toyota_camry_2020');
    await fetchTemplate('toyota_camry_2020');

    const first = new URL(f.mock.calls[0][0]);
    const second = new URL(f.mock.calls[1][0]);
    expect(first.pathname).toBe('/t/toyota_camry_2020');
    expect(first.searchParams.get('fresh')).toBeTruthy();
    // Two reads inside one clock tick still have to be two cache keys.
    expect(second.searchParams.get('fresh')).not.toBe(first.searchParams.get('fresh'));
  });

  it('lets a browse listing keep the edge cache, explicitly', async () => {
    // The search page reads up to 25 templates per keystroke-ish query and does
    // nothing with them but render a version and a trim count. Nothing it reads
    // is ever written back, so paying for 25 origin hits buys nothing.
    const f = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...payload, version: 1 }),
      }),
    );
    await fetchTemplate('toyota_camry_2020', { allowEdgeCache: true });
    expect(new URL(f.mock.calls[0][0]).search).toBe('');
  });

  it('sends If-None-Match on create and If-Match on update, and never the token to the body', async () => {
    process.env.DEFINITIONS_WRITE_TOKEN = 'secret-token';
    const f = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...payload, version: 1 }),
      }),
    );

    await publishTemplate('toyota_camry_2020', payload, { kind: 'create' });
    expect(f.mock.calls[0][1].headers['If-None-Match']).toBe('*');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-token');
    expect(f.mock.calls[0][1].body).not.toContain('secret-token');

    await publishTemplate('toyota_camry_2020', payload, { kind: 'update', version: 7 });
    expect(f.mock.calls[1][1].headers['If-Match']).toBe('"7"');
  });

  it('maps 422 to validation errors and 412 to a conflict', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ errors: ['template: unknown attribute "nope"'] }),
      }),
    );
    expect(
      await publishTemplate('toyota_camry_2020', payload, { kind: 'create' }),
    ).toEqual({
      ok: false,
      kind: 'validation',
      errors: ['template: unknown attribute "nope"'],
    });

    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 412,
        json: async () => ({
          error: 'expected version 6 but the current version is 7',
          expected: 6,
          actual: 7,
        }),
      }),
    );
    expect(
      await publishTemplate('toyota_camry_2020', payload, { kind: 'update', version: 6 }),
    ).toEqual({ ok: false, kind: 'conflict', expected: 6, actual: 7 });
  });

  it('refuses a payload over the worker 64KB cap before spending a request', async () => {
    const f = mockFetch(jest.fn());
    const fat = {
      ...payload,
      trims: Array.from({ length: 4000 }, (_, i) => ({ name: `T${i}`, attributes: {} })),
    };
    const result = await publishTemplate(
      'toyota_camry_2020',
      fat as unknown as TemplatePayload,
      { kind: 'create' },
    );
    expect(result).toMatchObject({ ok: false, kind: 'too-large' });
    expect(f).not.toHaveBeenCalled();
  });

  it('fetches the vocabulary from the worker, not from a vendored copy', async () => {
    const f = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'vehicle', name: 'Vehicle', attributes: [] }),
      }),
    );
    await fetchVocabulary();
    expect(f.mock.calls[0][0]).toContain('/schema/device-type-vehicle.json');
  });
});
