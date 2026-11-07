import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { Header } from '@/app/webhooks/webhooksPage/Header';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { WebhooksTableSection } from '@/components/Webhooks/components/WebhooksTableSection';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';

const MainComponent = () => {
  const t = useTranslations('webhooks');
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
            ? t('page.addRedirectUri')
            : t('page.createLicense')}
        </p>
        <Link href="/licenses" className="text-body-sm text-ink underline">
          {t('page.goToLicenses')}
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
          <GenerateDevJWTSection license={selectedDeveloperLicense} onSuccess={refetch} />
        ))}
    </>
  );
};

export const WebhooksPage = () => {
  const t = useTranslations('webhooks');
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <Header />
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage={t('page.fetchLicensesError')}
      >
        <MainComponent />
      </QueryPageWrapper>
    </div>
  );
};
