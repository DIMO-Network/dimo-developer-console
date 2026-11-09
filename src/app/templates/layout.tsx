import type { ReactNode } from 'react';
import { AuthorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';
import { TEMPLATE_EDITOR_ENABLED } from '@/utils/featureFlags';
import { TemplatesUnavailable } from './TemplatesUnavailable';

// While the editor is switched off, every /templates route shows the same
// notice, so a bookmarked or typed URL cannot reach the unfinished backend.
const TemplatesLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <AuthorizedRouteLayout>
    {TEMPLATE_EDITOR_ENABLED ? children : <TemplatesUnavailable />}
  </AuthorizedRouteLayout>
);

export default TemplatesLayout;
