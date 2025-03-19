'use client';
import { FC, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import classnames from 'classnames';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ComputerIcon, UserIcon, PhoneIcon } from '@/components/Icons';
import { IAuth } from '@/types/auth';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { gtSuper } from '@/utils/font';

interface BuildForFormInputs {
  buildFor: string;
  buildForText?: string;
}

enum buildForValues {
  'mobileApp' = 'mobile-app',
  'webApp' = 'web-app',
  'personalProject' = 'personal-project',
  'somethingElse' = 'something-else',
}

const buildForList = [
  {
    title: 'Mobile App ',
    description: 'App on the Apple App Store or Google Play Store',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.mobileApp,
  },
  {
    title: 'Web Application',
    description: 'Web app with user management',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: buildForValues.webApp,
  },
  {
    title: 'Personal Project',
    description: 'Personal project to access vehicle data',
    Icon: UserIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.personalProject,
  },
];

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const BuildForForm: FC<IProps> = ({ auth, onNext }) => {
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

  const onSubmit: SubmitHandler<BuildForFormInputs> = () => {
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
    onNext('build-for', {
      ...auth,
      company: {
        build_for: buildForData.buildFor,
        build_for_text: buildForData.buildForText,
      },
    } as Partial<IAuth>);
  };

  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className={gtSuper.className}>What are you building?</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full max-w-sm pt-4"
        >
          <div className="text-sm ml-1">What you are looking to lauch with DIMO?</div>
          {buildForList.map(({ title, description, value, Icon, iconClassName }) => {
            return (
              <Card
                className={classnames(
                  'flex flex-row card-border !rounded-2xl justify-between items-center align-middle cursor-pointer',
                  {
                    '!border-white': buildFor === value,
                  },
                )}
                onClick={() => handleSelection(value)}
                key={value}
              >
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-[#BABABA]">{description}</p>
                </div>
                <Icon className={iconClassName} />
              </Card>
            );
          })}
          <Card
            className="flex flex-col gap-4 card-border"
            onClick={() => handleSelection(buildForValues.somethingElse)}
          >
            <Label htmlFor="buildForText" className="text-sm text-medium">
              Something else
              <TextField
                type="text"
                placeholder="I'm building a..."
                {...register('buildForText', {
                  required: buildFor === buildForValues.somethingElse,
                })}
                role="build-for-something-else-input"
              />
            </Label>
            {errors.buildForText && <TextError errorMessage="This field is required" />}
          </Card>
          <div className="flex flex-col items-center">
            {isDirty && !buildFor && !buildForText && (
              <TextError errorMessage="Select an option to continue" />
            )}
          </div>
          <div className="flex flex-col pt-4">
            <Button type="submit" className="primary" role="continue-button">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BuildForForm;
