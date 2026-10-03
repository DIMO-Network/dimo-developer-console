const MESSAGES: Record<string, string> = {
  INVITE_INVALID:
    "This invite link isn't valid any more. Ask the team owner for a new one.",
  INVITE_EXPIRED: 'This invite has expired. Ask the team owner to resend it.',
  INVITE_EMAIL_MISMATCH:
    'This invite was sent to a different email address. Sign in with that address to accept it.',
};

export const inviteErrorMessage = (code: string | null): string =>
  (code && MESSAGES[code]) || "We couldn't accept this invite. Open the link again.";
