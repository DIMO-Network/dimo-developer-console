import {
  DEFAULT_TIMEOUT_MS,
  TimeoutError,
  fetchWithTimeout,
  isTimeout,
} from '@/utils/fetchWithTimeout';

const stub = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

/** A fetch that accepts the request and then never answers — the real failure. */
const neverAnswers = (): jest.Mock =>
  jest.fn(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );

describe('fetchWithTimeout', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });

  it('gives up on a request that never answers, naming the upstream', async () => {
    global.fetch = neverAnswers() as unknown as typeof fetch;
    const err = await fetchWithTimeout(
      'https://x',
      {},
      { timeoutMs: 20, label: 'identity-api' },
    )
      .then(() => null)
      .catch((e) => e);

    expect(isTimeout(err)).toBe(true);
    expect(err).toBeInstanceOf(TimeoutError);
    // The message has to say WHICH service, or it sends the reader to the
    // wrong one.
    expect(err.message).toContain('identity-api');
    expect((err as TimeoutError).timeoutMs).toBe(20);
  });

  it('returns the response untouched when it arrives in time', async () => {
    const body = { ok: true };
    global.fetch = jest
      .fn()
      .mockResolvedValue(stub(200, body)) as unknown as typeof fetch;
    const resp = await fetchWithTimeout('https://x', {}, { timeoutMs: 50 });
    expect(resp.status).toBe(200);
    await expect(resp.json()).resolves.toEqual(body);
  });

  it('passes a 4xx through rather than treating it as a failure to answer', async () => {
    // A refusal is an answer. Only silence is a timeout.
    global.fetch = jest.fn().mockResolvedValue(stub(422, {})) as unknown as typeof fetch;
    const resp = await fetchWithTimeout('https://x', {}, { timeoutMs: 50 });
    expect(resp.status).toBe(422);
  });

  it("reports a caller's own abort as a cancellation, not as a timeout", async () => {
    // An unmounting component aborting its request must not be reported as
    // "identity-api is down".
    global.fetch = neverAnswers() as unknown as typeof fetch;
    const caller = new AbortController();
    const promise = fetchWithTimeout(
      'https://x',
      { signal: caller.signal },
      { timeoutMs: 10_000, label: 'identity-api' },
    );
    caller.abort();
    const err = await promise.then(() => null).catch((e) => e);
    expect(isTimeout(err)).toBe(false);
    expect((err as Error).name).toBe('AbortError');
  });

  it('forwards method, headers and body unchanged', async () => {
    const spy = jest.fn().mockResolvedValue(stub(200, {}));
    global.fetch = spy as unknown as typeof fetch;
    await fetchWithTimeout(
      'https://x',
      { method: 'PUT', headers: { 'If-None-Match': '*' }, body: '{"a":1}' },
      { timeoutMs: 50 },
    );
    const [, init] = spy.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'If-None-Match': '*' });
    expect(init.body).toBe('{"a":1}');
    expect(init.signal).toBeDefined();
  });

  it('leaves room for the calls that follow it inside one request', () => {
    // The PUT route makes several of these in sequence before the serverless
    // budget runs out, so the per-request limit cannot be the whole budget.
    expect(DEFAULT_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });
});
