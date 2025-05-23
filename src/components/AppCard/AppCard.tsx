import { type FC } from 'react';
import classNames from 'classnames';

import { BeachAccessIcon, DeveloperBoardIcon } from '@/components/Icons';
import { Card } from '@/components/Card';
import { ENVIRONMENTS_LABELS, IApp } from '@/types/app';

import './AppCard.css';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';

interface IProps extends Partial<IApp> {
  className?: string;
  description?: string;
  onClick?: () => void;
}

const AppIcon = {
  production: <DeveloperBoardIcon className="w-5 h-5" />,
  sandbox: <BeachAccessIcon className="w-5 h-5" />,
};

export const AppCard: FC<IProps> = ({
  name,
  scope = 'production',
  description = '',
  className = '',
  id,
}) => {
  return (
    <Card className={classNames('app-card', className)}>
      <div className="content">
        <div className={'flex w-full flex-row justify-between items-center'}>
          <p className="title">{name}</p>
          {AppIcon[scope || 'sandbox']}
        </div>
        <p className="app-card-description">
          {description || ENVIRONMENTS_LABELS[scope]}
        </p>
        <Anchor href={`/app/details/${id}`}>
          <Button className={'dark w-full !h-10'}>App Details</Button>
        </Anchor>
      </div>
    </Card>
  );
};

export default AppCard;
