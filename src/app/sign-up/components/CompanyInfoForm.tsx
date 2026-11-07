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

interface CompanyInfoInputs {
  name: string;
  website?: string;
  region: string;
  type: string;
}

const regionOptions = REGIONS.map((regionName) => ({
  value: regionName,
  text: regionName,
})) as { value: string; text: string }[];

const typeOptions = DEVELOPER_TYPES.map((type) => ({
  value: type,
  text: type,
})) as { value: string; text: string }[];

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
          options={regionOptions}
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
          options={regionOptions}
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
              options={typeOptions}
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
