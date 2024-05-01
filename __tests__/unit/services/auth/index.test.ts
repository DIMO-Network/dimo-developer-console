import nock from 'nock';
import { cookies } from 'next/headers';

import { processOauth } from '@/services/auth';
import { backendUrl } from '@/config/default';

jest.mock('next/headers');

describe('processOauth', () => {
  beforeEach(() => {
    nock.cleanAll();
    global.fetch = jest.fn();
  });

  it('should return token on successful authentication', async () => {
    const mockToken = 'mockedToken';

    (cookies as jest.Mock).mockReturnValue({
      get: () => ({ value: mockToken }),
    });

    // Mock the fetch response
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: mockToken }),
      })
    );

    // Intercept the request to the backend URL
    nock(backendUrl)
      .post('/api/auth', { code: 'authCode', app: 'myApp' })
      .reply(200, { token: mockToken });

    const code = 'authCode';
    const app = 'myApp';
    const result = await processOauth(code, app);

    expect(result).toEqual({ token: mockToken });
  });
});
