'use client';

import { use } from 'react';
import { EditWebhook } from '@/components/Webhooks/EditWebhook';
import { useWebhookById } from '@/hooks/queries/useWebhookById';
import { Loader } from '@/components/Loader';
import { EditWebhookContextProvider } from '@/hoc/EditWebhookProvider';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const View = ({
  params,
}: {
  params: Promise<{ webhookId: string; clientId: string }>;
}) => {
  const t = useTranslations('webhooks');
  const { webhookId, clientId } = use(params);
  const { data, isLoading, error } = useWebhookById({ webhookId, clientId });

  if (isLoading) {
    return <Loader isLoading />;
  }
  if (error) {
    return <p>{t('edit.fetchError')}</p>;
  }
  if (!data) {
    return <p>{t('edit.notFound')}</p>;
  }

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/webhooks" className="transition-colors hover:text-ink">
          {t('breadcrumb.webhooks')}
        </Link>
        <span>/</span>
        <span className="text-ink">{t('breadcrumb.editWebhook')}</span>
      </nav>
      <EditWebhookContextProvider>
        <div className="mt-2">
          <EditWebhook webhook={data} clientId={clientId} />
        </div>
      </EditWebhookContextProvider>
    </>
  );
};
