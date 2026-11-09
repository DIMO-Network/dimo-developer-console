import type { ReactNode } from 'react';
import { AuthorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

export default function ConnectionsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthorizedRouteLayout>
      <OwnerOnly feature="connections">{children}</OwnerOnly>
    </AuthorizedRouteLayout>
  );
}
