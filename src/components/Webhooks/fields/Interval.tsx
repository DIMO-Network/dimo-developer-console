import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookIntervalField = () => {
  const {
    register,
    control,
    formState: { errors },
    getValues,
  } = useFormContext<WebhookFormInput>();

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Interval</Label>
      <SelectField
        value={getValues('setup')}
        placeholder={'Choose an interval'}
        {...register('setup', {
          required: 'Please select a webhook interval',
        })}
        options={[
          { value: 'Realtime', text: 'Realtime' },
          { value: 'Hourly', text: 'Hourly' },
          { value: 'Daily', text: 'Daily' },
        ]}
        control={control}
      />
      {errors.setup && (
        <TextError errorMessage={(errors.setup.message as string) ?? ''} />
      )}
    </div>
  );
};
