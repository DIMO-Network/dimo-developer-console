import type { ReactNode } from 'react';
import { AreaMessages } from '@/i18n/AreaMessages';
import { SIGNED_IN_AREAS } from '@/i18n/messages';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const AuthorizedRouteLayout = ({
  children,
}: Readonly<{ children: ReactNode }>) => (
  <AreaMessages areas={SIGNED_IN_AREAS}>
    <AuthorizedLayout>{children}</AuthorizedLayout>
  </AreaMessages>
);

export default AuthorizedRouteLayout;
