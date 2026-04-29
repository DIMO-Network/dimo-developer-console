'use client';

import { getFromSession, removeFromSession, saveToSession } from '@/utils/sessionStorage';

export const FOCUS_QUERY_PARAM = 'focus';
export const FOCUS_SESSION_KEY = 'dimoFocus';

export const FOCUS_RENTALS_OS_SIGNUP = 'rentals_os_signup';

export type FocusValue = typeof FOCUS_RENTALS_OS_SIGNUP;

const KNOWN_FOCUS_VALUES: readonly FocusValue[] = [FOCUS_RENTALS_OS_SIGNUP];

const isFocusValue = (value: string | null): value is FocusValue =>
  !!value && (KNOWN_FOCUS_VALUES as readonly string[]).includes(value);

export const saveFocus = (value: string): void => {
  if (isFocusValue(value)) {
    saveToSession(FOCUS_SESSION_KEY, value);
  }
};

export const getFocus = (): FocusValue | null => {
  const value = getFromSession<FocusValue>(FOCUS_SESSION_KEY);
  return isFocusValue(value) ? value : null;
};

export const clearFocus = (): void => {
  removeFromSession(FOCUS_SESSION_KEY);
};
