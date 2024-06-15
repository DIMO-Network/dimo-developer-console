'use client';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/Button';
import { IApp } from '@/types/app';
import { Label } from '@/components/Label';
import { MultiCardOption } from '@/components/MultiCardOption';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './Form.css';
import { AppCard } from '@/components/AppCard';
import classNames from 'classnames';

export const Form = () => {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<IApp>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit = () => {};

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="buildForText" className="text-xs text-medium">
        Name
        <TextField
          type="text"
          placeholder="Application name"
          {...register('name', {
            required: true,
          })}
          role="build-for-something-else-input"
        />
        {errors.name && <TextError errorMessage="This field is required" />}
        <p className="text-sm text-grey-200">
          This name is for your reference only
        </p>
      </Label>
      <div className="">
        <Controller
          control={control}
          name="scope"
          rules={{ required: true }}
          render={({ field: { onChange, value: scope } }) => (
            <MultiCardOption
              options={[
                {
                  value: 'sanbox',
                  render: ({ selected }) => (
                    <AppCard
                      name="Sandbox"
                      description="Test a limited set of API endpoints."
                      scope="sandbox"
                      className={classNames('w-full', {
                        '!border-white': selected,
                      })}
                    />
                  ),
                },
                {
                  value: 'production',
                  render: ({ selected }) => (
                    <AppCard
                      name="Production"
                      description="Access a full set of API endpoints."
                      scope="production"
                      className={classNames('w-full', {
                        '!border-white': selected,
                      })}
                    />
                  ),
                },
              ]}
              selected={scope}
              onChange={onChange}
            />
          )}
        />
        {errors.scope && <TextError errorMessage="This field is required" />}
      </div>
      <div className="flex flex-col pt-4">
        <Button type="submit" className="primary" role="continue-button">
          Create application
        </Button>
      </div>
    </form>
  );
};

export default Form;
