import { FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { decodeHex } from '@/utils/formatHex';
import { IAppWithWorkspace } from '@/types/app';
import { IWorkspace } from '@/types/workspace';
import { Label } from '@/components/Label';
import { LoadingProps } from '@/components/LoadingModal';
import { toast } from 'sonner';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { usePayLicenseFee, useMintLicense } from '@/hooks/useTransactions';
import { useMixPanel } from '@/hooks/useMixPanel';
import { BubbleLoader } from '@/components/BubbleLoader';
import configuration from '@/config';
import { isLicenseAliasTooLong, LICENSE_ALIAS_TOO_LONG_KEY } from '@/utils/licenseAlias';

import './Form.css';

interface IProps {
  onSuccess: () => void;
  onClose?: () => void;
}

export const Form: FC<IProps> = ({ onSuccess, onClose }) => {
  const t = useTranslations('app');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { trackEvent } = useMixPanel();
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
        label: t('create.preparing'),
        status: 'loading',
      });
      const { reason } = await payLicenseFee();
      if (reason) {
        return toast.error(reason);
      }
      const { workspace } = getValues();
      await createDeveloperLicense(workspace);
      toast.success(t('create.created'));

      trackEvent('Developer License Created', {
        distinct_id: currentUser!.smartContractAddress!,
        workspace: workspace.name,
      });

      onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'AliasAlreadyInUse') {
          setError('workspace.name', {
            message: t('create.nameInUse'),
          });
        }
      }
      Sentry.captureException(error);
      toast.error(t('create.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const createDeveloperLicense = async (workspaceData: Partial<IWorkspace>) => {
    if (!currentUser) throw new Error('User session is invalid');
    setLoadingStatus({
      label: t('create.creating'),
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
        <p className={'text-center text-body font-medium text-ink'}>
          {loadingStatus?.label ?? t('create.loading')}
        </p>
      </div>
    );
  }
  return (
    <form className="create-app-form" onSubmit={handleSubmit(onSubmit)}>
      <Label htmlFor="namespace">
        {tCommon('workspaceName.label')}
        <TextField
          type="text"
          placeholder={t('create.namePlaceholder')}
          {...register('workspace.name', {
            required: tCommon('validation.required'),
            validate: (name = '') =>
              !isLicenseAliasTooLong(name) || tCommon(LICENSE_ALIAS_TOO_LONG_KEY),
          })}
          role="namespace-input"
        />
        {errors?.workspace?.name && (
          <TextError errorMessage={errors?.workspace?.name?.message ?? ''} />
        )}
        <p className="text-body-sm font-normal text-muted">
          {tCommon('workspaceName.description')}
        </p>
      </Label>
      <div className="flex flex-col gap-2 pt-4">
        <Button type="submit" role="continue-button" loading={isLoading}>
          {tCommon('actions.create')}
        </Button>
        <Button
          type="reset"
          variant="secondary"
          role="cancel-button"
          loading={isLoading}
          onClick={onClose}
        >
          {tCommon('actions.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default Form;
