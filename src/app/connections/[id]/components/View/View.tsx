'use client';

import React, { use } from 'react';
import { Title } from '@/components/Title';
import { CopyButton } from '@/components/CopyButton';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { useQuery } from '@tanstack/react-query';
import { getConnectionById } from '@/actions/connections';

import './View.css';

const MainComponent = ({ connectionId }: { connectionId: string }) => {
  const { data: connection } = useQuery({
    queryKey: ['connection', connectionId],
    queryFn: () => getConnectionById(connectionId),
  });

  const maskKey = () => {
    return '*'.repeat(20);
  };

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
            Connection License
          </Title>
        </div>

        <div className="license-fields">
          <div className="field-row">
            <label className="field-label">Connection License Public Key</label>
            <div className="field-value-container">
              <span className="field-value">
                {connection.connection_license_public_key}
              </span>
              <CopyButton value={connection.connection_license_public_key} />
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Connection License Private Key</label>
            <div className="field-value-container">
              <span className="field-value">{maskKey()}</span>
              <CopyButton value={connection.connection_license_private_key} />
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Device Issuance Key</label>
            <div className="field-value-container">
              <span className="field-value">{maskKey()}</span>
              <CopyButton value={connection.device_issuance_key} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const View = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);

  const { isLoading, error } = useQuery({
    queryKey: ['connection', id],
    queryFn: () => getConnectionById(id),
  });

  return (
    <QueryPageWrapper
      loading={isLoading}
      error={error || undefined}
      customErrorMessage={'There was a problem loading the connection details'}
    >
      <MainComponent connectionId={id} />
    </QueryPageWrapper>
  );
};
