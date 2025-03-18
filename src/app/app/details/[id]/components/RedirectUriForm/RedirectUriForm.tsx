import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';

import { useContext, useState, type FC } from 'react';
import { isURL } from 'validator';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { encodeFunctionData } from 'viem';

import { Button } from '@/components/Button';
import { createMyRedirectUri } from '@/actions/app';
import { Label } from '@/components/Label';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useContractGA, useOnboarding } from '@/hooks';
import { IGlobalAccountSession } from '@/types/wallet';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';

import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';

import './RedirectUriForm.css';

interface IRedirectUri {
  uri: string;
}

interface IProps {
  appId: string;
  refreshData: () => void;
  list: IRedirectUri[] | undefined;
}

export const RedirectUriForm: FC<IProps> = ({ appId, refreshData, list }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { workspace } = useOnboarding();
  const { processTransactions } = useContractGA();
  const {
    formState: { errors },
    handleSubmit,
    register,
    getValues,
  } = useForm<IRedirectUri>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const handleSetDomain = async (uri: string) => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!organizationInfo && !workspace) throw new Error('Web3 connection failed');
    const transaction = [
      {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: 'setRedirectUri',
          args: [workspace?.token_id ?? 0, true, uri],
        }),
      },
    ];
    await processTransactions(transaction);
  };

  const addRedirectUri = async () => {
    try {
      setIsLoading(true);
      const { uri } = getValues();
      await handleSetDomain(uri);
      await createMyRedirectUri(uri, appId);
      refreshData();
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

    const isUnique = !list?.find(({ uri }) => uri === str);

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
            loadingColor="primary"
            disabled={!!errors.uri}
          >
            <PlusIcon className="w-5 h-5" />
            Add URI
          </Button>
        </div>
      </form>
      {errors.uri && <div className={"mt-4"}><TextError errorMessage={errors.uri?.message ?? ''} /></div>}
    </div>
  );
};

export default RedirectUriForm;
