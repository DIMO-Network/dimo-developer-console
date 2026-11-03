import { NextResponse } from 'next/server';
import { fetchLicenseSigners } from '@/services/teams';
import {
  apiResultResponse,
  PRIVATE_HEADERS,
  upstreamFailure,
} from '@/utils/routeResponses';

// Who each key on a license is for (X-Team-Id comes from the active_team cookie).
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) => {
  const { tokenId } = await params;
  if (!/^\d+$/.test(tokenId)) {
    return NextResponse.json(
      { ok: false, status: 400, code: 'BAD_TOKEN_ID', message: 'Invalid license' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
  try {
    return apiResultResponse(await fetchLicenseSigners(Number(tokenId)));
  } catch (error) {
    return upstreamFailure(error, 'Could not load the key registry');
  }
};
