import React, { useContext, useState } from 'react';
import { LocalDeveloperLicense } from '@/types/webhook';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { NotificationContext } from '@/context/notificationContext';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { Header } from '@/app/webhooks/webhooksPage/Header';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { WebhooksTableSection } from '@/components/Webhooks/components/WebhooksTableSection';

export const WebhooksPage = () => {
  const [selectedDeveloperLicense, setSelectedDeveloperLicense] =
    useState<LocalDeveloperLicense>();
  const { developerLicenses } = useValidDeveloperLicenses();
  const { setNotification } = useContext(NotificationContext);
  const { devJwts, refetch } = useGetDevJwts(selectedDeveloperLicense?.clientId);

  const onLicenseSelect = (clientId: string) => {
    const selectedLicense = developerLicenses.find((l) => l.clientId === clientId);
    if (!selectedLicense) {
      return setNotification('Could not find developer license', '', 'error');
    }
    setSelectedDeveloperLicense(selectedLicense);
  };

  return (
    <div className="flex flex-col gap-6">
      <Header />
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={onLicenseSelect}
      />
      {!!selectedDeveloperLicense &&
        (devJwts.length ? (
          <WebhooksTableSection clientId={selectedDeveloperLicense.clientId} />
        ) : (
          <GenerateDevJWTSection
            clientId={selectedDeveloperLicense.clientId}
            redirectUri={selectedDeveloperLicense.firstRedirectURI}
            onSuccess={refetch}
          />
        ))}
    </div>
  );
};
