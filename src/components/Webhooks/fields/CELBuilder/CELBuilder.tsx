import { useTranslations } from 'next-intl';
import { Section, SectionHeader } from '@/components/Section';
import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { WebhookTriggerBuilderRow } from '@/components/Webhooks/fields/CELBuilder/ConditionRow';
import { WebhookTriggerPreview } from '@/components/Webhooks/fields/CELBuilder/WebhookTriggerPreview';
import { EventNameSelector } from '@/components/Webhooks/fields/CELBuilder/EventNameSelector';
import { isEventService } from '@/utils/webhook';

export const CELBuilder = () => {
  const t = useTranslations('common');
  const { control, getValues, watch } = useFormContext<WebhookFormInput>();
  const service = watch('service');

  const { fields } = useFieldArray({
    control,
    name: 'cel.conditions',
  });

  if (isEventService(service)) {
    return (
      <Section>
        <SectionHeader title={t('webhooks.celBuilder.selectEvent')} />
        <EventNameSelector service={service} />
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader title={t('webhooks.celBuilder.buildConditions')} />
      <div className={'flex flex-col gap-4'}>
        {fields.map((field, index) => (
          <WebhookTriggerBuilderRow index={index} key={field.id} />
        ))}
        <WebhookTriggerPreview cel={getValues().cel} />
      </div>
    </Section>
  );
};
