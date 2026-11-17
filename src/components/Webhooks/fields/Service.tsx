import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import React, { useEffect, useRef } from 'react';

export const WebhookServiceField = () => {
  const t = useTranslations('common');
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useFormContext<WebhookFormInput>();

  const service = watch('service');
  const prevServiceRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prev = prevServiceRef.current;
    if (prev !== undefined && prev !== service) {
      setValue('cel.conditions', [{ field: '', operator: '', value: '' }]);
    }
    prevServiceRef.current = service;
  }, [service, setValue]);

  return (
    <div className={'flex flex-col gap-2.5'}>
      <Label>{t('webhooks.fields.service.label')}</Label>
      <SelectField
        value={getValues('service')}
        placeholder={t('webhooks.fields.service.placeholder')}
        name="service"
        rules={{ required: t('webhooks.fields.service.required') }}
        options={[
          { value: 'signals', text: t('webhooks.service.signals') },
          { value: 'events', text: t('webhooks.service.events') },
        ]}
        control={control}
      />
      {errors.service && (
        <TextError errorMessage={(errors.service.message as string) ?? ''} />
      )}
    </div>
  );
};
