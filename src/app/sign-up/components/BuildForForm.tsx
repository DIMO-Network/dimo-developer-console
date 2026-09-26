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
    title: 'Mobile app',
    description: 'App on the Apple App Store or Google Play Store',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.mobileApp,
  },
  {
    title: 'Web application',
    description: 'Web app with user management',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: buildForValues.webApp,
  },
  {
    title: 'Personal project',
    description: 'Personal project to access vehicle data',
    Icon: UserIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.personalProject,
  },
];

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
  isLoading?: boolean;
}

export const BuildForForm: FC<IProps> = ({ auth, onNext, isLoading }) => {
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
          <p className="text-title text-ink">What are you building?</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full max-w-sm pt-4"
        >
          <div className="ml-1 text-body-sm text-muted">
            What you are looking to launch with DIMO?
          </div>
          {buildForList.map(({ title, description, value, Icon, iconClassName }) => {
            const isSelected = buildFor === value;
            return (
              <Card
                className={classnames(
                  'flex cursor-pointer flex-row items-center justify-between transition-colors',
                  isSelected
                    ? '!bg-control text-ink shadow-selected'
                    : 'text-ink hover:bg-control',
                )}
                onClick={() => handleSelection(value)}
                key={value}
              >
                <div>
                  <p className="text-body font-medium">{title}</p>
                  <p className="text-body-sm text-muted">{description}</p>
                </div>
                <Icon className={iconClassName} />
              </Card>
            );
          })}
          <Card
            className={classnames(
              'flex cursor-pointer flex-col gap-4 transition-colors',
              {
                '!bg-control text-ink shadow-selected':
                  buildFor === buildForValues.somethingElse,
                'text-ink hover:bg-control': buildFor !== buildForValues.somethingElse,
              },
            )}
            onClick={() => handleSelection(buildForValues.somethingElse)}
          >
            <Label htmlFor="buildForText">
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
            <Button
              type="submit"
              variant="brand"
              loading={isLoading}
              role="continue-button"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BuildForForm;
