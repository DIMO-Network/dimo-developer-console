'use client';
import { useEffect, useState } from 'react';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { getAppByID } from '@/actions/app';
import { IApp } from '@/types/app';
import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';
import { RedirectUriList } from '@/app/app/details/[id]/components/RedirectUriList';
import { SignerForm } from '@/app/app/details/[id]/components/SignerForm';
import { SignerList } from '@/app/app/details/[id]/components/SignerList';
import { Title } from '@/components/Title';
import { withNotifications } from '@/hoc';

import './View.css';

const View = ({ params: { id } }: { params: { id: string } }) => {
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
      <div className="signers-table">
        {app && <RedirectUriList app={app} />}
      </div>
      <div className="extra-actions">
        <Button className="error-simple">Delete application</Button>
      </div>
    </div>
  );
};

export default withNotifications(View);
