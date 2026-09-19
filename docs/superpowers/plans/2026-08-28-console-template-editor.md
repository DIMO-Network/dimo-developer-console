# Console Template Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a template editor in DIMO Developer Console that makes trim
divergence visible and can safely publish a new template version, after closing
the three write-path gates that do not exist yet.

**Architecture:** Three layers. (1) `definitions-worker` gains a public
`GET /schema/<file>` route, real compare-and-swap on writes, and generated TS
types — the three prerequisites the handoff names. (2) Console gains a
server-only route at `/api/templates/[id]` that holds `WRITE_TOKEN`, verifies
the existing session cookie, stamps `author` from that session, resolves the
caller's contribution tier against identity-api, and proxies to the worker with
`If-Match`. (3) The browser gets a grid — trims as columns, attributes as rows,
agreement muted and divergence at full contrast — driven by a pure,
heavily-tested transformation module that never mutates a template in place.

**Tech Stack:** Console — Next.js 15 App Router, React 18, TypeScript 5.9,
Tailwind 3, Apollo Client (identity-api), Jest + React Testing Library.
Worker — Cloudflare Workers, TypeScript, Vitest + `@cloudflare/vitest-pool-workers`
(miniflare), R2.

**Spec:**

- `definitions-worker/docs/superpowers/specs/2026-08-27-open-trim-registry.md` — the registry design and the contribution model.
- `~/workspace/HANDOFF-console-templates.md` — this feature's brief, the four gates, the design direction.
- `~/workspace/VERIFY-trim-templates.md` — measured state, decisions taken, known-open items.
- `definitions-worker/schema/` — the authoritative contract (`template.schema.json`, `device-type-vehicle.json`, `resolved.schema.json`, `examples/toyota_camry_2020.json`).

---

## Global Constraints

Every task's requirements implicitly include this section.

**Repos and branches**

- Worker tasks (1–3): repo `~/workspace/definitions-worker`, new branch `template-cas` stacked on `trim-extraction` (HEAD `a762582`). Do not merge into `trim-extraction`; it is under review as PRs #1/#2/#3.
- Console tasks (4–11): repo `~/workspace/dimo-developer-console`, new branch `template-editor` off `master` (HEAD `da1df4f`).
- **No `Co-Authored-By` trailer and no Claude attribution in any commit message or PR body.** Both repos currently have zero such trailers; keep it that way.

**The contract — rules the UI must honour, not just the API**

- An attribute lives on the template **or** on a trim, never both.
- Absent is not empty. Clearing a field _removes_ the attribute. `""` and `<nil>` are unrepresentable.
- Values are typed. `fuel_tank_capacity_gal` is `15.8`, never `"15.800000"`.
- Enum values come from that attribute's `options`. Never free text.
- `hardwareTemplateId` is DIMO-only at every tier, is not a vehicle attribute, and sits outside `attributes`.
- A multi-trim template may not contain a trim without an effective selector. Degenerate selectors (`vinPattern: ''`, `manufacturerCode: ['']`, `manufacturerCode: []`, `selectors: {}`) do not count as selectors.
- `version`, `createdAt` and `updatedAt` are server-owned. Never send them; the worker rejects them as `unexpected top-level key "<name>"`.
- `author` is server-stamped from the session. The browser never supplies it and never sees `WRITE_TOKEN`.
- Request body cap is **64 KB** (`MAX_DOC_BYTES` in `definitions-worker/src/index.ts`); over it the worker returns 413 `{"error":"request body exceeds 64KB"}`.
- Template id pattern: `^[a-z0-9][a-z0-9._&+-]*_[a-z0-9._&+-]+_[0-9]{4}$`, and the trailing year must equal the `year` field.

**Console design system — verified values, use these and nothing else**

|                         | Value                                                                                          | Source                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Page background         | `#000` (`bg-black`)                                                                            | `src/app/globals.css`: `body @apply bg-black`                                        |
| Surfaces                | `bg-surface-default` `#141012` / `bg-surface-sunken` `#0A0508` / `bg-surface-raised` `#201C1E` | `tailwind.config.ts`                                                                 |
| Input ground            | `bg-dark-grey-950` `#24292f`                                                                   | `tailwind.config.ts`                                                                 |
| Accent                  | `text-primary-300` / `bg-primary-300` `#6aded5`                                                | `Button.css` `.primary-solid`                                                        |
| Outline border          | `border-cta-default` `#322D2F`                                                                 | `tailwind.config.ts`                                                                 |
| Error **fill**          | `bg-feedback-error` `#8E3231`                                                                  | `tailwind.config.ts`                                                                 |
| Error **text on black** | `text-red-400` `#fe6b6b`                                                                       | `tailwind.config.ts`; `#8E3231` is a fill colour and is unreadable as text on `#000` |
| Font                    | Universal Sans Display, local, **weights 525 and 900 only**                                    | `src/utils/font.ts`                                                                  |
| Muting                  | white opacity (`text-white/50`, `text-white/40`, `text-white/25`)                              | there is no light weight; emphasis rides on opacity                                  |
| Buttons                 | `<Button className="...">` — white pill, black text, `rounded-full h-10`                       | `src/components/Button/`                                                             |

**Console conventions**

- App Router only. Pages that touch wallet/session state are `'use client'`.
- Page directory shape follows `src/app/webhooks/`: `page.tsx` + `layout.ts` (`export default AuthorizedLayout`) + a `<name>Page/View/View.tsx` + `create/` + `edit/`.
- Tests live in `__tests__/unit/...` or colocated `__tests__/` next to the module (both exist; `src/app/app/list/components/VehicleSimulator/__tests__/` is the colocated precedent). Jest maps `@/` → `src/`.
- `npm test`, `npm run compile` (typecheck), and `npm run lint` must all pass before every commit.
- Server-only secrets never get a `NEXT_PUBLIC_` prefix.
- `src/middleware.ts` already 401s any unauthenticated request to `/api/*` that is not under `UNPROTECTED_PATHS`. That is a first line, not the authorization; each route still resolves its own caller.

**Scope boundary**
This plan ships the tiers that publish **directly**: create, edit-your-own-unreferenced, and manufacturer-NFT-holder. The **proposal** tier (edit a referenced template you do not own → a curator merges) needs a proposal store the worker does not have; it is out of scope and gets its own plan. Where the caller is not entitled, the editor is read-only and says exactly why. A publish flow that cannot safely publish is worse than one that declines out loud.

**Traps this plan carries, and where each is handled**

| Trap (from the handoff)                                                     | Where                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Templates may be attribute-free — 5,152 of the emitted set are              | Task 5 renders every vocabulary attribute as a row whether or not it is set, so the common empty state is the affordance for filling it in; Task 12 creates one that way |
| 137 production ids fail the id schema (`subaru_tribeca-(ny/nj)_2008`)       | Task 8 shows them as `invalid-id` with the reason, and never asks the worker about them                                                                                  |
| 668 definitions have no powertrain at all — missing is legitimate           | `—` in Task 7 means not set and is visually distinct from a value; nothing treats absence as an error                                                                    |
| `GET /admin/history` is paged (`limit` 200 default, 500 max, `next` cursor) | No consumer in this plan reads it; recorded under "Not in this plan" so the follow-on carries the constraint                                                             |
| `version`, `createdAt`, `updatedAt` are server-owned                        | `toPayload` (Task 5) strips them; the route refuses a body carrying them by name (Task 9)                                                                                |
| 64 KB body cap                                                              | Checked in `publishTemplate` before a request is spent (Task 4)                                                                                                          |

---

## File Structure

**`definitions-worker` (Tasks 1–3)**

| File                                                     | Responsibility                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/index.ts` (modify)                                  | add `GET /schema/<file>`; wire `If-Match` / `If-None-Match` on `PUT /t/:id`         |
| `src/store.ts` (modify)                                  | `writeTemplate` takes `expectedVersion`; conditional R2 put; `VersionConflictError` |
| `src/template.ts` (modify)                               | import generated types instead of declaring them                                    |
| `schema/template.schema.json` (modify)                   | add `title` to `$defs` and `manufacturer` so generated type names are deterministic |
| `schema/generated/template.ts` (create)                  | generated, committed, drift-checked                                                 |
| `scripts/gen-types.mjs` (create)                         | the generator, with `--check` mode                                                  |
| `test/store.test.ts`, `test/write-path.test.ts` (modify) | `FakeBucket.put` honours `onlyIf`                                                   |
| `test/generated-types.test.mjs` (create)                 | fails when the committed types drift from the schema                                |
| `test/integration/conditional-write.test.ts` (create)    | proves **real** R2 honours the conditional put                                      |

**`dimo-developer-console` (Tasks 4–11)**

| File                                                                        | Responsibility                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `src/config/default.ts`, `production.ts`, `preview.ts`, `index.ts` (modify) | `definitionsWorkerUrl`                                                               |
| `scripts/gen-template-types.mjs` (create)                                   | fetch schema → `src/types/generated/template.ts`                                     |
| `src/types/generated/template.ts` (create)                                  | generated, committed                                                                 |
| `src/types/template.ts` (create)                                            | re-export + the hand-written vocabulary types the schema does not carry              |
| `src/services/definitions.ts` (create)                                      | **server-only** worker client: read template, read vocabulary, write with `If-Match` |
| `src/services/templateEntitlement.ts` (create)                              | **server-only** identity-api queries + tier resolution                               |
| `src/utils/templateGrid.ts` (create)                                        | the pure model: grid, divergence, lift/push, edits, payload                          |
| `src/utils/templateCoerce.ts` (create)                                      | typed coercion + the normalisation report                                            |
| `src/utils/templateValidate.ts` (create)                                    | client-side mirror of the worker's validator                                         |
| `src/app/api/templates/[id]/route.ts` (create)                              | GET bundle + PUT publish; holds `WRITE_TOKEN`                                        |
| `src/components/TemplateEditor/TrimGrid/` (create)                          | the grid                                                                             |
| `src/components/TemplateEditor/DivergenceRail/` (create)                    | per-attribute distinct count + Move to shared                                        |
| `src/components/TemplateEditor/NormalisationPanel/` (create)                | what the editor changed that you did not type                                        |
| `src/components/TemplateEditor/TrimSelectorEditor/` (create)                | selector editing + gate ④ state                                                      |
| `src/app/templates/layout.ts`, `page.tsx`, `templatesPage/` (create)        | browse                                                                               |
| `src/app/templates/[id]/page.tsx` + `components/` (create)                  | edit                                                                                 |
| `src/app/templates/new/page.tsx` + `components/` (create)                   | create                                                                               |
| `src/gql/` (regenerated)                                                    | via `npm run compile` after adding the new documents                                 |

---

# Phase 0 — the gates (repo: `definitions-worker`)

Nothing in Phase 1 or 2 may be deployed until these three land. Do them first,
in order. Start by branching:

```bash
cd ~/workspace/definitions-worker
git checkout trim-extraction && git pull --ff-only 2>/dev/null || true
git checkout -b template-cas
npm test && npm run test:integration && npm run typecheck
# baseline: 199 unit, 35 integration, typecheck clean
```

---

### Task 1: Serve the contract from the worker

Console needs `device-type-vehicle.json` at runtime — it is what makes the form
schema-driven, and fetching it rather than vendoring it is what stops the form's
vocabulary drifting from the vocabulary the validator applies. It needs
`template.schema.json` at build time to generate types (Task 3, and Console
Task 4). Neither is served today.

**Files:**

- Modify: `definitions-worker/src/index.ts`
- Test: `definitions-worker/test/integration/worker.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `GET /schema/template.schema.json`, `GET /schema/device-type-vehicle.json`, `GET /schema/resolved.schema.json` — public, no auth, `content-type: application/json`, `cache-control: public, max-age=300, stale-while-revalidate=3600`. Unknown name → 404 `{"error":"not found"}`.

Cache is 300 s, not the 86,400 s templates get: a schema changes on deploy and
there is no purge hook for it, and a stale vocabulary silently changes which
options a contributor is offered. Five minutes of staleness is the ceiling that
buys.

- [ ] **Step 1: Write the failing integration test**

Append to `test/integration/worker.test.ts`:

```ts
describe('GET /schema/<file>', () => {
  it('serves the vocabulary and the template schema without auth', async () => {
    const vocab = await SELF.fetch('https://w/schema/device-type-vehicle.json');
    expect(vocab.status).toBe(200);
    expect(vocab.headers.get('content-type')).toContain('application/json');
    expect(vocab.headers.get('cache-control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    );
    const doc = (await vocab.json()) as { id: string; attributes: { name: string }[] };
    expect(doc.id).toBe('vehicle');
    expect(doc.attributes.map((a) => a.name)).toContain('powertrain_type');

    const schema = await SELF.fetch('https://w/schema/template.schema.json');
    expect(schema.status).toBe(200);
    expect(((await schema.json()) as { title: string }).title).toBe('Template');
  });

  it('404s an unknown schema name and never walks out of the map', async () => {
    for (const name of ['nope.json', '../wrangler.toml', 'index.ts']) {
      const resp = await SELF.fetch(`https://w/schema/${encodeURIComponent(name)}`);
      expect(resp.status).toBe(404);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test:integration`
Expected: FAIL — `expected 404 to be 200`, because `/schema/...` falls through to the final `json({ error: 'not found' }, 404)`.

- [ ] **Step 3: Implement the route**

In `src/index.ts`, next to the existing `vehicleVocab` import:

```ts
import templateSchema from '../schema/template.schema.json';
import resolvedSchema from '../schema/resolved.schema.json';
```

Below `const VEHICLE_VOCAB = ...`, add:

```ts
// The contract, served from the same deploy that enforces it. Console fetches
// the vocabulary at runtime rather than vendoring a copy: a vendored copy can
// offer a contributor an option this worker will reject, and that mismatch is
// invisible until save. A fixed map, never a filesystem lookup -- there is no
// filesystem here, and a name-derived path would be the only place in this
// worker a caller could steer a read.
const SCHEMAS: Record<string, unknown> = {
  'template.schema.json': templateSchema,
  'device-type-vehicle.json': vehicleVocab,
  'resolved.schema.json': resolvedSchema,
};

