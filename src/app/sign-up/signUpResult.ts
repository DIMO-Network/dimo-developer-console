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

type Translate = (key: string) => string;

const explain = (reason: SignUpRefusal, goToSignIn: () => void, t: Translate) => {
  switch (reason) {
    case 'ACCOUNT_EXISTS':
      toast.error(t('refusal.accountExists'), {
        action: { label: t('refusal.signIn'), onClick: goToSignIn },
      });
      return;
    case 'EMAIL_TAKEN':
      toast.error(t('refusal.emailTaken'));
      return;
    case 'EMAIL_NOT_PROVEN':
      toast.error(t('refusal.emailNotProven'));
      return;
    case 'UNREACHABLE':
      toast.error(t('refusal.unreachable'));
      return;
    case 'FAILED':
      toast.error(t('refusal.failed'));
  }
};

// True when the error was a refusal and the user has been told; the caller then
// skips its own report and generic toast.
// `t` is the `sign-up` translator.
export const explainSignUpRefusal = (
  error: unknown,
  goToSignIn: () => void,
  t: Translate,
): boolean => {
  if (!(error instanceof SignUpRefusedError)) return false;
  explain(error.reason, goToSignIn, t);
  return true;
};
