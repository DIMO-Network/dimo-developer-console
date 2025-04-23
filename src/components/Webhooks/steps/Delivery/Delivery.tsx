import React, { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';

export const WebhookDeliveryStep: FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  return (
    <div className={'flex flex-col gap-2'}>
      <Label>Webhook URL</Label>
      <TextField
        {...register('target_uri', {
          required: 'Please enter a valid URL',
        })}
        placeholder="Enter the URL where you want to receive events"
      />
      <p className={'text-[#868888]'}>
        Enter a public, SSL-enabled URL where you will receive events
      </p>
      {errors.name && (
        <TextError
          errorMessage={
            typeof errors.name.message === 'string' ? errors.name.message : ''
          }
        />
      )}
    </div>
  );
};
