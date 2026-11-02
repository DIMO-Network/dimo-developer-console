/**
 * @jest-environment node
 */
import { AxiosError, type AxiosResponse } from 'axios';

const client = { get: jest.fn(), post: jest.fn() };
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => client),
}));
import {
  getMyWorkspaceByTokenId,
  getOrCreateMyLicenseWorkspace,
} from '@/services/workspace';

const axiosFailure = (status: number) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: {},
  } as AxiosResponse);

const license = {
  name: 'Fleet Co',
  token_id: 42,
  client_id: '0xClient',
  owner: '0xOwner',
};

describe('workspace by license', () => {
  beforeEach(() => Object.values(client).forEach((fn) => fn.mockReset()));

  it.each([404, 403])(
    'answers null when the lookup is refused with %i',
    async (status) => {
      client.get.mockRejectedValue(axiosFailure(status));
      await expect(getMyWorkspaceByTokenId(42)).resolves.toBeNull();
    },
  );

  it('does not mistake an outage for a missing workspace', async () => {
    client.get.mockRejectedValue(axiosFailure(500));
    await expect(getMyWorkspaceByTokenId(42)).rejects.toThrow('Request failed');
  });

  it('uses the existing workspace without creating one', async () => {
    client.get.mockResolvedValue({ data: { id: 'ws-1' } });

    await expect(getOrCreateMyLicenseWorkspace(license)).resolves.toEqual({ id: 'ws-1' });
    expect(client.post).not.toHaveBeenCalled();
  });

  it('creates the workspace of a license that has none', async () => {
    client.get.mockRejectedValue(axiosFailure(404));
    client.post.mockResolvedValue({ data: { id: 'ws-new' } });

    await expect(getOrCreateMyLicenseWorkspace(license)).resolves.toEqual({
      id: 'ws-new',
    });
    expect(client.post).toHaveBeenCalledWith('/api/my/workspace', license);
  });

  it('answers null when the caller may not create it', async () => {
    client.get.mockRejectedValue(axiosFailure(404));
    client.post.mockRejectedValue(axiosFailure(403));

    await expect(getOrCreateMyLicenseWorkspace(license)).resolves.toBeNull();
  });

  it('does not hide a failed create', async () => {
    client.get.mockRejectedValue(axiosFailure(404));
    client.post.mockRejectedValue(axiosFailure(502));

    await expect(getOrCreateMyLicenseWorkspace(license)).rejects.toThrow(
      'Request failed',
    );
  });
});
