'use client';
import { useRouter } from 'next/navigation';
import { FC, useContext, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { utils } from 'web3';

import classNames from 'classnames';

import { createApp } from '@/actions/app';
import { createWorkspace } from '@/actions/workspace';
import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { MultiCardOption } from '@/components/MultiCardOption';
import { SpendingLimitModal } from '@/components/SpendingLimitModal';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { NotificationContext } from '@/context/notificationContext';
import { useContractGA } from '@/hooks';
import { IAppWithWorkspace } from '@/types/app';
import { IWorkspace } from '@/types/workspace';

import configuration from '@/config';

import './Form.css';


interface IProps {
  isOnboardingCompleted?: boolean;
  workspace?: IWorkspace;
}

export const Form: FC<IProps> = ({ isOnboardingCompleted, workspace }) => {
  const [isOpenedCreditsModal, setIsOpenedCreditsModal] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const {
    dimoCreditsContract,
    licenseContract,
    dimoContract,
    hasEnoughAllowanceDLC,
    hasEnoughAllowanceDCX,
    hasEnoughBalanceDCX,
    hasEnoughBalanceDimo,
    address,
  } = useContractGA();
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

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      if (!hasEnoughBalanceDCX && !hasEnoughBalanceDimo) setNotification('Insufficient Dimo or DCX balance', 'Oops...', 'error');

      if (!hasEnoughBalanceDCX) {
        await mintDCX();
      }

      await prepareIssueInDC();
      await handleCreateApp();
    } catch (error: unknown) {
      setNotification(
        'Something went wrong while confirming the transaction',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const mintDCX = async () => {
    if (!hasEnoughAllowanceDCX) {
      await dimoContract.write.approve([configuration.DCX_ADDRESS, configuration.desiredAmountOfDimo]);
    }

    // Call mintInDimo 2 parameteres
    await dimoCreditsContract.write['0xec88fc37']([address, configuration.desiredAmountOfDimo]);
  };

  const prepareIssueInDC = async () => {
    if (hasEnoughAllowanceDLC) return;

    await dimoContract.write.approve([configuration.DLC_ADDRESS, configuration.desiredAmountOfDCX]);
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (workspace) return workspace;

    const workspaceName = String(
      utils.fromAscii(workspaceData?.name ?? ''),
    ).padEnd(66, '0');

    const {
      events: {
        Issued: {
          returnValues: { clientId = '', owner = '', tokenId = 0 } = {},
        } = {},
      } = {},
    } = await licenseContract.write['0xaf509d9f']([workspaceName]);

    return createWorkspace({
      name: workspaceData.name ?? '',
      token_id: Number(tokenId),
      client_id: clientId as string,
      owner: owner as string,
    });
  };

  const handleCreateApp = async () => {
    const { workspace, app } = getValues();
    const { id: workspaceId = '' } = await handleCreateWorkspace(workspace);
    await createApp(workspaceId, {
      name: app.name,
      scope: app.scope,
    });
    router.replace('/app');
  };

  return (
    <>
      <SpendingLimitModal
        isOpen={isOpenedCreditsModal}
        setIsOpen={setIsOpenedCreditsModal}
        onSubmit={handleCreateApp}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        {!isOnboardingCompleted && (
          <Label htmlFor="namespace" className="text-xs text-medium">
            Project Namespace
            <TextField
              type="text"
              placeholder="Project Namespace"
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
              <TextError
                errorMessage={errors?.workspace?.name?.message ?? ''}
              />
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
              required: 'This field is required',
              maxLength: {
                value: 32,
                message: 'The name should has maximum 32 characters',
              },
            })}
            role="name-input"
          />
          {errors?.app?.name && (
            <TextError errorMessage={errors?.app?.name?.message ?? ''} />
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
                        description="Connect to development vehicles"
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
                        description="Connect to production vehicles"
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
