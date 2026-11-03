import { act, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/hooks', () => ({ useMixPanel: () => ({ identifyUser: jest.fn() }) }));
jest.mock('@/actions/user', () => ({ endSession: jest.fn(async () => true) }));
jest.mock('@/config/turnkey', () => ({
  turnkeyClient: { logout: jest.fn(async () => undefined) },
  passkeyClient: {},
}));
jest.mock('@/services/turnkey', () => ({
  getTurnkeyClient: jest.fn(() => ({})),
  getTurnkeyWalletAddress: jest.fn(
    async () => '0x00000000000000000000000000000000000000aa',
  ),
}));
jest.mock('@/services/zerodev', () => ({
  getKernelAccount: jest.fn(async () => ({
    address: '0x00000000000000000000000000000000000000bb',
  })),
  getPublicClient: jest.fn(),
}));
jest.mock('@/utils/hardNavigate', () => ({ hardNavigate: jest.fn() }));
jest.mock('@/hoc/QueryProvider', () => ({ queryClient: { clear: jest.fn() } }));

import { endSession } from '@/actions/user';
import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { withGlobalAccounts } from '@/hoc/GlobalAccountProvider';
import { queryClient } from '@/hoc/QueryProvider';
import { getTurnkeyWalletAddress } from '@/services/turnkey';
import { hardNavigate } from '@/utils/hardNavigate';
import { RESOLVED_ACCOUNT_KEY, SESSION_KEY } from '@/utils/globalAccountSession';

const Probe = () => {
  const { currentUser } = useContext(GlobalAccountContext);
  return <p>{currentUser?.email ?? 'nobody'}</p>;
};
const Page = withGlobalAccounts(Probe);

const T0 = new Date('2026-11-03T12:00:00Z').getTime();
const nowS = () => Math.floor(Date.now() / 1000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The provider remembers the resolved user across remounts (module state), so
// each test signs in to its own sub-organization.
let n = 0;
let sub = '';
const store = (over = {}) => {
  const session = {
    email: 'a@b.co',
    role: 'owner',
    subOrganizationId: sub,
    token: 'bundle-1',
    eKey: 'key-1',
    expiry: nowS() + 600,
    ...over,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};
const signedOut = { from: expect.any(String), event: { type: 'signed-out' } };

describe('withGlobalAccounts across tabs', () => {
  let fake: ReturnType<typeof installFakeBroadcastChannel>;
  let other: ReturnType<ReturnType<typeof installFakeBroadcastChannel>['otherTab']>;

  // One channel per tab lives in the store module for the whole file.
  beforeAll(() => {
    fake = installFakeBroadcastChannel();
  });
  afterAll(() => fake.restore());
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sub = `sub-${++n}`;
    other = fake.otherTab();
  });
  afterEach(() => {
    other.close();
    jest.useRealTimers();
  });

  it('a new tab with the shared session shows the account without signing in again', async () => {
    store();
    render(<Page />);
    expect(await screen.findByText('a@b.co')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith('/sign-in');
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(endSession).not.toHaveBeenCalled();
  });

  it('reuses the addresses another tab resolved', async () => {
    store();
    localStorage.setItem(
      RESOLVED_ACCOUNT_KEY,
      JSON.stringify({
        subOrganizationId: sub,
        walletAddress: '0x00000000000000000000000000000000000000aa',
        smartContractAddress: '0x00000000000000000000000000000000000000bb',
      }),
    );
    render(<Page />);
    expect(await screen.findByText('a@b.co')).toBeInTheDocument();
    expect(getTurnkeyWalletAddress).not.toHaveBeenCalled();
  });

  it('goes to sign-in when another tab signs out', async () => {
    store();
    render(<Page />);
    await screen.findByText('a@b.co');
    localStorage.removeItem(SESSION_KEY);
    other.post({ from: 'tab-2', event: { type: 'signed-out' } });
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/sign-in'), {
      timeout: 1000,
    });
    expect(queryClient.clear).toHaveBeenCalled();
    expect(endSession).not.toHaveBeenCalled();
  });

  it('keeps working when another tab signs in to the same account', async () => {
    const first = store();
    render(<Page />);
    await screen.findByText('a@b.co');
    const next = store({ token: 'bundle-2', eKey: 'key-2', expiry: first.expiry + 300 });
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: sub, expiry: next.expiry },
    });
    await act(() => sleep(80));
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(screen.getByText('a@b.co')).toBeInTheDocument();
  });

  it('reloads into the new account when another tab signs in as someone else', async () => {
    store();
    render(<Page />);
    await screen.findByText('a@b.co');
    const next = store({
      email: 'c@d.co',
      subOrganizationId: `${sub}-other`,
      token: 'bundle-2',
      eKey: 'key-2',
    });
    other.post({
      from: 'tab-2',
      event: {
        type: 'signed-in',
        subOrganizationId: `${sub}-other`,
        expiry: next.expiry,
      },
    });
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(endSession).not.toHaveBeenCalled();
  });

  it('signs every tab out when the session expires', async () => {
    jest.useFakeTimers({ now: T0 });
    store({ expiry: nowS() + 60 });
    render(<Page />);
    await screen.findByText('a@b.co');
    act(() => {
      jest.advanceTimersByTime(59_000);
    });
    expect(endSession).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
  });

  it('waits for the later expiry when another tab signed in again', async () => {
    jest.useFakeTimers({ now: T0 });
    const first = store({ expiry: nowS() + 60 });
    render(<Page />);
    await screen.findByText('a@b.co');
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    store({ token: 'bundle-2', eKey: 'key-2', expiry: first.expiry - 60 + 600 });
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    await act(async () => {});
    expect(endSession).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(540_000);
    });
    await waitFor(() => expect(endSession).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('checks the session when the tab comes back', async () => {
    jest.useFakeTimers({ now: T0 });
    store({ expiry: nowS() + 60 });
    render(<Page />);
    await screen.findByText('a@b.co');
    jest.setSystemTime(T0 + 120_000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(endSession).toHaveBeenCalled());
    expect(replace).toHaveBeenCalledWith('/sign-in');
  });

  it('goes to sign-in when the tab comes back to no session', async () => {
    store();
    render(<Page />);
    await screen.findByText('a@b.co');
    localStorage.removeItem(SESSION_KEY);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(hardNavigate).toHaveBeenCalledWith('/sign-in');
    expect(endSession).not.toHaveBeenCalled();
  });

  it("reloads into the new account when the tab comes back to someone else's session", async () => {
    store();
    render(<Page />);
    await screen.findByText('a@b.co');
    store({ email: 'c@d.co', subOrganizationId: `${sub}-other` });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(hardNavigate).toHaveBeenCalledWith('/app');
    expect(endSession).not.toHaveBeenCalled();
  });

  it('clears an expired shared session it finds and tells the other tabs', async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
    expect(screen.getByText('nobody')).toBeInTheDocument();
  });
});
