import { NextRequest, NextResponse } from 'next/server';
import configuration from '@/config';
import { assetKind, getSubjectJwt, SubjectJwtError } from '@/services/subjectJwt';
import { authorizeLicenseAccess, type AccessDecision } from '@/services/licenseAccess';
import { cookieName } from '@/services/dimoDevAPI';

export type DataApi = 'telemetry' | 'fetch';

const MAX_QUERY_CHARS = 20_000;
const UPSTREAM: Record<DataApi, () => string> = {
  telemetry: () => configuration.telemetryApiUrl,
  fetch: () => configuration.fetchApiUrl,
};

type Body = { asset: string; query: string; variables?: Record<string, unknown> };

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

const readBody = async (req: NextRequest): Promise<Body | NextResponse> => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad('Expected a JSON body');
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return bad('Expected a JSON object body');
  const body = raw as Partial<Body>;
  if (typeof body.query !== 'string' || !body.query.trim())
    return bad('query is required');
  if (body.query.length > MAX_QUERY_CHARS) return bad('query is too long');
  if (typeof body.asset !== 'string') return bad('asset is required');
  if (
    body.variables !== undefined &&
    (typeof body.variables !== 'object' ||
      body.variables === null ||
      Array.isArray(body.variables))
  ) {
    return bad('variables must be an object');
  }
  return { asset: body.asset, query: body.query, variables: body.variables ?? {} };
};

// Telemetry serves vehicles; Fetch serves vehicles and owner accounts. Either
// way only this deployment's chain and vehicle NFT contract.
const assetAllowed = (api: DataApi, asset: string) => {
  const kind = assetKind(asset);
  return api === 'telemetry' ? kind === 'vehicle' : kind !== null;
};

type Outcome =
  | 'ok'
  | 'upstream_error'
  | 'not_shared'
  | 'signer_revoked'
  | 'exchange_error'
  | 'unreachable'
  | 'refused';

// One structured line per proxied request (spec: Audit), written once the
// outcome is known.
const audit = (entry: Record<string, unknown> & { outcome: Outcome }) =>
  console.info(JSON.stringify({ event: 'data_proxy', ...entry }));

// The email and team, or on the owner fast path the session wallet.
const who = (
  api: DataApi,
  asset: string,
  decision: Extract<AccessDecision, { allowed: true }>,
) => ({
  api,
  ...decision.caller,
  clientId: decision.clientId,
  asset,
  access: decision.access,
});

const EXCHANGE_OUTCOME: Record<string, Outcome> = {
  NO_ACCESS: 'signer_revoked',
  NOT_SHARED: 'not_shared',
};

// One handler shape for both upstreams: exchange the developer JWT for a token
// scoped to `asset`, forward the GraphQL request, pass the upstream answer back.
export const createDataProxy = (api: DataApi) => async (req: NextRequest) => {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ') || auth.length < 8) {
    return NextResponse.json(
      { error: 'Developer JWT required', code: 'DEV_JWT_INVALID' },
      { status: 401 },
    );
  }
  const devJwt = auth.slice(7);

  const body = await readBody(req);
  if (body instanceof NextResponse) return body;
  if (!assetAllowed(api, body.asset))
    return bad(`asset is not a DID this ${api} proxy serves`);

  const sessionToken = req.cookies.get(cookieName)?.value ?? null;
  const decision = await authorizeLicenseAccess({ devJwt, sessionToken });
  if (!decision.allowed) {
    audit({
      api,
      asset: body.asset,
      outcome: 'refused',
      code: decision.code,
      status: decision.status,
    });
    return NextResponse.json(
      {
        error: decision.message,
        code: decision.code,
        memberOfTeam: decision.memberOfTeam,
      },
      { status: decision.status },
    );
  }

  try {
    const token = await getSubjectJwt(devJwt, body.asset);
    const upstream = await fetch(UPSTREAM[api](), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: body.query, variables: body.variables }),
      cache: 'no-store',
    });
    const text = await upstream.text();
    audit({
      ...who(api, body.asset, decision),
      outcome: upstream.ok ? 'ok' : 'upstream_error',
      status: upstream.status,
    });
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof SubjectJwtError) {
      audit({
        ...who(api, body.asset, decision),
        outcome: EXCHANGE_OUTCOME[err.code] ?? 'exchange_error',
        status: err.status,
      });
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    audit({ ...who(api, body.asset, decision), outcome: 'unreachable', status: 502 });
    return NextResponse.json(
      { error: `The ${api} API could not be reached`, code: 'UPSTREAM' },
      { status: 502 },
    );
  }
};
