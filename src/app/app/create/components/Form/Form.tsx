'use client';
import { FC, useContext, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { encodeFunctionData } from 'viem';
import { useRouter } from 'next/navigation';
import { utils } from 'web3';

import { isEmpty } from 'lodash';
import classNames from 'classnames';
import * as Sentry from '@sentry/nextjs';

import { AppCard } from '@/components/AppCard';
import { Button } from '@/components/Button';
import { createApp } from '@/actions/app';
import { createWorkspace } from '@/actions/workspace';
import { decodeHex } from '@/utils/formatHex';
import { IAppWithWorkspace } from '@/types/app';
import {
  IDesiredTokenAmount,
  IGlobalAccountSession,
  ITokenBalance,
} from '@/types/wallet';
import { IWorkspace } from '@/types/workspace';
import { Label } from '@/components/Label';
import { LoadingProps, LoadingModal } from '@/components/LoadingModal';
import { MultiCardOption } from '@/components/MultiCardOption';
import { NotificationContext } from '@/context/notificationContext';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { useContractGA } from '@/hooks';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';

import configuration from '@/config';
import DimoABI from '@/contracts/DimoTokenContract.json';
import DimoCreditsABI from '@/contracts/DimoCreditABI.json';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';

import './Form.css';

const { DCX_IN_USD = 0.001 } = process.env;

interface IProps {
  workspace?: IWorkspace;
}

export const Form: FC<IProps> = ({ workspace }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);
  const { checkEnoughBalance, getDesiredTokenAmount, balanceDCX, processTransactions } =
    useContractGA();
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

      const desiredTokenAmount = await getDesiredTokenAmount();
      const enoughBalance = await checkEnoughBalance();
      const transactions = [];

      if (!enoughBalance.dcx && !enoughBalance.dimo)
        return setNotification('Insufficient DIMO or DCX balance', 'Oops...', 'error');

      if (!enoughBalance.dcx) {
        transactions.push(...(await mintDCX(desiredTokenAmount, enoughBalance)));
      }

      transactions.push(...(await prepareIssueInDC(desiredTokenAmount, enoughBalance)));
      if (transactions.length) {
        await processTransactions(transactions);
      }

      await handleCreateApp();
    } catch (error: unknown) {
      Sentry.captureException(error);
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

  const mintDCX = async (
    desiredTokenAmount: IDesiredTokenAmount,
    enoughBalance: ITokenBalance,
  ) => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    const transactions = [];
    if (!enoughBalance.dcxAllowance) {
      transactions.push({
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: 'approve',
          args: [
            configuration.DCX_ADDRESS,
            BigInt(utils.toWei(Math.ceil(Number(desiredTokenAmount.dimo)), 'ether')),
          ],
        }),
      });
    }

    // Call mintInDimo 2 parameteres
    const dcxAmountInUSD = balanceDCX * Number(DCX_IN_USD);
    const missingAmount = Math.ceil(
      Number(desiredTokenAmount.licensePrice) - dcxAmountInUSD,
    );
    transactions.push({
      to: configuration.DCX_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoCreditsABI,
        functionName: '0xec88fc37',
        args: [
          organizationInfo!.smartContractAddress,
          utils.toWei(
            Math.ceil(missingAmount / Number(desiredTokenAmount.dimoCost)),
            'ether',
          ),
        ],
      }),
    });
    return transactions;
  };

  const prepareIssueInDC = async (
    desiredTokenAmount: IDesiredTokenAmount,
    enoughBalance: ITokenBalance,
  ) => {
    if (enoughBalance.dlcAllowance) return [];

    return [
      {
        to: configuration.DC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoABI,
          functionName: 'approve',
          args: [
            configuration.DLC_ADDRESS,
            BigInt(utils.toWei(Math.ceil(Number(desiredTokenAmount.dimo)), 'ether')),
          ],
        }),
      },
    ];
  };

  const handleCreateWorkspace = async (workspaceData: Partial<IWorkspace>) => {
    if (!isEmpty(workspace)) return workspace;
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!organizationInfo) throw new Error('There is not organization information');

    setLoadingStatus({
      label: 'Licensing the application...',
      status: 'loading',
    });
    const workspaceName = String(utils.fromAscii(workspaceData?.name ?? '')).padEnd(
      66,
      '0',
    );
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
    const { topics: [, rawTokenId = '0x', rawOwner = '0x', rawClientId = '0x'] = [] } =
      logs?.find(
        ({ topics: [topic = '0x'] = [] }) => topic === configuration.ISSUED_TOPIC,
      ) ?? {};

    return createWorkspace({
      name: workspaceData.name ?? '',
      token_id: Number(decodeHex(rawTokenId as `0x${string}`, 'uint256')),
      client_id: decodeHex(rawClientId as `0x${string}`, 'address'),
      owner: decodeHex(rawOwner as `0x${string}`, 'address'),
    });
  };

  const handleCreateApp = async () => {
    const { workspace, app } = getValues();
    const { id: workspaceId = '' } = await handleCreateWorkspace(workspace);
    await createApp(workspaceId, {
      name: app.name,
      scope: 'production',
    });
    router.replace('/app');
  };

  return (
    <>
      <LoadingModal isOpen={isOpened} setIsOpen={setIsOpened} {...loadingStatus} />
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
              <TextError errorMessage={errors?.workspace?.name?.message ?? ''} />
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
          <p className="text-sm text-grey-200">This name is for your reference only</p>
        </Label>        
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
