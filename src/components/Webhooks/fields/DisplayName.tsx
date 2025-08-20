import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookDisplayNameField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Display Name</Label>
      <TextField
        {...register('displayName')}
        placeholder="Enter a display name for your webhook (optional)"
      />
      {errors.displayName && (
        <TextError
          errorMessage={
            typeof errors.displayName.message === 'string'
              ? errors.displayName.message
              : ''
          }
        />
      )}
    </div>
  );
};
