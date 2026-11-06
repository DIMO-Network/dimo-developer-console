import { NextRequest } from 'next/server';
import { signOut } from '@/actions/user';
import { refuseCrossSite, respond } from '../sameOrigin';

// The server half of a sign-out the user chose, with or without a session
// cookie: the signOut action can't run once the cookie is gone (the proxy
// answers it with a 401, which clears only the session cookies), and this
// clears the active team and a pending invite too.
export const POST = async (request: NextRequest) => {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  await signOut();
  return respond({ ok: true });
};
