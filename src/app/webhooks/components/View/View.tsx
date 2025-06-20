import React, { useContext, useState } from 'react';
import { LocalDeveloperLicense } from '@/types/webhook';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { NotificationContext } from '@/context/notificationContext';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { Header } from '@/app/webhooks/components/Header/Header';
import { MainWebhooksPageBody } from '@/app/webhooks/components/WebhooksPageBody/WebhooksPageBody';

export const WebhooksPage = () => {
  const [selectedDeveloperLicense, setSelectedDeveloperLicense] =
    useState<LocalDeveloperLicense>();
  const { developerLicenses } = useValidDeveloperLicenses();
  const { setNotification } = useContext(NotificationContext);

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
      {!!selectedDeveloperLicense && (
        <MainWebhooksPageBody developerLicense={selectedDeveloperLicense} />
      )}
    </div>
  );
};
