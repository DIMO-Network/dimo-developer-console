// Message keys in the common namespace; the caller translates them.
const KEYS: Record<string, string> = {
  INVITE_INVALID: 'pendingInvite.errors.INVITE_INVALID',
  INVITE_EXPIRED: 'pendingInvite.errors.INVITE_EXPIRED',
  INVITE_EMAIL_MISMATCH: 'pendingInvite.errors.INVITE_EMAIL_MISMATCH',
};

export const inviteErrorKey = (code: string | null): string =>
  (code && KEYS[code]) || 'pendingInvite.errors.fallback';
