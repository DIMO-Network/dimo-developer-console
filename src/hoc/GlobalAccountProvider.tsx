import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { IUserSession } from '@/types/user';
import React, { ComponentType, useEffect, useRef, useState } from 'react';
import { utils } from 'web3';
import configuration from '@/config';
import { getTurnkeyClient, getTurnkeyWalletAddress } from '@/services/turnkey';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';
import { getKernelAccount, getPublicClient } from '@/services/zerodev';
import { Abi } from 'viem';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { endSession, signOut } from '@/actions/user';
import { clearConsoleBrowserState } from '@/utils/consoleSession';
import { turnkeyClient } from '@/config/turnkey';
import { useRouter } from 'next/navigation';
import { useMixPanel } from '@/hooks';
import { queryClient } from '@/hoc/QueryProvider';
import { hardNavigate } from '@/utils/hardNavigate';
import {
  clearSession,
  isLive,
  onSessionChange,
  readSession,
  RESOLVED_ACCOUNT_KEY,
} from '@/utils/globalAccountSession';
import { SessionExpiredDialog } from '@/components/SessionExpiredDialog';
import type { ConsoleAccount } from '@/services/consoleSignIn';

// Resolving who is signed in costs two Turnkey calls (wallets, then the wallet
// account) and chain RPC to derive the smart account address. Neither address
// changes for a sub-organization, so the result is kept:
// - in memory, because every section declares its own AuthorizedLayout and a
//   move between sections remounts this provider;
// - in localStorage, next to the shared session, for reloads and new tabs.
// Both are dropped on logout (clearSession drops the stored one).
let rememberedUser: IUserSession | null = null;

// The longest delay setTimeout holds (2^31-1 ms, about 24.8 days).
const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

type ResolvedAccount = Pick<
  IUserSession,
  'subOrganizationId' | 'walletAddress' | 'smartContractAddress'
>;

// Only for a remount: on the first render after a page load rememberedUser is
// always null, so the server render and hydration agree.
const rememberedUserForSession = () => {
  if (!rememberedUser) return null;
  const session = readSession();
  return isLive(session) && session.subOrganizationId === rememberedUser.subOrganizationId
    ? rememberedUser
    : null;
};

