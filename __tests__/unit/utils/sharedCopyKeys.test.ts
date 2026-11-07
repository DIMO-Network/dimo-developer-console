import { humanizeSignal } from '@/utils/humanizeSignal';
import { permissionLabels } from '@/utils/sacdPermissions';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { UserOperationFailedError } from '@/utils/userOperation';
import { inviteErrorKey } from '@/utils/inviteErrors';

const key = (k: string, values?: Record<string, number>) =>
  values ? `${k}:${JSON.stringify(values)}` : k;

describe('shared copy that can be translated', () => {
  it('maps a rejected, failed and unknown transaction to message keys', () => {
    expect(txErrorStatus({ code: 4001 }, key).label).toBe('errors.transactionDenied');
    expect(txErrorStatus(new UserOperationFailedError('x'), key).label).toBe(
      'errors.transactionFailedOnChain',
    );
    expect(txErrorStatus(new Error('x'), key).label).toBe('errors.somethingWentWrong');
  });

  it('keeps English without a translator', () => {
    expect(txErrorStatus({ code: 4001 }).label).toBe('The transaction was denied');
  });

  it('translates the named signals, and splits the rest', () => {
    expect(humanizeSignal('speed', key)).toBe('signals.speed');
    expect(humanizeSignal('someOtherSignal', key)).toBe('Some other signal');
  });

  it('translates permission labels by id', () => {
    expect(permissionLabels('0x3c', key)).toEqual(['permissions.1', 'permissions.2']);
  });

  it('names the invite error message, with a fallback', () => {
    expect(inviteErrorKey('INVITE_EXPIRED')).toBe('pendingInvite.errors.INVITE_EXPIRED');
    expect(inviteErrorKey(null)).toBe('pendingInvite.errors.fallback');
  });
});
