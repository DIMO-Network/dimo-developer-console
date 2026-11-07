import type { StatusTone } from '@/components/StatusChip';
import type { TeamMember } from '@/types/team';

// LEFT reads like REVOKED: both are former members. labelKey is a message in
// the settings area.
export const memberStatus = (
  member: TeamMember,
  now: number = Date.now(),
): { tone: StatusTone; labelKey: string } => {
  switch (member.status) {
    case 'PENDING':
      return member.inviteExpiresAt && Date.parse(member.inviteExpiresAt) < now
        ? { tone: 'error', labelKey: 'members.status.expired' }
        : { tone: 'pending', labelKey: 'members.status.invited' };
    case 'ACCEPTED':
      return { tone: 'on', labelKey: 'members.status.active' };
    case 'REVOKED':
      return { tone: 'off', labelKey: 'members.status.removed' };
    case 'LEFT':
      return { tone: 'off', labelKey: 'members.status.left' };
  }
};
