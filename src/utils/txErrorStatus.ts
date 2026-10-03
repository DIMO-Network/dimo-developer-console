import { get } from 'lodash';
import type { LoadingProps } from '@/components/LoadingModal';
import { UserOperationFailedError } from '@/utils/userOperation';

// Signers.tsx's mapping: 4001 is the user rejecting the user operation.
export const txErrorStatus = (error: unknown): LoadingProps => {
  if (get(error, 'code', null) === 4001)
    return { status: 'error', label: 'The transaction was denied' };
  if (error instanceof UserOperationFailedError)
    return {
      status: 'error',
      label: 'The transaction failed on-chain, so nothing changed',
    };
  return { status: 'error', label: 'Something went wrong' };
};
