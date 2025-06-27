import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import React, { useEffect } from 'react';
import { ValueInput } from '@/components/Webhooks/fields/CELBuilder/ValueInput';
import { OperatorSelector } from '@/components/Webhooks/fields/CELBuilder/OperatorSelector';
import { DataAttributeSelector } from '@/components/Webhooks/fields/CELBuilder/DataAttributeSelector';

interface ConditionRowProps {
  index: number;
}

export const WebhookTriggerBuilderRow = ({ index }: ConditionRowProps) => {
  const { setValue, watch, resetField, trigger } = useFormContext<WebhookFormInput>();
  const prevFieldRef = React.useRef<string | undefined>();
  const selectedField = watch(`cel.conditions.${index}.field`);

  useEffect(() => {
    const prevField = prevFieldRef.current;
    if (prevField !== undefined && prevField !== selectedField) {
      setValue(`cel.conditions.${index}.operator`, '==');
      resetField(`cel.conditions.${index}.value`, { defaultValue: '' });
      trigger(`cel.conditions.${index}.value`);
    }
    prevFieldRef.current = selectedField;
  }, [selectedField, index, setValue, resetField, trigger]);

  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <DataAttributeSelector index={index} />
      <OperatorSelector index={index} />
      <ValueInput index={index} />
    </div>
  );
};
