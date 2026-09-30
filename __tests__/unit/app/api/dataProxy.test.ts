/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

jest.mock('@/services/subjectJwt', () => {
  const actual = jest.requireActual('@/services/subjectJwt');
  return { ...actual, getSubjectJwt: jest.fn() };
});

import { POST as telemetry } from '@/app/api/data/telemetry/route';
import { POST as fetchRoute } from '@/app/api/data/fetch/route';
import { getSubjectJwt, SubjectJwtError } from '@/services/subjectJwt';
import configuration from '@/config';

const VEHICLE = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:190231';
const ACCOUNT = 'did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const fetchMock = jest.fn();

const req = (body: unknown, auth = 'Bearer dev.jwt') =>
  new NextRequest('https://console.test/api/data/telemetry', {
    method: 'POST',
    headers: auth ? { 'Authorization': auth, 'Content-Type': 'application/json' } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (getSubjectJwt as jest.Mock).mockReset();
  (getSubjectJwt as jest.Mock).mockResolvedValue('asset-jwt');
});

describe('data proxy routes', () => {
  it('forwards a telemetry query with the asset JWT and passes the body through', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { availableSignals: ['speed'] } }), {
        status: 200,
      }),
    );
    const res = await telemetry(
      req({
        asset: VEHICLE,
        query: 'query { availableSignals(tokenId: 190231) }',
        variables: {},
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { availableSignals: ['speed'] } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(configuration.telemetryApiUrl);
    expect(init.headers.Authorization).toBe('Bearer asset-jwt');
    expect(getSubjectJwt).toHaveBeenCalledWith('dev.jwt', VEHICLE);
  });

  it('keeps the upstream status on GraphQL errors', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ errors: [{ message: 'unauthorized' }] }), {
        status: 401,
      }),
    );
    const res = await fetchRoute(req({ asset: ACCOUNT, query: 'query { x }' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ errors: [{ message: 'unauthorized' }] });
    expect(fetchMock.mock.calls[0][0]).toBe(configuration.fetchApiUrl);
  });

  it('answers 401 without a bearer token', async () => {
    const res = await telemetry(req({ asset: VEHICLE, query: 'query { x }' }, ''));
    expect(res.status).toBe(401);
    expect(getSubjectJwt).not.toHaveBeenCalled();
  });

  it.each([
    [{ asset: 'did:web:x', query: 'query { x }' }, 'asset'],
    [{ asset: VEHICLE }, 'query'],
    [{ asset: VEHICLE, query: 'q'.repeat(20_001) }, 'query'],
    ['not json', 'body'],
    ['null', 'body'],
  ])('answers 400 for %j', async (body, field) => {
    const res = await telemetry(req(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain(field);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('telemetry refuses an account asset', async () => {
    const res = await telemetry(req({ asset: ACCOUNT, query: 'query { x }' }));
    expect(res.status).toBe(400);
  });

  it('maps subject JWT errors to their status and code', async () => {
    (getSubjectJwt as jest.Mock).mockRejectedValueOnce(
      new SubjectJwtError(403, 'NOT_SHARED', 'not shared'),
    );
    const res = await fetchRoute(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'not shared', code: 'NOT_SHARED' });
  });

  it('answers 502 when the upstream is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const res = await fetchRoute(req({ asset: VEHICLE, query: 'query { x }' }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('UPSTREAM');
  });
});
