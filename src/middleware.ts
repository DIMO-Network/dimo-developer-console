import { JWT, getToken } from 'next-auth/jwt';
import { withAuth } from 'next-auth/middleware';
import { NextFetchEvent, NextResponse } from 'next/server';
import { isIn } from '@/utils/middlewareUtils';
import { getUserByToken } from './services/user';
import { LoggedUser } from '@/utils/loggedUser';
import configuration from '@/config';
import { getUserSubOrganization } from '@/services/globalAccount';
import axios, { AxiosError } from 'axios';
import * as Sentry from '@sentry/nextjs';

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

const handleConnectionError = (error: unknown, isLoginPage: boolean) => {
  if (error instanceof AxiosError) {
    if (error.message === 'Network Error') {
      return isLoginPage ? 'sign-in?error=true' : 'app?error=true';
    }
  }
  return null;
};

const handleExpiredSession = (error: unknown, isLoginPage: boolean) => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (status === 401) {
      const signOutUrl = `${configuration.frontendUrl}api/auth/signout`;
      axios.post(signOutUrl);
      return 'sign-in?error=expired';
    }
  }
  return isLoginPage ? 'sign-in?error=true' : 'app?error=true';
};

const validatePrivateSession = async (request: NextRequest, event: NextFetchEvent) => {
  const user = await getUserByToken();
  //TODO: check if we need to use company_email_owner or email
  const subOrganization = await getUserSubOrganization(
    user.company_email_owner ?? user.email,
  );

  if (!subOrganization) {
    Sentry.captureMessage('Suborganization not found');
    return NextResponse.redirect(new URL('/sign-in', request.url), {
      status: 307,
    });
  }

  request.user = new LoggedUser(user, subOrganization);

  const isValidationPage = VALIDATION_PAGES.includes(request.nextUrl.pathname);
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);

  const isCompliant = request.user?.isCompliant ?? false;
  const missingFlow = request.user?.missingFlow ?? null;
  const flow = request.nextUrl.searchParams.get('flow');

  //TODO: check how isLoginPage affects on safari
  if (isValidationPage && isCompliant) {
    return NextResponse.redirect(new URL('/app', request.url), {
      status: 307,
    });
  }

  if (!isCompliant && !flow) {
    return NextResponse.redirect(new URL(`/sign-up?flow=${missingFlow}`, request.url), {
      status: 307,
    });
  }

  if (!isLoginPage) {
    return authMiddleware(request, event);
  }
  return NextResponse.next();
};

const validatePublicSession = async (request: NextRequest) => {
  const token = await getToken({ req: request });
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);
  const isAPIProtected = mustBeAuthorize(request, token);
  const isAPI = request.nextUrl.pathname.startsWith(API_PATH);

  if (isAPIProtected && isAPI) {
    return NextResponse.json(
      {
        message: 'Unauthorized Access',
      },
      { status: 401 },
    );
  }

  if (!isLoginPage) {
    return NextResponse.redirect(new URL('/sign-in', request.url), {
      status: 307,
    });
  }

  return NextResponse.next();
};

export const middleware = async (request: NextRequest, event: NextFetchEvent) => {
  const hasError = request.nextUrl.searchParams.get('error');
  const token = await getToken({ req: request });
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);

  try {
    if (token) {
      return validatePrivateSession(request, event);
    }

    return validatePublicSession(request);
  } catch (error: unknown) {
    Sentry.captureException(error);
    console.error('Middleware error:', error);
    let path = handleConnectionError(error, isLoginPage);
    path = path ?? handleExpiredSession(error, isLoginPage);
    const redirectUrl = `${configuration.frontendUrl}${path}`;
    if (!hasError) {
      return Response.redirect(redirectUrl);
    }
    return NextResponse.next();
  }
};

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
