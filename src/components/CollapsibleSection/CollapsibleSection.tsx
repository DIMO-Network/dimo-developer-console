'use client';
import React, { FC, PropsWithChildren, ReactNode, useState } from 'react';
import classNames from 'classnames';
import { ChevronRightIcon } from '@heroicons/react/16/solid';

interface Props {
  title: string;
  count?: number | string;
  meta?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

// A section card whose header toggles the body. The chevron and title are the
// button; count is a neutral chip; meta sits beside it; actions stay outside
// the toggle so a click on them never collapses the panel.
export const CollapsibleSection: FC<PropsWithChildren<Props>> = ({
  title,
  count,
  meta,
  actions,
  defaultOpen = false,
  className,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={classNames('flex flex-col rounded-card bg-card', className)}>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-wrap items-center gap-x-2.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-control"
        >
          <ChevronRightIcon
            className={classNames(
              'size-4 flex-shrink-0 text-muted transition-transform',
              open && 'rotate-90',
            )}
          />
          <span className="text-card-title text-ink">{title}</span>
          {count !== undefined && (
            <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
              {count}
            </span>
          )}
          {meta && (
            <span className="w-full pl-[26px] text-body-sm text-muted md:w-auto md:pl-0">
              {meta}
            </span>
          )}
        </button>
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {open && <div className="flex flex-col">{children}</div>}
    </div>
  );
};
