'use client';

import { use } from 'react';
import { EditWebhook } from '@/components/Webhooks/EditWebhook';
import { useWebhookById } from '@/hooks/queries/useWebhookById';
import { Loader } from '@/components/Loader';
import { EditWebhookContextProvider } from '@/hoc/EditWebhookProvider';
import Link from 'next/link';

export const View = ({
  params,
}: {
  params: Promise<{ webhookId: string; clientId: string }>;
}) => {
  const { webhookId, clientId } = use(params);
  const { data, isLoading, error } = useWebhookById({ webhookId, clientId });

  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>There was an error fetching your webhook</p>;
  }
  if (!data) {
    return <p>no webhook found</p>;
  }

  return (
    <>
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Link href="/webhooks" className="hover:text-foreground transition-colors">
          Webhooks
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit Webhook</span>
      </nav>
      <EditWebhookContextProvider>
        <EditWebhook webhook={data} clientId={clientId} />
      </EditWebhookContextProvider>
    </>
  );
};
