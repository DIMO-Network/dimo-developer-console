import { AxiosError } from 'axios';

const mockGet = jest.fn();
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: async () => ({ get: mockGet }),
}));
import { getConfiguration, getConfigurationsByClientId } from '@/actions/configurations';

const answering = (status: number) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
  } as never);

const list = () => getConfigurationsByClientId({ client_id: '0xabc' });

describe('getConfigurationsByClientId', () => {
  it('returns the list', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'c1' }] });
    await expect(list()).resolves.toEqual([{ id: 'c1' }]);
  });

  it('reads a license the active team does not own as having none', async () => {
    mockGet.mockRejectedValue(answering(404));
    await expect(list()).resolves.toEqual([]);
  });

  it.each([401, 502, 503])('does not read a %i as having none', async (status) => {
    mockGet.mockRejectedValue(answering(status));
    await expect(list()).rejects.toThrow('failed');
  });
});

describe('getConfiguration', () => {
  it('encodes the id into the requested path', async () => {
    mockGet.mockResolvedValue({ data: { configuration: { id: 'x' } } });
    await getConfiguration({ id: '../teams?x=1' });
    expect(mockGet).toHaveBeenLastCalledWith(
      `/api/my/configurations/${encodeURIComponent('../teams?x=1')}`,
    );
    expect(mockGet.mock.calls.at(-1)![0]).not.toContain('../');
  });
});
