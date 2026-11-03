import { render, waitFor } from '@testing-library/react';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/hooks', () => ({ useMixPanel: () => ({ identifyUser: jest.fn() }) }));
jest.mock('@/actions/user', () => ({ endSession: jest.fn() }));
jest.mock('@/config/turnkey', () => ({
  turnkeyClient: { logout: jest.fn(async () => undefined) },
}));
jest.mock('@/services/turnkey', () => ({}));
jest.mock('@/services/zerodev', () => ({}));
jest.mock('@/hoc/QueryProvider', () => ({ queryClient: { clear: jest.fn() } }));

import { endSession } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { withGlobalAccounts } from '@/hoc/GlobalAccountProvider';

const Page = withGlobalAccounts(() => <p>page</p>);

describe('logout', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => jest.clearAllMocks());

  // A tab without a session logs out on mount. The proxy answers endSession
  // with a 401 then, and the redirect must still happen.
  it('still goes to sign-in when endSession is refused', async () => {
    (endSession as jest.Mock).mockRejectedValue(new Error('unexpected response'));
    render(<Page />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
  });

  it("still clears the session and goes to sign-in when Turnkey's logout fails", async () => {
    (endSession as jest.Mock).mockResolvedValue(true);
    (turnkeyClient.logout as jest.Mock).mockRejectedValueOnce(new Error('storage'));
    localStorage.setItem('globalAccountAddresses', '{}');
    render(<Page />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(localStorage.getItem('globalAccountAddresses')).toBeNull();
  });
});
