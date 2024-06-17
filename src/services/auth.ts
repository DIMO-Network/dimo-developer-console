import _ from 'lodash';

import { getUserByToken } from '@/services/user';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwt = async ({
  token,
  account,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
any) => {
  const currentProvider = _.get(token, 'provider', null);
  const provider = _.get(account, 'provider', currentProvider);

  token.provider = provider;

  if (!token.userId) {
    const { data: user } = await getUserByToken();
    const userId = _.get(user, 'id', null);
    token.userId = userId;
  }

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
  session.user.provider = token.provider;
  session.user.id = token.userId;

  return session;
};
