'use client';
import { useTeam } from '@/hooks/useTeam';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import type { LocalDeveloperLicense } from '@/types/webhook';

export type LicenseDataAccess =
  | { kind: 'owner' }
  | { kind: 'member' }
  | { kind: 'member-no-access'; ownerEmail: string }
  | { kind: 'member-unavailable' };

// How the current user reads a license's data. Outside a member team the
// license list is the user's own, so they are the owner (API-key flow).
export const useLicenseDataAccess = (
  license?: LocalDeveloperLicense,
  enabled: boolean = TEAM_DATA_ACCESS_ENABLED,
): LicenseDataAccess => {
  const { isMember, activeTeam } = useTeam();
  const { currentUser } = useGlobalAccount();
  if (!isMember) return { kind: 'owner' };
  if (!enabled) return { kind: 'member-unavailable' };
  if (!license?.hasSigner(currentUser?.walletAddress)) {
    return {
      kind: 'member-no-access',
      ownerEmail: activeTeam?.ownerEmail ?? 'the team owner',
    };
  }
  return { kind: 'member' };
};
