import React, { type FC } from 'react';
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
    <section className="rounded-xl border border-cta-default bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-white">What the editor changed that you did not type</h2>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-white/50 hover:text-white"
        >
          Dismiss
        </button>
      </div>
      <ul className="flex flex-col gap-1 pt-2">
        {notes.map((n, i) => (
          <li key={`${n.attribute}-${i}`} className="text-white/70">
            <span className="font-mono text-white/50">{n.attribute}</span>
            <span className="px-2 text-white/25">·</span>
            {n.reason}
          </li>
        ))}
      </ul>
    </section>
  );
};
