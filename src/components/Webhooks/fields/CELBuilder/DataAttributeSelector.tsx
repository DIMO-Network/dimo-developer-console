import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { SelectField } from '@/components/SelectField';
import React from 'react';
import { conditionsConfig } from '@/utils/webhook';

export const DataAttributeSelector = ({ index }: { index: number }) => {
  const t = useTranslations('common');
  const { control } = useFormContext<WebhookFormInput>();
  const dataAttributeOptions = conditionsConfig.map((c) => ({
    value: c.field,
    text: t(c.labelKey),
  }));
  return (
    <SelectField
      name={`cel.conditions.${index}.field`}
      control={control}
      options={dataAttributeOptions}
      placeholder={t('webhooks.celBuilder.selectAttribute')}
    />
  );
};
