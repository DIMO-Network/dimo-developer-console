'use client';

import { ReactNode, useEffect, useState, use } from 'react';
import { gql } from '@/gql';

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
  params: Promise<{ tokenId: number }>;
}) {
  const { tokenId } = use(params);
}
