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
import { useTranslations } from 'next-intl';
import { HttpError } from '@/utils/httpError';

import './View.css';

const MainComponent = ({ connectionId }: { connectionId: string }) => {
  const t = useTranslations('connections');
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
          <span className="environment-badge">{t('details.environment')}</span>
        </div>
      </div>

      <div className="connection-license-section">
        <div className="section-header">
          <Title component="h2" className="section-title">
            {t('details.licenseSection')}
          </Title>
        </div>

        <div className="license-fields">
          <div className="field-row">
            <label className="field-label">{t('details.publicKey')}</label>
            <div className="field-value-container">
              <span className="field-value">
                {connection.connection_license_public_key}
              </span>
              <CopyButton value={connection.connection_license_public_key} />
            </div>
          </div>

          {connection.keys_unreadable ? (
            <p className="text-body-sm text-negative">{t('details.keysUnreadable')}</p>
          ) : (
            <>
              <div className="field-row">
                <label className="field-label">{t('details.privateKey')}</label>
                <div className="field-value-container">
                  <span className="field-value">{maskKey()}</span>
                  <CopyButton value={connection.connection_license_private_key ?? ''} />
                </div>
              </div>

              {deviceIssuanceAddress && (
                <div className="field-row">
                  <label className="field-label">{t('details.issuanceAddress')}</label>
                  <div className="field-value-container">
                    <span className="field-value">{deviceIssuanceAddress}</span>
                    <CopyButton value={deviceIssuanceAddress} />
                  </div>
                </div>
              )}

              <div className="field-row">
                <label className="field-label">{t('details.issuanceKey')}</label>
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
  const t = useTranslations('connections');
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
          {t('breadcrumb.connections')}
        </Link>
        <span>/</span>
        <span className="text-ink">{t('details.title')}</span>
      </nav>
      <QueryPageWrapper
        loading={isLoading}
        error={error && !isGone ? error : undefined}
        customErrorMessage={t('details.loadError')}
      >
        {isGone ? (
          <div className="space-y-6">
            <p className="text-body-sm text-muted">{t('details.gone')}</p>
            <Link href="/connections" className="button secondary">
              {t('breadcrumb.back')}
            </Link>
          </div>
        ) : (
          <MainComponent connectionId={id} />
        )}
      </QueryPageWrapper>
    </>
  );
};
