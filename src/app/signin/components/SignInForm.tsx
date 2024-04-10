'use client';
import { useForm, SubmitHandler } from 'react-hook-form';

import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';

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

  const onSubmit: SubmitHandler<SignInFormInputs> = (data) => {
    console.log({ data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Label htmlFor="email">
          Email
          <TextField
            placeholder="johndoe@gmail.com"
            type="email"
            {...register('email', {
              required: true,
            })}
          />
        </Label>
        {errors.email && <span>This field is required</span>}
        <Label htmlFor="password">
          Password
          <TextField
            type="password"
            placeholder="******"
            {...register('password', {
              required: true,
            })}
          />
        </Label>
        {errors.password && <span>This field is required</span>}
        <div className="flex justify-center">
          <Anchor href="#" className="text-xs opacity-50">
            Forgot password?
          </Anchor>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Button type="submit" className="primary">
          Sign in
        </Button>
        <Button type="submit">Sign in with Google</Button>
        <div className="flex justify-center">
          <Anchor href="#" className="primary">
            Sign Up
          </Anchor>
        </div>
      </div>
    </form>
  );
};

export default SignInForm;
