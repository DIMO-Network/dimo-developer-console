'use client';
import { FC, ReactNode } from 'react';
import {
  useForm,
  SubmitHandler,
  FieldErrors,
  Control,
  UseFormRegister,
} from 'react-hook-form';
import { isURL, isEmpty } from 'validator';

import { Button } from '@/components/Button';
import { DEVELOPER_TYPES, REGIONS } from '@/config/default';
import { IAuth } from '@/types/auth';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { gtSuper } from '@/utils/font';
import { BubbleLoader } from '@/components/BubbleLoader';

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
  return (
    <>
      <Label htmlFor="name" className="text-xs text-medium">
        Company name *
        <TextField
          type="text"
          placeholder="ACME"
          {...register('name', {
            required: 'This field is required',
            maxLength: {
              value: 120,
              message: 'The name should has maximum 120 characters',
            },
          })}
          role="company-name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage={errors?.name?.message ?? ''} />}
      <Label htmlFor="website" className="text-xs text-medium">
        Company website
        <TextField
          type="text"
          placeholder="www.acme.zone"
          {...register('website', {
            required: false,
            maxLength: {
              value: 120,
              message: 'The name should has maximum 120 characters',
            },
            validate: {
              isURL: (str: string = '') => isEmpty(str) || isURL(str),
            },
          })}
          role="company-website-input"
        />
      </Label>
      {errors.website && (
        <TextError errorMessage="This field must be a valid URL with maximum 120 characters" />
      )}
      <Label htmlFor="region" className="text-xs text-medium">
        Main Operating Region *
        <SelectField
          {...register('region', {
            required: 'This field is required',
          })}
          options={regionOptions}
          control={control}
          placeholder="Select"
          role="company-region"
        />
      </Label>
      {errors.region && <TextError errorMessage={errors.region.message ?? ''} />}
    </>
  );
};
const SingleDeveloperForm = ({ control, register, errors }: IFormProps): ReactNode => {
  return (
    <>
      <Label htmlFor="name" className="text-xs text-medium">
        Name *
        <TextField
          type="text"
          placeholder="Bruce Wayne"
          {...register('name', {
            required: 'This field is required',
            maxLength: {
              value: 120,
              message: 'The name should has maximum 120 characters',
            },
          })}
          role="company-name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage={errors?.name?.message ?? ''} />}
      <Label htmlFor="website" className="text-xs text-medium">
        Social URL
        <TextField
          type="text"
          placeholder="https://instagram.com/batman"
          {...register('website', {
            required: false,
            maxLength: {
              value: 120,
              message: 'The name should has maximum 120 characters',
            },
            validate: {
              isURL: (str: string = '') => isEmpty(str) || isURL(str),
            },
          })}
          role="company-website-input"
        />
      </Label>
      {errors.website && (
        <TextError errorMessage="This field must be a valid URL with maximum 120 characters" />
      )}
      <Label htmlFor="region" className="text-xs text-medium">
        Region *
        <SelectField
          {...register('region', {
            required: 'This field is required',
          })}
          options={regionOptions}
          control={control}
          placeholder="Select"
          role="company-region"
        />
      </Label>
      {errors.region && <TextError errorMessage={errors.region.message ?? ''} />}
    </>
  );
};

export const CompanyInfoForm: FC<IProps> = ({ onNext, auth, isLoading }) => {
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
    updateUser(data);
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
          <p className={gtSuper.className}>Final Stretch</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full max-w-sm pt-4"
        >
          <Label htmlFor="region" className="text-xs text-medium">
            Business/Developer Type *
            <SelectField
              {...register('type', {
                required: 'This field is required',
              })}
              options={typeOptions}
              control={control}
              placeholder="Select"
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
            <Button type="submit" className="primary" role="finish-button">
              {isLoading ? <BubbleLoader isLoading={isLoading} /> : 'Finish sign up'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CompanyInfoForm;
