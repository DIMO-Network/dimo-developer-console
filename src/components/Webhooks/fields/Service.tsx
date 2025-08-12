import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookServiceField = () => {
  const {
    register,
    control,
    formState: { errors },
    getValues,
  } = useFormContext<WebhookFormInput>();

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Service</Label>
      <SelectField
        value={getValues('service')}
        placeholder={'Choose a service'}
        {...register('service', {
          required: 'Please select a webhook service',
        })}
        options={[{ value: 'telemetry.signals', text: 'Telemetry – Signals' }]}
        control={control}
      />
      {errors.service && (
        <TextError errorMessage={(errors.service.message as string) ?? ''} />
      )}
    </div>
  );
};
