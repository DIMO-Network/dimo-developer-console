import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { getUserByToken } from '@/services/user';

export const processOauth = async (code: string, app: string, url: string) => {
  const {
    data: { token },
  } = await dimoDevAPIClient().post<{ token: string }>('/api/auth', {
    code,
    app,
    url,
  });

  return { token };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwt = async ({
  token,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  let userId = null;
  const { data: user } = await getUserByToken();
  console.log('USER:', JSON.stringify(user, null, 2));

  if (user) {
    userId = user.id;
  }

  token.id = userId;

  return token;
};

export const session = async ({
  session,
  token,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any;
}) => {
  session.user.id = token.id;
  console.log('SESSION: ', {
    session: JSON.stringify(session, null, 2),
    token: JSON.stringify(token, null, 2),
  });
  return session;
};

export * from './google';
export * from './github';
