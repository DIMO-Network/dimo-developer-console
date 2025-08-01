import React, { FC, useEffect, useState } from 'react';
import { useCreditTracker } from '@/hooks';
import { Section, SectionHeader } from '@/components/Section';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import { TotalCount } from '@/components/TotalVehicleCount';
import './Usage.css';
import { Button } from '@/components/Button';
import Link from 'next/link';

interface Props {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
}

export const Usage: FC<Props> = ({ license }) => {
  const { getUsageByLicense } = useCreditTracker();
  const [credits, setCredits] = useState(0);
  const fragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { numOfCreditsUsed } = await getUsageByLicense(fragment.tokenId);
        setCredits(numOfCreditsUsed);
      } catch (error) {
        console.error('Error fetching usage:', error);
      }
    };
    void fetchUsage();
  }, [fragment]);

  return (
    <div className={'w-full'}>
      <Section>
        <SectionHeader title={'Usage'} />
        <div className={'consumed-credits-container'}>
          <TotalCount totalCount={credits} countedThings="Credits Consumed" />
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
