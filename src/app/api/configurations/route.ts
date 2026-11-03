import { NextRequest, NextResponse } from 'next/server';

import { getConfigurationsByClientId } from '@/actions/configurations';
import { PRIVATE_HEADERS } from '@/utils/routeResponses';

// A license's sharing configurations, for the license cards. As a server
// action, one per card, they ran one after another (Next queues server
// actions); as a GET they load side by side.
export const GET = async (request: NextRequest) => {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ message: 'clientId is required' }, { status: 400 });
  }
  try {
    return NextResponse.json(await getConfigurationsByClientId({ client_id: clientId }), {
      headers: PRIVATE_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { message: 'Could not load configurations' },
      { status: 502, headers: PRIVATE_HEADERS },
    );
  }
};
