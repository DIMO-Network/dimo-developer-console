'use client';
import { FC, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import configuration from '@/config';
import { VEHICLE_DETAIL } from '../queries';
import { buildVehicleGraph } from '@/services/subjects/graph';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useSubjectFreshness } from '@/hooks/subjects/useSubjectFreshness';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { latestIndexQuery } from '@/services/subjects/queries';
import { Loader } from '@/components/Loader';
import { useVehicleUrlState, type VehicleTab } from '../hooks/useVehicleUrlState';
import { VehicleHeader } from './VehicleHeader';
import { SourceRail, type Access, type AccountState } from './SourceRail';
import { SubjectTabs } from './SubjectTabs';
import { AccessNotice } from './AccessNotice';
import { SharingPanel } from './tabs/SharingPanel';
import { SubjectView, type SubjectContext } from './SubjectView';
import { shortDid } from '@/services/subjects/did';
import { CopyButton } from '@/components/CopyButton';
import './VehiclePage.css';

const CHAIN_ID = Number(configuration.CONTRACT_NETWORK);

export const VehiclePage: FC<{ tokenId: number }> = ({ tokenId }) => {
  const { data, loading, error } = useQuery(VEHICLE_DETAIL, { variables: { tokenId } });
  const { developerLicenses, loading: licensesLoading } = useValidDeveloperLicenses();
  const url = useVehicleUrlState();

  const vehicle = data?.vehicle ?? null;
  const graph = useMemo(
    () => (vehicle ? buildVehicleGraph(vehicle, CHAIN_ID) : null),
    [vehicle],
  );

  // Only licenses this vehicle's owner has granted a SACD to can read it.
  const eligible = useMemo(() => {
    const grantees = new Set(
      vehicle?.sacds.nodes.map((s) => s.grantee.toLowerCase()) ?? [],
    );
    return developerLicenses.filter((l) => grantees.has(l.clientId.toLowerCase()));
  }, [developerLicenses, vehicle]);
  const license =
    eligible.find((l) => l.clientId.toLowerCase() === url.license.toLowerCase()) ??
    eligible[0];
  const clientId = license?.clientId ?? '';

  useEffect(() => {
    if (license && license.clientId.toLowerCase() !== url.license.toLowerCase()) {
      url.set({ license: license.clientId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [license?.clientId, url.license]);

  const { isAuthenticatedAsDev, refetch: refetchJwts } = useGetDevJwts(
    clientId || undefined,
  );
  // What Identity and this browser say; the data proxy can still refuse.
  const granted: Access =
    licensesLoading || loading
      ? 'loading'
      : !license
        ? 'not-shared'
        : !isAuthenticatedAsDev
          ? 'no-jwt'
          : 'ok';

  const freshness = useSubjectFreshness({ graph, clientId, enabled: granted === 'ok' });
  // The rail's freshness request is the first exchange for the vehicle: a
  // refused exchange or a rejected developer JWT closes the data tabs.
  const exchangeCode = freshness.error?.code;
  const access: Access =
    granted !== 'ok'
      ? granted
      : exchangeCode === 'NOT_SHARED'
        ? 'not-shared'
        : // MISSING here means the stored JWT expired since the page read it.
          exchangeCode === 'DEV_JWT_INVALID' || exchangeCode === 'DEV_JWT_MISSING'
          ? 'jwt-expired'
          : 'ok';
  const accountProbe = useSubjectQuery<{ latestIndex: unknown }>({
    api: 'fetch',
    asset: graph?.account.asset ?? '',
    clientId,
    request: graph ? latestIndexQuery(graph.account.fetchDid) : null,
    enabled: access === 'ok' && !!graph,
  });
  const accountState: AccountState = accountProbe.isLoading
    ? 'loading'
    : accountProbe.error?.code === 'NOT_SHARED'
      ? 'not-shared'
      : accountProbe.data
        ? 'shared'
        : 'unknown';

  const selectedKey =
    url.subject &&
    (url.subject === 'sharing' || graph?.all.some((s) => s.did === url.subject))
      ? url.subject
      : (graph?.vehicle.did ?? '');
  const subject = graph?.all.find((s) => s.did === selectedKey) ?? null;
  const tab: VehicleTab =
    subject && url.tab && subject.capabilities.includes(url.tab)
      ? url.tab
      : (subject?.capabilities[0] ?? 'summary');

  if (loading) return <Loader isLoading />;
  if (error)
    return (
      <p className="text-body-sm text-negative">
        Something went wrong loading this vehicle.
      </p>
    );
  if (!vehicle || !graph)
    return <p className="text-body-sm text-muted">No vehicle has token ID {tokenId}.</p>;

  const ctx: SubjectContext = {
    clientId,
    license: license!,
    graph,
    chainId: CHAIN_ID,
    freshness: freshness.byDid,
    onBrowseRaw: (did) => url.set({ subject: did, tab: 'raw' }),
  };

  return (
    <div className="flex flex-col gap-6">
      <VehicleHeader
        vehicle={vehicle}
        licenses={eligible}
        selected={license}
        onSelectLicense={(id) => url.set({ license: id })}
      />
      <div className="vehicle-page__body">
        <SourceRail
          graph={graph}
          freshness={freshness.byDid}
          freshnessLoading={freshness.isLoading}
          freshnessErrors={freshness.errorByDid}
          selected={selectedKey}
          onSelect={(key) => url.set({ subject: key, tab: undefined })}
          access={access}
          accountState={accountState}
        />
        <section className="flex min-w-0 flex-col gap-4">
          {selectedKey === 'sharing' ? (
            <SharingPanel vehicle={vehicle} clientId={license?.clientId ?? ''} />
          ) : (
            subject && (
              <>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-card-title text-ink">{subject.label}</h2>
                    <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
                      {subject.sublabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-code text-muted">
                      {shortDid(subject.did)}
                    </span>
                    <CopyButton
                      value={subject.did}
                      onCopySuccessMessage="DID copied"
                      ariaLabel="Copy DID"
                    />
                  </div>
                </div>
                <SubjectTabs
                  subject={subject}
                  tab={tab}
                  onChange={(t) => url.set({ tab: t })}
                  disabled={access !== 'ok'}
                />
                {access === 'ok' ? (
                  <SubjectView subject={subject} tab={tab} ctx={ctx} />
                ) : (
                  <AccessNotice
                    access={access}
                    licenseLabel={license?.label ?? ''}
                    clientId={license?.clientId}
                    redirectUri={license?.firstRedirectURI}
                    onGenerated={() => {
                      refetchJwts();
                      void freshness.refetch();
                    }}
                    onViewSharing={() => url.set({ subject: 'sharing' })}
                  />
                )}
              </>
            )
          )}
        </section>
      </div>
    </div>
  );
};
