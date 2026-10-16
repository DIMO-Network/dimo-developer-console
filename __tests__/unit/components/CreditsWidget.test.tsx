import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
// The @/hooks barrel loads modules jsdom can't run (next/cache, wagmi's ESM);
// CreditsWidget needs only useGlobalAccount, which reads the context below.
jest.mock('@/hooks', () => ({
  useGlobalAccount: jest.requireActual('@/hooks/useGlobalAccount').useGlobalAccount,
}));
jest.mock('@/components/AccountInfoButton', () => ({
  AccountInfoButton: () => <button>Account info</button>,
}));
import { useTeam } from '@/hooks/useTeam';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { CreditsWidget } from '@/components/CreditsWidget';

const withUser = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <GlobalAccountContext.Provider
        value={{
          currentUser: null,
          validateCurrentSession: async () => null,
          getCurrentDcxBalance: async () => 0,
          getCurrentDimoBalance: async () => 0,
          logout: async () => {},
        }}
      >
        {ui}
      </GlobalAccountContext.Provider>
    </QueryClientProvider>,
  );

describe('CreditsWidget for members', () => {
  it("hides the header balance, which is the member's own wallet, not the team's", () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    const { container } = withUser(<CreditsWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps Account info in the large variant but drops the balance', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: true });
    withUser(<CreditsWidget variant="large" />);
    expect(screen.getByRole('button', { name: 'Account info' })).toBeInTheDocument();
    expect(screen.queryByText('Current Balance')).toBeNull();
  });

  it('is unchanged for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isMember: false });
    withUser(<CreditsWidget variant="large" />);
    expect(screen.getByText('Current Balance')).toBeInTheDocument();
  });
});
