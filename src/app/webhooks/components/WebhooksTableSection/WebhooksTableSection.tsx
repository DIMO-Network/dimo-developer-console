import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import Button from '@/components/Button/Button';
import { WebhookTable } from '@/components/Webhooks/WebhookTable';
import React from 'react';

export const WebhooksSection = ({ clientId }: { clientId: string }) => {
  return (
    <Section>
      <SectionHeader title={'Webhooks'}>
        <Link href={`/webhooks/create/${clientId}`}>
          <Button className="dark with-icon">+ Create a webhook</Button>
        </Link>
      </SectionHeader>
      <WebhookTable clientId={clientId} />
    </Section>
  );
};
