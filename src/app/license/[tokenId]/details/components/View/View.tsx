'use client';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';

import './View.css';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Summary } from '@/app/license/[tokenId]/details/components/Summary';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers';
import { RedirectUris } from '@/app/license/[tokenId]/details/components/RedirectUris';
import { Loader } from '@/components/Loader';
import { Vehicles } from '@/app/license/[tokenId]/details/components/Vehicles';
import { DeveloperJwts } from '@/app/license/[tokenId]/details/components/DeveloperJwts';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand';
import { useRouter } from 'next/navigation';
import { Usage } from '@/app/license/[tokenId]/details/components/Usage/Usage';

const IDENTITY_API_UPDATE_DELAY = 6000;

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...BrandFragment
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
    void getTokenId();
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
          {/* Instrument cluster */}
          <div className="dashboard-cluster dark">
            <BackButton onBack={goBack} />
            <div className="cluster-grid">
              <div className="cluster-cell">
                <p className="cluster-cell__label">Usage</p>
                <Usage license={data.developerLicense} cluster />
              </div>
              <div className="cluster-cell cluster-cell--center">
                <Summary licenseSummary={data.developerLicense} refetch={handleRefetch} />
              </div>
              <div className="cluster-cell">
                <p className="cluster-cell__label">Vehicles</p>
                <Vehicles license={data.developerLicense} cluster />
              </div>
            </div>
          </div>

          {/* Control panels */}
          <div className="dashboard-panels">
            <Signers license={data.developerLicense} refetch={handleRefetch} />
            <RedirectUris license={data.developerLicense} refetch={handleRefetch} />
            <DeveloperJwts license={data.developerLicense} />
            <Brand license={data.developerLicense} />
          </div>
        </>
      )}
    </div>
  );
};

export default View;
