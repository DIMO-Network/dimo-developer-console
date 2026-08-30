import type {
  AttributeDef,
  AttributeValue,
  DeviceType,
  Template,
  TemplatePayload,
  Trim,
  TrimSelectors,
} from '@/types/template';

export type Scope = 'shared' | 'trim' | 'absent';

export interface GridRow {
  def: AttributeDef;
  scope: Scope;
  shared?: AttributeValue;
  /** One entry per trim, in trim order. `undefined` means not set — never ''. */
  cells: (AttributeValue | undefined)[];
  /** Distinct values across trims. 1 on a shared row: that is the point of shared. */
  distinct: number;
  absentCount: number;
  canLift: boolean;
}

export interface Grid {
  trims: Trim[];
  rows: GridRow[];
}

const attrs = (map: Record<string, AttributeValue> | undefined) => map ?? {};

/**
 * Rows follow vocabulary order, always. Sorting divergent rows to the top would
 * move an attribute every time someone edited it; the design puts the emphasis
 * on contrast instead, so positions stay learnable. Every vocabulary attribute
 * gets a row even when nothing sets it — 5,152 templates in the current emitted
 * set carry no attributes at all, so "empty" is the common case and an empty
 * row is the affordance for filling it in.
 */
export function buildGrid(template: Template, vocab: DeviceType): Grid {
  const rows = vocab.attributes.map<GridRow>((def) => {
    const shared = attrs(template.attributes)[def.name];
    const cells = template.trims.map((t) => attrs(t.attributes)[def.name]);
    const present = cells.filter((v): v is AttributeValue => v !== undefined);
    const distinct = new Set(present.map((v) => JSON.stringify(v))).size;
    const scope: Scope =
      shared !== undefined ? 'shared' : present.length > 0 ? 'trim' : 'absent';
    return {
      def,
      scope,
      ...(shared !== undefined ? { shared } : {}),
      cells,
      distinct: scope === 'shared' ? 1 : distinct,
      absentCount: scope === 'shared' ? 0 : cells.length - present.length,
      // Lifting a single-trim template's attribute changes nothing, so the
      // offer would be pure noise. Only worth surfacing where agreement is a
      // fact about several trims.
      canLift:
        scope === 'trim' &&
        distinct === 1 &&
        present.length === cells.length &&
        cells.length > 1,
    };
  });
  return { trims: template.trims, rows };
}

const withoutKey = (map: Record<string, AttributeValue>, key: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [key]: _dropped, ...rest } = map;
  return rest;
};

const mapTrims = (t: Template, fn: (trim: Trim, index: number) => Trim): Template => ({
  ...t,
  trims: t.trims.map(fn),
});

/** Shared value wins outright: the attribute cannot also live on a trim. */
export function setShared(t: Template, name: string, value: AttributeValue): Template {
  const next = mapTrims(t, (trim) => ({
    ...trim,
    attributes: withoutKey(attrs(trim.attributes), name),
  }));
  return { ...next, attributes: { ...attrs(t.attributes), [name]: value } };
}

export function clearShared(t: Template, name: string): Template {
  return { ...t, attributes: withoutKey(attrs(t.attributes), name) };
}

/**
 * The move that makes divergence expressible. If the attribute is currently
 * shared, it is pushed down onto every trim first — otherwise the result would
 * carry the attribute in both places, which the worker rejects with
 * `"<k>" is on both the template and trim <name> — pick one`.
 */
export function setTrimValue(
  t: Template,
  index: number,
  name: string,
  value: AttributeValue,
): Template {
  const base = attrs(t.attributes)[name] !== undefined ? pushDownToTrims(t, name) : t;
  return mapTrims(base, (trim, i) =>
    i === index
      ? { ...trim, attributes: { ...attrs(trim.attributes), [name]: value } }
      : trim,
  );
}

/** Removes the key. There is no empty value to store. */
export function clearTrimValue(t: Template, index: number, name: string): Template {
  return mapTrims(t, (trim, i) =>
    i === index
      ? { ...trim, attributes: withoutKey(attrs(trim.attributes), name) }
      : trim,
  );
}

