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
import { endSession } from '@/actions/user';
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

// Resolving who is signed in costs two Turnkey calls (wallets, then the wallet
// account) and chain RPC to derive the smart account address. Neither address
// changes for a sub-organization, so the result is kept:
// - in memory, because every section declares its own AuthorizedLayout and a
//   move between sections remounts this provider;
// - in localStorage, next to the shared session, for reloads and new tabs.
// Both are dropped on logout (clearSession drops the stored one).
let rememberedUser: IUserSession | null = null;

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
        await logout();
        return null;
      }
      return sessionUser;
    };

    // A balance is a read: the public client does it in one RPC call, without
    // the Turnkey client and kernel client a transaction would need.
    const readBalance = async (address: `0x${string}`, abi: Abi): Promise<number> => {
      if (!isLive(readSession())) {
        await logout();
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

      if (!isLive(session)) {
        await logout();
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

    const logout = async () => {
      if (leaving.current) return;
      leaving.current = true;
      await turnkeyClient.logout();
      rememberedUser = null;
      // Cached queries (the user, the team) are not keyed by account; the next
      // person to sign in on this tab must not see them.
      queryClient.clear();
      // Every other tab hears this and goes to sign-in.
      clearSession();
      // Reached when the session expired or this tab has none; an explicit
      // sign-out (the menu) also clears the team and developer JWTs.
      // The proxy answers this action with a 401 when the session is already
      // gone; the sign-in redirect must not depend on it.
      try {
        await endSession();
      } catch {
        // The proxy's 401 already cleared the cookies.
      }
      router.replace('/sign-in');
    };

    useEffect(() => {
      if (user) return;
      void loadUserInformation();
    }, []);

    // Every tab shares the session: follow what the other tabs do with it, and
    // sign out when it expires.
    useEffect(() => {
      const mounted = readSession();
      const loaded = mounted?.subOrganizationId;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const leave = (path: string) => {
        leaving.current = true;
        hardNavigate(path);
      };

      const schedule = (expiry: number) => {
        clearTimeout(timer);
        // A second past the expiry second, when the session is no longer live.
        timer = setTimeout(check, expiry * 1000 - Date.now() + 1000);
      };

      const check = () => {
        if (leaving.current) return;
        const session = readSession();
        // Another tab signed out (or the browser dropped the store).
        if (!session) return leave('/sign-in');
        if (!isLive(session)) return void logout();
        // Another tab signed in as someone else while this one was away.
        if (session.subOrganizationId !== loaded) return leave('/app');
        // Still live, perhaps renewed by a sign-in in another tab.
        schedule(session.expiry);
      };

      const onVisible = () => {
        if (document.visibilityState === 'visible') check();
      };

      if (isLive(mounted)) schedule(mounted.expiry);
      window.addEventListener('focus', check);
      document.addEventListener('visibilitychange', onVisible);

      const off = onSessionChange((event) => {
        if (leaving.current) return;
        if (event.type === 'signed-out') {
          // That tab ended the server session and cleared the store.
          rememberedUser = null;
          queryClient.clear();
          leave('/sign-in');
        } else if (event.subOrganizationId !== loaded) {
          rememberedUser = null;
          leave('/app');
        }
        // The same account signed in again: the next Turnkey call reads the
        // new bundle and key together.
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
        <WrappedComponent {...props} />
      </GlobalAccountContext.Provider>
    );
  };

  HOC.displayName = `withGlobalAccounts(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withGlobalAccounts;
