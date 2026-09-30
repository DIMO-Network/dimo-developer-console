// Server only: exchanges the developer JWT for an asset-scoped token.
// The proxy adds no privilege: token exchange only grants what the license's
// SACD already holds, and the token is bound to one asset DID.
import { jwtDecode } from 'jwt-decode';
import configuration from '@/config';
import { isEthrDid, parseErc721Did } from '@/services/subjects/did';
import { decodeSacdPermissions, PERMISSION_NAMES } from '@/utils/sacdPermissions';

export type SubjectJwtCode = 'DEV_JWT_INVALID' | 'NOT_SHARED' | 'UPSTREAM';

export class SubjectJwtError extends Error {
  constructor(
    public readonly status: 401 | 403 | 502,
    public readonly code: SubjectJwtCode,
    message: string,
  ) {
    super(message);
    this.name = 'SubjectJwtError';
  }
}

type Cached = { token: string; expiresAt: number };
const cache = new Map<string, Cached>();
const EXPIRY_SKEW_MS = 30_000;
const FALLBACK_TTL_MS = 9 * 60_000;

export const clearSubjectJwtCache = () => cache.clear();

const expiryOf = (token: string): number => {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    if (exp) return exp * 1000;
  } catch {
    // fall through to the fallback lifetime
  }
  return Date.now() + FALLBACK_TTL_MS;
};

const decodeDevJwt = (devJwt: string): { clientId: string } => {
  let payload: { ethereum_address?: string; exp?: number };
  try {
    payload = jwtDecode(devJwt);
  } catch {
    throw new SubjectJwtError(
      401,
      'DEV_JWT_INVALID',
      'The developer JWT could not be read',
    );
  }
  if (!payload.ethereum_address || (payload.exp && payload.exp * 1000 < Date.now())) {
    throw new SubjectJwtError(401, 'DEV_JWT_INVALID', 'The developer JWT has expired');
  }
  return { clientId: payload.ethereum_address };
};

const vehiclePermissions = async (
  tokenId: number,
  clientId: string,
): Promise<string[]> => {
  const res = await fetch(configuration.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query VehicleSacdForLicense($tokenId: Int!, $grantee: Address!) { vehicle(tokenId: $tokenId) { sacd(grantee: $grantee) { permissions } } }',
      variables: { tokenId, grantee: clientId },
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new SubjectJwtError(502, 'UPSTREAM', `Identity API answered ${res.status}`);
  }
  const body = (await res.json()) as {
    data?: { vehicle?: { sacd?: { permissions: string } | null } | null };
  };
  const hex = body.data?.vehicle?.sacd?.permissions;
  const names = hex
    ? decodeSacdPermissions(hex)
        .map((id) => PERMISSION_NAMES[id])
        .filter((n): n is string => !!n)
    : [];
  if (!names.length) {
    throw new SubjectJwtError(
      403,
      'NOT_SHARED',
      'This vehicle is not shared with the license',
    );
  }
  return names;
};

const permissionsFor = async (asset: string, clientId: string): Promise<string[]> => {
  const erc = parseErc721Did(asset);
  if (erc) return vehiclePermissions(erc.tokenId, clientId);
  if (isEthrDid(asset)) return ['privilege:GetRawData'];
  throw new SubjectJwtError(403, 'NOT_SHARED', 'Unsupported asset DID');
};

export const getSubjectJwt = async (devJwt: string, asset: string): Promise<string> => {
  const { clientId } = decodeDevJwt(devJwt);
  const key = `${clientId.toLowerCase()}:${asset}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + EXPIRY_SKEW_MS) return hit.token;

  const permissions = await permissionsFor(asset, clientId);
  const res = await fetch(configuration.tokenExchangeApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${devJwt}` },
    body: JSON.stringify({ asset, permissions }),
    cache: 'no-store',
  });
  if (res.status === 401) {
    throw new SubjectJwtError(
      401,
      'DEV_JWT_INVALID',
      'Token exchange rejected the developer JWT',
    );
  }
  if (res.status === 403) {
    throw new SubjectJwtError(
      403,
      'NOT_SHARED',
      'This asset is not shared with the license',
    );
  }
  if (!res.ok) {
    throw new SubjectJwtError(502, 'UPSTREAM', `Token exchange answered ${res.status}`);
  }
  const { token } = (await res.json()) as { token?: string };
  if (!token)
    throw new SubjectJwtError(502, 'UPSTREAM', 'Token exchange returned no token');
  cache.set(key, { token, expiresAt: expiryOf(token) });
  return token;
};
