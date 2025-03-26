'use client';

import { type FC, useEffect, useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { encodeFunctionData } from 'viem';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { Title } from '@/components/Title';
import { useContractGA } from '@/hooks';

import configuration from '@/config';
import DimoLicenseContract from '@/contracts/DimoLicenseContract.json';

import './WorkspaceNameModal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (s: boolean) => void;
  license: {tokenId: number; alias?: string | null};
  onSuccess?: () => void;
}

interface IFormInputs {
  workspaceName: string;
}

export const WorkspaceNameModal: FC<IProps> = ({ isOpen, setIsOpen, license, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { processTransactions } = useContractGA();
  const { setNotification } = useContext(NotificationContext);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<IFormInputs>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      workspaceName: license.alias ?? '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const setLicenseAlias = async ({ workspaceName: licenseAlias }: IFormInputs) => {
    if (licenseAlias === license.alias) return;
    const transaction = {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseContract,
        functionName: 'setLicenseAlias',
        args: [license.tokenId, licenseAlias],
      }),
    };

    await processTransactions([transaction]);
  };

  const onSubmit = async (data: IFormInputs) => {
    setIsLoading(true);
    try {
      await setLicenseAlias(data);
      setNotification(
        'Developer license name updated successfully. Refresh to see your changes.',
        'Success',
        'success',
      );
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setNotification('Failed to update developer license name', 'Oops...', 'error');
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
            Edit Developer License Name
          </Title>
        </div>
        <div className="fields-container">
          <div className="field">
            <Label htmlFor="workspaceName" className="text-sm font-medium">
              Developer License Name
              <TextField
                {...register('workspaceName', {
                  required: 'Developer license name is required',
                  maxLength: {
                    value: 100,
                    message: 'Name cannot exceed 100 characters',
                  },
                })}
                id="workspaceName"
                placeholder="Enter developer license name"
                defaultValue={license.alias ?? ''}
                className="field"
              />
              <p className={"text-text-secondary font-normal"}>This is the namespace used across all your apps. It is a public name visible to other developers and users in the ecosystem.</p>
              {errors?.workspaceName && (
                <TextError errorMessage={errors.workspaceName.message!} />
              )}
            </Label>
          </div>
        </div>
        <div className={"flex flex-col gap-4 pt-6"}>
          <Button type="submit" className="light save-button" loading={isLoading}>
            Save Changes
          </Button>
          <Button type="reset" className="primary-outline save-button" disabled={isLoading} onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkspaceNameModal;
