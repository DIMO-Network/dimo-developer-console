/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
import { AxiosError, type AxiosResponse } from 'axios';
import { cookies } from 'next/headers';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

const withCookies = (values: Record<string, string>, remove = jest.fn()) => {
  (cookies as jest.Mock).mockResolvedValue({
    get: (name: string) => (values[name] ? { value: values[name] } : undefined),
    delete: remove,
  });
  return remove;
};
const refusedWith = (code: string) =>
  new AxiosError('Forbidden', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 403,
    data: { code, message: 'x' },
  } as AxiosResponse);

describe('dimoDevAPIClient', () => {
  it('sends the active team as X-Team-Id', async () => {
    withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
    const client = await dimoDevAPIClient();
    expect(client.defaults.headers['X-Team-Id']).toBe('team-acme');
    expect(client.defaults.headers['Authorization']).toBe('Bearer jwt');
  });

  it('omits the header without an active team', async () => {
    withCookies({ 'session-token': 'jwt' });
    const client = await dimoDevAPIClient();
    expect(client.defaults.headers['X-Team-Id']).toBeUndefined();
  });

  it('keeps an explicit token over the cookie', async () => {
    withCookies({ 'session-token': 'cookie-jwt' });
    const client = await dimoDevAPIClient(5000, 'explicit');
    expect(client.defaults.headers['Authorization']).toBe('Bearer explicit');
  });

  it('drops the active team cookie when console-api says the user left the team', async () => {
    const remove = withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
    const client = await dimoDevAPIClient();
    const refusal = refusedWith('NOT_A_MEMBER');
    await expect(
      client.get('/api/my/apps', {
        adapter: async () => {
          throw refusal;
        },
      }),
    ).rejects.toBe(refusal);
    expect(remove).toHaveBeenCalledWith('active_team');
  });

  it('leaves the cookie alone for any other refusal', async () => {
    const remove = withCookies({ 'session-token': 'jwt', 'active_team': 'team-acme' });
    const client = await dimoDevAPIClient();
    await expect(
      client.post(
        '/api/my/apps',
        {},
        {
          adapter: async () => {
            throw refusedWith('OWNER_ONLY');
          },
        },
      ),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(remove).not.toHaveBeenCalled();
  });
});
