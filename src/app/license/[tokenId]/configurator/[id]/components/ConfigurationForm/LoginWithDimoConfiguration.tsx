import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Control, Controller, UseFormRegister } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/types';

import { DatePicker } from '@/components/DatePicker';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
}

export const LoginWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
}: IFormProps) => {
  return (
    <>
      <div className={'flex flex-row gap-4 w-full'}>
        <Label htmlFor="website" className="text-xs text-medium w-full">
          Vehicles
          <TextField
            type="text"
            placeholder="1,2,3"
            {...register('vehicles', {
              required: false,
              validate: {},
            })}
            role="company-website-input"
          />
        </Label>
        <Label htmlFor="website" className="text-xs text-medium w-full">
          Vehicle Makes
          <TextField
            type="text"
            placeholder="toyota, mazda..."
            {...register('vehicleMakes', {
              required: false,
              validate: {},
            })}
            role="company-website-input"
          />
        </Label>
      </div>
      <div className={'flex flex-row gap-4 w-full'}>
        <Label htmlFor="website" className="text-xs text-medium w-full">
          Powertrain Types
          <TextField
            type="text"
            placeholder="ICE, HEV..."
            {...register('powerTrainTypes', {
              required: false,
              validate: {},
            })}
            role="company-website-input"
          />
        </Label>
        <Label htmlFor="website" className="text-xs text-medium w-full">
          Expiration Date
          <Controller
            control={control}
            name="expirationDate"
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(value) => field.onChange(value ?? '')}
              />
            )}
          />
        </Label>
      </div>
    </>
  );
};
