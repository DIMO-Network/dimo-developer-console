'use client';

import { useContext, useEffect, useState } from 'react';

import { CreditsContext } from '@/context/creditsContext';
import { getApps } from '@/actions/app';
import { getWorkspace } from '@/actions/workspace';
import { IApp } from '@/types/app';
import { IWorkspace } from '@/types/workspace';
import { useGlobalAccount } from '@/hooks';
import * as Sentry from '@sentry/nextjs';

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [workspace, setWorkspace] = useState<IWorkspace>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const { setIsOpen } = useContext(CreditsContext);
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();

  const loadAppsAndWorkspace = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { data: createdApps } = await getApps();
      setApps(createdApps.filter(({ deleted }) => !deleted));

      const currentWorkspace = await getWorkspace();
      setWorkspace(currentWorkspace);

      const dcxBalance = await getCurrentDcxBalance();
      setBalance(dcxBalance);
    } catch (error: unknown) {
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    void loadAppsAndWorkspace();
  }, [currentUser]);

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
