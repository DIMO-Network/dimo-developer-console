'use client';
import { useEffect, useState } from 'react';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { BackButton } from '@/components/BackButton';
import { getAppByID } from '@/app/app/actions';
import { IApp } from '@/types/app';
import { RedirectUriForm } from './components/RedirectUriForm';
import { SignerForm } from './components/SignerForm';
import { SignerList } from './components/SignerList';
import { Title } from '@/components/Title';
import { withNotifications } from '@/hoc';

import './page.css';

export const AppDetailPage = ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const [app, setApp] = useState<IApp>();
  useEffect(() => {
    getAppByID(id).then(setApp);
  }, []);

  return (
    <div className="page">
      <div className="summary">
        <BackButton />
        {app && <AppSummary app={app} />}
      </div>
      <div className="signers-content">
        <Title component="h2">Signers</Title>
        <SignerForm />
      </div>
      <div className="signers-table">{app && <SignerList app={app} />}</div>
      <div className="redirect-uri-content">
        <Title component="h2">Authorized Redirect URIs</Title>
        <RedirectUriForm />
      </div>
    </div>
  );
};

export default withNotifications(AppDetailPage);
