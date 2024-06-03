import { isURL } from 'validator';
import { PlusIcon } from '@heroicons/react/24/outline';
import { type FC } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './RedirectUriForm.css';

interface IRedirectUri {
  redirectUri: string;
}

export const RedirectUriForm: FC = () => {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<IRedirectUri>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const addSigner = () => {};

  return (
    <div className="redirect-uri-form">
      <form onSubmit={handleSubmit(addSigner)}>
        <div className="field">
          <Label htmlFor="redirectUri">
            <TextField
              {...register('redirectUri', {
                required: 'Please enter the redirect URI',
                validate: {
                  url: (str = '') => isURL(str) || 'Invalid Redirect URI',
                },
              })}
              placeholder="www.google.com"
              className="redirectUri"
              role="redirect-url-input"
            />
          </Label>
          {errors.redirectUri && (
            <TextError errorMessage={errors.redirectUri?.message ?? ''} />
          )}
        </div>
        <div className="cta">
          <Button className="primary-outline px-4">
            <PlusIcon className="w-5 h-5 mr-2" />
            Add URI
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RedirectUriForm;
