'use client';

import { IAuth } from '@/types/auth';
import { FC, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import classnames from 'classnames';
import { TextError } from '@/components/TextError';
import { ComputerIcon, PhoneIcon } from '@/components/Icons';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useGlobalAccount } from '@/hooks';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

interface BuildForFormInputs {
  buildFor: string;
  buildForText?: string;
}

const buildForList = [
  {
    text: 'Just with email',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: 'email',
  },
  {
    text: 'I want a passkey for my wallet',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: 'passkey',
  },
];

export const WalletAssignment: FC<IProps> = ({ onNext }) => {

  const { registerSubOrganization } = useGlobalAccount();

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
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const handleSelection = (selection: string) => {
    setValue('buildFor', selection);
    setIsDirty(true);
  };

  const onSubmit: SubmitHandler<BuildForFormInputs> = async () => {
    setIsDirty(true);
    if (buildFor) {
      const isPasskey = buildFor === 'passkey';
      const {success, emailSent } = await registerSubOrganization(isPasskey);

      if(!success){
        console.error('Error registering sub organization');
        return;
      }

      setEmailSent(emailSent);
      if (!emailSent) {
        onNext('wallet-assignment', {
          isPasskey,
        } as Partial<IAuth>);
      }
    }
  };

  return (
    <>
      {!emailSent && (
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
      )}
      {emailSent && (
        <div className="flex flex-col gap-4 w-full max-w-sm pt-4">
          <p className="text-xs text-medium">
            We have sent you an email with a magic link to continue with the
            wallet creation process.
          </p>
        </div>
      )}
    </>
  );
};

export default WalletAssignment;