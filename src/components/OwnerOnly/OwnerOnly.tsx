'use client';
import type { FC, PropsWithChildren } from 'react';
import { useTranslations } from 'next-intl';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';

export type OwnerOnlyFeature = 'webhooks' | 'connections' | 'configurations';

// Pages only the team owner may use (console-api answers members 403 OWNER_ONLY
// on their writes and nulls their secrets, contracts C7).
export const OwnerOnly: FC<PropsWithChildren<{ feature: OwnerOnlyFeature }>> = ({
  feature,
  children,
}) => {
  const t = useTranslations('common');
  const { isLoading, isMember, activeTeam } = useTeam();
  if (isLoading) return <Loader isLoading={true} />;
  if (!isMember) return <>{children}</>;
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
      <h2 className="text-card-title text-ink">{t(`ownerOnly.${feature}.title`)}</h2>
      <p className="max-w-xl text-body-sm text-muted">
        {t(`ownerOnly.${feature}.body`, {
          ownerEmail: activeTeam?.ownerEmail ?? '',
          team: activeTeam?.name ?? '',
        })}
      </p>
    </div>
  );
};
