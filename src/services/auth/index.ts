import { dimoDevAPIClient } from '../dimoDevAPI';

export const processOauth = async (code: string, app: string, url: string) => {
  const { token } = await dimoDevAPIClient().post<{ token: string }>(
    '/api/auth',
    {
      code,
      app,
      url,
    }
  );

  return { token };
};

export * from './google';
export * from './github';
