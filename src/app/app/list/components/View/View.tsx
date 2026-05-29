'use client';
import { type FC, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Loader } from '@/components/Loader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { useGlobalAccount, useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList, GET_LICENSE_SUMMARIES } from '@/app/license/list';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard/LicenseCard';
import './View.css';
import { gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import {
  FOCUS_QUERY_PARAM,
  FOCUS_RENTALS_OS_SIGNUP,
  clearFocus,
  getFocus,
  saveFocus,
} from '@/utils/focus';
// import { AppListRightPanel } from '@/app/app/list/components/RightPanel';

const GET_DEVELOPER_LICENSES_BY_OWNER = gql(`
  query GetDeveloperLicensesByOwner($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
      ...DeveloperLicenseSummariesOnConnection      
    }
  }
`);

function getFirstName(name: string) {
  const trimmed = name.trim();
  const [firstName] = trimmed.split(' ');
  return firstName || '';
}

export const View: FC = () => {
  const { balance, isLoading: loadingBalance } = useOnboarding();
  const { data: user, isLoading: loadingUser } = useUser();
  const { currentUser } = useGlobalAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    data,
    error,
    loading: loadingDevLicenses,
  } = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const userFirstName = getFirstName(user?.name ?? '');

  useEffect(() => {
    const focus = searchParams.get(FOCUS_QUERY_PARAM);
    if (!focus) return;
    saveFocus(focus);
    const next = new URLSearchParams(searchParams.toString());
    next.delete(FOCUS_QUERY_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  const summaries = useFragment(GET_LICENSE_SUMMARIES, data?.developerLicenses);
  const firstLicense = useFragment(
    DEVELOPER_LICENSE_SUMMARY_FRAGMENT,
    summaries?.nodes[0],
  );
  const focusHandled = useRef(false);
  useEffect(() => {
    if (focusHandled.current) return;
    if (loadingDevLicenses) return;
    if (!data?.developerLicenses) return;
    if (getFocus() !== FOCUS_RENTALS_OS_SIGNUP) return;
    focusHandled.current = true;
    if (!firstLicense) {
      clearFocus();
      return;
    }
    router.push(`/license/${firstLicense.tokenId}/details`);
  }, [data?.developerLicenses, loadingDevLicenses, firstLicense, router]);

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className="app-list-page">
        <div className="welcome-message">
          {loadingUser ? (
            <BubbleLoader isLoading isSmall />
          ) : (
            <>
              <Image
                src={'/images/waving_hand.svg'}
                width={16}
                height={16}
                alt={'waving-hand'}
              />
              <p className="title">Welcome{userFirstName ? `, ${userFirstName}` : '!'}</p>
            </>
          )}
        </div>

        {loadingBalance && loadingDevLicenses && <Loader isLoading={true} />}
        {!!error && <p>There was an error fetching your developer licenses</p>}
        {!!data?.developerLicenses && (
          <>
            <OnboardingBanner
              balance={balance}
              isLoading={loadingBalance}
              licenseConnection={data.developerLicenses}
            />
            <LicenseList licenseConnection={data.developerLicenses} />
          </>
        )}
      </div>
      {/* <AppListRightPanel /> */}
    </div>
  );
};

export default View;
