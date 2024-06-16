import { JWT, getToken } from 'next-auth/jwt';
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware';
import { NextFetchEvent, NextResponse } from 'next/server';

import { isIn } from '@/utils/middlewareUtils';
import configuration from '@/config';

const { LOGIN_PAGES, API_PATH, UNPROTECTED_PATHS } = configuration;

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: 'sign-in',
  },
});

const mustBeAuthorize = (request: NextRequest, token: JWT | null) => {
  const url = request.nextUrl.pathname;

  const isAPI = url.startsWith(API_PATH);
  const isPublicAPIPath = UNPROTECTED_PATHS.some(isIn(url));
  return isAPI && !isPublicAPIPath && !token;
};

export const middleware = async (
  request: NextRequestWithAuth,
  event: NextFetchEvent
) => {
  const token = await getToken({ req: request });
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);
  const isAPIProtected = mustBeAuthorize(request, token);

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL('/app', request.url), {
      status: 307,
    });
  }

  if (isAPIProtected) {
    return NextResponse.json(
      {
        message: 'Unauthorized Access',
      },
      { status: 401 }
    );
  }

  if (!isLoginPage) {
    return authMiddleware(request, event);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
