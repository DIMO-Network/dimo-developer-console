import React, { FC, useEffect, useState } from 'react';
import { useCreditTracker, useEventEmitter } from '@/hooks';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import './Usage.css';

interface Props {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
}

export const Usage: FC<Props> = ({ license }) => {
  const { getUsageByLicense } = useCreditTracker();
  const [credits, setCredits] = useState(0);
  const fragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  const { eventData } = useEventEmitter<unknown>('developer-jwt-updated');
  const { isAuthenticatedAsDev, devJwts, refetch } = useGetDevJwts(fragment?.clientId);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { numOfCreditsUsed } = await getUsageByLicense({
          licenseId: fragment.clientId,
          devJwt: devJwts[0].token,
        });
        setCredits(numOfCreditsUsed);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          console.error(error.response?.data.message || 'Error fetching usage');
        }
        console.error('Error fetching usage:', error);
      }
    };
    refetch();
    if (!isAuthenticatedAsDev) return;
    void fetchUsage();
  }, [fragment, isAuthenticatedAsDev, eventData]);

  return (
    <div className="overview-stat-card">
      <p className="overview-stat-card__number">{isAuthenticatedAsDev ? credits : '—'}</p>
      <p className="overview-stat-card__label">Credits Used</p>
      {!isAuthenticatedAsDev && (
        <p className="overview-stat-card__hint">Generate a JWT to see usage</p>
      )}
      <Link
        href="https://docs.dimo.org/developer-platform/developer-guide/dimo-credits"
        target="_blank"
        className="overview-stat-card__link"
      >
        Learn about credits →
      </Link>
    </div>
  );
};
