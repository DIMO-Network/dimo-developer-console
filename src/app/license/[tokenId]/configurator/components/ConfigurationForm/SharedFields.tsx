import { FC } from 'react';
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
}) =>
  brandNames.length > 1 ? (
    <Label htmlFor="brandName" className="w-full">
      Brand
      <p className="text-label font-normal text-muted">
        Which brand the button and the sign-in window show. Leave as &quot;Default&quot;
        to use your workspace default brand.
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
  ) : null;

/** Your privacy policy and terms, linked from the sign-in window. */
export const LegalLinksCard: FC<Pick<FieldProps, 'register'> & { shownTo: string }> = ({
  register,
  shownTo,
}) => (
  <div className="rounded-card bg-card p-4 flex flex-col gap-4">
    <h3 className="text-card-title text-ink">Privacy policy &amp; terms of service</h3>
    <Label>
      Privacy policy URL
      <TextField
        type="url"
        placeholder="https://yourapp.com/privacy"
        {...register('privacyPolicyUrl', { required: false })}
        role="privacy-policy-url-input"
      />
      <p className="text-label font-normal text-muted">
        Displayed to {shownTo}. Leave blank to skip.
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
        Displayed to {shownTo}. Leave blank to skip.
      </p>
    </Label>
  </div>
);
