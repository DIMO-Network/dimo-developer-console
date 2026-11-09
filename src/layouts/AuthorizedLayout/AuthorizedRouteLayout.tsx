import type { ReactNode } from 'react';
import { AreaMessages } from '@/i18n/AreaMessages';
import { SECTION_MESSAGES, SHELL_MESSAGES, type Section } from '@/i18n/messages';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout/AuthorizedLayout';

// The layout of one signed-in section, with that section's copy.
export const authorizedRouteLayout = (section: Section) => {
  const areas = [...SHELL_MESSAGES, ...SECTION_MESSAGES[section]];
  const AuthorizedRouteLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
    <AreaMessages areas={areas}>
      <AuthorizedLayout>{children}</AuthorizedLayout>
    </AreaMessages>
  );
  return AuthorizedRouteLayout;
};
