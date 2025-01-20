'use client';
import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';

import { useEffect, useState, useContext } from 'react';
import { useSession } from 'next-auth/react';
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

import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import configuration from '@/config';

import './View.css';

export const View = ({ params }: { params: Promise<{ id: string }> }) => {
  const [app, setApp] = useState<IApp>();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const { setNotification } = useContext(NotificationContext);
  const { workspace } = useOnboarding();
  const { organizationInfo } = useGlobalAccount();
  const { processTransactions } = useContractGA();
  const router = useRouter();
  const { user: { role = '' } = {} } = session ?? {};

  useEffect(() => {
    refreshAppDetails().catch(console.error);
  }, []);

  const refreshAppDetails = async () => {
    setIsLoadingPage(true);
    const { id: appId } = await params;
    getAppByID(appId)
      .then(setApp)
      .finally(() => setIsLoadingPage(false));
  };

  const handleEnableSigner = async (signer: string) => {
    if (!organizationInfo && !workspace) throw new Error('Web3 connection failed');
    const transaction = {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'enableSigner',
        args: [workspace?.token_id ?? 0, signer],
      }),
    };
    return transaction;
  };

  const handleDisableSigner = (signer: string) => {
    if (!organizationInfo && !workspace) throw new Error('Web3 connection failed');
    const transaction = {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'disableSigner',
        args: [workspace?.token_id ?? 0, signer],
      }),
    };
    return transaction;
  };

  const handleRemoveUri = (uri: string) => {
    if (!organizationInfo && !workspace) throw new Error('Web3 connection failed');
    const transaction = {
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: DimoLicenseABI,
        functionName: 'setRedirectUri',
        args: [workspace?.token_id ?? 0, false, uri],
      }),
    };
    return transaction;
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
          'Something went wrong while generating the API key',
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
        {app && <AppSummary app={app} />}
      </div>
      {isLoadingPage && <Loader isLoading={true} />}
      {!isLoadingPage && (
        <>
          <div className="signers-content">
            <Title component="h2">Signers</Title>
            {isOwner(role) && (
              <div className="generate-signer">
                <Button
                  className="primary-outline px-4 w-full"
                  loading={isLoading}
                  loadingColor="primary"
                  onClick={() => handleGenerateSigner()}
                >
                  Generate Key
                </Button>
              </div>
            )}
          </div>
          <div className="signers-table">
            {app && <SignerList app={app} refreshData={refreshAppDetails} />}
          </div>
          <div className="redirect-uri-content">
            <Title component="h2">Authorized Redirect URIs</Title>
            {isOwner(role) && app && (
              <RedirectUriForm appId={app!.id!} refreshData={refreshAppDetails} />
            )}
          </div>
          <div className="signers-table">
            {app && (
              <RedirectUriList list={app?.RedirectUris} refreshData={refreshAppDetails} />
            )}
          </div>
          {isOwner(role) && (
            <div className="extra-actions">
              <Button className="error-simple" onClick={handleDeleteApplication}>
                Delete application
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default View;
