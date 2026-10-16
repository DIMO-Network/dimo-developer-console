// Server only: may the signed-in user use this developer JWT's license?
// Owners are recognised from Identity alone; everyone else asks console-api
// (C7), and a member must present a JWT their registered wallet signed (C1).
import { createHash } from 'node:crypto';
import axios, { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import configuration from '@/config';
import { NO_LONGER_HAS_ACCESS } from '@/config/teamCopy';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { BoundedCache } from '@/utils/boundedCache';
import type { LicenseAccess } from '@/types/team';

export type AccessDecision =
  | {
      allowed: true;
      access: 'OWNER' | 'MEMBER';
      clientId: string;
      // Who the audit line names (spec, Data proxy): console-api's session email
      // and the license's team, or on the owner fast path the session wallet.
      caller: { email: string; teamId: string | null } | { wallet: string };
    }
  | {
      allowed: false;
      status: 400 | 401 | 403 | 503;
      code: 'NO_ACCESS' | 'ACCESS_CHECK_FAILED' | 'DEV_JWT_INVALID' | 'INVALID_CLIENT_ID';
      message: string;
      memberOfTeam?: boolean;
    };

const TTL_MS = 60_000;
export const ACCESS_CACHE_MAX = 1000;
// The client ID of every console login: the audience of a console session.
const CONSOLE_CLIENT_ID = 'developer-platform';

// Entries live 60 s; a failed lookup is never stored.
const accessCache = new BoundedCache<LicenseAccess>(ACCESS_CACHE_MAX);
const ownerCache = new BoundedCache<string | null>(ACCESS_CACHE_MAX);
export const clearLicenseAccessCache = () => {
  accessCache.clear();
  ownerCache.clear();
};

class AccessLookupError extends Error {
  constructor(public readonly code: string | null) {
    super(code ?? 'license-access failed');
  }
}

const requestLicenseAccess = async (
  sessionToken: string,
  clientId: string,
): Promise<LicenseAccess> => {
  try {
    const { data } = await axios.get<LicenseAccess>('/api/my/license-access', {
      baseURL: configuration.backendUrl,
      timeout: 5000,
      params: { clientId },
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data;
  } catch (error) {
    const code =
      error instanceof AxiosError
        ? ((error.response?.data as { code?: string } | undefined)?.code ?? null)
        : null;
    throw new AccessLookupError(code);
  }
};

const requestLicenseOwner = async (clientId: string): Promise<string | null> => {
  const res = await fetch(configuration.identityApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query LicenseOwner($clientId: Address!) { developerLicense(by: { clientId: $clientId }) { owner } }',
      variables: { clientId },
    }),
    cache: 'no-store',
    // A hung Identity must fall through to console-api, not hold the request.
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`Identity API answered ${res.status}`);
  const body = (await res.json()) as {
    data?: { developerLicense?: { owner: string } | null } | null;
    errors?: unknown[];
  };
  if (!body.data && body.errors?.length) throw new Error('Identity API error');
  return body.data?.developerLicense?.owner ?? null;
};

const sessionKey = (sessionToken: string, clientId: string) =>
  `${createHash('sha256').update(sessionToken).digest('hex')}:${clientId.toLowerCase()}`;

export const getLicenseAccess = async (
  sessionToken: string,
  clientId: string,
  deps = { request: requestLicenseAccess, now: Date.now },
): Promise<LicenseAccess> => {
  const key = sessionKey(sessionToken, clientId);
  const hit = accessCache.get(key, deps.now());
  if (hit) return hit;
  const value = await deps.request(sessionToken, clientId);
  accessCache.set(key, value, deps.now() + TTL_MS);
  return value;
};

export const getLicenseOwner = async (
  clientId: string,
  deps = { request: requestLicenseOwner, now: Date.now },
): Promise<string | null> => {
  const key = clientId.toLowerCase();
  const hit = ownerCache.get(key, deps.now());
  if (hit !== undefined) return hit;
  const value = await deps.request(clientId);
  ownerCache.set(key, value, deps.now() + TTL_MS);
  return value;
};

const decode = <T>(token: string): T | null => {
  try {
    return jwtDecode<T>(token);
  } catch {
    return null;
  }
};

export const authorizeLicenseAccess = async (
  { devJwt, sessionToken }: { devJwt: string; sessionToken: string | null },
  deps: {
    lookupAccess?: (sessionToken: string, clientId: string) => Promise<LicenseAccess>;
    lookupOwner?: (clientId: string) => Promise<string | null>;
    dataAccessEnabled?: boolean;
  } = {},
): Promise<AccessDecision> => {
  const lookupAccess =
    deps.lookupAccess ?? ((s: string, c: string) => getLicenseAccess(s, c));
  const lookupOwner = deps.lookupOwner ?? ((c: string) => getLicenseOwner(c));
  const dataAccessEnabled = deps.dataAccessEnabled ?? TEAM_DATA_ACCESS_ENABLED;

  const claims = decode<{ ethereum_address?: string; signer_address?: string }>(devJwt);
  if (!claims?.ethereum_address) {
    return {
      allowed: false,
      status: 401,
      code: 'DEV_JWT_INVALID',
      message: 'The developer JWT could not be read',
    };
  }
  if (!sessionToken) {
    return {
      allowed: false,
      status: 401,
      code: 'NO_ACCESS',
      message: 'Sign in again to read this license.',
    };
  }
  const clientId = claims.ethereum_address;
  const session = decode<{ ethereum_address?: string; aud?: string | string[] }>(
    sessionToken,
  );
  const wallet = session?.ethereum_address ?? null;
  // The middleware verified the session's signature and issuer, not its
  // audience: a token another DIMO app received would pass. Only a console
  // session takes the fast path (C4); console-api checks the rest itself.
  const audience = [session?.aud ?? []].flat();
  const isConsoleSession = audience.includes(CONSOLE_CLIENT_ID);

  // Owner fast path: console-api is not needed to know a wallet owns a license.
  if (wallet && isConsoleSession) {
    try {
      const owner = await lookupOwner(clientId);
      if (owner && owner.toLowerCase() === wallet.toLowerCase()) {
        return { allowed: true, access: 'OWNER', clientId, caller: { wallet } };
      }
    } catch {
      // Identity unavailable: console-api decides.
    }
  }

  let access: LicenseAccess;
  try {
    access = await lookupAccess(sessionToken, clientId);
  } catch (error) {
    if ((error as { code?: string }).code === 'INVALID_CLIENT_ID') {
      return {
        allowed: false,
        status: 400,
        code: 'INVALID_CLIENT_ID',
        message: 'The developer JWT names a license console-api does not know',
      };
    }
    return {
      allowed: false,
      status: 503,
      code: 'ACCESS_CHECK_FAILED',
      message: 'Could not verify your access to this license. Try again.',
    };
  }

  if (access.access === 'OWNER') {
    return {
      allowed: true,
      access: 'OWNER',
      clientId,
      caller: { email: access.userEmail, teamId: access.teamId },
    };
  }
  const signer = claims.signer_address?.toLowerCase();
  if (
    access.access === 'MEMBER' &&
    dataAccessEnabled &&
    signer &&
    access.signerAddress &&
    signer === access.signerAddress.toLowerCase()
  ) {
    return {
      allowed: true,
      access: 'MEMBER',
      clientId,
      caller: { email: access.userEmail, teamId: access.teamId },
    };
  }
  return {
    allowed: false,
    status: 403,
    code: 'NO_ACCESS',
    message: access.memberOfTeam
      ? "You don't have data access to this license."
      : NO_LONGER_HAS_ACCESS,
    memberOfTeam: access.memberOfTeam,
  };
};
