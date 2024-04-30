'use client';
import { useForm, Controller } from 'react-hook-form';

import { Button } from '@/components/Button';
import { BeachAccessIcon, DeveloperBoardIcon } from '@/components/Icons';
import { IApp } from '@/types/app';
import { Label } from '@/components/Label';
import { MultiCardOption } from '@/components/MultiCardOption';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './Form.css';

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
                  render: () => (
                    <>
                      <div className="flex flex-col gap-1">
                        <p className="text-base">Sanbox</p>
                        <p className="text-xs">
                          Test a limited set of API endpoints.
                        </p>
                      </div>
                      <BeachAccessIcon className="w-5 h-5" />
                    </>
                  ),
                },
                {
                  value: 'production',
                  render: () => (
                    <>
                      <div className="flex flex-col">
                        <p className="text-base">Production</p>
                        <p className="text-xs">
                          Access a full set of API endpoints.
                        </p>
                      </div>
                      <DeveloperBoardIcon className="w-5 h-5" />
                    </>
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
