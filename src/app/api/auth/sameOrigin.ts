import { NextRequest, NextResponse } from 'next/server';
import { AxiosError } from 'axios';
import config from '@/config';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';
import { reportUnexpected } from '@/utils/upstreamErrors';

// /api/auth/* sits outside the proxy (its matcher skips it), so it runs with no
// session cookie: that is how a session-expired dialog signs in again from any
// page. Server actions get Next's origin check; these routes check it
// themselves, so another site can't sign a visitor in or out (CSRF). Like
// Next's check, the Origin's host must be the host the request came to
// (x-forwarded-host first), or the console's configured public address. A JSON
// body is required too, which a cross-site form can't send without a preflight.
export const refuseCrossSite = (request: NextRequest): NextResponse | null => {
  const origin = request.headers.get('origin');
  // The media type itself: `text/plain; x=application/json` is a simple
  // request, sent cross-site without a preflight.
  const json =
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ===
    'application/json';
  if (origin && json && fromConsole(origin, request)) return null;
  return NextResponse.json(
    { message: 'Cross-origin request refused' },
    { status: 403, headers: PRIVATE_HEADERS },
  );
};

const fromConsole = (origin: string, request: NextRequest) => {
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const requestHost =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  return host === requestHost || host === hostOf(config.frontendUrl);
};

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

export const respond = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: PRIVATE_HEADERS });

export const badRequest = (message: string) => respond({ message }, 400);

// DIMO auth said no (a 4xx: a bad or stale signature) or failed; only a
// failure is reported.
export const authFailed = (error: unknown, message: string) => {
  reportUnexpected(error);
  const status = error instanceof AxiosError ? error.response?.status : undefined;
  return respond({ message }, status && status < 500 ? 400 : 502);
};

export const readJson = async (
  request: NextRequest,
): Promise<Record<string, unknown>> => {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};
