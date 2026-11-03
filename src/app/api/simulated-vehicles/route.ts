import { NextRequest, NextResponse } from 'next/server';

import { getSimulatedVehicles } from '@/actions/simulatedVehicles';
import { PRIVATE_HEADERS, upstreamFailure } from '@/utils/routeResponses';

// A license's simulated vehicles. getSimulatedVehicles answers [] on any
// failure, so this only fails on something unexpected.
export const GET = async (request: NextRequest) => {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.json(
      { message: 'clientId is required' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
  try {
    return NextResponse.json(await getSimulatedVehicles({ clientId }), {
      headers: PRIVATE_HEADERS,
    });
  } catch (error) {
    return upstreamFailure(error, 'Could not load simulated vehicles');
  }
};
