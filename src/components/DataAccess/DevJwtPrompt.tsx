'use client';
import { useTranslations } from 'next-intl';
import type { FC } from 'react';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import type { LicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import type { LocalDeveloperLicense } from '@/types/webhook';

// What a page shows when it needs a developer JWT for a license: owners get one
// with console access, or use an API key; members use their own wallet;
// members without access are told whom to ask.
export const DevJwtPrompt: FC<{
  license: LocalDeveloperLicense;
  access: LicenseDataAccess;
  onSuccess: () => void;
  message: string;
}> = ({ license, access, onSuccess, message }) => {
  const t = useTranslations('common');
  if (access.kind === 'owner') {
    return (
      <GenerateDevJWTSection license={license} onSuccess={onSuccess} message={message} />
    );
  }
  if (access.kind === 'member-unavailable') {
    return (
      <p className="text-body-sm text-muted">{t('teamCopy.dataAccessUnavailable')}</p>
    );
  }
  if (access.kind === 'member-no-access') {
    return (
      <p className="text-body-sm text-muted">
        {t('teamCopy.askForAccess', {
          ownerEmail: access.ownerEmail,
          license: license.label,
        })}
      </p>
    );
  }
  return (
    <div>
      <p className="text-body-sm text-muted">
        {t('dataAccess.connectPrompt', { license: license.label })}
      </p>
      <div className="mt-2">
        <ConnectWalletButton
          clientId={license.clientId}
          domain={license.firstRedirectURI}
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
};
