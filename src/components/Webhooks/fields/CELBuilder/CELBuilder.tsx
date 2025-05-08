import { Section, SectionHeader } from '@/components/Section';
import React, { useContext, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/Button';
import { WebhookFormInput } from '@/types/webhook';
import { formatAndGenerateCEL } from '@/services/webhook';
import { NotificationContext } from '@/context/notificationContext';
import { capitalize } from 'lodash';
import { ConditionRow } from '@/components/Webhooks/fields/CELBuilder/ConditionRow';

import './CELBuilder.css';
import '../../../TextField/TextField.css';

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
