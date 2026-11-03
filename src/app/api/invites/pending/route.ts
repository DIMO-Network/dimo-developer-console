import { previewPendingInvite } from '@/actions/invites';
import type { InvitePreview } from '@/types/team';
import { apiResultResponse, upstreamFailure } from '@/utils/routeResponses';

// Previews the pending invite (HttpOnly cookie). No cookie is a success with
// null data, not an error.
export const GET = async () => {
  try {
    return apiResultResponse<InvitePreview | null>(
      (await previewPendingInvite()) ?? { ok: true, data: null },
    );
  } catch (error) {
    return upstreamFailure(error, 'Could not load the invite');
  }
};
