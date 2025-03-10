'use client';
import { type CTA } from '@/app/app/list/components/Banner';

import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [cta, setCta] = useState<CTA>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<number>(0);
  const { getDcxBalance, getDimoBalance } = useContractGA();
  const { setIsOpen } = useContext(CreditsContext);
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};
  const { hasSession } = useContext(GlobalAccountAuthContext);

  const loadAppsAndWorkspace = async (): Promise<void> => {
    try {
      console.log('load apps and workspace called');
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 3000));
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
    if (isOwner(role)) {
      const [balanceDCX, balanceDimo] = await Promise.all([
        getDcxBalance(),
        getDimoBalance(),
      ]);
      if (!(balanceDCX > 0 || balanceDimo > 0)) {
        setCta({
          label: 'Add credits',
          onClick: handleOpenBuyCreditsModal,
        });
      } else if (apps.length === 0) {
        setCta({
          label: 'Create an app',
          onClick: handleCreateApp,
        });
      }
    } else setCta(undefined);
  };

  useEffect(() => {
    if (!hasSession) return;
    void loadAppsAndWorkspace();
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession) return;
    void setCtas();
  }, [apps, role, hasSession]);

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  return {
    balance,
    apps,
    cta,
    isLoading,
    setIsLoading,
    handleOpenBuyCreditsModal,
    workspace,
    loadAppsAndWorkspace,
  };
};

export default useOnboarding;
