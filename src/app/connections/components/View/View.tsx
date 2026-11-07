'use client';
import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { Button } from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useMyConnections } from '@/hooks/queries/useMyConnections';
import { ChipIcon } from '@/components/Icons';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { StatusChip } from '@/components/StatusChip';
import { DiscardConnection } from '../DiscardConnection';

import './View.css';
import { OwnerAction } from '@/components/OwnerOnly';
import type { Connection } from '@/actions/connections';

// A row with no status comes from an older API and is finished.
const isUnfinished = ({ status }: Connection) =>
  status === 'PENDING' || status === 'MINTED';

const MainComponent: React.FC = () => {
  const t = useTranslations('connections');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useGlobalAccount();
  const owner = currentUser?.walletAddress;
  const { data: connections, isLoading } = useMyConnections();
  const hasShownNotification = useRef(false);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'connection-created' && !hasShownNotification.current) {
      toast.success(t('list.created'));
      hasShownNotification.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, t]);

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
                {connection.keys_unreadable && (
                  <StatusChip tone="off">{t('list.keysUnreadable')}</StatusChip>
                )}
                {owner && isUnfinished(connection) && !connection.keys_unreadable && (
                  <OwnerAction>
                    <Link
                      href={`/connections/create/${owner}?resume=${connection.id}`}
                      className="button primary w-full"
                    >
                      {t('list.finishSetup')}
                    </Link>
                  </OwnerAction>
                )}
                <DiscardConnection connection={connection} />
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push(`/connections/${connection.id}`)}
                >
                  {t('list.details')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="empty-state">
        <p className="empty-state-message">{t('list.empty')}</p>
      </div>
    );
  };

  return (
    <div className="connections-page">
      <Section>
        <SectionHeader title={t('list.title')}>
          {(!connections || connections.length === 0) && (
            <OwnerAction>
              <Button
                variant="primary"
                onClick={handleCreateConnection}
                disabled={isLoading}
              >
                <PlusIcon className="w-4 h-4" />
                {t('list.create')}
              </Button>
            </OwnerAction>
          )}
        </SectionHeader>

        {renderContent()}
      </Section>
    </div>
  );
};

const View: React.FC = () => {
  const t = useTranslations('connections');
  const { isLoading, error } = useMyConnections();

  return (
    <QueryPageWrapper
      loading={isLoading}
      error={error || undefined}
      customErrorMessage={t('list.loadError')}
    >
      <MainComponent />
    </QueryPageWrapper>
  );
};

export default View;
