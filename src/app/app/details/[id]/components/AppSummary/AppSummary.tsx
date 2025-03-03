'use client';

import { useContext, useState, type FC } from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { IApp } from '@/types/app';
import { Title } from '@/components/Title';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { WorkspaceNameModal } from '@/app/app/details/[id]/components/WorkspaceNameModal';

import './AppSummary.css';

interface IProps {
  app: IApp;
}

export const AppSummary: FC<IProps> = ({ app }) => {
  const { name, scope, Workspace: workspace = {} } = app;
  const { setNotification } = useContext(NotificationContext);
  const { client_id: clientId = '', name: workspaceName = '' } = workspace;
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(clientId);
    setNotification('Client ID copied!', 'Copying', 'info');
  };

  const handleEditClick = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="summary">
      <div className="workspace-header">
        <Title className="text-3xl">
          {workspaceName} / {name}
        </Title>
        <PencilSquareIcon className="w-5 h-5 cursor-pointer" onClick={handleEditClick} />
      </div>
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
      <WorkspaceNameModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        workspaceName={workspaceName}
        app={app}
      />
    </div>
  );
};

export default AppSummary;
