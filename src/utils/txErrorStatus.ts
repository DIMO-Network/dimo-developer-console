import { get } from 'lodash';
import type { LoadingProps } from '@/components/LoadingModal';
import { UserOperationFailedError } from '@/utils/userOperation';
import type { Translate } from '@/i18n/translate';

// Signers.tsx's mapping: 4001 is the user rejecting the user operation.
// Pass the common-namespace `t`.
export const txErrorStatus = (error: unknown, t: Translate): LoadingProps => {
  const key =
    get(error, 'code', null) === 4001
      ? 'errors.transactionDenied'
      : error instanceof UserOperationFailedError
        ? 'errors.transactionFailedOnChain'
        : 'errors.somethingWentWrong';
  return { status: 'error', label: t(key) };
};
