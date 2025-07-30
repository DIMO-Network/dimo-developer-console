'use client';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';

import './View.css';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Summary } from '@/app/license/details/[tokenId]/components/Summary';
import { Signers } from '@/app/license/details/[tokenId]/components/Signers';
import { RedirectUris } from '@/app/license/details/[tokenId]/components/RedirectUris';
import { Loader } from '@/components/Loader';
import { Vehicles } from '@/app/license/details/[tokenId]/components/Vehicles';
import { DeveloperJwts } from '@/app/license/details/[tokenId]/components/DeveloperJwts';
import { useRouter } from 'next/navigation';

const IDENTITY_API_UPDATE_DELAY = 6000;

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment   
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
    }
  }
`);

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, refetch, error } = useQuery(GET_DEVELOPER_LICENSE, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });
  const router = useRouter();

  const goBack = () => {
    router.replace('/app');
  };
  const handleRefetch = async () => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        refetch({ tokenId: tokenId })
          .then(() => resolve())
          .catch(reject);
        // Identity api takes some time to update the data, so we wait for some time
      }, IDENTITY_API_UPDATE_DELAY);
    });
  };

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    getTokenId();
  }, [params]);

  if (loading) {
    return (
      <div className="license-details-page">
        <Loader isLoading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-details-page">
        <p>There was an error fetching the license details</p>
      </div>
    );
  }

  return (
    <div className="license-details-page">
      {data?.developerLicense && (
        <>
          <div className="summary">
            <BackButton onBack={goBack} />
            <Summary licenseSummary={data.developerLicense} refetch={handleRefetch} />
          </div>
          <div className={'flex flex-col gap-6 pt-6'}>
            <DeveloperJwts license={data.developerLicense} />
            <Signers license={data.developerLicense} refetch={handleRefetch} />
            <RedirectUris license={data.developerLicense} refetch={handleRefetch} />
            <Vehicles license={data.developerLicense} />
          </div>
        </>
      )}
    </div>
  );
};

export default View;
