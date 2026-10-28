import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { Label } from '@/components/Label';
import {
  Control,
  Controller,
  UseFormRegister,
  useFormState,
  useWatch,
} from 'react-hook-form';
import {
  DOCUMENT_OPTIONS,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';
import {
  BrandSelect,
  LegalLinksCard,
  ToggleCard,
  toggled,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/SharedFields';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

export const ShareVehiclesWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  // A useWatch defaultValue would win over the form's own initial value, so
  // fall back only when the form has none.
  const permissionsMode = useWatch({ control, name: 'permissionsMode' }) ?? 'template';
  const { errors } = useFormState({ control });
  const shareErrors = errors as Partial<
    Record<'permissionTemplateId' | 'permissions', { message?: string }>
  >;

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
        {/* A share without permissions fails in the login (or grants nothing). */}
        {permissionsMode === 'template' && (
          <Label>
            Permissions template ID
            <TextField
              type="text"
              placeholder="1"
              {...register('permissionTemplateId', {
                required: 'Enter a permissions template ID',
              })}
              role="company-website-input"
            />
            {shareErrors.permissionTemplateId?.message && (
              <TextError errorMessage={shareErrors.permissionTemplateId.message} />
            )}
          </Label>
        )}
        {permissionsMode === 'custom' && (
          <Controller
            name="permissions"
            control={control}
            defaultValue={[]}
            rules={{
              validate: (value) =>
                (Array.isArray(value) && value.length > 0) ||
                'Choose at least one permission',
            }}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  {PERMISSIONS.map((p) => (
                    <ToggleCard
                      key={p.key}
                      title={p.title}
                      description={p.description}
                      selected={!!field.value?.includes(p.key)}
                      onToggle={() => field.onChange(toggled(field.value, p.key))}
                    />
                  ))}
                </div>
                {shareErrors.permissions?.message && (
                  <TextError errorMessage={shareErrors.permissions.message} />
                )}
              </div>
            )}
          />
        )}
        <BrandSelect register={register} control={control} brandNames={brandNames} />
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
                <ToggleCard
                  key={d.value}
                  title={d.title}
                  description={d.description}
                  selected={!!field.value?.includes(d.value)}
                  onToggle={() => field.onChange(toggled(field.value, d.value))}
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

      <LegalLinksCard
        register={register}
        shownTo="vehicle owners before they grant permissions"
      />
    </>
  );
};
