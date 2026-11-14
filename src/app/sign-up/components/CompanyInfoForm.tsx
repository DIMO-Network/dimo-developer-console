'use client';
import { FC, ReactNode } from 'react';
import {
  useForm,
  SubmitHandler,
  FieldErrors,
  Control,
  UseFormRegister,
} from 'react-hook-form';
import { useTranslations } from 'next-intl';
import isURL from 'validator/lib/isURL';
import isEmpty from 'validator/lib/isEmpty';

import { Button } from '@/components/Button';
import { DEVELOPER_TYPES, REGIONS } from '@/config/default';
import { IAuth } from '@/types/auth';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import type { Translate } from '@/i18n/translate';

interface CompanyInfoInputs {
  name: string;
  website?: string;
  region: string;
  type: string;
}

// The values are sent to the API (and 'Personal Developer' picks the form), so
// they stay English; only the labels are translated. Keyed by the exact value,
// trailing space included.
const REGION_KEYS: Record<string, string> = {
  'North America': 'northAmerica',
  'Latin America & Caribbean': 'latinAmericaCaribbean',
  'Oceania': 'oceania',
  'Northern & Western Europe': 'northernWesternEurope',
  'Africa': 'africa',
  'East & Southeast Asia': 'eastSoutheastAsia',
  'Middle East & Central Asia ': 'middleEastCentralAsia',
  'South Asia': 'southAsia',
  'Eastern Europe': 'easternEurope',
};

const DEVELOPER_TYPE_KEYS: Record<string, string> = {
  'Personal Developer': 'personalDeveloper',
  'OEM': 'oem',
  'Insurance': 'insurance',
  'Maintenance': 'maintenance',
  'Fleet Management': 'fleetManagement',
  'Vehicle Sales': 'vehicleSales',
  'Utilities': 'utilities',
  'Financing': 'financing',
  'EV': 'ev',
  'DePIN': 'depin',
  'Data': 'data',
  'Others': 'others',
};

const regionOptions = (t: Translate) =>
  REGIONS.map((value) => ({ value, text: t(`company.regions.${REGION_KEYS[value]}`) }));

const typeOptions = (t: Translate) =>
  DEVELOPER_TYPES.map((value) => ({
    value,
    text: t(`company.developerTypes.${DEVELOPER_TYPE_KEYS[value]}`),
  }));

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
  isLoading?: boolean;
}

interface IFormProps {
  register: UseFormRegister<CompanyInfoInputs>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<CompanyInfoInputs, any>;
  errors: FieldErrors<CompanyInfoInputs>;
}

const CompanyForm = ({ control, register, errors }: IFormProps): ReactNode => {
  const t = useTranslations('sign-up');
  const tCommon = useTranslations('common');
  return (
    <>
      <Label htmlFor="name">
        {t('company.business.nameLabel')}
        <TextField
          type="text"
          placeholder={t('company.business.namePlaceholder')}
          {...register('name', {
            required: tCommon('validation.required'),
            maxLength: {
              value: 120,
              message: t('company.maxLength'),
            },
          })}
          role="company-name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage={errors?.name?.message ?? ''} />}
      <Label htmlFor="website">
        {t('company.business.websiteLabel')}
        <TextField
          type="text"
          placeholder={t('company.business.websitePlaceholder')}
          {...register('website', {
            required: false,
            maxLength: {
              value: 120,
              message: t('company.maxLength'),
            },
            validate: {
              isURL: (str: string = '') => isEmpty(str) || isURL(str),
            },
          })}
          role="company-website-input"
        />
      </Label>
      {errors.website && <TextError errorMessage={t('company.invalidUrl')} />}
      <Label htmlFor="region">
        {t('company.business.regionLabel')}
        <SelectField
          name="region"
          rules={{ required: tCommon('validation.required') }}
          options={regionOptions(t)}
          control={control}
          placeholder={t('company.select')}
          role="company-region"
        />
      </Label>
      {errors.region && <TextError errorMessage={errors.region.message ?? ''} />}
    </>
  );
};
const SingleDeveloperForm = ({ control, register, errors }: IFormProps): ReactNode => {
  const t = useTranslations('sign-up');
  const tCommon = useTranslations('common');
  return (
    <>
      <Label htmlFor="name">
        {t('company.personal.nameLabel')}
        <TextField
          type="text"
          placeholder={t('company.personal.namePlaceholder')}
          {...register('name', {
            required: tCommon('validation.required'),
            maxLength: {
              value: 120,
              message: t('company.maxLength'),
            },
          })}
          role="company-name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage={errors?.name?.message ?? ''} />}
      <Label htmlFor="website">
        {t('company.personal.websiteLabel')}
        <TextField
          type="text"
          placeholder={t('company.personal.websitePlaceholder')}
          {...register('website', {
            required: false,
            maxLength: {
              value: 120,
              message: t('company.maxLength'),
            },
            validate: {
              isURL: (str: string = '') => isEmpty(str) || isURL(str),
            },
          })}
          role="company-website-input"
        />
      </Label>
      {errors.website && <TextError errorMessage={t('company.invalidUrl')} />}
      <Label htmlFor="region">
        {t('company.personal.regionLabel')}
        <SelectField
          name="region"
          rules={{ required: tCommon('validation.required') }}
          options={regionOptions(t)}
          control={control}
          placeholder={t('company.select')}
          role="company-region"
        />
      </Label>
      {errors.region && <TextError errorMessage={errors.region.message ?? ''} />}
    </>
  );
};

export const CompanyInfoForm: FC<IProps> = ({ onNext, auth, isLoading }) => {
  const t = useTranslations('sign-up');
  const tCommon = useTranslations('common');
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CompanyInfoInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const type = watch('type', '');

  const onSubmit: SubmitHandler<CompanyInfoInputs> = (data) => {
    void updateUser(data);
  };

  const updateUser = async (companyData: CompanyInfoInputs) => {
    onNext('company-information', {
      ...auth,
      name: companyData.name,
      company: {
        ...companyData,
      },
    } as Partial<IAuth>);
  };

  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className="text-title text-ink">{t('company.title')}</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full max-w-sm pt-4"
        >
          <Label htmlFor="type">
            {t('company.typeLabel')}
            <SelectField
              name="type"
              rules={{ required: tCommon('validation.required') }}
              options={typeOptions(t)}
              control={control}
              placeholder={t('company.select')}
              role="company-type"
            />
          </Label>
          {errors.type && <TextError errorMessage={errors.type.message ?? ''} />}
          {!isEmpty(type) && type != 'Personal Developer' && (
            <CompanyForm control={control} register={register} errors={errors} />
          )}
          {!isEmpty(type) && type === 'Personal Developer' && (
            <SingleDeveloperForm control={control} register={register} errors={errors} />
          )}

          <div className="flex flex-col pt-4">
            <Button
              type="submit"
              variant="brand"
              role="finish-button"
              loading={isLoading}
            >
              {t('company.finish')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CompanyInfoForm;
