import React, { FC } from 'react';
import './Banner.css';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import AddCreditsButton from '@/app/app/list/components/AddCreditsButton';
import { ActionCompletedRow } from '@/app/app/list/components/Banner/components/ActionCompletedRow';
import { CTARow } from '@/app/app/list/components/Banner/components/CTARow';
import { FragmentType, gql, useFragment } from '@/gql';

export const GET_TOTAL_LICENSE_COUNT = gql(`
  fragment TotalDeveloperLicenseCountFragment on DeveloperLicenseConnection {
    totalCount
  }
`);

interface Props {
  balance: number;
  licenseConnection: FragmentType<typeof GET_TOTAL_LICENSE_COUNT>;
}

const ADD_CREDITS = 'Add credits';

export const Banner: FC<Props> = ({ balance, licenseConnection }) => {
  const fragment = useFragment(GET_TOTAL_LICENSE_COUNT, licenseConnection);
  return (
    <div className="banner-content">
      <div>
        <p className="font-black text-xl">Getting Started</p>
        <p className="text-text-secondary text-sm mt-1">
          You’re on the way to building with DIMO!
        </p>
      </div>
      <div className={'flex flex-col flex-1 gap-4 w-full'}>
        <ActionCompletedRow text={'Create account'} />
        <ActionCompletedRow text={'Confirm your details'} />
        <CTARow
          isComplete={fragment.totalCount > 0}
          text={'Create your first license'}
          subtitle={
            'Now that your account is set up, it’s time to create your first license.'
          }
          CTA={<CreateAppButton className={'white-with-icon'} />}
        />
        {fragment.totalCount > 0 && (
          <CTARow
            isComplete={balance > 0}
            text={ADD_CREDITS}
            subtitle={
              'Your developer account needs DCX to function properly, purchase credits now'
            }
            CTA={<AddCreditsButton className={'white-with-icon'} />}
          />
        )}
      </div>
    </div>
  );
};

export default Banner;
