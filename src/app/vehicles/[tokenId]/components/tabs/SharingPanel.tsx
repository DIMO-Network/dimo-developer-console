'use client';
import { FC } from 'react';
import { useQuery } from '@apollo/client';
import { LICENSE_ALIAS } from '../../queries';
import type { VehicleDetail } from '@/services/subjects/graph';
import type { AccountState } from '../SourceRail';
import { permissionLabels } from '@/utils/sacdPermissions';
import { utcDate } from '@/utils/freshness';
import { shortAddress } from '@/services/subjects/did';

const termsUrl = (source: string) =>
  `https://assets.dimo.org/ipfs/${source.replace(/^ipfs:\/\//, '')}`;
const COLS =
  'grid-cols-[minmax(0,1.3fr)_minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]';

const Expiry: FC<{ iso: string }> = ({ iso }) => {
  const ms = Date.parse(iso) - Date.now();
  if (ms < 0)
    return <span className="text-body-sm text-muted">Expired {utcDate(iso)}</span>;
  const days = Math.round(ms / 86_400_000);
  return (
    <span className={days <= 30 ? 'text-body-sm text-warning' : 'text-body-sm text-fg'}>
      {utcDate(iso)}
      {days <= 30 ? ` · in ${days} days` : ''}
    </span>
  );
};

const AppName: FC<{ grantee: string; mine: boolean }> = ({ grantee, mine }) => {
  const { data } = useQuery(LICENSE_ALIAS, {
    variables: { clientId: grantee },
    errorPolicy: 'ignore',
  });
  const alias = data?.developerLicense?.alias;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={
            alias ? 'text-body-sm font-medium text-ink' : 'font-mono text-code text-ink'
          }
        >
          {alias ?? shortAddress(grantee)}
        </span>
        {mine && (
          <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
            This license
          </span>
        )}
      </span>
      <span className="font-mono text-code text-muted">
        {alias ? shortAddress(grantee) : 'No app name registered'}
      </span>
    </span>
  );
};

// Renders for every vehicle, shared with the license or not, so it takes the
// license as plain strings rather than the SubjectContext.
export const SharingPanel: FC<{
  vehicle: VehicleDetail;
  clientId: string;
  licenseLabel: string;
  accountState: AccountState;
}> = ({ vehicle, clientId, licenseLabel, accountState }) => {
  const mine = clientId.toLowerCase();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title text-ink">Sharing</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Apps the owner has granted access to this vehicle. Each grant is a SACD
          permission set recorded on-chain, with its own terms and expiry.
        </p>
      </div>
      <div className="flex flex-col rounded-card bg-card">
        <div className={`grid ${COLS} gap-4 px-5 pb-2 pt-3 text-label text-muted`}>
          <span>App</span>
          <span>Permissions</span>
          <span>Terms</span>
          <span>Granted</span>
          <span>Expires</span>
        </div>
        {vehicle.sacds.nodes.map((s) => (
          <div
            key={`${s.grantee}-${s.createdAt}`}
            className={`grid ${COLS} items-start gap-4 border-t border-outline px-5 py-3.5`}
          >
            <AppName grantee={s.grantee} mine={s.grantee.toLowerCase() === mine} />
            <span className="flex flex-wrap gap-1">
              {permissionLabels(s.permissions).map((p) => (
                <span
                  key={p}
                  className="rounded-chip bg-highest px-2 py-0.5 text-label text-fg"
                >
                  {p}
                </span>
              ))}
            </span>
            <a
              href={termsUrl(s.source)}
              target="_blank"
              rel="noreferrer"
              className="text-body-sm text-ink underline"
            >
              View terms
            </a>
            <span className="text-body-sm text-fg">{utcDate(s.createdAt)}</span>
            <Expiry iso={s.expiresAt} />
          </div>
        ))}
        {vehicle.sacds.nodes.length === 0 && (
          <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
            No apps have access to this vehicle.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-card-title text-ink">Owner account</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Document access is a separate grant on the owner&apos;s account DID. Only{' '}
          {licenseLabel}&apos;s own grant can be checked from here.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-card bg-card px-5 py-3.5">
        <span className="text-body-sm font-medium text-ink">
          {licenseLabel} · documents
        </span>
        <span
          className={
            accountState === 'shared' ? 'text-body-sm text-fg' : 'text-body-sm text-muted'
          }
        >
          {accountState === 'shared'
            ? 'Shared'
            : accountState === 'not-shared'
              ? 'Not shared'
              : accountState === 'loading'
                ? 'Checking…'
                : '—'}
        </span>
      </div>

      {vehicle.privileges.nodes.length > 0 && (
        <>
          <h2 className="pt-1 text-card-title text-ink">Legacy privileges</h2>
          <div className="flex flex-col rounded-card bg-card">
            <div className="grid grid-cols-4 gap-4 px-5 pb-2 pt-3 text-label text-muted">
              <span>ID</span>
              <span>User</span>
              <span>Set</span>
              <span>Expires</span>
            </div>
            {vehicle.privileges.nodes.map((p) => (
              <div
                key={`${p.id}-${p.user}`}
                className="grid grid-cols-4 items-center gap-4 border-t border-outline px-5 py-3 text-body-sm text-fg"
              >
                <span>{p.id}</span>
                <span className="font-mono text-code">{shortAddress(p.user)}</span>
                <span>{utcDate(p.setAt)}</span>
                <Expiry iso={p.expiresAt} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
