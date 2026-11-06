import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';
import { LoggedUser } from '@/utils/loggedUser';

// Navigations without a fresh session verdict wait on this lookup. Edge stopped the
// middleware at about 25 seconds; a Node function would wait out the client's minutes.
export const ACCOUNT_LOOKUP_TIMEOUT_MS = 25_000;

export type SessionCheck =
  | { status: 'ok' }
  // Every console user signs in with their own global account; team members
  // are no longer represented by the company owner's account.
  | { status: 'no-account' }
  | { status: 'unfinished'; missingFlow: string };

// What a session token must pass before the proxy remembers it
// (SESSION_VERDICT_COOKIE): console-api knows its user, the user has a global
// account, and onboarding is done. Without a token, the session cookie's.
export const checkSession = async (token?: string): Promise<SessionCheck> => {
  const user = await getUserByToken(token);
  const subOrganization = await getUserSubOrganization(user.email, {
    timeout: ACCOUNT_LOOKUP_TIMEOUT_MS,
  });
  if (!subOrganization) return { status: 'no-account' };
  const loggedUser = new LoggedUser(user, subOrganization);
  if (!loggedUser.isCompliant) {
    return { status: 'unfinished', missingFlow: loggedUser.missingFlow };
  }
  return { status: 'ok' };
};
