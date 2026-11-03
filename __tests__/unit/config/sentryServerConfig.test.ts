/**
 * @jest-environment node
 */
jest.mock('@sentry/nextjs', () => ({ init: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import { fingerprintUpstreamError } from '@/utils/sentryFingerprint';

describe('sentry.server.config', () => {
  it('groups server errors by upstream route and status', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../sentry.server.config');
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ beforeSend: fingerprintUpstreamError }),
    );
  });
});
