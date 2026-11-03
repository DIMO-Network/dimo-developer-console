/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { AxiosError, AxiosHeaders } from 'axios';

jest.mock('@/actions/connections', () => ({
  getMyConnections: jest.fn(),
  getConnectionById: jest.fn(),
}));
jest.mock('@/actions/simulatedVehicles', () => ({ getSimulatedVehicles: jest.fn() }));

import { GET as getConnections } from '@/app/api/connections/route';
import { GET as getConnection } from '@/app/api/connections/[id]/route';
import { GET as getVehicles } from '@/app/api/simulated-vehicles/route';
import { getMyConnections, getConnectionById } from '@/actions/connections';
import { getSimulatedVehicles } from '@/actions/simulatedVehicles';

const axiosStatus = (status: number) =>
  new AxiosError('failed', String(status), undefined, undefined, {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: {},
  });

describe('GET /api/connections', () => {
  it('returns the list', async () => {
    (getMyConnections as jest.Mock).mockResolvedValue([{ id: 'c1' }]);
    const res = await getConnections();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual([{ id: 'c1' }]);
  });

  it("keeps console-api's 403", async () => {
    (getMyConnections as jest.Mock).mockRejectedValue(axiosStatus(403));
    const res = await getConnections();
    expect(res.status).toBe(403);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual({ message: 'Could not load connections' });
  });
});

describe('GET /api/connections/[id]', () => {
  it('answers 200 null for a deleted connection', async () => {
    (getConnectionById as jest.Mock).mockResolvedValue(null);
    const res = await getConnection(
      new Request('https://console.test/api/connections/x'),
      {
        params: Promise.resolve({ id: 'x' }),
      },
    );
    expect(getConnectionById).toHaveBeenCalledWith('x');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toBeNull();
  });
});

describe('GET /api/simulated-vehicles', () => {
  it('requires a client id', async () => {
    (getSimulatedVehicles as jest.Mock).mockClear();
    const res = await getVehicles(
      new NextRequest('https://console.test/api/simulated-vehicles'),
    );
    expect(res.status).toBe(400);
    expect(getSimulatedVehicles).not.toHaveBeenCalled();
  });

  it('returns the vehicles', async () => {
    (getSimulatedVehicles as jest.Mock).mockResolvedValue([{ id: 'v1' }]);
    const res = await getVehicles(
      new NextRequest('https://console.test/api/simulated-vehicles?clientId=0xabc'),
    );
    expect(getSimulatedVehicles).toHaveBeenCalledWith({ clientId: '0xabc' });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual([{ id: 'v1' }]);
  });
});
