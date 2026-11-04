import { NextRequest, NextResponse } from 'next/server';
import config from '@/config';
import { getDimoChallenge } from '@/actions/dimoAuth';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';
import { badRequest, readJson, refuseCrossOrigin, upstreamFailed } from '../sameOrigin';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// DIMO's sign-in challenge for a smart wallet, the first half of signing in
// again from a session-expired dialog (src/services/consoleSignIn.ts).
export const POST = async (request: NextRequest) => {
  const refused = refuseCrossOrigin(request);
  if (refused) return refused;
  const { address } = await readJson(request);
  if (typeof address !== 'string' || !ADDRESS.test(address)) {
    return badRequest('A wallet address is required');
  }
  try {
    const { challenge, state } = await getDimoChallenge({
      address: address as `0x${string}`,
      clientId: 'developer-platform',
      domain: `${config.frontendUrl}sign-in`,
    });
    return NextResponse.json({ challenge, state }, { headers: PRIVATE_HEADERS });
  } catch {
    return upstreamFailed('Could not start signing in');
  }
};
