'use client';
import { useContext, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { utils } from 'web3';

import _ from 'lodash';
import classNames from 'classnames';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';
import { createApp } from '@/actions/app';
import { createWorkspace } from '@/actions/workspace';
import { IAppWithWorkspace } from '@/types/app';
import { IWorkspace } from '@/types/workspace';
import { Label } from '@/components/Label';
import { MultiCardOption } from '@/components/MultiCardOption';
import { NotificationContext } from '@/context/notificationContext';
import { SpendingLimitModal } from '@/components/SpendingLimitModal';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useOnboarding } from '@/hooks';

import './Form.css';

export const Form = () => {
  const [isOpenedCreditsModal, setIsOpenedCreditsModal] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { isOnboardingCompleted, workspace } = useOnboarding();
  const { address } = useAccount();
  const router = useRouter();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    getValues,
  } = useForm<IAppWithWorkspace>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const onSubmit = () => {
    setIsOpenedCreditsModal(true);
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (isOnboardingCompleted && workspace) return workspace;

    return createWorkspace({
      name: workspaceData.name ?? '',
      token_id: 1,
      client_id: utils.randomHex(32),
      owner: address as string,
    });
  };

  const handleSpendingLimit = async () => {
    try {
      setIsLoading(true);
      const { workspace, app } = getValues();
      const { id: workspaceId = '' } = await handleCreateWorkspace(workspace);
      console.log({ workspaceId });
      await createApp(workspaceId, {
        name: app.name,
        scope: app.scope,
      });
      router.replace('/app');
    } catch (error: unknown) {
      console.error(error);
      const code = _.get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while confirming the transaction',
          'Oops...',
          'error'
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SpendingLimitModal
        isOpen={isOpenedCreditsModal}
        setIsOpen={setIsOpenedCreditsModal}
        onSubmit={handleSpendingLimit}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        {!isOnboardingCompleted && (
          <Label htmlFor="namespace" className="text-xs text-medium">
            Project Namespace
            <TextField
              type="text"
              placeholder="Project Namespace"
              {...register('workspace.name', {
                required: true,
              })}
              role="namespace-input"
            />
            {errors?.workspace?.name && (
              <TextError errorMessage="This field is required" />
            )}
            <p className="text-sm text-grey-200">
              This is the namespace used across all your apps
            </p>
          </Label>
        )}
        <Label htmlFor="name" className="text-xs text-medium">
          Name
          <TextField
            type="text"
            placeholder="Application name"
            {...register('app.name', {
              required: true,
            })}
            role="name-input"
          />
          {errors?.app?.name && (
            <TextError errorMessage="This field is required" />
          )}
          <p className="text-sm text-grey-200">
            This name is for your reference only
          </p>
        </Label>
        <div className="">
          <Controller
            control={control}
            name="app.scope"
            rules={{ required: true }}
            render={({ field: { onChange, value: scope } }) => (
              <MultiCardOption
                options={[
                  {
                    value: 'sanbox',
                    render: ({ selected }) => (
                      <AppCard
                        name="Sandbox"
                        description="Test a limited set of API endpoints."
                        scope="sandbox"
                        className={classNames('w-full', {
                          '!border-white': selected,
                        })}
                      />
                    ),
                  },
                  {
                    value: 'production',
                    render: ({ selected }) => (
                      <AppCard
                        name="Production"
                        description="Access a full set of API endpoints."
                        scope="production"
                        className={classNames('w-full', {
                          '!border-white': selected,
                        })}
                      />
                    ),
                  },
                ]}
                selected={scope}
                onChange={onChange}
              />
            )}
          />
          {errors?.app?.scope && (
            <TextError errorMessage="This field is required" />
          )}
        </div>
        <div className="flex flex-col pt-4">
          <Button
            type="submit"
            className="primary"
            role="continue-button"
            loading={isLoading}
          >
            Create application
          </Button>
        </div>
      </form>
    </>
  );
};

export default Form;
