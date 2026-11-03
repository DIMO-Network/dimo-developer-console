import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { Header } from '@/app/webhooks/webhooksPage/Header';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { WebhooksTableSection } from '@/components/Webhooks/components/WebhooksTableSection';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';

const MainComponent = () => {
  const [selectedDeveloperLicense, setSelectedDeveloperLicense] =
    useState<LocalDeveloperLicense>();
  const { developerLicenses, hasLicenseWithoutRedirectUri, loading } =
    useValidDeveloperLicenses();
  const { refetch, isAuthenticatedAsDev } = useGetDevJwts(
    selectedDeveloperLicense?.clientId,
  );

  useEffect(() => {
    if (!loading && developerLicenses.length === 1 && !selectedDeveloperLicense) {
      setSelectedDeveloperLicense(developerLicenses[0]);
    }
  }, [loading, developerLicenses, selectedDeveloperLicense]);

  // A webhook needs a developer JWT, and a license makes one only once it has a
  // redirect URI: say so instead of showing an empty selector.
  if (!loading && developerLicenses.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body text-fg">
          {hasLicenseWithoutRedirectUri
            ? 'Add a redirect URI to your license to set up webhooks.'
            : 'Create a developer license to set up webhooks.'}
        </p>
        <Link href="/licenses" className="text-body-sm text-ink underline">
          Go to licenses
        </Link>
      </div>
    );
  }

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
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage={'There was a problem fetching your Developer Licenses'}
      >
        <MainComponent />
      </QueryPageWrapper>
    </div>
  );
};
