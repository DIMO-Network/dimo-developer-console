import { useTranslations } from 'next-intl';
import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import Button from '@/components/Button/Button';
import { WebhookTable } from '@/components/Webhooks/WebhookTable';
import React from 'react';

export const WebhooksTableSection = ({ clientId }: { clientId: string }) => {
  const t = useTranslations('common');
  return (
    <Section>
      <SectionHeader title={t('webhooks.section.title')}>
        <Link href={`/webhooks/create/${clientId}`}>
          <Button variant="primary">{t('webhooks.section.create')}</Button>
        </Link>
      </SectionHeader>
      <WebhookTable clientId={clientId} />
    </Section>
  );
};
