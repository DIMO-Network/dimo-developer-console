import React, { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { WebhookFormInput } from '@/types/webhook';
import { isURL } from 'validator';

const validateUrl = (str: string) => {
  if (!str || str.trim() === '') {
    return 'Please enter a valid URL';
  }

  const isValidUrl = isURL(str, {
    require_protocol: true,
    require_tld: false,
    protocols: ['http', 'https'],
    allow_protocol_relative_urls: false,
  });

  return isValidUrl ? true : 'Please enter a valid URL, must include http:// or https://';
};

export const WebhookDeliveryStep: FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();
  return (
    <div className={'flex flex-col gap-2'}>
      <Label>Webhook URL</Label>
      <TextField
        {...register('target_uri', {
          required: 'Please enter a valid URL',
          validate: validateUrl,
        })}
        placeholder="Enter the URL where you want to receive events"
      />
      <p className={'text-[#868888]'}>
        Enter a public, SSL-enabled URL where you will receive events
      </p>
      {errors.target_uri && (
        <TextError
          errorMessage={
            typeof errors.target_uri.message === 'string' ? errors.target_uri.message : ''
          }
        />
      )}
    </div>
  );
};
