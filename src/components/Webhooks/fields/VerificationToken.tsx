import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookVerificationTokenField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  return (
    <div className="flex flex-col gap-2">
      <Label>Verification Token</Label>
      <TextField
        {...register('verification_token', {
          required: 'Please enter a valid string',
        })}
        placeholder="Enter a verification token"
      />
      <p className="text-[#868888]">
        Please enter a string that you will use as your verification token. The above URL
        must return this as a plain/text string.
      </p>
      {errors.verification_token && (
        <TextError
          errorMessage={
            typeof errors.verification_token.message === 'string'
              ? errors.verification_token.message
              : ''
          }
        />
      )}
    </div>
  );
};
