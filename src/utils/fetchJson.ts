import { HttpError } from '@/utils/httpError';

// GET from one of the console's own route handlers. A failure keeps its status,
// so the query retry policy can tell a refusal from an outage.
export const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new HttpError(response.status, `GET ${path} failed with ${response.status}`);
  }
  return (await response.json()) as T;
};
