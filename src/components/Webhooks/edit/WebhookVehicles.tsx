import { useTranslations } from 'next-intl';
import { Label } from '@/components/Label';
import React, { FC } from 'react';
import { useWebhookVehiclesById } from '@/hooks/queries/useWebhookVehiclesById';
import { BubbleLoader } from '@/components/BubbleLoader';
import { EditIcon } from '@/components/Icons';
import { useFormContext } from 'react-hook-form';
import { EditWebhookFormState, WebhookFormInput } from '@/types/webhook';
import { toast } from 'sonner';
import { useEditWebhookContext } from '@/hoc/EditWebhookProvider';

interface Props {
  clientId: string;
  webhookId: string;
}

export const WebhookVehicles: FC<Props> = ({ clientId, webhookId }) => {
  const t = useTranslations('common');
  const {
    formState: { isDirty },
  } = useFormContext<WebhookFormInput>();
  const { setFormState } = useEditWebhookContext();
  const { data, isLoading, error } = useWebhookVehiclesById({
    clientId,
    webhookId: webhookId,
  });

  const goToSubscribedVehicles = () => {
    if (isDirty) {
      return toast.error(t('webhooks.edit.saveFirst'));
    }
    setFormState(EditWebhookFormState.SUBSCRIBE_VEHICLES);
  };

  const errorMsg = error ? t('webhooks.edit.vehiclesFetchError') : undefined;

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>{t('webhooks.edit.subscribedVehicles')}</Label>
      <div className={'h-14 bg-control flex items-center px-4 rounded-control'}>
        <WebhookVehiclesNumber
          isLoading={isLoading}
          error={errorMsg}
          numVehicles={data?.length ?? 0}
          onEdit={goToSubscribedVehicles}
        />
      </div>
    </div>
  );
};

const WebhookVehiclesNumber: FC<{
  isLoading: boolean;
  error?: string;
  numVehicles: number;
  onEdit: () => void;
}> = ({ isLoading, error, numVehicles, onEdit }) => {
  const t = useTranslations('common');
  if (isLoading) {
    return <BubbleLoader isLoading isSmall />;
  }
  if (error) {
    return <p>{error}</p>;
  }
  return (
    <div className={'flex flex-1 justify-between'}>
      <p className={'text-body-sm text-fg'}>
        {t('webhooks.edit.vehicleCount', { count: numVehicles })}
      </p>
      <button onClick={onEdit} type={'button'} className={'text-muted hover:text-ink'}>
        <EditIcon />
      </button>
    </div>
  );
};
