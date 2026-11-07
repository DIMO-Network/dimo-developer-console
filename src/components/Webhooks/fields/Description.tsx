import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookDescriptionField = () => {
  const t = useTranslations('common');
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>{t('webhooks.fields.description.label')}</Label>
      <TextField
        {...register('description', {
          required: t('webhooks.fields.description.required'),
        })}
        placeholder={t('webhooks.fields.description.placeholder')}
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
