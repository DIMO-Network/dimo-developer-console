import type { StatusTone } from '@/components/StatusChip';
import type { TeamMember } from '@/types/team';

// LEFT reads like REVOKED: both are former members.
export const memberStatus = (
  member: TeamMember,
  now: number = Date.now(),
): { tone: StatusTone; label: string } => {
  switch (member.status) {
    case 'PENDING':
      return member.inviteExpiresAt && Date.parse(member.inviteExpiresAt) < now
        ? { tone: 'error', label: 'Invite expired' }
        : { tone: 'pending', label: 'Invited' };
    case 'ACCEPTED':
      return { tone: 'on', label: 'Active' };
    case 'REVOKED':
      return { tone: 'off', label: 'Removed' };
    case 'LEFT':
      return { tone: 'off', label: 'Left' };
  }
};
