import { Section, SectionHeader } from '@/components/Section';
import React from 'react';
import { useFieldArray, Control, UseFormRegister, useFormContext } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { WebhookCreateInput } from '@/types/webhook';

export const ConditionsBuilder = () => {
  const { control, register, getValues, watch } = useFormContext<WebhookCreateInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cel.conditions',
  });

  const handleRemove = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <Section>
      <SectionHeader title={'Build the conditions'} />
      <div className={'flex flex-col gap-4'}>
        <div className={'flex flex-row items-center gap-2.5'}>
          <SelectField
            {...register('cel.operator', { required: 'Operator is required' })}
            options={[
              { text: 'All', value: 'AND' },
              { text: 'At least one', value: 'OR' },
            ]}
            value={getValues('cel.operator')}
            className={'min-w-[120px]'}
            control={control}
          />
          <Label>of the following conditions match</Label>
        </div>
        {fields.map((field, index) => (
          <React.Fragment key={field.id}>
            <ConditionRow
              index={index}
              control={control}
              register={register}
              getValues={getValues}
              remove={handleRemove}
            />
            {index < fields.length - 1 && (
              <div
                className={
                  'bg-cta-default rounded-lg py-2 px-4 self-start border border-border-disabled'
                }
              >
                <p className={'text-text-secondary'}>
                  {watch('cel.operator') === 'and' ? 'And' : 'Or'}
                </p>
              </div>
            )}
          </React.Fragment>
        ))}
        <Button
          type="button"
          onClick={() => append({ field: '', operator: '', value: '' })}
          className="self-start"
        >
          <PlusIcon className="w-5 h-5" />
          Add Condition
        </Button>
      </div>
    </Section>
  );
};

interface ConditionRowProps {
  index: number;
  control: Control<WebhookCreateInput>;
  register: UseFormRegister<WebhookCreateInput>;
  remove: (index: number) => void;
  getValues: ReturnType<typeof useFormContext<WebhookCreateInput>>['getValues'];
}

const ConditionRow = ({
  index,
  control,
  register,
  remove,
  getValues,
}: ConditionRowProps) => {
  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <SelectField
        {...register(`cel.conditions.${index}.field`, { required: 'Field is required' })}
        options={[
          { text: 'Field 1', value: 'field1' },
          { text: 'Field 2', value: 'field2' },
        ]}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select attribute'}
        value={getValues(`cel.conditions.${index}.field`)}
      />
      <SelectField
        {...register(`cel.conditions.${index}.operator`, {
          required: 'Operator is required',
        })}
        options={[
          { text: 'is equal to', value: '==' },
          { text: 'is greater than', value: '>' },
          { text: 'is less than', value: '<' },
        ]}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select operator'}
        value={getValues(`cel.conditions.${index}.operator`)}
      />
      <TextField
        {...register(`cel.conditions.${index}.value`, {
          required: 'Value is required',
          validate: (value) => !isNaN(Number(value)) || 'Value must be a number',
        })}
        placeholder="value"
      />
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
