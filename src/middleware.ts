import { NextFetchEvent, NextResponse } from 'next/server';
import {
  decodeJwtToken,
  isIn,
  isInvalidTokenError,
  isSessionExpiredError,
  SESSION_VERDICT_COOKIE,
  SESSION_VERDICT_MAX_AGE,
  sessionVerdictFor,
} from '@/utils/middlewareUtils';
import { getUserByToken } from './services/user';
import { LoggedUser } from '@/utils/loggedUser';
import configuration from '@/config';
import { getUserSubOrganization } from '@/services/globalAccount';
import axios, { AxiosError } from 'axios';
import * as Sentry from '@sentry/nextjs';
import { JWTPayload } from 'jose/dist/types';
import { cookieName, getCookie } from './services/dimoDevAPI';
import { FOCUS_QUERY_PARAM } from '@/utils/focusConstants';

const { LOGIN_PAGES, API_PATH, UNPROTECTED_PATHS } = configuration;

const buildRedirectUrl = (path: string, request: NextRequest) => {
  const url = new URL(path, request.url);
  const focus = request.nextUrl.searchParams.get(FOCUS_QUERY_PARAM);
  if (focus && !url.searchParams.has(FOCUS_QUERY_PARAM)) {
    url.searchParams.set(FOCUS_QUERY_PARAM, focus);
  }
  return url;
};

// A token that does not verify is no session: the visitor is sent to sign in
// (or gets a 401) rather than an error page. That holds for every failure,
// not only the expected ones -- an attacker can make jose throw other errors
// (an unsupported "crit" header, say), and a failure here must never fall
// through to the error handling below, which lets requests continue.
const verifyToken = async (token: string) => {
  try {
    return await decodeJwtToken(token);
  } catch (error) {
    if (!isInvalidTokenError(error)) {
      // Not a bad token but a failure to check it, e.g. the key set could not
      // be fetched: worth seeing, still no session.
      Sentry.captureException(error);
      console.error('Session token could not be verified:', error);
    }
    return null;
  }
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
  // isSessionExpiredError, not "any 401": see src/utils/middlewareUtils.ts.
  if (isSessionExpiredError(error)) {
    const signOutUrl = `${configuration.frontendUrl}api/auth/signout`;
    // Floating, and it has to not reject: an unhandled rejection here takes
    // the middleware down on the way to the redirect that replaces it.
    axios.post(signOutUrl).catch(() => {});
    return 'sign-in?error=expired';
  }
  return isLoginPage ? 'sign-in?error=true' : 'app?error=true';
};

const rememberVerdict = (
  request: NextRequest,
  response: NextResponse,
  verdict: string,
) => {
  response.cookies.set(SESSION_VERDICT_COOKIE, verdict, {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_VERDICT_MAX_AGE,
  });
  return response;
};

const validatePrivateSession = async (request: NextRequest, token: string) => {
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);
  const verdict = await sessionVerdictFor(token);
  // /api/me accepts a pending team invitation as a side effect, so while one is
  // waiting the full check runs every time.
  const hasInvitation = Boolean(await getCookie('invitation_code'));

  // This session already passed the check below: see SESSION_VERDICT_COOKIE.
  if (!hasInvitation && request.cookies.get(SESSION_VERDICT_COOKIE)?.value === verdict) {
    return isLoginPage
      ? NextResponse.redirect(buildRedirectUrl('/app', request), { status: 307 })
      : NextResponse.next();
  }

  console.info('Validating private session', request.nextUrl.pathname);
  const user = await getUserByToken();
  const subOrganization = await getUserSubOrganization(
    user.company_email_owner ?? user.email,
  );
  if (!subOrganization) {
    Sentry.captureMessage('Suborganization not found');
    return NextResponse.redirect(new URL('/sign-in', request.url), {
      status: 307,
    });
  }

  const loggedUser = new LoggedUser(user, subOrganization);
  const flow = request.nextUrl.searchParams.get('flow');

  if (!loggedUser.isCompliant) {
    if (flow) return NextResponse.next();
    return NextResponse.redirect(
      buildRedirectUrl(`/sign-up?flow=${loggedUser.missingFlow}`, request),
      {
        status: 307,
      },
    );
  }

  //TODO: check how isLoginPage affects on safari
  const response = isLoginPage
    ? NextResponse.redirect(buildRedirectUrl('/app', request), { status: 307 })
    : NextResponse.next();
  return rememberVerdict(request, response, verdict);
};

const validatePublicSession = async (request: NextRequest, token: JWTPayload | null) => {
  console.info('Validating public session', request.nextUrl.pathname);
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
    return NextResponse.redirect(buildRedirectUrl('/sign-in', request), {
      status: 307,
    });
  }

  return NextResponse.next();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const middleware = async (request: NextRequest, event: NextFetchEvent) => {
  const hasError = request.nextUrl.searchParams.get('error');
  const isLoginPage = LOGIN_PAGES.includes(request.nextUrl.pathname);
  let token: JWTPayload | null = null;
  try {
    const rawToken = await getCookie(cookieName);
    token = rawToken ? await verifyToken(rawToken) : null;
    if (rawToken && token) {
      return await validatePrivateSession(request, rawToken);
    }

    return await validatePublicSession(request, token);
  } catch (error: unknown) {
    Sentry.captureException(error);
    console.error('Middleware error:', error);
    // Only a verified session may continue past a failure (the ?error= branch
    // below lets the request through). Anything else is treated as signed out.
    if (!token) return validatePublicSession(request, null);
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
  // icon.png is the app icon: it needs no session. Excluded by name, not by
  // extension -- a dynamic route (/api/templates/[id]) can end in ".png" too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|images|api/auth).*)'],
};
