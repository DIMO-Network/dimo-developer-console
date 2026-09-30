import { NextRequest, NextResponse } from 'next/server';
import configuration from '@/config';
import { getSubjectJwt, SubjectJwtError } from '@/services/subjectJwt';
import { isEthrDid, parseErc721Did } from '@/services/subjects/did';

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
  const body = raw as Partial<Body>;
  if (typeof body.query !== 'string' || !body.query.trim())
    return bad('query is required');
  if (body.query.length > MAX_QUERY_CHARS) return bad('query is too long');
  if (typeof body.asset !== 'string') return bad('asset is required');
  if (
    body.variables !== undefined &&
    (typeof body.variables !== 'object' || body.variables === null)
  ) {
    return bad('variables must be an object');
  }
  return { asset: body.asset, query: body.query, variables: body.variables ?? {} };
};

const assetAllowed = (api: DataApi, asset: string) =>
  api === 'telemetry'
    ? !!parseErc721Did(asset)
    : !!parseErc721Did(asset) || isEthrDid(asset);

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

  try {
    const token = await getSubjectJwt(devJwt, body.asset);
    const upstream = await fetch(UPSTREAM[api](), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: body.query, variables: body.variables }),
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (err instanceof SubjectJwtError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: `The ${api} API could not be reached`, code: 'UPSTREAM' },
      { status: 502 },
    );
  }
};
