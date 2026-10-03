import { accessFromError } from '@/app/vehicles/[tokenId]/components/accessFromError';
import { DataApiError } from '@/services/subjects/client';

const error = (code: string, memberOfTeam?: boolean) =>
  new DataApiError(403, code as never, 'x', [], memberOfTeam);
const member = { member: true, walletIsSigner: false };

describe('accessFromError', () => {
  it('keeps the page open without an error, or for per-field failures', () => {
    expect(accessFromError(null, member)).toBe('ok');
    expect(accessFromError(error('UPSTREAM'), member)).toBe('ok');
    expect(accessFromError(error('GRAPHQL'), member)).toBe('ok');
  });

  it('maps the known refusals', () => {
    expect(accessFromError(error('NOT_SHARED'), member)).toBe('not-shared');
    expect(accessFromError(error('DEV_JWT_INVALID'), member)).toBe('jwt-expired');
    expect(accessFromError(error('NO_ACCESS', false), member)).toBe('removed');
    expect(accessFromError(error('NO_ACCESS', true), member)).toBe('no-access');
    expect(
      accessFromError(error('NO_ACCESS', true), { member: true, walletIsSigner: true }),
    ).toBe('reconnect');
    expect(
      accessFromError(error('NO_ACCESS'), { member: false, walletIsSigner: false }),
    ).toBe('jwt-expired');
  });

  it('shows an error state, not the data tabs, for anything else', () => {
    expect(accessFromError(error('INVALID_CLIENT_ID'), member)).toBe('error');
    expect(accessFromError(error('ACCESS_CHECK_FAILED'), member)).toBe('error');
    expect(accessFromError(error('UNKNOWN'), member)).toBe('error');
  });
});
