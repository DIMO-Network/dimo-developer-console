import type { ReactNode } from 'react';
import { AreaMessages } from '@/i18n/AreaMessages';
import { GUEST_AREAS } from '@/i18n/messages';
import { GuestLayout } from '@/layouts/GuestLayout';

export const GuestRouteLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <AreaMessages areas={GUEST_AREAS}>
    <GuestLayout>{children}</GuestLayout>
  </AreaMessages>
);

export default GuestRouteLayout;
