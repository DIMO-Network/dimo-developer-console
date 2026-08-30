/**
 * @jest-environment node
 *
 * Route handlers run on the server and this one reaches @/services/definitions,
 * which refuses to load where `window` exists.
 */
import { GET } from '@/app/api/templates/route';
import { NextRequest } from 'next/server';

jest.mock('@/services/definitions', () => ({
  fetchTemplate: jest.fn(),
}));
import { fetchTemplate } from '@/services/definitions';

const identityResponse = {
  data: {
    manufacturer: {
      name: 'Toyota',
      tokenId: 131,
      deviceDefinitions: {
        nodes: [
          { deviceDefinitionId: 'toyota_camry_2020', model: 'Camry', year: 2020 },
          { deviceDefinitionId: 'toyota_supra_2020', model: 'Supra', year: 2020 },
        ],
      },
    },
  },
};

const req = (qs: string) => new NextRequest(`https://console.test/api/templates?${qs}`);

describe('GET /api/templates', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => identityResponse,
    }) as unknown as typeof fetch;
  });

  it('requires a make', async () => {
    expect((await GET(req('model=Camry'))).status).toBe(400);
  });

  it('marks a definition with no template as missing rather than failing', async () => {
    (fetchTemplate as jest.Mock)
      .mockResolvedValueOnce({ id: 'toyota_camry_2020', version: 3, trims: [{}, {}] })
      .mockResolvedValueOnce(null);
    const body = await (await GET(req('make=Toyota&model=Camry&year=2020'))).json();
    expect(body.results).toEqual([
      {
        id: 'toyota_camry_2020',
        model: 'Camry',
        year: 2020,
        status: 'ok',
        version: 3,
        trims: 2,
      },
      { id: 'toyota_supra_2020', model: 'Supra', year: 2020, status: 'missing' },
    ]);
  });

  it('marks an id the schema cannot accept, without asking the worker about it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          manufacturer: {
            name: 'Subaru',
            tokenId: 1,
            deviceDefinitions: {
              nodes: [
                {
                  deviceDefinitionId: 'subaru_tribeca-(ny/nj)_2008',
                  model: 'Tribeca',
                  year: 2008,
                },
              ],
            },
          },
        },
      }),
    }) as unknown as typeof fetch;
    (fetchTemplate as jest.Mock).mockClear();
    const body = await (await GET(req('make=Subaru'))).json();
    expect(body.results[0].status).toBe('invalid-id');
    expect(fetchTemplate).not.toHaveBeenCalled();
  });

  it('reports an unknown manufacturer as null rather than an empty result set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { manufacturer: null } }),
    }) as unknown as typeof fetch;
    const body = await (await GET(req('make=Nope'))).json();
    expect(body).toEqual({ manufacturer: null, results: [] });
  });
});
