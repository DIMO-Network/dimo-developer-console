/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { AxiosError, AxiosHeaders } from 'axios';

const mockGet = jest.fn();
const mockCreate = jest.fn();
jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      create: (config: unknown) => mockCreate(config),
    },
  };
});

import { GET } from '@/app/api/credit-usage/route';

const LICENSE = `0x${'ab'.repeat(20)}`;
const call = (licenseId: string | null, jwt?: string) =>
  GET(
    new NextRequest(
      `https://console.test/api/credit-usage${licenseId === null ? '' : `?licenseId=${encodeURIComponent(licenseId)}`}`,
      { headers: jwt ? { 'X-Developer-Jwt': jwt } : {} },
    ),
  );

describe('GET /api/credit-usage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockCreate.mockClear();
    mockCreate.mockReturnValue({ get: mockGet });
  });

  it('asks the tracker with a 3 s timeout', async () => {
    mockGet.mockResolvedValue({ data: { numOfCreditsUsed: 1 } });
    await call(LICENSE, 'jwt-1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 3000,
        headers: { Authorization: 'Bearer jwt-1' },
      }),
    );
    expect(mockGet.mock.calls[0][0]).toBe(`/v1/credits/${LICENSE}/usage`);
  });

  it('returns the usage', async () => {
    mockGet.mockResolvedValue({ data: { numOfCreditsUsed: 12 } });
    const res = await call(LICENSE, 'jwt-1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(res.json()).resolves.toEqual({ numOfCreditsUsed: 12 });
  });

  it('refuses a license id that is not an address', async () => {
    const res = await call('../../x', 'jwt-1');
    expect(res.status).toBe(400);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('refuses a request without the developer JWT', async () => {
    const res = await call(LICENSE);
    expect(res.status).toBe(400);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('answers 502 when the tracker times out, without the JWT', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockRejectedValue(
      new AxiosError('timeout of 3000ms exceeded', 'ECONNABORTED', {
        headers: new AxiosHeaders({ Authorization: 'Bearer jwt-1' }),
      }),
    );
    const res = await call(LICENSE, 'jwt-1');
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ message: 'Credit usage unavailable' });
    expect(JSON.stringify(body)).not.toContain('jwt-1');
    expect(logged).toHaveBeenCalledWith(
      '[credit-usage]',
      'Credit usage request failed (no response)',
    );
    expect(JSON.stringify(logged.mock.calls)).not.toContain('jwt-1');
    logged.mockRestore();
  });
});
