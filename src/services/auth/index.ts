import { dimoDevAPIClient } from '../dimoDevAPI';

export const processOauth = async (code: string, app: string) => {
  const { token } = await dimoDevAPIClient().post<{ token: string }>(
    '/api/auth',
    {
      code,
      app,
    }
  );

  return { token };
};

export * from './google';
export * from './github';
