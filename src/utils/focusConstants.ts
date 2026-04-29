export const FOCUS_QUERY_PARAM = 'focus';
export const FOCUS_SESSION_KEY = 'dimoFocus';

export const FOCUS_RENTALS_OS_SIGNUP = 'rentals_os_signup';

export type FocusValue = typeof FOCUS_RENTALS_OS_SIGNUP;

export const KNOWN_FOCUS_VALUES: readonly FocusValue[] = [FOCUS_RENTALS_OS_SIGNUP];

export const isFocusValue = (value: string | null | undefined): value is FocusValue =>
  !!value && (KNOWN_FOCUS_VALUES as readonly string[]).includes(value);
