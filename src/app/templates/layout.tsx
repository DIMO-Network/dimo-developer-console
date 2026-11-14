import type { ReactNode } from 'react';
import { authorizedRouteLayout } from '@/layouts/AuthorizedLayout/AuthorizedRouteLayout';
import { TEMPLATE_EDITOR_ENABLED } from '@/utils/featureFlags';
import { TemplatesUnavailable } from './TemplatesUnavailable';

const SectionLayout = authorizedRouteLayout('/templates');

// While the editor is switched off, every /templates route shows the same
// notice, so a bookmarked or typed URL cannot reach the unfinished backend.
const TemplatesLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <SectionLayout>
    {TEMPLATE_EDITOR_ENABLED ? children : <TemplatesUnavailable />}
  </SectionLayout>
);

export default TemplatesLayout;
