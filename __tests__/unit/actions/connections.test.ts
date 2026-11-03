import { AxiosError } from 'axios';

const mockClient = {
  delete: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};
const mockCaptureException = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));
const mockDimoDevAPIClient = jest.fn();
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: (...args: unknown[]) => mockDimoDevAPIClient(...args),
}));
import {
  createConnection,
  deleteConnection,
  getConnectionById,
  updateConnection,
} from '@/actions/connections';

const PRIVATE_KEY = `0x${'a'.repeat(64)}`;
const input = {
  name: 'Fleet',
  connection_license_public_key: '0x1',
  connection_license_private_key: PRIVATE_KEY,
  device_issuance_key: PRIVATE_KEY,
  status: 'PENDING' as const,
};

describe('connection actions', () => {
  beforeEach(() => mockDimoDevAPIClient.mockResolvedValue(mockClient));

  it('create sends the status with the keys', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'conn-1' } });

    await expect(createConnection(input)).resolves.toEqual({
      ok: true,
      data: { id: 'conn-1' },
    });

    expect(mockClient.post).toHaveBeenCalledWith('/api/my/connections', input);
  });

  const refusal = (status: number, body: object, request?: object) =>
    new AxiosError(
      `Request failed with status code ${status}`,
      'ERR_BAD_REQUEST',
      request as never,
      undefined,
      { status, data: body } as never,
    );

  it("createConnection returns console-api's refusal instead of throwing", async () => {
    mockClient.post.mockRejectedValue(
      refusal(409, {
        message: 'Your team already has a connection with this name',
        code: 'CONNECTION_NAME_TAKEN',
      }),
    );

    await expect(createConnection(input)).resolves.toEqual({
      ok: false,
      status: 409,
      code: 'CONNECTION_NAME_TAKEN',
      message: 'Your team already has a connection with this name',
    });
  });

  // Next logs what an action throws, and an AxiosError carries the request body.
  it('a failed create never reports the keys', async () => {
    const failed = refusal(500, {}, { data: JSON.stringify(input) });
    failed.config = { data: JSON.stringify(input) } as never;
    mockClient.post.mockRejectedValue(failed);

    const result = await createConnection(input);

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const reported = mockCaptureException.mock.calls[0][0] as AxiosError;
    expect(reported.config?.data).toBeUndefined();
    expect(reported.request).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(PRIVATE_KEY);
  });

  it('update sends only the patch, and hands back nothing', async () => {
    mockClient.put.mockResolvedValue({ data: { device_issuance_key: PRIVATE_KEY } });

    await expect(
      updateConnection('conn-1', { status: 'MINTED', token_id: '7' }),
    ).resolves.toBeUndefined();

    expect(mockClient.put).toHaveBeenCalledWith('/api/my/connections/conn-1', {
      status: 'MINTED',
      token_id: '7',
    });
  });

  it('delete removes the connection', async () => {
    mockClient.delete.mockResolvedValue({ data: {} });

    await expect(deleteConnection('conn-1')).resolves.toEqual({ ok: true, data: null });

    expect(mockClient.delete).toHaveBeenCalledWith('/api/my/connections/conn-1');
  });

  it('deleteConnection returns CONNECTION_NOT_PENDING', async () => {
    mockClient.delete.mockRejectedValue(
      refusal(409, {
        message: 'Only a connection whose setup has not minted it can be discarded',
        code: 'CONNECTION_NOT_PENDING',
      }),
    );

    await expect(deleteConnection('conn-1')).resolves.toMatchObject({
      ok: false,
      status: 409,
      code: 'CONNECTION_NOT_PENDING',
    });
  });

  // Building the client reads cookies; a failure there is a failure like any other,
  // returned rather than thrown past the caller's handling.
  it('create and delete return a failure when the client cannot be built', async () => {
    mockDimoDevAPIClient.mockRejectedValue(new Error('cookies unavailable'));

    await expect(createConnection(input)).resolves.toMatchObject({
      ok: false,
      status: 0,
    });
    await expect(deleteConnection('conn-1')).resolves.toMatchObject({
      ok: false,
      status: 0,
    });
  });

  it('a deleted row rejects with the 404', async () => {
    const gone = refusal(404, { code: 'CONNECTION_NOT_FOUND' });
    mockClient.get.mockRejectedValue(gone);

    await expect(getConnectionById('conn-1')).rejects.toBe(gone);
  });

  // ?resume= comes from the URL, so it can't be allowed to change the path.
  it('keeps an id from the URL inside its path segment', async () => {
    mockClient.get.mockResolvedValue({ data: { id: 'x' } });

    await getConnectionById('../../team?x=1');

    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/my/connections/..%2F..%2Fteam%3Fx%3D1',
    );
  });
});
