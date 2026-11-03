/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { inspect } from 'node:util';
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from 'axios';
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

// Next logs what a Server Action throws, and that prints every field of the error.
describe('a failed dimoDevAPIClient call', () => {
  const TOKEN = 'token-marker-3f1a';
  const BODY = 'body-marker-9c2e';
  const logged = (error: unknown) => inspect(error, { depth: 10 });

  // What the real adapters hold on to: the config, and a raw request with the headers
  // and the body exactly as they were sent.
  const rawRequest = (config: Parameters<AxiosAdapter>[0]) => ({
    _header: `POST / HTTP/1.1\r\nAuthorization: ${config.headers.Authorization}\r\n`,
    body: config.data,
  });

  const answers500: AxiosAdapter = async (config) => {
    const request = rawRequest(config);
    throw new AxiosError(
      'Request failed with status code 500',
      'ERR_BAD_RESPONSE',
      config,
      request,
      {
        status: 500,
        statusText: 'Internal Server Error',
        data: { code: 'BOOM', message: 'It broke' },
        headers: {},
        config,
        request,
      },
    );
  };

  const neverAnswers: AxiosAdapter = async (config) => {
    throw new AxiosError(
      'timeout of 5000ms exceeded',
      'ECONNABORTED',
      config,
      rawRequest(config),
    );
  };

  const failedCall = async (adapter: AxiosAdapter) => {
    withCookies({ 'session-token': TOKEN });
    const client = await dimoDevAPIClient();
    return client
      .post('/api/my/connections', { secret: BODY }, { adapter })
      .catch((error: AxiosError) => error);
  };

  it('keeps the token and the body out of what gets logged', async () => {
    const printed = logged(await failedCall(answers500));

    expect(printed).not.toContain(TOKEN);
    expect(printed).not.toContain(BODY);
  });

  it('keeps what callers read', async () => {
    const error = (await failedCall(answers500)) as AxiosError;

    expect(error).toBeInstanceOf(AxiosError);
    expect(error.message).toBe('Request failed with status code 500');
    expect(error.code).toBe('ERR_BAD_RESPONSE');
    expect(error.response?.status).toBe(500);
    expect(error.response?.data).toEqual({ code: 'BOOM', message: 'It broke' });
  });

  it('strips a request that got no response too', async () => {
    const error = (await failedCall(neverAnswers)) as AxiosError;

    expect(logged(error)).not.toContain(TOKEN);
    expect(logged(error)).not.toContain(BODY);
    expect(error.code).toBe('ECONNABORTED');
    expect(error.response).toBeUndefined();
  });

  it('strips the response config when it is not the same object', async () => {
    const answersWithItsOwnConfig: AxiosAdapter = async (config) => {
      const copy = { ...config, headers: new AxiosHeaders(config.headers) };
      throw new AxiosError('Failed', 'ERR_BAD_RESPONSE', config, undefined, {
        status: 500,
        statusText: '',
        data: {},
        headers: {},
        config: copy,
      });
    };

    const error = (await failedCall(answersWithItsOwnConfig)) as AxiosError;
    const printed = logged(error);

    expect(error.response?.status).toBe(500);
    expect(printed).not.toContain(TOKEN);
    expect(printed).not.toContain(BODY);
  });

  // An adapter, or code that rebuilt a config, can leave headers as a plain object, and
  // a plain object has no delete(): the TypeError would replace the AxiosError.
  it('strips plain-object headers and still rejects with the AxiosError', async () => {
    const answersWithPlainHeaders: AxiosAdapter = async (config) => {
      const plain = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' };
      const request = rawRequest(config);
      throw new AxiosError(
        'Request failed with status code 500',
        'ERR_BAD_RESPONSE',
        { ...config, headers: plain } as unknown as typeof config,
        request,
        {
          status: 500,
          statusText: '',
          data: { code: 'BOOM' },
          headers: {},
          config: { ...config, headers: { ...plain } } as unknown as typeof config,
          request,
        },
      );
    };

    const error = (await failedCall(answersWithPlainHeaders)) as AxiosError;

    expect(error).toBeInstanceOf(AxiosError);
    expect(error.response?.status).toBe(500);
    expect(error.response?.data).toEqual({ code: 'BOOM' });
    expect(error.config?.headers).toEqual({ Accept: 'application/json' });
    expect(error.response?.config.headers).toEqual({ Accept: 'application/json' });
    expect(logged(error)).not.toContain(TOKEN);
    expect(logged(error)).not.toContain(BODY);
  });

  it('strips an error whose config has no headers at all', async () => {
    const error = (await failedCall(async (config) => {
      throw new AxiosError(
        'Failed',
        'ERR_BAD_RESPONSE',
        { ...config, headers: undefined } as unknown as typeof config,
        rawRequest(config),
      );
    })) as AxiosError;

    expect(error).toBeInstanceOf(AxiosError);
    expect(error.code).toBe('ERR_BAD_RESPONSE');
    expect(logged(error)).not.toContain(TOKEN);
  });

  it('still drops the team cookie, with the token gone', async () => {
    const remove = withCookies({ 'session-token': TOKEN, 'active_team': 'team-acme' });
    const client = await dimoDevAPIClient();

    const error = await client
      .get('/api/my/apps', {
        adapter: async (config) => {
          throw new AxiosError(
            'Forbidden',
            'ERR_BAD_REQUEST',
            config,
            rawRequest(config),
            {
              status: 403,
              statusText: 'Forbidden',
              data: { code: 'NOT_A_MEMBER' },
              headers: {},
              config,
            },
          );
        },
      })
      .catch((failure: AxiosError) => failure);

    expect(remove).toHaveBeenCalledWith('active_team');
    expect(logged(error)).not.toContain(TOKEN);
  });

  // The real adapter, for the real ClientRequest: its _header is what would print.
  describe('over HTTP', () => {
    let server: Server;
    let url: string;

    beforeAll(async () => {
      server = createServer((request, response) => {
        request.resume();
        request.on('end', () => {
          response.writeHead(500, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ code: 'BOOM' }));
        });
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterAll(() => {
      server.close();
    });

    const realCall = async (target: string) => {
      withCookies({ 'session-token': TOKEN });
      const client = await dimoDevAPIClient();
      return client
        .post(target, { secret: BODY })
        .catch((error: AxiosError) => error) as Promise<AxiosError>;
    };

    it('strips a real 500', async () => {
      const error = await realCall(`${url}/api/my/connections`);

      expect(error.response?.status).toBe(500);
      expect(error.response?.data).toEqual({ code: 'BOOM' });
      expect(logged(error)).not.toContain(TOKEN);
      expect(logged(error)).not.toContain(BODY);
    });

    it('strips a real refused connection', async () => {
      const closed = createServer();
      await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
      const { port } = closed.address() as AddressInfo;
      await new Promise((resolve) => closed.close(resolve));

      const error = await realCall(`http://127.0.0.1:${port}/api/my/connections`);

      expect(error.code).toBe('ECONNREFUSED');
      expect(logged(error)).not.toContain(TOKEN);
      expect(logged(error)).not.toContain(BODY);
    });
  });
});
