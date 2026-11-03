import React, { FC, useEffect, useState } from 'react';
import { useCreditTracker, useEventEmitter } from '@/hooks';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import Link from 'next/link';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import './Usage.css';

interface Props {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
}

export const Usage: FC<Props> = ({ license }) => {
  const { getUsageByLicense } = useCreditTracker();
  // null until known: a failed lookup must not read as no usage.
  const [credits, setCredits] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
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
        setUnavailable(false);
      } catch (error: unknown) {
        console.error('Error fetching usage:', error);
        setCredits(null);
        setUnavailable(true);
      }
    };
    refetch();
    if (!isAuthenticatedAsDev) return;
    void fetchUsage();
  }, [fragment, isAuthenticatedAsDev, eventData]);

  return (
    <div className="overview-stat-card">
      <p className="overview-stat-card__number">
        {isAuthenticatedAsDev ? (credits ?? '—') : '—'}
      </p>
      <p className="overview-stat-card__label">Credits used</p>
      {!isAuthenticatedAsDev && (
        <p className="overview-stat-card__hint">Generate a JWT to see usage</p>
      )}
      {isAuthenticatedAsDev && unavailable && (
        <p className="overview-stat-card__hint">Usage unavailable right now</p>
      )}
      <Link
        href="https://dimo.org/pricing"
        target="_blank"
        className="overview-stat-card__link"
      >
        Learn about credits →
      </Link>
    </div>
  );
};
