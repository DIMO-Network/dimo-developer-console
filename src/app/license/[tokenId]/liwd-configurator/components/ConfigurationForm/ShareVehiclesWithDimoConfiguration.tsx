import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  useWatch,
} from 'react-hook-form';
import {
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/types';
import { Toggle } from '@/components/Toggle';
import { SegmentedControl } from '@/components/SegmentedControl';
import { DatePicker } from '@/components/DatePicker';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  errors: FieldErrors<DynamicFormProps>;
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
    onClick={onToggle}
    className={`cursor-pointer border rounded-lg p-4 transition ${
      selected
        ? 'border-red-900 bg-surface-raised'
        : 'border-surface-default bg-surface-raised'
    }`}
  >
    <h4 className="font-semibold">{title}</h4>
    <p className="text-sm text-gray-600">{description}</p>
  </div>
);

export const ShareVehiclesWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
}: IFormProps) => {
  const permissionsMode = useWatch({
    control,
    name: 'permissionsMode',
  });
  return (
    <>
      <div className={'flex flex-row gap-4 w-full'}>
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

      <div className={'flex flex-row gap-4 w-full'}>
        <Controller
          name="altTitle"
          control={control}
          render={({ field }) => (
            <>
              <div className="flex flex-row gap-2 items-center w-4/12">
                <Toggle
                  checked={field.value}
                  onToggle={(checked) => field.onChange(checked)}
                />
                <label className="text-xs text-medium ml-2">Use Custom Labels</label>
              </div>
              {field.value && (
                <>
                  <Label htmlFor="website" className="text-xs text-medium w-full">
                    Authenticated Label
                    <TextField
                      type="text"
                      placeholder=""
                      {...register('authenticatedLabel', {
                        required: false,
                        validate: {},
                      })}
                      role="company-website-input"
                    />
                  </Label>
                  <Label htmlFor="website" className="text-xs text-medium w-full">
                    Unauthenticated Label
                    <TextField
                      type="text"
                      placeholder=""
                      {...register('unAuthenticatedLabel', {
                        required: false,
                        validate: {},
                      })}
                      role="company-website-input"
                    />
                  </Label>
                </>
              )}
            </>
          )}
        />
      </div>
      <div className={'flex flex-row gap-4 w-full'}>
        <SegmentedControl
          options={[
            { value: 'template', label: 'Use Permission Template' },
            { value: 'custom', label: 'Custom Permissions' },
          ]}
          control={control}
          name="permissionsMode"
          role="permission-segmented"
        />
      </div>
      <div className="flex flex-row gap-4 w-full">
        {permissionsMode === 'template' && (
          <Label htmlFor="website" className="text-xs text-medium w-full">
            Permissions Template Id
            <TextField
              type="text"
              placeholder="1"
              {...register('permissionTemplateId', {
                required: false,
                validate: {},
              })}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
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
      </div>
    </>
  );
};
