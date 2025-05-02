import { Toggle } from '@/components/Toggle';
import { useFormContext, Controller } from 'react-hook-form';
import { Title } from '@/components/Title';
import { WebhookFormInput } from '@/types/webhook';
import { Section } from '@/components/Section';
import { CSVUpload } from '@/components/CSVUpload';
import { useState } from 'react';

export const WebhookSubscribeVehiclesStep = () => {
  const { control, watch } = useFormContext<WebhookFormInput>();
  const allVehicles = watch('subscribe.allVehicles');
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
              <p className={'text-sm'}>Subscribe all new and existing vehicles</p>
            </div>
          </>
        )}
      />
      {!allVehicles && (
        <Section>
          <div>
            <Controller
              name="subscribe.vehicleTokenIds"
              control={control}
              defaultValue={[]}
              render={({ field: { onChange, value } }) => (
                <CSVUpload
                  value={Array.isArray(value) ? value : []}
                  onChange={onChange}
                  fileInfo={fileInfo}
                  onMetadataChange={setFileInfo}
                />
              )}
            />
          </div>
        </Section>
      )}
    </>
  );
};
