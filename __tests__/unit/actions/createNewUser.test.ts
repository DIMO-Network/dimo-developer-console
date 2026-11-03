/**
 * @jest-environment node
 */
import { AxiosError, AxiosHeaders } from 'axios';

const mockPost = jest.fn();
const mockPut = jest.fn();
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => ({ post: mockPost, put: mockPut })),
}));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/nextjs';
import { completeUserData, createNewUser } from '@/app/sign-up/actions';

const user = { name: 'Dev', email: 'dev@x.test', address: '0xabc' };

const refusal = (status: number, data: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('createNewUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the user', async () => {
    mockPost.mockResolvedValue({ data: user });
    await expect(createNewUser(user as never)).resolves.toEqual({ ok: true, data: user });
  });

  it.each([
    ['ACCOUNT_EXISTS', 'ACCOUNT_EXISTS'],
    ['EMAIL_TAKEN', 'EMAIL_TAKEN'],
  ])('says %s for a 409, without reporting it', async (code, reason) => {
    mockPost.mockRejectedValue(refusal(409, { code }));
    await expect(createNewUser(user as never)).resolves.toEqual({ ok: false, reason });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('says the console could not be reached for a network failure, without reporting it', async () => {
    mockPost.mockRejectedValue(new AxiosError('timeout', 'ECONNABORTED'));
    await expect(createNewUser(user as never)).resolves.toEqual({
      ok: false,
      reason: 'UNREACHABLE',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports a 500 once', async () => {
    mockPost.mockRejectedValue(refusal(500, { message: 'boom' }));
    await expect(createNewUser(user as never)).resolves.toEqual({
      ok: false,
      reason: 'FAILED',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('reports an unmapped 4xx once', async () => {
    mockPost.mockRejectedValue(refusal(400, { code: 'BAD_BODY' }));
    await expect(createNewUser(user as never)).resolves.toEqual({
      ok: false,
      reason: 'FAILED',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('reports a 409 with an unknown code once', async () => {
    mockPost.mockRejectedValue(refusal(409, { code: 'SOMETHING_ELSE' }));
    await expect(createNewUser(user as never)).resolves.toEqual({
      ok: false,
      reason: 'FAILED',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('completeUserData', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns the user', async () => {
    mockPut.mockResolvedValue({ data: user });
    await expect(completeUserData(user as never)).resolves.toEqual({
      ok: true,
      data: user,
    });
  });

  it('says the email is not proven for a 409 EMAIL_NOT_PROVEN, without reporting it', async () => {
    mockPut.mockRejectedValue(refusal(409, { code: 'EMAIL_NOT_PROVEN' }));
    await expect(completeUserData(user as never)).resolves.toEqual({
      ok: false,
      reason: 'EMAIL_NOT_PROVEN',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('still throws anything else', async () => {
    mockPut.mockRejectedValue(refusal(500, {}));
    await expect(completeUserData(user as never)).rejects.toBeInstanceOf(AxiosError);
  });
});
