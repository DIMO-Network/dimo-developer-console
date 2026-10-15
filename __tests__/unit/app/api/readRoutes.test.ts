/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { AxiosError, AxiosHeaders } from 'axios';

jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/actions/configurations', () => ({ getConfigurationsByClientId: jest.fn() }));

import { GET as getMe } from '@/app/api/me/route';
import { GET as getConfigurations } from '@/app/api/configurations/route';
import { getUserByToken } from '@/services/user';
import { getConfigurationsByClientId } from '@/actions/configurations';

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

  it('requires a client id', async () => {
    const res = await getConfigurations(
      new NextRequest('https://console.test/api/configurations'),
    );
    expect(res.status).toBe(400);
    expect(getConfigurationsByClientId).not.toHaveBeenCalled();
  });
});
