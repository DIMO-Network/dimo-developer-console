import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getUserByToken } from '@/services/user';
import { loggedUser } from '@/utils/loggedUser';

export const AuthenticationMiddleware = async () => {
  const { value: token = '' } = cookies().get('token') ?? {};

  if (token) loggedUser.user = await getUserByToken();

  return NextResponse.next();
};

export default AuthenticationMiddleware;
