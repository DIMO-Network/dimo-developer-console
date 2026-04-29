'use client';

import { getFromSession, removeFromSession, saveToSession } from '@/utils/sessionStorage';
import { FOCUS_SESSION_KEY, FocusValue, isFocusValue } from '@/utils/focusConstants';

export {
  FOCUS_QUERY_PARAM,
  FOCUS_SESSION_KEY,
  FOCUS_RENTALS_OS_SIGNUP,
  type FocusValue,
} from '@/utils/focusConstants';

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
