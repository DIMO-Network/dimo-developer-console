import { useTranslations } from 'next-intl';
import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';

import { useState, type FC } from 'react';
import isURL from 'validator/lib/isURL';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { toast } from 'sonner';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetRedirectUri } from '@/hooks/useTransactions';

import './RedirectUriForm.css';

interface IRedirectUri {
  uri: string;
}

interface IProps {
  refreshData: () => Promise<void>;
  redirectUris: IRedirectUri[] | undefined;
  tokenId: number;
  owner: string;
  onAdded?: (uri: string) => void;
}

export const RedirectUriForm: FC<IProps> = ({
  refreshData,
  redirectUris,
  tokenId,
  owner,
  onAdded,
}) => {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      if (onAdded) onAdded(uri);
      else void refreshData();
      toast.success(t('redirectUri.added'));

      trackEvent('Redirect URI added', {
        distinct_id: owner,
        uri,
        tokenId,
      });
      reset();
    } catch (error: unknown) {
      Sentry.captureException(error);
      const code = get(error, 'code', null);
      if (code === 4001) toast.error(t('errors.transactionDenied'));
      else toast.error(t('redirectUri.createFailed'));
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

    if (!isValidUrl) return t('redirectUri.invalidUrl');
    if (!isUnique) return t('redirectUri.duplicate');
    return true;
  };

  return (
    <div className="redirect-uri-form">
      <form onSubmit={handleSubmit(addRedirectUri)}>
        <div className="field">
          <Label htmlFor="uri">
            <TextField
              {...register('uri', {
                required: t('redirectUri.required'),
                maxLength: {
                  value: 150,
                  message: t('redirectUri.tooLong'),
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
          <Button className="px-4" loading={isLoading} disabled={!!errors.uri}>
            <PlusIcon className="w-5 h-5" />
            {t('redirectUri.add')}
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
