'use client';

import { ReactNode, use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Header } from '@/app/license/vehicles/[clientId]/components/Header';

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
  const { data } = useQuery(DEVELOPER_LICENSE_BY_CLIENT_ID_SUMMARY, {
    variables: { clientId },
  });
  return (
    <div className={'flex flex-col'}>
      <Header
        tokenId={data?.developerLicense.tokenId ?? 0}
        alias={data?.developerLicense.alias ?? ''}
      />
      <div className={'flex flex-col py-6'}>{children}</div>
    </div>
  );
}
