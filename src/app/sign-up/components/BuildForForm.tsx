'use client';
import { FC, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import classnames from 'classnames';
import { useTranslations } from 'next-intl';

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
  mobileApp = 'mobile-app',
  webApp = 'web-app',
  personalProject = 'personal-project',
  somethingElse = 'something-else',
}

const buildForList = [
  {
    key: 'mobileApp',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: buildForValues.mobileApp,
  },
  {
    key: 'webApp',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: buildForValues.webApp,
  },
  {
    key: 'personalProject',
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
  const t = useTranslations('sign-up');
  const tCommon = useTranslations('common');
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
          <p className="text-title text-ink">{t('buildFor.title')}</p>
        </div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 w-full max-w-sm pt-4"
        >
          <div id="build-for-prompt" className="ml-1 text-body-sm text-muted">
            {t('buildFor.prompt')}
          </div>
          {/* Resting card on the sheet; hover is a half step toward the selected
              fill (control/70 over the sheet), selected = control + ink edge. */}
          <div
            role="radiogroup"
            aria-labelledby="build-for-prompt"
            className="flex flex-col gap-4"
          >
            {buildForList.map(({ key, value, Icon, iconClassName }) => {
              const isSelected = buildFor === value;
              return (
                <Card
                  role="radio"
                  aria-checked={isSelected}
                  // `!` on the hover too: Card.css's background is outside
                  // Tailwind's layers, so it beats any utility that isn't important.
                  className={classnames(
                    'flex cursor-pointer flex-row items-center justify-between transition-colors',
                    isSelected
                      ? 'bg-control! text-ink shadow-selected'
                      : 'text-ink hover:bg-control/70!',
                  )}
                  onClick={() => handleSelection(value)}
                  key={value}
                >
                  <div>
                    <p className="text-body font-medium">{t(`buildFor.${key}.title`)}</p>
                    <p className="text-body-sm text-muted">
                      {t(`buildFor.${key}.description`)}
                    </p>
                  </div>
                  <Icon className={iconClassName} />
                </Card>
              );
            })}
          </div>
          <Card
            className={classnames(
              'flex cursor-pointer flex-col gap-4 transition-colors',
              {
                'bg-control! text-ink shadow-selected':
                  buildFor === buildForValues.somethingElse,
                'text-ink hover:bg-control/70!':
                  buildFor !== buildForValues.somethingElse,
              },
            )}
            onClick={() => handleSelection(buildForValues.somethingElse)}
          >
            <Label htmlFor="buildForText">
              {t('buildFor.somethingElse')}
              <TextField
                type="text"
                placeholder={t('buildFor.somethingElsePlaceholder')}
                {...register('buildForText', {
                  required:
                    buildFor === buildForValues.somethingElse &&
                    tCommon('validation.required'),
                  maxLength: { value: 150, message: t('buildFor.maxLength') },
                })}
                role="build-for-something-else-input"
              />
            </Label>
            {errors.buildForText && (
              <TextError
                errorMessage={
                  errors.buildForText.message || tCommon('validation.required')
                }
              />
            )}
          </Card>
          <div className="flex flex-col items-center">
            {isDirty && !buildFor && !buildForText && (
              <TextError errorMessage={t('buildFor.selectOption')} />
            )}
          </div>
          <div className="flex flex-col pt-4">
            <Button
              type="submit"
              variant="brand"
              loading={isLoading}
              role="continue-button"
            >
              {tCommon('actions.continue')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BuildForForm;
