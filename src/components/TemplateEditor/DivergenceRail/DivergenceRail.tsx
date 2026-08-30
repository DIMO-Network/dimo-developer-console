import React, { type FC } from 'react';
import type { GridRow } from '@/utils/templateGrid';

interface Props {
  row: GridRow;
  readOnly?: boolean;
  onLift: (name: string) => void;
}

/**
 * How many distinct values this attribute holds across the trims. At 1 with the
 * attribute still living on the trims, the correct modelling action under the
 * template-or-trim rule is to move it up — so that is what the rail offers,
 * rather than a generic edit affordance.
 */
export const DivergenceRail: FC<Props> = ({ row, readOnly, onLift }) => {
  if (row.scope === 'absent') return <span className="text-white/25">·</span>;
  if (row.scope === 'shared') return <span className="text-white/40">shared</span>;

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
