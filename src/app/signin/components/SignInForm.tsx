'use client';
import { useForm, SubmitHandler } from 'react-hook-form';

import TextField from '@/components/TextField/TextField';

interface SignInFormInputs {
  email: string;
  password: string;
}

export const SignInForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  console.log({ errors });

  const onSubmit: SubmitHandler<SignInFormInputs> = (data) => {
    console.log({ data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField
        placeholder="Email"
        type="email"
        {...register('email', {
          required: true,
        })}
      />
      {errors.email && <span>This field is required</span>}
      <TextField
        type="password"
        placeholder="Password"
        {...register('password', {
          required: true,
        })}
      />
      {errors.password && <span>This field is required</span>}
      <input type="submit" />
    </form>
  );
};

export default SignInForm;
