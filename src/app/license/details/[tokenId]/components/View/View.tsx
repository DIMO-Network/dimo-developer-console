'use client';
import {useEffect, useState} from "react";
import {BackButton} from "@/components/BackButton";

import './View.css';
import {gql} from "@/gql";
import {useQuery} from "@apollo/client";
import {Summary} from "@/app/license/details/[tokenId]/components/Summary";
import {Signers} from "@/app/license/details/[tokenId]/components/Signers";
import {RedirectUris} from "@/app/license/details/[tokenId]/components/RedirectUris";
import {AppLoader} from "@/app/app/list/components/AppLoader";

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment   
      ...SignerFragment
      ...RedirectUriFragment
    }
  }
`);

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const {data, loading, error, refetch} = useQuery(GET_DEVELOPER_LICENSE, {
    variables: {tokenId: tokenId as number},
    skip: !tokenId
  });

  const handleRefetch = () => {
    console.log('refresh called');
    refetch({tokenId: tokenId});
  };

  useEffect(() => {
    const getTokenId = async () => {
      const {tokenId: tokenIdParam} = await params;
      setTokenId(Number(tokenIdParam));
    };
    getTokenId();
  }, [params]);

  if (!data?.developerLicense) {
    return null;
  }

  return (
    <div className="license-details-page">
      {loading && <AppLoader isLoading={true} />}
      {!loading && (
        <>
          <div className="summary">
            <BackButton/>
            <Summary licenseSummary={data?.developerLicense}/>
          </div>
          <div className={"flex flex-col gap-6"}>
            <Signers/>
            <RedirectUris license={data?.developerLicense} refetch={handleRefetch}/>
          </div>
        </>
      )}

    </div>
  );
};

export default View;