// Shorter than DOC_CACHE by two orders of magnitude on purpose: a schema
// changes with a deploy and nothing purges it, so this number is the window in
// which a contributor can be shown a vocabulary the validator no longer uses.
const SCHEMA_CACHE = 'public, max-age=300, stale-while-revalidate=3600';
```

And inside `fetch`, immediately after the `templateMatch` block:

```ts
const schemaMatch = path.match(/^\/schema\/([^/]+)$/);
if (schemaMatch) {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);
  const doc = SCHEMAS[decodeURIComponent(schemaMatch[1])];
  if (doc === undefined) return json({ error: 'not found' }, 404);
  return new Response(JSON.stringify(doc), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': SCHEMA_CACHE },
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:integration && npm test && npm run typecheck`
Expected: PASS — 37 integration (35 + 2), 199 unit, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts test/integration/worker.test.ts
git commit -m "feat(worker): serve schema/ documents publicly

Console needs the vehicle vocabulary at runtime to drive the editor form and
the template schema at build time to generate types. Fetching beats vendoring:
a vendored vocabulary can offer an option this worker rejects, and the
mismatch is invisible until save."
```

---

### Task 2: Compare-and-swap on write — gate ②

`writeTemplate` probes forward for a free version number and writes it
unconditionally. Two concurrent saves can probe to the same number and the
second overwrites the first's _immutable_ version object. "Nothing is
contended" was true while one backfill process wrote; the editor is what makes
it false.

The fix is a conditional put on the version key — R2's `onlyIf:
{ etagDoesNotMatch: '*' }`, which returns `null` instead of writing when the
key already exists (`R2Bucket.put` overload at
`node_modules/@cloudflare/workers-types/index.d.ts:2476`). That is the actual
compare-and-swap; the meta head check on top of it is what turns a lost update
into a 412 the editor can show.

Three modes, so the existing unconditional callers (import, backfill, dd-api)
keep working unchanged:

| `expectedVersion` | meaning                                                | route header       |
| ----------------- | ------------------------------------------------------ | ------------------ |
| `undefined`       | unconditional — probe forward, but still never clobber | none               |
| `null`            | must not exist                                         | `If-None-Match: *` |
| `n` (number)      | current head must be exactly `n`; write `n+1`          | `If-Match: "n"`    |

**Files:**

- Modify: `definitions-worker/src/store.ts:32-96` (`WriteOptions`, `writeTemplate`)
- Modify: `definitions-worker/src/index.ts` (the `PUT` branch of `handleTemplateRequest`)
- Test: `definitions-worker/test/store.test.ts`, `definitions-worker/test/write-path.test.ts`
- Test: `definitions-worker/test/integration/conditional-write.test.ts` (create)

**Interfaces:**

- Consumes: `readMeta`, `versionKey`, `templateKey`, `metaKey`, `historyKey` from `src/store.ts`.
- Produces:
  - `WriteOptions { now: string; author?: string; expectedVersion?: number | null }`
  - `class VersionConflictError extends Error { name = 'VersionConflictError'; expected: number | null; actual: number }`
  - `PUT /t/:id` returns **412** `{ error, expected, actual }` on a precondition failure and **400** on a malformed `If-Match`.

- [ ] **Step 1: Teach the fakes about `onlyIf`, then write the failing tests**

First, in **both** `test/store.test.ts:9` and `test/write-path.test.ts:37`,
replace `FakeBucket.put` with:

```ts
  // R2's real put returns null instead of writing when onlyIf fails. A fake
  // that ignores onlyIf would pass every CAS test while proving nothing --
  // which is this project's recurring failure shape, so the integration test
  // below exercises the real binding as well.
  async put(key: string, body: string, opts?: { onlyIf?: { etagDoesNotMatch?: string } }) {
    if (opts?.onlyIf?.etagDoesNotMatch === '*' && this.store.has(key)) return null;
    this.store.set(key, body);
    return { etag: `e${++this.seq}` };
  }
```

Then append to `test/store.test.ts`:

```ts
import { VersionConflictError } from '../src/store';

describe('writeTemplate compare-and-swap', () => {
  it('expectedVersion null creates, and refuses when the template already exists', async () => {
    const e = env();
    const first = await writeTemplate(e, body(), {
      now: '2026-08-28T00:00:00.000Z',
      expectedVersion: null,
    });
    expect(first.version).toBe(1);
    await expect(
      writeTemplate(e, body(), {
        now: '2026-08-28T00:01:00.000Z',
        expectedVersion: null,
      }),
    ).rejects.toMatchObject({ name: 'VersionConflictError', expected: null, actual: 1 });
  });

  it('expectedVersion n writes n+1 and refuses a stale n', async () => {
    const e = env();
    await writeTemplate(e, body(), { now: '2026-08-28T00:00:00.000Z' });
    const second = await writeTemplate(e, body(), {
      now: '2026-08-28T00:01:00.000Z',
      expectedVersion: 1,
    });
    expect(second.version).toBe(2);
    await expect(
      writeTemplate(e, body(), { now: '2026-08-28T00:02:00.000Z', expectedVersion: 1 }),
    ).rejects.toMatchObject({ name: 'VersionConflictError', expected: 1, actual: 2 });
  });

  it('a conditional write never overwrites an existing immutable version object', async () => {
    const e = env();
    await writeTemplate(e, body(), { now: '2026-08-28T00:00:00.000Z' });
    const bucket = e.DEFS_BUCKET as unknown as { store: Map<string, string> };
    // Simulate the loser of a race: meta still says head=1, but v/2 already
    // landed from the winner. Probing forward would have written v/3 and left
    // the head at a version nobody asked for; CAS must refuse instead.
    bucket.store.set(
      versionKey('toyota_camry_2020', 2),
      JSON.stringify({ version: 2, winner: true }),
    );
    await expect(
      writeTemplate(e, body(), { now: '2026-08-28T00:03:00.000Z', expectedVersion: 1 }),
    ).rejects.toMatchObject({ name: 'VersionConflictError' });
    expect(JSON.parse(bucket.store.get(versionKey('toyota_camry_2020', 2))!).winner).toBe(
      true,
    );
  });

  it('an unconditional write still probes forward and still never clobbers', async () => {
    const e = env();
    await writeTemplate(e, body(), { now: '2026-08-28T00:00:00.000Z' });
    const bucket = e.DEFS_BUCKET as unknown as { store: Map<string, string> };
    bucket.store.set(
      versionKey('toyota_camry_2020', 2),
      JSON.stringify({ version: 2, winner: true }),
    );
    const t = await writeTemplate(e, body(), { now: '2026-08-28T00:04:00.000Z' });
    expect(t.version).toBe(3);
    expect(JSON.parse(bucket.store.get(versionKey('toyota_camry_2020', 2))!).winner).toBe(
      true,
    );
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run test/store.test.ts`
Expected: FAIL — `VersionConflictError` is not exported, and `expectedVersion` is ignored.

- [ ] **Step 3: Implement CAS in `src/store.ts`**

Replace `WriteOptions` and `writeTemplate`:

```ts
export interface WriteOptions {
  now: string;
  author?: string;
  // undefined: unconditional (import, backfill, dd-api -- unchanged behaviour).
  // null:      the template must not exist yet.
  // number:    the current head must be exactly this, and this write is head+1.
  expectedVersion?: number | null;
}

export class VersionConflictError extends Error {
  // Set explicitly, not inherited: src/index.ts tells expected states apart by
  // `name` as well as `instanceof`, because a bundler or a future module
  // boundary can break identity while the name survives.
  name = 'VersionConflictError';
  constructor(
    public readonly expected: number | null,
    public readonly actual: number,
  ) {
    super(
      expected === null
        ? `template already exists at version ${actual}`
        : `expected version ${expected} but the current version is ${actual}`,
    );
  }
}

// An unconditional write probes forward past version objects the meta head has
// not caught up with. Bounded, because an unbounded probe is a subrequest hole:
// each step is one head() against a ~1,000-subrequest budget.
const MAX_VERSION_PROBES = 32;

export async function writeTemplate(
  env: Env,
  value: TemplateInput,
  opts: WriteOptions,
): Promise<Template> {
  const meta = await readMeta(env, value.id);
  const head = meta && !meta.deleted ? meta.head : 0;

  if (opts.expectedVersion === null && head !== 0) {
    throw new VersionConflictError(null, head);
  }
  if (typeof opts.expectedVersion === 'number' && opts.expectedVersion !== head) {
    throw new VersionConflictError(opts.expectedVersion, head);
  }

  const action: VersionAction = meta && !meta.deleted ? 'update' : 'create';
  // createdAt survives every later write, including a re-create after delete.
  const createdAt = meta?.createdAt ?? opts.now;
  const conditional = opts.expectedVersion !== undefined;

  let version = head + 1;
  let stored: Template | null = null;
  let body = '';
  for (let probe = 0; probe < (conditional ? 1 : MAX_VERSION_PROBES); probe++) {
    const candidate: Template = {
      ...value,
      version,
      ...(opts.author ? { author: opts.author } : {}),
      createdAt,
      updatedAt: opts.now,
    };
    body = JSON.stringify(candidate);
    // Version first: if anything below fails, the immutable record still
    // exists and the head simply lags, which is recoverable. The reverse is
    // not. onlyIf is what makes the write a compare-and-swap rather than a
    // read-then-hope: R2 returns null instead of overwriting.
    const put = await env.DEFS_BUCKET.put(versionKey(value.id, version), body, {
      onlyIf: { etagDoesNotMatch: '*' },
    });
    if (put !== null) {
      stored = candidate;
      break;
    }
    version++;
  }

  if (stored === null) {
    if (conditional) {
      // Somebody else took head+1 between our meta read and our put. Re-read
      // the head so the caller is told the version it must rebase onto, not
      // the stale one it sent.
      const fresh = await readMeta(env, value.id);
      throw new VersionConflictError(
        opts.expectedVersion === undefined ? null : opts.expectedVersion,
        fresh && !fresh.deleted ? fresh.head : head,
      );
    }
    throw new Error(
      `could not find a free version for ${value.id} within ${MAX_VERSION_PROBES} probes`,
    );
  }

  await env.DEFS_BUCKET.put(templateKey(value.id), body);

  const entry: VersionLogEntry = {
    version: stored.version,
    at: opts.now,
    ...(opts.author ? { author: opts.author } : {}),
    action,
  };
  const nextMeta: TemplateMeta = {
    id: value.id,
    head: stored.version,
    createdAt,
    versions: [...(meta?.versions ?? []), entry],
  };
  await env.DEFS_BUCKET.put(metaKey(value.id), JSON.stringify(nextMeta));
  await env.DEFS_BUCKET.put(
    historyKey(opts.now, value.id),
    JSON.stringify({ id: value.id, ...entry }),
  );

  return stored;
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npx vitest run test/store.test.ts test/write-path.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Wire the preconditions onto `PUT /t/:id`**

In `src/index.ts`, add the import:

```ts
import {
  readTemplate,
  writeTemplate,
  deleteTemplate,
  listHistoryPage,
  VersionConflictError,
} from './store';
```

and replace the `PUT` branch's write with:

```ts
const result = validateTemplate(body, vocab);
if (!result.ok) return json({ errors: result.errors }, 422);

// Preconditions. Absent means unconditional, which is what every existing
// writer (import, backfill, dd-api) sends and what they keep getting.
// Console always sends one, because two people editing one template is
// exactly what the editor makes possible.
let expectedVersion: number | null | undefined;
const ifMatch = req.headers.get('if-match');
const ifNoneMatch = req.headers.get('if-none-match');
if (ifMatch !== null) {
  const n = Number(ifMatch.replace(/^W\//, '').replace(/"/g, ''));
  if (!Number.isInteger(n) || n < 1) {
    return json(
      { error: 'If-Match must be a quoted version integer, e.g. If-Match: "7"' },
      400,
    );
  }
  expectedVersion = n;
} else if (ifNoneMatch !== null) {
  if (ifNoneMatch.trim() !== '*') {
    return json({ error: 'If-None-Match must be "*"' }, 400);
  }
  expectedVersion = null;
}

let stored;
try {
  stored = await writeTemplate(env, result.value, {
    now,
    author: result.value.author,
    expectedVersion,
  });
} catch (err) {
  const isConflict =
    err instanceof VersionConflictError ||
    (err instanceof Error && err.name === 'VersionConflictError');
  if (!isConflict) throw err;
  const c = err as VersionConflictError;
  return json({ error: c.message, expected: c.expected, actual: c.actual }, 412);
}
await purgeUrls(env, id);
return json(stored);
```

- [ ] **Step 6: Prove the _real_ R2 binding honours it**

A `FakeBucket` that implements `onlyIf` proves only that the fake implements
`onlyIf`. This project has already shipped a budget test that could not fail
and a cached path that never ran the matcher. Create
`test/integration/conditional-write.test.ts`:

```ts
import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const AUTH = {
  'authorization': 'Bearer test-token-a',
  'content-type': 'application/json',
};
const ID = 'toyota_cas_2020';
const doc = {
  id: ID,
  deviceType: 'vehicle',
  manufacturer: { slug: 'toyota', name: 'Toyota' },
  model: 'CAS',
  year: 2020,
  attributes: { number_of_doors: 4 },
  trims: [{ name: 'LE', attributes: { powertrain_type: 'ICE' } }],
};

const put = (headers: Record<string, string>) =>
  SELF.fetch(`https://w/t/${ID}`, {
    method: 'PUT',
    headers: { ...AUTH, ...headers },
    body: JSON.stringify(doc),
  });

describe('conditional writes against the real R2 binding', () => {
  it('If-None-Match: * creates once and 412s the second time', async () => {
    const created = await put({ 'if-none-match': '*' });
    expect(created.status).toBe(200);
    expect(((await created.json()) as { version: number }).version).toBe(1);

    const again = await put({ 'if-none-match': '*' });
    expect(again.status).toBe(412);
    expect(await again.json()).toMatchObject({ expected: null, actual: 1 });
  });

  it('If-Match advances exactly once per version; the stale writer is refused', async () => {
    const ok = await put({ 'if-match': '"1"' });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { version: number }).version).toBe(2);

    const stale = await put({ 'if-match': '"1"' });
    expect(stale.status).toBe(412);
    expect(await stale.json()).toMatchObject({ expected: 1, actual: 2 });

    // The winner's immutable record is intact.
    const v2 = await SELF.fetch(`https://w/t/${ID}`);
    expect(((await v2.json()) as { version: number }).version).toBe(2);
  });

  it('a malformed If-Match is a 400, not a silent unconditional write', async () => {
    const resp = await put({ 'if-match': 'W/"not-a-version"' });
    expect(resp.status).toBe(400);
  });

  it('no precondition header still writes unconditionally, for import and dd-api', async () => {
    const resp = await put({});
    expect(resp.status).toBe(200);
    expect(((await resp.json()) as { version: number }).version).toBe(3);
  });
});
```

- [ ] **Step 7: Run the integration suite**

Run: `npm run test:integration`
Expected: PASS — 41 integration tests.

**If the `If-None-Match: *` case fails with a 200 instead of a 412,
miniflare's R2 does not implement conditional puts. Do not delete the test.**
Report it, and fall back to detection: after the version put, re-read
`versionKey(id, version)` and compare a per-write nonce embedded in the body;
a mismatch means another writer won, and the write reports a 412. That
detects the clobber rather than preventing it — say so in the commit message
and open a follow-up, because it leaves the loser's version object overwritten.

- [ ] **Step 8: Full suite and commit**

Run: `npm test && npm run test:integration && npm run typecheck`
Expected: 199 unit + 41 integration, typecheck clean.

```bash
git add src/store.ts src/index.ts test/store.test.ts test/write-path.test.ts test/integration/conditional-write.test.ts
git commit -m "feat(worker): compare-and-swap on template writes

writeTemplate probed forward for a free version and wrote it unconditionally,
so two concurrent saves could land on the same number and the second would
overwrite the first's immutable version object. R2's onlyIf makes the version
put a real CAS; If-Match/If-None-Match expose it, and absent preconditions
keep the existing unconditional writers unchanged.

The unit tests use a fake that implements onlyIf, which proves nothing about
R2 -- test/integration/conditional-write.test.ts exercises the real binding."
```

---

### Task 3: Generate the types from the schema — gate ③

The spec calls for generating types from `schema/*.json`. Nothing does: the
worker hand-wrote TS, dd-api hand-wrote the Go mirror, and Console would be the
third copy of one contract. This task removes the worker's copy and gives
Console (Task 4) a generator to run.

**Files:**

- Modify: `definitions-worker/schema/template.schema.json` (add `title` to `$defs` and `manufacturer`)
- Create: `definitions-worker/scripts/gen-types.mjs`
- Create: `definitions-worker/schema/generated/template.ts`
- Modify: `definitions-worker/src/template.ts:1-60` (import the generated types)
- Modify: `definitions-worker/package.json` (script + devDependency)
- Create: `definitions-worker/test/generated-types.test.mjs`

**Interfaces:**

- Consumes: `schema/template.schema.json`.
- Produces: `schema/generated/template.ts` exporting `Template`, `Trim`, `TrimSelectors`, `TemplateManufacturer`, `AttributeMap`; `npm run gen:types` and `npm run gen:types -- --check`.

- [ ] **Step 1: Pin the generated names in the schema**

`json-schema-to-typescript` names an interface from its `title`, falling back
to the property or `$defs` key. Relying on the fallback means a schema edit can
silently rename an exported type. Add these four `title` keys to
`schema/template.schema.json` — annotations only, no validation change:

- `properties.manufacturer` → `"title": "TemplateManufacturer"`
- `$defs.trim` → `"title": "Trim"`
- `$defs.selectors` → `"title": "TrimSelectors"`
- `$defs.attributeMap` → `"title": "AttributeMap"`

Each goes immediately after that object's `"type"` key, e.g.:

```json
    "trim": {
      "type": "object",
      "title": "Trim",
      "required": ["name", "attributes"],
```

- [ ] **Step 2: Write the drift test first**

Create `test/generated-types.test.mjs`:

```js
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { generate } from '../scripts/gen-types.mjs';

describe('generated types', () => {
  it('schema/generated/template.ts is what the schema produces right now', async () => {
    const committed = await readFile(
      new URL('../schema/generated/template.ts', import.meta.url),
      'utf8',
    );
    expect(await generate()).toBe(committed);
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run test/generated-types.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/gen-types.mjs'`.

- [ ] **Step 4: Add the generator**

```bash
npm install --save-dev json-schema-to-typescript@^15
```

Create `scripts/gen-types.mjs`:

```js
#!/usr/bin/env node
// The contract lives in schema/*.json. Every hand-written mirror of it is a
// copy that drifts -- there are already two (this worker's TS, dd-api's Go)
// and Console would have been the third. `npm test` fails if the committed
// output stops matching the schema.
import { compile } from 'json-schema-to-typescript';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SCHEMA = new URL('../schema/template.schema.json', import.meta.url);
const OUT = new URL('../schema/generated/template.ts', import.meta.url);

const BANNER = `/* eslint-disable */
// GENERATED by scripts/gen-types.mjs from schema/template.schema.json.
// Do not edit. Run \`npm run gen:types\` after changing the schema.
`;

export async function generate() {
  const schema = JSON.parse(await readFile(SCHEMA, 'utf8'));
  const body = await compile(schema, 'Template', {
    bannerComment: '',
    additionalProperties: false,
    style: { singleQuote: true, semi: true, printWidth: 100 },
  });
  return BANNER + body;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const generated = await generate();
  if (process.argv.includes('--check')) {
    const current = await readFile(OUT, 'utf8').catch(() => '');
    if (current !== generated) {
      console.error('schema/generated/template.ts is stale. Run: npm run gen:types');
      process.exit(1);
    }
    console.log('generated types are up to date');
  } else {
    await mkdir(new URL('../schema/generated/', import.meta.url), { recursive: true });
    await writeFile(OUT, generated);
    console.log(`wrote ${fileURLToPath(OUT)}`);
  }
}
```

Add to `package.json` `scripts`:

```json
    "gen:types": "node scripts/gen-types.mjs",
```

and extend `test` so the drift check runs with everything else:

```json
    "test": "vitest run test/*.test.ts test/*.test.mjs test/extract/*.test.mjs",
```

(unchanged — `test/generated-types.test.mjs` already matches `test/*.test.mjs`).

- [ ] **Step 5: Generate and inspect**

Run: `npm run gen:types && cat schema/generated/template.ts`
Expected: a file exporting `Template`, `TemplateManufacturer`, `Trim`, `TrimSelectors`, `AttributeMap`. Confirm those five names are present before continuing; if any differs, the `title` in Step 1 is missing or misplaced.

- [ ] **Step 6: Make `src/template.ts` consume them**

Delete the hand-written `TemplateManufacturer`, `TrimSelectors`, `Trim` and
`Template` interfaces at `src/template.ts:24-58` and replace them with:

```ts
// The contract, generated from schema/template.schema.json. AttributeValue,
// AttributeDef, DeviceType and TemplateValidation stay hand-written here: the
// vocabulary is a separate document with no schema of its own, and
// TemplateValidation is this module's own result type, not part of the wire
// contract.
export type {
  Template,
  TemplateManufacturer,
  Trim,
  TrimSelectors,
  AttributeMap,
} from '../schema/generated/template';
import type { Template } from '../schema/generated/template';

export type AttributeValue = string | number | boolean;
export type TemplateInput = Omit<Template, 'version' | 'createdAt' | 'updatedAt'>;
```

Keep `AttributeDef`, `DeviceType` and `TemplateValidation` exactly as they are.

- [ ] **Step 7: Typecheck and fix the fallout**

Run: `npm run typecheck`
Expected: PASS. The generated `AttributeMap` carries an index signature of
`string | number | boolean`, which is what the hand-written one was; if
`checkAttributes`' return type complains, annotate its local `out` as
`Record<string, AttributeValue>` and return it — do not widen the generated type.

- [ ] **Step 8: Full suite and commit**

Run: `npm test && npm run test:integration && npm run typecheck`
Expected: 200 unit (199 + the drift test) + 41 integration, typecheck clean.

```bash
git add schema/template.schema.json schema/generated/template.ts scripts/gen-types.mjs src/template.ts package.json package-lock.json test/generated-types.test.mjs
git commit -m "feat(worker): generate template types from the schema

The spec called for generating types rather than hand-writing them in four
places. This removes the worker's copy and gives Console a generator to run
against the same document. A test fails when the committed output stops
matching the schema, so drift is a red build rather than a wrong type."
```

- [ ] **Step 9: Open the PR**

```bash
git push -u origin template-cas
gh pr create --title "Worker gates for the Console editor: schema route, CAS, generated types" \
  --body "$(cat <<'BODY'
Three prerequisites the Console template editor cannot ship without.

1. `GET /schema/<file>` — Console fetches the vehicle vocabulary at runtime so
   the editor form cannot offer an option this worker rejects.
2. Compare-and-swap on `writeTemplate`, exposed as `If-Match` / `If-None-Match`.
   Two concurrent saves could previously probe to the same version number and
   the second overwrote the first's immutable record. Absent preconditions stay
   unconditional, so import, backfill and dd-api are unchanged.
3. Types generated from `schema/template.schema.json`, replacing the worker's
   hand-written copy. A drift test fails the build when they diverge.

Stacked on `trim-extraction` (#1/#2/#3). 200 unit, 41 integration, typecheck clean.
BODY
)"
```

---

# Phase 1 — the read path (repo: `dimo-developer-console`)

```bash
cd ~/workspace/dimo-developer-console
git checkout master && git pull --ff-only
git checkout -b template-editor
npm test && npm run compile
# baseline: suite green, typecheck clean
```

---

### Task 4: Configuration, generated types, and the server-only worker client

Everything Console knows about a template comes through here. It is
server-only, by a runtime guard rather than by convention, because the whole
point of gate ① is that `WRITE_TOKEN` never reaches a browser bundle.

**Files:**

- Modify: `src/config/index.ts`, `src/config/default.ts`, `src/config/production.ts`, `src/config/preview.ts`
- Create: `scripts/gen-template-types.mjs`
- Create: `src/types/generated/template.ts` (generated, committed)
- Create: `src/types/template.ts`
- Create: `src/services/definitions.ts`
- Modify: `package.json`, `README.md`
- Test: `__tests__/unit/services/definitions.test.ts`

**Interfaces:**

- Consumes: `GET /schema/template.schema.json`, `GET /schema/device-type-vehicle.json`, `GET /t/:id`, `PUT /t/:id` from Task 1 and Task 2.
- Produces:
  - `config.definitionsWorkerUrl: string`
  - `src/types/template.ts` → `Template`, `Trim`, `TrimSelectors`, `TemplateManufacturer`, `AttributeMap`, `AttributeValue`, `AttributeDef`, `DeviceType`, `TemplatePayload`
  - `fetchTemplate(id: string): Promise<Template | null>`
  - `fetchVocabulary(): Promise<DeviceType>`
  - `publishTemplate(id: string, payload: TemplatePayload, precondition: Precondition): Promise<PublishResult>`
  - `type Precondition = { kind: 'create' } | { kind: 'update'; version: number }`
  - `type PublishResult` — the discriminated union defined in Step 5.

- [ ] **Step 1: Add the config**

`src/config/index.ts` — add to the `Configuration` type, after `identityApiUrl`:

```ts
definitionsWorkerUrl: string;
```

`src/config/default.ts` and `src/config/preview.ts`:

```ts
export const definitionsWorkerUrl = 'https://definitions.dev.dimo.org';
```

`src/config/production.ts`:

```ts
export const definitionsWorkerUrl = 'https://definitions.dimo.org';
```

Document the two new **server-only** env vars in `README.md` beside the
existing ones — no `NEXT_PUBLIC_` prefix on either, ever:

```
DEFINITIONS_WRITE_TOKEN=   # bearer token for PUT /t/:id on definitions-worker. Server-only.
DIMO_CURATOR_ADDRESSES=    # comma-separated 0x addresses allowed to set hardwareTemplateId. Server-only.
```

- [ ] **Step 2: Generate the types from the live schema**

Create `scripts/gen-template-types.mjs`:

```js
#!/usr/bin/env node
// The template contract is definitions-worker/schema/template.schema.json,
// served at <definitionsWorkerUrl>/schema/. Console generates from it rather
// than hand-writing a third copy (the worker's TS and dd-api's Go are the
// other two). Run after the contract changes; the output is committed.
import { compile } from 'json-schema-to-typescript';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../src/types/generated/template.ts', import.meta.url);
const BANNER = `/* eslint-disable */
// GENERATED by scripts/gen-template-types.mjs from
// definitions-worker/schema/template.schema.json. Do not edit.
`;

const fromFlag = process.argv.indexOf('--from');
const source =
  fromFlag !== -1
    ? process.argv[fromFlag + 1]
    : `${process.env.DEFINITIONS_WORKER_URL ?? 'https://definitions.dev.dimo.org'}/schema/template.schema.json`;

const schema = source.startsWith('http')
  ? await (await fetch(source)).json()
  : JSON.parse(await readFile(source, 'utf8'));

const body = await compile(schema, 'Template', {
  bannerComment: '',
  additionalProperties: false,
  style: { singleQuote: true, semi: true, printWidth: 90 },
});

await mkdir(new URL('../src/types/generated/', import.meta.url), { recursive: true });
await writeFile(OUT, BANNER + body);
console.log(`wrote ${fileURLToPath(OUT)} from ${source}`);
```

```bash
npm install --save-dev json-schema-to-typescript@^15
npm run gen:template-types -- --from ../definitions-worker/schema/template.schema.json
```

after adding to `package.json` `scripts`:

```json
    "gen:template-types": "node scripts/gen-template-types.mjs",
```

Confirm `src/types/generated/template.ts` exports `Template`,
`TemplateManufacturer`, `Trim`, `TrimSelectors` and `AttributeMap` before
continuing.

- [ ] **Step 3: Hand-write only what the schema does not carry**

Create `src/types/template.ts`:

```ts
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
// the session in src/app/api/templates/[id]/route.ts and is never client
// input.
export type TemplatePayload = Omit<
  Template,
  'version' | 'createdAt' | 'updatedAt' | 'author'
>;
```

- [ ] **Step 4: Write the failing service test**

Create `__tests__/unit/services/definitions.test.ts`:

```ts
import { fetchTemplate, fetchVocabulary, publishTemplate } from '@/services/definitions';
import type { TemplatePayload } from '@/types/template';

const payload = {
  id: 'toyota_camry_2020',
  deviceType: 'vehicle',
  manufacturer: { slug: 'toyota', name: 'Toyota' },
  model: 'Camry',
  year: 2020,
  attributes: {},
  trims: [{ name: 'LE', attributes: {} }],
} as unknown as TemplatePayload;

const mockFetch = (impl: jest.Mock) => {
  global.fetch = impl as unknown as typeof fetch;
  return impl;
};

describe('definitions service', () => {
  it('returns null for a template that does not exist yet', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    expect(await fetchTemplate('ineos_grenadier_2024')).toBeNull();
  });

  it('sends If-None-Match on create and If-Match on update, and never the token to the body', async () => {
    process.env.DEFINITIONS_WRITE_TOKEN = 'secret-token';
    const f = mockFetch(
      jest
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ ...payload, version: 1 }),
        }),
    );

    await publishTemplate('toyota_camry_2020', payload, { kind: 'create' });
    expect(f.mock.calls[0][1].headers['If-None-Match']).toBe('*');
    expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-token');
    expect(f.mock.calls[0][1].body).not.toContain('secret-token');

    await publishTemplate('toyota_camry_2020', payload, { kind: 'update', version: 7 });
    expect(f.mock.calls[1][1].headers['If-Match']).toBe('"7"');
  });

  it('maps 422 to validation errors and 412 to a conflict', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ errors: ['template: unknown attribute "nope"'] }),
      }),
    );
    expect(
      await publishTemplate('toyota_camry_2020', payload, { kind: 'create' }),
    ).toEqual({
      ok: false,
      kind: 'validation',
      errors: ['template: unknown attribute "nope"'],
    });

    mockFetch(
      jest.fn().mockResolvedValue({
        ok: false,
        status: 412,
        json: async () => ({
          error: 'expected version 6 but the current version is 7',
          expected: 6,
          actual: 7,
        }),
      }),
    );
    expect(
      await publishTemplate('toyota_camry_2020', payload, { kind: 'update', version: 6 }),
    ).toEqual({
      ok: false,
      kind: 'conflict',
      expected: 6,
      actual: 7,
    });
  });

  it('refuses a payload over the worker 64KB cap before spending a request', async () => {
    const f = mockFetch(jest.fn());
    const fat = {
      ...payload,
      trims: Array.from({ length: 4000 }, (_, i) => ({ name: `T${i}`, attributes: {} })),
    };
    const result = await publishTemplate(
      'toyota_camry_2020',
      fat as unknown as TemplatePayload,
      { kind: 'create' },
    );
    expect(result).toMatchObject({ ok: false, kind: 'too-large' });
    expect(f).not.toHaveBeenCalled();
  });

  it('fetches the vocabulary from the worker, not from a vendored copy', async () => {
    const f = mockFetch(
      jest
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ id: 'vehicle', name: 'Vehicle', attributes: [] }),
        }),
    );
    await fetchVocabulary();
    expect(f.mock.calls[0][0]).toContain('/schema/device-type-vehicle.json');
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npx jest __tests__/unit/services/definitions.test.ts`
Expected: FAIL — `Cannot find module '@/services/definitions'`.

- [ ] **Step 6: Implement the client**

Create `src/services/definitions.ts`:

```ts
import config from '@/config';
import type { DeviceType, Template, TemplatePayload } from '@/types/template';

// definitions-worker/src/index.ts MAX_DOC_BYTES. Checked here so an oversized
// draft is reported in the editor rather than as an opaque 413 after a
// round trip.
const MAX_DOC_BYTES = 64 * 1024;

// Gate ①: WRITE_TOKEN must never reach a browser bundle. A convention is not
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

export async function fetchTemplate(id: string): Promise<Template | null> {
  assertServer();
  const resp = await fetch(`${config.definitionsWorkerUrl}/t/${encodeURIComponent(id)}`, {
    // A template's ETag is its version, and the editor's whole conflict story
    // depends on holding the current one. Never serve this from a cache.
    cache: 'no-store',
  });
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
  if (!resp.ok)
    throw new Error(
      `definitions-worker GET /schema/device-type-vehicle.json returned ${resp.status}`,
    );
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
```

- [ ] **Step 7: Run the tests**

Run: `npx jest __tests__/unit/services/definitions.test.ts && npm run compile`
Expected: PASS, 6 tests; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/config src/types scripts/gen-template-types.mjs src/services/definitions.ts \
  __tests__/unit/services/definitions.test.ts package.json package-lock.json README.md
git commit -m "feat(templates): typed, server-only client for definitions-worker

Types are generated from the worker's schema rather than hand-written a third
time, and the vocabulary is fetched at runtime so the editor form cannot offer
an option the validator rejects. A runtime guard makes the server-only rule a
guarantee instead of a convention: DEFINITIONS_WRITE_TOKEN cannot reach a
browser bundle without throwing."
```

---

### Task 5: The divergence model

The heart of the feature, and pure — no React, no fetch, no dates. Every edit
returns a new template. If this module is right, the UI is a rendering of it;
if it is wrong, no amount of UI hides it.

Two invariants it enforces so the UI cannot violate them:

1. **An attribute is on the template or on the trims, never both.** Editing one
   trim's value for a currently-shared attribute pushes that value down to
   every trim first. Setting a shared value clears it from every trim.
2. **Absent is not empty.** Clearing removes the key. `undefined` is the only
   representation of "not set"; `''` never enters a template.

**Files:**

- Create: `src/utils/templateGrid.ts`
- Create: `src/utils/__tests__/fixtures/toyota_camry_2020.json` (copy of `definitions-worker/schema/examples/toyota_camry_2020.json`)
- Create: `src/utils/__tests__/fixtures/vehicleVocab.ts`
- Test: `src/utils/__tests__/templateGrid.test.ts`

**Interfaces:**

- Consumes: `Template`, `Trim`, `TrimSelectors`, `AttributeValue`, `AttributeDef`, `DeviceType`, `TemplatePayload` from `@/types/template`.
- Produces:
  - `buildGrid(template: Template, vocab: DeviceType): Grid`
  - `Grid { trims: Trim[]; rows: GridRow[] }`
  - `GridRow { def: AttributeDef; scope: 'shared' | 'trim' | 'absent'; shared?: AttributeValue; cells: (AttributeValue | undefined)[]; distinct: number; absentCount: number; canLift: boolean }`
  - `setShared`, `clearShared`, `setTrimValue`, `clearTrimValue`, `liftToShared`, `pushDownToTrims`, `addTrim`, `removeTrim`, `renameTrim`, `setSelectors`, `setHardwareTemplateId` — all `(template, ...args) => Template`
  - `hasEffectiveSelector(selectors?: TrimSelectors): boolean`
  - `toPayload(template: Template): TemplatePayload`

- [ ] **Step 1: Copy the fixtures**

```bash
mkdir -p src/utils/__tests__/fixtures
cp ../definitions-worker/schema/examples/toyota_camry_2020.json src/utils/__tests__/fixtures/
```

Create `src/utils/__tests__/fixtures/vehicleVocab.ts` holding the 14 attribute
definitions from `definitions-worker/schema/device-type-vehicle.json`, typed as
`DeviceType`. Copy them verbatim — `powertrain_type`, `fuel_type`,
`driven_wheels`, `vehicle_type`, `number_of_doors`, `base_msrp`,
`fuel_tank_capacity_gal`, `battery_capacity_kwh`, `mpg_city`, `mpg_highway`,
`mpg_combined`, `wheelbase_in`, `manufacturer_code`, `emissions_standard` —
with their `label`, `type`, `unit`, `options`, `minimum`, `maximum` and
`variesByTrim` exactly as the JSON has them. This is a test fixture; the
running app always fetches the live vocabulary.

- [ ] **Step 2: Write the failing tests**

Create `src/utils/__tests__/templateGrid.test.ts`:

```ts
import camry from './fixtures/toyota_camry_2020.json';
import { vehicleVocab } from './fixtures/vehicleVocab';
import {
  buildGrid,
  setShared,
  clearShared,
  setTrimValue,
  clearTrimValue,
  liftToShared,
  pushDownToTrims,
  addTrim,
  removeTrim,
  hasEffectiveSelector,
  toPayload,
} from '../templateGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;
const row = (tpl: Template, name: string) =>
  buildGrid(tpl, vehicleVocab).rows.find((r) => r.def.name === name)!;

describe('buildGrid', () => {
  it('renders every vocabulary attribute, including ones the template does not set', () => {
    const grid = buildGrid(t, vehicleVocab);
    expect(grid.rows).toHaveLength(vehicleVocab.attributes.length);
    expect(grid.rows.map((r) => r.def.name)).toEqual(
      vehicleVocab.attributes.map((a) => a.name),
    );
    expect(row(t, 'emissions_standard').scope).toBe('absent');
  });

  it('names the two attributes the production record blended', () => {
    // toyota_camry_2020 in production says powertrain_type ICE with hybrid
    // tank and mpg figures. In the template those are the divergent rows, and
    // this test is the regression that says so.
    expect(row(t, 'powertrain_type').distinct).toBeGreaterThan(1);
    expect(row(t, 'fuel_tank_capacity_gal').distinct).toBeGreaterThan(1);
  });

  it('counts shared attributes as one value and offers no lift', () => {
    const doors = row(t, 'number_of_doors');
    expect(doors.scope).toBe('shared');
    expect(doors.shared).toBe(4);
    expect(doors.distinct).toBe(1);
    expect(doors.canLift).toBe(false);
  });

  it('offers a lift only when every trim agrees and none is absent', () => {
    const agreed = setTrimValue(t, 0, 'mpg_highway', 39);
    let all = agreed;
    all.trims.forEach((_, i) => {
      all = setTrimValue(all, i, 'mpg_highway', 39);
    });
    expect(row(all, 'mpg_highway').canLift).toBe(true);

    const oneMissing = clearTrimValue(all, 3, 'mpg_highway');
    expect(row(oneMissing, 'mpg_highway').canLift).toBe(false);
    expect(row(oneMissing, 'mpg_highway').absentCount).toBe(1);
  });
});

describe('the template-or-trim invariant', () => {
  it('setting one trim value pushes a shared attribute down to every trim first', () => {
    const next = setTrimValue(t, 0, 'number_of_doors', 2);
    expect(next.attributes.number_of_doors).toBeUndefined();
    expect(next.trims[0].attributes.number_of_doors).toBe(2);
    next.trims
      .slice(1)
      .forEach((trim) => expect(trim.attributes.number_of_doors).toBe(4));
  });

  it('setting a shared value clears the attribute from every trim', () => {
    const next = setShared(t, 'powertrain_type', 'ICE');
    expect(next.attributes.powertrain_type).toBe('ICE');
    next.trims.forEach((trim) => expect(trim.attributes.powertrain_type).toBeUndefined());
  });

  it('lift and push down are inverses', () => {
    const pushed = pushDownToTrims(t, 'number_of_doors');
    expect(pushed.attributes.number_of_doors).toBeUndefined();
    const lifted = liftToShared(pushed, 'number_of_doors');
    expect(lifted.attributes.number_of_doors).toBe(4);
    lifted.trims.forEach((trim) =>
      expect(trim.attributes.number_of_doors).toBeUndefined(),
    );
  });

  it('never mutates the template it was given', () => {
    const before = JSON.stringify(t);
    setTrimValue(t, 0, 'mpg_city', 99);
    setShared(t, 'mpg_city', 99);
    clearShared(t, 'number_of_doors');
    removeTrim(t, 0);
    expect(JSON.stringify(t)).toBe(before);
  });
});

describe('absent is not empty', () => {
  it('clearing removes the key rather than storing an empty value', () => {
    const cleared = clearTrimValue(t, 0, 'mpg_city');
    expect('mpg_city' in cleared.trims[0].attributes).toBe(false);
    expect(JSON.stringify(cleared)).not.toContain('""');
  });

  it('toPayload drops server-owned fields and empty selector containers', () => {
    const withEmpties = setSelectorsForTest(t);
    const payload = toPayload(withEmpties) as Record<string, unknown>;
    expect(payload.version).toBeUndefined();
    expect(payload.createdAt).toBeUndefined();
    expect(payload.updatedAt).toBeUndefined();
    expect(payload.author).toBeUndefined();
    const trims = payload.trims as { selectors?: unknown }[];
    expect(trims[0].selectors).toBeUndefined();
  });
});

describe('hasEffectiveSelector — gate 4', () => {
  it.each([
    [undefined, false],
    [{}, false],
    [{ manufacturerCode: [] }, false],
    [{ manufacturerCode: [''] }, false],
    [{ manufacturerCode: ['   '] }, false],
    [{ styleName: [''] }, false],
    [{ vinPattern: '' }, false],
    [{ vinPattern: '   ' }, false],
    [{ manufacturerCode: ['2532'] }, true],
    [{ styleName: ['Hybrid LE'] }, true],
    [{ vinPattern: '^4T1B11HK.*$' }, true],
  ])('%p -> %p', (selectors, expected) => {
    expect(hasEffectiveSelector(selectors as never)).toBe(expected);
  });
});

describe('trims', () => {
  it('addTrim appends an empty, selector-less, uniquely named trim', () => {
    const next = addTrim(t, 'XLE V6');
    expect(next.trims).toHaveLength(t.trims.length + 1);
    expect(next.trims.at(-1)).toEqual({ name: 'XLE V6', attributes: {} });
  });

  it('removeTrim keeps at least one trim', () => {
    const single = { ...t, trims: [t.trims[0]] };
    expect(removeTrim(single, 0).trims).toHaveLength(1);
  });
});

// Helper: puts a degenerate selector on trim 0 so toPayload has something to drop.
function setSelectorsForTest(template: Template): Template {
  const trims = template.trims.map((trim, i) =>
    i === 0 ? { ...trim, selectors: { manufacturerCode: [''] } } : trim,
  );
  return { ...template, trims };
}
```

- [ ] **Step 3: Run and watch it fail**

Run: `npx jest src/utils/__tests__/templateGrid.test.ts`
Expected: FAIL — `Cannot find module '../templateGrid'`.

- [ ] **Step 4: Implement the model**

Create `src/utils/templateGrid.ts`:

```ts
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
  if (selectors.vinPattern && selectors.vinPattern.trim().length > 0)
    out.vinPattern = selectors.vinPattern.trim();
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
  } as TemplatePayload;
}
```

- [ ] **Step 5: Run the tests**

Run: `npx jest src/utils/__tests__/templateGrid.test.ts && npm run compile`
Expected: PASS, all cases; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/utils/templateGrid.ts src/utils/__tests__/
git commit -m "feat(templates): the divergence model

Trims as columns, attributes as rows, and the two contract invariants enforced
in the model rather than left to the UI: an attribute lives on the template or
on the trims and never both, and clearing removes the key rather than storing
an empty value. Editing one trim's value for a shared attribute pushes it down
first, which is what makes divergence expressible at all.

Tested against the real ten-trim Camry, including the regression that
powertrain_type and fuel_tank_capacity_gal are the divergent rows -- the pair
the production record blended."
```

