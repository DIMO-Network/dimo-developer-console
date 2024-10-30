'use client';
import { useRouter } from 'next/navigation';
import { FC, useContext, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import _ from 'lodash';
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
import { useContractGA, useGlobalAccount } from '@/hooks';
import { IAppWithWorkspace } from '@/types/app';
import { IWorkspace } from '@/types/workspace';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';

import configuration from '@/config';

import './Form.css';
import { IKernelOperationStatus } from '@/types/wallet';
import { bundlerActions, ENTRYPOINT_ADDRESS_V07 } from 'permissionless';
import { parseUnits, encodeFunctionData } from 'viem';
import { LoadingProps, LoadingModal } from '@/components/LoadingModal';


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
    hasEnoughAllowanceDLC,
    hasEnoughAllowanceDCX,
    hasEnoughBalanceDCX,
    hasEnoughBalanceDimo,
    balanceDCX,
    balanceDimo,
  } = useContractGA();
  const { organizationInfo, getKernelClient } = useGlobalAccount();
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
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const [isOpened, setIsOpened] = useState<boolean>(false);
  console.log({ balanceDimo, balanceDCX });

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      setIsOpened(true);
      setLoadingStatus({
        label: 'Preparing DCX to license the application...',
        status: 'loading',
      });
      const transactions = [];

      if (!hasEnoughBalanceDCX && !hasEnoughBalanceDimo) setNotification('Insufficient Dimo or DCX balance', 'Oops...', 'error');

      if (!hasEnoughBalanceDCX) {
        transactions.push(...(await mintDCX()));
      }

      transactions.push(...(await prepareIssueInDC()));
      await processTransactions(transactions);
      await handleCreateApp();
    } catch (error: unknown) {
      console.log(error);
      setNotification(
        'Something went wrong while confirming the transaction',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
      setIsOpened(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processTransactions = async (transactions: Array<any>) => {
    if (!organizationInfo) return {} as IKernelOperationStatus;
    const kernelClient = await getKernelClient(organizationInfo);
    const dcxExchangeOpHash = await kernelClient.sendUserOperation({
      userOperation: {
        callData: await kernelClient.account.encodeCallData(transactions),
      },
    });

    const bundlerClient = kernelClient.extend(
      bundlerActions(ENTRYPOINT_ADDRESS_V07),
    );

    const { success, reason } =
      await bundlerClient.waitForUserOperationReceipt({
        hash: dcxExchangeOpHash,
      });

    console.log({ reason, success });

    if (reason) return Promise.reject(reason);
  };

  const mintDCX = async () => {
    const transactions = [];
    if (!hasEnoughAllowanceDCX) {
      transactions.push({
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: 'approve',
          args: [
            configuration.DCX_ADDRESS,
            BigInt(utils.toWei(configuration.desiredAmountOfDimo, 'ether')),
          ],
        }),
      });
    }

    // Call mintInDimo 2 parameteres
    transactions.push({
      to: configuration.DCX_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoCreditsABI,
        functionName: 'mintInDimo',
        args: [
          organizationInfo!.smartContractAddress,
          configuration.desiredAmountOfDimo,
        ],
      }),
    });
    return transactions;
  };

  const prepareIssueInDC = async () => {
    if (hasEnoughAllowanceDLC) return [];

    return [{
      to: configuration.DC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoABI,
        functionName: 'approve',
        args: [
          configuration.DLC_ADDRESS,
          parseUnits(String(configuration.desiredAmountOfDimo), 18),
        ],
      }),
    }];
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (!_.isEmpty(workspace)) return workspace;
    if (!organizationInfo) return {} as IKernelOperationStatus;

    setLoadingStatus({
      label: 'Licensing the application...',
      status: 'loading',
    });
    const workspaceName = String(
      utils.fromAscii(workspaceData?.name ?? '')
    ).padEnd(66, '0');
    setLoadingStatus({
      label: 'Creating developer license...',
      status: 'loading',
    });
    const kernelClient = await getKernelClient(organizationInfo);
    const dcxExchangeOpHash = await kernelClient.sendUserOperation({
      userOperation: {
        callData: await kernelClient.account.encodeCallData({
          to: configuration.DLC_ADDRESS,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: DimoLicenseABI,
            functionName: '0xaf509d9f',
            args: [
              workspaceName,
            ],
          }),
        }),
      },
    });
    console.log({ dcxExchangeOpHash });

    const bundlerClient = kernelClient.extend(
      bundlerActions(ENTRYPOINT_ADDRESS_V07),
    );

    const event =
      await bundlerClient.waitForUserOperationReceipt({
        hash: dcxExchangeOpHash,
      });

    const {
      events: {
        Issued: {
          returnValues: { clientId = '', owner = '', tokenId = 0 } = {},
        } = {},
      } = {},
    } = event.receipt;

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
      <LoadingModal
        isOpen={isOpened}
        setIsOpen={setIsOpened}
        {...loadingStatus}
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
