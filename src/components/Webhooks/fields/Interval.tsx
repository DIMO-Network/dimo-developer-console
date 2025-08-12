import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookCooldownField = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  const validateCooldown = (value: number) => {
    if (value === undefined || value === null) {
      return 'Please enter a cooldown period in seconds';
    }
    if (isNaN(value)) {
      return 'Please enter a valid number';
    }
    if (value < 0) {
      return 'Cooldown must be 0 or greater';
    }
    if (value > 86400) {
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
        {...register('coolDownPeriod', {
          required: 'Please enter a cooldown period in seconds',
          validate: validateCooldown,
          valueAsNumber: true,
        })}
        placeholder="Enter cooldown period in seconds (e.g., 30)"
      />
      <p className="text-[#868888] text-sm">
        Minimum time between webhook calls for the same event (0 for realtime)
      </p>
      {errors.coolDownPeriod && (
        <TextError errorMessage={(errors.coolDownPeriod.message as string) ?? ''} />
      )}
    </div>
  );
};
