import { cookies } from 'next/headers';
import axios, { AxiosError } from 'axios';

import config from '@/config';
import { ACTIVE_TEAM_COOKIE, TEAM_ID_HEADER } from '@/utils/teamCookies';

export const cookieName = 'session-token';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

// The user was removed from the active team (403 NOT_A_MEMBER, contracts C7):
// later calls fall back to the personal team. Cookies are writable only in
// server actions and route handlers; elsewhere the delete throws and is
// skipped. TeamProvider tells the user (reportRemoved).
export const clearStaleTeamOnNotAMember = async (error: unknown) => {
  const code =
    error instanceof AxiosError
      ? (error.response?.data as { code?: string } | undefined)?.code
      : undefined;
  if (
    error instanceof AxiosError &&
    error.response?.status === 403 &&
    code === 'NOT_A_MEMBER'
  ) {
    try {
      (await cookies()).delete(ACTIVE_TEAM_COOKIE);
    } catch {
      // read-only cookie store here
    }
  }
  throw error;
};

// Next logs what a Server Action throws, and that prints every field of the error: the
// session token and the request body sit in its configs, and again in the raw requests.
// Callers read the message, the code, and the response's status and data, so those stay.
const dropAuthorization = (headers: unknown) => {
  if (!headers) return;
  // AxiosHeaders matches the name in any case. A plain object, which an adapter or a
  // rebuilt config can leave, has no delete(), and a TypeError here would replace the
  // AxiosError the caller reads.
  const { delete: remove } = headers as { delete?: unknown };
  if (typeof remove === 'function') {
    remove.call(headers, 'Authorization');
  } else {
    delete (headers as Record<string, unknown>).Authorization;
  }
};

const stripRequestDetails = (error: unknown) => {
  if (!(error instanceof AxiosError)) return;
  for (const config of [error.config, error.response?.config]) {
    dropAuthorization(config?.headers);
    delete config?.data;
  }
  delete error.request;
  delete error.response?.request;
};

export const dimoDevAPIClient = async (timeout: number = 5000, token?: string) => {
  let authHeader = undefined;

  if (token) {
    authHeader = `Bearer ${token}`;
  } else {
    const sessionToken = await getCookie(cookieName);
    if (sessionToken) {
      authHeader = `Bearer ${sessionToken}`;
    }
  }

  // console-api resolves every /api/my/* call against this team; without it the
  // caller's personal team is used (contracts C4/C7).
  const teamId = await getCookie(ACTIVE_TEAM_COOKIE);

  const client = axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
      ...(teamId ? { [TEAM_ID_HEADER]: teamId } : {}),
    },
  });
  client.interceptors.response.use(undefined, (error: unknown) => {
    stripRequestDetails(error);
    return clearStaleTeamOnNotAMember(error);
  });
  return client;
};
