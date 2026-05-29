import { type FC } from 'react';
import { cn } from '@/lib/utils';
import { DeveloperBoardIcon } from '@/components/Icons';
import { IApp } from '@/types/app';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import './AppCard.css';

interface IProps extends Partial<IApp> {
  className?: string;
  description?: string;
}

export const AppCard: FC<IProps> = ({ name, description = '', className = '', id }) => {
  return (
    <div className={cn('app-card', className)}>
      <div className="content">
        <div className="flex w-full flex-row justify-between items-center">
          <p className="title">{name}</p>
          <DeveloperBoardIcon className="w-4 h-4 text-muted-foreground" />
        </div>
        {description && <p className="app-card-description">{description}</p>}
        <Anchor href={`/app/details/${id}`}>
          <Button className="dark w-full !h-9">App Details</Button>
        </Anchor>
      </div>
    </div>
  );
};

export default AppCard;
