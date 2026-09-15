import React, { type FC } from 'react';
import type { GridRow } from '@/utils/templateGrid';

interface Props {
  row: GridRow;
  readOnly?: boolean;
  onLift: (name: string) => void;
  /** Absent while the row already renders per-trim cells: the move is done. */
  onSplit?: (name: string) => void;
}

/**
 * The rail is where scope is read and where scope is changed, in both
 * directions. How many distinct values this attribute holds across the trims:
 * at 1 with the attribute still living on the trims, the correct modelling
 * action under the template-or-trim rule is to move it up — so that is what the
 * rail offers, rather than a generic edit affordance. A row that is shared or
 * empty gets the opposite offer, because authoring a value one trim does not
 * share is the capability the trim model exists for, and the scope it needs is
 * not something a value typed into a spanning cell could ever express.
 */
export const DivergenceRail: FC<Props> = ({ row, readOnly, onLift, onSplit }) => {
  const split =
    onSplit && row.canSplit && !readOnly ? (
      <button
        type="button"
        onClick={() => onSplit(row.def.name)}
        className="rounded-full border border-cta-default px-2 py-0.5 text-xs text-white/70 hover:border-white hover:text-white"
      >
        Set per trim
      </button>
    ) : null;

  if (row.scope === 'absent') {
    return (
      <span className="flex items-center gap-2">
        <span className="text-white/25">·</span>
        {split}
      </span>
    );
  }
  if (row.scope === 'shared') {
    return (
      <span className="flex items-center gap-2">
        <span className="text-white/40">shared</span>
        {split}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span
        className={
          row.distinct > 1 ? 'tabular-nums text-white' : 'tabular-nums text-white/50'
        }
      >
        {row.distinct}
      </span>
      {row.canLift && !readOnly && (
        <button
          type="button"
          onClick={() => onLift(row.def.name)}
          className="rounded-full border border-cta-default px-2 py-0.5 text-xs text-white/70 hover:border-white hover:text-white"
        >
          Move to shared
        </button>
      )}
    </span>
  );
};
