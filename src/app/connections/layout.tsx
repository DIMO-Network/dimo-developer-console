import type { ReactNode } from 'react';
import { authorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';
import { OwnerOnly } from '@/components/OwnerOnly';

const SectionLayout = authorizedRouteLayout('/connections');

export default function ConnectionsLayout({ children }: { children: ReactNode }) {
  return (
    <SectionLayout>
      <OwnerOnly feature="connections">{children}</OwnerOnly>
    </SectionLayout>
  );
}
