import { GlobalAccountContext } from '@/context/GlobalAccountContext';
import { IUserSession } from '@/types/user';
import { IGlobalAccountSession } from '@/types/wallet';
import {
  getFromSession,
  GlobalAccountSession,
  removeFromSession,
} from '@/utils/sessionStorage';
import { ComponentType, useEffect, useState } from 'react';
import { utils } from 'web3';
import configuration from '@/config';
import { getTurnkeyClient, getTurnkeyWalletAddress } from '@/services/turnkey';
import {
  EmbeddedKey,
  getFromLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { getKernelAccount, getKernelClient, getPublicClient } from '@/services/zerodev';
import { getContract } from 'viem';
import DimoABI from '@/contracts/DimoTokenContract.json';
// import LicenseABI from '@/contracts/DimoLicenseContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import { TeamRoles } from '@/types/team';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { useRouter } from 'next/navigation';

export const withGlobalAccounts = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const [user, setUser] = useState<IUserSession | null>(null);
    const router = useRouter();

    const validateCurrentSession = async (): Promise<IUserSession | null> => {
      if (!user) return null;

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
      return user;
    };

    const getCurrentDimoBalance = async (): Promise<number> => {
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        await logout();
        return 0;
      }

      const { subOrganizationId, walletAddress, smartContractAddress } = user!;
      const { token, expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return 0;
      }

      const client = getTurnkeyClient({ authKey: token, eKey: eKey });

      const kernelClient = await getKernelClient({
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        client: client,
      });

      if (!kernelClient) {
        return 0;
      }

      const publicClient = getPublicClient();

      const dimoTokenContract = getContract({
        address: configuration.DC_ADDRESS,
        abi: DimoABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentBalanceOnWei = await dimoTokenContract.read.balanceOf([
        smartContractAddress,
      ]);

      return Number(utils.fromWei(currentBalanceOnWei as bigint, 'ether'));

      return 0;
    };

    const getCurrentDcxBalance = async (): Promise<number> => {
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        await logout();
        return 0;
      }

      const { subOrganizationId, walletAddress, smartContractAddress } = user!;
      const { token, expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return 0;
      }

      const client = getTurnkeyClient({ authKey: token, eKey: eKey });

      const kernelClient = await getKernelClient({
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        client: client,
      });

      if (!kernelClient) {
        return 0;
      }

      const publicClient = getPublicClient();
      const creditsContract = getContract({
        address: configuration.DCX_ADDRESS,
        abi: DimoCreditsABI,
        client: {
          public: publicClient,
          wallet: kernelClient,
        },
      });

      const currentBalanceOnWei = await creditsContract.read.balanceOf([
        smartContractAddress,
      ]);

      return Number(utils.fromWei(currentBalanceOnWei as bigint, 'ether'));
    };

    const loadUserInformation = async (): Promise<void> => {
      const session = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
      const eKey = getFromLocalStorage<string>(EmbeddedKey);

      if (!eKey || !session) {
        return;
      }

      const { subOrganizationId, email, token, expiry } = session;

      const nowInSeconds = Math.floor(Date.now() / 1000);

      if (expiry < nowInSeconds) {
        await logout();
        return;
      }

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

      const user: IUserSession = {
        email: email,
        subOrganizationId: subOrganizationId,
        walletAddress: walletAddress,
        smartContractAddress: kernelAccount.address,
        role: TeamRoles.OWNER,
      };

      setUser(user);
    };

    const logout = async () => {
      signOut();
      turnkeyClient.logout();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);

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
