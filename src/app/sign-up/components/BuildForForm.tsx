'use client';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import classnames from 'classnames';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { TextError } from '@/components/TextError';
import { CarRental, ComputerIcon, PhoneIcon } from '@/components/Icons';
import { dimoDevClient } from '@/services/dimoDev';

interface BuildForFormInputs {
  buildFor: string;
  buildForText?: string;
}

enum buildForValues {
  'mobileApp' = 'mobile-app',
  'webAppSingleLogin' = 'web-app-single-login',
  'webAppMultiAccount' = 'web-app-multi-account',
  'somethingElse' = 'something-else',
}

const buildForList = [
  {
    text: 'Mobile app - IOS/Android',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.mobileApp,
  },
  {
    text: 'Web application with single account login',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: buildForValues.webAppSingleLogin,
  },
  {
    text: 'Web application with multi-account management',
    Icon: CarRental,
    iconClassName: 'w-4 h-5',
    value: buildForValues.webAppMultiAccount,
  },
];

export const BuildForForm = () => {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    getValues,
  } = useForm<BuildForFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const buildFor = watch('buildFor', '');
  const buildForText = watch('buildForText', '');

  const onSubmit: SubmitHandler<BuildForFormInputs> = (data) => {
    setIsDirty(true);
    if (buildFor) {
      updateUser(getValues());
    }
  };

  const handleSelection = (selection: string) => {
    setValue('buildFor', selection);
    setIsDirty(true);
    if (selection !== buildForValues.somethingElse) {
      setValue('buildForText', '');
    }
  };

  const updateUser = async (buildForData: BuildForFormInputs) => {
    const data = await dimoDevClient
      .put('/user', {
        flow: 'build-for',
        data: buildForData,
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
      {buildForList.map(({ text, value, Icon, iconClassName }) => {
        return (
          <Card
            className={classnames(
              'flex flex-row card-border justify-between cursor-pointer',
              {
                '!border-white': buildFor === value,
              }
            )}
            onClick={() => handleSelection(value)}
            key={value}
          >
            <p className="text-xs font-medium">{text}</p>
            <Icon className={iconClassName} />
          </Card>
        );
      })}
      <Card
        className="flex flex-col gap-4 card-border"
        onClick={() => handleSelection(buildForValues.somethingElse)}
      >
        <Label htmlFor="buildForText" className="text-xs text-medium">
          Something else
          <TextField
            type="text"
            placeholder="Enter text..."
            {...register('buildForText', {
              required: buildFor === buildForValues.somethingElse,
            })}
          />
        </Label>
        {errors.buildForText && (
          <TextError errorMessage="This field is required" />
        )}
      </Card>
      <div className="flex flex-col items-center">
        {isDirty && !buildFor && !buildForText && (
          <TextError errorMessage="Select an option to continue" />
        )}
      </div>
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary">
          Continue
        </Button>
      </div>
    </form>
  );
};

export default BuildForForm;
