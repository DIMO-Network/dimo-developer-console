import React, { type FC } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { Normalisation } from '@/utils/templateCoerce';

interface Props {
  notes: Normalisation[];
  onDismiss: () => void;
}

/**
 * Everything the editor stored that is not literally what was typed. A value
 * that changes without a report is the failure mode this project keeps
 * producing; this is where it is refused. Absent when there is nothing to say.
 */
export const NormalisationPanel: FC<Props> = ({ notes, onDismiss }) => {
  if (notes.length === 0) return null;
  return (
    <section className="flex items-start gap-3 rounded-card bg-card p-4">
      <InformationCircleIcon className="mt-0.5 size-4 flex-shrink-0 text-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-body-sm font-medium text-ink">
            What the editor changed that you did not type
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            className="text-label text-muted hover:text-fg"
          >
            Dismiss
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {notes.map((n, i) => (
            <li key={`${n.attribute}-${i}`} className="text-body-sm text-fg">
              <span className="font-mono text-code text-muted">{n.attribute}</span>
              <span className="px-2 text-muted">·</span>
              {n.reason}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
