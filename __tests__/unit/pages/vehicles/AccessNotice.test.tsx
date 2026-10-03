import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
import { AccessNotice } from '@/app/vehicles/[tokenId]/components/AccessNotice';

const base = {
  licenseLabel: 'Harness Fleet',
  clientId: '0xaaa',
  redirectUri: 'https://x',
  onGenerated: jest.fn(),
  onViewSharing: jest.fn(),
  onRetry: jest.fn(),
};

describe('AccessNotice', () => {
  it('asks the team owner for access', () => {
    render(
      <AccessNotice {...base} access="no-access" ownerEmail="ops@acme.dev" member />,
    );
    expect(
      screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.'),
    ).toBeInTheDocument();
  });

  it('says a removed member no longer has access (C8)', () => {
    render(<AccessNotice {...base} access="removed" member ownerEmail="ops@acme.dev" />);
    expect(
      screen.getByText('You no longer have access to this license.'),
    ).toBeInTheDocument();
  });

  it('offers to reconnect when the chain still lists the wallet', () => {
    render(
      <AccessNotice {...base} access="reconnect" member ownerEmail="ops@acme.dev" />,
    );
    expect(
      screen.getByRole('button', { name: 'Reconnect with your wallet' }),
    ).toBeInTheDocument();
  });

  it('says data access is not available yet (C8)', () => {
    render(
      <AccessNotice {...base} access="unavailable" member ownerEmail="ops@acme.dev" />,
    );
    expect(
      screen.getByText("Data access for team members isn't available yet."),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry for an unknown answer', () => {
    render(<AccessNotice {...base} access="error" />);
    expect(
      screen.getByText("We couldn't check your access to Harness Fleet."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(base.onRetry).toHaveBeenCalled();
  });

  it('offers a member their wallet instead of an API key, and keeps the owner flow', () => {
    const { unmount } = render(
      <AccessNotice {...base} access="no-jwt" member ownerEmail="ops@acme.dev" />,
    );
    expect(
      screen.getByRole('button', { name: 'Connect with your wallet' }),
    ).toBeInTheDocument();
    unmount();
    render(<AccessNotice {...base} access="no-jwt" />);
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });
});
