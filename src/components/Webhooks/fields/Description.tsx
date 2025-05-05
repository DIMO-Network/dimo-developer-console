import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookDescriptionField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  return (
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
  );
};
