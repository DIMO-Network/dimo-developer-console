'use client';
import { FC } from 'react';
import { useQuery } from '@apollo/client';
import { ACCOUNT_SACDS, LICENSE_ALIAS } from '../../queries';
import type { VehicleDetail } from '@/services/subjects/graph';
import { permissionLabels } from '@/utils/sacdPermissions';
import { utcDate } from '@/utils/freshness';
import { shortAddress } from '@/services/subjects/did';

const termsUrl = (source: string) =>
  `https://assets.dimo.org/ipfs/${source.replace(/^ipfs:\/\//, '')}`;
const COLS =
  'grid-cols-[minmax(0,1.3fr)_minmax(0,2.2fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]';

const Expiry: FC<{ iso: string }> = ({ iso }) => {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return <span className="text-body-sm text-muted">—</span>;
  const ms = at - Date.now();
  if (ms < 0)
    return <span className="text-body-sm text-muted">Expired {utcDate(iso)}</span>;
  const days = Math.max(1, Math.ceil(ms / 86_400_000));
  const soon = days <= 30;
  return (
    <span className={soon ? 'text-body-sm text-warning' : 'text-body-sm text-fg'}>
      {utcDate(iso)}
      {soon ? ` · in ${days} ${days === 1 ? 'day' : 'days'}` : ''}
    </span>
  );
};

const useAlias = (grantee: string): string | undefined => {
  const { data } = useQuery(LICENSE_ALIAS, {
    variables: { clientId: grantee },
    errorPolicy: 'ignore',
  });
  return data?.developerLicense?.alias ?? undefined;
};

const TermsLink: FC<{ grantee: string; source: string }> = ({ grantee, source }) => {
  const alias = useAlias(grantee);
  if (!source) return <span className="text-body-sm text-muted">—</span>;
  return (
    <a
      href={termsUrl(source)}
      target="_blank"
      rel="noreferrer"
      aria-label={`View terms for ${alias ?? shortAddress(grantee)}`}
      className="text-body-sm text-ink underline"
    >
      View terms
    </a>
  );
};

const AppName: FC<{ grantee: string; mine: boolean }> = ({ grantee, mine }) => {
  const alias = useAlias(grantee);
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

type Grant = {
  grantee: string;
  permissions: string;
  createdAt: string;
  expiresAt: string;
  source: string;
};

// One SACD grant: app, decoded permissions, terms, granted, expires.
const SacdRow: FC<{ grant: Grant; mine: boolean }> = ({ grant, mine }) => {
  const labels = permissionLabels(grant.permissions);
  return (
    <div className={`grid ${COLS} items-start gap-4 border-t border-outline px-5 py-3.5`}>
      <AppName grantee={grant.grantee} mine={mine} />
      <span className="flex flex-wrap gap-1">
        {labels.length === 0 && <span className="text-body-sm text-muted">None</span>}
        {labels.map((p) => (
          <span
            key={p}
            className="rounded-chip bg-highest px-2 py-0.5 text-label text-fg"
          >
            {p}
          </span>
        ))}
      </span>
      <TermsLink grantee={grant.grantee} source={grant.source} />
      <span className="text-body-sm text-fg">{utcDate(grant.createdAt)}</span>
      <Expiry iso={grant.expiresAt} />
    </div>
  );
};

// The vehicle's grants and the owner account's grants share this table.
// `status` (loading or an error) replaces the rows and the empty line.
const SacdTable: FC<{
  grants: Grant[];
  clientId: string;
  empty: string;
  status?: { message: string; error?: boolean } | null;
}> = ({ grants, clientId, empty, status }) => {
  const mine = clientId.toLowerCase();
  const line = 'border-t border-outline px-5 py-3 text-body-sm';
  return (
    <div className="flex flex-col rounded-card bg-card">
      <div className={`grid ${COLS} gap-4 px-5 pb-2 pt-3 text-label text-muted`}>
        <span>App</span>
        <span>Permissions</span>
        <span>Terms</span>
        <span>Granted</span>
        <span>Expires</span>
      </div>
      {status ? (
        <p className={`${line} ${status.error ? 'text-negative' : 'text-muted'}`}>
          {status.message}
        </p>
      ) : (
        <>
          {grants.map((g, i) => (
            <SacdRow
              key={`${g.grantee}-${g.createdAt}-${i}`}
              grant={g}
              mine={!!mine && g.grantee.toLowerCase() === mine}
            />
          ))}
          {grants.length === 0 && <p className={`${line} text-muted`}>{empty}</p>}
        </>
      )}
    </div>
  );
};

// Renders for every vehicle, shared with the license or not, so it takes the
// license's client ID rather than the SubjectContext ('' marks no row).
export const SharingPanel: FC<{
  vehicle: VehicleDetail;
  clientId: string;
}> = ({ vehicle, clientId }) => {
  const account = useQuery(ACCOUNT_SACDS, { variables: { address: vehicle.owner } });
  const accountStatus = account.loading
    ? { message: 'Loading…' }
    : account.error
      ? { message: account.error.message, error: true }
      : null;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-card-title text-ink">Sharing</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Apps the owner has granted access to this vehicle. Each grant is a SACD
          permission set recorded on-chain, with its own terms and expiry.
        </p>
      </div>
      <SacdTable
        grants={vehicle.sacds.nodes}
        clientId={clientId}
        empty="No apps have access to this vehicle."
      />

      <div className="flex flex-col gap-1 pt-1">
        <h2 className="text-card-title text-ink">Owner account grants</h2>
        <p className="max-w-2xl text-body-sm text-muted">
          Grants on the owner&apos;s account DID, separate from the vehicle. They cover
          documents the owner shares from the DIMO app.
        </p>
      </div>
      <SacdTable
        grants={account.data?.account?.sacds.nodes ?? []}
        clientId={clientId}
        empty="The owner hasn't granted any apps account access."
        status={accountStatus}
      />

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
