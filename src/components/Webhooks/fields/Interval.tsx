import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookIntervalField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  const validateCooldown = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Please enter a cooldown period in seconds';
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    if (numValue < 0) {
      return 'Cooldown must be 0 or greater';
    }
    if (numValue > 86400) {
      return 'Cooldown cannot exceed 86400 seconds (24 hours)';
    }
    return true;
  };

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>Cooldown</Label>
      <TextField
        type="number"
        min="0"
        max="86400"
        {...register('setup', {
          required: 'Please enter a cooldown period in seconds',
          validate: validateCooldown,
        })}
        placeholder="Enter cooldown period in seconds (e.g., 30)"
      />
      <p className="text-[#868888] text-sm">
        Minimum time between webhook calls for the same event (0 for realtime)
      </p>
      {errors.setup && (
        <TextError errorMessage={(errors.setup.message as string) ?? ''} />
      )}
    </div>
  );
};
