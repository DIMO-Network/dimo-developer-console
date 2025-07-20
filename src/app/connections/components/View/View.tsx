'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageSubtitle } from '@/components/PageSubtitle';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { Button } from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { LocalDeveloperLicense } from '@/types/webhook';

import './View.css';

const MainComponent: React.FC = () => {
  const router = useRouter();
  const [firstDeveloperLicense, setFirstDeveloperLicense] =
    useState<LocalDeveloperLicense>();
  const { developerLicenses, loading } = useValidDeveloperLicenses();

  useEffect(() => {
    if (!loading && developerLicenses.length === 1 && !firstDeveloperLicense) {
      setFirstDeveloperLicense(developerLicenses[0]);
    }
  }, [loading, developerLicenses, firstDeveloperLicense]);

  const handleCreateConnection = () => {
    if (firstDeveloperLicense?.clientId) {
      router.push(`/connections/create/${firstDeveloperLicense.clientId}`);
    }
  };
  console.log(firstDeveloperLicense);

  return (
    <div className="connections-page">
      <PageSubtitle subtitle="Connection Oracle is an application that performs data streaming from your data source to a DIMO Node." />

      <Section>
        <SectionHeader title="Connections">
          <Button
            className="dark with-icon"
            onClick={handleCreateConnection}
            disabled={!firstDeveloperLicense?.clientId}
          >
            <PlusIcon className="w-4 h-4" />
            Create a connection
          </Button>
        </SectionHeader>

        <div className="empty-state">
          <p className="empty-state-message">
            You haven&apos;t created any connections yet.
          </p>
        </div>
      </Section>
    </div>
  );
};

const View: React.FC = () => {
  const { loading, error } = useValidDeveloperLicenses();

  return (
    <QueryPageWrapper
      loading={loading}
      error={error}
      customErrorMessage={'There was a problem fetching your Developer Licenses'}
    >
      <MainComponent />
    </QueryPageWrapper>
  );
};

export default View;
