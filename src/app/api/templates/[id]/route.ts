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
  hardwareTemplateIdChanged,
  manufacturerOwner,
  resolveCaller,
  resolveEntitlement,
  type ManufacturerLookup,
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
    // Passed rather than read off the template: the vehicle count is a question
    // about the definition, which exists whether or not a template document
    // does.
    id,
    template,
    countMintedVehicles,
    manufacturerOwner,
    curators: curatorAddresses(),
  });
  // A count that could not be read is a state, not a throw, so it would pass
  // the captureException below. An identity outage still has to be seen.
  if (entitlement.kind === 'unavailable') {
    Sentry.captureMessage(`identity-api unavailable resolving entitlement for ${id}`);
  }
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
      // 'unavailable' is not a refusal: identity did not answer, so nothing
      // was decided. 503 tells the client to retry rather than ask for access.
      return NextResponse.json(
        { error: entitlement.reason, entitlement },
        { status: entitlement.kind === 'unavailable' ? 503 : 403 },
      );
    }

    // hardwareTemplateId decides what hardware ships. It is not a vehicle
    // attribute and it is never open, at any tier -- and the worker takes it
    // on every trim as well as on the template, so the check has to too.
    if (
      !entitlement.canSetHardwareTemplateId &&
      hardwareTemplateIdChanged(submitted, template)
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
    // exact failure the worker's CAS exists to make impossible. That holds when
    // the read comes back null as well: a template someone deleted under an
    // open editor must answer 412, not commit the stale draft as a create and
    // resurrect it. Only a client that sent no If-Match at all is creating.
    const ifMatch = req.headers.get('if-match');
    let precondition: Precondition;
    if (ifMatch === null || ifMatch.trim().length === 0) {
      if (template !== null) {
        return NextResponse.json(
          {
            error:
              'If-Match is required when editing an existing template: send the version you loaded',
          },
          { status: 428 },
        );
      }
      precondition = { kind: 'create' };
    } else {
      const version = Number(ifMatch.replace(/^W\//, '').replace(/"/g, ''));
      if (!Number.isInteger(version) || version < 1) {
        return NextResponse.json(
          {
            error: `If-Match must be the version you loaded, as in If-Match: "5" — got ${ifMatch}`,
          },
          { status: 428 },
        );
      }
      precondition = { kind: 'update', version };
    }

    // manufacturer.tokenId is required on every template and must be a positive
    // integer. It is the Manufacturer NFT id: identity owns it, the create form
    // has no input for it and must not have one, so it is stamped here beside
    // `author`. A body carrying one is overruled rather than refused -- the
    // editor round-trips the manufacturer object it loaded, so the field is not
    // a claim the client is making, and identity is the only authority on it.
    const submittedManufacturer =
      typeof submitted.manufacturer === 'object' && submitted.manufacturer !== null
        ? (submitted.manufacturer as Record<string, unknown>)
        : null;
    const slug =
      typeof submittedManufacturer?.slug === 'string' ? submittedManufacturer.slug : '';
    if (slug === '') {
      return NextResponse.json(
        { errors: ['manufacturer.slug is required'] },
        { status: 422 },
      );
    }

    let held: ManufacturerLookup;
    try {
      held = await manufacturerOwner(slug);
    } catch {
      // Same shape as the entitlement's unavailable tier: identity did not
      // answer, so nothing was decided and the client should retry rather than
      // read a stamped guess as fact.
      return NextResponse.json(
        { error: `Could not look up the Manufacturer NFT for "${slug}". Try again.` },
        { status: 503 },
      );
    }
    if (held.kind === 'absent') {
      // identity answered, and the answer is that nothing is minted under this
      // slug -- a fact the curator can act on, told apart from the 503 above by
      // manufacturerOwner rather than by a null that meant both.
      //
      // Said here, naming the slug, rather than left to the worker's
      // `manufacturer.tokenId is required and must be a positive integer` --
      // which names a field the form does not have and cannot be acted on.
      return NextResponse.json(
        {
          errors: [
            `No manufacturer is registered under the slug "${slug}". A template is keyed to a Manufacturer NFT, so the make slug has to be one identity-api knows — check the slug, or have the manufacturer minted first.`,
          ],
        },
        { status: 422 },
      );
    }

    // TemplatePayload deliberately excludes `author` -- it is not client input.
    // The wire body does carry it, stamped here, which is the one place the two
    // shapes differ.
    const payload = {
      ...submitted,
      manufacturer: { ...submittedManufacturer, tokenId: held.tokenId },
      author: caller.address,
    } as unknown as TemplatePayload;
    const result = await publishTemplate(id, payload, precondition);

    if (result.ok) return NextResponse.json({ template: result.template });
    if (result.kind === 'validation') {
      return NextResponse.json({ errors: result.errors }, { status: 422 });
    }
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
