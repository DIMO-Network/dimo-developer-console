import { FC, useContext, useState } from 'react';
import { useForm } from 'react-hook-form';

import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { decodeHex } from '@/utils/formatHex';
import { IAppWithWorkspace } from '@/types/app';
import { IWorkspace } from '@/types/workspace';
import { Label } from '@/components/Label';
import { LoadingProps } from '@/components/LoadingModal';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useGlobalAccount, usePayLicenseFee, useMintLicense } from '@/hooks';

import configuration from '@/config';
import './Form.css';
import { BubbleLoader } from '@/components/BubbleLoader';

interface IProps {
  workspace?: IWorkspace;
  onSuccess: () => void;
  onClose?: () => void;
}

export const Form: FC<IProps> = ({ onSuccess, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { currentUser } = useGlobalAccount();
  const {
    formState: { errors },
    handleSubmit,
    register,
    getValues,
    setError,
  } = useForm<IAppWithWorkspace>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const payLicenseFee = usePayLicenseFee();
  const mintLicense = useMintLicense();

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      setLoadingStatus({
        label: 'Preparing to create the developer license',
        status: 'loading',
      });
      const { reason } = await payLicenseFee();
      if (reason) {
        return setNotification(reason, 'Oops...', 'error');
      }
      const { workspace } = getValues();
      await createDeveloperLicense(workspace);
      setNotification(
        'Developer license created! Refresh the page to see your changes.',
        'Success',
        'success',
      );
      onSuccess();
    } catch (error: unknown) {
      console.log('error in form', (error as Error).message);
      if ((error as Error).message === 'AliasAlreadyInUse') {
        setError('workspace.name', {
          message:
            'Developer License name already in use. Please try again using a different name.',
        });
      }
      Sentry.captureException(error);
      setNotification(
        'Something went wrong while confirming the transaction',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createDeveloperLicense = async (workspaceData: Partial<IWorkspace>) => {
    if (!currentUser) throw new Error('User session is invalid');
    setLoadingStatus({
      label: 'Creating developer license...',
      status: 'loading',
    });
    const { logs } = await mintLicense(workspaceData?.name ?? '');
    const { topics: [, rawTokenId = '0x'] = [] } =
      logs?.find(
        ({ topics: [topic = '0x'] = [] }) => topic === configuration.ISSUED_TOPIC,
      ) ?? {};
    return Number(decodeHex(rawTokenId as `0x${string}`, 'uint256'));
  };

  if (isLoading) {
    return (
      <div className={'flex flex-col flex-1 items-center gap-2'}>
        <BubbleLoader isLoading={true} />
        <p className={'text-base font-bold text-center'}>
          {loadingStatus?.label ?? 'Loading'}
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="namespace" className="text-sm font-medium">
        Developer License Name
        <TextField
          type="text"
          placeholder="My project"
          {...register('workspace.name', {
            required: 'This field is required',
            maxLength: {
              value: 32,
              message: 'The name should has maximum 32 characters',
            },
          })}
          role="namespace-input"
        />
        {errors?.workspace?.name && (
          <TextError errorMessage={errors?.workspace?.name?.message ?? ''} />
        )}
        <p className="text-sm text-text-secondary font-normal">
          This is the namespace used across all your apps. It is a public name visible to
          other developers and users in the ecosystem.
        </p>
      </Label>
      <div className="flex flex-col pt-4 gap-4">
        <Button
          type="submit"
          className="white"
          role="continue-button"
          loading={isLoading}
        >
          Create
        </Button>
        <Button
          type="reset"
          className="dark"
          role="cancel-button"
          loading={isLoading}
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default Form;
