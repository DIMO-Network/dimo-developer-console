import { useTranslations } from 'next-intl';
import { Toggle } from '@/components/Toggle';
import { useFormContext, Controller } from 'react-hook-form';
import { Title } from '@/components/Title';
import { WebhookFormInput } from '@/types/webhook';
import { Section } from '@/components/Section';
import { AssetDIDsInput } from '@/components/AssetDIDsInput';
import { useState } from 'react';

export const WebhookSubscribeVehiclesStep = () => {
  const t = useTranslations('common');
  const { control, watch, setValue } = useFormContext<WebhookFormInput>();
  const allVehicles = watch('subscribe.allVehicles');
  const [assetDIDs, setAssetDIDs] = useState<string[]>([]);

  const handleAssetDIDsChange = (assetDIDs: string[]) => {
    setAssetDIDs(assetDIDs);
    setValue('subscribe.assetDIDs', assetDIDs);
  };

  return (
    <>
      <Controller
        name="subscribe.allVehicles"
        control={control}
        defaultValue={true}
        render={({ field }) => (
          <>
            <Title className={'text-card-title'}>
              {t('webhooks.fields.subscribe.question')}
            </Title>
            <div className={'flex flex-row gap-2.5 items-center'}>
              <Toggle checked={field.value} onToggle={field.onChange} />
              <p className={'text-body-sm text-fg'}>
                {t('webhooks.fields.subscribe.all')}
              </p>
            </div>
          </>
        )}
      />
      {!allVehicles && (
        <Section>
          <div>
            <AssetDIDsInput
              assetDIDs={assetDIDs}
              onChange={handleAssetDIDsChange}
              label={t('webhooks.fields.subscribe.specificLabel')}
              placeholder={t('webhooks.fields.subscribe.specificPlaceholder')}
            />
          </div>
        </Section>
      )}
    </>
  );
};
