import { HttpError, isClientError } from '@/utils/httpError';

describe('HttpError', () => {
  it('keeps the status alongside the message', () => {
    const err = new HttpError(401, 'Unauthorized');
    expect(err.status).toBe(401);
    expect(err.message).toBe('Unauthorized');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('isClientError', () => {
  // The retry policy in QueryProvider reads this. A 4xx is the server
  // declining what was sent, so repeating the request byte for byte gets the
  // same answer; a 5xx or a dropped connection can clear on its own.
  it.each([400, 401, 403, 404, 409, 422, 499])(
    'treats %i as not worth retrying',
    (status) => {
      expect(isClientError(new HttpError(status, 'no'))).toBe(true);
    },
  );

  it.each([500, 502, 503, 504])('leaves %i retryable', (status) => {
    expect(isClientError(new HttpError(status, 'no'))).toBe(false);
  });

  it('leaves an error with no status retryable', () => {
    // A timeout or a dropped connection arrives as a plain Error. Those are
    // exactly the failures retrying exists for, so they must not be caught here.
    expect(isClientError(new Error('Network Error'))).toBe(false);
    expect(isClientError(undefined)).toBe(false);
    expect(isClientError('nope')).toBe(false);
  });
});
