import { NextRequest, NextResponse } from 'next/server';

import { cookies } from 'next/headers';

const excludedEndpoints = ['/sign-in', '/sign-up', '/api'];

const isIn = (url: string) => (path: string) => url.startsWith(path);

const mustSignIn = (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const { value: token = '' } = cookies().get('token') ?? {};

  const isPublicPath = excludedEndpoints.some(isIn(url));
  return !isPublicPath && !token;
};

export const AuthorizationMiddleware = async (request: NextRequest) => {
  const header = new Headers();

  if (mustSignIn(request)) {
    header.set('redirect', '/sign-in');
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthorizationMiddleware;
