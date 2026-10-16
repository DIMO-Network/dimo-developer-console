'use client';
import { clearAllDevJwts } from '@/utils/devJwt';
import {
  getFromLocalStorage,
  removeFromLocalStorage,
  saveToLocalStorage,
} from '@/utils/localStorage';
import { clearActiveTeamCookie } from '@/utils/teamCookies';

// The account that last signed in on this browser (its sub-organization).
const CONSOLE_ACCOUNT_KEY = 'consoleAccount';

// The browser half of an explicit sign-out (C4); the server half is signOut().
export const clearConsoleBrowserState = () => {
  clearAllDevJwts();
  clearActiveTeamCookie();
  removeFromLocalStorage(CONSOLE_ACCOUNT_KEY);
};

// At sign-in. A console session lasts 15–30 minutes, so the same person signs
// in again often: they keep their developer JWTs and active team. Anyone else,
// or an unknown previous account, starts clean.
export const startConsoleSession = (accountId: string) => {
  if (getFromLocalStorage<string>(CONSOLE_ACCOUNT_KEY) !== accountId) {
    clearConsoleBrowserState();
  }
  saveToLocalStorage(CONSOLE_ACCOUNT_KEY, accountId);
};
