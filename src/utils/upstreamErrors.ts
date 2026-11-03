import * as Sentry from '@sentry/nextjs';
import { AxiosError } from 'axios';
import type { ApiResult } from '@/types/team';

// Next logs what a Server Action throws, and that prints every field of the error: the
// session token and the request body sit in its configs, and again in the raw requests.
// Callers read the message, the code, and the response's status and data, so those stay.
const dropAuthorization = (headers: unknown) => {
  if (!headers) return;
  // AxiosHeaders matches the name in any case. A plain object, which an adapter or a
  // rebuilt config can leave, has no delete(), and a TypeError here would replace the
  // AxiosError the caller reads.
  const { delete: remove } = headers as { delete?: unknown };
  if (typeof remove === 'function') {
    remove.call(headers, 'Authorization');
  } else {
    delete (headers as Record<string, unknown>).Authorization;
  }
};

export const stripRequestDetails = (error: unknown): void => {
  if (!(error instanceof AxiosError)) return;
  for (const config of [error.config, error.response?.config]) {
    dropAuthorization(config?.headers);
    delete config?.data;
  }
  delete error.request;
  delete error.response?.request;
};

export const withoutRequestDetails = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    stripRequestDetails(error);
    throw error;
  }
};

// An upstream refusal below 500 is the API answering as designed. A 5xx, a failure
// with no answer at all, and anything that is not an HTTP error are not.
export const isUnexpectedFailure = (error: unknown): boolean => {
  if (error instanceof AxiosError && error.response) return error.response.status >= 500;
  return true;
};

export const reportUnexpected = (error: unknown): void => {
  stripRequestDetails(error);
  if (isUnexpectedFailure(error)) Sentry.captureException(error);
};

export const toFailure = (error: unknown): ApiResult<never> => {
  reportUnexpected(error);
  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as { message?: string; code?: string } | undefined;
    return {
      ok: false,
      status: error.response.status,
      code: body?.code ?? null,
      message: body?.message ?? error.message,
    };
  }
  return {
    ok: false,
    status: 0,
    code: null,
    message: error instanceof Error ? error.message : 'Request failed',
  };
};
