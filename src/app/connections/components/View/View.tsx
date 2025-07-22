'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { PageSubtitle } from '@/components/PageSubtitle';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { Button } from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { useGlobalAccount } from '@/hooks';
import { useUserConnections } from '@/hooks';

import './View.css';

const MainComponent: React.FC = () => {
  const router = useRouter();
  const { currentUser } = useGlobalAccount();
  const owner = currentUser?.walletAddress;
  const { data: connectionData, isLoading } = useUserConnections();

  const handleCreateConnection = () => {
    //TODO: Create connection modal + owner address?
    router.push(`/connections/create/${owner}`);
  };

  const renderContent = () => {
    if (connectionData?.hasConnections) {
      return (
        <div className="connections-list">
          <p>You have {connectionData.connections.length} connection(s).</p>
          {/* Connection table tbd */}
          <div className="connections-table">
            {connectionData.connections.map((connection) => (
              <div key={connection.address} className="connection-item">
                <p>Address: {connection.address}</p>
                <p>Owner: {connection.owner}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    console.log(connectionData);
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
      <PageSubtitle subtitle="Connection Oracle is an application that performs data streaming from your data source to a DIMO Node." />

      <Section>
        <SectionHeader title="Connections">
          {!connectionData?.hasConnections && (
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
  const { isLoading, error } = useUserConnections();

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
