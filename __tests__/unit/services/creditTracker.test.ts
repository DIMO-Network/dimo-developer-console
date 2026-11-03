/**
 * @jest-environment node
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';
import { getCreditConsumptionByLicense } from '@/services/creditTracker';

// The real axios against a real local server: its request holds the raw headers, and
// Next logs everything a Server Action throws.
describe('getCreditConsumptionByLicense', () => {
  const TOKEN = 'dev-jwt-marker-5b7d';
  const logged = (error: unknown) => inspect(error, { depth: 10 });

  let server: Server;
  let status = 200;
  let answer: unknown = {};
  const originalUrl = process.env.CREDIT_TRACKER_URL;

  beforeAll(async () => {
    server = createServer((request, response) => {
      request.resume();
      request.on('end', () => {
        response.writeHead(status, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(answer));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    process.env.CREDIT_TRACKER_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    process.env.CREDIT_TRACKER_URL = originalUrl;
    await new Promise((resolve) => server.close(resolve));
  });

  const usage = () =>
    getCreditConsumptionByLicense({
      licenseId: '0xabc',
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
      devJwt: TOKEN,
    });

  const failure = async () =>
    usage().then(
      () => undefined,
      (error: unknown) => error,
    );

  it('returns what the tracker answers', async () => {
    status = 200;
    answer = { total: 3 };

    await expect(usage()).resolves.toEqual({ total: 3 });
  });

  it('lets a failure through, so an outage never reads as zero usage', async () => {
    status = 500;
    answer = { message: 'It broke' };

    await expect(usage()).rejects.toThrow('500');
  });

  it('throws a plain Error holding only the status, not the request', async () => {
    status = 500;
    answer = { message: 'It broke' };

    const error = await failure();

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).constructor).toBe(Error);
    expect((error as Error).message).toBe('Credit usage request failed (500)');
    expect(Object.keys(error as Error)).toEqual([]);
  });

  // Next logs a thrown Server Action error, and onRequestError ships it to Sentry:
  // config.headers.Authorization and request._header both hold the dev JWT.
  it('keeps the dev JWT out of what gets logged', async () => {
    status = 500;
    answer = { message: 'It broke' };

    expect(logged(await failure())).not.toContain(TOKEN);
  });

  it('rejects without the dev JWT when the tracker cannot be reached', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const { port } = closed.address() as AddressInfo;
    await new Promise((resolve) => closed.close(resolve));
    const reachable = process.env.CREDIT_TRACKER_URL;
    process.env.CREDIT_TRACKER_URL = `http://127.0.0.1:${port}`;

    try {
      const error = await failure();

      expect((error as Error).message).toBe('Credit usage request failed (no response)');
      expect(logged(error)).not.toContain(TOKEN);
    } finally {
      process.env.CREDIT_TRACKER_URL = reachable;
    }
  });
});
