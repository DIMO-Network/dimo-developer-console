import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/hooks', () => ({ useMixPanel: () => ({ identifyUser: jest.fn() }) }));
jest.mock('@/actions/user', () => ({ endSession: jest.fn(async () => true) }));
jest.mock('@/utils/consoleSession', () => ({ clearConsoleBrowserState: jest.fn() }));
jest.mock('@/services/consoleSignIn', () => ({
  signOutOnServer: jest.fn(async () => undefined),
}));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
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
jest.mock('@/hoc/QueryProvider', () => ({
  queryClient: { clear: jest.fn(), invalidateQueries: jest.fn() },
}));
// The dialog has its own tests; here it reports who it would sign in again,
// and keeps its callbacks for a renewal that ends after the page is gone.
const mockDialog: { onStale?: () => void; onRenewed?: () => void } = {};
jest.mock('@/components/SessionExpiredDialog', () => ({
  SessionExpiredDialog: ({
    account,
    onRenewed,
    onStale,
    onSignOut,
  }: {
    account: { email: string; subOrganizationId: string };
    onRenewed: () => void;
    onStale: () => void;
    onSignOut: () => void;
  }) => {
    Object.assign(mockDialog, { onStale, onRenewed });
    return (
      <div role="dialog">
        <p>{`expired: ${account.email} ${account.subOrganizationId}`}</p>
        <button onClick={onRenewed}>renewed</button>
        <button onClick={onStale}>stale</button>
        <button onClick={onSignOut}>sign out</button>
      </div>
    );
  },
}));

