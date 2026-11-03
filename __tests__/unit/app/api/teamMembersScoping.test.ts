/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

import axios, { type AxiosAdapter } from 'axios';
import { cookies } from 'next/headers';
import { GET as getMembers } from '@/app/api/team/members/route';

describe('GET /api/team/members scoping', () => {
  const original = axios.defaults.adapter;
  afterEach(() => {
    axios.defaults.adapter = original;
  });

  it('sends the active team as X-Team-Id', async () => {
    const values: Record<string, string> = {
      'session-token': 'tok',
      'active_team': 'team-9',
    };
    (cookies as jest.Mock).mockResolvedValue({
      get: (name: string) => (values[name] ? { value: values[name] } : undefined),
      delete: jest.fn(),
    });
    const seen: Array<Record<string, unknown>> = [];
    const adapter: AxiosAdapter = async (config) => {
      seen.push({
        'X-Team-Id': config.headers.get('X-Team-Id'),
        'Authorization': config.headers.get('Authorization'),
      });
      return {
        data: { members: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    axios.defaults.adapter = adapter;

    const res = await getMembers();
    expect(res.status).toBe(200);
    expect(seen).toEqual([{ 'X-Team-Id': 'team-9', 'Authorization': 'Bearer tok' }]);
  });
});
