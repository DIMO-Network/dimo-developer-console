import { Toggle } from '@/components/Toggle';
import { useFormContext, Controller } from 'react-hook-form';
import { Title } from '@/components/Title';
import { WebhookFormInput } from '@/types/webhook';
import { Section } from '@/components/Section';
import { CSVUpload } from '@/components/CSVUpload';
import { useState } from 'react';

export const WebhookSubscribeVehiclesStep = () => {
  const { control, watch, setValue } = useFormContext<WebhookFormInput>();
  const allVehicles = watch('subscribe.allVehicles');
  const [vehicleTokenIds, setVehicleTokenIds] = useState<string[]>([]);
  const [fileInfo, setFileInfo] = useState<{ name: string; count: number }[]>([]);

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
            <CSVUpload
              vehicleTokenIds={vehicleTokenIds}
              onChange={setVehicleTokenIds}
              fileInfo={fileInfo}
              onMetadataChange={setFileInfo}
              onFileUpload={(file) => {
                setValue('subscribe.file', file);
              }}
            />
          </div>
        </Section>
      )}
    </>
  );
};
