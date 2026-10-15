import { NextRequest, NextResponse } from 'next/server';
import { getConfigurationsByClientId } from '@/actions/configurations';

// A license's sharing configurations, for the license cards. As a server
// action, one per card, they ran one after another (Next queues server
// actions); as a GET they load side by side.
export const GET = async (request: NextRequest) => {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json({ message: 'clientId is required' }, { status: 400 });
  }
  return NextResponse.json(await getConfigurationsByClientId({ client_id: clientId }));
};
