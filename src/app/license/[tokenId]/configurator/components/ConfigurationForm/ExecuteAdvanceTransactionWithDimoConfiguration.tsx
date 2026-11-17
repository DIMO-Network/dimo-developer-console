import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Control, UseFormRegister } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
}

export const ExecuteAdvanceTransactionWithDimoConfiguration: FC<IFormProps> = ({
  register,
}: IFormProps) => {
  const t = useTranslations('configurator');
  return (
    <div>
      <Label htmlFor="vehicles">
        {t('form.transaction.vehicles')}
        <TextField
          type="text"
          placeholder="1,2,3"
          {...register('vehicles', {
            required: false,
            validate: {},
          })}
          role="vehicles-input"
        />
      </Label>
    </div>
  );
};
