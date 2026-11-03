/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { AxiosError, AxiosHeaders } from 'axios';

jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  getConfiguration: jest.fn(),
}));

import { GET as getMe } from '@/app/api/me/route';
import { GET as getConfigurations } from '@/app/api/configurations/route';
import { GET as getConfigurationById } from '@/app/api/configurations/[id]/route';
import { getUserByToken } from '@/services/user';
import { getConfigurationsByClientId, getConfiguration } from '@/actions/configurations';

const axiosStatus = (status: number) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

describe('GET /api/me', () => {
  it('returns the signed-in user', async () => {
    (getUserByToken as jest.Mock).mockResolvedValue({ email: 'dev@dimo.test' });
    const res = await getMe();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ email: 'dev@dimo.test' });
  });

  it("passes console-api's status through", async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(axiosStatus(401));
    const res = await getMe();
    expect(res.status).toBe(401);
  });

  it('answers 502 when console-api cannot be reached', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));
    const res = await getMe();
    expect(res.status).toBe(502);
  });
});

describe('GET /api/configurations', () => {
  it("returns the license's configurations", async () => {
    (getConfigurationsByClientId as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
    const res = await getConfigurations(
      new NextRequest('https://console.test/api/configurations?clientId=0xabc'),
    );
    expect(getConfigurationsByClientId).toHaveBeenCalledWith({ client_id: '0xabc' });
    await expect(res.json()).resolves.toEqual([{ id: 'c1' }]);
  });

  // LicenseCard says "Sharing status unavailable" only if this isn't a 200.
  it('answers 502 when console-api could not be asked', async () => {
    (getConfigurationsByClientId as jest.Mock).mockRejectedValue(axiosStatus(502));
    const res = await getConfigurations(
      new NextRequest('https://console.test/api/configurations?clientId=0xabc'),
    );
    expect(res.status).toBe(502);
  });

  it('requires a client id', async () => {
    const res = await getConfigurations(
      new NextRequest('https://console.test/api/configurations'),
    );
    expect(res.status).toBe(400);
    expect(getConfigurationsByClientId).not.toHaveBeenCalled();
  });
});

describe('GET /api/configurations/[id]', () => {
  const call = () =>
    getConfigurationById(new Request('https://console.test/api/configurations/c1'), {
      params: Promise.resolve({ id: 'c1' }),
    });

  it('returns the configuration', async () => {
    const body = { id: 'c1', configuration_name: 'n', configuration: {} };
    (getConfiguration as jest.Mock).mockResolvedValue(body);
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual(body);
    expect(getConfiguration).toHaveBeenCalledWith({ id: 'c1' });
  });

  it("keeps console-api's 404", async () => {
    (getConfiguration as jest.Mock).mockRejectedValue(axiosStatus(404));
    const res = await call();
    expect(res.status).toBe(404);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('answers 502 when console-api was not reached', async () => {
    (getConfiguration as jest.Mock).mockRejectedValue(new AxiosError('Network Error'));
    const res = await call();
    expect(res.status).toBe(502);
  });
});
