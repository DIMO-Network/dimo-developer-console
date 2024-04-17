'use client';
import { useForm, SubmitHandler } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { regions } from '@/config/default';
import { dimoDevClient } from '@/services/dimoDev';

interface CompanyInfoInputs {
  name: string;
  website?: string;
  region?: string;
}

const regionOptions = regions.map((regionName) => ({
  value: regionName,
  text: regionName,
}));

export const CompanyInfoForm = () => {
  const {
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
    const data = await dimoDevClient
      .put('/user', {
        flow: 'company-info',
        data: companyData,
      })
      .catch(console.error);
    console.log({ data });
    window.location.replace('/sign-up');
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
          })}
        />
      </Label>
      {errors.website && <TextError errorMessage="This field is required" />}
      <Label htmlFor="region" className="text-xs text-medium">
        Main Operating Region *
        <SelectField
          {...register('region', {
            required: true,
          })}
          options={regionOptions}
        />
      </Label>
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary">
          Finish sign up
        </Button>
      </div>
    </form>
  );
};

export default CompanyInfoForm;
