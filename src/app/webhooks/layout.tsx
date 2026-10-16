import type { ReactNode } from 'react';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

export default function WebhooksLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Webhooks">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
