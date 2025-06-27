import React, { useEffect, useState } from 'react';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { Header } from '@/app/webhooks/webhooksPage/Header';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { WebhooksTableSection } from '@/components/Webhooks/components/WebhooksTableSection';
import { GraphqlQueryPageWrapper } from '@/components/GraphqlQueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';

const MainComponent = () => {
  const [selectedDeveloperLicense, setSelectedDeveloperLicense] =
    useState<LocalDeveloperLicense>();
  const { developerLicenses, loading } = useValidDeveloperLicenses();
  const { refetch, isAuthenticatedAsDev } = useGetDevJwts(
    selectedDeveloperLicense?.clientId,
  );

  useEffect(() => {
    if (!loading && developerLicenses.length === 1 && !selectedDeveloperLicense) {
      console.log("IS RUNNING THIS, BUT SHOULDN'T BE");
      setSelectedDeveloperLicense(developerLicenses[0]);
    }
  }, [loading, developerLicenses, selectedDeveloperLicense]);

  return (
    <>
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={setSelectedDeveloperLicense}
        selectedLicense={selectedDeveloperLicense}
      />
      {!!selectedDeveloperLicense &&
        (isAuthenticatedAsDev ? (
          <WebhooksTableSection clientId={selectedDeveloperLicense.clientId} />
        ) : (
          <GenerateDevJWTSection
            clientId={selectedDeveloperLicense.clientId}
            redirectUri={selectedDeveloperLicense.firstRedirectURI}
            onSuccess={refetch}
          />
        ))}
    </>
  );
};

export const WebhooksPage = () => {
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <GraphqlQueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage={'There was a problem fetching your Developer Licenses'}
      >
        <MainComponent />
      </GraphqlQueryPageWrapper>
    </div>
  );
};
