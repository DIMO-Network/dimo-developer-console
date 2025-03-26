import { createRemoteJWKSet, jwtVerify } from 'jose';
import { NextFetchEvent, NextResponse } from 'next/server';
import { isIn } from '@/utils/middlewareUtils';
import { getUserByToken } from './services/user';
import { LoggedUser } from '@/utils/loggedUser';
import configuration from '@/config';
import { getUserSubOrganization } from '@/services/globalAccount';
import axios, { AxiosError } from 'axios';
import * as Sentry from '@sentry/nextjs';
import { JWTPayload } from 'jose/dist/types';
import { cookiePrefix, getCookie } from './services/dimoDevAPI';

const { LOGIN_PAGES, API_PATH, UNPROTECTED_PATHS, VALIDATION_PAGES } = configuration;

const getToken = async ({ req }: { req: NextRequest }) => {
  const tokenCookie = `${cookiePrefix}session-token`;
  const token = await getCookie(tokenCookie);
  
  if (!token) {
    return null;
  }

  const jwks = createRemoteJWKSet(new URL(process.env.JWT_KEY_SET_URL!));
  const { payload } = await jwtVerify(token, jwks, {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER,
  });

  return payload;
};

const mustBeAuthorize = (request: NextRequest, token: JWTPayload | null) => {
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

const validatePrivateSession = async (request: NextRequest) => {
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
  //const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);

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

  // if (!isLoginPage) {
  //   return authMiddleware(request, event);
  // }

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const middleware = async (request: NextRequest, event: NextFetchEvent) => {
  const hasError = request.nextUrl.searchParams.get('error');
  const token = await getToken({ req: request });
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);

  try {
    if (token) {
      return validatePrivateSession(request);
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)'],
};
