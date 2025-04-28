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
  const { control, register, getValues } = useFormContext<WebhookCreateInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cel.conditions',
  });
  return (
    <Section>
      <SectionHeader title={'Build the conditions'} />
      <div className={'flex flex-col gap-4'}>
        <div className={'flex flex-row items-center gap-2.5'}>
          <SelectField
            {...register('cel.operator')}
            options={[
              { text: 'All', value: 'and' },
              { text: 'At least one', value: 'or' },
            ]}
            value={getValues('cel.operator')}
            className={'min-w-[120px]'}
            control={control}
          />
          <Label>of the following conditions match</Label>
        </div>
        {fields.map((field, index) => (
          <ConditionRow
            index={index}
            key={field.id}
            control={control}
            register={register}
            remove={remove}
          />
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
}

const ConditionRow = ({ index, control, register, remove }: ConditionRowProps) => {
  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <SelectField
        {...register(`cel.conditions.${index}.field`)}
        options={[
          { text: 'Field 1', value: 'field1' },
          { text: 'Field 2', value: 'field2' },
        ]}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select attribute'}
      />
      <SelectField
        {...register(`cel.conditions.${index}.operator`)}
        options={[
          { text: 'is equal to', value: '==' },
          { text: 'is greater than', value: '>' },
          { text: 'is less than', value: '<' },
        ]}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select operator'}
      />
      <TextField {...register(`cel.conditions.${index}.value`)} placeholder="value" />
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
