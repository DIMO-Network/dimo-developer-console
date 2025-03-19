'use client';
import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';

import React, { useContext, useEffect, useState } from 'react';
import { encodeFunctionData } from 'viem';
import { useRouter } from 'next/navigation';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { createMySigner, deleteApp, getAppByID } from '@/actions/app';
import { generateWallet } from '@/utils/wallet';
import { IApp } from '@/types/app';
import { isOwner } from '@/utils/user';
import { Loader } from '@/components/Loader';
import { NotificationContext } from '@/context/notificationContext';
import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';
import { RedirectUriList } from '@/app/app/details/[id]/components/RedirectUriList';
import { SignerList } from '@/app/app/details/[id]/components/SignerList';
import { Title } from '@/components/Title';
import { useContractGA, useGlobalAccount, useOnboarding } from '@/hooks';
import { IGlobalAccountSession } from '@/types/wallet';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';

import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import configuration from '@/config';

import './View.css';
import { KeyIcon } from '@heroicons/react/20/solid';

export const View = ({ params }: { params: Promise<{ id: string }> }) => {
  const [app, setApp] = useState<IApp>();  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const { setNotification } = useContext(NotificationContext);
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const { workspace } = useOnboarding();
  const { processTransactions } = useContractGA();
  const router = useRouter();
  const { role } = currentUser!;

  useEffect(() => {
    refreshAppDetails();
  }, []);

  const refreshAppDetails = async () => {
    try {
      setIsLoadingPage(true);
      const { id: appId } = await params;
      const foundApp = await getAppByID(appId);
      setApp(foundApp);
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error({ error });
      setNotification(
        'Something went wrong while fetching the application details',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleEnableSigner = (signer: string)  => {    
    if (!currentUser && !workspace) throw new Error('Web3 connection failed');
    return {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'enableSigner',
        args: [workspace?.token_id ?? 0, signer],
      }),
    };
  };

  const handleDisableSigner = (signer: string) => {
    if (!currentUser && !workspace) throw new Error('Web3 connection failed');
    return {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'disableSigner',
        args: [workspace?.token_id ?? 0, signer],
      }),
    };
  };

  const handleRemoveUri = (uri: string) => {
    if (!currentUser && !workspace) throw new Error('Web3 connection failed');
    return {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'setRedirectUri',
        args: [workspace?.token_id ?? 0, false, uri],
      }),
    };
  };

  const handleGenerateSigner = async () => {
    try {
      setIsLoading(true);
      const account = generateWallet();
      const transaction = handleEnableSigner(account.address);
      await processTransactions([transaction]);
      const { id: appId } = await params;
      await createMySigner(
        {
          api_key: account.privateKey,
          address: account.address,
        },
        appId,
      );
      await refreshAppDetails();
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error({ error });
      const code = get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while generating the API key',
          'Oops...',
          'error',
        );
    } finally {
      setIsLoading(false);
    }
  };

  const getAllDisableSignerTransactions = () => {
    return app?.Signers?.map((signer) => handleDisableSigner(signer.address)) || [];
  };

  const getAllRemoveUriTransactions = () => {
    return app?.RedirectUris?.map(({ uri }) => handleRemoveUri(uri)) || [];
  };

  const handleDeleteApplication = async () => {
    try {
      setIsLoading(true);
      const transactions = [
        ...getAllDisableSignerTransactions(),
        ...getAllRemoveUriTransactions(),
      ];
      await processTransactions(transactions);
      const { id: appId } = await params;
      await deleteApp(appId);
      router.replace('/');
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error({ error });
      const code = get(error, 'code', null);
      if (code === 4001)
        setNotification('The transaction was denied', 'Oops...', 'error');
      else
        setNotification(
          'Something went wrong while deleting the app',
          'Oops...',
          'error',
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="summary">
        <BackButton />
        {app && (
          <AppSummary
            app={app}
            isOwner={isOwner(role)}
            handleDelete={handleDeleteApplication}
          />
        )}
      </div>
      {isLoadingPage && <Loader isLoading={true} />}
      {!isLoadingPage && (
        <div className={'flex flex-col gap-6'}>
          <div className="signers-content">
            <div
              className={
                'flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center'
              }
            >
              <Title component="h2" className={'text-xl'}>
                API Keys
              </Title>
              {isOwner(role) && (
                <div className="generate-signer">
                  <Button
                    className="dark with-icon px-4"
                    loading={isLoading}
                    loadingColor="primary"
                    onClick={() => handleGenerateSigner()}
                  >
                    <KeyIcon className="w-4 h-4" />
                    Generate Key
                  </Button>
                </div>
              )}
            </div>

            <div className="signers-table">
              {app && <SignerList app={app} refreshData={refreshAppDetails} />}
            </div>
          </div>
          <div className={'signers-content'}>
            <div className="redirect-uri-content">
              <Title component="h2" className={'text-xl'}>
                Authorized Redirect URIs
              </Title>
              {isOwner(role) && app && (
                <div className={'mt-4'}>
                  <RedirectUriForm
                    appId={app!.id!}
                    refreshData={refreshAppDetails}
                    list={app?.RedirectUris}
                  />
                </div>
              )}
            </div>
            <div className="signers-table">
              {app && (
                <RedirectUriList
                  list={app?.RedirectUris}
                  refreshData={refreshAppDetails}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default View;
