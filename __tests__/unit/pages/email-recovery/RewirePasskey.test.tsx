import { render, waitFor } from '@testing-library/react';

let params = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => params }));
jest.mock('@/hooks/usePasskey', () => ({
  usePasskey: () => ({ getNewUserPasskey: jest.fn() }),
}));
jest.mock('@/actions/user', () => ({
  getUserInformation: jest.fn(async () => {
    throw new Error('stop after the lookup');
  }),
  saveNewPasskey: jest.fn(),
}));
jest.mock('@/services/turnkey', () => ({ getTurnkeyClient: jest.fn() }));
jest.mock('@/components/BubbleLoader', () => ({ BubbleLoader: () => null }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { getUserInformation } from '@/actions/user';
import { RewirePasskey } from '@/app/email-recovery/components/RewirePasskey';

describe('RewirePasskey', () => {
  it('looks the account up by the address with its + intact', async () => {
    params = new URLSearchParams('token=key&email=dev+fleet@x.test');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<RewirePasskey onNext={jest.fn()} />);

    await waitFor(() =>
      expect(getUserInformation).toHaveBeenCalledWith('dev+fleet@x.test'),
    );
  });

  it('does nothing without an email in the link', () => {
    params = new URLSearchParams('token=key');

    render(<RewirePasskey onNext={jest.fn()} />);

    expect(getUserInformation).not.toHaveBeenCalled();
  });
});
