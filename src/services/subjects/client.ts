import { getDevJwt } from '@/utils/devJwt';
import type { GqlRequest } from './queries';

export type DataApi = 'telemetry' | 'fetch';
export type GqlError = { message: string; path?: (string | number)[] };
export type GqlResult<T> = { data: T | null; errors?: GqlError[] };
export type DataApiCode =
  | 'DEV_JWT_MISSING'
  | 'DEV_JWT_INVALID'
  | 'NOT_SHARED'
  | 'NO_ACCESS'
  | 'ACCESS_CHECK_FAILED'
  | 'INVALID_CLIENT_ID'
  | 'UPSTREAM'
  | 'GRAPHQL'
  | 'UNKNOWN';

const KNOWN_CODES = new Set<string>([
  'DEV_JWT_MISSING',
  'DEV_JWT_INVALID',
  'NOT_SHARED',
  'NO_ACCESS',
  'ACCESS_CHECK_FAILED',
  'INVALID_CLIENT_ID',
  'UPSTREAM',
  'GRAPHQL',
]);

export class DataApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: DataApiCode,
    message: string,
    public readonly graphqlErrors: GqlError[] = [],
    // From the data proxy's NO_ACCESS: false means the user left the team.
    public readonly memberOfTeam?: boolean,
  ) {
    super(message);
    this.name = 'DataApiError';
  }
}

export const postSubjectQuery = async <T>(
  api: DataApi,
  input: { asset: string; clientId: string; request: GqlRequest },
): Promise<GqlResult<T>> => {
  const devJwt = getDevJwt(input.clientId);
  if (!devJwt) {
    throw new DataApiError(
      0,
      'DEV_JWT_MISSING',
      'Generate a developer JWT to read this data',
    );
  }
  let res: Response;
  try {
    res = await fetch(`/api/data/${api}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${devJwt}`,
      },
      body: JSON.stringify({ asset: input.asset, ...input.request }),
    });
  } catch {
    throw new DataApiError(0, 'UPSTREAM', `The ${api} API could not be reached`);
  }
  const body = (await res.json().catch(() => ({}))) as {
    data?: T | null;
    errors?: GqlError[];
    error?: string;
    code?: string;
    memberOfTeam?: boolean;
  };
  if (body.code && body.error) {
    const code = KNOWN_CODES.has(body.code) ? (body.code as DataApiCode) : 'UNKNOWN';
    throw new DataApiError(res.status, code, body.error, [], body.memberOfTeam);
  }
  // gqlgen answers a refused privilege with 200, data: null and the errors, so
  // no data plus errors is a failure whatever the status. Partial data (data
  // set, errors on some fields) is returned for the panels to show per field.
  if (body.data == null && body.errors?.length) {
    throw new DataApiError(res.status, 'GRAPHQL', body.errors[0].message, body.errors);
  }
  if (!res.ok && !body.data) {
    throw new DataApiError(
      res.status,
      'UPSTREAM',
      `The ${api} API answered ${res.status}`,
    );
  }
  return { data: body.data ?? null, errors: body.errors };
};

// The message shown in a panel for one failed field.
export const fieldError = (
  errors: GqlError[] | undefined,
  field: string,
): string | null => errors?.find((e) => e.path?.[0] === field)?.message ?? null;
