'use client';
import type { FC, PropsWithChildren } from 'react';
import { Loader } from '@/components/Loader';
import { useTeam } from '@/hooks/useTeam';

// Pages only the team owner may use (console-api answers members 403 OWNER_ONLY
// on their writes and nulls their secrets, contracts C7).
export const OwnerOnly: FC<PropsWithChildren<{ feature: string }>> = ({
  feature,
  children,
}) => {
  const { isLoading, isMember, activeTeam } = useTeam();
  if (isLoading) return <Loader isLoading={true} />;
  if (!isMember) return <>{children}</>;
  const lower = feature.toLowerCase();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
      <h2 className="text-card-title text-ink">
        {feature} are managed by the team owner
      </h2>
      <p className="max-w-xl text-body-sm text-muted">
        {activeTeam?.ownerEmail} manages {lower} for {activeTeam?.name}. Switch to your
        own team to manage {lower} for your licenses.
      </p>
    </div>
  );
};
