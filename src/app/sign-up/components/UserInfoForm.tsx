'use client';
import { FC, useContext } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { isEmail } from 'validator';
import { signIn } from 'next-auth/react';

import { Button } from '@/components/Button';
import { existUserEmailOrAddress } from '@/actions/user';
import { IAuth } from '@/types/auth';
import { Label } from '@/components/Label';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

interface UserInfoInputs {
  name: string;
  email: string;
}

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const UserInfoForm: FC<IProps> = ({ auth }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserInfoInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const { setNotification } = useContext(NotificationContext);

  const onSubmit: SubmitHandler<UserInfoInputs> = async (data) => {
    const { existItem } = await existUserEmailOrAddress(data.email, 'email');
    if (existItem) {
      setNotification('The email already exists', 'Wrong email', 'error');
      return;
    }
    updateUser({ ...auth, ...data });
  };

  const updateUser = async (userData: Partial<IAuth>) => {
    signIn('credentials', userData);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full max-w-sm pt-4"
    >
      <Label htmlFor="name" className="text-xs text-medium">
        Name
        <TextField
          type="text"
          placeholder="John Doe"
          {...register('name', {
            required: 'The name is required',
          })}
          role="name-input"
        />
      </Label>
      {errors.name && <TextError errorMessage={errors.name!.message ?? ''} />}
      <Label htmlFor="website" className="text-xs text-medium">
        Email
        <TextField
          type="text"
          placeholder="johndoe@dimo.zone"
          {...register('email', {
            required: 'The email is required',
            validate: {
              isEmail: (str: string = '') => isEmail(str),
            },
          })}
          role="email-input"
        />
      </Label>
      {errors.email && <TextError errorMessage={errors.email!.message ?? ''} />}
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary" role="continue-button">
          Continue
        </Button>
      </div>
    </form>
  );
};

export default UserInfoForm;
