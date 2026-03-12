import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { isURL } from 'validator';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookTargetUriField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  const validateUrl = (str: string) => {
    if (!str || str.trim() === '') return 'Please enter a valid URL';
    const isValid = isURL(str, {
      require_protocol: true,
      require_tld: false,
      protocols: ['http', 'https'],
      allow_protocol_relative_urls: false,
    });
    return isValid ? true : 'Please enter a valid URL, must include http:// or https://';
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>Webhook URL</Label>
      <TextField
        {...register('targetURL', {
          required: 'Please enter a valid URL',
          validate: validateUrl,
        })}
        placeholder="Enter the URL where you want to receive events"
      />
      <p className="text-[#868888]">
        Enter a public, SSL-enabled URL where you will receive events
      </p>
      {errors.targetURL && (
        <TextError
          errorMessage={
            typeof errors.targetURL.message === 'string' ? errors.targetURL.message : ''
          }
        />
      )}
    </div>
  );
};
