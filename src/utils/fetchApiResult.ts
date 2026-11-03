import type { ApiResult } from '@/types/team';

const isApiResult = (body: unknown): body is ApiResult<unknown> =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as { ok?: unknown }).ok === 'boolean';

// GET a route that answers with an ApiResult. Never throws: a body that is not
// an ApiResult (middleware 401, HTML, empty) becomes a failure with the HTTP
// status, and a rejected fetch becomes status 0 (no answer).
export const fetchApiResult = async <T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(path, init);
    const body: unknown = await response.json().catch(() => null);
    if (isApiResult(body)) return body as ApiResult<T>;
    return {
      ok: false,
      status: response.status,
      code: null,
      message: `GET ${path} failed with ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      code: null,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};
