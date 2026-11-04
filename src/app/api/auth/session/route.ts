import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isEmpty } from 'lodash';
import { jwtDecode } from 'jwt-decode';
import config from '@/config';
import { getDimoToken } from '@/actions/dimoAuth';
import { saveToken } from '@/actions/user';
import { PASSKEY_SESSION_SECONDS } from '@/config/sessionLengths';
import { cookieName } from '@/services/dimoDevAPI';
import { SESSION_VERDICT_COOKIE } from '@/utils/middlewareUtils';
import {
  authFailed,
  badRequest,
  readJson,
  refuseCrossSite,
  respond,
} from '../sameOrigin';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// The wallet a session token names. Read, not verified: it only decides
// whether a cookie may be replaced or deleted.
const walletOf = (token: string | undefined): string | null => {
  if (!token) return null;
  try {
    const wallet = jwtDecode<{ ethereum_address?: unknown }>(token).ethereum_address;
    return typeof wallet === 'string' ? wallet.toLowerCase() : null;
  } catch {
    return null;
  }
};

// Trades the signed challenge for a DIMO token and stores it as the session
// cookie, the second half of signing in again from a session-expired dialog.
// The token never reaches the browser. The cookie lasts `sessionSeconds`, the
// time the session key has left (at most a passkey session). A cookie another
// wallet holds is not replaced (409): that account signed in meanwhile.
export const POST = async (request: NextRequest) => {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  const { state, signedChallenge, sessionSeconds } = await readJson(request);
  if (
    typeof state !== 'string' ||
    !state ||
    typeof signedChallenge !== 'string' ||
    !signedChallenge ||
    typeof sessionSeconds !== 'number' ||
    !Number.isInteger(sessionSeconds) ||
    sessionSeconds < 1 ||
    sessionSeconds > PASSKEY_SESSION_SECONDS
  ) {
    return badRequest('A signed challenge and a session length are required');
  }
  let accessToken: string;
  try {
    const token = await getDimoToken({
      state,
      signedChallenge,
      clientId: 'developer-platform',
      domain: `${config.frontendUrl}sign-in`,
    });
    if (isEmpty(token) || !token.access_token)
      throw new Error('DIMO auth returned no token');
    accessToken = token.access_token;
  } catch (error) {
    return authFailed(error, 'Could not sign in');
  }
  const held = walletOf((await cookies()).get(cookieName)?.value);
  if (held && held !== walletOf(accessToken)) {
    return respond(
      { code: 'SIGNED_IN_ELSEWHERE', message: 'Another account signed in' },
      409,
    );
  }
  await saveToken(accessToken, sessionSeconds);
  return respond({ ok: true });
};

// Takes back the cookie a renewal just set, when the shared session stopped
// being that wallet's while it ran (another tab signed out, or in as someone
// else). Only that wallet's cookie goes: one another sign-in set since stays.
export const DELETE = async (request: NextRequest) => {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  const { wallet } = await readJson(request);
  if (typeof wallet !== 'string' || !ADDRESS.test(wallet)) {
    return badRequest('A wallet address is required');
  }
  const jar = await cookies();
  if (walletOf(jar.get(cookieName)?.value) !== wallet.toLowerCase()) {
    return respond({ cleared: false });
  }
  jar.delete(cookieName);
  jar.delete(SESSION_VERDICT_COOKIE);
  return respond({ cleared: true });
};
