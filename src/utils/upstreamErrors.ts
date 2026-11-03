import { AxiosError } from 'axios';

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
