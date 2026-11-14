import type { Translate } from '@/i18n/translate';

type Failure = { status: number; code: string | null; message: string };

// Invite and resend failures (C7). Rate limits and NOT_A_MEMBER ("Finish
// setting up your team first") carry console-api's own message.
export const inviteSendError = (
  failure: Failure,
  email: string,
  t: Translate,
): string => {
  switch (failure.code) {
    case 'EMAIL_FAILED':
      return t('inviteError.emailFailed', { email });
    case 'RATE_LIMITED':
      return failure.message || t('inviteError.rateLimited');
    case 'ALREADY_MEMBER':
      return t('inviteError.alreadyMember', { email });
    case 'ALREADY_INVITED':
      return t('inviteError.alreadyInvited', { email });
    case 'INVALID_EMAIL':
      return t('inviteError.invalidEmail');
    default:
      return failure.message || t('inviteError.default');
  }
};
