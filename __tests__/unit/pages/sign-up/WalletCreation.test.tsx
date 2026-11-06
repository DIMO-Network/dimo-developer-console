import { render, waitFor } from '@testing-library/react';

const replace = jest.fn();
let params = new URLSearchParams('email=dev%40x.test');
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
import { toast } from 'sonner';
import { WalletCreation } from '@/app/sign-up/components/WalletCreation/WalletCreation';

// Each of these left the user on a spinner with no way out.
describe('WalletCreation', () => {
  beforeEach(() => {
    params = new URLSearchParams('email=dev%40x.test');
  });

  it('sends a visit without an email back to sign-in', async () => {
    params = new URLSearchParams('');
    render(<WalletCreation onNext={jest.fn()} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
  });

  it('leaves the spinner when signing in with the new passkey is refused', async () => {
    mockLogin.mockResolvedValue({ success: false });
    render(<WalletCreation onNext={jest.fn()} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(toast.error).toHaveBeenCalled();
  });

  it('leaves the spinner when signing in with the new passkey throws', async () => {
    mockLogin.mockRejectedValue(new Error('NotAllowedError'));
    render(<WalletCreation onNext={jest.fn()} />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(toast.error).toHaveBeenCalled();
  });
});
