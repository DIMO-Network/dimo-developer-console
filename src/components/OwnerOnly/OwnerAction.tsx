'use client';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useTeam } from '@/hooks/useTeam';

// An action only the team owner may take; members see the fallback, if any.
export const OwnerAction: FC<PropsWithChildren<{ fallback?: ReactNode }>> = ({
  children,
  fallback = null,
}) => {
  const { isOwner } = useTeam();
  return <>{isOwner ? children : fallback}</>;
};
