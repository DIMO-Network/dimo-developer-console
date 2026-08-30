import type { AttributeDef, AttributeValue } from '@/types/template';

export interface Normalisation {
  attribute: string;
  from: string;
  /** null means the attribute was removed. */
  to: AttributeValue | null;
  reason: string;
}

export type CoerceResult =
  | { kind: 'value'; value: AttributeValue; note?: Normalisation }
  | { kind: 'clear'; note: Normalisation }
  | { kind: 'error'; message: string };

/**
 * One text input becomes one typed attribute value, or a removal, or a named
 * refusal. Never silently: every difference between what was typed and what
 * gets stored produces a Normalisation, which NormalisationPanel shows before
 * save. Error messages are the worker's own strings (see
 * definitions-worker/src/template.ts checkAttributes) so the editor and the
 * validator never describe the same fault two different ways. `where` names the
 * place the way the worker does — 'template' or 'trim LE'.
 */
export function coerce(def: AttributeDef, raw: string, where = 'template'): CoerceResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return {
      kind: 'clear',
      note: {
        attribute: def.name,
        from: raw,
        to: null,
        reason: 'cleared — the attribute is removed, not stored empty',
      },
    };
  }

  switch (def.type) {
    case 'enum': {
      const options = def.options ?? [];
      if (!options.includes(trimmed)) {
        return {
          kind: 'error',
          message: `${where}: "${def.name}"=${JSON.stringify(trimmed)} is not one of ${JSON.stringify(options)}`,
        };
      }
      return { kind: 'value', value: trimmed };
    }
    case 'number':
    case 'integer': {
      const n = Number(trimmed);
      if (!Number.isFinite(n)) {
        return {
          kind: 'error',
          message: `${where}: "${def.name}" must be a number, got ${JSON.stringify(raw)}`,
        };
      }
      if (def.type === 'integer' && !Number.isInteger(n)) {
        return { kind: 'error', message: `${where}: "${def.name}" must be an integer` };
      }
      if (def.minimum !== undefined && n < def.minimum) {
        return {
          kind: 'error',
          message: `${where}: "${def.name}" below minimum ${def.minimum}`,
        };
      }
      if (def.maximum !== undefined && n > def.maximum) {
        return {
          kind: 'error',
          message: `${where}: "${def.name}" above maximum ${def.maximum}`,
        };
      }
      // 6% of the old catalog stored numbers as strings like "15.800000".
      // Reporting the reparse is how a contributor learns the value is typed.
      return String(n) === raw
        ? { kind: 'value', value: n }
        : {
            kind: 'value',
            value: n,
            note: {
              attribute: def.name,
              from: raw,
              to: n,
              reason: `stored as the number ${n}, not the text ${JSON.stringify(raw.trim())}`,
            },
          };
    }
    case 'boolean': {
      if (trimmed === 'true') return { kind: 'value', value: true };
      if (trimmed === 'false') return { kind: 'value', value: false };
      return { kind: 'error', message: `${where}: "${def.name}" must be a boolean` };
    }
    case 'string':
    default:
      return trimmed === raw
        ? { kind: 'value', value: trimmed }
        : {
            kind: 'value',
            value: trimmed,
            note: {
              attribute: def.name,
              from: raw,
              to: trimmed,
              reason: 'surrounding whitespace removed',
            },
          };
  }
}
