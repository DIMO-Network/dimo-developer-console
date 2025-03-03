'use client';

import { type FC } from 'react';
import { useForm } from 'react-hook-form';
import { encodeFunctionData } from 'viem';

import { Button } from '@/components/Button';
import { IApp } from '@/types/app';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
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
  const { processTransactions } = useContractGA();
  const {
    name: appName,
    id: appId,
    Workspace: { name: workspaceName, token_id: tokenId },
  } = app;
  const { register, handleSubmit, reset } = useForm<IFormInputs>({
    defaultValues: {
      workspaceName,
      appName,
    },
  });

  const setLicenseAlias = async (licenseAlias: string) => {
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
  };

  const updateAppName = async (data: IFormInputs) => {
    const { appName, workspaceName } = data;
    try {
      await updateApp(appId!, {
        name: appName,
      });
      await setLicenseAlias(workspaceName);
    } catch (error) {
      console.error('Failed to update app name', error);
    }
  };

  const onSubmit = (data: IFormInputs) => {
    updateAppName(data);
    setIsOpen(false);
    reset();
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
                {...register('workspaceName', { required: 'This field is required' })}
                id="workspaceName"
                placeholder="Enter Workspace Name"
                defaultValue={workspaceName}
                className="field"
              />
            </Label>
          </div>
          <div className="field">
            <Label htmlFor="appName" className="text-xs text-medium">
              App Name
              <TextField
                {...register('appName')}
                id="appName"
                placeholder="Enter App Name"
                defaultValue={appName}
                className="field"
              />
            </Label>
          </div>
        </div>
        <Button type="submit" className="primary save-button">
          Save Changes
        </Button>
      </form>
    </Modal>
  );
};

export default WorkspaceNameModal;
