import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';

import { useContext, useState, type FC } from 'react';
import { isURL } from 'validator';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useMixPanel, useSetRedirectUri } from '@/hooks';

import './RedirectUriForm.css';

interface IRedirectUri {
  uri: string;
}

interface IProps {
  refreshData: () => Promise<void>;
  redirectUris: IRedirectUri[] | undefined;
  tokenId: number;
  owner: string;
}

export const RedirectUriForm: FC<IProps> = ({
  refreshData,
  redirectUris,
  tokenId,
  owner,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { trackEvent } = useMixPanel();
  const {
    formState: { errors },
    handleSubmit,
    register,
    getValues,
    reset,
  } = useForm<IRedirectUri>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const setRedirectUri = useSetRedirectUri(tokenId);

  const addRedirectUri = async () => {
    try {
      setIsLoading(true);
      const { uri } = getValues();
      await setRedirectUri(uri, true);
      await refreshData();
      setNotification(
        'Successfully added the redirect URI. Refresh the page to view your changes.',
        'Success!',
        'success',
      );

      trackEvent('Redirect URI added', {
        distinct_id: owner,
        uri,
        tokenId,
      });
      reset();
    } catch (error: unknown) {
      Sentry.captureException(error);
      const code = get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while creating the redirect URI',
          'Oops...',
          'error',
        );
    } finally {
      setIsLoading(false);
    }
  };

  const validateUrl = (str = '') => {
    const isValidUrl = isURL(str, {
      require_protocol: true,
      require_tld: false,
      protocols: ['http', 'https'],
      allow_protocol_relative_urls: false,
    });

    const isUnique = !redirectUris?.find(({ uri }) => uri === str);

    if (!isValidUrl) return 'Please enter a valid URL, must include http:// or https://';
    if (!isUnique) return 'The URL is already in the list';
    return true;
  };

  return (
    <div className="redirect-uri-form">
      <form onSubmit={handleSubmit(addRedirectUri)}>
        <div className="field">
          <Label htmlFor="uri">
            <TextField
              {...register('uri', {
                required: 'Please enter the redirect URI',
                maxLength: {
                  value: 150,
                  message: 'The name should has maximum 150 characters',
                },
                validate: {
                  url: validateUrl,
                },
              })}
              placeholder="https://www.google.com"
              className="redirectUri"
              role="redirect-url-input"
            />
          </Label>
        </div>
        <div className="cta flex-[0.2]">
          <Button
            className="white with-icon px-4"
            loading={isLoading}
            disabled={!!errors.uri}
          >
            <PlusIcon className="w-5 h-5" />
            Add URI
          </Button>
        </div>
      </form>
      {errors.uri && (
        <div className={'mt-4'}>
          <TextError errorMessage={errors.uri?.message ?? ''} />
        </div>
      )}
    </div>
  );
};

export default RedirectUriForm;
