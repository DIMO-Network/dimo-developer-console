import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';

import { getUserByToken } from '@/services/user';
import LoggedUser from '@/utils/loggedUser';

export const AuthenticationMiddleware = async (request: NextRequest) => {
  await getServerSession(
    context.req,
    context.res,
    authOptions
  )

  if (token) request.user = new LoggedUser(await getUserByToken());

  return NextResponse.next();
};

export default AuthenticationMiddleware;
