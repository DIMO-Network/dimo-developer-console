import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, Controller, UseFormRegister, useFormContext } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

import { DatePicker } from '@/components/DatePicker';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  /** Brand names configured for this workspace. When >1, shows a selector. */
  brandNames?: string[];
}

export const LoginWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  const {
    formState: { errors },
  } = useFormContext<DynamicFormProps>();
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
            rules={{ required: 'Expiration date is required' }}
            render={({ field }) => (
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(value) => field.onChange(value ?? '')}
              />
            )}
          />
          {errors.expirationDate && (
            <p className="text-xs text-red-500 mt-1">{errors.expirationDate.message}</p>
          )}
        </Label>
      </div>
      {brandNames.length > 1 && (
        <div className={'flex flex-row gap-4 w-full'}>
          <Label htmlFor="brandName" className="text-xs text-medium w-full">
            Brand
            <p className="text-text-secondary font-normal text-xs mb-1">
              Which brand to show on the Login with DIMO button. Leave as
              &quot;Default&quot; to use your workspace default brand.
            </p>
            <SelectField
              {...register('brandName', { required: false })}
              options={[
                { value: '', text: 'Default' },
                ...brandNames.map((name) => ({ value: name, text: name })),
              ]}
              control={control}
              placeholder="Default"
              role="brandName-select"
            />
          </Label>
        </div>
      )}
    </>
  );
};
