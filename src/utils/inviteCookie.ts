import { NextResponse, type NextRequest } from 'next/server';
import {
  INVITE_QUERY_PARAM,
  INVITE_TOKEN_COOKIE,
  INVITE_TOKEN_MAX_AGE,
} from '@/utils/teamCookies';

// base64url of 32 random bytes is 43 characters; allow some slack, nothing else.
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

// /sign-in?invite=<token> (contracts C4): keep the token in an HttpOnly cookie
// and send the browser back to the same URL without it. Runs before any session
// check, so neither a redirect nor a console-api failure can lose the invite.
export const inviteRedirect = (request: NextRequest): NextResponse | null => {
  if (request.nextUrl.pathname !== '/sign-in') return null;
  const token = request.nextUrl.searchParams.get(INVITE_QUERY_PARAM);
  if (token === null) return null;
  const url = request.nextUrl.clone();
  url.searchParams.delete(INVITE_QUERY_PARAM);
  const response = NextResponse.redirect(url, { status: 307 });
  if (TOKEN.test(token)) {
    response.cookies.set(INVITE_TOKEN_COOKIE, token, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      maxAge: INVITE_TOKEN_MAX_AGE,
    });
  }
  return response;
};
