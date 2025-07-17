'use client';
import React from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { Section } from '@/components/Section';
import { SectionHeader } from '@/components/Section/Header';
import { Button } from '@/components/Button';
import { PlusIcon } from '@/components/Icons';

import './View.css';

const View: React.FC = () => {
  const handleCreateConnection = () => {
    // TODO: Navigating to next pg w clientId
    console.log('Clicky');
  };

  return (
    <div className="connections-page">
      <PageSubtitle subtitle="Connection Oracle is an application that performs data streaming from your data source to a DIMO Node." />

      <Section>
        <SectionHeader title="Connections">
          <Button className="dark with-icon" onClick={handleCreateConnection}>
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

export default View;
