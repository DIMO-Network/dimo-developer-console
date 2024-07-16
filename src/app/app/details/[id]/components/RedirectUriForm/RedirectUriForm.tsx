import { useContext, useState, type FC } from 'react';
import { isURL } from 'validator';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { createMyRedirectUri } from '@/actions/app';
import { Label } from '@/components/Label';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './RedirectUriForm.css';

interface IRedirectUri {
  uri: string;
}

interface IProps {
  appId: string;
  refreshData: () => void;
}

export const RedirectUriForm: FC<IProps> = ({ appId, refreshData }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const {
    formState: { errors },
    handleSubmit,
    register,
    getValues,
  } = useForm<IRedirectUri>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const addSigner = async () => {
    try {
      setIsLoading(true);
      const { uri } = getValues();
      await createMyRedirectUri(uri, appId);
      refreshData();
    } catch (error: unknown) {
      setNotification(
        'Something went wrong while creating the redirect URI',
        'Oops...',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="redirect-uri-form">
      <form onSubmit={handleSubmit(addSigner)}>
        <div className="field">
          <Label htmlFor="uri">
            <TextField
              {...register('uri', {
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
          {errors.uri && <TextError errorMessage={errors.uri?.message ?? ''} />}
        </div>
        <div className="cta">
          <Button
            className="primary-outline px-4"
            loading={isLoading}
            loadingColor="primary"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add URI
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RedirectUriForm;
