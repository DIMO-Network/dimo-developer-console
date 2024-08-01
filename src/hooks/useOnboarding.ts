'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';

import { getWorkspace } from '@/actions/workspace';
import { IWorkspace } from '@/types/workspace';

export const useOnboarding = () => {
  const { isConnected } = useAccount();
  const { data: session } = useSession();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [workspace, setWorkspace] = useState<IWorkspace>();
  const { user: { name = '' } = {} } = session ?? {};

  useEffect(() => {
    if (name) {
      getWorkspace().then((workspace) => {
        setWorkspace(workspace);
        setIsLoading(false);
      });
    }
  }, [name]);

  useEffect(() => {
    const hasWorkspace = Object.keys(workspace ?? {}).length > 0;
    setIsOnboardingCompleted(isConnected && hasWorkspace);
  }, [isConnected, workspace]);

  return { isOnboardingCompleted, isLoading, workspace };
};

export default useOnboarding;
