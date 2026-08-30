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
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: 'year must be an integer' }, { status: 400 });
    }
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
