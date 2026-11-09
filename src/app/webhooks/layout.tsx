import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import configuration from '@/config';
import { AuthorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

// The create and edit pages set their own titles.
export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('webhooks');
  return { title: t('metadata.list', { appName: configuration.appName }) };
};

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedRouteLayout>
      <OwnerOnly feature="webhooks">{children}</OwnerOnly>
    </AuthorizedRouteLayout>
  );
}
