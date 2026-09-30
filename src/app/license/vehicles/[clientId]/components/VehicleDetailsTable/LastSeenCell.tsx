'use client';
import { FC } from 'react';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { lastSeenQuery } from '@/services/subjects/queries';
import { FreshnessDot } from '@/components/FreshnessDot';

// Lazy per row: one small telemetry call, cached a minute, so a page of ten
// vehicles costs ten exchanges at most and none on revisit.
export const LastSeenCell: FC<{ tokenId: number; asset: string; clientId: string }> = ({
  tokenId,
  asset,
  clientId,
}) => {
  const q = useSubjectQuery<{ signalsLatest: { lastSeen: string | null } | null }>({
    api: 'telemetry',
    asset,
    clientId,
    request: lastSeenQuery(tokenId),
  });
  if (q.isLoading) return <span className="text-muted">…</span>;
  if (q.error)
    return (
      <span className="whitespace-nowrap text-muted">
        {q.error.code === 'DEV_JWT_MISSING' ? 'Needs a developer JWT' : 'Unavailable'}
      </span>
    );
  return (
    <FreshnessDot
      at={q.data?.data?.signalsLatest?.lastSeen ?? null}
      className="whitespace-nowrap"
    />
  );
};
