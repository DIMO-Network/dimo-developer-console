import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('flow=company-information'),
}));
jest.mock('@/hooks/useErrorHandler', () => ({
  useErrorHandler: jest.fn(),
}));
jest.mock('@/actions/user', () => ({ getUser: jest.fn(async () => ({})) }));
jest.mock('@/app/sign-up/actions', () => ({ completeUserData: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
jest.mock('@/components/Anchor', () => ({ Anchor: () => null }));
jest.mock('@/app/sign-up/components', () => ({
  WalletCreation: () => null,
  BuildForForm: () => null,
  CompanyInfoForm: ({
    onNext,
    isLoading,
  }: {
    onNext: (flow: string) => void;
    isLoading: boolean;
  }) => (
    <button disabled={isLoading} onClick={() => onNext('company-information')}>
      Finish
    </button>
  ),
}));

import { toast } from 'sonner';
import { completeUserData } from '@/app/sign-up/actions';
import View from '@/app/sign-up/components/View/View';

const EMAIL_NOT_PROVEN_MESSAGE =
  "We couldn't confirm that this email belongs to your DIMO account.";

describe('sign-up View', () => {
  afterEach(() => jest.clearAllMocks());

  it('tells the user the email is not proven and lets them try again', async () => {
    (completeUserData as jest.Mock).mockResolvedValue({
      ok: false,
      reason: 'EMAIL_NOT_PROVEN',
    });
    render(<View />);
    fireEvent.click(screen.getByText('Finish'));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(EMAIL_NOT_PROVEN_MESSAGE),
    );
    await waitFor(() => expect(screen.getByText('Finish')).not.toBeDisabled());
    expect(replace).not.toHaveBeenCalled();
  });
});
