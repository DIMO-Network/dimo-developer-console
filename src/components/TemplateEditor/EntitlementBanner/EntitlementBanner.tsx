import React, { type FC } from 'react';
import { WarningAmberIcon } from '@/components/Icons';
// `import type`, not a value import: templateEntitlement reaches next/headers
// through getUserByToken, and pulling it into a client component would break the
// build. The type is erased; the module is never bundled.
import type { Entitlement } from '@/services/templateEntitlement';

// Each title says what the reader can do, not what they are. The reason line
// below says why. Nothing here repeats "read only" -- that is appended once,
// from canPublish, so a tier can never read as open while being closed.
const TITLES: Record<Entitlement['kind'], string> = {
  'create': 'You can create this template',
  'licensed': 'You can edit this template',
  'manufacturer': 'You can edit this template',
  'curator': 'You can edit anything here',
  'license-required': 'A developer license is needed',
  'unavailable': "Access couldn't be checked",
};

export const EntitlementBanner: FC<{ entitlement: Entitlement }> = ({ entitlement }) => (
  <div role="status" className="flex items-start gap-3 rounded-card bg-card p-4">
    {!entitlement.canPublish && (
      <span data-testid="read-only-warning" className="mt-0.5 flex flex-shrink-0">
        <WarningAmberIcon className="size-4 text-warning" />
      </span>
    )}
    <div className="flex flex-col gap-1">
      <span className="text-body-sm font-medium text-ink">
        {TITLES[entitlement.kind]}
        {!entitlement.canPublish && ' — read only'}
      </span>
      <span className="text-body-sm text-muted">{entitlement.reason}</span>
      {!entitlement.canSetHardwareTemplateId && (
        <span className="text-body-sm text-muted">
          Which hardware ships with a car is DIMO&#39;s call, so the hardware template
          field stays locked.
        </span>
      )}
    </div>
  </div>
);
