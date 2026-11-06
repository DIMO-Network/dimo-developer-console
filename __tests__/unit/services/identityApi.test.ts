import { GetVehicleCountByClientIdDocument } from '@/gql/graphql';
import {
  fetchIdentity,
  IDENTITY_TIMEOUT_MS,
  IdentityGraphQLError,
} from '@/services/identityApi';
import { HttpError } from '@/utils/httpError';

const VARS = { clientId: '0x00000000000000000000000000000000000000aa' };
const answer = (status: number, body: unknown) =>
  jest.fn(async () => ({ ok: status < 300, status, json: async () => body }) as Response);

describe('fetchIdentity', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  it('returns the data', async () => {
    global.fetch = answer(200, { data: { vehicles: { totalCount: 2 } } });
    await expect(fetchIdentity(GetVehicleCountByClientIdDocument, VARS)).resolves.toEqual(
      {
        vehicles: { totalCount: 2 },
      },
    );
  });

  it('throws GraphQL errors, or returns null for no data when told to ignore them', async () => {
    global.fetch = answer(200, { data: null, errors: [{ message: 'nope' }] });
    await expect(
      fetchIdentity(GetVehicleCountByClientIdDocument, VARS),
    ).rejects.toBeInstanceOf(IdentityGraphQLError);
    await expect(
      fetchIdentity(GetVehicleCountByClientIdDocument, VARS, { errorPolicy: 'ignore' }),
    ).resolves.toBeNull();
  });

  it('keeps the status of an HTTP failure', async () => {
    global.fetch = answer(502, {});
    await expect(fetchIdentity(GetVehicleCountByClientIdDocument, VARS)).rejects.toEqual(
      expect.objectContaining({ status: 502 }),
    );
    await expect(
      fetchIdentity(GetVehicleCountByClientIdDocument, VARS),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('gives up on a request that never answers', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const request = fetchIdentity(GetVehicleCountByClientIdDocument, VARS);
    const outcome = expect(request).rejects.toThrow('aborted');
    await jest.advanceTimersByTimeAsync(IDENTITY_TIMEOUT_MS);
    await outcome;
  });

  it("stops when the caller's signal does", async () => {
    global.fetch = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
    const controller = new AbortController();
    const request = fetchIdentity(GetVehicleCountByClientIdDocument, VARS, {
      signal: controller.signal,
    });
    controller.abort();
    await expect(request).rejects.toThrow('aborted');
  });
});
