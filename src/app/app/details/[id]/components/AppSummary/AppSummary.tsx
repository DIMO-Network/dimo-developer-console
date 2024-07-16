'use client';
import { useContext, type FC } from 'react';

import { IApp } from '@/types/app';
import { Title } from '@/components/Title';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';

import './AppSummary.css';

interface IProps {
  app: IApp;
}

export const AppSummary: FC<IProps> = ({
  app: { name, scope, Workspace: workspace = {} },
}) => {
  const { setNotification } = useContext(NotificationContext);
  const { client_id: clientId = '' } = workspace;

  const handleCopy = () => {
    void navigator.clipboard.writeText(clientId);
    setNotification('Client ID copied!', 'Copying', 'info');
  };

  return (
    <div className="summary">
      <Title className="text-3xl">{name}</Title>
      <p className="subtitle">{scope}</p>
      <div className="client-id-content">
        <p className="client-id-description">
          <strong>Client ID: </strong>
          {clientId}
        </p>
        <ContentCopyIcon
          className="w5 h-5 fill-white/50 cursor-pointer"
          onClick={handleCopy}
        />
      </div>
    </div>
  );
};

export default AppSummary;
