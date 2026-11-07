import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import configuration from '@/config';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

// The create and edit pages set their own titles.
export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('webhooks');
  return { title: t('metadata.list', { appName: configuration.appName }) };
};

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Webhooks">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