export function pushDownToTrims(t: Template, name: string): Template {
  const value = attrs(t.attributes)[name];
  if (value === undefined) return t;
  const next = mapTrims(t, (trim) => ({
    ...trim,
    attributes: { ...attrs(trim.attributes), [name]: value },
  }));
  return { ...next, attributes: withoutKey(attrs(t.attributes), name) };
}

/** The correct modelling action when the divergence rail reads 1. */
export function liftToShared(t: Template, name: string): Template {
  const values = t.trims.map((trim) => attrs(trim.attributes)[name]);
  if (values.some((v) => v === undefined)) return t;
  if (new Set(values.map((v) => JSON.stringify(v))).size !== 1) return t;
  const next = mapTrims(t, (trim) => ({
    ...trim,
    attributes: withoutKey(attrs(trim.attributes), name),
  }));
  return {
    ...next,
    attributes: { ...attrs(t.attributes), [name]: values[0] as AttributeValue },
  };
}

export function addTrim(t: Template, name: string): Template {
  return { ...t, trims: [...t.trims, { name, attributes: {} }] };
}

/** The schema requires minItems 1: a model-year sold one way still has a trim. */
export function removeTrim(t: Template, index: number): Template {
  if (t.trims.length <= 1) return t;
  return { ...t, trims: t.trims.filter((_, i) => i !== index) };
}

export function renameTrim(t: Template, index: number, name: string): Template {
  return mapTrims(t, (trim, i) => (i === index ? { ...trim, name } : trim));
}

export function setSelectors(
  t: Template,
  index: number,
  selectors: TrimSelectors,
): Template {
  return mapTrims(t, (trim, i) => (i === index ? { ...trim, selectors } : trim));
}

export function setHardwareTemplateId(t: Template, value: string | undefined): Template {
  if (value === undefined || value === '') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hardwareTemplateId: _dropped, ...rest } = t;
    return rest as Template;
  }
  return { ...t, hardwareTemplateId: value };
}

/**
 * Mirrors definitions-worker/src/template.ts hasSelector, degenerate cases
 * included. A trim that fails this on a multi-trim template matches every
 * signal and makes every decode for the model-year ambiguous.
 */
export function hasEffectiveSelector(selectors?: TrimSelectors): boolean {
  if (!selectors) return false;
  if (selectors.manufacturerCode?.some((c) => c.trim().length > 0)) return true;
  if (selectors.styleName?.some((n) => n.trim().length > 0)) return true;
  return (
    typeof selectors.vinPattern === 'string' && selectors.vinPattern.trim().length > 0
  );
}

const pruneSelectors = (selectors?: TrimSelectors): TrimSelectors | undefined => {
  if (!selectors) return undefined;
  const out: TrimSelectors = {};
  const codes =
    selectors.manufacturerCode?.map((c) => c.trim()).filter((c) => c.length > 0) ?? [];
  const names =
    selectors.styleName?.map((n) => n.trim()).filter((n) => n.length > 0) ?? [];
  if (codes.length > 0) out.manufacturerCode = codes;
  if (names.length > 0) out.styleName = names;
  if (selectors.vinPattern && selectors.vinPattern.trim().length > 0) {
    out.vinPattern = selectors.vinPattern.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/**
 * What goes on the wire. version, createdAt and updatedAt are server-owned and
 * the worker rejects them as unexpected top-level keys; author is stamped from
 * the session server-side. Empty selector containers are dropped rather than
 * sent — but dropping them does not make a selector-less trim legal, and
 * templateValidate.ts is what says so before save.
 */
export function toPayload(t: Template): TemplatePayload {
  // An omit list, not an allow list: a field added to the schema later should
  // reach the worker, not be silently dropped here.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version: _v, createdAt: _c, updatedAt: _u, author: _a, ...rest } = t;
  return {
    ...rest,
    attributes: attrs(t.attributes),
    trims: t.trims.map((trim) => {
      const selectors = pruneSelectors(trim.selectors);
      return {
        name: trim.name,
        ...(selectors ? { selectors } : {}),
        ...(trim.hardwareTemplateId
          ? { hardwareTemplateId: trim.hardwareTemplateId }
          : {}),
        attributes: attrs(trim.attributes),
      };
    }),
  };
}
