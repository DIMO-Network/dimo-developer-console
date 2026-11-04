import { NextRequest, NextResponse } from 'next/server';
import { isEmpty } from 'lodash';
import config from '@/config';
import { getDimoToken } from '@/actions/dimoAuth';
import { saveToken } from '@/actions/user';
import {
  EMAIL_CODE_SESSION_SECONDS,
  PASSKEY_SESSION_SECONDS,
} from '@/config/sessionLengths';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';
import { badRequest, readJson, refuseCrossOrigin, upstreamFailed } from '../sameOrigin';

const SESSION_SECONDS = [PASSKEY_SESSION_SECONDS, EMAIL_CODE_SESSION_SECONDS];

// Trades the signed challenge for a DIMO token and stores it as the session
// cookie, the second half of signing in again from a session-expired dialog.
// The token never reaches the browser.
export const POST = async (request: NextRequest) => {
  const refused = refuseCrossOrigin(request);
  if (refused) return refused;
  const { state, signedChallenge, sessionSeconds } = await readJson(request);
  if (
    typeof state !== 'string' ||
    !state ||
    typeof signedChallenge !== 'string' ||
    !signedChallenge ||
    typeof sessionSeconds !== 'number' ||
    !SESSION_SECONDS.includes(sessionSeconds)
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
    if (isEmpty(token) || !token.access_token) throw new Error('No token');
    accessToken = token.access_token;
  } catch {
    return upstreamFailed('Could not sign in');
  }
  await saveToken(accessToken, sessionSeconds);
  return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
};
