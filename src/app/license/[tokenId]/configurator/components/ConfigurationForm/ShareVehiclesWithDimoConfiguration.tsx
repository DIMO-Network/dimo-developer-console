import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, Controller, UseFormRegister, useWatch } from 'react-hook-form';
import {
  DOCUMENT_OPTIONS,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

type PermissionCardProps = {
  selected: boolean;
  title: string;
  description: string;
  onToggle: () => void;
};

const PermissionCard = ({
  selected,
  title,
  description,
  onToggle,
}: PermissionCardProps) => (
  <div
    role="button"
    aria-pressed={!!selected}
    onClick={onToggle}
    className={`cursor-pointer rounded-control px-3 py-2 transition-colors duration-150 ${
      selected ? 'bg-control shadow-selected' : 'bg-sheet hover:bg-control/70'
    }`}
  >
    <h4 className="text-body-sm font-medium text-ink">{title}</h4>
    <p className="text-label font-normal text-muted">{description}</p>
  </div>
);

export const ShareVehiclesWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  const permissionsMode = useWatch({
    control,
    name: 'permissionsMode',
    defaultValue: 'template',
  });

  return (
    <>
      {/* Vehicle permissions */}
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <h3 className="text-card-title text-ink">Vehicle permissions</h3>
        <SegmentedControl
          options={[
            { value: 'template', label: 'Use permission template' },
            { value: 'custom', label: 'Custom permissions' },
          ]}
          control={control}
          name="permissionsMode"
          role="permission-segmented"
        />
        {permissionsMode === 'template' && (
          <Label>
            Permissions template ID
            <TextField
              type="text"
              placeholder="1"
              {...register('permissionTemplateId', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        )}
        {permissionsMode === 'custom' && (
          <Controller
            name="permissions"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                {PERMISSIONS.map((p) => (
                  <PermissionCard
                    key={p.key}
                    title={p.title}
                    description={p.description}
                    selected={field.value?.includes(p.key)}
                    onToggle={() => {
                      if (field.value?.includes(p.key)) {
                        field.onChange(field.value.filter((v: string) => v !== p.key));
                      } else {
                        field.onChange([...(field.value || []), p.key]);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          />
        )}
        {brandNames.length > 1 && (
          <Label htmlFor="brandName" className="w-full">
            Brand
            <p className="text-label font-normal text-muted">
              Which brand the button and the sign-in window show. Leave as
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

      {/* Documents */}
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-card-title text-ink">Documents</h3>
          <p className="text-label font-normal text-muted">
            Documents your app can read for each shared vehicle. Users see them in the
            request before they share.
          </p>
        </div>
        <Controller
          name="documents"
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {DOCUMENT_OPTIONS.map((d) => (
                <PermissionCard
                  key={d.value}
                  title={d.title}
                  description={d.description}
                  selected={!!field.value?.includes(d.value)}
                  onToggle={() =>
                    field.onChange(
                      field.value?.includes(d.value)
                        ? field.value.filter((v) => v !== d.value)
                        : [...(field.value ?? []), d.value],
                    )
                  }
                />
              ))}
            </div>
          )}
        />
      </div>

      {/* Which vehicles */}
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-card-title text-ink">Which vehicles</h3>
          <p className="text-label font-normal text-muted">
            Leave blank to let users share any of their vehicles. Others are listed as
            &quot;Can&apos;t be shared&quot;, with the reason. Separate values with
            commas.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Label>
            Vehicle token IDs
            <TextField
              type="text"
              placeholder="1, 2, 3"
              {...register('vehicles', { required: false })}
              role="vehicles-input"
            />
          </Label>
          <Label>
            Vehicle makes
            <TextField
              type="text"
              placeholder="Toyota, Mazda"
              {...register('vehicleMakes', { required: false })}
              role="vehicle-makes-input"
            />
          </Label>
          <Label>
            Powertrain types
            <TextField
              type="text"
              placeholder="BEV, HEV"
              {...register('powertrainTypes', { required: false })}
              role="powertrain-types-input"
            />
          </Label>
        </div>
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
            Displayed to vehicle owners before they grant permissions. Leave blank to
            skip.
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
            Displayed to vehicle owners before they grant permissions. Leave blank to
            skip.
          </p>
        </Label>
      </div>
    </>
  );
};
