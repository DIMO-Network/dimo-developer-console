import React, { type FC } from 'react';
import type { Trim } from '@/types/template';
import { hasEffectiveSelector } from '@/utils/templateGrid';

interface Props {
  trim: Trim;
  multiTrim: boolean;
}

/**
 * The model keys trims on manufacturerCode, so the code reads as an identifier
 * and gets mono. A trim without an effective selector on a multi-trim template
 * makes every decode for the model-year ambiguous; the worker refuses it, and
 * showing that here is the difference between a validation state and a
 * discovery at save.
 */
export const TrimHeader: FC<Props> = ({ trim, multiTrim }) => {
  const code = trim.selectors?.manufacturerCode?.find((c) => c.trim().length > 0);
  const style = trim.selectors?.styleName?.find((s) => s.trim().length > 0);
  const missing = multiTrim && !hasEffectiveSelector(trim.selectors);

  return (
    <div className="flex min-w-[9rem] flex-col gap-0.5 px-3 py-2 text-left">
      <span className="text-white">{trim.name}</span>
      {missing ? (
        <span className="font-mono text-xs text-red-400">no selector</span>
      ) : (
        <span className="font-mono text-xs text-white/50">
          {code ?? style ?? trim.selectors?.vinPattern}
        </span>
      )}
    </div>
  );
};