---

### Task 6: Typed coercion, the normalisation report, and the validation mirror

Section 8 of the handoff asks the question this task answers: _when the editor
declines to save something, or quietly normalises it, does the person see that
happen?_ Two modules, one task, because the report is worthless without the
coercion that produces it.

**Files:**

- Create: `src/utils/templateCoerce.ts`
- Create: `src/utils/templateValidate.ts`
- Test: `src/utils/__tests__/templateCoerce.test.ts`
- Test: `src/utils/__tests__/templateValidate.test.ts`

**Interfaces:**

- Consumes: `AttributeDef`, `AttributeValue`, `DeviceType`, `Template` from `@/types/template`; `hasEffectiveSelector` from `@/utils/templateGrid`.
- Produces:
  - `coerce(def: AttributeDef, raw: string): CoerceResult`
  - `CoerceResult = { kind: 'value'; value: AttributeValue; note?: Normalisation } | { kind: 'clear'; note: Normalisation } | { kind: 'error'; message: string }`
  - `Normalisation { attribute: string; from: string; to: AttributeValue | null; reason: string }`
  - `validateDraft(template: Template, vocab: DeviceType): string[]` — the worker's error strings, verbatim, in the worker's order.

- [ ] **Step 1: Write the failing coercion tests**

Create `src/utils/__tests__/templateCoerce.test.ts`:

