'use client';
import _ from 'lodash';

import { useEffect, useState, useContext } from 'react';
import { useSession } from 'next-auth/react';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { createMySigner, getAppByID } from '@/actions/app';
import { generateWallet } from '@/utils/wallet';
import { IApp } from '@/types/app';
import { Loader } from '@/components/Loader';
import { NotificationContext } from '@/context/notificationContext';
import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';
import { RedirectUriList } from '@/app/app/details/[id]/components/RedirectUriList';
import { SignerList } from '@/app/app/details/[id]/components/SignerList';
import { TeamRoles } from '@/types/team';
import { Title } from '@/components/Title';
import { useContractGA, useGlobalAccount, useOnboarding } from '@/hooks';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';

import configuration from '@/config';

import './View.css';

export const View = ({ params: { id: appId } }: { params: { id: string } }) => {
  const [app, setApp] = useState<IApp>();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
  const { setNotification } = useContext(NotificationContext);
  const { workspace } = useOnboarding();
  const { organizationInfo } = useGlobalAccount();
  const { processTransactions } = useContractGA();
  const { user: { role = '' } = {} } = session ?? {};

  useEffect(() => refreshAppDetails(), []);

  const refreshAppDetails = () => {
    setIsLoadingPage(true);
    getAppByID(appId)
      .then(setApp)
      .finally(() => setIsLoadingPage(false));
  };

  const handleEnableSigner = async (signer: string) => {
    if (!organizationInfo && !workspace)
      throw new Error('Web3 connection failed');
    const transaction = [{
      to: configuration.DLC_ADDRESS,
      value: BigInt(0),
      data: {
        abi: DimoLicenseABI,
        functionName: '0x3b1c393b',
        args: [
          workspace?.token_id ?? 0,
          signer,
        ]
      }
    }];
    await processTransactions(transaction);
  };

  const handleGenerateSigner = async () => {
    try {
      setIsLoading(true);
      const account = generateWallet();
      await handleEnableSigner(account.address);
      await createMySigner(
        {
          api_key: account.privateKey,
          address: account.address,
        },
        appId,
      );
      refreshAppDetails();
    } catch (error: unknown) {
      console.error({ error });
      const code = _.get(error, 'code', null);
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
            {role === TeamRoles.OWNER && (
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
            {role === TeamRoles.OWNER && (
              <RedirectUriForm appId={appId} refreshData={refreshAppDetails} />
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
          {role === TeamRoles.OWNER && (
            <div className="extra-actions">
              <Button className="error-simple">Delete application</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default View;
