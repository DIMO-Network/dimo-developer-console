import { type FC } from 'react';
import { BeachAccessIcon, DeveloperBoardIcon } from '@/components/Icons';

import './AppCard.css';
import { Card } from '../Card';
import classNames from 'classnames';

type ENVIRONMENTS = 'production' | 'sandbox';

interface IProps {
  name: string;
  description: string;
  environment: ENVIRONMENTS;
  className?: string;
}

const AppIcon = {
  production: <DeveloperBoardIcon className="w-5 h-5" />,
  sandbox: <BeachAccessIcon className="w-5 h-5" />,
};

export const AppCard: FC<IProps> = ({
  name,
  description,
  environment,
  className = '',
}) => {
  return (
    <Card className={classNames('app-card card-border', className)}>
      <div className="content">
        <p className="title">{name}</p>
        <p className="description">{description}</p>
      </div>
      {AppIcon[environment]}
    </Card>
  );
};

export default AppCard;
