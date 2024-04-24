import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { getUserByToken } from '@/services/user';
import { loggedUser } from '@/utils/loggedUser';

const publicEndpoints = ['/sign-in', '/sign-up'];

const getUser = async (token: string) => {
  if (!token) return null;
  return getUserByToken(token);
};

export const AuthMiddleware = async (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const isPublicPath = publicEndpoints.some((path) => url.startsWith(path));
  const { value: token = '' } = cookies().get('token') ?? {};

  const header = new Headers();
  loggedUser.user = await getUser(token);

  if (!isPublicPath && !loggedUser.user) {
    header.set('redirect', '/sign-in');
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthMiddleware;
