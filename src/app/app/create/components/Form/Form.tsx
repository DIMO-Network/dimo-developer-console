'use client';
import { FC, useContext, useState } from 'react';
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
import { useContract } from '@/hooks';

import configuration from '@/config';

import './Form.css';

const ISSUE_IN_DIMO_GAS = 500000;

interface IProps {
  isOnboardingCompleted?: boolean;
  workspace?: IWorkspace;
}

export const Form: FC<IProps> = ({ isOnboardingCompleted, workspace }) => {
  const [isOpenedCreditsModal, setIsOpenedCreditsModal] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { dimoLicenseContract } = useContract();
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
    if (isOnboardingCompleted) {
      handleCreateApp();
    } else {
      setIsOpenedCreditsModal(true);
    }
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (isOnboardingCompleted && workspace) return workspace;
    if (!dimoLicenseContract) throw new Error('Web3 connection failed');

    const workspaceName = String(
      utils.fromAscii(workspaceData?.name ?? '')
    ).padEnd(66, '0');

    const {
      events: {
        Issued: {
          returnValues: { clientId = '', owner = '', tokenId = 0 } = {},
        } = {},
      } = {},
    } = await dimoLicenseContract.methods['0x77a5b102'](workspaceName).send({
      from: address,
      gas: String(ISSUE_IN_DIMO_GAS),
      maxFeePerGas: String(configuration.masFeePerGas),
      maxPriorityFeePerGas: String(configuration.gasPrice),
    });

    return createWorkspace({
      name: workspaceData.name ?? '',
      token_id: Number(tokenId),
      client_id: clientId as string,
      owner: owner as string,
    });
  };

  const handleCreateApp = async () => {
    try {
      setIsLoading(true);
      const { workspace, app } = getValues();
      const { id: workspaceId = '' } = await handleCreateWorkspace(workspace);
      await createApp(workspaceId, {
        name: app.name,
        scope: app.scope,
      });
      router.replace('/app');
    } catch (error: unknown) {
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
