'use client';
import { FC } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { isURL, isEmpty } from 'validator';

import { Button } from '@/components/Button';
import { IUser } from '@/types/user';
import { Label } from '@/components/Label';
import { DEVELOPER_TYPES, REGIONS } from '@/config/default';
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
  onNext: (flow: string, user: Partial<IUser>) => void;
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
    } as Partial<IUser>);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full max-w-sm pt-4"
    >
      <Label htmlFor="name" className="text-xs text-medium">
        Company name
        <TextField
          type="text"
          placeholder="DIMO"
          {...register('name', {
            required: false,
          })}
          role="company-name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage="This field is required" />}
      <Label htmlFor="website" className="text-xs text-medium">
        Company website
        <TextField
          type="text"
          placeholder="www.dimo.zone"
          {...register('website', {
            required: false,
            validate: {
              isURL: (str: string = '') => isEmpty(str) || isURL(str),
            },
          })}
          role="company-website-input"
        />
      </Label>
      {errors.website && (
        <TextError errorMessage="This field must be a valid URL" />
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
      {errors.region && (
        <TextError errorMessage={errors.region.message ?? ''} />
      )}
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
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary" role="finish-button">
          Finish sign up
        </Button>
      </div>
    </form>
  );
};

export default CompanyInfoForm;
