import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ setUser: jest.fn(), completeExternalAuth: jest.fn() }),
}));
jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: jest.fn(),
}));
jest.mock('@/hooks/useMixPanel', () => ({
  useMixPanel: () => ({ trackEvent: jest.fn() }),
}));
jest.mock('@/hooks/usePasskey', () => ({
  usePasskey: () => ({ isPasskeyAvailable: true }),
}));
jest.mock('@/actions/user', () => ({ getUserInformation: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/app/sign-in/components', () => ({
  OtpInputForm: () => null,
  PasskeyLogin: () => null,
  SignInMethodForm: ({ handleLogin }: { handleLogin: (email: string) => void }) => (
    <button onClick={() => handleLogin('dev@x.test')}>Continue</button>
  ),
}));
import { toast } from 'sonner';
import { getUserInformation } from '@/actions/user';
import { View } from '@/app/sign-in/components/View/View';

describe('signing in', () => {
  // Sign-up would create a global account and then fail on the email this console
  // row already holds, leaving the account orphaned.
  it('stops a console account with no global account instead of signing it up', async () => {
    (getUserInformation as jest.Mock).mockResolvedValue({
      existsOnGlobalAccount: false,
      existsOnDevConsole: true,
      hasPasskey: false,
    });
    render(<View />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('contact developer support'),
      ),
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('still sends someone new to sign-up', async () => {
    (getUserInformation as jest.Mock).mockResolvedValue(null);
    render(<View />);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/sign-up?email=dev%40x.test'));
  });
});
