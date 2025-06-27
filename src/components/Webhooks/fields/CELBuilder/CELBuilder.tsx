import { Section, SectionHeader } from '@/components/Section';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { WebhookTriggerBuilderRow } from '@/components/Webhooks/fields/CELBuilder/ConditionRow';
import { WebhookTriggerPreview } from '@/components/Webhooks/fields/CELBuilder/WebhookTriggerPreview';

export const CELBuilder = () => {
  const { control, getValues } = useFormContext<WebhookFormInput>();

  const { fields } = useFieldArray({
    control,
    name: 'cel.conditions',
  });

  return (
    <Section>
      <SectionHeader title={'Build the conditions'} />
      <div className={'flex flex-col gap-4'}>
        {fields.map((field, index) => (
          <WebhookTriggerBuilderRow index={index} key={field.id} />
        ))}
        <WebhookTriggerPreview cel={getValues().cel} />
      </div>
    </Section>
  );
};
