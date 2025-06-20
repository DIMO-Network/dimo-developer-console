'use client';

import React, { useContext, useState } from 'react';
import './Webhooks.css';
import { WebhookTable } from './WebhookTable';
import Button from '@/components/Button/Button';
import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import { Label } from '@/components/Label';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { LocalDeveloperLicense } from '@/types/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';

const WebhooksSection = ({ clientId }: { clientId: string }) => {
  return (
    <Section>
      <SectionHeader title={'Webhooks'}>
        <Link href={`/webhooks/create/${clientId}`}>
          <Button className="dark with-icon">+ Create a webhook</Button>
        </Link>
      </SectionHeader>
      <WebhookTable clientId={clientId} />
    </Section>
  );
};

const MainWebhooksPageBody = ({
  developerLicense,
}: {
  developerLicense: LocalDeveloperLicense;
}) => {
  const { devJwts, refetch } = useGetDevJwts(developerLicense.clientId);

  if (!devJwts.length) {
    return (
      <GenerateDevJWTSection
        clientId={developerLicense.clientId}
        redirectUri={developerLicense.firstRedirectURI}
        onSuccess={refetch}
      />
    );
  }
  return <WebhooksSection clientId={developerLicense.clientId} />;
};

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
      <div className="flex flex-row gap-1 pb-2 border-b-cta-default border-b">
        <p className={'text-base text-text-secondary font-medium'}>
          Receive real-time updates from events
        </p>
      </div>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Select a Developer License</Label>
        <DevLicenseSelector
          developerLicenses={developerLicenses}
          onChange={onLicenseSelect}
        />
      </div>

      {!!selectedDeveloperLicense && (
        <MainWebhooksPageBody developerLicense={selectedDeveloperLicense} />
      )}
    </div>
  );
};
