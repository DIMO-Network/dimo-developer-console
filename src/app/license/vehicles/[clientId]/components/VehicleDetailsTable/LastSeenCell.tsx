'use client';
import { FC } from 'react';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { lastSeenQuery } from '@/services/subjects/queries';
import { FreshnessDot } from '@/components/FreshnessDot';

// Lazy per row: one small Fetch call (no DCX credits), cached a minute, so a
// page of ten vehicles costs ten exchanges at most and none on revisit.
export const LastSeenCell: FC<{ asset: string; clientId: string }> = ({
  asset,
  clientId,
}) => {
  const q = useSubjectQuery<{ latestIndex: { header: { time: string } } | null }>({
    api: 'fetch',
    asset,
    clientId,
    request: lastSeenQuery(asset),
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
      at={q.data?.data?.latestIndex?.header.time ?? null}
      className="whitespace-nowrap"
    />
  );
};
