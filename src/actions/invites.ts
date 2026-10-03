'use server';

import { cookies } from 'next/headers';
import { postAcceptInvitation, postInvitePreview } from '@/services/teams';
import { INVITE_TOKEN_COOKIE } from '@/utils/teamCookies';
import type { ApiResult, InvitePreview, TeamSummary } from '@/types/team';

// Codes after which the invite can never succeed (contracts C4); any other
// failure, a network one included, keeps the cookie for a later page.
const TERMINAL = new Set([
  'INVITE_INVALID',
  'INVITE_EXPIRED',
  'INVITE_EMAIL_MISMATCH',
  'ALREADY_MEMBER',
]);

const readToken = async () => (await cookies()).get(INVITE_TOKEN_COOKIE)?.value ?? null;

const settle = async <T>(
  result: ApiResult<T>,
  consumed: boolean,
): Promise<ApiResult<T>> => {
  if (
    (result.ok && consumed) ||
    (!result.ok && result.code && TERMINAL.has(result.code))
  ) {
    (await cookies()).delete(INVITE_TOKEN_COOKIE);
  }
  return result;
};

export const previewPendingInvite =
  async (): Promise<ApiResult<InvitePreview> | null> => {
    const token = await readToken();
    if (!token) return null;
    return settle(await postInvitePreview(token), false);
  };

export const acceptPendingInvite = async (): Promise<ApiResult<{
  team: TeamSummary;
}> | null> => {
  const token = await readToken();
  if (!token) return null;
  return settle(await postAcceptInvitation(token), true);
};
