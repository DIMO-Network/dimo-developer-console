'use client';

import { ReactNode, use } from 'react';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Header } from '@/app/license/details/[tokenId]/vehicles/components/Header';

const DEVELOPER_LICENSE_DETAILS_PAGE_SUMMARY = gql(`
  query DeveloperLicenseDetailsPageSummary($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      tokenId
      alias
    }
  }
`);

export default function DeveloperLicenseDetailsPageLayout({
  params,
  children,
}: {
  children: ReactNode;
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = use(params);
  const { data } = useQuery(DEVELOPER_LICENSE_DETAILS_PAGE_SUMMARY, {
    variables: { tokenId: Number(tokenId) },
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
