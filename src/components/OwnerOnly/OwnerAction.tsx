'use client';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useTeam } from '@/hooks/useTeam';

interface Props {
  fallback?: ReactNode;
  /** Set on a license's page: owning a team doesn't make every license yours. */
  licenseOwner?: string;
}

// An action only the team owner may take; members see the fallback, if any.
export const OwnerAction: FC<PropsWithChildren<Props>> = ({
  children,
  fallback = null,
  licenseOwner,
}) => {
  const { isOwner, ownerAddress } = useTeam();
  const ownsLicense =
    !licenseOwner || ownerAddress?.toLowerCase() === licenseOwner.toLowerCase();
  return <>{isOwner && ownsLicense ? children : fallback}</>;
};
