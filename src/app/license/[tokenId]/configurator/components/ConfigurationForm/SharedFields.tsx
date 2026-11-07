import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Control, UseFormRegister } from 'react-hook-form';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextField } from '@/components/TextField';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

interface ToggleCardProps {
  selected: boolean;
  title: string;
  description: string;
  onToggle: () => void;
}

/** A permission or document to include, as a pressable card. */
export const ToggleCard: FC<ToggleCardProps> = ({
  selected,
  title,
  description,
  onToggle,
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onToggle}
    className={`cursor-pointer rounded-control px-3 py-2 text-left transition-colors duration-150 ${
      selected ? 'bg-control shadow-selected' : 'bg-sheet hover:bg-control/70'
    }`}
  >
    <span className="block text-body-sm font-medium text-ink">{title}</span>
    <span className="block text-label font-normal text-muted">{description}</span>
  </button>
);

/** Adds `value` to a list, or takes it out. */
export const toggled = <T,>(list: T[] | undefined, value: T): T[] =>
  list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

interface FieldProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
}

/** Which console brand the button and sign-in window show; only with several. */
export const BrandSelect: FC<FieldProps & { brandNames: string[] }> = ({
  register,
  control,
  brandNames,
}) => {
  const t = useTranslations('configurator');
  return brandNames.length > 1 ? (
    <Label htmlFor="brandName" className="w-full">
      {t('form.brand.label')}
      <p className="text-label font-normal text-muted">{t('form.brand.hint')}</p>
      <SelectField
        {...register('brandName', { required: false })}
        options={[
          { value: '', text: t('form.brand.default') },
          ...brandNames.map((name) => ({ value: name, text: name })),
        ]}
        control={control}
        placeholder={t('form.brand.default')}
        role="brandName-select"
      />
    </Label>
  ) : null;
};

/** Your privacy policy and terms, linked from the sign-in window. */
export const LegalLinksCard: FC<
  Pick<FieldProps, 'register'> & { shownTo: 'vehicleOwners' | 'users' }
> = ({ register, shownTo }) => {
  const t = useTranslations('configurator');
  const shown = t(
    shownTo === 'vehicleOwners'
      ? 'form.legal.shownToVehicleOwners'
      : 'form.legal.shownToUsers',
  );

  return (
    <div className="rounded-card bg-card p-4 flex flex-col gap-4">
      <h3 className="text-card-title text-ink">{t('form.legal.title')}</h3>
      <Label>
        {t('form.legal.privacyPolicyUrl')}
        <TextField
          type="url"
          placeholder="https://yourapp.com/privacy"
          {...register('privacyPolicyUrl', { required: false })}
          role="privacy-policy-url-input"
        />
        <p className="text-label font-normal text-muted">{shown}</p>
      </Label>
      <Label>
        {t('form.legal.termsUrl')}
        <TextField
          type="url"
          placeholder="https://yourapp.com/terms"
          {...register('tosUrl', { required: false })}
          role="tos-url-input"
        />
        <p className="text-label font-normal text-muted">{shown}</p>
      </Label>
    </div>
  );
};
