// Message keys in the common namespace; the caller translates them.
export const INVITE_ERROR_KEYS: Record<string, string> = {
  INVITE_INVALID: 'pendingInvite.errors.INVITE_INVALID',
  INVITE_EXPIRED: 'pendingInvite.errors.INVITE_EXPIRED',
  INVITE_EMAIL_MISMATCH: 'pendingInvite.errors.INVITE_EMAIL_MISMATCH',
};

export const inviteErrorKey = (code: string | null): string =>
  (code && INVITE_ERROR_KEYS[code]) || 'pendingInvite.errors.fallback';
