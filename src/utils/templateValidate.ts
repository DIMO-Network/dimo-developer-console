import type {
  AttributeDef,
  AttributeValue,
  DeviceType,
  Template,
} from '@/types/template';
import { hasEffectiveSelector } from '@/utils/templateGrid';

const ID_RE = /^[a-z0-9][a-z0-9._&+-]*_[a-z0-9._&+-]+_[0-9]{4}$/;

/**
 * A mirror of definitions-worker/src/template.ts validateTemplate, restricted to
 * the faults a person editing in Console can actually cause. It is NOT
 * authoritative — the worker is, and the save path surfaces its 422 verbatim.
 * Its job is to stop a doomed save and to name the fault in the same words the
 * worker would, so nobody has to reconcile two vocabularies for one problem.
 *
 * When the worker's strings change, this file is the drift point. The strings
 * below are copied verbatim from definitions-worker/src/template.ts; the tests
 * in __tests__/templateValidate.test.ts are what catch the drift.
 */
export function validateDraft(template: Template, vocab: DeviceType): string[] {
  const errs: string[] = [];
  const vmap = new Map<string, AttributeDef>(vocab.attributes.map((a) => [a.name, a]));

  if (!ID_RE.test(template.id)) errs.push('id must be <make>_<model>_<year>');
  if (!template.model) errs.push('model is required');
  if (ID_RE.test(template.id)) {
    const idYear = Number(template.id.split('_').at(-1));
    if (idYear !== template.year) {
      errs.push(`year ${template.year} does not match the year in id "${template.id}"`);
    }
  }
  if (!template.manufacturer?.slug || !template.manufacturer?.name) {
    errs.push('manufacturer requires slug and name');
  }
  if (
    template.hardwareTemplateId !== undefined &&
    !/^[0-9]+$/.test(template.hardwareTemplateId)
  ) {
    errs.push('hardwareTemplateId must be a numeric string');
  }

  const templateAttrs = template.attributes ?? {};
  checkAttributes(templateAttrs, vmap, 'template', errs);

  if (!Array.isArray(template.trims) || template.trims.length === 0) {
    errs.push('trims must contain at least one trim');
    return errs;
  }

  const multiTrim = template.trims.length > 1;
  const seenNames = new Set<string>();
  const seenCodes = new Map<string, string>();

  for (const trim of template.trims) {
    const name = trim.name || '';
    if (!name) errs.push('each trim needs a name');
    if (name) {
      if (seenNames.has(name))
        errs.push(`duplicate trim name "${name}" — trim names must be unique`);
      else seenNames.add(name);
    }

    const trimAttrs = trim.attributes ?? {};
    checkAttributes(trimAttrs, vmap, `trim ${name || '?'}`, errs);
    for (const k of Object.keys(trimAttrs)) {
      if (k in templateAttrs) {
        errs.push(`"${k}" is on both the template and trim ${name} — pick one`);
      }
    }

    for (const code of trim.selectors?.manufacturerCode ?? []) {
      const prev = seenCodes.get(code);
      if (prev !== undefined) {
        errs.push(`manufacturerCode ${code} is claimed by both "${prev}" and "${name}"`);
      } else seenCodes.set(code, name);
    }

    if (multiTrim && !hasEffectiveSelector(trim.selectors)) {
      errs.push(
        `trim ${name || '?'}: selectors are required — a template with more than one trim cannot ` +
          'have a selector-less trim, which would match every signal and make every decode ambiguous',
      );
    }
  }

  return errs;
}

function checkAttributes(
  map: Record<string, AttributeValue>,
  vmap: Map<string, AttributeDef>,
  where: string,
  errs: string[],
): void {
  for (const [k, v] of Object.entries(map)) {
    const def = vmap.get(k);
    if (!def) {
      errs.push(`${where}: unknown attribute "${k}"`);
      continue;
    }
    if (v === null || v === undefined || v === '' || v === '<nil>') {
      errs.push(`${where}: "${k}" is empty — omit the attribute instead`);
      continue;
    }
    switch (def.type) {
      case 'enum':
        if (typeof v !== 'string' || !(def.options ?? []).includes(v)) {
          errs.push(
            `${where}: "${k}"=${JSON.stringify(v)} is not one of ${JSON.stringify(def.options ?? [])}`,
          );
        }
        break;
      case 'number':
      case 'integer':
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          errs.push(`${where}: "${k}" must be a number, got ${JSON.stringify(v)}`);
        } else if (def.type === 'integer' && !Number.isInteger(v)) {
          errs.push(`${where}: "${k}" must be an integer`);
        } else if (def.minimum !== undefined && v < def.minimum) {
          errs.push(`${where}: "${k}" below minimum ${def.minimum}`);
        } else if (def.maximum !== undefined && v > def.maximum) {
          errs.push(`${where}: "${k}" above maximum ${def.maximum}`);
        }
        break;
      case 'boolean':
        if (typeof v !== 'boolean') errs.push(`${where}: "${k}" must be a boolean`);
        break;
      case 'string':
        if (typeof v !== 'string') errs.push(`${where}: "${k}" must be a string`);
        break;
    }
  }
}
