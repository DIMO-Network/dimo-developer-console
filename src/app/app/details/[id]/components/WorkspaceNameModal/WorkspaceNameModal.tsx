'use client';

import { type FC, useEffect, useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { encodeFunctionData } from 'viem';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { IApp } from '@/types/app';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { Title } from '@/components/Title';
import { updateApp } from '@/actions/app';
import { useContractGA } from '@/hooks';

import configuration from '@/config';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';

import './WorkspaceNameModal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (s: boolean) => void;
  app: IApp;
}

interface IFormInputs {
  workspaceName: string;
  appName: string;
}

export const WorkspaceNameModal: FC<IProps> = ({ isOpen, setIsOpen, app }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { processTransactions } = useContractGA();
  const { setNotification } = useContext(NotificationContext);
  const {
    name: appName,
    id: appId,
    Workspace: { name: workspaceName, token_id: tokenId },
  } = app;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      workspaceName,
      appName,
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const setLicenseAlias = async ({ workspaceName: licenseAlias }: IFormInputs) => {
    if (licenseAlias === app.Workspace.name) return;
    const transaction = {
      to: configuration.DCX_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoCreditsABI,
        functionName: 'setLicenseAlias',
        args: [tokenId, licenseAlias],
      }),
    };

    await processTransactions([transaction]);
    app.Workspace.name = licenseAlias;
  };

  const updateAppName = async (data: IFormInputs) => {
    const { appName: newAppName } = data;
    if (newAppName === app.name) return;

    try {
      await updateApp(appId!, {
        name: newAppName,
      });
      app.name = newAppName;
    } catch (error) {
      console.error('Failed to update app name', error);
      Sentry.captureException(error);
    }
  };

  const onSubmit = async (data: IFormInputs) => {
    setIsLoading(true);
    try {
      await updateAppName(data);
      await setLicenseAlias(data);
      setNotification(
        'Workspace and app names updated successfully',
        'Success',
        'success',
      );
    } catch (error) {
      setNotification('Failed to update workspace or app name', 'Oops...', 'error');
      Sentry.captureException(error);
    } finally {
      setIsOpen(false);
      reset();
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="workspace-name-modal">
      <form className="workspace-name-content" onSubmit={handleSubmit(onSubmit)}>
        <div className="workspace-name-header">
          <Title className="text-2xl" component="h3">
            Edit Workspace and App Names
          </Title>
          <p className="workspace-name-description">
            Please update the workspace and app names below.
          </p>
        </div>
        <div className="fields-container">
          <div className="field">
            <Label htmlFor="workspaceName" className="text-xs text-medium">
              Workspace Name
              <TextField
                {...register('workspaceName', {
                  required: 'Workspace name is required',
                  maxLength: {
                    value: 100,
                    message: 'Workspace name cannot exceed 100 characters',
                  },
                })}
                id="workspaceName"
                placeholder="Enter Workspace Name"
                defaultValue={workspaceName}
                className="field"
              />
              {errors?.workspaceName && (
                <TextError errorMessage={errors.workspaceName.message!} />
              )}
            </Label>
          </div>
          <div className="field">
            <Label htmlFor="appName" className="text-xs text-medium">
              App Name
              <TextField
                {...register('appName', {
                  required: 'App name is required',
                  maxLength: {
                    value: 100,
                    message: 'App name cannot exceed 100 characters',
                  },
                })}
                id="appName"
                placeholder="Enter App Name"
                defaultValue={appName}
                className="field"
              />
              {errors?.appName && <TextError errorMessage={errors.appName.message!} />}
            </Label>
          </div>
        </div>
        <Button type="submit" className="primary save-button" loading={isLoading}>
          Save Changes
        </Button>
      </form>
    </Modal>
  );
};

export default WorkspaceNameModal;
