import { useFormContext } from 'react-hook-form';
import { WebhookFormInput } from '@/types/webhook';
import React, { useEffect } from 'react';
import { SelectWithChevron } from '@/components/Webhooks/fields/CELBuilder/SelectWithChevron';
import { Button } from '@/components/Button';
import { TrashIcon } from '@heroicons/react/24/outline';
import { conditionsConfig } from '@/utils/webhook';

interface ConditionRowProps {
  index: number;
  remove: (index: number) => void;
}

export const ConditionRow = ({ index, remove }: ConditionRowProps) => {
  const { register, setValue, watch, resetField, trigger } =
    useFormContext<WebhookFormInput>();
  const selectedField = watch(`cel.conditions.${index}.field`);
  const config =
    conditionsConfig.find((c) => c.field === selectedField) || conditionsConfig[0];

  const prevFieldRef = React.useRef<string | undefined>();
  useEffect(() => {
    const prevField = prevFieldRef.current;
    if (prevField !== undefined && prevField !== selectedField) {
      setValue(`cel.conditions.${index}.operator`, '==');
      resetField(`cel.conditions.${index}.value`, { defaultValue: '' });
      trigger(`cel.conditions.${index}.value`);
    }
    prevFieldRef.current = selectedField;
  }, [selectedField, index, setValue, resetField, trigger]);

  const operatorOptions =
    config.inputType === 'number'
      ? [
          { label: 'is equal to', value: '==' },
          { label: 'is greater than', value: '>' },
          { label: 'is less than', value: '<' },
        ]
      : [{ label: 'is equal to', value: '==' }];

  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <SelectWithChevron
        {...register(`cel.conditions.${index}.field`, {
          required: 'Field is required',
        })}
        defaultValue=""
        options={[
          { value: '', label: 'Select attribute', isPlaceholder: true },
          ...conditionsConfig.map((c) => ({ value: c.field, label: c.label })),
        ]}
      />
      <SelectWithChevron
        {...register(`cel.conditions.${index}.operator`, {
          required: 'Operator is required',
        })}
        defaultValue=""
        options={[
          { value: '', label: 'Select operator', isPlaceholder: true },
          ...operatorOptions,
        ]}
      />
      {config?.inputType === 'number' && (
        <div className={'text-field'}>
          <input
            // @ts-expect-error validation type isn't strict enough
            {...register(`cel.conditions.${index}.value`, config.validation)}
            placeholder="Enter a number"
            type="number"
          />
        </div>
      )}
      {config?.inputType === 'boolean' && (
        <SelectWithChevron
          // @ts-expect-error validation type isn't strict enough
          {...register(`cel.conditions.${index}.value`, config.validation)}
          defaultValue=""
          options={[
            { value: '', label: 'Select value', isPlaceholder: true },
            { value: 1, label: 'True' },
            { value: 0, label: 'False' },
          ]}
        />
      )}
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
