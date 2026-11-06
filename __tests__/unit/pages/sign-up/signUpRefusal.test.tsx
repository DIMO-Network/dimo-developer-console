import { render, waitFor } from '@testing-library/react';

const replace = jest.fn();
const params = new URLSearchParams('email=dev%40x.test');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}));
const mockLogin = jest.fn();
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ setUser: jest.fn(), loginWithPasskey: mockLogin }),
}));
jest.mock('@/hooks/useMixPanel', () => ({
  useMixPanel: () => ({ trackEvent: jest.fn() }),
}));
jest.mock('@/hooks/usePasskey', () => ({
  usePasskey: () => ({
    isPasskeyAvailable: true,
    getNewUserPasskey: async () => ({ encodedChallenge: 'c', attestation: {} }),
  }),
}));
jest.mock('@/actions/user', () => ({
  createUserGlobalAccount: jest.fn(async () => ({ subOrganizationId: 'org-1' })),
}));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/app/sign-up/components/WalletCreation/PasskeySignup', () => ({
  PasskeySignup: () => <p>Creating your account</p>,
}));
jest.mock('@/app/sign-up/components/WalletCreation/OtpSignup', () => ({
  OtpSignup: () => null,
}));
jest.mock('@/app/sign-up/components/WalletCreation/NoPasskeyAccount', () => ({
  NoPasskeySignup: () => null,
}));
jest.mock('@/app/sign-up/components/WalletCreation/AccountFound', () => ({
  AccountFoundSignup: () => null,
}));

import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { WalletCreation } from '@/app/sign-up/components/WalletCreation/WalletCreation';
import {
  ACCOUNT_EXISTS_MESSAGE,
  EMAIL_NOT_PROVEN_MESSAGE,
  EMAIL_TAKEN_MESSAGE,
  explainSignUpRefusal,
  SIGN_UP_FAILED_MESSAGE,
  SignUpRefusedError,
  UNREACHABLE_MESSAGE,
} from '@/app/sign-up/signUpResult';

afterEach(() => jest.clearAllMocks());

describe('explainSignUpRefusal', () => {
  it('offers sign-in for an account that exists', () => {
    const goToSignIn = jest.fn();
    expect(
      explainSignUpRefusal(new SignUpRefusedError('ACCOUNT_EXISTS'), goToSignIn),
    ).toBe(true);
    expect(ACCOUNT_EXISTS_MESSAGE).toBe('This account already exists — sign in instead.');
    const [message, options] = (toast.error as jest.Mock).mock.calls[0];
    expect(message).toBe(ACCOUNT_EXISTS_MESSAGE);
    expect(options.action.label).toBe('Sign in');
    options.action.onClick();
    expect(goToSignIn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE],
    ['EMAIL_NOT_PROVEN', EMAIL_NOT_PROVEN_MESSAGE],
    ['UNREACHABLE', UNREACHABLE_MESSAGE],
    ['FAILED', SIGN_UP_FAILED_MESSAGE],
  ] as const)('says %s', (reason, message) => {
    expect(explainSignUpRefusal(new SignUpRefusedError(reason), jest.fn())).toBe(true);
    expect(toast.error).toHaveBeenCalledWith(message);
  });

  it('has the agreed copy', () => {
    expect(EMAIL_TAKEN_MESSAGE).toBe(
      'This email is already used by another console account. Sign in with that account, or use a different email.',
    );
    expect(EMAIL_NOT_PROVEN_MESSAGE).toBe(
      "We couldn't confirm that this email belongs to your DIMO account.",
    );
    expect(UNREACHABLE_MESSAGE).toBe("Couldn't reach the console, try again.");
    expect(SIGN_UP_FAILED_MESSAGE).toBe(
      'Something went wrong while creating your account. Try again.',
    );
  });

  it('leaves other errors to the caller', () => {
    expect(explainSignUpRefusal(new Error('x'), jest.fn())).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });
});

describe('WalletCreation', () => {
  it('tells an existing account to sign in, without reporting a crash', async () => {
    mockLogin.mockRejectedValue(new SignUpRefusedError('ACCOUNT_EXISTS'));
    render(<WalletCreation onNext={jest.fn()} />);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        ACCOUNT_EXISTS_MESSAGE,
        expect.objectContaining({
          action: expect.objectContaining({ label: 'Sign in' }),
        }),
      ),
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
    // The screen is a spinner: a refusal has to leave it too.
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
  });

  it.each([
    ['EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE],
    ['UNREACHABLE', UNREACHABLE_MESSAGE],
    ['FAILED', SIGN_UP_FAILED_MESSAGE],
  ] as const)('explains a %s refusal and leaves the spinner', async (reason, message) => {
    mockLogin.mockRejectedValue(new SignUpRefusedError(reason));
    render(<WalletCreation onNext={jest.fn()} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
