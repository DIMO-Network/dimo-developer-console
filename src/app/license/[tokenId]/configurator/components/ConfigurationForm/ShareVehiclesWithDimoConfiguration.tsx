import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import {
  Control,
  Controller,
  UseFormRegister,
  useWatch,
  useFormContext,
} from 'react-hook-form';
import {
  DynamicFormProps,
  PERMISSIONS,
  ATTESTATION_TAGS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';

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
    onClick={onToggle}
    className={`cursor-pointer border rounded-md px-3 py-2 transition-colors ${
      selected
        ? 'border-primary bg-primary/10 ring-1 ring-primary'
        : 'border-border bg-accent hover:border-primary/50'
    }`}
  >
    <h4 className="font-medium text-xs">{title}</h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
      {description}
    </p>
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
  const requireAttestation = useWatch({ control, name: 'requireAttestation' });
  const { setValue } = useFormContext<DynamicFormProps>();

  return (
    <>
      {/* Vehicle Permissions */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Vehicle Permissions
        </p>
        <SegmentedControl
          options={[
            { value: 'template', label: 'Use Permission Template' },
            { value: 'custom', label: 'Custom Permissions' },
          ]}
          control={control}
          name="permissionsMode"
          role="permission-segmented"
        />
        {permissionsMode === 'template' && (
          <Label className="text-xs font-medium flex flex-col gap-1">
            Permissions Template ID
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
        <div className="flex flex-col gap-3">
          <Controller
            name="requireAttestation"
            control={control}
            render={({ field }) => (
              <div className="flex flex-row gap-2 items-center">
                <Toggle
                  checked={field.value}
                  onToggle={(checked) => {
                    field.onChange(checked);
                    if (!checked) setValue('attestation.tags', []);
                  }}
                />
                <label className="text-sm font-medium">Attestations</label>
              </div>
            )}
          />
          {requireAttestation && (
            <Controller
              name="attestation.tags"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  {ATTESTATION_TAGS.map((p) => (
                    <PermissionCard
                      key={p.value}
                      title={p.title}
                      description={p.description}
                      selected={field.value?.includes(p.value)}
                      onToggle={() => {
                        if (field.value?.includes(p.value)) {
                          field.onChange(
                            field.value.filter((v: string) => v !== p.value),
                          );
                        } else {
                          field.onChange([...(field.value || []), p.value]);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            />
          )}
        </div>
        {brandNames.length > 1 && (
          <Label
            htmlFor="brandName"
            className="text-xs font-medium w-full flex flex-col gap-1"
          >
            Brand
            <p className="text-muted-foreground font-normal text-[11px]">
              Which brand to show on the DIMO button. Leave as &quot;Default&quot; to use
              your workspace default brand.
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

      {/* Terms of Service */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Terms of Service
        </p>
        <Label className="text-xs font-medium flex flex-col gap-1">
          ToS URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/terms"
            {...register('tosUrl', { required: false })}
            role="tos-url-input"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Displayed to vehicle owners before they grant permissions. Leave blank to
            skip.
          </p>
        </Label>
      </div>
    </>
  );
};