```ts
import { coerce } from '../templateCoerce';
import { vehicleVocab } from './fixtures/vehicleVocab';

const def = (name: string) => vehicleVocab.attributes.find((a) => a.name === name)!;

describe('coerce', () => {
  it('parses a stringified number into a number and says it did', () => {
    expect(coerce(def('fuel_tank_capacity_gal'), '15.800000')).toEqual({
      kind: 'value',
      value: 15.8,
      note: {
        attribute: 'fuel_tank_capacity_gal',
        from: '15.800000',
        to: 15.8,
        reason: 'stored as the number 15.8, not the text "15.800000"',
      },
    });
  });

  it('does not report a note when nothing was changed', () => {
    expect(coerce(def('mpg_city'), '28')).toEqual({ kind: 'value', value: 28 });
  });

  it('treats an empty or whitespace input as a removal, never as an empty value', () => {
    for (const raw of ['', '   ']) {
      expect(coerce(def('mpg_city'), raw)).toEqual({
        kind: 'clear',
        note: {
          attribute: 'mpg_city',
          from: raw,
          to: null,
          reason: 'cleared — the attribute is removed, not stored empty',
        },
      });
    }
  });

  it('refuses a value outside the vocabulary bounds with the reason', () => {
    expect(coerce(def('mpg_city'), '400')).toEqual({
      kind: 'error',
      message: 'template: "mpg_city" above maximum 200',
    });
  });

  it('refuses a non-integer for an integer attribute', () => {
    expect(coerce(def('number_of_doors'), '4.5')).toEqual({
      kind: 'error',
      message: 'template: "number_of_doors" must be an integer',
    });
  });

  it('refuses a value outside an enum options list', () => {
    expect(coerce(def('powertrain_type'), 'Hybrid')).toEqual({
      kind: 'error',
      message:
        'template: "powertrain_type"="Hybrid" is not one of ["ICE","HEV","PHEV","BEV","FCEV"]',
    });
  });

  it('names the trim when one is given', () => {
    expect(coerce(def('mpg_city'), '400', 'trim LE')).toEqual({
      kind: 'error',
      message: 'trim LE: "mpg_city" above maximum 200',
    });
  });

  it('trims surrounding whitespace on a string attribute and says it did', () => {
    expect(coerce(def('manufacturer_code'), '  2532 ')).toEqual({
      kind: 'value',
      value: '2532',
      note: {
        attribute: 'manufacturer_code',
        from: '  2532 ',
        to: '2532',
        reason: 'surrounding whitespace removed',
      },
    });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx jest src/utils/__tests__/templateCoerce.test.ts`
Expected: FAIL — module not found. (8 cases once implemented.)

- [ ] **Step 3: Implement coercion**

Create `src/utils/templateCoerce.ts`:

```ts
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
 * place the way the worker does -- 'template' or 'trim LE'.
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
```

- [ ] **Step 4: Write the failing validation-mirror tests**

Create `src/utils/__tests__/templateValidate.test.ts`:

```ts
import camry from './fixtures/toyota_camry_2020.json';
import { vehicleVocab } from './fixtures/vehicleVocab';
import { validateDraft } from '../templateValidate';
import { addTrim, setTrimValue, renameTrim, setSelectors } from '../templateGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

describe('validateDraft', () => {
  it('passes the real Camry', () => {
    expect(validateDraft(t, vehicleVocab)).toEqual([]);
  });

  it('reports a selector-less trim on a multi-trim template, in the worker words', () => {
    const withNew = addTrim(t, 'XLE V6');
    expect(validateDraft(withNew, vehicleVocab)).toContain(
      'trim XLE V6: selectors are required — a template with more than one trim cannot have a ' +
        'selector-less trim, which would match every signal and make every decode ambiguous',
    );
  });

  it.each([[{}], [{ manufacturerCode: [''] }], [{ vinPattern: '   ' }]])(
    'treats the degenerate selector %p as no selector at all',
    (selectors) => {
      const withNew = setSelectors(
        addTrim(t, 'XLE V6'),
        t.trims.length,
        selectors as never,
      );
      expect(
        validateDraft(withNew, vehicleVocab).some((e) =>
          e.includes('selectors are required'),
        ),
      ).toBe(true);
    },
  );

  it('accepts a selector-less trim when it is the only trim', () => {
    const single = { ...t, trims: [{ name: 'LE', attributes: {} }] } as Template;
    expect(validateDraft(single, vehicleVocab)).toEqual([]);
  });

  it('reports an attribute on both the template and a trim', () => {
    const both = {
      ...t,
      attributes: { ...t.attributes, powertrain_type: 'ICE' },
    } as Template;
    expect(validateDraft(both, vehicleVocab)).toContain(
      '"powertrain_type" is on both the template and trim LE — pick one',
    );
  });

  it('reports duplicate trim names and duplicate manufacturer codes', () => {
    const dupName = renameTrim(t, 1, t.trims[0].name);
    expect(validateDraft(dupName, vehicleVocab)).toContain(
      `duplicate trim name "${t.trims[0].name}" — trim names must be unique`,
    );

    const code = t.trims[0].selectors!.manufacturerCode![0];
    const dupCode = setSelectors(t, 1, { manufacturerCode: [code] });
    expect(validateDraft(dupCode, vehicleVocab)).toContain(
      `manufacturerCode ${code} is claimed by both "${t.trims[0].name}" and "${t.trims[1].name}"`,
    );
  });

  it('reports an unnamed trim, an empty trims array, and an id/year disagreement', () => {
    expect(validateDraft(renameTrim(t, 0, ''), vehicleVocab)).toContain(
      'each trim needs a name',
    );
    expect(validateDraft({ ...t, trims: [] } as Template, vehicleVocab)).toContain(
      'trims must contain at least one trim',
    );
    expect(validateDraft({ ...t, year: 2021 } as Template, vehicleVocab)).toContain(
      'year 2021 does not match the year in id "toyota_camry_2020"',
    );
  });

  it('reports an out-of-vocabulary value with the trim named', () => {
    const bad = setTrimValue(t, 0, 'mpg_city', 400);
    expect(validateDraft(bad, vehicleVocab)).toContain(
      'trim LE: "mpg_city" above maximum 200',
    );
  });

  it('says nothing about hardwareTemplateId, which is not a vocabulary attribute', () => {
    const hw = { ...t, hardwareTemplateId: '130' } as Template;
    expect(
      validateDraft(hw, vehicleVocab).some((e) => e.includes('hardwareTemplateId')),
    ).toBe(false);
  });
});
```

- [ ] **Step 5: Run and watch it fail**

Run: `npx jest src/utils/__tests__/templateValidate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement the mirror**

Create `src/utils/templateValidate.ts`:

```ts
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
 * authoritative -- the worker is, and the save path surfaces its 422 verbatim.
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
      if (k in templateAttrs)
        errs.push(`"${k}" is on both the template and trim ${name} — pick one`);
    }

    for (const code of trim.selectors?.manufacturerCode ?? []) {
      const prev = seenCodes.get(code);
      if (prev !== undefined)
        errs.push(`manufacturerCode ${code} is claimed by both "${prev}" and "${name}"`);
      else seenCodes.set(code, name);
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
```

- [ ] **Step 7: Run both suites**

Run: `npx jest src/utils/__tests__ && npm run compile`
Expected: PASS; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/utils/templateCoerce.ts src/utils/templateValidate.ts src/utils/__tests__/
git commit -m "feat(templates): typed coercion, normalisation report, validation mirror

Every difference between what someone types and what gets stored produces a
Normalisation the editor shows before save -- a reparsed number, trimmed
whitespace, a cleared attribute that removes the key. The validation mirror
uses the worker's own error strings so one fault is never described two ways;
it is explicitly not authoritative, and the save path still surfaces the
worker's 422 verbatim."
```

---

### Task 7: The grid

The signature of the design: **agreement recedes, difference advances.** Trims
are columns, attributes are rows, values shared across trims render muted, and
values that differ render at full contrast. On the real Camry the eye lands on
`powertrain_type` and `fuel_tank_capacity_gal` — the exact pair the production
record blended. This is the inverse of normal form emphasis and it is the point.

**Interactive prototype:** https://claude.ai/code/artifact/86e47b18-10ed-43cb-b65f-0760f7521615 —
built on the real ten-trim Camry. Read it before writing the component; it is
the reference for spacing, contrast and the rail.

Three supporting devices, each encoding a contract rule rather than decorating:
the **divergence rail** (a count, offering _Move to shared_ at 1, because that is
the correct action under the template-or-trim rule); **trim codes in mono**
(the model keys trims on `manufacturerCode`, so it reads as an identifier, and a
trim without one shows `no selector` in the error colour — gate ④ as a
validation state rather than a discovery at save); and **`—` for not set**,
which is a different thing from empty.

**Files:**

- Create: `src/components/TemplateEditor/TrimGrid/TrimGrid.tsx`, `index.ts`
- Create: `src/components/TemplateEditor/TrimGrid/TemplateCell.tsx`
- Create: `src/components/TemplateEditor/TrimGrid/TrimHeader.tsx`
- Create: `src/components/TemplateEditor/DivergenceRail/DivergenceRail.tsx`, `index.ts`
- Test: `src/components/TemplateEditor/__tests__/TrimGrid.test.tsx`

**Interfaces:**

- Consumes: `buildGrid`, `liftToShared`, `setShared`, `clearShared`, `setTrimValue`, `clearTrimValue`, `hasEffectiveSelector` from `@/utils/templateGrid`; `coerce`, `Normalisation` from `@/utils/templateCoerce`.
- Produces: `<TrimGrid template vocab readOnly? onChange onNormalise />` where `onChange: (next: Template) => void` and `onNormalise: (note: Normalisation) => void`.

- [ ] **Step 1: Write the failing grid tests**

Create `src/components/TemplateEditor/__tests__/TrimGrid.test.tsx`:

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import camry from '@/utils/__tests__/fixtures/toyota_camry_2020.json';
import { vehicleVocab } from '@/utils/__tests__/fixtures/vehicleVocab';
import { TrimGrid } from '@/components/TemplateEditor/TrimGrid';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;
const noop = () => {};

const renderGrid = (props: Partial<React.ComponentProps<typeof TrimGrid>> = {}) =>
  render(
    <TrimGrid
      template={t}
      vocab={vehicleVocab}
      onChange={noop}
      onNormalise={noop}
      {...props}
    />,
  );

describe('TrimGrid', () => {
  it('gives every trim a column and every vocabulary attribute a row', () => {
    renderGrid();
    t.trims.forEach((trim) =>
      expect(
        screen.getByRole('columnheader', { name: new RegExp(trim.name) }),
      ).toBeInTheDocument(),
    );
    vehicleVocab.attributes.forEach((a) =>
      expect(
        screen.getByRole('rowheader', { name: new RegExp(a.label) }),
      ).toBeInTheDocument(),
    );
  });

  it('mutes agreement and advances difference', () => {
    renderGrid();
    // powertrain_type differs across the Camry's ten trims: full contrast.
    const diverging = screen.getByTestId('cell-powertrain_type-0');
    expect(diverging.className).toContain('text-white');
    expect(diverging.className).not.toContain('text-white/');
    // number_of_doors is shared by every trim: muted.
    expect(screen.getByTestId('shared-number_of_doors').className).toContain(
      'text-white/40',
    );
  });

  it('shows an em dash, not an empty cell, where nothing is set', () => {
    renderGrid();
    const cell = screen.getByTestId('shared-emissions_standard');
    expect(cell).toHaveTextContent('—');
    expect(cell.className).toContain('text-white/25');
  });

  it('reads the divergence count off the rail, and offers no lift while trims disagree', () => {
    renderGrid();
    expect(screen.getByTestId('rail-powertrain_type')).toHaveTextContent('2');
    expect(
      within(screen.getByTestId('rail-powertrain_type')).queryByRole('button'),
    ).toBeNull();
  });

  it('offers Move to shared once every trim agrees, and lifts on click', () => {
    const onChange = jest.fn();
    const agreed = {
      ...t,
      attributes: {},
      trims: t.trims.map((trim) => ({
        ...trim,
        attributes: { ...trim.attributes, number_of_doors: 4 },
      })),
    } as Template;
    render(
      <TrimGrid
        template={agreed}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={noop}
      />,
    );
    fireEvent.click(
      within(screen.getByTestId('rail-number_of_doors')).getByRole('button', {
        name: /move to shared/i,
      }),
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ number_of_doors: 4 }),
      }),
    );
  });

  it('marks a trim with no effective selector, which is gate 4', () => {
    const broken = {
      ...t,
      trims: [
        ...t.trims,
        { name: 'XLE V6', attributes: {}, selectors: { manufacturerCode: [''] } },
      ],
    } as Template;
    render(
      <TrimGrid
        template={broken}
        vocab={vehicleVocab}
        onChange={noop}
        onNormalise={noop}
      />,
    );
    const header = screen.getByRole('columnheader', { name: /XLE V6/ });
    expect(header).toHaveTextContent('no selector');
    expect(within(header).getByText('no selector').className).toContain('text-red-400');
  });

  it('offers exactly the vocabulary options for an enum, plus not set', () => {
    renderGrid();
    const select = within(screen.getByTestId('cell-powertrain_type-0')).getByRole(
      'combobox',
    );
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['—', 'ICE', 'HEV', 'PHEV', 'BEV', 'FCEV']);
  });

  it('types a value, reports the reparse, and never stores the text', () => {
    const onChange = jest.fn();
    const onNormalise = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={onNormalise}
      />,
    );
    const input = within(screen.getByTestId('cell-fuel_tank_capacity_gal-0')).getByRole(
      'textbox',
    );
    fireEvent.change(input, { target: { value: '15.800000' } });
    fireEvent.blur(input);
    expect(onChange.mock.calls[0][0].trims[0].attributes.fuel_tank_capacity_gal).toBe(
      15.8,
    );
    expect(onNormalise).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: 'fuel_tank_capacity_gal', to: 15.8 }),
    );
  });

  it('clearing a cell removes the attribute and says so', () => {
    const onChange = jest.fn();
    const onNormalise = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={onNormalise}
      />,
    );
    const input = within(screen.getByTestId('cell-mpg_city-0')).getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect('mpg_city' in onChange.mock.calls[0][0].trims[0].attributes).toBe(false);
    expect(onNormalise).toHaveBeenCalledWith(expect.objectContaining({ to: null }));
  });

  it('refuses an out-of-range value in the worker words and does not change the template', () => {
    const onChange = jest.fn();
    render(
      <TrimGrid
        template={t}
        vocab={vehicleVocab}
        onChange={onChange}
        onNormalise={noop}
      />,
    );
    const cell = screen.getByTestId('cell-mpg_city-0');
    fireEvent.change(within(cell).getByRole('textbox'), { target: { value: '400' } });
    fireEvent.blur(within(cell).getByRole('textbox'));
    expect(onChange).not.toHaveBeenCalled();
    expect(cell).toHaveTextContent('trim LE: "mpg_city" above maximum 200');
  });

  it('renders no inputs when read only', () => {
    renderGrid({ readOnly: true });
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx jest src/components/TemplateEditor`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TrimHeader`**

Create `src/components/TemplateEditor/TrimGrid/TrimHeader.tsx`:

```tsx
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
```

- [ ] **Step 4: Implement `DivergenceRail`**

Create `src/components/TemplateEditor/DivergenceRail/DivergenceRail.tsx`:

```tsx
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
 * template-or-trim rule is to move it up -- so that is what the rail offers,
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
```

Create `src/components/TemplateEditor/DivergenceRail/index.ts`:

```ts
export * from './DivergenceRail';
```

- [ ] **Step 5: Implement `TemplateCell`**

Create `src/components/TemplateEditor/TrimGrid/TemplateCell.tsx`:

```tsx
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
    value === undefined ? 'text-white/25' : emphasised ? 'text-white' : 'text-white/40';

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
      <div data-testid={testId} className={classnames('px-3 py-2', tone)}>
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
          className={classnames('w-full rounded-md bg-dark-grey-950 px-2 py-1', tone)}
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
          className={classnames('w-full rounded-md bg-dark-grey-950 px-2 py-1', tone)}
        />
      )}
      {error && <p className="pt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};
```

- [ ] **Step 6: Implement `TrimGrid`**

Create `src/components/TemplateEditor/TrimGrid/TrimGrid.tsx`:

```tsx
import React, { type FC } from 'react';
import type { DeviceType, Template } from '@/types/template';
import type { Normalisation } from '@/utils/templateCoerce';
import {
  buildGrid,
  clearShared,
  clearTrimValue,
  liftToShared,
  setShared,
  setTrimValue,
} from '@/utils/templateGrid';
import { DivergenceRail } from '@/components/TemplateEditor/DivergenceRail';
import { TemplateCell } from './TemplateCell';
import { TrimHeader } from './TrimHeader';

export interface TrimGridProps {
  template: Template;
  vocab: DeviceType;
  readOnly?: boolean;
  onChange: (next: Template) => void;
  onNormalise: (note: Normalisation) => void;
}

export const TrimGrid: FC<TrimGridProps> = ({
  template,
  vocab,
  readOnly,
  onChange,
  onNormalise,
}) => {
  const grid = buildGrid(template, vocab);
  const multiTrim = template.trims.length > 1;

  return (
    <div className="overflow-x-auto rounded-xl border border-cta-default bg-surface-default">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-sunken">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-surface-sunken px-3 py-2 text-left text-white/50"
            >
              Attribute
            </th>
            <th scope="col" className="px-3 py-2 text-left text-white/50">
              Values
            </th>
            {template.trims.map((trim, i) => (
              <th
                key={`${trim.name}-${i}`}
                scope="col"
                className="border-l border-cta-default align-top"
              >
                <TrimHeader trim={trim} multiTrim={multiTrim} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.def.name} className="border-t border-cta-default">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-surface-default px-3 py-2 text-left font-normal text-white/70"
              >
                {row.def.label}
                {row.def.unit && (
                  <span className="pl-1 text-white/40">({row.def.unit})</span>
                )}
              </th>
              <td data-testid={`rail-${row.def.name}`} className="px-3 py-2">
                <DivergenceRail
                  row={row}
                  readOnly={readOnly}
                  onLift={(n) => onChange(liftToShared(template, n))}
                />
              </td>
              {row.scope === 'trim' ? (
                template.trims.map((trim, i) => (
                  <td
                    key={`${trim.name}-${i}`}
                    className="border-l border-cta-default align-top"
                  >
                    <TemplateCell
                      def={row.def}
                      value={row.cells[i]}
                      where={`trim ${trim.name || '?'}`}
                      emphasised={row.distinct > 1}
                      readOnly={readOnly}
                      testId={`cell-${row.def.name}-${i}`}
                      onSet={(v) => onChange(setTrimValue(template, i, row.def.name, v))}
                      onClear={() => onChange(clearTrimValue(template, i, row.def.name))}
                      onNormalise={onNormalise}
                    />
                  </td>
                ))
              ) : (
                // One value, stated once, spanning every trim -- the visual form
                // of "this is true of the whole model-year".
                <td
                  colSpan={template.trims.length}
                  className="border-l border-cta-default align-top"
                >
                  <TemplateCell
                    def={row.def}
                    value={row.shared}
                    where="template"
                    emphasised={false}
                    readOnly={readOnly}
                    testId={`shared-${row.def.name}`}
                    onSet={(v) => onChange(setShared(template, row.def.name, v))}
                    onClear={() => onChange(clearShared(template, row.def.name))}
                    onNormalise={onNormalise}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

Create `src/components/TemplateEditor/TrimGrid/index.ts`:

```ts
export * from './TrimGrid';
```

- [ ] **Step 7: Run the tests**

Run: `npx jest src/components/TemplateEditor && npm run compile && npm run lint`
Expected: PASS, 12 tests; typecheck and lint clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/TemplateEditor
git commit -m "feat(templates): the trim grid

Trims as columns, attributes as rows, agreement muted and difference at full
contrast -- the inverse of normal form emphasis, so the pair of attributes the
production Camry record blended is the pair the eye lands on. The divergence
rail offers Move to shared at one distinct value because that is the correct
action under the template-or-trim rule, and a trim with no effective selector
is marked in the header rather than discovered at save."
```

---

### Task 8: Browse — and say what has no template

**Files:**

- Create: `src/app/templates/layout.ts`, `src/app/templates/page.tsx`
- Create: `src/app/templates/templatesPage/View/View.tsx`, `index.ts`
- Create: `src/app/templates/templatesPage/Header/Header.tsx`, `index.ts`
- Create: `src/app/api/templates/route.ts`
- Create: `src/hooks/queries/useTemplateSearch.ts`
- Modify: `src/config/navigation.ts`
- Test: `__tests__/unit/app/templatesSearchRoute.test.ts`

**Interfaces:**

- Consumes: `fetchTemplate` from `@/services/definitions`; identity-api at `config.identityApiUrl`.
- Produces:
  - `GET /api/templates?make=<name-or-slug>&model=<string>&year=<int>` → `{ manufacturer: { name, tokenId } | null, results: SearchResult[] }`
  - `SearchResult { id: string; model: string; year: number; status: 'ok' | 'missing' | 'invalid-id'; version?: number; trims?: number }`
  - `useTemplateSearch({ make, model, year })` → TanStack Query wrapper

Three states, all real, none an error to hide:

- `ok` — a template exists; show its version and trim count.
- `missing` — the definition exists but no template has been imported. **5,152 of the emitted set carry no attributes and the import has not run in production at all**, so this is the common case, not a fault.
- `invalid-id` — the device definition id cannot be a template id. `subaru_tribeca-(ny/nj)_2008` is live in production today and 137 ids like it fail the schema; whether to widen the pattern or correct the ids is undecided. Show it, say why it cannot be edited, and do not pretend it is missing.

- [ ] **Step 1: Write the failing route test**

Create `__tests__/unit/app/templatesSearchRoute.test.ts`:

```ts
import { GET } from '@/app/api/templates/route';
import { NextRequest } from 'next/server';

jest.mock('@/services/definitions', () => ({
  fetchTemplate: jest.fn(),
}));
import { fetchTemplate } from '@/services/definitions';

const identityResponse = {
  data: {
    manufacturer: {
      name: 'Toyota',
      tokenId: 131,
      deviceDefinitions: {
        nodes: [
          { deviceDefinitionId: 'toyota_camry_2020', model: 'Camry', year: 2020 },
          { deviceDefinitionId: 'toyota_supra_2020', model: 'Supra', year: 2020 },
        ],
      },
    },
  },
};

const req = (qs: string) => new NextRequest(`https://console.test/api/templates?${qs}`);

describe('GET /api/templates', () => {
  beforeEach(() => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => identityResponse,
      }) as unknown as typeof fetch;
  });

  it('requires a make', async () => {
    expect((await GET(req('model=Camry'))).status).toBe(400);
  });

  it('marks a definition with no template as missing rather than failing', async () => {
    (fetchTemplate as jest.Mock)
      .mockResolvedValueOnce({ id: 'toyota_camry_2020', version: 3, trims: [{}, {}] })
      .mockResolvedValueOnce(null);
    const body = await (await GET(req('make=Toyota&model=Camry&year=2020'))).json();
    expect(body.results).toEqual([
      {
        id: 'toyota_camry_2020',
        model: 'Camry',
        year: 2020,
        status: 'ok',
        version: 3,
        trims: 2,
      },
      { id: 'toyota_supra_2020', model: 'Supra', year: 2020, status: 'missing' },
    ]);
  });

  it('marks an id the schema cannot accept, without asking the worker about it', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          manufacturer: {
            name: 'Subaru',
            tokenId: 1,
            deviceDefinitions: {
              nodes: [
                {
                  deviceDefinitionId: 'subaru_tribeca-(ny/nj)_2008',
                  model: 'Tribeca',
                  year: 2008,
                },
              ],
            },
          },
        },
      }),
    }) as unknown as typeof fetch;
    (fetchTemplate as jest.Mock).mockClear();
    const body = await (await GET(req('make=Subaru'))).json();
    expect(body.results[0].status).toBe('invalid-id');
    expect(fetchTemplate).not.toHaveBeenCalled();
  });

  it('reports an unknown manufacturer as null rather than an empty result set', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { manufacturer: null } }),
      }) as unknown as typeof fetch;
    const body = await (await GET(req('make=Nope'))).json();
    expect(body).toEqual({ manufacturer: null, results: [] });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx jest __tests__/unit/app/templatesSearchRoute.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the search route**

