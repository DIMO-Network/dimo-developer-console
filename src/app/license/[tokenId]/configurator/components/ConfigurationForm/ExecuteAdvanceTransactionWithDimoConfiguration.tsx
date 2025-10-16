import { FC } from 'react';
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
  return (
    <div>
      <Label htmlFor="vehicles" className="text-xs text-medium">
        Vehicles
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
