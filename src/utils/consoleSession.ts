'use client';
import { clearAllDevJwts } from '@/utils/devJwt';
import { clearActiveTeamCookie } from '@/utils/teamCookies';

// The browser half of sign-out; the server half is signOut() (cookies).
export const clearConsoleBrowserState = () => {
  clearAllDevJwts();
  clearActiveTeamCookie();
};