Create `src/app/api/templates/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import config from '@/config';
import { fetchTemplate } from '@/services/definitions';

// definitions-worker/schema/template.schema.json, properties.id.pattern.
const ID_RE = /^[a-z0-9][a-z0-9._&+-]*_[a-z0-9._&+-]+_[0-9]{4}$/;

// Identity's DeviceDefinitionFilter takes model and year only, and
// ManufacturerBy takes a name or a slug -- so "make" here is whichever the
// person typed, tried as a slug first because that is what a template id
// carries.
const SEARCH = `
  query TemplateSearch($by: ManufacturerBy!, $filterBy: DeviceDefinitionFilter, $first: Int!) {
    manufacturer(by: $by) {
      name
      tokenId
      deviceDefinitions(filterBy: $filterBy, first: $first) {
        nodes { deviceDefinitionId model year }
      }
    }
  }`;

const PAGE = 25;

export interface SearchResult {
  id: string;
  model: string;
  year: number;
  status: 'ok' | 'missing' | 'invalid-id';
  version?: number;
  trims?: number;
}

async function queryIdentity(
  by: Record<string, string>,
  filterBy: Record<string, unknown>,
) {
  const resp = await fetch(config.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SEARCH, variables: { by, filterBy, first: PAGE } }),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`identity-api returned ${resp.status}`);
  const json = (await resp.json()) as {
    data?: {
      manufacturer?: {
        name: string;
        tokenId: number;
        deviceDefinitions: {
          nodes: { deviceDefinitionId: string; model: string; year: number }[];
        };
      } | null;
    };
  };
  return json.data?.manufacturer ?? null;
}

export async function GET(req: NextRequest) {
  const make = req.nextUrl.searchParams.get('make');
  const model = req.nextUrl.searchParams.get('model');
  const yearParam = req.nextUrl.searchParams.get('year');
  if (!make) return NextResponse.json({ error: 'make is required' }, { status: 400 });

  const filterBy: Record<string, unknown> = {};
  if (model) filterBy.model = model;
  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isInteger(year))
      return NextResponse.json({ error: 'year must be an integer' }, { status: 400 });
    filterBy.year = year;
  }

  try {
    const manufacturer =
      (await queryIdentity({ slug: make.toLowerCase() }, filterBy)) ??
      (await queryIdentity({ name: make }, filterBy));
    if (!manufacturer) return NextResponse.json({ manufacturer: null, results: [] });

    const results = await Promise.all(
      manufacturer.deviceDefinitions.nodes.map(async (node): Promise<SearchResult> => {
        const base = { id: node.deviceDefinitionId, model: node.model, year: node.year };
        // 137 ids in production cannot be template ids -- subaru_tribeca-(ny/nj)_2008
        // is live today. Saying so beats asking the worker a question whose
        // answer would be a misleading 404.
        if (!ID_RE.test(node.deviceDefinitionId))
          return { ...base, status: 'invalid-id' };
        const template = await fetchTemplate(node.deviceDefinitionId);
        // A missing template is a real state: the import has not run in
        // production, and 5,152 of the emitted set carry no attributes.
        if (!template) return { ...base, status: 'missing' };
        return {
          ...base,
          status: 'ok',
          version: template.version,
          trims: template.trims.length,
        };
      }),
    );

    return NextResponse.json({
      manufacturer: { name: manufacturer.name, tokenId: manufacturer.tokenId },
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'search failed' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 4: Run the route tests**

Run: `npx jest __tests__/unit/app/templatesSearchRoute.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Build the page**

Create `src/app/templates/layout.ts` (identical to `src/app/webhooks/layout.ts`):

```ts
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export default AuthorizedLayout;
```

Create `src/app/templates/page.tsx`:

```tsx
'use client';

import React, { Suspense, type FC } from 'react';

import { TemplatesPage as View } from './templatesPage/View';

const TemplatesPage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <View />
  </Suspense>
);

export default TemplatesPage;
```

Create `src/hooks/queries/useTemplateSearch.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import type { SearchResult } from '@/app/api/templates/route';

export interface TemplateSearch {
  manufacturer: { name: string; tokenId: number } | null;
  results: SearchResult[];
}

export const useTemplateSearch = (params: {
  make: string;
  model: string;
  year: string;
}) =>
  useQuery<TemplateSearch>({
    queryKey: ['template-search', params],
    enabled: params.make.trim().length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const qs = new URLSearchParams({ make: params.make });
      if (params.model) qs.set('model', params.model);
      if (params.year) qs.set('year', params.year);
      const resp = await fetch(`/api/templates?${qs}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Search failed');
      return json as TemplateSearch;
    },
  });
```

Create `src/app/templates/templatesPage/Header/Header.tsx` (mirroring
`src/app/webhooks/webhooksPage/Header/Header.tsx` — read that file and match its
structure and copy) with the title "Vehicle templates" and the subtitle
"One model-year, and the trims it shipped in."

Create `src/app/templates/templatesPage/View/View.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/app/templates/templatesPage/Header';
import { useTemplateSearch } from '@/hooks/queries/useTemplateSearch';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Button } from '@/components/Button';

const STATUS_COPY: Record<string, { label: string; className: string; hint: string }> = {
  'ok': { label: 'Template', className: 'text-white', hint: '' },
  'missing': {
    label: 'No template yet',
    className: 'text-white/50',
    hint: 'This model-year exists but no template has been imported for it.',
  },
  'invalid-id': {
    label: 'Id cannot be a template',
    className: 'text-red-400',
    hint: 'This device definition id does not match the template id pattern, so it cannot be edited until the id is corrected.',
  },
};

