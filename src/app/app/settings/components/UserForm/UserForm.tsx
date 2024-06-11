'use client';
import { type FC } from 'react';
import { useForm } from 'react-hook-form';

import { IUser } from '@/types/user';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';

import './UserForm.css';

interface IProps {
  user: IUser;
}

export const UserForm: FC<IProps> = ({ user }) => {
  const { handleSubmit, register } = useForm<IUser>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    values: user,
  });

  const onSubmit = () => {};

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="name" className="text-xs text-medium">
        Full name
        <TextField
          type="text"
          placeholder="John Doe"
          {...register('name', {
            required: 'The name is required',
          })}
          disabled
          role="user-name-input"
        />
      </Label>
      <Label htmlFor="auth_login" className="text-xs text-medium">
        Github handle
        <TextField
          type="text"
          placeholder="@johndoe"
          {...register('auth_login', {
            required: 'The authentication login is required',
          })}
          role="user-login-input"
          disabled
        />
      </Label>
      <Label htmlFor="email" className="text-xs text-medium">
        Email
        <TextField
          type="text"
          placeholder="johndoe@dimo.zone"
          {...register('email', {
            required: 'The email is required',
          })}
          role="user-email-input"
          disabled
        />
      </Label>
    </form>
  );
};

export default UserForm;
