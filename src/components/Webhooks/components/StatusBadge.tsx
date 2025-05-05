import { FC } from 'react';
import { capitalize } from 'lodash';
import classNames from 'classnames';

interface Props {
  status: string;
}

export const StatusBadge: FC<Props> = ({ status }) => {
  const getBackgroundColor = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-feedback-success';
      default:
        return 'bg-cta-default';
    }
  };
  return (
    <div
      className={classNames(
        'w-fit py-0.5 px-2 rounded-full text-white',
        getBackgroundColor(),
      )}
    >
      {capitalize(status)}
    </div>
  );
};
