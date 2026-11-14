/* eslint-disable @typescript-eslint/no-unused-vars */
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('common');
  const fragment = useFragment(GET_TOTAL_LICENSE_COUNT, licenseConnection);

  if (isLoading || balance > 0) return <></>;

  // Buy DCX disabled — re-enable by restoring the AddCreditsButton CTARow below:
  // {fragment.totalCount > 0 && (
  //   <CTARow
  //     isComplete={balance > 0}
  //     text={'Add credits'}
  //     CTA={<AddCreditsButton />}
  //   />
  // )}

  return (
    <div className="banner-content">
      <div>
        <p className="font-black text-xl">{t('onboarding.title')}</p>
        <p className="text-muted text-sm mt-1">{t('onboarding.intro')}</p>
      </div>
      <div className={'flex flex-col flex-1 gap-4 w-full'}>
        <ActionCompletedRow text={t('onboarding.createAccount')} />
        <ActionCompletedRow text={t('onboarding.confirmDetails')} />
        <CTARow
          isComplete={fragment.totalCount > 0}
          text={t('onboarding.createLicense')}
          subtitle={t('onboarding.createLicenseHint')}
          CTA={<CreateAppButton />}
        />
      </div>
    </div>
  );
};

export default OnboardingBanner;
