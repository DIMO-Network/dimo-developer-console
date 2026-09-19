export type {
  Template,
  TemplateManufacturer,
  Trim,
  TrimSelectors,
  AttributeMap,
} from './generated/template';
import type { Template } from './generated/template';

export type AttributeValue = string | number | boolean;

// The vehicle vocabulary (device-type-vehicle.json) has no schema of its own,
// so these two are hand-written. They mirror definitions-worker/src/template.ts.
export interface AttributeDef {
  name: string;
  label: string;
  description?: string;
  type: 'enum' | 'string' | 'number' | 'integer' | 'boolean';
  unit?: string;
  options?: string[];
  minimum?: number;
  maximum?: number;
  variesByTrim?: boolean;
}

export interface DeviceType {
  id: string;
  name: string;
  attributes: AttributeDef[];
}

// What Console is allowed to send. version, createdAt and updatedAt are
// server-owned and the worker rejects them outright; author is stamped from
// the session in src/app/api/templates/[id]/route.ts and is never client input.
export type TemplatePayload = Omit<
  Template,
  'version' | 'createdAt' | 'updatedAt' | 'author'
>;
