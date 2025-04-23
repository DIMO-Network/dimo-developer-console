'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { useState } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/components/FormStepTracker';
import { NewWebhookForm } from '@/components/Webhooks/WebhookForm';

export const View = () => {
  const [formStep] = useState(0);
  return (
    <div className={'flex flex-1 flex-row'}>
      <div className={'flex flex-col flex-1'}>
        <NewWebhookForm />
      </div>
      <RightPanel>
        <FormStepTracker curStep={formStep} />
      </RightPanel>
    </div>
  );
};
