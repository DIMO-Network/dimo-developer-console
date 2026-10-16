import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { IUserSession } from '@/types/user';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  getFromSession,
  GlobalAccountSession,
  removeFromSession,
  saveToSession,
} from '@/utils/sessionStorage';
import React, { ComponentType, useEffect, useState } from 'react';
import { utils } from 'web3';
import configuration from '@/config';
import { getTurnkeyClient, getTurnkeyWalletAddress } from '@/services/turnkey';
import {
  EmbeddedKey,
  getFromLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { getKernelAccount, getPublicClient } from '@/services/zerodev';
import { Abi } from 'viem';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { useRouter } from 'next/navigation';
import { useMixPanel } from '@/hooks';
import { queryClient } from '@/hoc/QueryProvider';
import { clearConsoleBrowserState } from '@/utils/consoleSession';

// Resolving who is signed in costs two Turnkey calls (wallets, then the wallet
// account) and chain RPC to derive the smart account address. Neither address
// changes for a sub-organization, so the result is kept for the tab:
// - in memory, because every section declares its own AuthorizedLayout and a
//   move between sections remounts this provider;
// - in sessionStorage, next to the session it belongs to, for reloads.
// Both are dropped on logout.
const ResolvedAccountSession = 'globalAccountAddresses';
let rememberedUser: IUserSession | null = null;

type ResolvedAccount = Pick<
  IUserSession,
  'subOrganizationId' | 'walletAddress' | 'smartContractAddress'
>;

const currentSession = () => {
  const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
  if (!session || session.expiry < Math.floor(Date.now() / 1000)) return null;
  return session;
};

// Only for a remount: on the first render after a page load rememberedUser is
// always null, so the server render and hydration agree.
const rememberedUserForSession = () => {
  if (!rememberedUser) return null;
  const session = currentSession();
  return session?.subOrganizationId === rememberedUser.subOrganizationId
    ? rememberedUser
    : null;
};

const forgetResolvedAccount = () => {
  rememberedUser = null;
  removeFromSession(ResolvedAccountSession);
};

export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const [user, setUser] = useState<IUserSession | null>(rememberedUserForSession);
    const { identifyUser } = useMixPanel();
    const router = useRouter();

    const validateCurrentSession = async (): Promise<IUserSession | null> => {
      const sessionUser = await loadUserSession();

      if (!sessionUser) {
        return null;
      }

      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);

      if (!session) {
        return null;
      }

      const { expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return null;
      }
      return sessionUser;
    };

    // A balance is a read: the public client does it in one RPC call, without
    // the Turnkey client and kernel client a transaction would need.
    const readBalance = async (address: `0x${string}`, abi: Abi): Promise<number> => {
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        await logout();
        return 0;
      }

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (session.expiry < nowInSeconds) {
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
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        await logout();
        return null;
      }

      const { subOrganizationId, email, token, expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return null;
      }

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
      const saved = getFromSession<ResolvedAccount>(ResolvedAccountSession);
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
      saveToSession(ResolvedAccountSession, resolved);
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
      await turnkeyClient.logout();
      forgetResolvedAccount();
      // Cached queries (the user, the team) are not keyed by account; the next
      // person to sign in on this tab must not see them.
      queryClient.clear();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
      clearConsoleBrowserState();
      await signOut();
      router.replace('/sign-in');
    };

    useEffect(() => {
      if (user) return;
      void loadUserInformation();
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
