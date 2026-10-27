// Google and GitHub sign-in return to /sign-in with `code` and `state`. Anyone
// can link there with a code of their own, which would sign the visitor in
// with the linker's account, so a code counts only with the `state` this tab
// sent.
const OAUTH_STATE_KEY = 'dimo_console_oauth_state';

/** A fresh `state` for the sign-in about to start, or null without storage. */
export const createOAuthState = (): string | null => {
  try {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const state = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    return state;
  } catch {
    return null;
  }
};

/** True for the return of the sign-in this tab started; the state is then used up. */
export const takeOAuthState = (returned: string | null): boolean => {
  try {
    const expected = sessionStorage.getItem(OAUTH_STATE_KEY);
    if (!expected || returned !== expected) return false;
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    return true;
  } catch {
    return false;
  }
};
