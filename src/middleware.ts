import { JWT, getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { NextFetchEvent, NextResponse } from 'next/server';

import { isIn } from '@/utils/middlewareUtils';
import { getUserByToken } from './services/user';
import { LoggedUser } from '@/utils/loggedUser';
import configuration from '@/config';
import axios, { isAxiosError } from 'axios';

const { LOGIN_PAGES, API_PATH, UNPROTECTED_PATHS } = configuration;

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: 'sign-in',
    error: 'sign-in?error=true',
  },
});

const mustBeAuthorize = (request: NextRequest, token: JWT | null) => {
  const url = request.nextUrl.pathname;

  const isAPI = url.startsWith(API_PATH);
  const isPublicAPIPath = UNPROTECTED_PATHS.some(isIn(url));
  return isAPI && !isPublicAPIPath && !token;
};

const handleExpiredSession = (error: unknown) => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) {
      const signOutUrl = `${configuration.frontendUrl}api/auth/signout`;
      axios.post(signOutUrl);
      return 'sign-in?error=expired';
    }
  }
  return 'app?error=true';
};

export const middleware = async (
  request: NextRequest,
  event: NextFetchEvent
) => {
  const hasError = request.nextUrl.searchParams.get('error');
  const token = await getToken({ req: request });
  const isAPIProtected = mustBeAuthorize(request, token);
  const isAPI = request.nextUrl.pathname.startsWith(API_PATH);
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);

  // Setting the user up
  try {
    if (token) {
      const user = await getUserByToken();
      request.user = new LoggedUser(user);

      const isCompliant = request.user?.isCompliant ?? false;
      const missingFlow = request.user?.missingFlow ?? null;
      const flow = request.nextUrl.searchParams.get('flow');

      if (token && !isCompliant && !flow) {
        return NextResponse.redirect(
          new URL(`/sign-up?flow=${missingFlow}`, request.url),
          {
            status: 307,
          }
        );
      }

      if (isLoginPage && token && isCompliant) {
        return NextResponse.redirect(new URL('/app', request.url), {
          status: 307,
        });
      }

      if (!isLoginPage) {
        return authMiddleware(request, event);
      }

      return NextResponse.next();
    }

    if (isAPIProtected && isAPI) {
      return NextResponse.json(
        {
          message: 'Unauthorized Access',
        },
        { status: 401 }
      );
    }

    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/sign-in', request.url), {
        status: 307,
      });
    }

    return NextResponse.next();
  } catch (error: unknown) {
    const path = await handleExpiredSession(error);
    const redirectUrl = `${configuration.frontendUrl}${path}`;
    if (!hasError) {
      return Response.redirect(redirectUrl);
    }
    return NextResponse.next();
  }
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
