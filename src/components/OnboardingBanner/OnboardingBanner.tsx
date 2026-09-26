import React, { FC } from 'react';
import './OnboardingBanner.css';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import AddCreditsButton from '@/app/app/list/components/AddCreditsButton';
import { ActionCompletedRow } from '@/components/OnboardingBanner/ActionCompletedRow';
import { CTARow } from '@/components/OnboardingBanner/CTARow';
import { FragmentType, gql, useFragment } from '@/gql';

export const GET_TOTAL_LICENSE_COUNT = gql(`
  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {
    totalCount
  }
`);

interface Props {
  balance: number;
  isLoading: boolean;
  licenseConnection: FragmentType<typeof GET_TOTAL_LICENSE_COUNT>;
}

export const OnboardingBanner: FC<Props> = ({
  balance,
  isLoading,
  licenseConnection,
}) => {
  const fragment = useFragment(GET_TOTAL_LICENSE_COUNT, licenseConnection);

  if (isLoading || balance > 0) return <></>;

  return (
    <div className="banner-content">
      <div className="flex flex-col gap-1">
        <p className="text-card-title text-ink">Getting started</p>
        <p className="text-body-sm text-muted">
          You’re on the way to building with DIMO!
        </p>
      </div>
      <div className={'flex w-full flex-1 flex-col gap-3'}>
        <ActionCompletedRow text={'Create account'} />
        <ActionCompletedRow text={'Confirm your details'} />
        <CTARow
          isComplete={fragment.totalCount > 0}
          text={'Create your first license'}
          subtitle={
            'Now that your account is set up, it’s time to create your first license.'
          }
          CTA={<CreateAppButton className={'with-icon'} variant="secondary" />}
        />
        {fragment.totalCount > 0 && (
          <CTARow
            isComplete={balance > 0}
            text={'Add credits'}
            CTA={<AddCreditsButton className={'with-icon'} />}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingBanner;
