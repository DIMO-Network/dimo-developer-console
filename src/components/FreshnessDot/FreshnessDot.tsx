import React, { type FC } from 'react';
import classNames from 'classnames';
import { freshnessOf, relativeTime, absoluteTime } from '@/utils/freshness';

// The rail, KPI and table freshness idiom: the StatusChip's 6px dot without the
// chip, followed by the relative time. Live glows; stale is warning; older is
// negative; missing is muted.
const DOT = {
  live: 'bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]',
  stale: 'bg-warning',
  inactive: 'bg-negative',
  none: 'bg-muted',
} as const;

interface Props {
  at: string | null | undefined;
  now?: number;
  label?: boolean;
  className?: string;
}

export const FreshnessDot: FC<Props> = ({ at, now, label = true, className }) => {
  const freshness = freshnessOf(at, now);
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-2 text-body-sm text-fg',
        className,
      )}
      title={absoluteTime(at) || undefined}
    >
      <span
        data-testid="freshness-dot"
        data-freshness={freshness}
        aria-hidden="true"
        className={classNames(
          'inline-block size-1.5 flex-shrink-0 rounded-full',
          DOT[freshness],
        )}
      />
      {label && <span>{relativeTime(at, now)}</span>}
    </span>
  );
};

export default FreshnessDot;
