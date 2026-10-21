import type { ReactNode } from 'react';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

export default function ConnectionsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedLayout>
      <OwnerOnly feature="Connections">{children}</OwnerOnly>
    </AuthorizedLayout>
  );
}
