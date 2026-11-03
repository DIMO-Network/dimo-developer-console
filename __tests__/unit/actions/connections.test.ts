import { AxiosError } from 'axios';

const mockClient = {
  delete: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: async () => mockClient,
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
  it('create sends the status with the keys', async () => {
    mockClient.post.mockResolvedValue({ data: { id: 'conn-1' } });

    await expect(createConnection(input)).resolves.toEqual({ id: 'conn-1' });

    expect(mockClient.post).toHaveBeenCalledWith('/api/my/connections', input);
  });

  // Next logs what an action throws, and an AxiosError carries the request body.
  it('create fails without the request, so the keys stay out of the logs', async () => {
    const refused = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      { data: JSON.stringify(input) } as never,
      undefined,
      { status: 400, data: {} } as never,
    );
    mockClient.post.mockRejectedValue(refused);

    const thrown = await createConnection(input).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBe(refused);
    expect((thrown as Error).message).toContain('400');
    expect(JSON.stringify(thrown, Object.getOwnPropertyNames(thrown))).not.toContain(
      PRIVATE_KEY,
    );
    expect((thrown as Error).cause).toBeUndefined();
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

    await expect(deleteConnection('conn-1')).resolves.toBeUndefined();

    expect(mockClient.delete).toHaveBeenCalledWith('/api/my/connections/conn-1');
  });

  it('passes on the null the API answers for a deleted row', async () => {
    mockClient.get.mockResolvedValue({ data: null });

    await expect(getConnectionById('conn-1')).resolves.toBeNull();
  });

  // ?resume= comes from the URL, so it can't be allowed to change the path.
  it('keeps an id from the URL inside its path segment', async () => {
    mockClient.get.mockResolvedValue({ data: null });

    await getConnectionById('../../team?x=1');

    expect(mockClient.get).toHaveBeenCalledWith(
      '/api/my/connections/..%2F..%2Fteam%3Fx%3D1',
    );
  });
});
