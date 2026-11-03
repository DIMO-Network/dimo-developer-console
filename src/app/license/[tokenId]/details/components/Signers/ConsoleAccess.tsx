'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/Button';
import { useDimoAuth, useEventEmitter } from '@/hooks';
import { getDevJwt } from '@/utils/devJwt';
import {
  CONSOLE_ACCESS_EXPLAINER,
  COPY_JWT,
  ENABLE_CONSOLE_ACCESS,
  ENABLING_CONSOLE_ACCESS,
  JWT_FAILED,
  MEMBER_CONSOLE_OFF,
  NO_REDIRECT_URI_FOR_JWT,
} from './consoleAccessCopy';

interface Props {
  isLicenseOwner: boolean;
  on: boolean;
  enabling: boolean;
  error: string | null;
  onEnable: () => void;
  clientId: `0x${string}`;
  domain: string | undefined;
}

export const ConsoleAccess: FC<Props> = ({
  isLicenseOwner,
  on,
  enabling,
  error,
  onEnable,
  clientId,
  domain,
}) => {
  const { getGlobalAccountDeveloperJwt } = useDimoAuth();
  const { publishEvent } = useEventEmitter<unknown>('developer-jwt-updated');
  const [copying, setCopying] = useState(false);

  const copyJwt = async () => {
    if (!domain) return;
    setCopying(true);
    try {
      let token = getDevJwt(clientId);
      if (!token) {
        await getGlobalAccountDeveloperJwt({ clientId, domain });
        token = getDevJwt(clientId);
      }
      if (!token) throw new Error('No developer JWT');
      await navigator.clipboard.writeText(token);
      toast.success('JWT copied!');
      publishEvent({}, true);
    } catch (e) {
      Sentry.captureException(e);
      toast.error(JWT_FAILED);
    } finally {
      setCopying(false);
    }
  };

  if (!on) {
    if (!isLicenseOwner)
      return <p className="text-body-sm text-muted">{MEMBER_CONSOLE_OFF}</p>;
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-body-sm text-muted">{CONSOLE_ACCESS_EXPLAINER}</p>
        <Button variant="secondary" disabled={enabling} onClick={onEnable}>
          {ENABLE_CONSOLE_ACCESS}
        </Button>
        {enabling && <p className="text-body-sm text-muted">{ENABLING_CONSOLE_ACCESS}</p>}
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
      </div>
    );
  }
  if (!isLicenseOwner) return null;
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        disabled={!domain || copying}
        loading={copying}
        onClick={() => void copyJwt()}
      >
        {COPY_JWT}
      </Button>
      {!domain && <p className="text-body-sm text-muted">{NO_REDIRECT_URI_FOR_JWT}</p>}
    </div>
  );
};
