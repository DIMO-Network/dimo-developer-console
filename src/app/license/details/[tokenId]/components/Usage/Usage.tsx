import React, { FC, useEffect, useState } from 'react';
import { useCreditTracker, useEventEmitter } from '@/hooks';
import { Section, SectionHeader } from '@/components/Section';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import { TotalCount } from '@/components/TotalVehicleCount';
import './Usage.css';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';

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
    <div className={'w-full'}>
      <Section>
        <SectionHeader title={'Usage'} />
        <div className={'consumed-credits-container'}>
          {isAuthenticatedAsDev && (
            <TotalCount totalCount={credits} countedThings="Credits Consumed" />
          )}
          {!isAuthenticatedAsDev && <p>Please generate a Developer JWT First</p>}
          <Link
            href={`https://docs.dimo.org/developer-platform/developer-guide/dimo-credits`}
            target="_blank"
          >
            <Button className={'table-action-button'}>Learn More</Button>
          </Link>
        </div>
      </Section>
    </div>
  );
};
