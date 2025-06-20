import { LocalDeveloperLicense } from '@/types/webhook';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { WebhooksSection } from '@/app/webhooks/components/WebhooksTableSection/WebhooksTableSection';
import React from 'react';

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
  return <WebhooksSection clientId={developerLicense.clientId} />;
};
