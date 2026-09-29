import React, { type FC, type ReactNode } from 'react';
import classNames from 'classnames';

/**
 * The one status idiom: a 6px dot in a neutral chip. The dot carries the
 * meaning, the label stays text-fg so it reads on any surface.
 * live = accent with a soft glow (something running right now); on = accent;
 * pending = warning (waiting on someone); off = muted; error = negative.
 */
export type StatusTone = 'live' | 'on' | 'pending' | 'off' | 'error';

const DOT: Record<StatusTone, string> = {
  live: 'bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]',
  on: 'bg-accent',
  pending: 'bg-warning',
  off: 'bg-muted',
  error: 'bg-negative',
};

interface Props {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}

export const StatusChip: FC<Props> = ({ tone, children, className }) => (
  <span
    className={classNames(
      'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-chip bg-control px-2 py-0.5 text-label text-fg',
      className,
    )}
  >
    <span
      aria-hidden="true"
      className={classNames(
        'inline-block size-1.5 flex-shrink-0 rounded-full',
        DOT[tone],
      )}
    />
    {children}
  </span>
);

export default StatusChip;
