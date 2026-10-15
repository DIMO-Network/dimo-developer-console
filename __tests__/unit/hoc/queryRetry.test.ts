import { queryClient } from '@/hoc/QueryProvider';
import { HttpError } from '@/utils/httpError';

// The editor's 401 was four identical rejected requests before the UI could
// say anything, because the default policy retries every failure three times.
describe('queryClient retry policy', () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as (
    failureCount: number,
    error: Error,
  ) => boolean;

  it('is configured as a predicate rather than a count', () => {
    expect(typeof retry).toBe('function');
  });

  it('does not retry a 4xx', () => {
    expect(retry(0, new HttpError(401, 'Unauthorized'))).toBe(false);
    expect(retry(0, new HttpError(404, 'not found'))).toBe(false);
  });

  it('still retries a 5xx and a network fault, up to three times', () => {
    expect(retry(0, new HttpError(503, 'unavailable'))).toBe(true);
    expect(retry(2, new HttpError(503, 'unavailable'))).toBe(true);
    expect(retry(3, new HttpError(503, 'unavailable'))).toBe(false);
    expect(retry(0, new Error('Network Error'))).toBe(true);
  });
});
