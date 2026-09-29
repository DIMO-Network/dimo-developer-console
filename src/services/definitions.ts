import config from '@/config';
import type { DeviceType, Template, TemplatePayload } from '@/types/template';

// definitions-worker/src/index.ts MAX_DOC_BYTES. Checked here so an oversized
// draft is reported in the editor rather than as an opaque 413 after a
// round trip.
const MAX_DOC_BYTES = 64 * 1024;

// Gate 1: WRITE_TOKEN must never reach a browser bundle. A convention is not
// a guarantee; this is. Any client component that imports this module fails
// loudly in development instead of shipping the token.
function assertServer(): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      'services/definitions is server-only — it holds DEFINITIONS_WRITE_TOKEN',
    );
  }
}

export type Precondition = { kind: 'create' } | { kind: 'update'; version: number };

export type PublishResult =
  | { ok: true; template: Template }
  | { ok: false; kind: 'validation'; errors: string[] }
  | { ok: false; kind: 'conflict'; expected: number | null; actual: number }
  | { ok: false; kind: 'too-large'; bytes: number; limit: number }
  | { ok: false; kind: 'upstream'; status: number; message: string };

// The query parameter that makes a read miss the Cloudflare edge cache.
// definitions-worker routes on url.pathname alone (its templateMatch regex), so
// it never reads this and the request reaches exactly the same handler a cached
// read would; Cloudflare's cache key is the whole URL, so a value it has not
// seen cannot be served from cache.
//
// A request header cannot do this job. `cache: 'no-store'` bypasses Next's own
// Data Cache and nothing else, and Cloudflare does not honour a client's
// Cache-Control on a cached response -- dd-api established both against this
// exact host (fetchTemplateDocFresh) before settling on the same parameter.
const FRESH_PARAM = 'fresh';

// Disambiguates two fresh reads minted inside one clock tick. The value only
// has to be unique, never unguessable.
let freshSeq = 0;
const freshValue = () => `${Date.now().toString(36)}-${(freshSeq++).toString(36)}`;

export interface FetchTemplateOptions {
  /**
   * Whether the Cloudflare edge may answer this read. Defaults to false, so a
   * caller has to say out loud that a day-old document is acceptable.
   *
   * It is acceptable for a browse or search listing, which renders a version
   * and a trim count and writes nothing back. It is never acceptable for a read
   * that feeds a write or a precondition decision: the worker serves templates
   * `public, max-age=86400, stale-while-revalidate=604800`, so a cached read
   * hands the editor a stale `version`, the next Publish sends it as If-Match,
   * and the worker answers 412 -- rendered as "this template changed while you
   * were editing it" on a template nobody else touched.
   */
  allowEdgeCache?: boolean;
}

export async function fetchTemplate(
  id: string,
  { allowEdgeCache = false }: FetchTemplateOptions = {},
): Promise<Template | null> {
  assertServer();
  const url = `${config.definitionsWorkerUrl}/t/${encodeURIComponent(id)}`;
  const resp = await fetch(
    allowEdgeCache ? url : `${url}?${FRESH_PARAM}=${freshValue()}`,
    {
      // A template's ETag is its version, and the editor's whole conflict story
      // depends on holding the current one. Never serve this from a cache --
      // this covers Next's Data Cache, the cache key above covers the edge.
      cache: 'no-store',
    },
  );
  if (resp.status === 404) return null;
  if (!resp.ok)
    throw new Error(`definitions-worker GET /t/${id} returned ${resp.status}`);
  return (await resp.json()) as Template;
}

export async function fetchVocabulary(): Promise<DeviceType> {
  assertServer();
  const resp = await fetch(
    `${config.definitionsWorkerUrl}/schema/device-type-vehicle.json`,
    {
      // Matches the worker's own max-age. The vocabulary decides which options
      // the form offers, so it is the one document that must not go stale for
      // longer than the validator that enforces it.
      next: { revalidate: 300 },
    },
  );
  if (!resp.ok) {
    throw new Error(
      `definitions-worker GET /schema/device-type-vehicle.json returned ${resp.status}`,
    );
  }
  return (await resp.json()) as DeviceType;
}

export async function publishTemplate(
  id: string,
  payload: TemplatePayload,
  precondition: Precondition,
): Promise<PublishResult> {
  assertServer();
  const body = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(body).byteLength;
  if (bytes > MAX_DOC_BYTES) {
    return { ok: false, kind: 'too-large', bytes, limit: MAX_DOC_BYTES };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DEFINITIONS_WRITE_TOKEN ?? ''}`,
  };
  if (precondition.kind === 'create') headers['If-None-Match'] = '*';
  else headers['If-Match'] = `"${precondition.version}"`;

  const resp = await fetch(`${config.definitionsWorkerUrl}/t/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers,
    body,
    cache: 'no-store',
  });

  if (resp.ok) return { ok: true, template: (await resp.json()) as Template };

  const data = (await resp.json().catch(() => ({}))) as {
    error?: string;
    errors?: string[];
    expected?: number | null;
    actual?: number;
  };

  if (resp.status === 422)
    return { ok: false, kind: 'validation', errors: data.errors ?? [] };
  if (resp.status === 412) {
    return {
      ok: false,
      kind: 'conflict',
      expected: data.expected ?? null,
      actual: data.actual ?? 0,
    };
  }
  if (resp.status === 413)
    return { ok: false, kind: 'too-large', bytes, limit: MAX_DOC_BYTES };
  return {
    ok: false,
    kind: 'upstream',
    status: resp.status,
    message: data.error ?? `HTTP ${resp.status}`,
  };
}
