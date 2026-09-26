import { FC } from 'react';
import { capitalize } from 'lodash';
import classNames from 'classnames';

interface Props {
  status: string;
}

export const StatusBadge: FC<Props> = ({ status }) => {
  const getDotClass = () => {
    switch (status.toLowerCase()) {
      case 'enabled':
        return 'bg-accent shadow-[0_0_8px_var(--accent-soft-strong)]';
      case 'failed':
        return 'bg-negative';
      case 'disabled':
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className={'flex w-fit flex-row items-center gap-2 text-body-sm text-fg'}>
      <span
        className={classNames(
          'inline-block size-1.5 flex-shrink-0 rounded-full',
          getDotClass(),
        )}
      />
      {capitalize(status)}
    </div>
  );
};
