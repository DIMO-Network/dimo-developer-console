import { NextResponse } from 'next/server';

import { getMyConnections } from '@/actions/connections';
import { PRIVATE_HEADERS, upstreamFailure } from '@/utils/routeResponses';

// The connections list. A GET so a failure reaches the browser with its status
// (a server action loses it, so every failure was retried) and the read does
// not queue behind other server actions.
export const GET = async () => {
  try {
    return NextResponse.json(await getMyConnections(), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return upstreamFailure(error, 'Could not load connections');
  }
};
