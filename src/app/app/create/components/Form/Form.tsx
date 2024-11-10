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
import { encodeFunctionData } from 'viem';
import { LoadingProps, LoadingModal } from '@/components/LoadingModal';
import { formatHexToNumber, formatHex } from '@/utils/formatHex';

const {
  LICENSE_PRICE_USD = 5,
  DCX_IN_USD = 0.001,
  DIMO_IN_USD = 0.16,
} = process.env;

interface IProps {
  workspace?: IWorkspace;
}

export const Form: FC<IProps> = ({ workspace }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const {
    hasEnoughAllowanceDLC,
    hasEnoughAllowanceDCX,
    hasEnoughBalanceDCX,
    hasEnoughBalanceDimo,
    balanceDCX,
    processTransactions,
  } = useContractGA();
  const { organizationInfo } = useGlobalAccount();
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

  const onSubmit = async () => {
    try {
      setIsLoading(true);
      setIsOpened(true);
      setLoadingStatus({
        label: 'Preparing DCX to license the application...',
        status: 'loading',
      });
      const transactions = [];

      if (!hasEnoughBalanceDCX && !hasEnoughBalanceDimo)
        return setNotification(
          'Insufficient DMO or DCX balance',
          'Oops...',
          'error',
        );

      if (!hasEnoughBalanceDCX) {
        transactions.push(...(await mintDCX()));
      }

      transactions.push(...(await prepareIssueInDC()));
      if (transactions.length) {
        await processTransactions(transactions);
      }

      await handleCreateApp();
    } catch (error: unknown) {
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
            BigInt(
              utils.toWei(
                Math.ceil(configuration.desiredAmountOfDimo),
                'ether',
              ),
            ),
          ],
        }),
      });
    }

    // Call mintInDimo 2 parameteres
    const dcxAmountInUSD = balanceDCX * Number(DCX_IN_USD);
    const missingAmount = Math.ceil(Number(LICENSE_PRICE_USD) - dcxAmountInUSD);
    transactions.push({
      to: configuration.DCX_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoCreditsABI,
        functionName: '0xec88fc37',
        args: [
          organizationInfo!.smartContractAddress,
          utils.toWei(Math.ceil(missingAmount / Number(DIMO_IN_USD)), 'ether'),
        ],
      }),
    });
    return transactions;
  };

  const prepareIssueInDC = async () => {
    if (hasEnoughAllowanceDLC) return [];

    return [
      {
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: 'approve',
          args: [
            configuration.DLC_ADDRESS,
            BigInt(
              utils.toWei(
                Math.ceil(configuration.desiredAmountOfDimo),
                'ether',
              ),
            ),
          ],
        }),
      },
    ];
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (!_.isEmpty(workspace)) return workspace;
    if (!organizationInfo)
      throw new Error('There is not organization information');

    setLoadingStatus({
      label: 'Licensing the application...',
      status: 'loading',
    });
    const workspaceName = String(
      utils.fromAscii(workspaceData?.name ?? ''),
    ).padEnd(66, '0');
    setLoadingStatus({
      label: 'Creating developer license...',
      status: 'loading',
    });

    // Call issueInDc 1 parameter
    const transaction = [
      {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: '0xaf509d9f',
          args: [workspaceName],
        }),
      },
    ];

    const { logs } = await processTransactions(transaction);
    const {
      topics: [, rawTokenId = '0x', rawOwner = '0x', rawClientId = '0x'] = [],
    } =
      logs?.find(
        ({ topics: [topic = '0x'] = [] }) =>
          topic === configuration.ISSUED_TOPIC,
      ) ?? {};

    return createWorkspace({
      name: workspaceData.name ?? '',
      token_id: Number(formatHexToNumber(rawTokenId as `0x${string}`)),
      client_id: formatHex(rawClientId as `0x${string}`),
      owner: formatHex(rawOwner as `0x${string}`),
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
      <LoadingModal
        isOpen={isOpened}
        setIsOpen={setIsOpened}
        {...loadingStatus}
      />
      <form onSubmit={handleSubmit(onSubmit)}>
        {(!workspace || Object.keys(workspace).length === 0) && (
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
