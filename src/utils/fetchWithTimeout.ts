/**
 * `fetch` that cannot hang forever.
 *
 * Every request the template editor makes — to console-api, identity-api and
 * definitions-worker — went out as a bare `fetch`, which has no timeout at
 * all. One upstream that accepts a connection and then says nothing leaves the
 * request outstanding indefinitely, and the Publish button renders `loading`
 * for exactly as long as its mutation is pending. The symptom is a spinner
 * that never resolves and never explains itself, on a page where the person
 * has no way to tell "still working" from "never coming back".
 *
 * A timeout turns that into a sentence someone can act on.
 */

/** A request that was given up on rather than one that was refused. */
export class TimeoutError extends Error {
  readonly label: string;
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} did not respond within ${Math.round(timeoutMs / 1000)}s`);
    this.name = 'TimeoutError';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export const isTimeout = (err: unknown): err is TimeoutError =>
  err instanceof TimeoutError;

/**
 * Chosen to sit well inside the serverless function budget. The PUT route makes
 * several of these in sequence (caller, template, vehicle count, manufacturer,
 * then the write), so a per-request limit has to leave room for the ones after
 * it: a request that is still silent after this is not about to succeed.
 */
export const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * The browser's own hop to this app's API routes. Longer than the server-side
 * budget on purpose — it sits in FRONT of all of them, and failing it earlier
 * than the work it is waiting on would report a timeout for a request that was
 * about to come back.
 */
export const CLIENT_TIMEOUT_MS = 30_000;

/**
 * `label` names the upstream in the error, because "a request timed out" sends
 * whoever reads it to the wrong service. An AbortError raised by our own signal
 * is reported as the timeout it is; one raised by a caller's signal is passed
 * through untouched, so component unmounts still look like cancellations.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    label = input,
  }: { timeoutMs?: number; label?: string } = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const callerSignal = init.signal;
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    // Only our own timer firing is a timeout. A caller that aborted gets its
    // own error back, so "the user navigated away" is never reported as
    // "identity-api is down".
    if (controller.signal.aborted && callerSignal?.aborted !== true) {
      throw new TimeoutError(label, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}
