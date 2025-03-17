'use client';
import { type CTA } from '@/app/app/list/components/Banner';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CreditsContext } from '@/context/creditsContext';
import { getApps } from '@/actions/app';
import { getWorkspace } from '@/actions/workspace';
import { IApp } from '@/types/app';
import { isOwner } from '@/utils/user';
import { IWorkspace } from '@/types/workspace';
import { useContractGA, useGlobalAccount } from '@/hooks';
import * as Sentry from '@sentry/nextjs';

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [workspace, setWorkspace] = useState<IWorkspace>();
  const [cta, setCta] = useState<CTA>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const router = useRouter();
  const { setIsOpen } = useContext(CreditsContext);
  const { currentUser } = useGlobalAccount();

  const loadAppsAndWorkspace = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { data: createdApps } = await getApps();
      setApps(createdApps.filter(({ deleted }) => !deleted));

      const currentWorkspace = await getWorkspace();
      setWorkspace(currentWorkspace);

      const dcxBalance = await getDcxBalance();
      setBalance(dcxBalance);
    } catch (error: unknown) {
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  const setCtas = async () => {
    // if (isOwner(role)) {
    //   const [balanceDCX, balanceDimo] = await Promise.all([
    //     getDcxBalance(),
    //     getDimoBalance(),
    //   ]);
    //   if (!(balanceDCX > 0 || balanceDimo > 0)) {
    //     setCta({
    //       label: 'Purchase DCX',
    //       onClick: handleOpenBuyCreditsModal,
    //     });
    //   } else if (apps.length === 0) {
    //     setCta({
    //       label: 'Create an app',
    //       onClick: handleCreateApp,
    //     });
    //   }
    // } else setCta(undefined);
  };

  useEffect(() => {
    if (!currentUser) return;
    void loadAppsAndWorkspace();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    void setCtas();
  }, [apps, currentUser]);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  return {
    balance,
    apps,
    cta,
    isLoading,
    setIsLoading,
    handleCreateApp,
    handleOpenBuyCreditsModal,
    workspace,
  };
};

export default useOnboarding;
