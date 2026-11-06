'use server';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { ICreateGlobalAccountRequest, ISubOrganization } from '@/types/wallet';
import { TSignedRequest } from '@turnkey/http';
import { cookies } from 'next/headers';
import { cookieName } from '@/services/dimoDevAPI';
import config from '@/config';
import { reportUnexpected } from '@/utils/upstreamErrors';
import {
  decodeJwtToken,
  SESSION_VERDICT_COOKIE,
  SESSION_VERDICT_MAX_AGE,
  sessionVerdictFor,
} from '@/utils/middlewareUtils';
import { checkSession } from '@/services/sessionCheck';
import { ACTIVE_TEAM_COOKIE, INVITE_TOKEN_COOKIE } from '@/utils/teamCookies';

export const getUser = async () => {
  try {
    return await getUserByToken();
  } catch (error) {
    reportUnexpected(error);
    return null;
  }
};

export const existUserEmailOrAddress = async (address: string | null) => {
  return existUserByEmailOrAddress(address);
};

export const getUserInformation = async (email: string) => {
  const { existItem, role, currentWallet } = await existUserByEmailOrAddress(email);
  const organization = await getUserSubOrganization(email);

  if (!organization && !existItem) {
    return null;
  }

  // A console account older than global accounts. Signing up can't help: it would
  // create a global account, then fail on the email this row already holds.
  if (!organization) {
    return {
      existsOnGlobalAccount: false as const,
      existsOnDevConsole: true,
      currentWalletAddress: currentWallet,
      role,
      hasPasskey: false,
      subOrganizationId: undefined,
    };
  }

  if (!existItem) {
    return {
      existsOnGlobalAccount: true as const,
      existsOnDevConsole: false,
      role: role,
      currentWalletAddress: currentWallet,
      hasPasskey: organization.hasPasskey,
      subOrganizationId: organization.subOrganizationId,
    };
  }

  const { hasPasskey, subOrganizationId } = organization;

  return {
    existsOnGlobalAccount: true as const,
    existsOnDevConsole: existItem,
    currentWalletAddress: currentWallet,
    role,
    hasPasskey,
    subOrganizationId,
  };
};

export const createUserGlobalAccount = async (
  request: Partial<ICreateGlobalAccountRequest>,
): Promise<ISubOrganization> => {
  const response = await createSubOrganization(request);
  return response;
};

export const emailRecovery = async (email: string, targetPublicKey: string) => {
  await startEmailRecovery({ email, key: targetPublicKey });
  return true;
};

export const saveNewPasskey = async ({
  email,
  signedRecoveryRequest,
  signedAuthenticatorRemoval,
}: {
  email: string;
  signedRecoveryRequest: TSignedRequest;
  signedAuthenticatorRemoval: TSignedRequest;
}) => {
  await rewirePasskey({
    email,
    signedRecoveryRequest,
    signedAuthenticatorRemoval,
  });
  return true;
};

// How long a sign-in waits for the session check below before leaving it to
// the proxy.
const SIGN_IN_CHECK_BUDGET_MS = 3_000;

// The proxy's check (src/proxy.ts), run as the session starts: the token
// verifies and passes checkSession, within the budget. Anything else, a
// failure included, is a no: the proxy then checks as it always has.
const passesSessionCheck = async (token: string): Promise<boolean> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const outOfTime = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), SIGN_IN_CHECK_BUDGET_MS);
  });
  // One deadline from the start: the token check (which may fetch the key
  // set) and both lookups all come out of the same 3 s.
  const deadline = Date.now() + SIGN_IN_CHECK_BUDGET_MS;
  const check = (async () => {
    await decodeJwtToken(token);
    return (await checkSession(token, deadline - Date.now())).status === 'ok';
  })().catch(() => false);
  try {
    return await Promise.race([check, outOfTime]);
  } finally {
    clearTimeout(timer);
  }
};

export const saveToken = async (token: string, sessionExpiration: number) => {
  const userCookies = await cookies();
  // Only server code reads it. Lax keeps it off cross-site POSTs, while the
  // console's own pages and the sign-in redirect still carry it.
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.frontendUrl.startsWith('https:'),
    path: '/',
  } as const;
  userCookies.set(cookieName, token, { ...options, maxAge: sessionExpiration });
  // The proxy checks a new session once, then remembers it for this token.
  // Unremembered, the page after sign-in, its prefetches and its data requests
  // (about ten at once) each ran the check, one of them taking 2.6 s. Checked
  // once here, they all go straight through.
  if (await passesSessionCheck(token)) {
    userCookies.set(SESSION_VERDICT_COOKIE, await sessionVerdictFor(token), {
      ...options,
      maxAge: SESSION_VERDICT_MAX_AGE,
    });
  }
};

// A session that ended on its own (it expired): the next sign-in decides
// whether the active team and a pending invite still apply (startConsoleSession).
export const endSession = async () => {
  const userCookies = await cookies();
  userCookies.delete(cookieName);
  userCookies.delete(SESSION_VERDICT_COOKIE);
  return true;
};

export const signOut = async () => {
  const userCookies = await cookies();
  userCookies.delete(cookieName);
  userCookies.delete(SESSION_VERDICT_COOKIE);
  // Contracts C4: sign-out also forgets the active team and a pending invite.
  userCookies.delete(ACTIVE_TEAM_COOKIE);
  userCookies.delete(INVITE_TOKEN_COOKIE);
  return true;
};
