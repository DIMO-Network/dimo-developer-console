/**
 * An error that still knows which status produced it.
 *
 * react-query decides whether to retry from the thrown error alone. A query
 * that throws `new Error(json.error)` has already discarded the status, so
 * every failure looks alike and the default policy retries all of them three
 * times. For a 401 that is four identical rejected requests and several
 * seconds of loading state before the UI can say anything -- and no amount of
 * retrying will fix an authorization failure.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** A status the client sent and the server rejected: retrying cannot change it. */
export const isClientError = (error: unknown): boolean =>
  error instanceof HttpError && error.status >= 400 && error.status < 500;
