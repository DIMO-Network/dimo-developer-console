import { useTranslations } from 'next-intl';
import { EditWebhookFormState, Webhook } from '@/types/webhook';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';
import { BackButton as BasicBackButton } from '@/components/BackButton';
import { SubscribedVehicles } from '@/components/Webhooks/edit/SubscribedVehicles';
import React from 'react';

export const WebhookVehiclesPage = ({
  webhook,
  clientId,
}: {
  webhook: Webhook;
  clientId: string;
}) => {
  const { setFormState } = useEditWebhookContext();

  const onBack = () => {
    setFormState(EditWebhookFormState.EDIT_FORM);
  };

  return (
    <div className="flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <SubscribedVehicles webhookId={webhook.id.trim()} clientId={clientId} />
    </div>
  );
};

const BackButton = ({ onBack }: { onBack: () => void }) => {
  const t = useTranslations('common');
  return (
    <div className="flex items-center gap-2">
      <BasicBackButton onBack={onBack} />
      {t('webhooks.edit.title')}
    </div>
  );
};
