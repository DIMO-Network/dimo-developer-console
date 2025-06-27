import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import { conditionsConfig } from '@/utils/webhook';

const findConditionConfig = (field: string) =>
  conditionsConfig.find((condition) => condition.field === field) ?? conditionsConfig[0];

export const useTriggerBuilderConfig = (index: number) => {
  const { watch } = useFormContext<WebhookFormInput>();
  const selectedField = watch(`cel.conditions.${index}.field`);
  return findConditionConfig(selectedField);
};
