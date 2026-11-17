'use client';
import { type FC, useState } from 'react';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { useDimoAuth } from '@/hooks/useDimoAuth';
import { useEventEmitter } from '@/hooks/useEventEmitter';
import { getDevJwt } from '@/utils/devJwt';

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
  const t = useTranslations('license');
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
      toast.success(t('consoleAccess.jwtCopied'));
      publishEvent({}, true);
    } catch (e) {
      Sentry.captureException(e);
      toast.error(t('consoleAccess.jwtFailed'));
    } finally {
      setCopying(false);
    }
  };

  if (!on) {
    if (!isLicenseOwner)
      return <p className="text-body-sm text-muted">{t('consoleAccess.memberOff')}</p>;
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-body-sm text-muted">{t('consoleAccess.explainer')}</p>
        <Button variant="secondary" disabled={enabling} onClick={onEnable}>
          {t('consoleAccess.enable')}
        </Button>
        {enabling && (
          <p className="text-body-sm text-muted">{t('consoleAccess.enabling')}</p>
        )}
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
        {t('consoleAccess.copyJwt')}
      </Button>
      {!domain && (
        <p className="text-body-sm text-muted">{t('consoleAccess.noRedirectUri')}</p>
      )}
    </div>
  );
};
