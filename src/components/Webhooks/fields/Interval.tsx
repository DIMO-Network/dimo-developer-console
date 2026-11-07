import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookCooldownField = () => {
  const t = useTranslations('common');
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  const validateCooldown = (value: number) => {
    if (value === undefined || value === null) {
      return t('webhooks.fields.cooldown.required');
    }
    if (isNaN(value)) {
      return t('webhooks.fields.cooldown.invalidNumber');
    }
    if (value < 0) {
      return t('webhooks.fields.cooldown.negative');
    }
    if (value > 86400) {
      return t('webhooks.fields.cooldown.tooLong');
    }
    return true;
  };

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>{t('webhooks.fields.cooldown.label')}</Label>
      <TextField
        type="number"
        min="0"
        max="86400"
        {...register('coolDownPeriod', {
          required: t('webhooks.fields.cooldown.required'),
          validate: validateCooldown,
          valueAsNumber: true,
        })}
        placeholder={t('webhooks.fields.cooldown.placeholder')}
      />
      <p className="text-body-sm text-muted">{t('webhooks.fields.cooldown.hint')}</p>
      {errors.coolDownPeriod && (
        <TextError errorMessage={(errors.coolDownPeriod.message as string) ?? ''} />
      )}
    </div>
  );
};