export const TemplatesPage = () => {
  const [form, setForm] = useState({ make: '', model: '', year: '' });
  const [query, setQuery] = useState(form);
  const { data, isLoading, error } = useTemplateSearch(query);

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(form);
        }}
      >
        {(['make', 'model', 'year'] as const).map((field) => (
          <label key={field} className="flex flex-col gap-1 text-white/50">
            <span className="text-xs uppercase tracking-wide">{field}</span>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={
                field === 'make' ? 'Toyota' : field === 'model' ? 'Camry' : '2020'
              }
              className="h-10 rounded-full bg-dark-grey-950 px-4 text-white placeholder:text-white/25"
            />
          </label>
        ))}
        <Button type="submit">Search</Button>
      </form>

      <QueryPageWrapper
        loading={isLoading}
        error={error ?? undefined}
        customErrorMessage="There was a problem searching device definitions"
      >
        {data && !data.manufacturer && (
          <p className="text-white/50">No manufacturer matched that name or slug.</p>
        )}
        <ul className="flex flex-col divide-y divide-cta-default rounded-xl border border-cta-default bg-surface-default">
          {(data?.results ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex flex-col">
                <span className="font-mono text-white">{r.id}</span>
                <span className={`text-xs ${STATUS_COPY[r.status].className}`}>
                  {STATUS_COPY[r.status].label}
                  {r.status === 'ok' &&
                    ` · v${r.version} · ${r.trims} trim${r.trims === 1 ? '' : 's'}`}
                </span>
                {STATUS_COPY[r.status].hint && (
                  <span className="pt-1 text-xs text-white/40">
                    {STATUS_COPY[r.status].hint}
                  </span>
                )}
              </div>
              {r.status !== 'invalid-id' && (
                <Link href={`/templates/${r.id}`} className="button">
                  {r.status === 'ok' ? 'Open' : 'Create'}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </QueryPageWrapper>
    </div>
  );
};
```

Create `src/app/templates/templatesPage/View/index.ts`:

```ts
export * from './View';
```

- [ ] **Step 6: Put it in the navigation**

A page nobody can reach is not shipped. In `src/config/navigation.ts`:

```ts
import { CarRentalIcon } from '@/components/Icons';

const TEMPLATE_EDIT_REGEX = /^\/templates\/[^/]+$/;
```

add to `getPageTitle`, before the final `return`:

```ts
if (path === '/templates/new') return 'New template';
if (TEMPLATE_EDIT_REGEX.test(path)) return 'Edit template';
```

add to `pageTitles`:

```ts
  '/templates': 'Vehicle templates',
```

and add to `baseMainMenu`, immediately after the Webhooks entry:

```ts
  {
    label: 'Templates',
    icon: CarRentalIcon,
    iconClassName: 'h-5 w-5',
    link: '/templates',
    external: false,
    disabled: false,
  },
```

Note the ordering: `'/templates/new'` is checked before `TEMPLATE_EDIT_REGEX`,
which would otherwise match it and title the create page "Edit template".

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run compile && npm run lint`
Expected: full suite green, typecheck and lint clean.

```bash
git add src/app/templates src/app/api/templates/route.ts src/hooks/queries/useTemplateSearch.ts \
  src/config/navigation.ts __tests__/unit/app/templatesSearchRoute.test.ts
git commit -m "feat(templates): browse device definitions and their template state

Three states, all real. A definition with no template says so rather than
erroring -- the import has not run in production and 5,152 of the emitted set
carry no attributes. An id the schema cannot accept says that instead, because
137 of them are live today and subaru_tribeca-(ny/nj)_2008 is one."
```

---

# Phase 2 — the write path (repo: `dimo-developer-console`)

---

### Task 9: The server route — gate ①

The worker authenticates with a single shared `WRITE_TOKEN` and `author` is
client-suppliable and unverified. Console must never hold that token in the
browser and must never let a caller name themselves. This route is where both
facts get fixed: it holds the token server-side, identifies the caller from the
existing session, **stamps `author` from that session**, and resolves what the
caller is entitled to do before it forwards anything.

`src/middleware.ts` already 401s an unauthenticated `/api/*` request. That is a
first line, not the authorization — the route still resolves its own caller,
because a middleware matcher is a configuration file and this is a guarantee.

**Files:**

- Create: `src/services/templateEntitlement.ts`
- Create: `src/app/api/templates/[id]/route.ts`
- Test: `__tests__/unit/services/templateEntitlement.test.ts`
- Test: `__tests__/unit/app/templateRoute.test.ts`

**Interfaces:**

- Consumes: `getUserByToken` from `@/services/user`; `getUserSubOrganization` from `@/services/globalAccount`; `fetchTemplate`, `fetchVocabulary`, `publishTemplate` from `@/services/definitions`.
- Produces:
  - `resolveCaller(): Promise<{ address: \`0x${string}\`; email: string } | null>`
  - `countMintedVehicles(id: string): Promise<number>`
  - `manufacturerOwner(slug: string): Promise<{ owner: string; tokenId: number } | null>`
  - `resolveEntitlement(args): Promise<Entitlement>` and `Entitlement` (Step 2)
  - `GET /api/templates/[id]` → `{ template: Template | null, vocabulary: DeviceType, entitlement: Entitlement }`
  - `PUT /api/templates/[id]` → `{ template }` | `{ errors }` (422) | `{ conflict }` (409) | `{ error, entitlement }` (403)

**Contribution model, as implemented**

| Situation                                                                  | Who may publish               | Tier                                              |
| -------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| No template at this id                                                     | any signed-in account         | `create`                                          |
| Template exists, 0 minted vehicles, `author` absent or equal to the caller | that account                  | `author`                                          |
| Template exists, ≥1 minted vehicle, caller holds the Manufacturer NFT      | that account                  | `manufacturer`                                    |
| Caller address is in `DIMO_CURATOR_ADDRESSES`                              | always                        | `curator`                                         |
| Anything else                                                              | nobody, yet                   | `proposal-required` — 403, editor stays read-only |
| `hardwareTemplateId` changes                                               | `curator` only, at every tier | 403 otherwise                                     |

**There is deliberately no UI for setting `hardwareTemplateId`.** The route
permits a curator to change it so an admin client can, but the editor never
renders a field for it — a control nobody but DIMO may use is a control that
invites the wrong person to try it, and the value is set today by
`common/utils.go:202` for every definition. `EntitlementBanner` says so out
loud instead.

> **Assumption to confirm with Yev before merge.** The spec's row reads "Edit a
> template nothing references yet | _its author_". Most templates in the catalog
> come from the backfill and carry no `author` at all, which under a literal
> reading would make every one of them uneditable by anyone but a curator. This
> implementation treats an **absent** `author` as unowned, so any signed-in
> account may edit an unreferenced, unauthored template. A template with a
> different author still requires a proposal. If that is wrong, the single
> change is in `resolveEntitlement`.

- [ ] **Step 1: Write the failing entitlement tests**

Create `__tests__/unit/services/templateEntitlement.test.ts`:

```ts
import { resolveEntitlement } from '@/services/templateEntitlement';
import type { Template } from '@/types/template';

const CALLER = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';
const CURATOR = '0x3333333333333333333333333333333333333333';

const template = (over: Partial<Template> = {}) =>
  ({
    id: 'toyota_camry_2020',
    deviceType: 'vehicle',
    manufacturer: { slug: 'toyota', name: 'Toyota', tokenId: 131 },
    model: 'Camry',
    year: 2020,
    attributes: {},
    trims: [{ name: 'LE', attributes: {} }],
    version: 3,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Template;

const deps = (minted: number, owner: string | null) => ({
  countMintedVehicles: jest.fn().mockResolvedValue(minted),
  manufacturerOwner: jest.fn().mockResolvedValue(owner ? { owner, tokenId: 131 } : null),
  curators: [CURATOR],
});

describe('resolveEntitlement', () => {
  it('lets any signed-in account create a template that does not exist', async () => {
    expect(
      await resolveEntitlement({ caller: CALLER, template: null, ...deps(0, OTHER) }),
    ).toMatchObject({
      kind: 'create',
      canPublish: true,
      canSetHardwareTemplateId: false,
    });
  });

  it('lets the author edit an unreferenced template', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: CALLER }),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'author', canPublish: true });
  });

  it('treats an unauthored backfill template as unowned while nothing references it', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template(),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'author', canPublish: true });
  });

  it('requires a proposal to edit somebody else unreferenced template', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(0, OTHER),
    });
    expect(e).toMatchObject({ kind: 'proposal-required', canPublish: false });
  });

  it('lets the manufacturer NFT holder edit a template with minted vehicles', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: OTHER }),
      ...deps(4212, CALLER.toUpperCase()),
    });
    expect(e).toMatchObject({
      kind: 'manufacturer',
      canPublish: true,
      mintedVehicles: 4212,
    });
  });

  it('requires a proposal for everyone else once vehicles are minted, and says how many', async () => {
    const e = await resolveEntitlement({
      caller: CALLER,
      template: template({ author: CALLER }),
      ...deps(4212, OTHER),
    });
    expect(e).toMatchObject({
      kind: 'proposal-required',
      canPublish: false,
      mintedVehicles: 4212,
    });
  });

  it('gives a curator publish rights and the only hardwareTemplateId rights', async () => {
    const e = await resolveEntitlement({
      caller: CURATOR,
      template: template({ author: OTHER }),
      ...deps(4212, OTHER),
    });
    expect(e).toMatchObject({
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
    });
  });

  it('never grants hardwareTemplateId rights to a non-curator, at any tier', async () => {
    for (const t of [null, template({ author: CALLER })]) {
      const e = await resolveEntitlement({
        caller: CALLER,
        template: t,
        ...deps(0, CALLER),
      });
      expect(e.canSetHardwareTemplateId).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Implement entitlement**

Create `src/services/templateEntitlement.ts`:

```ts
import config from '@/config';
import type { Template } from '@/types/template';
import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';

export type EntitlementKind =
  | 'create'
  | 'author'
  | 'manufacturer'
  | 'curator'
  | 'proposal-required';

export interface Entitlement {
  kind: EntitlementKind;
  canPublish: boolean;
  /** DIMO only, at every tier. It decides what hardware ships. */
  canSetHardwareTemplateId: boolean;
  mintedVehicles: number;
  reason: string;
}

const eq = (a?: string | null, b?: string | null) =>
  Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export const curatorAddresses = (): string[] =>
  (process.env.DIMO_CURATOR_ADDRESSES ?? '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);

/**
 * The caller, from the session Console already has. Mirrors src/middleware.ts:
 * the session cookie identifies a user, and the Global Account sub-organisation
 * is what turns that user into an address. The smart contract address is used,
 * not the Turnkey EOA: it is the address DIMO records on chain, so it is the
 * one that can hold a Manufacturer NFT.
 */
export async function resolveCaller(): Promise<{
  address: `0x${string}`;
  email: string;
} | null> {
  try {
    const user = await getUserByToken();
    const email = user.company_email_owner ?? user.email;
    const sub = await getUserSubOrganization(email);
    if (!sub?.smartContractAddress) return null;
    return { address: sub.smartContractAddress, email };
  } catch {
    return null;
  }
}

async function identity<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  const resp = await fetch(config.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
  if (!resp.ok) throw new Error(`identity-api returned ${resp.status}`);
  const json = (await resp.json()) as { data?: T };
  return json.data ?? null;
}

/** How many vehicles point at this template. This is the number that decides risk. */
export async function countMintedVehicles(id: string): Promise<number> {
  const data = await identity<{ vehicles: { totalCount: number } }>(
    `query TemplateVehicles($id: String!) {
       vehicles(filterBy: { deviceDefinitionId: $id }, first: 1) { totalCount }
     }`,
    { id },
  );
  return data?.vehicles.totalCount ?? 0;
}

export async function manufacturerOwner(
  slug: string,
): Promise<{ owner: string; tokenId: number } | null> {
  const data = await identity<{
    manufacturer: { owner: string; tokenId: number } | null;
  }>(
    `query TemplateManufacturer($slug: String!) {
       manufacturer(by: { slug: $slug }) { owner tokenId }
     }`,
    { slug },
  );
  return data?.manufacturer ?? null;
}

export interface EntitlementArgs {
  caller: string;
  template: Template | null;
  countMintedVehicles: (id: string) => Promise<number>;
  manufacturerOwner: (slug: string) => Promise<{ owner: string; tokenId: number } | null>;
  curators: string[];
}

/**
 * The split falls where risk falls. Creating ineos_grenadier_2024 harms nobody.
 * Editing toyota_camry_2020 silently re-describes every vehicle pointing at it.
 */
export async function resolveEntitlement(args: EntitlementArgs): Promise<Entitlement> {
  const { caller, template, curators } = args;
  const isCurator = curators.some((c) => eq(c, caller));

  if (template === null) {
    return {
      kind: isCurator ? 'curator' : 'create',
      canPublish: true,
      canSetHardwareTemplateId: isCurator,
      mintedVehicles: 0,
      reason:
        'This template does not exist yet, so creating it cannot re-describe anything.',
    };
  }

  if (isCurator) {
    return {
      kind: 'curator',
      canPublish: true,
      canSetHardwareTemplateId: true,
      mintedVehicles: await args.countMintedVehicles(template.id),
      reason: 'You are a DIMO curator.',
    };
  }

  const mintedVehicles = await args.countMintedVehicles(template.id);

  if (mintedVehicles === 0) {
    // An absent author is a backfill-created template, which nobody has claimed.
    // Treating it as unowned is what keeps the open tier from being empty.
    if (!template.author || eq(template.author, caller)) {
      return {
        kind: 'author',
        canPublish: true,
        canSetHardwareTemplateId: false,
        mintedVehicles: 0,
        reason: 'No vehicle references this template yet.',
      };
    }
    return {
      kind: 'proposal-required',
      canPublish: false,
      canSetHardwareTemplateId: false,
      mintedVehicles: 0,
      reason: `This template was published by ${template.author}. Editing someone else's template opens a proposal, which is not built yet.`,
    };
  }

  const owner = await args.manufacturerOwner(template.manufacturer.slug);
  if (owner && eq(owner.owner, caller)) {
    return {
      kind: 'manufacturer',
      canPublish: true,
      canSetHardwareTemplateId: false,
      mintedVehicles,
      reason: `You hold the ${template.manufacturer.name} Manufacturer NFT (token ${owner.tokenId}).`,
    };
  }

  return {
    kind: 'proposal-required',
    canPublish: false,
    canSetHardwareTemplateId: false,
    mintedVehicles,
    reason:
      `${mintedVehicles.toLocaleString()} minted vehicle${mintedVehicles === 1 ? '' : 's'} resolve to this ` +
      'template. Editing it needs a proposal a curator merges, which is not built yet.',
  };
}
```

- [ ] **Step 3: Run the entitlement tests**

Run: `npx jest __tests__/unit/services/templateEntitlement.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 4: Write the failing route tests**

Create `__tests__/unit/app/templateRoute.test.ts`:

```ts
import { GET, PUT } from '@/app/api/templates/[id]/route';
import { NextRequest } from 'next/server';

jest.mock('@/services/definitions');
jest.mock('@/services/templateEntitlement', () => ({
  ...jest.requireActual('@/services/templateEntitlement'),
  resolveCaller: jest.fn(),
  countMintedVehicles: jest.fn().mockResolvedValue(0),
  manufacturerOwner: jest.fn().mockResolvedValue(null),
  curatorAddresses: jest.fn().mockReturnValue([]),
}));

import { fetchTemplate, fetchVocabulary, publishTemplate } from '@/services/definitions';
import {
  resolveCaller,
  countMintedVehicles,
  curatorAddresses,
} from '@/services/templateEntitlement';

const CALLER = '0x1111111111111111111111111111111111111111';
const params = { params: Promise.resolve({ id: 'toyota_camry_2020' }) };

const body = (over: Record<string, unknown> = {}) => ({
  id: 'toyota_camry_2020',
  deviceType: 'vehicle',
  manufacturer: { slug: 'toyota', name: 'Toyota' },
  model: 'Camry',
  year: 2020,
  attributes: {},
  trims: [{ name: 'LE', attributes: {} }],
  ...over,
});

const put = (payload: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('https://console.test/api/templates/toyota_camry_2020', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

const stored = { ...body(), version: 3, author: CALLER, createdAt: 'x', updatedAt: 'y' };

describe('PUT /api/templates/[id]', () => {
  beforeEach(() => {
    (resolveCaller as jest.Mock).mockResolvedValue({ address: CALLER, email: 'a@b.c' });
    (fetchTemplate as jest.Mock).mockResolvedValue(stored);
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: true,
      template: { ...stored, version: 4 },
    });
    (countMintedVehicles as jest.Mock).mockResolvedValue(0);
    (curatorAddresses as jest.Mock).mockReturnValue([]);
  });

  it('401s when there is no session', async () => {
    (resolveCaller as jest.Mock).mockResolvedValue(null);
    expect((await PUT(put(body()), params)).status).toBe(401);
  });

  it('stamps author from the session and never from the body', async () => {
    await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][1].author).toBe(CALLER);
  });

  it('rejects a body that tries to name its own author or version, rather than stripping it quietly', async () => {
    for (const field of ['author', 'version', 'createdAt', 'updatedAt']) {
      const resp = await PUT(
        put(body({ [field]: field === 'version' ? 9 : 'x' })),
        params,
      );
      expect(resp.status).toBe(400);
      expect((await resp.json()).error).toContain(field);
    }
  });

  it('requires If-Match when the template already exists', async () => {
    const resp = await PUT(put(body()), params);
    expect(resp.status).toBe(428);
  });

  it('forwards the client If-Match rather than the version it just read', async () => {
    // The freshly-read version would silently rebase a stale editor onto
    // whatever landed while it was open. The client's own version is the only
    // one that means "this is what I edited".
    await PUT(put(body(), { 'if-match': '"2"' }), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][2]).toEqual({
      kind: 'update',
      version: 2,
    });
  });

  it('sends If-None-Match on a create', async () => {
    (fetchTemplate as jest.Mock).mockResolvedValue(null);
    await PUT(put(body()), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][2]).toEqual({ kind: 'create' });
  });

  it('403s a caller who needs a proposal, and names the count', async () => {
    (countMintedVehicles as jest.Mock).mockResolvedValue(4212);
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(403);
    expect((await resp.json()).entitlement).toMatchObject({
      kind: 'proposal-required',
      mintedVehicles: 4212,
    });
    expect(publishTemplate).not.toHaveBeenCalled();
  });

  it('403s a hardwareTemplateId change from a non-curator, at every tier', async () => {
    const resp = await PUT(
      put(body({ hardwareTemplateId: '999' }), { 'if-match': '"3"' }),
      params,
    );
    expect(resp.status).toBe(403);
    expect((await resp.json()).error).toContain('hardwareTemplateId');
    expect(publishTemplate).not.toHaveBeenCalled();
  });

  it('lets a curator set hardwareTemplateId', async () => {
    (curatorAddresses as jest.Mock).mockReturnValue([CALLER.toLowerCase()]);
    const resp = await PUT(
      put(body({ hardwareTemplateId: '999' }), { 'if-match': '"3"' }),
      params,
    );
    expect(resp.status).toBe(200);
  });

  it('passes the worker validation errors through unchanged', async () => {
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: false,
      kind: 'validation',
      errors: ['template: unknown attribute "nope"'],
    });
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(422);
    expect((await resp.json()).errors).toEqual(['template: unknown attribute "nope"']);
  });

  it('turns a worker 412 into a 409 carrying the version to rebase onto', async () => {
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: false,
      kind: 'conflict',
      expected: 3,
      actual: 5,
    });
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(409);
    expect(await resp.json()).toMatchObject({ conflict: { expected: 3, actual: 5 } });
  });
});

describe('GET /api/templates/[id]', () => {
  it('returns the template, the live vocabulary and the caller entitlement in one payload', async () => {
    (resolveCaller as jest.Mock).mockResolvedValue({ address: CALLER, email: 'a@b.c' });
    (fetchTemplate as jest.Mock).mockResolvedValue(stored);
    (fetchVocabulary as jest.Mock).mockResolvedValue({
      id: 'vehicle',
      name: 'Vehicle',
      attributes: [],
    });
    const json = await (
      await GET(
        new NextRequest('https://console.test/api/templates/toyota_camry_2020'),
        params,
      )
    ).json();
    expect(json.template.version).toBe(3);
    expect(json.vocabulary.id).toBe('vehicle');
    expect(json.entitlement.kind).toBe('author');
  });
});
```

- [ ] **Step 5: Implement the route**

Create `src/app/api/templates/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import {
  fetchTemplate,
  fetchVocabulary,
  publishTemplate,
  type Precondition,
} from '@/services/definitions';
import {
  countMintedVehicles,
  curatorAddresses,
  manufacturerOwner,
  resolveCaller,
  resolveEntitlement,
} from '@/services/templateEntitlement';
import type { TemplatePayload } from '@/types/template';

// Server-owned. definitions-worker rejects them as unexpected top-level keys,
// and `author` is stamped below from the session. A body carrying any of them
// is refused by name rather than silently stripped: a client that thinks it set
// the author and was quietly overruled has learned nothing.
const SERVER_OWNED = ['version', 'createdAt', 'updatedAt', 'author'] as const;

type Params = { params: Promise<{ id: string }> };

async function entitlementFor(caller: string, id: string) {
  const template = await fetchTemplate(id);
  const entitlement = await resolveEntitlement({
    caller,
    template,
    countMintedVehicles,
    manufacturerOwner,
    curators: curatorAddresses(),
  });
  return { template, entitlement };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [{ template, entitlement }, vocabulary] = await Promise.all([
      entitlementFor(caller.address, id),
      fetchVocabulary(),
    ]);
    return NextResponse.json({ template, vocabulary, entitlement });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load template' },
      { status: 502 },
    );
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const caller = await resolveCaller();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let submitted: Record<string, unknown>;
  try {
    submitted = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'body is not valid JSON' }, { status: 400 });
  }

  for (const field of SERVER_OWNED) {
    if (field in submitted) {
      return NextResponse.json(
        {
          error: `${field} is set by the server, not by the client — remove it from the body`,
        },
        { status: 400 },
      );
    }
  }
  if (submitted.id !== id) {
    return NextResponse.json(
      { error: `body id does not match path id "${id}"` },
      { status: 400 },
    );
  }

  try {
    const { template, entitlement } = await entitlementFor(caller.address, id);

    if (!entitlement.canPublish) {
      return NextResponse.json(
        { error: entitlement.reason, entitlement },
        { status: 403 },
      );
    }

    // hardwareTemplateId decides what hardware ships. It is not a vehicle
    // attribute and it is never open, at any tier.
    const submittedHw = submitted.hardwareTemplateId as string | undefined;
    if (
      submittedHw !== template?.hardwareTemplateId &&
      !entitlement.canSetHardwareTemplateId
    ) {
      return NextResponse.json(
        {
          error:
            'hardwareTemplateId is set by DIMO only — it decides what hardware ships, and is not a vehicle attribute',
          entitlement,
        },
        { status: 403 },
      );
    }

    // The precondition comes from the CLIENT, never from the template we just
    // read. Using the fresh version would rebase a stale editor onto whatever
    // landed while it was open -- a lost update with a 200 on it, which is the
    // exact failure the worker's CAS exists to make impossible.
    let precondition: Precondition;
    if (template === null) {
      precondition = { kind: 'create' };
    } else {
      const ifMatch = req.headers.get('if-match');
      const version = Number((ifMatch ?? '').replace(/^W\//, '').replace(/"/g, ''));
      if (!Number.isInteger(version) || version < 1) {
        return NextResponse.json(
          {
            error:
              'If-Match is required when editing an existing template: send the version you loaded',
          },
          { status: 428 },
        );
      }
      precondition = { kind: 'update', version };
    }

    // TemplatePayload deliberately excludes `author` -- it is not client input.
    // The wire body does carry it, stamped here, which is the one place the two
    // shapes differ.
    const payload = {
      ...submitted,
      author: caller.address,
    } as unknown as TemplatePayload;
    const result = await publishTemplate(id, payload, precondition);

    if (result.ok) return NextResponse.json({ template: result.template });
    if (result.kind === 'validation')
      return NextResponse.json({ errors: result.errors }, { status: 422 });
    if (result.kind === 'conflict') {
      return NextResponse.json(
        {
          error: 'This template changed while you were editing it.',
          conflict: { expected: result.expected, actual: result.actual },
        },
        { status: 409 },
      );
    }
    if (result.kind === 'too-large') {
      return NextResponse.json(
        {
          error: `This template is ${result.bytes} bytes; the limit is ${result.limit}.`,
        },
        { status: 413 },
      );
    }
    Sentry.captureMessage(`definitions-worker ${result.status}: ${result.message}`);
    return NextResponse.json({ error: result.message }, { status: 502 });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to publish template' },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 6: Run the route tests**

Run: `npx jest __tests__/unit/app/templateRoute.test.ts && npm run compile`
Expected: PASS, 12 tests; typecheck clean.

- [ ] **Step 7: Verify the token cannot reach the browser**

Run:

```bash
grep -rn "DEFINITIONS_WRITE_TOKEN" src/ | grep -v "src/services/definitions.ts"
```

Expected: no output. The only reference is inside the server-only module, which
throws if it is ever evaluated in a browser.

- [ ] **Step 8: Commit**

```bash
git add src/services/templateEntitlement.ts src/app/api/templates/[id]/route.ts \
  __tests__/unit/services/templateEntitlement.test.ts __tests__/unit/app/templateRoute.test.ts
git commit -m "feat(templates): per-caller authorization for template writes

The worker has one shared WRITE_TOKEN and takes author on trust. This route
holds the token server-side, identifies the caller from the session Console
already has, stamps author from it, and refuses a body that tries to name its
own author or version rather than stripping it quietly.

Entitlement follows risk: creating a template harms nobody, editing one that
4,212 vehicles resolve to re-describes all of them. hardwareTemplateId is
curator-only at every tier. The If-Match forwarded is the client's, never the
version this route just read -- the latter would rebase a stale editor onto
whatever landed while it was open and return 200."
```

---

### Task 10: The three honesty surfaces

Section 8 of the handoff names the failure mode this project keeps producing:
_correct behaviour that leaves no trace._ These three components are where the
editor leaves a trace — what it changed that you did not type, what it will
refuse, and what you are not allowed to do.

**Files:**

- Create: `src/components/TemplateEditor/NormalisationPanel/NormalisationPanel.tsx`, `index.ts`
- Create: `src/components/TemplateEditor/TrimSelectorEditor/TrimSelectorEditor.tsx`, `index.ts`
- Create: `src/components/TemplateEditor/EntitlementBanner/EntitlementBanner.tsx`, `index.ts`
- Test: `src/components/TemplateEditor/__tests__/honestySurfaces.test.tsx`

**Interfaces:**

- Consumes: `Normalisation` from `@/utils/templateCoerce`; `hasEffectiveSelector`, `renameTrim`, `removeTrim`, `setSelectors` from `@/utils/templateGrid`; `Entitlement` from `@/services/templateEntitlement`.
- Produces:
  - `<NormalisationPanel notes={Normalisation[]} onDismiss={() => void} />`
  - `<TrimSelectorEditor template trimIndex readOnly? onChange />`
  - `<EntitlementBanner entitlement={Entitlement} />`

- [ ] **Step 1: Write the failing tests**

Create `src/components/TemplateEditor/__tests__/honestySurfaces.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import camry from '@/utils/__tests__/fixtures/toyota_camry_2020.json';
import { NormalisationPanel } from '@/components/TemplateEditor/NormalisationPanel';
import { TrimSelectorEditor } from '@/components/TemplateEditor/TrimSelectorEditor';
import { EntitlementBanner } from '@/components/TemplateEditor/EntitlementBanner';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

describe('NormalisationPanel', () => {
  it('renders nothing when the editor changed nothing', () => {
    const { container } = render(<NormalisationPanel notes={[]} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says what was stored instead of what was typed', () => {
    render(
      <NormalisationPanel
        notes={[
          {
            attribute: 'fuel_tank_capacity_gal',
            from: '15.800000',
            to: 15.8,
            reason: 'stored as the number 15.8, not the text "15.800000"',
          },
          {
            attribute: 'mpg_city',
            from: '',
            to: null,
            reason: 'cleared — the attribute is removed, not stored empty',
          },
        ]}
        onDismiss={() => {}}
      />,
    );
    expect(screen.getByText(/stored as the number 15.8/)).toBeInTheDocument();
    expect(
      screen.getByText(/the attribute is removed, not stored empty/),
    ).toBeInTheDocument();
  });
});

describe('TrimSelectorEditor', () => {
  it('shows the gate 4 state for a trim with no effective selector', () => {
    const broken = {
      ...t,
      trims: [
        ...t.trims,
        { name: 'XLE V6', attributes: {}, selectors: { vinPattern: '  ' } },
      ],
    } as Template;
    render(
      <TrimSelectorEditor
        template={broken}
        trimIndex={broken.trims.length - 1}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A template with more than one trim cannot have a selector-less trim',
    );
  });

  it('is quiet when the trim has a real selector', () => {
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={() => {}} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('splits a comma separated list into manufacturer codes and drops the blanks', () => {
    const onChange = jest.fn();
    render(<TrimSelectorEditor template={t} trimIndex={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/manufacturer code/i), {
      target: { value: '2532, , 2533 ' },
    });
    expect(onChange.mock.calls.at(-1)![0].trims[0].selectors.manufacturerCode).toEqual([
      '2532',
      '2533',
    ]);
  });
});

describe('EntitlementBanner', () => {
  it('explains a proposal requirement and names the vehicle count', () => {
    render(
      <EntitlementBanner
        entitlement={{
          kind: 'proposal-required',
          canPublish: false,
          canSetHardwareTemplateId: false,
          mintedVehicles: 4212,
          reason: '4,212 minted vehicles resolve to this template.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '4,212 minted vehicles resolve to this template.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('read only');
  });

  it('says nothing loud when the caller may publish', () => {
    render(
      <EntitlementBanner
        entitlement={{
          kind: 'author',
          canPublish: true,
          canSetHardwareTemplateId: false,
          mintedVehicles: 0,
          reason: 'No vehicle references this template yet.',
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'No vehicle references this template yet.',
    );
    expect(screen.getByRole('status').className).not.toContain('red');
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx jest src/components/TemplateEditor/__tests__/honestySurfaces.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `NormalisationPanel`**

Create `src/components/TemplateEditor/NormalisationPanel/NormalisationPanel.tsx`:

```tsx
import React, { type FC } from 'react';
import type { Normalisation } from '@/utils/templateCoerce';

interface Props {
  notes: Normalisation[];
  onDismiss: () => void;
}

/**
 * Everything the editor stored that is not literally what was typed. A value
 * that changes without a report is the failure mode this project keeps
 * producing; this is where it is refused. Absent when there is nothing to say.
 */
export const NormalisationPanel: FC<Props> = ({ notes, onDismiss }) => {
  if (notes.length === 0) return null;
  return (
    <section className="rounded-xl border border-cta-default bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-white">What the editor changed that you did not type</h2>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-white/50 hover:text-white"
        >
          Dismiss
        </button>
      </div>
      <ul className="flex flex-col gap-1 pt-2">
        {notes.map((n, i) => (
          <li key={`${n.attribute}-${i}`} className="text-white/70">
            <span className="font-mono text-white/50">{n.attribute}</span>
            <span className="px-2 text-white/25">·</span>
            {n.reason}
          </li>
        ))}
      </ul>
    </section>
  );
};
```

`index.ts`: `export * from './NormalisationPanel';`

- [ ] **Step 4: Implement `TrimSelectorEditor`**

Create `src/components/TemplateEditor/TrimSelectorEditor/TrimSelectorEditor.tsx`:

```tsx
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
```

`index.ts`: `export * from './TrimSelectorEditor';`

- [ ] **Step 5: Implement `EntitlementBanner`**

Create `src/components/TemplateEditor/EntitlementBanner/EntitlementBanner.tsx`:

```tsx
import React, { type FC } from 'react';
import classnames from 'classnames';
// `import type`, not a value import: templateEntitlement reaches next/headers
// through getUserByToken, and pulling it into a client component would break the
// build. The type is erased; the module is never bundled.
import type { Entitlement } from '@/services/templateEntitlement';

const TITLES: Record<Entitlement['kind'], string> = {
  'create': 'New template',
  'author': 'You can publish this',
  'manufacturer': 'You hold this Manufacturer NFT',
  'curator': 'Curator',
  'proposal-required': 'Read only',
};

export const EntitlementBanner: FC<{ entitlement: Entitlement }> = ({ entitlement }) => (
  <div
    role="status"
    className={classnames(
      'flex flex-col gap-1 rounded-xl border p-4',
      entitlement.canPublish
        ? 'border-cta-default bg-surface-default text-white/70'
        : 'border-red-400/40 bg-surface-raised text-white/70',
    )}
  >
    <span className={entitlement.canPublish ? 'text-white' : 'text-red-400'}>
      {TITLES[entitlement.kind]}
      {!entitlement.canPublish && ' — read only'}
    </span>
    <span>{entitlement.reason}</span>
    {!entitlement.canSetHardwareTemplateId && (
      <span className="text-white/40">
        hardwareTemplateId decides what hardware ships and is set by DIMO only.
      </span>
    )}
  </div>
);
```

`index.ts`: `export * from './EntitlementBanner';`

- [ ] **Step 6: Run the tests and commit**

Run: `npx jest src/components/TemplateEditor && npm run compile && npm run lint`
Expected: PASS; typecheck and lint clean.

```bash
git add src/components/TemplateEditor
git commit -m "feat(templates): normalisation report, selector editor, entitlement banner

Three places the editor leaves a trace instead of acting quietly: what it
stored that differs from what was typed, why a selector-less trim will be
refused before save rather than at it, and what the caller is not allowed to
do and why."
```

---

### Task 11: The editor page

**Files:**

- Create: `src/app/templates/[id]/page.tsx`
- Create: `src/app/templates/[id]/components/View/View.tsx`, `index.ts`
- Create: `src/hooks/queries/useTemplate.ts`
- Test: `src/app/templates/[id]/__tests__/View.test.tsx`

**Interfaces:**

- Consumes: `GET`/`PUT /api/templates/[id]` (Task 9); `TrimGrid` (Task 7); `NormalisationPanel`, `TrimSelectorEditor`, `EntitlementBanner` (Task 10); `toPayload`, `addTrim` (Task 5); `validateDraft` (Task 6).
- Produces: `useTemplate(id)` → `{ data, isLoading, error }`; `usePublishTemplate(id)` → TanStack mutation; the page at `/templates/<id>`.

- [ ] **Step 1: The data hooks**

Create `src/hooks/queries/useTemplate.ts`:

```ts
'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { DeviceType, Template, TemplatePayload } from '@/types/template';
import type { Entitlement } from '@/services/templateEntitlement';

export interface TemplateBundle {
  template: Template | null;
  vocabulary: DeviceType;
  entitlement: Entitlement;
}

export interface PublishFailure {
  status: number;
  message?: string;
  errors?: string[];
  conflict?: { expected: number | null; actual: number };
}

export const useTemplate = (id: string) =>
  useQuery<TemplateBundle>({
    queryKey: ['template', id],
    // The version held here is what If-Match sends. A cached one would send a
    // stale precondition and turn a real conflict into a silent rebase.
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Failed to load template');
      return json as TemplateBundle;
    },
  });

export const usePublishTemplate = (id: string) =>
  useMutation<
    Template,
    PublishFailure,
    { payload: TemplatePayload; version: number | null }
  >({
    mutationFn: async ({ payload, version }) => {
      const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(version === null ? {} : { 'If-Match': `"${version}"` }),
        },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw {
          status: resp.status,
          message: json.error,
          errors: json.errors,
          conflict: json.conflict,
        } as PublishFailure;
      }
      return json.template as Template;
    },
  });
```

- [ ] **Step 2: Write the failing page tests**

Create `src/app/templates/[id]/__tests__/View.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import camry from '@/utils/__tests__/fixtures/toyota_camry_2020.json';
import { vehicleVocab } from '@/utils/__tests__/fixtures/vehicleVocab';
import { TemplateEditorView } from '../components/View';
import type { Template } from '@/types/template';

const t = camry as unknown as Template;

const publish = jest.fn();
const refetch = jest.fn();

// A mutable bundle rather than a second module mock: the read-only branch is a
// different entitlement, not a different module, and the component must derive
// it from the data it is given.
let bundle: {
  template: Template;
  vocabulary: typeof vehicleVocab;
  entitlement: {
    kind: string;
    canPublish: boolean;
    canSetHardwareTemplateId: boolean;
    mintedVehicles: number;
    reason: string;
  };
};

jest.mock('@/hooks/queries/useTemplate', () => ({
  useTemplate: () => ({ data: bundle, isLoading: false, error: null, refetch }),
  usePublishTemplate: () => ({ mutateAsync: publish, isPending: false }),
}));

const authorBundle = () => ({
  template: t,
  vocabulary: vehicleVocab,
  entitlement: {
    kind: 'author',
    canPublish: true,
    canSetHardwareTemplateId: false,
    mintedVehicles: 0,
    reason: 'No vehicle references this template yet.',
  },
});

/** Publish is disabled until the draft differs from what was loaded. */
const edit = () => {
  const input = within(screen.getByTestId('cell-mpg_city-0')).getByRole('textbox');
  fireEvent.change(input, { target: { value: '27' } });
  fireEvent.blur(input);
};

describe('TemplateEditorView', () => {
  beforeEach(() => {
    bundle = authorBundle();
    publish.mockReset().mockResolvedValue({ ...t, version: t.version + 1 });
    refetch.mockReset();
  });

  it('shows the current version and the author of the version it loaded', () => {
    render(<TemplateEditorView id={t.id} />);
    expect(screen.getByText(new RegExp(`v${t.version}`))).toBeInTheDocument();
  });

  it('leaves publish disabled until something actually changed', () => {
    render(<TemplateEditorView id={t.id} />);
    expect(screen.getByRole('button', { name: /^publish/i })).toBeDisabled();
    edit();
    expect(screen.getByRole('button', { name: /^publish/i })).toBeEnabled();
  });

  it('refuses to publish while the draft would fail the worker, and names the fault', async () => {
    render(<TemplateEditorView id={t.id} />);
    fireEvent.click(screen.getByRole('button', { name: /add trim/i }));
    expect(await screen.findByText(/selectors are required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^publish/i })).toBeDisabled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('sends the version it loaded as the precondition, and never the payload server fields', async () => {
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    const { payload, version } = publish.mock.calls[0][0];
    expect(version).toBe(t.version);
    expect(payload.version).toBeUndefined();
    expect(payload.author).toBeUndefined();
    expect(payload.createdAt).toBeUndefined();
  });

  it('surfaces the worker validation errors verbatim', async () => {
    publish.mockRejectedValue({
      status: 422,
      errors: ['trim LE: "mpg_city" above maximum 200'],
    });
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    expect(
      await screen.findByText('trim LE: "mpg_city" above maximum 200'),
    ).toBeInTheDocument();
  });

  it('explains a conflict instead of retrying over the top of it', async () => {
    publish.mockRejectedValue({ status: 409, conflict: { expected: 10, actual: 12 } });
    render(<TemplateEditorView id={t.id} />);
    edit();
    fireEvent.click(screen.getByRole('button', { name: /^publish/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('version 12');
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('reports the normalisation when a typed value is not what gets stored', () => {
    render(<TemplateEditorView id={t.id} />);
    const input = within(screen.getByTestId('cell-fuel_tank_capacity_gal-0')).getByRole(
      'textbox',
    );
    fireEvent.change(input, { target: { value: '16.000000' } });
    fireEvent.blur(input);
    expect(
      screen.getByText(/What the editor changed that you did not type/),
    ).toBeInTheDocument();
    expect(screen.getByText(/stored as the number 16/)).toBeInTheDocument();
  });

  it('is read only, with no publish button, when a proposal is required', () => {
    bundle = {
      ...authorBundle(),
      entitlement: {
        kind: 'proposal-required',
        canPublish: false,
        canSetHardwareTemplateId: false,
        mintedVehicles: 4212,
        reason: '4,212 minted vehicles resolve to this template.',
      },
    };
    render(<TemplateEditorView id={t.id} />);
    expect(screen.queryByRole('button', { name: /^publish/i })).toBeNull();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement the view**

Create `src/app/templates/[id]/components/View/View.tsx`:

```tsx
'use client';

import React, { useEffect, useMemo, useState, type FC } from 'react';
import { Button } from '@/components/Button';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { TrimGrid } from '@/components/TemplateEditor/TrimGrid';
import { TrimSelectorEditor } from '@/components/TemplateEditor/TrimSelectorEditor';
import { NormalisationPanel } from '@/components/TemplateEditor/NormalisationPanel';
import { EntitlementBanner } from '@/components/TemplateEditor/EntitlementBanner';
import {
  useTemplate,
  usePublishTemplate,
  type PublishFailure,
} from '@/hooks/queries/useTemplate';
import { addTrim, toPayload } from '@/utils/templateGrid';
import { validateDraft } from '@/utils/templateValidate';
import type { Normalisation } from '@/utils/templateCoerce';
import type { Template } from '@/types/template';

interface Props {
  id: string;
}

export const TemplateEditorView: FC<Props> = ({ id }) => {
  const { data, isLoading, error, refetch } = useTemplate(id);
  const publish = usePublishTemplate(id);

  const [draft, setDraft] = useState<Template | null>(null);
  const [notes, setNotes] = useState<Normalisation[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState<{
    expected: number | null;
    actual: number;
  } | null>(null);
  const [published, setPublished] = useState<number | null>(null);

  // The version loaded, held apart from the draft: it is what If-Match sends,
  // and it must not move when the draft does.
  const loadedVersion = data?.template?.version ?? null;
  const readOnly = !(data?.entitlement.canPublish ?? false);

  useEffect(() => {
    if (data?.template && draft === null) setDraft(data.template);
  }, [data, draft]);

  const dirty =
    draft !== null &&
    data?.template !== null &&
    JSON.stringify(draft) !== JSON.stringify(data?.template);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const localErrors = useMemo(
    () => (draft && data ? validateDraft(draft, data.vocabulary) : []),
    [draft, data],
  );

  const onPublish = async () => {
    if (!draft || loadedVersion === null) return;
    setServerErrors([]);
    setConflict(null);
    try {
      const result = await publish.mutateAsync({
        payload: toPayload(draft),
        version: loadedVersion,
      });
      setPublished(result.version);
      setNotes([]);
      await refetch();
      setDraft(null);
    } catch (err) {
      const failure = err as PublishFailure;
      if (failure.status === 409 && failure.conflict) setConflict(failure.conflict);
      else setServerErrors(failure.errors ?? [failure.message ?? 'Publish failed']);
    }
  };

  return (
    <QueryPageWrapper
      loading={isLoading}
      error={error ?? undefined}
      customErrorMessage="Could not load this template"
    >
      {draft && data && (
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-white">
                {draft.manufacturer.name} {draft.model} {draft.year}
              </h1>
              <span className="font-mono text-xs text-white/50">
                {draft.id} · v{loadedVersion}
                {data.template?.author && ` · last published by ${data.template.author}`}
              </span>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button className="dark" onClick={() => setDraft(addTrim(draft, ''))}>
                  Add trim
                </Button>
                <Button
                  onClick={onPublish}
                  loading={publish.isPending}
                  disabled={localErrors.length > 0 || !dirty}
                >
                  Publish
                </Button>
              </div>
            )}
          </header>

          <EntitlementBanner entitlement={data.entitlement} />

          {published !== null && (
            <p className="text-primary-300">Published version {published}.</p>
          )}

          {conflict && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-xl border border-red-400/40 bg-surface-raised p-4"
            >
              <span className="text-red-400">
                This template moved to version {conflict.actual} while you were editing
                version {conflict.expected}.
              </span>
              <span className="text-white/70">
                Your draft has not been discarded and nothing was published. Reload to see
                the current version, then re-apply your changes.
              </span>
              <div>
                <Button
                  className="dark"
                  onClick={() => {
                    setDraft(null);
                    setConflict(null);
                    refetch();
                  }}
                >
                  Reload
                </Button>
              </div>
            </div>
          )}

          {(localErrors.length > 0 || serverErrors.length > 0) && (
            <ul className="flex flex-col gap-1 rounded-xl border border-red-400/40 bg-surface-raised p-4">
              {[...serverErrors, ...localErrors].map((e) => (
                <li key={e} className="text-red-400">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <NormalisationPanel notes={notes} onDismiss={() => setNotes([])} />

          <TrimGrid
            template={draft}
            vocab={data.vocabulary}
            readOnly={readOnly}
            onChange={setDraft}
            onNormalise={(note) => setNotes((prev) => [...prev, note])}
          />

          <div className="flex flex-col gap-3">
            {draft.trims.map((trim, i) => (
              <TrimSelectorEditor
                key={`${trim.name}-${i}`}
                template={draft}
                trimIndex={i}
                readOnly={readOnly}
                onChange={setDraft}
              />
            ))}
          </div>
        </div>
      )}
    </QueryPageWrapper>
  );
};
```

`index.ts`: `export * from './View';`

Create `src/app/templates/[id]/page.tsx`:

```tsx
'use client';

import React, { Suspense, use, type FC } from 'react';

import { TemplateEditorView } from './components/View';

const TemplatePage: FC<{ params: Promise<{ id: string }> }> = ({ params }) => {
  const { id } = use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplateEditorView id={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default TemplatePage;
```

- [ ] **Step 4: Run the tests**

Run: `npx jest src/app/templates && npm run compile && npm run lint`
Expected: PASS, 8 tests; typecheck and lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/templates/\[id\] src/hooks/queries/useTemplate.ts
git commit -m "feat(templates): the editor page

Publish is disabled while the draft would fail the worker, and the fault is
named in the worker's own words. The precondition is the version that was
loaded, held apart from the draft so it cannot move underneath it. A conflict
explains what happened and offers a reload -- it never retries over the top of
somebody else's version."
```

---

### Task 12: Creating a template that does not exist

Creating `ineos_grenadier_2024` harms nobody, so it publishes immediately and
attributed. The whole tier exists because the risk is not symmetrical.

**Files:**

- Create: `src/app/templates/new/page.tsx`
- Create: `src/app/templates/new/components/View/View.tsx`, `index.ts`
- Test: `src/app/templates/new/__tests__/View.test.tsx`

**Interfaces:**

- Consumes: `usePublishTemplate` (Task 11); `validateDraft` (Task 6); `toPayload`, `addTrim` (Task 5); `GET /api/templates?make=` (Task 8) for the manufacturer name and token id.
- Produces: the page at `/templates/new`, and a link to it from the browse page's empty state.

- [ ] **Step 1: Write the failing tests**

Create `src/app/templates/new/__tests__/View.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewTemplateView } from '../components/View';

const publish = jest.fn();
jest.mock('@/hooks/queries/useTemplate', () => ({
  usePublishTemplate: () => ({ mutateAsync: publish, isPending: false }),
}));

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('NewTemplateView', () => {
  beforeEach(() =>
    publish.mockReset().mockResolvedValue({ id: 'ineos_grenadier_2024', version: 1 }),
  );

  it('builds the id from make slug, model slug and year, and shows it', () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'ineos');
    fill(/model slug/i, 'grenadier');
    fill(/year/i, '2024');
    expect(screen.getByTestId('derived-id')).toHaveTextContent('ineos_grenadier_2024');
  });

  it('refuses a slug the id pattern cannot accept, before any request', async () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'Subaru');
    fill(/model slug/i, 'tribeca-(ny/nj)');
    fill(/year/i, '2008');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(
      await screen.findByText('id must be <make>_<model>_<year>'),
    ).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });

  it('creates with a null precondition so the route sends If-None-Match', async () => {
    render(<NewTemplateView />);
    fill(/make slug/i, 'ineos');
    fill(/model slug/i, 'grenadier');
    fill(/year/i, '2024');
    fill(/manufacturer name/i, 'INEOS');
    fill(/model name/i, 'Grenadier');
    fill(/first trim/i, 'Trialmaster');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(publish).toHaveBeenCalled());
    expect(publish.mock.calls[0][0].version).toBeNull();
    expect(publish.mock.calls[0][0].payload.trims).toEqual([
      { name: 'Trialmaster', attributes: {} },
    ]);
  });

  it('says the template already exists rather than reporting a generic failure', async () => {
    publish.mockRejectedValue({ status: 409, conflict: { expected: null, actual: 4 } });
    render(<NewTemplateView />);
    fill(/make slug/i, 'toyota');
    fill(/model slug/i, 'camry');
    fill(/year/i, '2020');
    fill(/manufacturer name/i, 'Toyota');
    fill(/model name/i, 'Camry');
    fill(/first trim/i, 'LE');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('link', { name: /open it/i })).toHaveAttribute(
      'href',
      '/templates/toyota_camry_2020',
    );
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx jest src/app/templates/new`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the view**

Create `src/app/templates/new/components/View/View.tsx`:

```tsx
'use client';

import React, { useMemo, useState, type FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { usePublishTemplate, type PublishFailure } from '@/hooks/queries/useTemplate';
import { validateDraft } from '@/utils/templateValidate';
import { toPayload } from '@/utils/templateGrid';
import type { DeviceType, Template } from '@/types/template';

// The editor's own vocabulary comes from the worker; a create form needs none
// of it, because a new template starts with no attributes at all -- 5,152 of
// the emitted set are attribute-free and that is a real, valid template.
const EMPTY_VOCAB: DeviceType = { id: 'vehicle', name: 'Vehicle', attributes: [] };

/** `presetId` comes from the browse page's Create link, e.g. toyota_supra_2020. */
export const NewTemplateView: FC<{ presetId?: string }> = ({ presetId }) => {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    const parts = (presetId ?? '').split('_');
    const blank = {
      makeSlug: '',
      modelSlug: '',
      year: '',
      manufacturerName: '',
      modelName: '',
      trimName: '',
    };
    return parts.length === 3
      ? { ...blank, makeSlug: parts[0], modelSlug: parts[1], year: parts[2] }
      : blank;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [exists, setExists] = useState(false);

  const id = `${form.makeSlug}_${form.modelSlug}_${form.year}`;
  // The id is derived from the form, so the mutation has to be created after it
  // -- usePublishTemplate('') would PUT to /api/templates/ and 404.
  const publish = usePublishTemplate(id);

  const draft = useMemo<Template>(
    () =>
      ({
        id,
        deviceType: 'vehicle',
        manufacturer: { slug: form.makeSlug, name: form.manufacturerName },
        model: form.modelName,
        year: Number(form.year),
        attributes: {},
        trims: [{ name: form.trimName, attributes: {} }],
      }) as Template,
    [id, form],
  );

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <label key={key} className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      <input
        aria-label={label}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="h-10 rounded-md bg-dark-grey-950 px-3 text-white placeholder:text-white/25"
      />
    </label>
  );

  const onCreate = async () => {
    setExists(false);
    const found = validateDraft(draft, EMPTY_VOCAB);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    try {
      // version null -> the route sends If-None-Match: *, so a template that
      // already exists comes back as a conflict rather than a silent overwrite.
      await publish.mutateAsync({ payload: toPayload(draft), version: null });
      router.push(`/templates/${id}`);
    } catch (err) {
      const failure = err as PublishFailure;
      if (failure.status === 409) setExists(true);
      else
        setErrors(
          failure.errors ?? [failure.message ?? 'Could not create this template'],
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-white">New template</h1>
      <p className="text-white/50">
        A model-year and the trims it shipped in. Creating one publishes immediately and
        is attributed to you — nothing points at it yet, so nothing can be re-described.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {field('makeSlug', 'Make slug', 'ineos')}
        {field('modelSlug', 'Model slug', 'grenadier')}
        {field('year', 'Year', '2024')}
        {field('manufacturerName', 'Manufacturer name', 'INEOS')}
        {field('modelName', 'Model name', 'Grenadier')}
        {field('trimName', 'First trim', 'Trialmaster')}
      </div>

      <p className="font-mono text-white/70" data-testid="derived-id">
        {id}
      </p>

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-red-400/40 bg-surface-raised p-4">
          {errors.map((e) => (
            <li key={e} className="text-red-400">
              {e}
            </li>
          ))}
        </ul>
      )}

      {exists && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-surface-raised p-4"
        >
          <span className="text-red-400">A template with this id already exists.</span>
          <Link href={`/templates/${id}`} className="button">
            Open it
          </Link>
        </div>
      )}

      <div>
        <Button onClick={onCreate} loading={publish.isPending}>
          Create template
        </Button>
      </div>
    </div>
  );
};
```

`index.ts`: `export * from './View';`

Create `src/app/templates/new/page.tsx`:

```tsx
'use client';

import React, { Suspense, type FC } from 'react';
import { useSearchParams } from 'next/navigation';

import { NewTemplateView } from './components/View';

// useSearchParams must sit inside a Suspense boundary, and keeping it out of the
// view leaves the view a pure function of its props for the tests.
const PresetView: FC = () => {
  const search = useSearchParams();
  return <NewTemplateView presetId={search.get('id') ?? undefined} />;
};

const NewTemplatePage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PresetView />
  </Suspense>
);

export default NewTemplatePage;
```

- [ ] **Step 4: Fix the create link on the browse page**

In `src/app/templates/templatesPage/View/View.tsx`, a `missing` result links to
`/templates/<id>`, which loads an editor for a template that does not exist.
Point it at the create form with the id pre-filled instead — `NewTemplateView`
already reads `presetId`:

```tsx
{
  r.status !== 'invalid-id' && (
    <Link
      href={
        r.status === 'ok'
          ? `/templates/${r.id}`
          : `/templates/new?id=${encodeURIComponent(r.id)}`
      }
      className="button"
    >
      {r.status === 'ok' ? 'Open' : 'Create'}
    </Link>
  );
}
```

Then add the case to `src/app/templates/new/__tests__/View.test.tsx`:

```tsx
it('pre-fills the id the browse page handed it', () => {
  render(<NewTemplateView presetId="toyota_supra_2020" />);
  expect(screen.getByTestId('derived-id')).toHaveTextContent('toyota_supra_2020');
});
```

- [ ] **Step 5: Full verification**

Run: `npm test && npm run compile && npm run lint && npm run build`
Expected: full suite green, typecheck clean, lint clean, production build succeeds.

- [ ] **Step 6: Commit and open the PR**

```bash
git add src/app/templates
git commit -m "feat(templates): create a template that does not exist yet

Publishes immediately and attributed, because nothing points at a template
nobody has created. If-None-Match makes an id that already exists a conflict
with a link to it rather than a silent overwrite."

git push -u origin template-editor
gh pr create --title "Console template editor" --body "$(cat <<'BODY'
The editor for the trim templates the extraction pipeline emits.

Trims are columns, attributes are rows. Values shared across trims render
muted; values that differ render at full contrast, so on the real Camry the eye
lands on powertrain_type and fuel_tank_capacity_gal -- the pair the production
record blended into one row describing two different cars.

- `/templates` browses device definitions and says which have a template, which
  do not yet, and which carry an id the schema cannot accept.
- `/templates/<id>` edits one. Publish is disabled while the draft would fail
  the worker, and the fault is named in the worker's own words.
- `/templates/new` creates one.

The write path holds DEFINITIONS_WRITE_TOKEN server-side, identifies the caller
from the existing session, stamps `author` from it, and refuses a body that
names its own author or version. Entitlement follows risk: creating harms
nobody; editing a template 4,212 vehicles resolve to re-describes all of them.
hardwareTemplateId is curator-only at every tier.

Requires definitions-worker `template-cas` (schema route, compare-and-swap,
generated types) to be deployed first.

The proposal tier -- edit a referenced template you do not own, a curator
merges -- is not built. Those callers get a read-only editor that says so.
BODY
)"
```

---

## Sequencing

```
definitions-worker            dimo-developer-console
  Task 1  schema route  ──────► Task 4  config + types + client
  Task 2  CAS           ──┐          │
  Task 3  generated types ┘          ├─► Task 5  divergence model
                                     │      └─► Task 6  coercion + validation
                                     │             └─► Task 7  the grid
                                     ├─► Task 8  browse
                                     └─► Task 9  server route (needs Task 2)
                                            └─► Task 10 honesty surfaces
                                                   └─► Task 11 editor page
                                                          └─► Task 12 create
```

Tasks 5, 6, 7 and 8 need only Task 4 and can be built while the worker PR is in
review. **Nothing in Phase 2 may be merged before Task 2 is deployed** — a save
path without compare-and-swap is the defect this plan exists to avoid, not a
staging step towards fixing it.

## Not in this plan

**Blockers that gate deployment but are not this feature's work:**

- **Shrink dd-api.** `Create()` still `PUT`s `/definitions/<id>` and
  `manifest()` still `GET`s `/manifest.json`; the new worker serves neither.
  Every catalog miss and every search sync fails until those migrate. Nothing
  here worsens it, and nothing here can ship to production before it lands.
- **identity-api #188.** Two live defects: cold-start backoff never engages on a
  5xx (`failedAttempt` receives a nil error), and the catalog refresh holds the
  write lock so every read blocks — measured at 2.002 s against a healthy
  snapshot. Task 8 and Task 9 both read identity on the request path, so this
  is felt here even though it is not this plan's to fix.
- **A production re-run of the extraction.** Every coverage number in
  `VERIFY-trim-templates.md` came from prod styles against the _dev_ catalog.
  14,145 templates and 2,729 orphans are artefacts of that mismatch and must not
  be quoted for production.
- **`TYPESENSE_COLLECTION` name collision** and **Typesense memory on a 439 MB
  host that has OOM'd four times.** Both are cutover blockers in the worker's
  DEPLOY.md.

**Deferred to their own plans:**

- **Proposals and curator merge.** The tier where someone edits a template they
  do not own and a curator merges the result. It needs a proposal store the
  worker does not have — a `p/<id>/<proposal>.json` prefix, a listing surface,
  and a merge that is a normal CAS write with the curator as author. Never on a
  timer. Until it exists, those callers get a read-only editor that says so.
- **Revert.** Moves the head pointer, O(1). It is a curator action against
  `t/<id>/meta.json`, which the worker does not currently serve; it needs a read
  route for the version log first.
- **An activity view over `GET /admin/history`.** When it is built: the route is
  **paged** — `limit` defaults to 200, caps at 500, and returns a `next` cursor.
  A consumer that reads only the first page silently truncates the record.
- **A vocabulary editor.** `device-type-vehicle.json` is curated and changes
  rarely; it is edited in the worker repo and deployed, not through Console.
- **The 137 malformed production ids.** `subaru_tribeca-(ny/nj)_2008` is live
  today. Whether to widen the id pattern or correct the ids is a product
  decision; Task 8 shows them and says they cannot be edited, which is the
  honest interim.

## Verification checklist before opening either PR

- [ ] `definitions-worker`: `npm test && npm run test:integration && npm run typecheck` — 200 unit, 41 integration, clean.
- [ ] `dimo-developer-console`: `npm test && npm run compile && npm run lint && npm run build` — all clean.
- [ ] `grep -rn "DEFINITIONS_WRITE_TOKEN" src/ | grep -v "src/services/definitions.ts"` returns nothing.
- [ ] `git log --format=%B <base>..HEAD | grep -iE "co-authored-by|claude"` returns nothing, in both repos.
- [ ] The integration test in Task 2 Step 6 was **run against the real R2 binding** and passed — not skipped, not deleted.
- [ ] The entitlement assumption in Task 9 (an absent `author` means unowned) has been put to Yev and either confirmed or changed.

## The question this plan is answering

Five separate defects on this project shared one shape: correct behaviour that
leaves no trace, or a guarantee that holds on the path under test and not the
one beside it. For Console the equivalent question is _when the editor declines
to save something, or quietly normalises it, does the person see that happen?_

Where each task answers it:

|         | Answer                                                                                                                                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task 2  | A losing writer gets a 412 naming the version to rebase onto, and an integration test proves it against the real binding rather than the fake that would pass either way.                                               |
| Task 6  | Every difference between what was typed and what is stored produces a `Normalisation`. A reparsed number, trimmed whitespace, and a cleared attribute all leave a record.                                               |
| Task 7  | A trim with no effective selector is marked in its header, as a validation state rather than a discovery at save. `—` distinguishes not-set from empty.                                                                 |
| Task 8  | A definition with no template says so; an id the schema cannot accept says that instead. Neither is hidden as an error or as an empty result.                                                                           |
| Task 9  | A body naming its own `author` or `version` is refused by name rather than stripped silently, and the forwarded `If-Match` is the client's, never the freshly-read one that would rebase a stale editor and return 200. |
| Task 10 | The normalisation report, the selector warning, and the entitlement banner are three places the editor states what it did and what it will not do.                                                                      |
| Task 11 | A conflict explains what happened and offers a reload. It never retries over the top of someone else's version.                                                                                                         |
