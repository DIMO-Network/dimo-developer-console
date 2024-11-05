'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getApps } from '@/actions/app';
import { CTA } from '@/app/app/list/components/Banner';
import { IApp } from '@/types/app';

export const useOnboarding = () => {
  const [apps, setApps] = useState<IApp[]>([]);
  const [cta, setCta] = useState<CTA>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    getApps()
      .then(({ data: createdApps }) => setApps(createdApps))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (apps.length === 0) {
      setCta({
        label: 'Create an app',
        onClick: handleCreateApp,
      });
    } else {
      setCta(undefined);
    }
  }, [apps]);

  const handleCreateApp = () => {
    router.push('/app/create');
  };

  return {
    apps,
    cta,
    isLoading,
    setIsLoading,
  };
};

export default useOnboarding;
