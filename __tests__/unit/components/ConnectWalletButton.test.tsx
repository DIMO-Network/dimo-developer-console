import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetJwt = jest.fn();
jest.mock('@/hooks/useMemberDevJwt', () => ({
  ...jest.requireActual('@/hooks/useMemberDevJwt'),
  useMemberDevJwt: () => mockGetJwt,
}));
const trackEvent = jest.fn();
jest.mock('@/hooks/useMixPanel', () => ({ useMixPanel: () => ({ trackEvent }) }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { MemberDevJwtError } from '@/hooks/useMemberDevJwt';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';

describe('ConnectWalletButton', () => {
  it('connects, tracks Wallet Connected and reports success', async () => {
    mockGetJwt.mockResolvedValue('dev.jwt');
    const onSuccess = jest.fn();
    render(
      <ConnectWalletButton clientId="0xaaa" domain="https://x" onSuccess={onSuccess} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Connect with your wallet' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockGetJwt).toHaveBeenCalledWith({ clientId: '0xaaa', domain: 'https://x' });
    expect(trackEvent).toHaveBeenCalledWith('Wallet Connected', { clientId: '0xaaa' });
  });

  it('shows why connecting failed', async () => {
    mockGetJwt.mockRejectedValue(
      new MemberDevJwtError('Access is still propagating — try again in a minute'),
    );
    const onSuccess = jest.fn();
    render(
      <ConnectWalletButton
        clientId="0xaaa"
        domain="https://x"
        onSuccess={onSuccess}
        label="Reconnect with your wallet"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect with your wallet' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Access is still propagating — try again in a minute',
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
