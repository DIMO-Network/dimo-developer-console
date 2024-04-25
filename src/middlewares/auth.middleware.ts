import { NextRequest, NextResponse } from 'next/server';

import { getUserByToken } from '@/services/user';
import { loggedUser } from '@/utils/loggedUser';

const publicEndpoints = ['/sign-in', '/sign-up'];

const getUser = async () => {
  return getUserByToken();
};

export const AuthMiddleware = async (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const isPublicPath = publicEndpoints.some((path) => url.startsWith(path));

  const header = new Headers();
  loggedUser.user = await getUser();

  console.log(loggedUser.user);

  if (!isPublicPath && !loggedUser.user) {
    header.set('redirect', '/sign-in');
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthMiddleware;
