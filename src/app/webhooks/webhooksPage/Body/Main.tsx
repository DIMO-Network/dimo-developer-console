import { LocalDeveloperLicense } from '@/types/webhook';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import React from 'react';
import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import Button from '../../../../components/Button/Button';
import { WebhookTable } from '@/components/Webhooks/WebhookTable';

export const MainWebhooksPageBody = ({
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
  return (
    <Section>
      <SectionHeader title={'Webhooks'}>
        <Link href={`/webhooks/create/${developerLicense.clientId}`}>
          <Button className="dark with-icon">+ Create a webhook</Button>
        </Link>
      </SectionHeader>
      <WebhookTable clientId={developerLicense.clientId} />
    </Section>
  );
};
