import { useTranslations } from 'next-intl';
import React, { type FC } from 'react';
import { WarningAmberIcon } from '@/components/Icons';
// `import type`, not a value import: templateEntitlement reaches next/headers
// through getUserByToken, and pulling it into a client component would break the
// build. The type is erased; the module is never bundled.
import type { Entitlement } from '@/services/templateEntitlement';
import { entitlementReasonText } from '@/utils/entitlementReason';

// Each title says what the reader can do, not what they are. The reason line
// below says why. Nothing here repeats "read only" -- that is appended once,
// from canPublish, so a tier can never read as open while being closed.
export const EntitlementBanner: FC<{ entitlement: Entitlement }> = ({ entitlement }) => {
  const t = useTranslations('common');
  const title = t(`templateEditor.entitlement.${entitlement.kind}`);
  return (
    <div role="status" className="flex items-start gap-3 rounded-card bg-card p-4">
      {!entitlement.canPublish && (
        <span data-testid="read-only-warning" className="mt-0.5 flex shrink-0">
          <WarningAmberIcon className="size-4 text-warning" />
        </span>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-body-sm font-medium text-ink">
          {entitlement.canPublish
            ? title
            : t('templateEditor.entitlement.readOnly', { title })}
        </span>
        <span className="text-body-sm text-muted">
          {entitlementReasonText(entitlement.reasonDetail, entitlement.mintedVehicles, t)}
        </span>
        {!entitlement.canSetHardwareTemplateId && (
          <span className="text-body-sm text-muted">
            {t('templateEditor.entitlement.hardwareLocked')}
          </span>
        )}
      </div>
    </div>
  );
};
