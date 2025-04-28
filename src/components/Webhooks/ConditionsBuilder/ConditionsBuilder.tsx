import { Section, SectionHeader } from '@/components/Section';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export const ConditionsBuilder = () => {
  const { control, register, getValues } = useForm<{
    operator: string;
    conditions: { field: string; operator: string; value: string }[];
  }>({
    defaultValues: {
      operator: 'and',
      conditions: [{ field: '', operator: '', value: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'conditions',
  });
  return (
    <Section>
      <SectionHeader title={'Build the conditions'} />
      <div className={'flex flex-col gap-4'}>
        <div className={'flex flex-row items-center gap-2.5'}>
          <SelectField
            {...register('operator')}
            options={[
              { text: 'All', value: 'and' },
              { text: 'At least one', value: 'or' },
            ]}
            value={getValues('operator')}
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

const ConditionRow = ({ index, control, register, remove }) => {
  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <SelectField
        {...register(`conditions.${index}.field`)}
        options={[
          { text: 'Field 1', value: 'field1' },
          { text: 'Field 2', value: 'field2' },
        ]}
        control={control}
        placeholder={'Select attribute'}
      />
      <SelectField
        {...register(`conditions.${index}.operator`)}
        options={[
          { text: 'equals', value: '==' },
          { text: 'is greater than', value: '>' },
          { text: 'is less than', value: '<' },
        ]}
        control={control}
        placeholder={'Select operator'}
      />
      <TextField {...register(`conditions.${index}.value`)} placeholder="value" />
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
