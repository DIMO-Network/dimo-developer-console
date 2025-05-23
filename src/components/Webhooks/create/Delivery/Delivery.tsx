import React, { FC } from 'react';
import {
  WebhookTargetUriField,
  WebhookVerificationTokenField,
} from '@/components/Webhooks/fields';

export const WebhookDeliveryStep: FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <WebhookTargetUriField />
      <WebhookVerificationTokenField />
    </div>
  );
};
