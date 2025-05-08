import { Section, SectionHeader } from '@/components/Section';
import React, { useContext, useState, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
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
          { text: 'is equal to', value: '==' },
          { text: 'is greater than', value: '>' },
          { text: 'is less than', value: '<' },
        ]
      : [{ text: 'is equal to', value: '==' }];

  return (
    <div className="flex flex-row items-center gap-2.5 flex-1 w-full">
      <select
        {...register(`cel.conditions.${index}.field`, { required: 'Field is required' })}
        className="bg-cta-default text-white text-sm rounded-md px-3 py-2 min-w-[120px] border border-border-default focus:outline-none"
        defaultValue=""
      >
        <option value="" disabled>
          Select attribute
        </option>
        {conditionsConfig.map((c) => (
          <option key={c.field} value={c.field}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        {...register(`cel.conditions.${index}.operator`, {
          required: 'Operator is required',
        })}
        className="bg-cta-default text-white text-sm rounded-md px-3 py-2 min-w-[120px] border border-border-default focus:outline-none"
        defaultValue=""
      >
        <option value="" disabled>
          Select operator
        </option>
        {operatorOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
      {config?.inputType === 'number' && (
        <input
          {...register(`cel.conditions.${index}.value`, config.validation)}
          placeholder="Enter a number"
          type="number"
          className="bg-cta-default text-white min-w-[120px] border border-border-default"
        />
      )}
      {config?.inputType === 'boolean' && (
        <select
          {...register(`cel.conditions.${index}.value`, config.validation)}
          className="bg-cta-default text-white text-sm rounded-md px-3 py-2 border border-border-default focus:outline-none min-w-[120px]"
          defaultValue=""
        >
          <option value="" disabled>
            Select value
          </option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )}
      <Button type="button" onClick={() => remove(index)} className="primary-outline">
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </Button>
    </div>
  );
};
