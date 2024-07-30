'use client';
import { FC } from 'react';

import { Loader } from '@/components/Loader';
import { useOnboarding } from '@/hooks';
import { View as AppListPage } from '@/app/app/list/components/View';
import { View as OnboardingPage } from '@/app/app/components/View';

export const SwitchPage: FC = () => {
  const { isLoading, isOnboardingCompleted } = useOnboarding();

  return (
    <>
      {isLoading && <Loader isLoading={true} />}
      {!isLoading && !isOnboardingCompleted && <OnboardingPage />}
      {!isLoading && isOnboardingCompleted && <AppListPage />}
    </>
  );
};

export default SwitchPage;