export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const [user, setUser] = useState<IUserSession | null>(rememberedUserForSession);
    const { identifyUser } = useMixPanel();
    const router = useRouter();
    // Set once this tab is on its way out (signing out or reloading): later
    // checks and events have nothing left to do.
    const leaving = useRef(false);
    // The account whose session ran out, while SessionExpiredDialog asks to
    // sign in again; null otherwise.
    const [expired, setExpired] = useState<ConsoleAccount | null>(null);
    // For the session effect below, which is mounted once: whether the dialog
    // is open, the user as now loaded, the account this tab loaded with, and
    // its check of the shared session.
    const expiredRef = useRef(false);
    const userRef = useRef(user);
    userRef.current = user;
    const loadedRef = useRef<string | undefined>(undefined);
    const recheck = useRef<() => void>(() => {});

    // The session ran out: ask to sign in again over this page, as the same
    // account, instead of signing every tab out. With no session at all there
    // is no one to ask about, so that is a sign-out; someone else's session
    // reloads into their account, as when they sign in.
    const expire = () => {
      if (leaving.current) return;
      const session = readSession();
      if (!session) return void logout();
      const loaded = userRef.current?.subOrganizationId ?? loadedRef.current;
      if (loaded && session.subOrganizationId !== loaded) {
        leaving.current = true;
        hardNavigate('/app');
        return;
      }
      expiredRef.current = true;
      setExpired({ email: session.email, subOrganizationId: session.subOrganizationId });
    };

    // The session is live again for this account, from this tab or another:
    // close the dialog, and let the panels that failed while it was gone ask
    // again. A tab that loaded with an expired session has no account yet.
    const resume = () => {
      expiredRef.current = false;
      setExpired(null);
      void queryClient.invalidateQueries();
      if (!userRef.current) void loadUserInformation();
    };

    // This tab signed in again (SessionExpiredDialog stored the session; the
    // other tabs hear of it themselves), so it schedules the next expiry too.
    const renewed = () => {
      resume();
      recheck.current();
    };

    const validateCurrentSession = async (): Promise<IUserSession | null> => {
      const sessionUser = await loadUserSession();

      if (!sessionUser) {
        return null;
      }

      const session = readSession();

      if (!session) {
        return null;
      }

      if (!isLive(session)) {
        expire();
        return null;
      }
      return sessionUser;
    };

    // A balance is a read: the public client does it in one RPC call, without
    // the Turnkey client and kernel client a transaction would need.
    const readBalance = async (address: `0x${string}`, abi: Abi): Promise<number> => {
      if (!isLive(readSession())) {
        expire();
        return 0;
      }

      const currentBalanceOnWei = await getPublicClient().readContract({
        address,
        abi,
        functionName: 'balanceOf',
        args: [user!.smartContractAddress],
      });

      return Number(utils.fromWei(currentBalanceOnWei as bigint, 'ether'));
    };

    const getCurrentDimoBalance = (): Promise<number> =>
      readBalance(configuration.DC_ADDRESS, DimoABI as Abi);

    const getCurrentDcxBalance = (): Promise<number> =>
      readBalance(configuration.DCX_ADDRESS, DimoCreditsABI as Abi);

    const loadUserSession = async (): Promise<IUserSession | null> => {
      // The bundle and its key come from this one read.
      const session = readSession();

      if (!session) {
        await logout();
        return null;
      }

      if (!isLive(session)) {
        expire();
        return null;
      }

      const { subOrganizationId, email, token, eKey } = session;

      const resolved = await resolveAccount(subOrganizationId, token, eKey);

      const user: IUserSession = {
        email: email,
        subOrganizationId: subOrganizationId,
        walletAddress: resolved.walletAddress,
        smartContractAddress: resolved.smartContractAddress,
      };

      return user;
    };

    const resolveAccount = async (
      subOrganizationId: string,
      token: string,
      eKey: string,
    ): Promise<ResolvedAccount> => {
      const saved = getFromLocalStorage<ResolvedAccount>(RESOLVED_ACCOUNT_KEY);
      if (saved?.subOrganizationId === subOrganizationId) return saved;

      const client = getTurnkeyClient({ authKey: token, eKey: eKey });

      const walletAddress = await getTurnkeyWalletAddress({
        subOrganizationId: subOrganizationId,
        client: client,
      });

      const kernelAccount = await getKernelAccount({
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        client: client,
      });

      const resolved: ResolvedAccount = {
        subOrganizationId,
        walletAddress,
        smartContractAddress: kernelAccount.address,
      };
      saveToLocalStorage(RESOLVED_ACCOUNT_KEY, resolved);
      return resolved;
    };

    const loadUserInformation = async (): Promise<void> => {
      const user = await loadUserSession();
      if (!user) return;
      const { email, smartContractAddress, subOrganizationId } = user;
      identifyUser(smartContractAddress, {
        $email: email,
        $subOrganizationId: subOrganizationId,
      });

      rememberedUser = user;
      setUser(user);
    };

    // Reached when this tab has no session, or the user signs out from
    // SessionExpiredDialog. That one is a sign-out the user chose: like the
    // menu's, it also forgets the developer JWTs, the active team and a pending
    // invite (explicit).
    const logout = async ({ explicit = false }: { explicit?: boolean } = {}) => {
      if (leaving.current) return;
      leaving.current = true;
      if (explicit) clearConsoleBrowserState();
      // The cookie goes first, so a tab that hears the announcement below
      // finds no session on the server either. The proxy answers this action
      // with a 401 when the session is already gone; nothing below depends on it.
      try {
        await (explicit ? signOut() : endSession());
      } catch {
        // The proxy's 401 already cleared the cookies.
      }
      try {
        await turnkeyClient.logout();
      } catch {
        // Local only; the store below is what holds the session.
      }
      rememberedUser = null;
      // Cached queries (the user, the team) are not keyed by account; the next
      // person to sign in on this tab must not see them.
      queryClient.clear();
      // Every other tab hears this and goes to sign-in.
      clearSession();
      router.replace('/sign-in');
    };

    useEffect(() => {
      if (user) return;
      void loadUserInformation();
    }, []);

    // Every tab shares the session: follow what the other tabs do with it, and
    // ask to sign in again when it expires.
    useEffect(() => {
      const mounted = readSession();
      const loaded = mounted?.subOrganizationId;
      loadedRef.current = loaded;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const leave = (path: string) => {
        leaving.current = true;
        hardNavigate(path);
      };

      const schedule = (expiry: number) => {
        clearTimeout(timer);
        // A second past the expiry second, when the session is no longer live.
        // setTimeout fires at once for a longer delay than it can hold; check
        // then schedules the rest.
        const delay = expiry * 1000 - Date.now() + 1000;
        timer = setTimeout(check, Math.min(delay, MAX_TIMER_DELAY_MS));
      };

      const check = () => {
        if (leaving.current) return;
        const session = readSession();
        // Another tab signed out (or the browser dropped the store).
        if (!session) return leave('/sign-in');
        // Another tab signed in as someone else while this one was away.
        if (session.subOrganizationId !== loaded) return leave('/app');
        if (!isLive(session)) return expire();
        // Still live, perhaps renewed by a sign-in in another tab, whose
        // announcement this tab may have missed.
        if (expiredRef.current) resume();
        schedule(session.expiry);
      };

      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };

      recheck.current = check;
      if (isLive(mounted)) schedule(mounted.expiry);
      window.addEventListener('focus', check);
      document.addEventListener('visibilitychange', onVisible);

      const off = onSessionChange((event) => {
        if (leaving.current) return;
        if (event.type === 'signed-out') {
          // A sign-out older than the session now stored: a later sign-in's
          // own event decides.
          if (isLive(readSession())) return;
          // That tab ended the server session and cleared the store.
          rememberedUser = null;
          queryClient.clear();
          leave('/sign-in');
        } else if (event.subOrganizationId !== loaded) {
          rememberedUser = null;
          leave('/app');
        } else {
          // The same account signed in again: the next Turnkey call reads the
          // new bundle and key together, panels that failed while the cookie
          // was gone ask again, a session-expired dialog closes, and the next
          // expiry is scheduled.
          resume();
          check();
        }
      });

      return () => {
        clearTimeout(timer);
        window.removeEventListener('focus', check);
        document.removeEventListener('visibilitychange', onVisible);
        off();
      };
      // Once per mount; logout and the store are read when they are needed.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <GlobalAccountContext.Provider
        value={{
          validateCurrentSession,
          currentUser: user,
          getCurrentDcxBalance,
          getCurrentDimoBalance,
          logout,
        }}
      >
        {/* Hidden, not unmounted, while the session is expired: an unattended
            screen shows no account data, and the page keeps its state for
            when the user signs in again. */}
        <div style={{ display: expired ? 'none' : 'contents' }}>
          <WrappedComponent {...props} />
        </div>
        {expired && (
          <SessionExpiredDialog
            account={expired}
            onRenewed={renewed}
            onSignOut={() => void logout({ explicit: true })}
          />
        )}
      </GlobalAccountContext.Provider>
    );
  };

  HOC.displayName = `withGlobalAccounts(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withGlobalAccounts;
