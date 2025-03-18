'use client';
import { FC } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { isURL, isEmpty } from 'validator';

import { Button } from '@/components/Button';
import { DEVELOPER_TYPES, REGIONS } from '@/config/default';
import { IAuth } from '@/types/auth';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { gtSuper } from '@/utils/font';

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
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const CompanyInfoForm: FC<IProps> = ({ onNext }) => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInfoInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit: SubmitHandler<CompanyInfoInputs> = (data) => {
    updateUser(data);
  };

  const updateUser = async (companyData: CompanyInfoInputs) => {
    onNext('company-information', {
      company: {
        ...companyData,
      },
    } as Partial<IAuth>);
  };

  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className={gtSuper.className}>Final Strecht</p>
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
          <Label htmlFor="name" className="text-xs text-medium">
            Company name
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
          
          <div className="flex flex-col pt-4">
            <Button type="submit" className="primary" role="finish-button">
              Finish sign up
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CompanyInfoForm;
