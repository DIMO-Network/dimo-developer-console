import React, { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { Section, SectionHeader } from '@/components/Section';
import { WebhookCreateInput } from '@/types/webhook';
import { useGlobalAccount } from '@/hooks';
import { useQuery } from '@apollo/client';
import { DEVELOPER_LICENSES_FOR_WEBHOOKS } from '@/components/Webhooks';

export const WebhookConfigStep: FC = () => {
  const {
    register,
    control,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext<WebhookCreateInput>();
  const { currentUser } = useGlobalAccount();
  const { data } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const validDeveloperLicenses = data?.developerLicenses.nodes.filter(
    (it) => !!it.redirectURIs.nodes.length,
  );
  return (
    <>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Dev license</Label>
        <SelectField
          {...register('developerLicense.clientId', {
            required: 'Please choose a Developer License',
            onChange: (e) => {
              const clientId = e.target.value;
              const selected = data?.developerLicenses.nodes.find(
                (l) => l.clientId === clientId,
              );
              if (selected) {
                setValue(
                  'developerLicense.domain',
                  selected.redirectURIs.nodes[0]?.uri ?? '',
                );
              }
            },
          })}
          options={
            validDeveloperLicenses?.map((license) => ({
              text: license.alias ?? license.clientId,
              value: license.clientId,
            })) ?? []
          }
          value={getValues('developerLicense.clientId')}
          control={control}
          placeholder={'Please choose a developer license'}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <Label>API Key</Label>
        <Controller
          name="developerLicense.apiKey"
          control={control}
          rules={{ required: 'Please enter a valid API key' }}
          render={({ field }) => (
            <TextField
              placeholder="Paste your private API key here"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
        />
      </div>
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
