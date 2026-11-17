import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import isURL from 'validator/lib/isURL';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import React from 'react';

export const WebhookTargetUriField = () => {
  const t = useTranslations('common');
  const {
    register,
    formState: { errors },
  } = useFormContext<WebhookFormInput>();

  const validateUrl = (str: string) => {
    if (!str || str.trim() === '') return t('webhooks.fields.targetUrl.invalid');
    const isValid = isURL(str, {
      require_protocol: true,
      require_tld: false,
      protocols: ['http', 'https'],
      allow_protocol_relative_urls: false,
    });
    return isValid ? true : t('webhooks.fields.targetUrl.needsProtocol');
  };

  return (
    <div className="flex flex-col gap-2">
      <Label>{t('webhooks.fields.targetUrl.label')}</Label>
      <TextField
        {...register('targetURL', {
          required: t('webhooks.fields.targetUrl.invalid'),
          validate: validateUrl,
        })}
        placeholder={t('webhooks.fields.targetUrl.placeholder')}
      />
      <p className="text-body-sm text-muted">{t('webhooks.fields.targetUrl.hint')}</p>
      {errors.targetURL && (
        <TextError
          errorMessage={
            typeof errors.targetURL.message === 'string' ? errors.targetURL.message : ''
          }
        />
      )}
    </div>
  );
};
