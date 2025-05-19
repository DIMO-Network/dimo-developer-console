import React, { FC } from 'react';
import { CELBuilder } from '../../fields/CELBuilder';
import { WebhookDescriptionField } from '@/components/Webhooks/fields/Description';
import { WebhookIntervalField } from '@/components/Webhooks/fields/Interval';
import { WebhookServiceField } from '@/components/Webhooks/fields/Service';

export const WebhookConfigStep: FC = () => {
  return (
    <>
      <WebhookDescriptionField />
      <WebhookServiceField />
      <CELBuilder />
      <WebhookIntervalField />
    </>
  );
};
