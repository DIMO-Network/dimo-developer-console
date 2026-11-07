import { FC } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('configurator');
  const permissionsMode = useWatch({ control, name: 'permissionsMode' }) ?? 'template';
  const { errors } = useFormState({ control });
  const shareErrors = errors as Partial<
    Record<'permissionTemplateId' | 'permissions', { message?: string }>
  >;

  return (
    <>
      {/* Vehicle permissions */}
      <div className="rounded-card bg-card p-4 flex flex-col gap-4">
        <h3 className="text-card-title text-ink">{t('form.share.permissionsTitle')}</h3>
        <SegmentedControl
          options={[
            { value: 'template', label: t('form.share.useTemplate') },
            { value: 'custom', label: t('form.share.customPermissions') },
          ]}
          control={control}
          name="permissionsMode"
          role="permission-segmented"
        />
        {/* A share without permissions fails in the login (or grants nothing). */}
        {permissionsMode === 'template' && (
          <Label>
            {t('form.share.templateId')}
            <TextField
              type="text"
              {...register('permissionTemplateId', {
                required: t('form.share.templateIdRequired'),
              })}
              role="company-website-input"
            />
            {shareErrors.permissionTemplateId?.message && (
              <TextError errorMessage={shareErrors.permissionTemplateId.message} />
            )}
            <p className="text-label font-normal text-muted">
              {t('form.share.templateIdHint')}
            </p>
          </Label>
        )}
        {permissionsMode === 'custom' && (
          <Controller
            name="permissions"
            control={control}
            defaultValue={[]}
            rules={{
              validate: (value) =>
                (Array.isArray(value) && value.length > 0) || t('form.share.chooseOne'),
            }}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  {PERMISSIONS.map((p) => (
                    <ToggleCard
                      key={p.key}
                      title={t(`permissions.${p.key}.title`)}
                      description={t(`permissions.${p.key}.description`)}
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
          <h3 className="text-card-title text-ink">{t('form.share.documentsTitle')}</h3>
          <p className="text-label font-normal text-muted">
            {t('form.share.documentsHint')}
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
                  title={t(`documents.${d.messageKey}.title`)}
                  description={t(`documents.${d.messageKey}.description`)}
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
          <h3 className="text-card-title text-ink">{t('form.share.vehiclesTitle')}</h3>
          <p className="text-label font-normal text-muted">
            {t('form.share.vehiclesHint')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Label>
            {t('form.share.vehicleTokenIds')}
            <TextField
              type="text"
              placeholder="1, 2, 3"
              {...register('vehicles', { required: false })}
              role="vehicles-input"
            />
          </Label>
          <Label>
            {t('form.share.vehicleMakes')}
            <TextField
              type="text"
              placeholder="Toyota, Mazda"
              {...register('vehicleMakes', { required: false })}
              role="vehicle-makes-input"
            />
          </Label>
          <Label>
            {t('form.share.powertrainTypes')}
            <TextField
              type="text"
              placeholder="BEV, HEV"
              {...register('powertrainTypes', { required: false })}
              role="powertrain-types-input"
            />
          </Label>
        </div>
      </div>

      <LegalLinksCard register={register} shownTo="vehicleOwners" />
    </>
  );
};
