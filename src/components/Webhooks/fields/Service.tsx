import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import React, { useEffect, useRef } from 'react';

export const WebhookServiceField = () => {
  const {
    register,
    control,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useFormContext<WebhookFormInput>();

  const service = watch('service');
  const prevServiceRef = useRef<string | undefined>();

  useEffect(() => {
    const prev = prevServiceRef.current;
    if (prev !== undefined && prev !== service) {
      setValue('cel.conditions', [{ field: '', operator: '', value: '' }]);
    }
    prevServiceRef.current = service;
  }, [service, setValue]);

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Service</Label>
      <SelectField
        value={getValues('service')}
        placeholder={'Choose a service'}
        {...register('service', {
          required: 'Please select a webhook service',
        })}
        options={[
          { value: 'signals', text: 'VSS Signals' },
          { value: 'events', text: 'Events' },
        ]}
        control={control}
      />
      {errors.service && (
        <TextError errorMessage={(errors.service.message as string) ?? ''} />
      )}
    </div>
  );
};
