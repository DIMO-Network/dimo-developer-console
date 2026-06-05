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
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Login Settings
        </p>
        <div className="flex flex-row gap-3 w-full">
          <Label className="text-xs font-medium w-full flex flex-col gap-1">
            Vehicles
            <TextField
              type="text"
              placeholder="1,2,3"
              {...register('vehicles', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
          <Label className="text-xs font-medium w-full flex flex-col gap-1">
            Vehicle Makes
            <TextField
              type="text"
              placeholder="toyota, mazda..."
              {...register('vehicleMakes', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        </div>
        <div className="flex flex-row gap-3 w-full">
          <Label className="text-xs font-medium w-full flex flex-col gap-1">
            Powertrain Types
            <TextField
              type="text"
              placeholder="ICE, HEV..."
              {...register('powerTrainTypes', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        </div>
        {brandNames.length > 1 && (
          <Label
            htmlFor="brandName"
            className="text-xs font-medium w-full flex flex-col gap-1"
          >
            Brand
            <p className="text-muted-foreground font-normal text-[11px]">
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
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Privacy Policy &amp; Terms of Service
        </p>
        <Label className="text-xs font-medium flex flex-col gap-1">
          Privacy Policy URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/privacy"
            {...register('privacyPolicyUrl', { required: false })}
            role="privacy-policy-url-input"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Displayed to users before they log in. Leave blank to skip.
          </p>
        </Label>
        <Label className="text-xs font-medium flex flex-col gap-1">
          Terms of Service URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/terms"
            {...register('tosUrl', { required: false })}
            role="tos-url-input"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Displayed to users before they log in. Leave blank to skip.
          </p>
        </Label>
      </div>
    </>
  );
};
