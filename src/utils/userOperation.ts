import type { IKernelOperationStatus } from '@/types/wallet';

export class UserOperationFailedError extends Error {
  constructor(reason?: string) {
    super(reason ? `The transaction reverted: ${reason}` : 'The transaction reverted');
    this.name = 'UserOperationFailedError';
  }
}

// useContractGA().processTransactions throws when the receipt carries a reason,
// but resolves with success: false when a user operation reverts without one.
// Every signer change checks the result through this.
export const assertUserOperation = (result: IKernelOperationStatus | undefined) => {
  if (!result?.success) throw new UserOperationFailedError(result?.reason);
};
