import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, UseFormRegister } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

export const LoginWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  return (
    <>
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <h3 className="text-card-title text-ink">Login settings</h3>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Label className="w-full">
            Vehicles
            <TextField
              type="text"
              placeholder="1,2,3"
              {...register('vehicles', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
          <Label className="w-full">
            Vehicle makes
            <TextField
              type="text"
              placeholder="toyota, mazda..."
              {...register('vehicleMakes', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        </div>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Label className="w-full">
            Powertrain types
            <TextField
              type="text"
              placeholder="ICE, HEV..."
              {...register('powerTrainTypes', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        </div>
        {brandNames.length > 1 && (
          <Label htmlFor="brandName" className="w-full">
            Brand
            <p className="text-label font-normal text-muted">
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
        )}
      </div>

      {/* Privacy Policy & Terms of Service */}
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <h3 className="text-card-title text-ink">
          Privacy policy &amp; terms of service
        </h3>
        <Label>
          Privacy policy URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/privacy"
            {...register('privacyPolicyUrl', { required: false })}
            role="privacy-policy-url-input"
          />
          <p className="text-label font-normal text-muted">
            Displayed to users before they log in. Leave blank to skip.
          </p>
        </Label>
        <Label>
          Terms of service URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/terms"
            {...register('tosUrl', { required: false })}
            role="tos-url-input"
          />
          <p className="text-label font-normal text-muted">
            Displayed to users before they log in. Leave blank to skip.
          </p>
        </Label>
      </div>
    </>
  );
};
