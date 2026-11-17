import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { useFindTriggerConfig } from '@/components/Webhooks/hooks/useFindTriggerConfig';
import { SelectField } from '@/components/SelectField';
import React from 'react';

export const ValueInput = ({ index }: { index: number }) => {
  const t = useTranslations('common');
  const { register, control } = useFormContext<WebhookFormInput>();
  const booleanValueOptions = [
    { value: '1', text: t('webhooks.celBuilder.true') },
    { value: '0', text: t('webhooks.celBuilder.false') },
  ];
  const config = useFindTriggerConfig(index);

  if (config.inputType === 'number') {
    // @ts-expect-error validation type isn't strict enough
    const registerReturn = register(`cel.conditions.${index}.value`, config.validation);
    return (
      <div className={'text-field'}>
        <input
          {...registerReturn}
          placeholder={t('webhooks.celBuilder.enterNumber')}
          type="number"
        />
      </div>
    );
  }
  // Not registered here as well: SelectField's Controller would drop these rules.
  return (
    <SelectField
      name={`cel.conditions.${index}.value`}
      // @ts-expect-error validation type isn't strict enough
      rules={config.validation}
      control={control}
      options={booleanValueOptions}
      placeholder={t('webhooks.celBuilder.selectValue')}
    />
  );
};
