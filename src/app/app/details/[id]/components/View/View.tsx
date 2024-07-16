'use client';
import { useEffect, useState, useContext } from 'react';
import { utils } from 'web3';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { createMySigner, getAppByID } from '@/actions/app';
import { IApp } from '@/types/app';
import { NotificationContext } from '@/context/notificationContext';
import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';
import { RedirectUriList } from '@/app/app/details/[id]/components/RedirectUriList';
import { SignerList } from '@/app/app/details/[id]/components/SignerList';
import { Title } from '@/components/Title';

import './View.css';

const View = ({ params: { id: appId } }: { params: { id: string } }) => {
  const [app, setApp] = useState<IApp>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { setNotification } = useContext(NotificationContext);

  useEffect(() => refreshAppDetails(), []);

  const refreshAppDetails = () => {
    getAppByID(appId).then(setApp);
  };

  const handleGenerateSigner = async () => {
    try {
      setIsLoading(true);
      const signer = utils.randomHex(32) as string;
      await createMySigner(signer, appId);
      refreshAppDetails();
    } catch (error: unknown) {
      setNotification(
        'Something went wrong while generating the API key',
        'Oops...',
        'error'
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
      <div className="signers-content">
        <Title component="h2">Signers</Title>
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
      </div>
      <div className="signers-table">
        {app && (
          <SignerList list={app?.Signers} refreshData={refreshAppDetails} />
        )}
      </div>
      <div className="redirect-uri-content">
        <Title component="h2">Authorized Redirect URIs</Title>
        <RedirectUriForm appId={appId} refreshData={refreshAppDetails} />
      </div>
      <div className="signers-table">
        {app && (
          <RedirectUriList
            list={app?.RedirectUris}
            refreshData={refreshAppDetails}
          />
        )}
      </div>
      <div className="extra-actions">
        <Button className="error-simple">Delete application</Button>
      </div>
    </div>
  );
};

export default View;
