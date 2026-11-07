import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useFindTriggerConfig } from '@/components/Webhooks/hooks/useFindTriggerConfig';
import { SelectField } from '@/components/SelectField';
import React from 'react';
import { InputType } from '@/utils/webhook';

const getOperatorOptions = (inputType: InputType, t: (key: string) => string) => {
  const equal = { text: t('webhooks.celBuilder.operators.equal'), value: '==' };
  return inputType === 'number'
    ? [
        equal,
        { text: t('webhooks.celBuilder.operators.greater'), value: '>' },
        { text: t('webhooks.celBuilder.operators.less'), value: '<' },
      ]
    : [equal];
};

export const OperatorSelector = ({ index }: { index: number }) => {
  const t = useTranslations('common');
  const { control } = useFormContext<WebhookFormInput>();
  const config = useFindTriggerConfig(index);
  return (
    <SelectField
      name={`cel.conditions.${index}.operator`}
      control={control}
      options={getOperatorOptions(config.inputType, t)}
      placeholder={t('webhooks.celBuilder.selectOperator')}
    />
  );
};
