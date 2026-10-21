type Failure = { status: number; code: string | null; message: string };

// Invite and resend failures (C7). Rate limits and NOT_A_MEMBER ("Finish
// setting up your team first") carry console-api's own message.
export const inviteSendError = (failure: Failure, email: string): string => {
  switch (failure.code) {
    case 'EMAIL_FAILED':
      return `We couldn't email ${email}. Try again.`;
    case 'RATE_LIMITED':
      return failure.message || 'Too many invites right now. Try again in a while.';
    case 'ALREADY_MEMBER':
      return `${email} is already in this team.`;
    case 'ALREADY_INVITED':
      return `${email} already has a pending invite. Resend it from the list.`;
    case 'INVALID_EMAIL':
      return 'Enter a valid email address.';
    default:
      return failure.message || "We couldn't send the invite. Try again.";
  }
};
