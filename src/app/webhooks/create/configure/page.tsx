'use client';

import { NewWebhookForm, WebhookForm } from '@/components/Webhooks/WebhookForm';

const ConfigureWebhookPage = () => {
  return <NewWebhookForm />;
  return (
    <WebhookForm
      currentWebhook={null}
      setCurrentWebhook={() => {}}
      conditions={[]}
      setConditions={() => {}}
      logic={''}
      setLogic={() => {}}
      signalNames={[]}
      generatedCEL={''}
      onSave={() => {}}
      onCancel={() => {}}
    />
  );
};
export default ConfigureWebhookPage;
