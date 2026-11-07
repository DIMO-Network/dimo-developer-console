'use client';
import { FC, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { Anchor } from '@/components/Anchor';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import type { Access } from './SourceRail';

interface Props {
  access: Exclude<Access, 'ok'>;
  licenseLabel: string;
  clientId?: string;
  redirectUri?: string;
  onGenerated: () => void;
  onViewSharing: () => void;
  onRetry?: () => void;
  // A member of someone else's team: their wallet, not an API key.
  member?: boolean;
  ownerEmail?: string;
}

const Card: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
    <h3 className="text-card-title text-ink">{title}</h3>
    {children}
  </div>
);

// What replaces the tab body when the license can't read the vehicle.
export const AccessNotice: FC<Props> = ({
  access,
  licenseLabel,
  clientId,
  redirectUri,
  onGenerated,
  onViewSharing,
  onRetry,
  member = false,
  ownerEmail,
}) => {
  const t = useTranslations('vehicles');
  const tCommon = useTranslations('common');
  const wallet = (label?: string) =>
    clientId && redirectUri ? (
      <ConnectWalletButton
        clientId={clientId}
        domain={redirectUri}
        onSuccess={onGenerated}
        label={label}
      />
    ) : null;

  switch (access) {
    case 'loading':
      return null;
    case 'unavailable':
      return <Card title={tCommon('teamCopy.dataAccessUnavailable')} />;
    case 'no-access':
      return (
        <Card title={t('accessNotice.noAccessTitle', { license: licenseLabel })}>
          <p className="max-w-xl text-body-sm text-muted">
            {ownerEmail
              ? tCommon('teamCopy.askForAccess', { ownerEmail, license: licenseLabel })
              : t('accessNotice.noAccessBody', { license: licenseLabel })}
          </p>
        </Card>
      );
    case 'removed':
      return <Card title={tCommon('teamCopy.noLongerHasAccess')} />;
    case 'session-expired':
      return (
        <Card title={t('accessNotice.sessionExpiredTitle')}>
          <p className="max-w-xl text-body-sm text-muted">
            {t('accessNotice.sessionExpiredBody')}
          </p>
          <Anchor href="/sign-in" className="underline">
            {t('accessNotice.signIn')}
          </Anchor>
        </Card>
      );
    case 'reconnect':
      return (
        <Card title={t('accessNotice.reconnectTitle', { license: licenseLabel })}>
          <p className="max-w-xl text-body-sm text-muted">
            {t('accessNotice.reconnectBody')}
          </p>
          {wallet(t('accessNotice.reconnectWallet'))}
        </Card>
      );
    case 'error':
      return (
        <Card title={t('accessNotice.errorTitle', { license: licenseLabel })}>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {tCommon('actions.retry')}
            </Button>
          )}
        </Card>
      );
    case 'not-shared':
      return (
        <Card
          title={
            clientId
              ? t('accessNotice.notSharedTitleLicense', { license: licenseLabel })
              : t('accessNotice.notSharedTitleAny')
          }
        >
          <p className="max-w-xl text-body-sm text-muted">
            {clientId
              ? t('accessNotice.notSharedBodyLicense')
              : t('accessNotice.notSharedBodyAny')}
          </p>
          <Button variant="secondary" onClick={onViewSharing}>
            {t('accessNotice.viewSharing')}
          </Button>
        </Card>
      );
  }
  const expired = access === 'jwt-expired';
  if (member) {
    return (
      <Card
        title={
          expired
            ? t('accessNotice.memberExpiredTitle', { license: licenseLabel })
            : t('accessNotice.memberConnectTitle')
        }
      >
        <p className="max-w-xl text-body-sm text-muted">
          {t('accessNotice.memberBody', { license: licenseLabel })}
        </p>
        {wallet()}
      </Card>
    );
  }
  return (
    <Card
      title={
        expired
          ? t('accessNotice.jwtExpiredTitle', { license: licenseLabel })
          : t('accessNotice.jwtMissingTitle')
      }
    >
      <p className="max-w-xl text-body-sm text-muted">
        {expired
          ? t('accessNotice.jwtExpiredBody')
          : t('accessNotice.jwtMissingBody', { license: licenseLabel })}
      </p>
      {clientId && redirectUri && (
        <GenerateDevJWT
          clientId={clientId}
          domain={redirectUri}
          onSuccess={onGenerated}
        />
      )}
    </Card>
  );
};
