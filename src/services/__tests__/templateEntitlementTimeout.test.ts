/**
 * A timeout talking to identity-api has to arrive as an IdentityError.
 *
 * resolveEntitlement treats an IdentityError as 'unavailable' — "nothing was
 * decided, try again" — which the route answers 503 to. A TimeoutError
 * escaping instead would skip that state entirely and surface as a flat 502
 * for a condition that is usually transient, and 502 tells the caller the
 * request was wrong rather than that the answer is not available yet.
 */
import { TimeoutError } from '@/utils/fetchWithTimeout';

jest.mock('@/utils/fetchWithTimeout', () => {
  const actual = jest.requireActual('@/utils/fetchWithTimeout');
  return { ...actual, fetchWithTimeout: jest.fn() };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchWithTimeout } = require('@/utils/fetchWithTimeout') as {
  fetchWithTimeout: jest.Mock;
};

import { IdentityError, countMintedVehicles } from '@/services/templateEntitlement';

describe('identity-api timeouts', () => {
  beforeEach(() => fetchWithTimeout.mockReset());

  it('are reported as IdentityError, so the entitlement says "unavailable"', async () => {
    fetchWithTimeout.mockRejectedValue(new TimeoutError('identity-api', 8000));

    const err = await countMintedVehicles('toyota_camry_2020')
      .then(() => null)
      .catch((e) => e);

    expect(err).toBeInstanceOf(IdentityError);
    expect((err as Error).message).toContain('identity-api');
    expect((err as Error).message).toContain('8s');
  });

  it('does not swallow a non-timeout failure into the same shape', async () => {
    const boom = new Error('socket hang up');
    fetchWithTimeout.mockRejectedValue(boom);

    const err = await countMintedVehicles('toyota_camry_2020')
      .then(() => null)
      .catch((e) => e);

    expect(err).toBe(boom);
    expect(err).not.toBeInstanceOf(IdentityError);
  });
});
