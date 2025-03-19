'use client';

import { useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { CreditsContext } from '@/context/creditsContext';
import { getApps } from '@/actions/app';
import { getWorkspace } from '@/actions/workspace';
import { IApp } from '@/types/app';
import { isOwner } from '@/utils/user';
import { IWorkspace } from '@/types/workspace';
import { useContractGA } from '@/hooks';
import * as Sentry from '@sentry/nextjs';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [workspace, setWorkspace] = useState<IWorkspace>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const { getDcxBalance } = useContractGA();
  const { setIsOpen } = useContext(CreditsContext);
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};
  const { hasSession } = useContext(GlobalAccountAuthContext);

  const loadAppsAndWorkspace = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { data: createdApps } = await getApps();
      setApps(createdApps.filter(({ deleted }) => !deleted));

      const currentWorkspace = await getWorkspace();
      setWorkspace(currentWorkspace);

      if (isOwner(role)) {
        const dcxBalance = await getDcxBalance();
        setBalance(dcxBalance);
      }
    } catch (error: unknown) {
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    void loadAppsAndWorkspace();
  }, [hasSession, role]);

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  return {
    balance,
    apps,
    isLoading,
    setIsLoading,
    handleOpenBuyCreditsModal,
    workspace,
  };
};

export default useOnboarding;
