'use client';
import { type FC, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
import { GrantAccessModal } from './GrantAccessModal';
import { PendingGrantBanner } from './PendingGrantBanner';
import { RevokeAccessModal } from './RevokeAccessModal';
import { RemoveMemberModal } from './RemoveMemberModal';
import type { TeamMember } from '@/types/team';
import { IDENTITY_INDEX_DELAY_MS } from '@/utils/identityOverlay';
import {
  applySignerOverlay,
  type RecordedToggle,
  type SignerToggle,
} from './signerOverlay';

const TeamSectionComponent: FC = () => {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { activeTeam, isOwner, isLoading: teamLoading } = useTeam();
  const { members, isLoading, isError, refetch, upsertMember } = useTeamMembers();
  const {
    licenses: indexedLicenses,
    loading: licensesLoading,
    error: licensesError,
    refetch: refetchLicenses,
  } = useTeamLicenses();
  const { trackEvent } = useMixPanel();
  // Signer changes made here, shown over Identity's lists until it catches up.
  const [toggles, setToggles] = useState<RecordedToggle[]>([]);
  const licenses = useMemo(
    () => applySignerOverlay(indexedLicenses, toggles, Date.now()),
    [indexedLicenses, toggles],
  );
  const reloadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reloadTimer.current), []);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [grantFor, setGrantFor] = useState<TeamMember | null>(null);
  const [revokeFor, setRevokeFor] = useState<TeamMember | null>(null);
  const [removeFor, setRemoveFor] = useState<TeamMember | null>(null);
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
        toast.success(t('team.resent', { email: member.email }));
      } else {
        toast.error(
          result ? inviteSendError(result, member.email, t) : t('team.resendFailed'),
        );
      }
    },
    cancel: async (member) => {
      const result = await cancelTeamInvite(member.id).catch(() => null);
      if (result?.ok) {
        toast.success(t('team.cancelled', { email: member.email }));
        void refetch();
      } else {
        toast.error(result?.message ?? t('team.cancelFailed'));
      }
    },
    ...(showDataAccess && licensesReady ? { grant: setGrantFor } : {}),
    ...(licensesReady ? { revoke: setRevokeFor, remove: setRemoveFor } : {}),
  };

  // After any signer change: the table reads both, the members now and the
  // licenses once Identity has indexed the change.
  const afterSignerChange = (changed: SignerToggle[] = []) => {
    if (changed.length) {
      const at = Date.now();
      setToggles((prev) => [...prev, ...changed.map((t) => ({ ...t, at }))]);
    }
    void refetch();
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(
      () => void refetchLicenses(),
      IDENTITY_INDEX_DELAY_MS,
    );
  };

  let body: ReactNode;
  if (teamLoading || isLoading) {
    body = <Loader isLoading />;
  } else if (isError) {
    body = (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="text-body-sm text-negative">
          {t('team.loadError')}
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          {tCommon('actions.retry')}
        </Button>
      </div>
    );
  } else if (isOwner && members.every((m) => m.role === 'OWNER')) {
    body = <p className="text-body-sm text-muted">{t('team.ownerEmpty')}</p>;
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
      <SectionHeader
        title={isOwner ? t('team.title') : (activeTeam?.name ?? t('team.title'))}
      >
        {isOwner && (
          <Button onClick={() => setInviteOpen(true)}>{t('team.inviteMember')}</Button>
        )}
      </SectionHeader>
      {showDataAccess && !isLoading && !isError && (
        <PendingGrantBanner
          members={members}
          licenses={licenses}
          licensesLoading={!licensesReady}
          onGrant={setGrantFor}
        />
      )}
      {body}
      {isOwner && licensesError && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="text-body-sm text-negative">
            {t('team.licensesLoadError')}
          </p>
          <Button variant="secondary" onClick={() => void refetchLicenses()}>
            {t('team.loadLicensesAgain')}
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
      {grantFor && (
        <GrantAccessModal
          member={grantFor}
          licenses={licenses}
          onClose={() => setGrantFor(null)}
          onGranted={afterSignerChange}
        />
      )}
      {revokeFor && (
        <RevokeAccessModal
          member={revokeFor}
          licenses={licenses}
          onClose={() => setRevokeFor(null)}
          onDone={afterSignerChange}
        />
      )}
      {removeFor && activeTeam && (
        <RemoveMemberModal
          member={removeFor}
          licenses={licenses}
          teamName={activeTeam.name}
          onClose={() => setRemoveFor(null)}
          onDone={afterSignerChange}
        />
      )}
    </Section>
  );
};

export const TeamSection = withLoadingStatus(TeamSectionComponent);
