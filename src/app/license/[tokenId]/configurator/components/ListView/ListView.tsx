'use client';

import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import { useFragment } from '@/gql';
import { gql } from '@/gql';
import { USER_CONFIG_FRAGMENT } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';

export const DEVELOPER_LICENSE_INFO = gql(`
  query DeveloperLicenseInfo($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...UserConfigurationFragment
    }
  }
`);

export const ListView = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const router = useRouter();

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const fragment = useFragment(USER_CONFIG_FRAGMENT, data?.developerLicense ?? null);

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
    <div className="liwd-configurator-page">
      <div className="flex items-center justify-between mb-4">
        <PageSubtitle subtitle="Login With DIMO Configurator" />
        <Button
          className="dark with-icon px-4"
          onClick={() => router.push(`/license/${tokenId}/configurator/new`)}
        >
          New Configuration
        </Button>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        A vehicle sharing link is required for vehicle owners to grant data permissions to
        your application.{' '}
        <a
          href="https://www.dimo.org/docs/build/building-with-tools/client-sdk-dimo-connect"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Learn how to use the configurationId with LIWD
        </a>
      </p>
      {fragment?.clientId && tokenId && (
        <ConfigurationList clientId={fragment.clientId} tokenId={tokenId} />
      )}
    </div>
  );
};

export default ListView;
