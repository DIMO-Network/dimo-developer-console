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
import { inspect } from 'node:util';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { exchangeDimoToken, getDimoToken, submitDexChallenge } from '@/actions/dimoAuth';

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

  const failure = (data: string) =>
    new AxiosError(
      'Bad Request',
      'ERR_BAD_REQUEST',
      { headers: new AxiosHeaders({ Authorization: 'Bearer t' }), data } as never,
      { body: '0xsecret' },
      { status: 400, data: {} } as AxiosResponse,
    );

  it('strips the signed challenge from a failed submit', async () => {
    const error = failure('signature=0xsecret');
    mockPost.mockRejectedValue(error);
    await expect(getDimoToken(INPUT)).rejects.toBe(error);
    expect(error.config?.data).toBeUndefined();
    expect(error.request).toBeUndefined();
    expect(inspect(error, { depth: null })).not.toContain('0xsecret');
  });

  it('strips the auth code from a failed exchange', async () => {
    const error = failure('code=code-123');
    mockPost.mockRejectedValue(error);
    await expect(exchangeDimoToken('code-123')).rejects.toBe(error);
    expect(error.config?.data).toBeUndefined();
    expect(error.request).toBeUndefined();
    expect(inspect(error, { depth: null })).not.toContain('code-123');
  });

  it('keeps the status a caller reads', async () => {
    mockPost.mockRejectedValue(failure('signature=0xsecret'));
    await expect(getDimoToken(INPUT)).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
