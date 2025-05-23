'use client';

import { ReactNode, use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Header } from '@/app/license/vehicles/[clientId]/components/Header';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Loader } from '@/components/Loader';
import { useRouter } from 'next/navigation';

const DEVELOPER_LICENSE_BY_CLIENT_ID_SUMMARY = gql(`
  query DeveloperLicenseByClientIdSummary($clientId: Address!) {
    developerLicense(by: {clientId: $clientId}) {
      tokenId
      alias
      clientId
    }
  }
`);

export default function DeveloperLicenseDetailsPageLayout({
  params,
  children,
}: {
  children: ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_BY_CLIENT_ID_SUMMARY, {
    variables: { clientId },
  });
  const router = useRouter();

  const onBack = () => {
    router.replace(`/license/details/${data?.developerLicense.tokenId}`);
  };

  return (
    <div>
      {!!error && <p>Something went wrong fetching the vehicle details</p>}
      {loading && <Loader isLoading={true} />}
      {data?.developerLicense && (
        <div className={'flex flex-col'}>
          <div className={'py-4 self-start'}>
            <button onClick={onBack}>
              <ChevronLeftIcon className={'w-4 h-4'} />
            </button>
          </div>
          <Header
            tokenId={data?.developerLicense.tokenId ?? 0}
            alias={data?.developerLicense.alias ?? ''}
          />
          <div className={'flex flex-col py-6'}>{children}</div>
        </div>
      )}
    </div>
  );
}
