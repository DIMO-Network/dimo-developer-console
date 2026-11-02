import { configSchema } from 'next/dist/server/config-schema';

import { BRAND_IMAGE_MAX_BYTES } from '@/utils/brandImage';

jest.mock('@sentry/nextjs/config', () => ({
  withSentryConfig: <T>(config: T) => config,
}));
// eslint-disable-next-line import/first
import nextConfig from '../../../next.config.mjs';

const { parse: parseSize } = jest.requireActual('next/dist/compiled/bytes');
const serverActions = nextConfig.experimental!.serverActions!;

// Next only warns about a key it doesn't recognize, then ignores it. A misplaced
// serverActions block left brand uploads on the 1 MB default.
describe('next.config', () => {
  it('has only options Next recognizes', () => {
    expect(configSchema.safeParse(nextConfig).error?.issues ?? []).toEqual([]);
  });

  it('lets a Server Action carry the largest brand image the picker allows', () => {
    const limit = parseSize(serverActions.bodySizeLimit);
    const multipartOverhead = 64 * 1024;

    expect(limit).toBeGreaterThanOrEqual(BRAND_IMAGE_MAX_BYTES + multipartOverhead);
  });

  it('accepts Server Actions from the console domains', () => {
    expect(serverActions.allowedOrigins).toEqual(
      expect.arrayContaining(['console.dimo.org', 'console-staging.dimo.org']),
    );
  });
});
