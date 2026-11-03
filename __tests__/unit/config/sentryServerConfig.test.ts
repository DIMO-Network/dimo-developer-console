/**
 * @jest-environment node
 */
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ErrorEvent, EventHint, NodeOptions } from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({ init: jest.fn() }));

// A server action's body is its arguments: private keys, signed challenges, access
// tokens. Sentry 11 reads incoming request bodies by default and attaches them to
// every event captured during the request.
const serverOptions = (): NodeOptions => {
  let options: NodeOptions | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../sentry.server.config');
    options = (Sentry.init as jest.Mock).mock.calls[0][0];
  });
  return options!;
};

const send = (event: ErrorEvent, error?: unknown) =>
  serverOptions().beforeSend!(event, { originalException: error } as EventHint);

describe('sentry.server.config', () => {
  it('collects no request or response bodies', () => {
    expect(serverOptions().dataCollection).toMatchObject({ httpBodies: [] });
  });

  it('collects no user info or cookies', () => {
    expect(serverOptions().dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
    });
  });

  it('drops the request body and cookies from an event that still carries them', async () => {
    const event = (await send({
      type: undefined,
      request: {
        url: 'https://console.dimo.org/sign-up',
        method: 'POST',
        data: '["0xprivatekey"]',
        cookies: { dimo_auth: 'jwt' },
      },
    } as ErrorEvent)) as ErrorEvent;

    expect(event.request).toEqual({
      url: 'https://console.dimo.org/sign-up',
      method: 'POST',
    });
  });

  it('keeps an event without a request as it is', async () => {
    const event = (await send({
      type: undefined,
      message: 'boom',
    } as ErrorEvent)) as ErrorEvent;
    expect(event).toEqual({ type: undefined, message: 'boom' });
  });

  it('groups server errors by upstream route and status', async () => {
    const error = new AxiosError(
      'failed',
      'ERR_BAD_REQUEST',
      { method: 'post', url: '/api/my/connections' } as InternalAxiosRequestConfig,
      undefined,
      { status: 400, data: {} } as AxiosResponse,
    );
    const event = (await send(
      { type: undefined, request: { data: 'secret' } } as ErrorEvent,
      error,
    )) as ErrorEvent;

    expect(event.fingerprint).toEqual(['axios', 'POST /api/my/connections', '400']);
    expect(event.request).toEqual({});
  });
});
