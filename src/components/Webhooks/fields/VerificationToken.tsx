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
        Choose any unique string to verify ownership of your webhook URL. When we send a
        verification request, your server must respond with this exact string in plain
        text. This ensures you control the destination URL.
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
