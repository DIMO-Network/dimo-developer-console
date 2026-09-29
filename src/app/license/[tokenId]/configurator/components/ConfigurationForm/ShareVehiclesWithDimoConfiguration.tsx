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
  const requireAttestation = useWatch({ control, name: 'requireAttestation' });
  const { setValue } = useFormContext<DynamicFormProps>();

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
                <label className="text-body-sm font-medium text-ink">Attestations</label>
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
          <Label htmlFor="brandName" className="w-full">
            Brand
            <p className="text-label font-normal text-muted">
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
