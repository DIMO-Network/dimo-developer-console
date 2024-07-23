'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { getWorkspace } from '@/actions/workspace';
import { IWorkspace } from '@/types/workspace';

export const useOnboarding = () => {
  const { isConnected } = useAccount();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>();
  const [workspace, setWorkspace] = useState<IWorkspace>();

  useEffect(() => {
    getWorkspace().then(setWorkspace);
  }, []);

  useEffect(() => {
    const hasWorkspace = Object.keys(workspace ?? {}).length > 0;
    setIsOnboardingCompleted(isConnected && hasWorkspace);
  }, [isConnected, workspace]);

  return { isOnboardingCompleted, workspace };
};

export default useOnboarding;
