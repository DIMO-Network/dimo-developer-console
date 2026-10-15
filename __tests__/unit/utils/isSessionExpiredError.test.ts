/**
 * @jest-environment node
 */
// jose is ESM and this module imports it for the JWT path; mocked here for the
// same reason middlewareUtils.test.ts mocks it.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'key-set'),
  jwtVerify: jest.fn(async () => ({ payload: { sub: 'user' } })),
}));

import { AxiosError } from 'axios';
import { isSessionExpiredError } from '@/utils/middlewareUtils';

const axiosFailure = (url: string, status: number) => {
  const err = new AxiosError(`Request failed with status code ${status}`);
  err.config = { url, headers: {} } as never;
  err.response = {
    status,
    data: {},
    statusText: '',
    headers: {},
    config: err.config,
  } as never;
  return err;
};

describe('isSessionExpiredError', () => {
  it('is true when the session check itself answers 401', () => {
    expect(isSessionExpiredError(axiosFailure('/api/me', 401))).toBe(true);
  });

  it('is true for the session check carrying an invitation code', () => {
    // getUserByToken appends ?invitation_code=... when the cookie is set.
    expect(isSessionExpiredError(axiosFailure('/api/me?invitation_code=abc', 401))).toBe(
      true,
    );
  });

  // The regression this exists for. A 401 from another endpoint means this
  // session could not make that one request -- not that the session is over.
  // Signing out on it discarded a working session repeatedly while the
  // template route was returning 401 for every user.
  it.each(['/api/templates/ford_f-150_2021', '/api/my/team', '/api/webhooks'])(
    'is false when %s answers 401',
    (url) => {
      expect(isSessionExpiredError(axiosFailure(url, 401))).toBe(false);
    },
  );

  it.each([403, 404, 500, 503])(
    'is false for the session check answering %i',
    (status) => {
      // Only 401 means expired. A 403 from /api/me is a session that exists and
      // is refused, and a 5xx is the server failing, not the session ending.
      expect(isSessionExpiredError(axiosFailure('/api/me', status))).toBe(false);
    },
  );

  it('is false for a request with no url recorded', () => {
    const err = new AxiosError('boom');
    err.response = { status: 401 } as never;
    expect(isSessionExpiredError(err)).toBe(false);
  });

  it('is false for anything that is not an axios failure', () => {
    expect(isSessionExpiredError(new Error('Network Error'))).toBe(false);
    expect(isSessionExpiredError(undefined)).toBe(false);
    expect(isSessionExpiredError({ response: { status: 401 } })).toBe(false);
  });
});
