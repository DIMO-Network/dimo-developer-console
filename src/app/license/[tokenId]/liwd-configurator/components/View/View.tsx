'use client';

import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm';
import { OutputPrint } from '@/app/license/[tokenId]/liwd-configurator/components/OutputPrint';
import { FormProvider, useForm } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/types';

import './View.css';

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
  const { data, loading, error } = useQuery(GET_DEVELOPER_LICENSE, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const methods = useForm<DynamicFormProps>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      component: 'LoginWithDimo',
    },
  });

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
      <PageSubtitle subtitle="Login With Dimo Configurator" />
      {data?.developerLicense && (
        <FormProvider {...methods}>
          <ConfigurationForm license={data?.developerLicense} />
          <OutputPrint license={data.developerLicense} />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
