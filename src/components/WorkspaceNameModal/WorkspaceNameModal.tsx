'use client';

import { useTranslations } from 'next-intl';
import { type FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Abi, encodeFunctionData } from 'viem';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { toast } from 'sonner';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { Title } from '@/components/Title';
import { useContractGA } from '@/hooks/useContractGA';
import { isLicenseAliasTooLong, LICENSE_ALIAS_TOO_LONG_KEY } from '@/utils/licenseAlias';
import { assertUserOperation } from '@/utils/userOperation';

import configuration from '@/config';
import DimoLicenseContract from '@/contracts/DimoLicenseContract.json';

import './WorkspaceNameModal.css';

interface IProps {
  isOpen: boolean;
  setIsOpen: (s: boolean) => void;
  license: { tokenId: number; alias?: string | null };
  onSuccess?: () => Promise<void>;
}

interface IFormInputs {
  workspaceName: string;
}

export const WorkspaceNameModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  license,
  onSuccess,
}) => {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const { processTransactions } = useContractGA();
  const {
    register,
    handleSubmit,
    setError,
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
    assertUserOperation(
      await processTransactions([transaction], { abi: DimoLicenseContract as Abi }),
    );
  };

  const onSubmit = async (data: IFormInputs) => {
    setIsLoading(true);
    try {
      await setLicenseAlias(data);
      toast.success(t('workspaceName.updated'));
      if (onSuccess) {
        await onSuccess();
      }
      setIsOpen(false);
      reset();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (error instanceof Error) {
        if (error.message === 'AliasAlreadyInUse') {
          setError('workspaceName', {
            message: t('workspaceName.inUse'),
          });
        }
      }
      toast.error(t('workspaceName.failed'));
      Sentry.captureException(error);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="workspace-name-modal">
      <form className="workspace-name-content" onSubmit={handleSubmit(onSubmit)}>
        <div className="workspace-name-header">
          <Title className="text-panel-title" component="h3">
            {t('workspaceName.title')}
          </Title>
        </div>
        <div className="fields-container">
          <div className="field">
            <Label htmlFor="workspaceName">
              {t('workspaceName.label')}
              <TextField
                {...register('workspaceName', {
                  required: t('workspaceName.required'),
                  validate: (name) =>
                    !isLicenseAliasTooLong(name) || t(LICENSE_ALIAS_TOO_LONG_KEY),
                })}
                id="workspaceName"
                placeholder={t('workspaceName.placeholder')}
                defaultValue={license.alias ?? ''}
                className="field"
              />
              <p className={'font-normal text-muted'}>{t('workspaceName.description')}</p>
              {errors?.workspaceName && (
                <TextError errorMessage={errors.workspaceName.message!} />
              )}
            </Label>
          </div>
        </div>
        <div className={'flex flex-col gap-4 pt-6'}>
          <Button
            type="submit"
            variant="primary"
            className="save-button"
            loading={isLoading}
          >
            {t('actions.saveChanges')}
          </Button>
          <Button
            type="reset"
            variant="secondary"
            className="save-button"
            disabled={isLoading}
            onClick={() => setIsOpen(false)}
          >
            {t('actions.cancel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default WorkspaceNameModal;
