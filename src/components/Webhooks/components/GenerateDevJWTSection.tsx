import React from 'react';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { useConsoleAccessJwt } from '@/hooks/useConsoleAccessJwt';
import type { LocalDeveloperLicense } from '@/types/webhook';

export const CONSOLE_ACCESS_JWT_PENDING = 'Getting a developer JWT with console access…';
export const CONSOLE_ACCESS_JWT_FAILED =
  "Couldn't get a developer JWT with console access. Use an API key instead.";

// A page that needs the license's developer JWT: made with console access when
// it's on, without asking; otherwise the owner pastes one of its API keys.
export const GenerateDevJWTSection = ({
  license,
  onSuccess,
  message = 'Please generate a Developer JWT to view your webhook configurations.',
}: {
  license: LocalDeveloperLicense;
  onSuccess: () => void;
  message?: string;
}) => {
  const consoleAccess = useConsoleAccessJwt(license, onSuccess);

  if (consoleAccess === 'checking' || consoleAccess === 'minting') {
    return (
      <p className="text-body-sm text-muted" role="status">
        {CONSOLE_ACCESS_JWT_PENDING}
      </p>
    );
  }

  return (
    <div>
      <p className={'text-body-sm text-muted'}>{message}</p>
      {consoleAccess === 'failed' && (
        <p className="text-body-sm text-muted">{CONSOLE_ACCESS_JWT_FAILED}</p>
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
