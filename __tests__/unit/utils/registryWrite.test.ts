jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { assertUserOperation, UserOperationFailedError } from '@/utils/userOperation';

describe('registryWrite', () => {
  it('passes results through', async () => {
    const write = jest.fn(async () => ({ ok: true as const, data: 1 }));
    await expect(registryWrite(write)).resolves.toEqual({ ok: true, data: 1 });
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('turns a rejected server action into a failure after one retry', async () => {
    const write = jest.fn(async () => {
      throw new Error('Failed to fetch');
    });
    await expect(registryWrite(write)).resolves.toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'Failed to fetch',
    });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('retries a 5xx once and returns the retry', async () => {
    const write = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        code: 'IDENTITY_UNAVAILABLE',
        message: 'x',
      })
      .mockResolvedValueOnce({ ok: true, data: 1 });
    await expect(registryWrite(write)).resolves.toEqual({ ok: true, data: 1 });
  });

  it('never retries a 4xx', async () => {
    const write = jest.fn(async () => ({
      ok: false as const,
      status: 400,
      code: 'INVALID_HOLDERS',
      message: 'x',
    }));
    await registryWrite(write);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe('txErrorStatus', () => {
  it('names a denied and a reverted transaction', () => {
    expect(txErrorStatus({ code: 4001 })).toEqual({
      status: 'error',
      label: 'The transaction was denied',
    });
    expect(txErrorStatus(new UserOperationFailedError())).toEqual({
      status: 'error',
      label: 'The transaction failed on-chain, so nothing changed',
    });
    expect(txErrorStatus(new Error('boom'))).toEqual({
      status: 'error',
      label: 'Something went wrong',
    });
  });
});

describe('assertUserOperation', () => {
  it('throws unless the user operation succeeded', () => {
    expect(() => assertUserOperation({ success: true })).not.toThrow();
    expect(() =>
      assertUserOperation({ success: false, reason: 'AA23 reverted' }),
    ).toThrow('The transaction reverted: AA23 reverted');
    expect(() => assertUserOperation(undefined)).toThrow(UserOperationFailedError);
  });
});
