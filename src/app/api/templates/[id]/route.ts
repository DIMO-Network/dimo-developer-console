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
