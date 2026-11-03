import { NextResponse } from 'next/server';

import { getConnectionById } from '@/actions/connections';
import { PRIVATE_HEADERS, upstreamFailure } from '@/utils/routeResponses';

// One connection, for its details page and the resume flow. The owner's keys
// are in the body, exactly as the server action returned them, so the response
// is private and never stored. A deleted row answers 404, which
// upstreamFailure passes through.
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  try {
    return NextResponse.json(await getConnectionById(id), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return upstreamFailure(error, 'Could not load the connection');
  }
};
