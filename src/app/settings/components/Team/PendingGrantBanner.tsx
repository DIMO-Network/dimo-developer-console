'use client';
import type { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { grantCandidates } from './memberKeys';
import { displayName } from './MembersTable';

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  licensesLoading: boolean;
  onGrant: (member: TeamMember) => void;
}

// Accepted members whose verified wallet is missing from a license they can be
// granted. Waits for the licenses: before they load every member looks keyless.
export const PendingGrantBanner: FC<Props> = ({
  members,
  licenses,
  licensesLoading,
  onGrant,
}) => {
  const t = useTranslations('settings');
  if (licensesLoading) return null;
  const waiting = members.filter((m) => grantCandidates(m, licenses).length > 0);
  if (!waiting.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {waiting.map((member) => (
        <div
          key={member.id}
          role="status"
          className="flex flex-col gap-2 rounded-control bg-control p-3 md:flex-row md:items-center md:justify-between"
        >
          <p className="text-body-sm text-fg">
            {t('grantBanner.message', { name: displayName(member) })}
          </p>
          <Button variant="secondary" onClick={() => onGrant(member)}>
            {t('grantBanner.grant')}
          </Button>
        </div>
      ))}
    </div>
  );
};
