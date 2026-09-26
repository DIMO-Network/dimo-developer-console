import React, { type FC } from 'react';
import { WarningAmberIcon } from '@/components/Icons';
// `import type`, not a value import: templateEntitlement reaches next/headers
// through getUserByToken, and pulling it into a client component would break the
// build. The type is erased; the module is never bundled.
import type { Entitlement } from '@/services/templateEntitlement';

const TITLES: Record<Entitlement['kind'], string> = {
  'create': 'New template',
  'author': 'You can publish this',
  'manufacturer': 'You hold this Manufacturer NFT',
  'curator': 'Curator',
  'proposal-required': 'Read only',
  'unavailable': 'Access could not be verified',
};

export const EntitlementBanner: FC<{ entitlement: Entitlement }> = ({ entitlement }) => (
  <div role="status" className="flex items-start gap-3 rounded-card bg-card p-4">
    {!entitlement.canPublish && (
      <WarningAmberIcon className="mt-0.5 size-4 flex-shrink-0 text-warning" />
    )}
    <div className="flex flex-col gap-1">
      <span className="text-body-sm font-medium text-ink">
        {TITLES[entitlement.kind]}
        {!entitlement.canPublish && ' — read only'}
      </span>
      <span className="text-body-sm text-muted">{entitlement.reason}</span>
      {!entitlement.canSetHardwareTemplateId && (
        <span className="text-body-sm text-muted">
          hardwareTemplateId decides what hardware ships and is set by DIMO only.
        </span>
      )}
    </div>
  </div>
);
