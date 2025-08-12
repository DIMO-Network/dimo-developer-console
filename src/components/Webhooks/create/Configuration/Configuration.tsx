import React, { FC } from 'react';
import { CELBuilder } from '../../fields/CELBuilder';
import { WebhookDescriptionField } from '@/components/Webhooks/fields/Description';
import { WebhookDisplayNameField } from '@/components/Webhooks/fields/DisplayName';
import { WebhookCooldownField } from '@/components/Webhooks/fields/Interval';
import { WebhookServiceField } from '@/components/Webhooks/fields/Service';

export const WebhookConfigStep: FC = () => {
  return (
    <>
      <WebhookDescriptionField />
      <WebhookDisplayNameField />
      <WebhookServiceField />
      <CELBuilder />
      <WebhookCooldownField />
    </>
  );
};
