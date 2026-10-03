jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { revokeMemberKeys } from '@/app/settings/components/Team/revokeMemberKeys';
import type { MemberLicenseKey } from '@/app/settings/components/Team/memberKeys';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const key = (
  tokenId: number,
  signer: `0x${string}`,
  onChain: boolean,
  registered = true,
  licenseKnown = true,
): MemberLicenseKey => ({
  tokenId,
  licenseLabel: `License ${tokenId}`,
  signer,
  onChain,
  registered,
  licenseKnown,
});
const KEYS = [
  key(42, CURRENT, true),
  key(43, OLD, true),
  key(44, OLD, false),
  key(45, CURRENT, true, false),
];
const ok = { ok: true as const, data: {} };

describe('revokeMemberKeys', () => {
  it('disables every on-chain key in one transaction and stamps every registered key', async () => {
    const disable = jest.fn(async () => {});
    const stamp = jest.fn(async () => ok);
    await expect(revokeMemberKeys(KEYS, { disable, stamp })).resolves.toEqual({
      txError: null,
      unstamped: [],
    });
    expect(disable).toHaveBeenCalledTimes(1);
    expect(disable).toHaveBeenCalledWith([
      { tokenId: 42, signer: CURRENT },
      { tokenId: 43, signer: OLD },
      { tokenId: 45, signer: CURRENT },
    ]);
    expect(stamp.mock.calls).toEqual([
      [42, CURRENT],
      [43, OLD],
      [44, OLD],
    ]);
  });

  it('after a failed transaction stamps only keys already off-chain', async () => {
    const denied = { code: 4001 };
    const stamp = jest.fn(async () => ok);
    const outcome = await revokeMemberKeys(KEYS, {
      disable: jest.fn().mockRejectedValue(denied),
      stamp,
    });
    expect(outcome.txError).toBe(denied);
    expect(stamp.mock.calls).toEqual([[44, OLD]]);
  });

  it('never stamps a key whose license is not in the loaded list', async () => {
    const disable = jest.fn();
    const stamp = jest.fn(async () => ok);
    await expect(
      revokeMemberKeys([key(99, OLD, false, true, false)], { disable, stamp }),
    ).resolves.toEqual({ txError: null, unstamped: [] });
    expect(disable).not.toHaveBeenCalled();
    expect(stamp).not.toHaveBeenCalled();
  });

  it('only stamps when nothing is on-chain (finishing an earlier revoke)', async () => {
    const disable = jest.fn();
    const stamp = jest.fn(async () => ok);
    await revokeMemberKeys([key(44, OLD, false)], { disable, stamp });
    expect(disable).not.toHaveBeenCalled();
    expect(stamp).toHaveBeenCalledWith(44, OLD);
  });

  it('reports stamps that fail or reject after the retry, and treats NOT_FOUND as done', async () => {
    const stamp = jest.fn(async (tokenId: number) => {
      if (tokenId === 42)
        return { ok: false as const, status: 404, code: 'NOT_FOUND', message: 'x' };
      if (tokenId === 43) throw new Error('Failed to fetch');
      return {
        ok: false as const,
        status: 502,
        code: 'IDENTITY_UNAVAILABLE',
        message: 'x',
      };
    });
    const outcome = await revokeMemberKeys(KEYS, {
      disable: jest.fn(async () => {}),
      stamp,
    });
    expect(outcome.unstamped.map((k) => k.tokenId)).toEqual([43, 44]);
    expect(stamp.mock.calls.map(([tokenId]) => tokenId)).toEqual([42, 43, 43, 44, 44]);
  });
});
