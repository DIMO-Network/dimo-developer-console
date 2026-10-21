import type { DataApiError } from '@/services/subjects/client';
import type { Access } from './SourceRail';

// How a data proxy failure changes the page. Per-field failures (UPSTREAM,
// GRAPHQL) keep the tabs open; anything unrecognised is an error state, never
// silently "ok".
export const accessFromError = (
  error: DataApiError | null | undefined,
  { member, walletIsSigner }: { member: boolean; walletIsSigner: boolean },
): Access => {
  if (!error) return 'ok';
  switch (error.code) {
    case 'UPSTREAM':
    case 'GRAPHQL':
      return 'ok';
    case 'NOT_SHARED':
      return 'not-shared';
    case 'DEV_JWT_INVALID':
    case 'DEV_JWT_MISSING':
      return 'jwt-expired';
    case 'NO_ACCESS':
      if (error.memberOfTeam === false) return 'removed';
      // An owner's disabled API key: generate a new developer JWT.
      if (!member) return 'jwt-expired';
      // The chain still lists the wallet, so the stored JWT is the problem.
      return walletIsSigner ? 'reconnect' : 'no-access';
    default:
      return 'error';
  }
};
