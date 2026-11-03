import { toast } from 'sonner';
import type { IUser } from '@/types/user';

// What a sign-up step can be refused for. The server actions return these
// instead of throwing: a thrown error reaches the browser without its status or
// code, so the page could not tell "this account exists" from a crash.
export type SignUpRefusal =
  'ACCOUNT_EXISTS' | 'EMAIL_TAKEN' | 'EMAIL_NOT_PROVEN' | 'UNREACHABLE' | 'FAILED';

export type SignUpResult =
  { ok: true; data: IUser } | { ok: false; reason: SignUpRefusal };

export class SignUpRefusedError extends Error {
  constructor(readonly reason: SignUpRefusal) {
    super(`Sign-up refused: ${reason}`);
    this.name = 'SignUpRefusedError';
  }
}

export const ACCOUNT_EXISTS_MESSAGE = 'This account already exists — sign in instead.';
export const EMAIL_TAKEN_MESSAGE =
  'This email is already used by another console account. Sign in with that account, or use a different email.';
export const EMAIL_NOT_PROVEN_MESSAGE =
  "We couldn't confirm that this email belongs to your DIMO account.";
export const UNREACHABLE_MESSAGE = "Couldn't reach the console, try again.";
export const SIGN_UP_FAILED_MESSAGE =
  'Something went wrong while creating your account. Try again.';

const explain = (reason: SignUpRefusal, goToSignIn: () => void) => {
  switch (reason) {
    case 'ACCOUNT_EXISTS':
      toast.error(ACCOUNT_EXISTS_MESSAGE, {
        action: { label: 'Sign in', onClick: goToSignIn },
      });
      return;
    case 'EMAIL_TAKEN':
      toast.error(EMAIL_TAKEN_MESSAGE);
      return;
    case 'EMAIL_NOT_PROVEN':
      toast.error(EMAIL_NOT_PROVEN_MESSAGE);
      return;
    case 'UNREACHABLE':
      toast.error(UNREACHABLE_MESSAGE);
      return;
    case 'FAILED':
      toast.error(SIGN_UP_FAILED_MESSAGE);
  }
};

// True when the error was a refusal and the user has been told; the caller then
// skips its own report and generic toast.
export const explainSignUpRefusal = (error: unknown, goToSignIn: () => void): boolean => {
  if (!(error instanceof SignUpRefusedError)) return false;
  explain(error.reason, goToSignIn);
  return true;
};
