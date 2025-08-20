import { Toggle } from '@/components/Toggle';
import { useFormContext, Controller } from 'react-hook-form';
import { Title } from '@/components/Title';
import { WebhookFormInput } from '@/types/webhook';
import { Section } from '@/components/Section';
import { AssetDIDsInput } from '@/components/AssetDIDsInput';
import { useState } from 'react';

export const WebhookSubscribeVehiclesStep = () => {
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
            <Title className={'text-xl font-black'}>Who do you want to subscribe?</Title>
            <div className={'flex flex-row gap-2.5 items-center'}>
              <Toggle checked={field.value} onToggle={field.onChange} />
              <p className={'text-sm'}>Subscribe all existing vehicles</p>
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
              label="Select specific vehicles"
              placeholder="Enter the asset DIDs of vehicles you want to subscribe to this webhook"
            />
          </div>
        </Section>
      )}
    </>
  );
};
