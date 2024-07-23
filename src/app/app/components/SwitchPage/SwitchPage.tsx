'use client';
import { FC } from 'react';

import { useOnboarding } from '@/hooks';
import { View as AppListPage } from '@/app/app/list/components/View';
import { View as OnboardingPage } from '@/app/app/components/View';

export const SwitchPage: FC = () => {
  const { isOnboardingCompleted } = useOnboarding();

  return (
    <>
      {!isOnboardingCompleted && <OnboardingPage />}
      {isOnboardingCompleted && <AppListPage />}
    </>
  );
};

export default SwitchPage;
