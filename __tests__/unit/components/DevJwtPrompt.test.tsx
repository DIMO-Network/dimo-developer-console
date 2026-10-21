import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/GenerateDevJWT', () => ({
  GenerateDevJWT: () => <button>Generate developer JWT</button>,
}));
jest.mock('@/components/DataAccess/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label = 'Connect with your wallet' }: { label?: string }) => (
    <button>{label}</button>
  ),
}));
import { DevJwtPrompt } from '@/components/DataAccess';
import { LocalDeveloperLicense } from '@/types/webhook';

const license = new LocalDeveloperLicense({
  alias: 'Harness Fleet',
  clientId: '0xaaa',
  redirectURIs: { nodes: [{ uri: 'https://x' }] },
});
const show = (access: Parameters<typeof DevJwtPrompt>[0]['access']) =>
  render(
    <DevJwtPrompt license={license} access={access} onSuccess={jest.fn()} message="m" />,
  );

describe('DevJwtPrompt', () => {
  it('offers owners the API-key flow', () => {
    show({ kind: 'owner' });
    expect(
      screen.getByRole('button', { name: 'Generate developer JWT' }),
    ).toBeInTheDocument();
  });

  it('offers members with access their wallet', () => {
    show({ kind: 'member' });
    expect(
      screen.getByRole('button', { name: 'Connect with your wallet' }),
    ).toBeInTheDocument();
  });

  it('tells members without access whom to ask (C8)', () => {
    show({ kind: 'member-no-access', ownerEmail: 'ops@acme.dev' });
    expect(
      screen.getByText('Ask ops@acme.dev for data access to Harness Fleet.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says data access is not available yet while the flag is off (C8)', () => {
    show({ kind: 'member-unavailable' });
    expect(
      screen.getByText("Data access for team members isn't available yet."),
    ).toBeInTheDocument();
  });
});
