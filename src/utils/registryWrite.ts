import * as Sentry from '@sentry/nextjs';
import type { ApiResult } from '@/types/team';

const settle = async <T>(write: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> => {
  try {
    return await write();
  } catch (error) {
    Sentry.captureException(error);
    return {
      ok: false,
      status: 0,
      code: null,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

// Registry writes follow on-chain changes. A rejected server action (network,
// a deploy in progress) must not look like a failed transaction: callers never
// undo the chain or hide an API key because of it, and offer to retry. A
// rejection or 5xx is retried once first (spec, Error handling).
export const registryWrite = async <T>(
  write: () => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> => {
  const first = await settle(write);
  return !first.ok && (first.status === 0 || first.status >= 500) ? settle(write) : first;
};
