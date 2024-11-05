'use client';
import { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApps } from '@/actions/app';
import { CTA } from '@/app/app/list/components/Banner';
import { IApp } from '@/types/app';
import { useContractGA } from '@/hooks';
import { CreditsContext } from '@/context/creditsContext';

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [cta, setCta] = useState<CTA>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const { balanceDCX } = useContractGA();
  const { setIsOpen } = useContext(CreditsContext);

  useEffect(() => {
    setIsLoading(true);
    getApps()
      .then(({ data: createdApps }) => setApps(createdApps))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (balanceDCX === 0) {
      setCta({
        label: 'Purchase DCX',
        onClick: handleOpenBuyCreditsModal,
      });
    } else if (apps.length === 0) {
      setCta({
        label: 'Create an app',
        onClick: handleCreateApp,
      });
    } else {
      setCta(undefined);
    }
  }, [apps, balanceDCX]);

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
  };
};

export default useOnboarding;
