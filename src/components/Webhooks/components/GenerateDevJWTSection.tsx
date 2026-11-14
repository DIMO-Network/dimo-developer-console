import { useTranslations } from 'next-intl';
import React from 'react';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { useConsoleAccessJwt } from '@/hooks/useConsoleAccessJwt';
import type { LocalDeveloperLicense } from '@/types/webhook';

// A page that needs the license's developer JWT: made with console access when
// it's on, without asking; otherwise the owner pastes one of its API keys.
export const GenerateDevJWTSection = ({
  license,
  onSuccess,
  message,
}: {
  license: LocalDeveloperLicense;
  onSuccess: () => void;
  message?: string;
}) => {
  const t = useTranslations('common');
  const consoleAccess = useConsoleAccessJwt(license, onSuccess);

  if (consoleAccess === 'checking' || consoleAccess === 'minting') {
    return (
      <p className="text-body-sm text-muted" role="status">
        {t('webhooks.generateJwt.consoleAccessPending')}
      </p>
    );
  }

  return (
    <div>
      <p className={'text-body-sm text-muted'}>
        {message ?? t('webhooks.generateJwt.message')}
      </p>
      {consoleAccess === 'failed' && (
        <p className="text-body-sm text-muted">
          {t('webhooks.generateJwt.consoleAccessFailed')}
        </p>
      )}
      <GenerateDevJWT
        clientId={license.clientId}
        domain={license.firstRedirectURI}
        onSuccess={onSuccess}
        buttonClassName="mt-2"
      />
    </div>
  );
};
