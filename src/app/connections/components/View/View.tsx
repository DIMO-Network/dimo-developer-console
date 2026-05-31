'use client';
import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { Button } from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { useGlobalAccount } from '@/hooks';
import { useMyConnections } from '@/hooks/queries/useMyConnections';
import { ChipIcon } from '@/components/Icons';
import { toast } from 'sonner';

import './View.css';

const MainComponent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useGlobalAccount();
  const owner = currentUser?.walletAddress;
  const { data: connections, isLoading } = useMyConnections();
  const hasShownNotification = useRef(false);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'connection-created' && !hasShownNotification.current) {
      toast.success('Connection successfully created');
      hasShownNotification.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  const handleCreateConnection = () => {
    router.push(`/connections/create/${owner}`);
  };

  const renderContent = () => {
    const hasConnections = connections && connections.length > 0;

    if (hasConnections) {
      return (
        <div className="connections-list">
          <div className="connections-grid">
            {connections.map((connection) => (
              <div key={connection.id} className="connection-card">
                <div className="connection-card-header">
                  <h3 className="connection-name">{connection.name}</h3>
                  <div className="connection-icon">
                    <ChipIcon />
                  </div>
                </div>
                <div className="connection-public-key">
                  {connection.connection_license_public_key}
                </div>
                <button
                  className="connection-details-btn"
                  onClick={() => router.push(`/connections/${connection.id}`)}
                >
                  Connection Details
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <p className="empty-state-message">
          You haven&apos;t created any connections yet.
        </p>
      </div>
    );
  };

  return (
    <div className="connections-page">
      <Section>
        <SectionHeader title="Connections">
          {(!connections || connections.length === 0) && (
            <Button
              className="dark with-icon"
              onClick={handleCreateConnection}
              disabled={isLoading}
            >
              <PlusIcon className="w-4 h-4" />
              Create a connection
            </Button>
          )}
        </SectionHeader>

        {renderContent()}
      </Section>
    </div>
  );
};

const View: React.FC = () => {
  const { isLoading, error } = useMyConnections();

  return (
    <QueryPageWrapper
      loading={isLoading}
      error={error || undefined}
      customErrorMessage={'There was a problem fetching your connections'}
    >
      <MainComponent />
    </QueryPageWrapper>
  );
};

export default View;
