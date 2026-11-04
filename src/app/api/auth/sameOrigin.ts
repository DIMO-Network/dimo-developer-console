import { NextRequest, NextResponse } from 'next/server';
import config from '@/config';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';

// /api/auth/* sits outside the proxy (its matcher skips it), so it can run with
// no session cookie: that is how a session-expired dialog signs in again from
// any page. Server actions get Next's origin check; these routes check it
// themselves, so another site can't sign a visitor in (login CSRF).
// The console's own pages: this deployment, or its configured public address.
export const refuseCrossOrigin = (request: NextRequest): NextResponse | null => {
  const origin = request.headers.get('origin');
  if (origin && (origin === request.nextUrl.origin || origin === publicOrigin())) {
    return null;
  }
  return NextResponse.json(
    { message: 'Cross-origin request refused' },
    { status: 403, headers: PRIVATE_HEADERS },
  );
};

const publicOrigin = () => {
  try {
    return new URL(config.frontendUrl).origin;
  } catch {
    return null;
  }
};

export const badRequest = (message: string) =>
  NextResponse.json({ message }, { status: 400, headers: PRIVATE_HEADERS });

export const upstreamFailed = (message: string) =>
  NextResponse.json({ message }, { status: 502, headers: PRIVATE_HEADERS });

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
