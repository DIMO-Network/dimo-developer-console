import React, { type FC } from 'react';
import classnames from 'classnames';
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
};

export const EntitlementBanner: FC<{ entitlement: Entitlement }> = ({ entitlement }) => (
  <div
    role="status"
    className={classnames(
      'flex flex-col gap-1 rounded-xl border p-4',
      entitlement.canPublish
        ? 'border-cta-default bg-surface-default text-white/70'
        : 'border-red-400/40 bg-surface-raised text-white/70',
    )}
  >
    <span className={entitlement.canPublish ? 'text-white' : 'text-red-400'}>
      {TITLES[entitlement.kind]}
      {!entitlement.canPublish && ' — read only'}
    </span>
    <span>{entitlement.reason}</span>
    {!entitlement.canSetHardwareTemplateId && (
      <span className="text-white/40">
        hardwareTemplateId decides what hardware ships and is set by DIMO only.
      </span>
    )}
  </div>
);
