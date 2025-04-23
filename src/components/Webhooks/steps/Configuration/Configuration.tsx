import React, { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { Section, SectionHeader } from '@/components/Section';

export const WebhookConfigStep: FC = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  return (
    <>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Webhook name</Label>
        <TextField
          {...register('name', {
            required: 'Please enter a webhook name',
          })}
          placeholder="Enter a webhook name"
        />
        {errors.name && (
          <TextError
            errorMessage={
              typeof errors.name.message === 'string' ? errors.name.message : ''
            }
          />
        )}
      </div>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Service</Label>
        <SelectField
          placeholder={'Choose a service'}
          {...register('service', {
            required: 'Please select a webhook service',
          })}
          options={[
            { value: 'Telemetry', text: 'Telemetry' },
            { value: 'SACD', text: 'SACD' },
          ]}
          control={control}
        />
        {errors.service && (
          <TextError errorMessage={(errors.service.message as string) ?? ''} />
        )}
      </div>
      <Section>
        <SectionHeader title={'Build the conditions'} />
        <p>TODO - implement the CEL builder tool</p>
      </Section>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Interval</Label>
        <SelectField
          placeholder={'Choose an interval'}
          {...register('setup', {
            required: 'Please select a webhook interval',
          })}
          options={[
            { value: 'Realtime', text: 'Realtime' },
            { value: 'Hourly', text: 'Hourly' },
          ]}
          control={control}
        />
        {errors.setup && (
          <TextError errorMessage={(errors.setup.message as string) ?? ''} />
        )}
      </div>
    </>
  );
};
