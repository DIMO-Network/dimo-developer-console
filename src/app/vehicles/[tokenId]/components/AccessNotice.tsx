'use client';
import { FC, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { ConnectWalletButton } from '@/components/DataAccess/ConnectWalletButton';
import {
  askForAccess,
  DATA_ACCESS_UNAVAILABLE,
  NO_LONGER_HAS_ACCESS,
} from '@/config/teamCopy';
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
  ownerEmail = 'the team owner',
}) => {
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
      return <Card title={DATA_ACCESS_UNAVAILABLE} />;
    case 'no-access':
      return (
        <Card title={`You don't have data access to ${licenseLabel}`}>
          <p className="max-w-xl text-body-sm text-muted">
            {askForAccess(ownerEmail, licenseLabel)}
          </p>
        </Card>
      );
    case 'removed':
      return <Card title={NO_LONGER_HAS_ACCESS} />;
    case 'reconnect':
      return (
        <Card title={`Reconnect to ${licenseLabel}`}>
          <p className="max-w-xl text-body-sm text-muted">
            The developer JWT in this browser was not signed by your current wallet.
          </p>
          {wallet('Reconnect with your wallet')}
        </Card>
      );
    case 'error':
      return (
        <Card title={`We couldn't check your access to ${licenseLabel}.`}>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
        </Card>
      );
    case 'not-shared':
      return (
        <Card
          title={
            clientId
              ? `This vehicle isn't shared with ${licenseLabel}`
              : "This vehicle isn't shared with any of your licenses"
          }
        >
          <p className="max-w-xl text-body-sm text-muted">
            {clientId
              ? "The owner hasn't granted this license access"
              : "The owner hasn't granted any of your licenses access"}
            , so its data can&apos;t be read here. You can still see which apps it is
            shared with.
          </p>
          <Button variant="secondary" onClick={onViewSharing}>
            View sharing
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
            ? `Your connection to ${licenseLabel} has expired`
            : 'Connect your wallet to read this vehicle'
        }
      >
        <p className="max-w-xl text-body-sm text-muted">
          Your wallet signs a developer JWT for {licenseLabel}; the token stays in this
          browser.
        </p>
        {wallet()}
      </Card>
    );
  }
  return (
    <Card
      title={
        expired
          ? `Your developer JWT for ${licenseLabel} has expired`
          : 'Generate a developer JWT to read this vehicle'
      }
    >
      <p className="max-w-xl text-body-sm text-muted">
        {expired ? (
          'Generate a new one to keep reading this vehicle.'
        ) : (
          <>
            {licenseLabel} has no developer JWT in this browser yet. Generating one uses
            the license&apos;s API key, and the token stays in this browser.
          </>
        )}
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
