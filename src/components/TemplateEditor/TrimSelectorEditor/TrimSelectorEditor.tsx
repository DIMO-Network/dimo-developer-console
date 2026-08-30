import React, { type FC } from 'react';
import type { Template, TrimSelectors } from '@/types/template';
import {
  hasEffectiveSelector,
  removeTrim,
  renameTrim,
  setSelectors,
} from '@/utils/templateGrid';

interface Props {
  template: Template;
  trimIndex: number;
  readOnly?: boolean;
  onChange: (next: Template) => void;
}

const toList = (raw: string) =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
const fromList = (values?: string[]) => (values ?? []).join(', ');

export const TrimSelectorEditor: FC<Props> = ({
  template,
  trimIndex,
  readOnly,
  onChange,
}) => {
  const trim = template.trims[trimIndex];
  const multiTrim = template.trims.length > 1;
  const missing = multiTrim && !hasEffectiveSelector(trim.selectors);

  const update = (patch: Partial<TrimSelectors>) =>
    onChange(setSelectors(template, trimIndex, { ...trim.selectors, ...patch }));

  const field = (
    label: string,
    value: string,
    onValue: (raw: string) => void,
    placeholder: string,
  ) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      <input
        aria-label={label}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onValue(e.target.value)}
        className="h-10 rounded-md bg-dark-grey-950 px-3 text-white placeholder:text-white/25"
      />
    </label>
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-cta-default bg-surface-default p-4">
      <div className="flex items-center justify-between gap-4">
        <input
          aria-label="Trim name"
          value={trim.name}
          readOnly={readOnly}
          onChange={(e) => onChange(renameTrim(template, trimIndex, e.target.value))}
          className="h-10 flex-1 rounded-md bg-dark-grey-950 px-3 text-white"
        />
        {!readOnly && multiTrim && (
          <button
            type="button"
            onClick={() => onChange(removeTrim(template, trimIndex))}
            className="rounded-full border border-cta-default px-3 py-1 text-xs text-white/70 hover:border-white hover:text-white"
          >
            Remove trim
          </button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {field(
          'Manufacturer code',
          fromList(trim.selectors?.manufacturerCode),
          (raw) => update({ manufacturerCode: toList(raw) }),
          '2532, 2546',
        )}
        {field(
          'Style name',
          fromList(trim.selectors?.styleName),
          (raw) => update({ styleName: toList(raw) }),
          'Hybrid LE',
        )}
        {field(
          'VIN pattern',
          trim.selectors?.vinPattern ?? '',
          (raw) => update({ vinPattern: raw }),
          '^4T1B11HK.*$',
        )}
      </div>

      {missing && (
        <p role="alert" className="text-red-400">
          A template with more than one trim cannot have a selector-less trim: it would
          match every signal and make every decode for this model-year ambiguous. Give
          this trim a manufacturer code, a style name or a VIN pattern.
        </p>
      )}
    </section>
  );
};
