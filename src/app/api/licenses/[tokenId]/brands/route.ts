import { NextResponse } from 'next/server';
import { listMyBrands, type LicenseBrands } from '@/services/brand';
import { getMyWorkspaceByTokenId } from '@/services/workspace';
import { PRIVATE_HEADERS, upstreamFailure } from '@/utils/routeResponses';

// The license's workspace and its brands. A license with no workspace this
// caller can see has no brands (creating one is a write, done by the owner).
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> },
) => {
  const { tokenId } = await params;
  if (!/^\d+$/.test(tokenId)) {
    return NextResponse.json(
      { message: 'Invalid license' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
  try {
    const workspace = await getMyWorkspaceByTokenId(tokenId);
    const brands = workspace?.id ? await listMyBrands(workspace.id) : [];
    const body: LicenseBrands = { workspace: workspace ?? null, brands };
    return NextResponse.json(body, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return upstreamFailure(error, 'Could not load brands');
  }
};
