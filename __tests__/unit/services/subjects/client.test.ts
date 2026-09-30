/**
 * @jest-environment node
 */
import { postSubjectQuery, DataApiError } from '@/services/subjects/client';

jest.mock('@/utils/devJwt', () => ({ getDevJwt: jest.fn() }));
import { getDevJwt } from '@/utils/devJwt';

const fetchMock = jest.fn();
const req = { query: 'query { x }', variables: { a: 1 } };
const ASSET = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (getDevJwt as jest.Mock).mockReturnValue('dev.jwt');
});

const answer = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

describe('postSubjectQuery', () => {
  it('posts to the proxy with the developer JWT and returns data', async () => {
    answer(200, { data: { x: 1 } });
    const res = await postSubjectQuery<{ x: number }>('telemetry', {
      asset: ASSET,
      clientId: '0xabc',
      request: req,
    });
    expect(res).toEqual({ data: { x: 1 }, errors: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/data/telemetry');
    expect(init.headers.Authorization).toBe('Bearer dev.jwt');
    expect(JSON.parse(init.body)).toEqual({ asset: ASSET, ...req });
  });

  it('returns partial data with field errors instead of throwing', async () => {
    answer(200, {
      data: { x: null },
      errors: [{ message: 'needs location privilege', path: ['x'] }],
    });
    const res = await postSubjectQuery('fetch', {
      asset: ASSET,
      clientId: '0xabc',
      request: req,
    });
    expect(res.errors?.[0].message).toBe('needs location privilege');
    expect(res.data).toEqual({ x: null });
  });

  it('throws DEV_JWT_MISSING before calling the proxy when no JWT is stored', async () => {
    (getDevJwt as jest.Mock).mockReturnValue(null);
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toMatchObject({ code: 'DEV_JWT_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps proxy errors to DataApiError with their code', async () => {
    answer(403, { error: 'not shared', code: 'NOT_SHARED' });
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toEqual(
      expect.objectContaining({ status: 403, code: 'NOT_SHARED', message: 'not shared' }),
    );
  });

  it('treats an upstream 401 with GraphQL errors as a GraphQL failure', async () => {
    answer(401, { errors: [{ message: 'unauthorized' }] });
    await expect(
      postSubjectQuery('telemetry', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toBeInstanceOf(DataApiError);
  });

  it('maps a network failure to an UPSTREAM error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toMatchObject({ status: 0, code: 'UPSTREAM' });
  });

  it('treats a non-OK response with no code, data or errors as UPSTREAM', async () => {
    answer(502, {});
    await expect(
      postSubjectQuery('fetch', { asset: ASSET, clientId: '0xabc', request: req }),
    ).rejects.toMatchObject({ status: 502, code: 'UPSTREAM' });
  });
});
