'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { getLicense } from '@/actions/license';
import { ILicense } from '@/types/license';

export const useOnboarding = () => {
  const { isConnected } = useAccount();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>();
  const [license, setLicense] = useState<ILicense>();

  useEffect(() => {
    getLicense().then(setLicense);
  }, []);

  useEffect(() => {
    const hasLicense = Object.keys(license ?? {}).length > 0;
    setIsOnboardingCompleted(isConnected && hasLicense);
  }, [isConnected, license]);

  return { isOnboardingCompleted };
};

export default useOnboarding;
