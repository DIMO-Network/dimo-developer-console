'use client';

import React, { use, useMemo } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { Title } from '@/components/Title';
import { CopyButton } from '@/components/CopyButton';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { useQuery } from '@tanstack/react-query';
import type { Connection } from '@/actions/connections';
import { fetchJson } from '@/utils/fetchJson';
import Link from 'next/link';
import { HttpError } from '@/utils/httpError';
import { CONNECTION_GONE_DETAIL, KEYS_UNREADABLE_DETAIL } from '@/app/connections/copy';

import './View.css';

const MainComponent = ({ connectionId }: { connectionId: string }) => {
  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () =>
      fetchJson<Connection>(`/api/connections/${encodeURIComponent(connectionId)}`),
  });

  const maskKey = () => {
    return '*'.repeat(20);
  };

  const deviceIssuanceAddress = useMemo(() => {
    if (connection?.keys_unreadable || !connection?.device_issuance_key) return null;
    return privateKeyToAddress(connection.device_issuance_key as `0x${string}`);
  }, [connection?.device_issuance_key]);

  if (!connection) return null;

  return (
    <div className="connection-details-page">
      <div className="connection-details-header">
        <div className="connection-title-section">
          <h1 className="connection-title">{connection.name}</h1>
          <span className="environment-badge">Production</span>
        </div>
      </div>

      <div className="connection-license-section">
        <div className="section-header">
          <Title component="h2" className="section-title">
            Connection license
          </Title>
        </div>

        <div className="license-fields">
          <div className="field-row">
            <label className="field-label">Connection license public key</label>
            <div className="field-value-container">
              <span className="field-value">
                {connection.connection_license_public_key}
              </span>
              <CopyButton value={connection.connection_license_public_key} />
            </div>
          </div>

          {connection.keys_unreadable ? (
            <p className="text-body-sm text-negative">{KEYS_UNREADABLE_DETAIL}</p>
          ) : (
            <>
              <div className="field-row">
                <label className="field-label">Connection license private key</label>
                <div className="field-value-container">
                  <span className="field-value">{maskKey()}</span>
                  <CopyButton value={connection.connection_license_private_key ?? ''} />
                </div>
              </div>

              {deviceIssuanceAddress && (
                <div className="field-row">
                  <label className="field-label">Device issuance address</label>
                  <div className="field-value-container">
                    <span className="field-value">{deviceIssuanceAddress}</span>
                    <CopyButton value={deviceIssuanceAddress} />
                  </div>
                </div>
              )}

              <div className="field-row">
                <label className="field-label">Device issuance key</label>
                <div className="field-value-container">
                  <span className="field-value">{maskKey()}</span>
                  <CopyButton value={connection.device_issuance_key ?? ''} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const View = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);

  const { isLoading, error } = useQuery({
    queryKey: ['connection', id],
    queryFn: () => fetchJson<Connection>(`/api/connections/${encodeURIComponent(id)}`),
  });

  const isGone = error instanceof HttpError && error.status === 404;

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/connections" className="transition-colors hover:text-ink">
          Connections
        </Link>
        <span>/</span>
        <span className="text-ink">Connection details</span>
      </nav>
      <QueryPageWrapper
        loading={isLoading}
        error={error && !isGone ? error : undefined}
        customErrorMessage={'There was a problem loading the connection details'}
      >
        {isGone ? (
          <div className="space-y-6">
            <p className="text-body-sm text-muted">{CONNECTION_GONE_DETAIL}</p>
            <Link href="/connections" className="button secondary">
              Back to Connections
            </Link>
          </div>
        ) : (
          <MainComponent connectionId={id} />
        )}
      </QueryPageWrapper>
    </>
  );
};
