'use client';
import { View as HomePage } from '@/app/app/components/View';
import { View as AppListPage } from '@/app/app/list/components/View';
import { useOnboarding } from '@/hooks';

export const View = () => {
  const { isOnboardingCompleted } = useOnboarding();

  return (
    <>
      {isOnboardingCompleted && <AppListPage />}
      {!isOnboardingCompleted && <HomePage />}
    </>
  );
};

export default View;
