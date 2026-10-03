'use client';
import { type FC, type ReactNode, useState } from 'react';
import { toast } from 'sonner';
import { Section, SectionHeader } from '@/components/Section';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { withLoadingStatus } from '@/hoc/withLoadingStatus';
import { cancelTeamInvite, resendTeamInvite } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useTeam } from '@/hooks/useTeam';
import { useTeamLicenses } from '@/hooks/useTeamLicenses';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { InviteMemberModal } from './InviteMemberModal';
import { inviteSendError } from './inviteSendError';
import { LeaveTeam } from './LeaveTeam';
import { MembersTable, type MemberActionHandlers } from './MembersTable';

const TeamSectionComponent: FC = () => {
  const { activeTeam, isOwner, isLoading: teamLoading } = useTeam();
  const { members, isLoading, isError, refetch, upsertMember } = useTeamMembers();
  const {
    licenses,
    loading: licensesLoading,
    error: licensesError,
    refetch: refetchLicenses,
  } = useTeamLicenses();
  const { trackEvent } = useMixPanel();
  const [inviteOpen, setInviteOpen] = useState(false);
  const showDataAccess = isOwner && TEAM_DATA_ACCESS_ENABLED;
  // Grant, Revoke and Remove read on-chain state from the licenses: only once
  // they loaded cleanly (an empty list while loading would read as off-chain).
  const licensesReady = !licensesLoading && !licensesError;

  const handlers: MemberActionHandlers = {
    resend: async (member) => {
      const result = await resendTeamInvite(member.id).catch(() => null);
      if (result?.ok) {
        upsertMember(result.data.member);
        trackEvent('Team Invite Resent', { teamId: activeTeam?.id });
        toast.success(`Invite resent to ${member.email}`);
      } else {
        toast.error(
          result
            ? inviteSendError(result, member.email)
            : "We couldn't resend the invite. Try again.",
        );
      }
    },
    cancel: async (member) => {
      const result = await cancelTeamInvite(member.id).catch(() => null);
      if (result?.ok) {
        toast.success(`Invite to ${member.email} cancelled`);
        void refetch();
      } else {
        toast.error(result?.message ?? "We couldn't cancel the invite. Try again.");
      }
    },
  };

  let body: ReactNode;
  if (teamLoading || isLoading) {
    body = <Loader isLoading />;
  } else if (isError) {
    body = (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-body-sm text-negative">
          Couldn&apos;t load your team.
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  } else if (isOwner && members.every((m) => m.role === 'OWNER')) {
    body = (
      <p className="text-body-sm text-muted">
        Invite teammates to share this team&apos;s licenses with them. You choose who gets
        data access.
      </p>
    );
  } else {
    body = (
      <MembersTable
        members={members}
        licenses={licenses}
        licensesReady={licensesReady}
        isOwner={isOwner}
        showDataAccess={showDataAccess}
        handlers={isOwner ? handlers : undefined}
      />
    );
  }

  return (
    <Section>
      <SectionHeader title={isOwner ? 'Team' : (activeTeam?.name ?? 'Team')}>
        {isOwner && <Button onClick={() => setInviteOpen(true)}>Invite member</Button>}
      </SectionHeader>
      {body}
      {isOwner && licensesError && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-body-sm text-negative">
            Couldn&apos;t load this team&apos;s licenses, so data access can&apos;t be
            changed right now.
          </p>
          <Button variant="secondary" onClick={() => void refetchLicenses()}>
            Load licenses again
          </Button>
        </div>
      )}
      <LeaveTeam />
      {isOwner && activeTeam && (
        <InviteMemberModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          teamId={activeTeam.id}
          onInvited={upsertMember}
        />
      )}
    </Section>
  );
};

export const TeamSection = withLoadingStatus(TeamSectionComponent);
