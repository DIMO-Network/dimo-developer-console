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

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [workspace, setWorkspace] = useState<IWorkspace>();
  const [cta, setCta] = useState<CTA>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const { balanceDCX, balanceDimo } = useContractGA();
  const { setIsOpen } = useContext(CreditsContext);
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const loadAppsAndWorkspace = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { data: createdApps } = await getApps();
      setApps(createdApps.filter(({ deleted }) => !deleted));

      const currentWorkspace = await getWorkspace();
      setWorkspace(currentWorkspace);
    } catch (error: unknown) {
      Sentry.captureException(error);      
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAppsAndWorkspace();
  }, []);

  useEffect(() => {
    if (isOwner(role)) {
      if (!(balanceDCX > 0 || balanceDimo > 0)) {
        setCta({
          label: 'Purchase DCX',
          onClick: handleOpenBuyCreditsModal,
        });
      } else if (apps.length === 0) {
        setCta({
          label: 'Create an app',
          onClick: handleCreateApp,
        });
      }
    } else setCta(undefined);
  }, [apps, balanceDCX, role]);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  return {
    apps,
    cta,
    isLoading,
    setIsLoading,
    handleCreateApp,
    handleOpenBuyCreditsModal,
    balance: balanceDCX,
    workspace,
  };
};

export default useOnboarding;
