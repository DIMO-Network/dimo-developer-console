'use client';
import { useForm, SubmitHandler } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { CarRental, ComputerIcon, PhoneIcon } from '@/components/Icons';

interface BuildForFormInputs {
  email: string;
  password: string;
}

const buildForList = [
  {
    text: 'Mobile app - IOS/Android',
    Icon: PhoneIcon,
    iconClassName: 'w-4 h-5',
    value: 'mobile-app',
  },
  {
    text: 'Web application with single account login',
    Icon: ComputerIcon,
    iconClassName: 'w-5 h-5',
    value: 'web-app-single-login',
  },
  {
    text: 'Web application with multi-account management',
    Icon: CarRental,
    iconClassName: 'w-4 h-5',
    value: 'web-app-multi-account',
  },
];

export const BuildForForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BuildForFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit: SubmitHandler<BuildForFormInputs> = (data) => {
    console.log({ data });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 w-full max-w-sm pt-4"
    >
      {buildForList.map(({ text, value, Icon, iconClassName }) => {
        return (
          <Card
            className="flex flex-row card-border justify-between"
            key={value}
          >
            <p className="text-xs font-medium">{text}</p>
            <Icon className={iconClassName} />
          </Card>
        );
      })}
      <Card className="flex flex-col gap-4 card-border">
        <Label htmlFor="password" className="text-xs text-medium">
          Something else
          <TextField
            type="text"
            placeholder="Enter text..."
            {...register('password', {
              required: true,
            })}
          />
        </Label>
        {errors.password && <span>This field is required</span>}
      </Card>
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary">
          Continue
        </Button>
      </div>
    </form>
  );
};

export default BuildForForm;
