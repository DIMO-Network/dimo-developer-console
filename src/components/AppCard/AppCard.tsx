import { type FC } from 'react';
import classNames from 'classnames';

import { BeachAccessIcon, DeveloperBoardIcon } from '@/components/Icons';
import { Card } from '@/components/Card';
import { IApp } from '@/types/app';

import './AppCard.css';

interface IProps extends Partial<IApp> {
  className?: string;
  description?: string;
}

const AppIcon = {
  production: <DeveloperBoardIcon className="w-5 h-5" />,
  sandbox: <BeachAccessIcon className="w-5 h-5" />,
};

export const AppCard: FC<IProps> = ({
  name,
  scope,
  description = '',
  className = '',
}) => {
  return (
    <Card className={classNames('app-card card-border', className)}>
      <div className="content">
        <p className="title">{name}</p>
        <p className="description">{description || scope}</p>
      </div>
      {AppIcon[scope || 'sandbox']}
    </Card>
  );
};

export default AppCard;
