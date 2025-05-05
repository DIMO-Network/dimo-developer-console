import { Section, SectionHeader } from '@/components/Section';
import React, { useContext, useState, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { TrashIcon } from '@heroicons/react/24/outline';
import { WebhookFormInput } from '@/types/webhook';
import { formatAndGenerateCEL } from '@/services/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { capitalize } from 'lodash';
import { conditionsConfig } from '@/components/Webhooks/fields/CELBuilder/constants';

export const CELBuilder = () => {
  const { control, getValues, watch } = useFormContext<WebhookFormInput>();
  const { setNotification } = useContext(NotificationContext);
  const [cel, setCel] = useState('');
  const [loadingCel, setLoadingCel] = useState<boolean>(false);

  const { fields, remove } = useFieldArray({
    control,
    name: 'cel.conditions',
  });

  const handleSave = async () => {
    try {
      const { cel: celValues } = getValues();
      setLoadingCel(true);
      const response = await formatAndGenerateCEL(celValues);
      setCel(response);
    } catch (err: unknown) {
      let errorMsg = 'Error generating CEL';
      if (err instanceof Error) {
        errorMsg = err.message || errorMsg;
      }
      setNotification(errorMsg, '', 'error');
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
  const { control, register, getValues, setValue, watch, resetField, trigger } =
    useFormContext<WebhookFormInput>();
  const selectedField = watch(`cel.conditions.${index}.field`);
  const config =
    conditionsConfig.find((c) => c.field === selectedField) || conditionsConfig[0];

  useEffect(() => {
    setValue(`cel.conditions.${index}.operator`, '==');
    resetField(`cel.conditions.${index}.value`, { defaultValue: '' });
    trigger(`cel.conditions.${index}.value`);
  }, [selectedField, index, setValue, resetField, trigger]);

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
        options={conditionsConfig.map((c) => ({
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
      {config?.inputType === 'number' && (
        <TextField
          {...register(`cel.conditions.${index}.value`, config.validation)}
          placeholder="value"
          type="number"
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
          value={watch(`cel.conditions.${index}.value`)}
        />
      )}
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
