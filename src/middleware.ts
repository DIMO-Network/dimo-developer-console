import axios, { isAxiosError } from 'axios';

import { JWT, getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { NextFetchEvent, NextResponse } from 'next/server';

import configuration from '@/config';

import { isIn } from '@/utils/middlewareUtils';
import { getUserByToken } from './services/user';
import { LoggedUser } from '@/utils/loggedUser';
import configuration from '@/config';
import axios, { isAxiosError } from 'axios';
import { getUserSubOrganization } from '@/services/globalAccount';

const { LOGIN_PAGES, API_PATH, UNPROTECTED_PATHS, VALIDATION_PAGES } = configuration;

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
  const isValidationPage = VALIDATION_PAGES.includes(request.nextUrl.pathname);

  // Setting the user up
  try {
    if (token) {
      const user = await getUserByToken();
      const subOrganization = await getUserSubOrganization(user.email);
      request.user = new LoggedUser(user, subOrganization);

      const isCompliant = request.user?.isCompliant ?? false;
      const missingFlow = request.user?.missingFlow ?? null;
      const flow = request.nextUrl.searchParams.get('flow');


      console.info('user', user);
      console.info('isLoginPage', isLoginPage);
      console.info('isValidationPage', isValidationPage);
      console.info('isCompliant', isCompliant);
      console.info('missingFlow', missingFlow);
      console.info('flow', flow);
/*
      if (isValidationPage) return NextResponse.next();


      if (token && !isCompliant && !flow) {
        return NextResponse.redirect(
          new URL(`/sign-up?flow=${missingFlow}`, request.url),
          {
            status: 307,
          }
        );
      }

      if (isLoginPage && isCompliant) {
        return NextResponse.redirect(new URL('/app', request.url), {
          status: 307,
        });
      }

      if (!isLoginPage) {
        return authMiddleware(request, event);
      }
*/
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
    const path = handleExpiredSession(error);
    const redirectUrl = `${configuration.frontendUrl}${path}`;
    if (!hasError) {
      return Response.redirect(redirectUrl);
    }
    return NextResponse.next();
  }
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)'],
};