import { endSession } from '@/actions/user';
import { signOutOnServer } from '@/services/consoleSignIn';
import * as Sentry from '@sentry/nextjs';
import { clearConsoleBrowserState } from '@/utils/consoleSession';
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
// The server half of a sign-out the user chose (works with no cookie).
const signOutCalls = () => (signOutOnServer as jest.Mock).mock.calls;
const expiredFor = () => `expired: a@b.co ${sub}`;
// The session expired, and nothing signed this tab or any other out.
const stillSignedIn = (other: { received: unknown[] }) => {
  expect(endSession).not.toHaveBeenCalled();
  expect(signOutCalls()).toHaveLength(0);
  expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  expect(replace).not.toHaveBeenCalled();
  expect(hardNavigate).not.toHaveBeenCalled();
  expect(other.received).not.toContainEqual(signedOut);
};

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

  // Panels that failed while the cookie was gone ask again, without a reload.
  it('refetches, and stays, when another tab signs in to the same account', async () => {
    const first = store();
    render(<Page />);
    await screen.findByText('a@b.co');
    const next = store({ token: 'bundle-2', eKey: 'key-2', expiry: first.expiry + 300 });
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: sub, expiry: next.expiry },
    });
    await waitFor(() => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(screen.getByText('a@b.co')).toBeInTheDocument();
  });

  it('ignores a sign-out announced while a newer session is live', async () => {
    const live = store();
    render(<Page />);
    await screen.findByText('a@b.co');
    other.post({ from: 'tab-2', event: { type: 'signed-out' } });
    // Events arrive in order: once this one is heard, so was the sign-out.
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: sub, expiry: live.expiry },
    });
    await waitFor(() => expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1));
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
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

  it('asks to sign in again over the page when the session expires, signing no tab out', async () => {
    jest.useFakeTimers({ now: T0 });
    store({ expiry: nowS() + 60 });
    render(<Page />);
    await screen.findByText('a@b.co');
    act(() => {
      jest.advanceTimersByTime(59_000);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(await screen.findByText(expiredFor())).toBeInTheDocument();
    stillSignedIn(other);
    // The page stays mounted but shows no account data behind the dialog.
    expect(screen.getByText('a@b.co')).not.toBeVisible();
  });

  it('renewing in this tab closes the dialog, refetches, and waits for the new expiry', async () => {
    jest.useFakeTimers({ now: T0 });
    store({ expiry: nowS() + 60 });
    render(<Page />);
    await screen.findByText('a@b.co');
    act(() => {
      jest.advanceTimersByTime(61_000);
    });
    await screen.findByRole('dialog');
    // The dialog stored the new session before it reports back.
    store({ token: 'bundle-2', eKey: 'key-2', expiry: nowS() + 1800 });
    fireEvent.click(screen.getByText('renewed'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).not.toHaveBeenCalled();
    stillSignedIn(other);
    act(() => {
      jest.advanceTimersByTime(1_799_000);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('closes the dialog and loads the account when another tab renews it', async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    expect(await screen.findByText(expiredFor())).toBeInTheDocument();
    const next = store({ token: 'bundle-2', eKey: 'key-2', expiry: nowS() + 1800 });
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: sub, expiry: next.expiry },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('a@b.co')).toBeInTheDocument();
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    stillSignedIn(other);
  });

  it('closes the dialog when a check finds the session renewed without an announcement', async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    await screen.findByText(expiredFor());
    store({ token: 'bundle-2', eKey: 'key-2', expiry: nowS() + 1800 });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('a@b.co')).toBeVisible();
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    stillSignedIn(other);
  });

  it('loads the account in a remounted tab when another tab renews it', async () => {
    store();
    const first = render(<Page />);
    await screen.findByText('a@b.co');
    first.unmount();
    store({ expiry: nowS() - 5 });
    render(<Page />);
    await screen.findByText(expiredFor());
    expect(screen.getByText('nobody')).toBeInTheDocument();
    const next = store({ token: 'bundle-2', eKey: 'key-2', expiry: nowS() + 1800 });
    other.post({
      from: 'tab-2',
      event: { type: 'signed-in', subOrganizationId: sub, expiry: next.expiry },
    });
    expect(await screen.findByText('a@b.co')).toBeVisible();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("reloads into the stored account, rather than asking, when someone else's session expired", async () => {
    store();
    render(<Page />);
    await screen.findByText('a@b.co');
    store({ email: 'c@d.co', subOrganizationId: `${sub}-other`, expiry: nowS() - 5 });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/app'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('follows the shared session when a renewal finds it changed', async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    await screen.findByText(expiredFor());
    localStorage.removeItem(SESSION_KEY);
    fireEvent.click(screen.getByText('stale'));
    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/sign-in'));
  });

  it('ignores a renewal that ends after the page unmounted', async () => {
    jest.useFakeTimers({ now: T0 });
    store({ expiry: nowS() - 5 });
    const view = render(<Page />);
    await screen.findByText(expiredFor());
    const { onStale, onRenewed } = mockDialog;
    view.unmount();
    // Another tab renewed meanwhile; a dead check would schedule a timer
    // nothing clears. Then it signed out; that check would leave for /sign-in.
    store({ expiry: nowS() + 60 });
    act(() => {
      onRenewed!();
      onStale!();
    });
    localStorage.removeItem(SESSION_KEY);
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("the dialog's Sign out is a full sign-out, like the menu's", async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    fireEvent.click(await screen.findByText('sign out'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(signOutCalls()).toHaveLength(1);
    expect(endSession).not.toHaveBeenCalled();
    expect(clearConsoleBrowserState).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalled();
  });

  it('a tab with no session at all goes to sign-in', async () => {
    render(<Page />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(screen.queryByRole('dialog')).toBeNull();
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
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(540_000);
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(endSession).not.toHaveBeenCalled();
  });

  // setTimeout fires at once for a delay past 2^31-1 ms (about 24.8 days).
  it('waits out an expiry beyond the longest timer in steps, not at once', async () => {
    const MAX_DELAY = 2 ** 31 - 1;
    jest.useFakeTimers({ now: T0 });
    const timers = jest.spyOn(global, 'setTimeout');
    try {
      const far = store({ expiry: nowS() + 30 * 24 * 3600 });
      render(<Page />);
      await screen.findByText('a@b.co');
      const delays = timers.mock.calls.map(([, ms]) => ms ?? 0);
      expect(Math.max(...delays)).toBe(MAX_DELAY);
      act(() => {
        jest.advanceTimersByTime(MAX_DELAY);
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(hardNavigate).not.toHaveBeenCalled();
      // Then the rest: a second past the expiry second, as for any session.
      act(() => {
        jest.advanceTimersByTime(far.expiry * 1000 - Date.now());
      });
      expect(screen.queryByRole('dialog')).toBeNull();
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(endSession).not.toHaveBeenCalled();
    } finally {
      timers.mockRestore();
    }
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
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(endSession).not.toHaveBeenCalled();
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

  it('signs out locally, and reports it, when the server half fails', async () => {
    (signOutOnServer as jest.Mock).mockRejectedValueOnce(new Error('timed out'));
    store({ expiry: nowS() - 5 });
    render(<Page />);
    fireEvent.click(await screen.findByText('sign out'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('ends the server session before it tells the other tabs', async () => {
    const post = jest.spyOn(BroadcastChannel.prototype, 'postMessage');
    try {
      store({ expiry: nowS() - 5 });
      render(<Page />);
      fireEvent.click(await screen.findByText('sign out'));
      await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
      const announced = post.mock.calls.findIndex(
        ([data]) => (data as { event?: { type?: string } }).event?.type === 'signed-out',
      );
      expect(announced).toBeGreaterThanOrEqual(0);
      expect((signOutOnServer as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
        post.mock.invocationCallOrder[announced],
      );
    } finally {
      post.mockRestore();
    }
  });

  it('signs out from the dialog: clears the shared session and tells the other tabs', async () => {
    store({ expiry: nowS() - 5 });
    render(<Page />);
    fireEvent.click(await screen.findByText('sign out'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(signOutCalls()).toHaveLength(1);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
    expect(screen.getByText('nobody')).toBeInTheDocument();
  });
});
