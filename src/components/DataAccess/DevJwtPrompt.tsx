'use client';
import type { FC } from 'react';
import { GenerateDevJWTSection } from '@/components/Webhooks/components/GenerateDevJWTSection';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import { askForAccess, DATA_ACCESS_UNAVAILABLE } from '@/config/teamCopy';
import type { LicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import type { LocalDeveloperLicense } from '@/types/webhook';

// What a page shows when it needs a developer JWT for a license: owners use an
// API key, members their own wallet, members without access whom to ask.
export const DevJwtPrompt: FC<{
  license: LocalDeveloperLicense;
  access: LicenseDataAccess;
  onSuccess: () => void;
  message: string;
}> = ({ license, access, onSuccess, message }) => {
  if (access.kind === 'owner') {
    return (
      <GenerateDevJWTSection
        clientId={license.clientId}
        redirectUri={license.firstRedirectURI}
        onSuccess={onSuccess}
        message={message}
      />
    );
  }
  if (access.kind === 'member-unavailable') {
    return <p className="text-body-sm text-muted">{DATA_ACCESS_UNAVAILABLE}</p>;
  }
  if (access.kind === 'member-no-access') {
    return (
      <p className="text-body-sm text-muted">
        {askForAccess(access.ownerEmail, license.label)}
      </p>
    );
  }
  return (
    <div>
      <p className="text-body-sm text-muted">
        Connect with your wallet to read {license.label}. The team owner gave your wallet
        access, and the token stays in this browser.
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
