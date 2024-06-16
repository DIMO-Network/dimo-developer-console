import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isIn } from '@/utils/middlewareUtils';
import { Session } from 'next-auth';

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

const mustSignIn = (request: NextRequest, session: Session | null) => {
  const url = request.nextUrl.pathname;

  const isPublicPath = excludedEndpoints.some(isIn(url));
  return !isPublicPath && !session;
};

export const AuthorizationMiddleware = async (
  request: NextRequest,
  response: NextResponse
) => {
  const header = new Headers();
  const session = await getServerSession(request, response, authOptions);

  if (mustSignIn(request, session)) {
    header.set('redirect', EXCLUDED_PATHS.SIGN_IN);
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthorizationMiddleware;
