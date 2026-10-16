/**
 * @jest-environment node
 */
const mockPost = jest.fn();
// dimoAuth calls axios.create() while it loads, before mockPost is initialised,
// so the client reads it lazily.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const client = { post: (...args: unknown[]) => mockPost(...args) };
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, create: () => client },
  };
});
import { AxiosError, type AxiosResponse } from 'axios';
import { getDimoToken, submitDexChallenge } from '@/actions/dimoAuth';

const INPUT = {
  state: 'st',
  signedChallenge: '0xsecret',
  clientId: '0xaaa',
  domain: 'https://x',
};

describe('dimoAuth', () => {
  it('never logs the signed challenge', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    mockPost.mockResolvedValue({ data: { access_token: 'jwt' } });
    await getDimoToken(INPUT);
    expect(JSON.stringify(info.mock.calls)).not.toContain('0xsecret');
    info.mockRestore();
  });

  it('reports the HTTP status of a refused submit instead of throwing', async () => {
    mockPost.mockRejectedValue(
      new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: {},
      } as AxiosResponse),
    );
    await expect(submitDexChallenge(INPUT)).resolves.toEqual({ ok: false, status: 400 });
    mockPost.mockRejectedValue(new Error('socket hang up'));
    await expect(submitDexChallenge(INPUT)).resolves.toEqual({ ok: false, status: 0 });
  });
});
