import { Section, SectionHeader } from '@/components/Section';
import React, { useContext, useState, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { WebhookCreateInput } from '@/types/webhook';
import { generateCEL } from '@/services/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { capitalize } from 'lodash';
import { conditionConfig } from '@/components/Webhooks/steps/Configuration/CELBuilder/constants';

export const CELBuilder = () => {
  const { control, register, getValues, watch } = useFormContext<WebhookCreateInput>();
  const { setNotification } = useContext(NotificationContext);
  const [cel, setCel] = useState('');
  const [loadingCel, setLoadingCel] = useState<boolean>(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'cel.conditions',
  });

  const handleSave = async () => {
    const { cel } = getValues();
    const hasInvalidCondition = cel.conditions.some(
      (cond) => !cond.field || !cond.operator || !cond.value,
    );
    if (!cel.operator || hasInvalidCondition) {
      setNotification('Please complete all condition fields before saving.', '', 'error');
      return;
    }
    try {
      setLoadingCel(true);
      const transformedConditions = cel.conditions.map((cond) => {
        const fieldConfig = conditionConfig.find((c) => c.field === cond.field);
        if (fieldConfig?.multiFields?.length) {
          return {
            logic: 'OR',
            conditions: fieldConfig.multiFields.map((f) => ({
              field: f,
              operator: cond.operator,
              value: cond.value,
            })),
          };
        }
        return {
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
        };
      });
      console.log('TRANSFORMED CONDITIONS', transformedConditions);
      const response = await generateCEL({
        conditions: transformedConditions,
        logic: cel.operator,
      });
      console.log('response', response);
      setCel(response);
    } catch {
      setNotification('Failed to generate CEL', '', 'error');
    } finally {
      setLoadingCel(false);
    }
  };

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
            <ConditionRow index={index} remove={handleRemove} />
            {index < fields.length - 1 && (
              <div
                className={
                  'bg-cta-default rounded-lg py-2 px-4 self-start border border-border-disabled'
                }
              >
                <p className={'text-text-secondary'}>
                  {capitalize(watch('cel.operator'))}
                </p>
              </div>
            )}
          </React.Fragment>
        ))}
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            onClick={handleSave}
            className="self-start primary-outline"
            loading={loadingCel}
          >
            Generate CEL
          </Button>
          <Button
            type="button"
            onClick={() => append({ field: '', operator: '', value: '' })}
            className="self-start"
          >
            <PlusIcon className="w-5 h-5" />
            Add Condition
          </Button>
        </div>
        {!!cel && (
          <div className={'bg-surface-default py-2 px-3 rounded-xl'}>
            <p className={'text-text-secondary'}>{cel}</p>
          </div>
        )}
      </div>
    </Section>
  );
};

interface ConditionRowProps {
  index: number;
  remove: (index: number) => void;
}

const ConditionRow = ({ index, remove }: ConditionRowProps) => {
  const { control, register, getValues, setValue, watch } =
    useFormContext<WebhookCreateInput>();

  // Get the selected field to determine config
  const selectedField = watch(`cel.conditions.${index}.field`);
  const config =
    conditionConfig.find((c) => c.field === selectedField) || conditionConfig[0];

  useEffect(() => {
    setValue(`cel.conditions.${index}.operator`, '==');
    setValue(`cel.conditions.${index}.value`, '');
  }, [selectedField, index, setValue]);

  const operatorOptions =
    config.inputType === 'number'
      ? [
          { text: 'is equal to', value: '==' },
          { text: 'is greater than', value: '>' },
          { text: 'is less than', value: '<' },
        ]
      : [{ text: 'is equal to', value: '==' }];

  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <SelectField
        {...register(`cel.conditions.${index}.field`, { required: 'Field is required' })}
        options={conditionConfig.map((c) => ({
          text: c.label,
          value: c.field,
        }))}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select attribute'}
        value={getValues(`cel.conditions.${index}.field`)}
      />
      <SelectField
        key={`operator-${index}-${selectedField}`}
        {...register(`cel.conditions.${index}.operator`, {
          required: 'Operator is required',
        })}
        options={operatorOptions}
        control={control}
        className={'min-w-[120px]'}
        placeholder={'Select operator'}
        value={watch(`cel.conditions.${index}.operator`)}
      />
      {/* Render input based on config.inputType */}
      {config?.inputType === 'number' && (
        <TextField
          {...register(`cel.conditions.${index}.value`, config.validation)}
          placeholder="value"
        />
      )}
      {config?.inputType === 'boolean' && (
        <SelectField
          key={`value-${index}-${selectedField}`}
          {...register(`cel.conditions.${index}.value`, config.validation)}
          options={[
            { value: 'true', text: 'True' },
            { value: 'false', text: 'False' },
          ]}
          control={control}
          className="min-w-[120px]"
          placeholder="Select value"
          value={watch(`cel.conditions.${index}.operator`)}
        />
      )}
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
