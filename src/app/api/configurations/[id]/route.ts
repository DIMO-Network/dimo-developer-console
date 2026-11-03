import { NextResponse } from 'next/server';

import { getConfiguration } from '@/actions/configurations';
import { PRIVATE_HEADERS, upstreamFailure } from '@/utils/routeResponses';

// One sharing configuration, for the edit page. A GET so it loads alongside the
// page's other reads instead of queueing behind them as a server action.
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  try {
    return NextResponse.json(await getConfiguration({ id }), {
      headers: PRIVATE_HEADERS,
    });
  } catch (error) {
    return upstreamFailure(error, 'Could not load the configuration');
  }
};
