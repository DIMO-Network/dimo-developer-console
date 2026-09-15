import React, { useState, type FC } from 'react';
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

interface FieldProps {
  label: string;
  /** The committed value, rendered whenever the user is not mid-edit. */
  stored: string;
  readOnly?: boolean;
  placeholder: string;
  onCommit: (raw: string) => void;
}

/**
 * Text while it is being typed, a selector once it is finished. The field used
 * to be controlled by the joined list and re-parsed on every keystroke, so a
 * typed comma was deleted the instant it appeared and a second value could
 * never be entered at all — the placeholder here names "2532, 2546", which that
 * control could not produce. Clearing the field to work around it stored an
 * empty selector list on the way, tripping the selector-less trim error.
 *
 * So the raw text is held here and parsed on commit, matching TemplateCell,
 * which types freely and commits on blur for the same reason. `draft === null`
 * means untouched: a stored styleName that contains a comma is left exactly as
 * it is rather than being split into two selectors by a focus and a blur,
 * because that would change which VINs the trim claims.
 */
const SelectorField: FC<FieldProps> = ({
  label,
  stored,
  readOnly,
  placeholder,
  onCommit,
}) => {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      <input
        aria-label={label}
        value={draft ?? stored}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft === null) return;
          onCommit(draft);
          setDraft(null);
        }}
        className="h-10 rounded-md bg-dark-grey-950 px-3 text-white placeholder:text-white/25"
      />
    </label>
  );
};

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
        <SelectorField
          label="Manufacturer code"
          stored={fromList(trim.selectors?.manufacturerCode)}
          readOnly={readOnly}
          placeholder="2532, 2546"
          onCommit={(raw) => update({ manufacturerCode: toList(raw) })}
        />
        <SelectorField
          label="Style name"
          stored={fromList(trim.selectors?.styleName)}
          readOnly={readOnly}
          placeholder="Hybrid LE"
          onCommit={(raw) => update({ styleName: toList(raw) })}
        />
        <SelectorField
          label="VIN pattern"
          stored={trim.selectors?.vinPattern ?? ''}
          readOnly={readOnly}
          placeholder="^4T1B11HK.*$"
          onCommit={(raw) => update({ vinPattern: raw })}
        />
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
