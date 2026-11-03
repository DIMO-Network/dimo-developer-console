import { defaultQueryRetry, QUERY_RETRIES } from '@/hoc/QueryProvider';
import { HttpError } from '@/utils/httpError';

describe('defaultQueryRetry', () => {
  it('retries a server failure once', () => {
    expect(QUERY_RETRIES).toBe(1);
    expect(defaultQueryRetry(0, new HttpError(500, 'x'))).toBe(true);
    expect(defaultQueryRetry(1, new HttpError(500, 'x'))).toBe(false);
  });

  it('never retries a refusal', () => {
    expect(defaultQueryRetry(0, new HttpError(404, 'x'))).toBe(false);
  });

  it('retries a network failure once', () => {
    expect(defaultQueryRetry(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(defaultQueryRetry(1, new TypeError('Failed to fetch'))).toBe(false);
  });
});
