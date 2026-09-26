import React, { useState, type FC } from 'react';
import classnames from 'classnames';
import type { AttributeDef, AttributeValue } from '@/types/template';
import { coerce, type Normalisation } from '@/utils/templateCoerce';

interface Props {
  def: AttributeDef;
  value: AttributeValue | undefined;
  where: string;
  emphasised: boolean;
  readOnly?: boolean;
  testId: string;
  onSet: (value: AttributeValue) => void;
  onClear: () => void;
  onNormalise: (note: Normalisation) => void;
}

const NOT_SET = '—';

// The input pattern at grid density: bordered control with a focus ring, like
// TextField, but 32px tall instead of 40px so a dense multi-trim grid stays
// scannable.
const CELL_FIELD =
  'h-8 w-full rounded-control border border-outline bg-control px-2 text-body-sm outline-0 placeholder:text-muted focus:border-accent focus:ring-[3px] focus:ring-accent-soft';

export const TemplateCell: FC<Props> = ({
  def,
  value,
  where,
  emphasised,
  readOnly,
  testId,
  onSet,
  onClear,
  onNormalise,
}) => {
  const [draft, setDraft] = useState<string>(value === undefined ? '' : String(value));
  const [error, setError] = useState<string | null>(null);

  // Agreement recedes, difference advances. There is no light font weight in
  // this design system, so emphasis rides entirely on opacity.
  const tone =
    value === undefined ? 'text-muted/60' : emphasised ? 'text-ink' : 'text-muted';

  const commit = (raw: string) => {
    const result = coerce(def, raw, where);
    if (result.kind === 'error') {
      setError(result.message);
      return;
    }
    setError(null);
    if (result.note) onNormalise(result.note);
    if (result.kind === 'clear') {
      setDraft('');
      onClear();
      return;
    }
    setDraft(String(result.value));
    onSet(result.value);
  };

  if (readOnly) {
    return (
      <div data-testid={testId} className={classnames('px-3 py-2 text-body-sm', tone)}>
        {value === undefined ? NOT_SET : String(value)}
      </div>
    );
  }

  return (
    <div data-testid={testId} className={classnames('px-2 py-1.5', tone)}>
      {def.type === 'enum' || def.type === 'boolean' ? (
        <select
          aria-label={`${where} ${def.label}`}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          className={classnames(CELL_FIELD, tone)}
        >
          <option value="">{NOT_SET}</option>
          {(def.type === 'boolean' ? ['true', 'false'] : (def.options ?? [])).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          inputMode={def.type === 'string' ? 'text' : 'decimal'}
          aria-label={`${where} ${def.label}`}
          placeholder={NOT_SET}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          className={classnames(CELL_FIELD, tone)}
        />
      )}
      {error && <p className="pt-1 text-label text-negative">{error}</p>}
    </div>
  );
};
