import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookVerificationTokenField = () => {
  const t = useTranslations('common');
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('webhooks.fields.verification.label')}</Label>
      <TextField
        className="font-mono text-code"
        {...register('verificationToken', {
          required: t('webhooks.fields.verification.required'),
        })}
        placeholder={t('webhooks.fields.verification.placeholder')}
      />
      <p className="text-body-sm text-muted">{t('webhooks.fields.verification.hint')}</p>
      {errors.verificationToken && (
        <TextError
          errorMessage={
            typeof errors.verificationToken.message === 'string'
              ? errors.verificationToken.message
              : ''
          }
        />
      )}
    </div>
  );
};
