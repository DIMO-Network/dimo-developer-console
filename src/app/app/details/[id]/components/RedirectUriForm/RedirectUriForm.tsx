import _ from 'lodash';

import { useContext, useState, type FC } from 'react';
import { isURL } from 'validator';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { changeNetwork } from '@/utils/contract';
import { createMyRedirectUri } from '@/actions/app';
import { Label } from '@/components/Label';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useContract, useOnboarding } from '@/hooks';

import configuration from '@/config';

import './RedirectUriForm.css';

interface IRedirectUri {
  uri: string;
}

interface IProps {
  appId: string;
  refreshData: () => void;
}

const ISSUE_IN_DIMO_GAS = 60000;

export const RedirectUriForm: FC<IProps> = ({ appId, refreshData }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { isOnboardingCompleted, workspace } = useOnboarding();
  const { address, dimoLicenseContract } = useContract();
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
    if (!isOnboardingCompleted && !dimoLicenseContract && !workspace)
      throw new Error('Web3 connection failed');
    await changeNetwork();
    await dimoLicenseContract?.methods['0xba1bedfc'](
      workspace?.token_id ?? 0,
      true,
      uri,
    ).send({
      from: address,
      gas: String(ISSUE_IN_DIMO_GAS),
      maxFeePerGas: String(configuration.masFeePerGas),
      maxPriorityFeePerGas: String(configuration.gasPrice),
    });
  };

  const addRedirectUri = async () => {
    try {
      setIsLoading(true);
      const { uri } = getValues();
      await handleSetDomain(uri);
      await createMyRedirectUri(uri, appId);
      refreshData();
    } catch (error: unknown) {
      const code = _.get(error, 'code', null);
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
