'use client';
import { FC } from 'react';
import { Button } from '@/components/Button';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import type { Access } from './SourceRail';

interface Props {
  access: Exclude<Access, 'ok'>;
  licenseLabel: string;
  clientId?: string;
  redirectUri?: string;
  onGenerated: () => void;
  onViewSharing: () => void;
}

// What replaces the tab body when the license can't read the vehicle.
export const AccessNotice: FC<Props> = ({
  access,
  licenseLabel,
  clientId,
  redirectUri,
  onGenerated,
  onViewSharing,
}) => {
  if (access === 'loading') return null;
  if (access === 'not-shared') {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
        <h3 className="text-card-title text-ink">
          {clientId
            ? `This vehicle isn't shared with ${licenseLabel}`
            : "This vehicle isn't shared with any of your licenses"}
        </h3>
        <p className="max-w-xl text-body-sm text-muted">
          {clientId
            ? "The owner hasn't granted this license access"
            : "The owner hasn't granted any of your licenses access"}
          , so its data can&apos;t be read here. You can still see which apps it is shared
          with.
        </p>
        <Button variant="secondary" onClick={onViewSharing}>
          View sharing
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6">
      <h3 className="text-card-title text-ink">
        Generate a developer JWT to read this vehicle
      </h3>
      <p className="max-w-xl text-body-sm text-muted">
        {licenseLabel} has no developer JWT in this browser yet. Generating one uses the
        license&apos;s API key, and the token stays in this browser.
      </p>
      {clientId && redirectUri && (
        <GenerateDevJWT
          clientId={clientId}
          domain={redirectUri}
          onSuccess={onGenerated}
        />
      )}
    </div>
  );
};
