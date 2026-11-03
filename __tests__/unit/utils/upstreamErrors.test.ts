import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import {
  isUnexpectedFailure,
  reportUnexpected,
  stripRequestDetails,
  withoutRequestDetails,
} from '@/utils/upstreamErrors';

const build = (headers: unknown) =>
  new AxiosError(
    'Bad Request',
    'ERR_BAD_REQUEST',
    { headers, data: 'signature=0xsecret' } as never,
    { body: '0xsecret' },
    {
      status: 400,
      data: { reason: 'nope' },
      config: { headers, data: 'signature=0xsecret' },
      request: { body: '0xsecret' },
    } as unknown as AxiosResponse,
  );

describe('upstreamErrors', () => {
  it('drops Authorization from AxiosHeaders and from plain headers', () => {
    const viaAxios = build(new AxiosHeaders({ Authorization: 'Bearer t', Accept: 'a' }));
    const viaPlain = build({ Authorization: 'Bearer t', Accept: 'a' });
    stripRequestDetails(viaAxios);
    stripRequestDetails(viaPlain);
    for (const error of [viaAxios, viaPlain]) {
      for (const c of [error.config, error.response?.config]) {
        expect(JSON.stringify(c?.headers)).not.toContain('Bearer t');
        expect(JSON.stringify(c?.headers)).toContain('Accept');
        expect(c?.data).toBeUndefined();
      }
      expect(error.request).toBeUndefined();
      expect(error.response?.request).toBeUndefined();
    }
  });

  it('keeps message, code, status and response data', () => {
    const error = build({ Authorization: 'Bearer t' });
    stripRequestDetails(error);
    expect(error.message).toBe('Bad Request');
    expect(error.code).toBe('ERR_BAD_REQUEST');
    expect(error.response?.status).toBe(400);
    expect(error.response?.data).toEqual({ reason: 'nope' });
  });

  it('ignores an error that is not an AxiosError', async () => {
    const error = Object.assign(new Error('boom'), {
      config: { data: 'keep' },
      request: 'keep',
    });
    stripRequestDetails(error);
    expect(error).toMatchObject({ config: { data: 'keep' }, request: 'keep' });
    await expect(withoutRequestDetails(Promise.reject(error))).rejects.toBe(error);
    expect(error).toMatchObject({ config: { data: 'keep' }, request: 'keep' });
  });

  it('tells an unexpected failure from the API refusing', () => {
    const withStatus = (status: number) =>
      new AxiosError('x', 'E', undefined, undefined, { status } as AxiosResponse);
    expect(isUnexpectedFailure(withStatus(503))).toBe(true);
    expect(isUnexpectedFailure(withStatus(404))).toBe(false);
    expect(isUnexpectedFailure(new AxiosError('no response'))).toBe(true);
    expect(isUnexpectedFailure(new Error('boom'))).toBe(true);
  });

  it('reportUnexpected strips before it captures', () => {
    const error = build({ Authorization: 'Bearer t' });
    Object.assign(error.response!, { status: 500 });
    reportUnexpected(error);
    const captured = (Sentry.captureException as jest.Mock).mock.calls[0][0];
    expect(captured).toBe(error);
    expect(captured.config.data).toBeUndefined();
  });
});
