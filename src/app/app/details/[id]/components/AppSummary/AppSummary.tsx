'use client';
import React, { useContext, type FC } from 'react';

import { IApp } from '@/types/app';
import { Title } from '@/components/Title';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import './AppSummary.css';
import {Button} from "@/components/Button";
import {TrashIcon} from "@heroicons/react/24/outline";

interface IProps {
  app: IApp;
  isOwner: boolean;
}

export const AppSummary: FC<IProps> = ({
  app: { name, scope, Workspace: workspace = {} },
}) => {
  const { setNotification } = useContext(NotificationContext);
  const { client_id: clientId = '' } = workspace;

  const handleCopy = () => {
    void navigator.clipboard.writeText(clientId);
    setNotification('Client ID copied!', 'Success', 'info');
  };

  return (
    <div className={"flex lg:flex-row flex-col justify-between"}>
      <div className="summary">
        <Title className="text-xl font-black !leading-7">{name}</Title>
        <p className="subtitle">{scope}</p>
        <div className="client-id-content">
          <p className="client-id-description">Client ID</p>
          <div
            className={"py-2 px-3 bg-surface-raised flex flex-row items-center gap-2.5 rounded-2xl flex-wrap text-wrap"}>
            <p className={"text-text-secondary text-base"}> {clientId}</p>
            <ContentCopyIcon
              className="w5 h-5 fill-white/50 cursor-pointer"
              onClick={handleCopy}
            />
          </div>
        </div>
      </div>
      <div className="extra-actions">
        <Button className="error-outline" onClick={() => {}}>
          <TrashIcon className="w-4 h-4"/>
          Delete application
        </Button>
      </div>
    </div>

  );
};

export default AppSummary;
