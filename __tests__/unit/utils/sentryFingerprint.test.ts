import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ErrorEvent, EventHint } from '@sentry/nextjs';
import { fingerprintUpstreamError, upstreamRoute } from '@/utils/sentryFingerprint';

const failure = (
  config: Record<string, unknown>,
  status?: number,
  code = 'ERR_BAD_REQUEST',
) =>
  new AxiosError(
    'failed',
    code,
    config as unknown as InternalAxiosRequestConfig,
    undefined,
    status ? ({ status, data: {} } as AxiosResponse) : undefined,
  );

const run = (error: unknown) => {
  const event = { type: undefined } as ErrorEvent;
  return fingerprintUpstreamError(event, { originalException: error } as EventHint);
};

describe('sentryFingerprint', () => {
  it('groups by upstream route and status', () => {
    const event = run(failure({ method: 'post', url: '/api/my/connections' }, 400));
    expect(event.fingerprint).toEqual(['axios', 'POST /api/my/connections', '400']);
    expect(event.tags).toMatchObject({
      upstream_route: 'POST /api/my/connections',
      upstream_status: '400',
    });
  });

  it('keeps a 401 and a 400 on one route apart', () => {
    const config = { method: 'get', url: '/api/my/connections' };
    expect(run(failure(config, 401)).fingerprint).not.toEqual(
      run(failure(config, 400)).fingerprint,
    );
  });

  it('replaces ids in the path', () => {
    expect(
      upstreamRoute({
        url: '/api/my/connections/7b0c2f7e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      }),
    ).toBe('GET /api/my/connections/:id');
    expect(upstreamRoute({ url: '/api/my/licenses/1254/signers/0x3ab3dDf8' })).toBe(
      'GET /api/my/licenses/:id/signers/:id',
    );
  });

  it('drops the host and the query', () => {
    expect(
      upstreamRoute({ url: 'https://console-api.dimo.org/api/brand?clientId=0xabc' }),
    ).toBe('GET /api/brand');
    expect(
      upstreamRoute({ baseURL: 'https://console-api.dimo.org', url: '/api/brand?x=1' }),
    ).toBe('GET /api/brand');
  });

  it('names an unknown route', () => {
    expect(upstreamRoute()).toBe('unknown');
    expect(upstreamRoute({ method: 'get' })).toBe('unknown');
  });

  it('names a failure without a response by its code', () => {
    const event = run(
      failure({ method: 'get', url: '/api/x' }, undefined, 'ECONNABORTED'),
    );
    expect(event.fingerprint?.[2]).toBe('ECONNABORTED');
  });

  it('leaves other errors alone', () => {
    expect(run(new Error('x')).fingerprint).toBeUndefined();
  });
});
