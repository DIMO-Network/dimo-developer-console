import type { ReactNode } from 'react';
import { Metadata } from 'next';
import configuration from '@/config';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

// The create and edit pages set their own titles.
export const metadata: Metadata = {
  title: `Webhooks | ${configuration.appName}`,
};

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Webhooks">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
