import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { isIn } from '@/utils/middlewareUtils';

enum EXCLUDED_PATHS {
  SIGN_IN = '/sign-in',
  SIGN_UP = '/sign-up',
  API = '/api',
}

const excludedEndpoints = [
  EXCLUDED_PATHS.SIGN_IN,
  EXCLUDED_PATHS.SIGN_UP,
  EXCLUDED_PATHS.API,
];

const mustSignIn = (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const { value: token = '' } = cookies().get('token') ?? {};

  const isPublicPath = excludedEndpoints.some(isIn(url));
  return !isPublicPath && !token;
};

export const AuthorizationMiddleware = async (request: NextRequest) => {
  const header = new Headers();

  if (mustSignIn(request)) {
    header.set('redirect', EXCLUDED_PATHS.SIGN_IN);
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthorizationMiddleware;
