/**
 * @jest-environment node
 */
import { AxiosError, type AxiosResponse } from 'axios';

jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/services/dimoDevAPI', () => ({ dimoDevAPIClient: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import { toFailure } from '@/services/teams';

const axiosFailure = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);

describe('toFailure reporting', () => {
  it('reports a server failure', () => {
    const error = axiosFailure(500, { message: 'Boom', code: 'INTERNAL' });

    expect(toFailure(error)).toEqual({
      ok: false,
      status: 500,
      code: 'INTERNAL',
      message: 'Boom',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('reports a request that never got an answer', () => {
    const error = new Error('socket hang up');

    expect(toFailure(error)).toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'socket hang up',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it.each([400, 401, 403, 404, 409])('leaves an expected %i refusal alone', (status) => {
    expect(toFailure(axiosFailure(status, { message: 'No', code: 'NOPE' }))).toEqual({
      ok: false,
      status,
      code: 'NOPE',
      message: 'No',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
