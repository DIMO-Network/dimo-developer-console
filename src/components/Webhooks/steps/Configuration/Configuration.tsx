import React, { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { Section, SectionHeader } from '@/components/Section';

// TODO - if we go back to this step, how do we handle prepopulating the service / interval fields?
export const WebhookConfigStep: FC = () => {
  const {
    register,
    control,
    formState: { errors },
    getValues,
    watch,
  } = useFormContext();
  const service = watch('service');
  console.log('service', service);
  console.log(getValues('service'));
  return (
    <>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Webhook description</Label>
        <TextField
          {...register('description', {
            required: 'Please enter a webhook description',
          })}
          placeholder="Enter a description for your webhook"
        />
        {errors.description && (
          <TextError
            errorMessage={
              typeof errors.description.message === 'string'
                ? errors.description.message
                : ''
            }
          />
        )}
      </div>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Service</Label>
        <SelectField
          value={getValues('service')}
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
          value={getValues('setup')}
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
